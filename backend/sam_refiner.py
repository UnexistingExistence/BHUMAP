"""
MobileSAM box-prompted instance segmentation refiner with cadastral regularization.

Takes bounding-box detections from YOLO and uses MobileSAM to extract
precise building footprint polygons instead of rectangular bounding boxes.
Then regularizes raw mask contours into clean cadastral-grade orthogonal
footprints (4-12 vertices) while preserving L-shaped and T-shaped building geometries.

Pixel convention
----------------
(0, 0) = upper-left corner of the top-left pixel, matching ``geo_utils.py``'s
``offset='ul'`` convention.  Crop-local mask coordinates are shifted to global
raster pixel coordinates by adding (col_offset, row_offset).
"""

from __future__ import annotations

import logging
import math
from typing import Any, Dict, List, Optional, Tuple, Union

import cv2
import numpy as np
import rasterio
from shapely import affinity
from shapely.geometry import MultiPolygon, Polygon
from shapely.validation import make_valid
import torch

from rasterio_tiler import read_tile_for_sam
import geo_utils

logger = logging.getLogger(__name__)

# Cached SAM instance
_SAM_MODEL = None


def get_sam_model(model_name: str = "mobile_sam.pt"):
    """
    Lazy-load and cache the MobileSAM model.
    """
    global _SAM_MODEL
    if _SAM_MODEL is None:
        from ultralytics import SAM
        logger.info("Loading MobileSAM model: %s", model_name)
        _SAM_MODEL = SAM(model_name)
    return _SAM_MODEL


def bbox_to_polygon_coords(bbox: List[float]) -> List[List[float]]:
    """
    Convert a [xmin, ymin, xmax, ymax] bounding box into a closed 5-point polygon.
    """
    x1, y1, x2, y2 = bbox
    return [
        [round(x1, 2), round(y1, 2)],
        [round(x2, 2), round(y1, 2)],
        [round(x2, 2), round(y2, 2)],
        [round(x1, 2), round(y2, 2)],
        [round(x1, 2), round(y1, 2)],
    ]


def dominant_angle(points: np.ndarray) -> float:
    """
    Calculate building dominant orientation in degrees from cv2.minAreaRect.
    Returns angle in degrees in the range [0, 90).
    """
    rect = cv2.minAreaRect(points.astype(np.float32))
    box = cv2.boxPoints(rect)  # (4, 2)
    e1 = box[1] - box[0]
    e2 = box[2] - box[1]
    chosen = e1 if np.linalg.norm(e1) >= np.linalg.norm(e2) else e2
    angle = math.degrees(math.atan2(chosen[1], chosen[0])) % 90.0
    return float(angle)


def merge_collinear_edges(edges: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
    """
    Merge adjacent edges of the same orientation (H with H, V with V).
    Ensures output strictly alternates between horizontal and vertical edges.
    """
    if not edges:
        return []
    merged = [dict(edges[0])]
    for e in edges[1:]:
        last = merged[-1]
        if e["type"] == last["type"]:
            tot_len = last["len"] + e["len"]
            new_pos = (
                (last["pos"] * last["len"] + e["pos"] * e["len"]) / tot_len
                if tot_len > 0
                else last["pos"]
            )
            merged[-1] = {"type": last["type"], "pos": new_pos, "len": tot_len}
        else:
            merged.append(dict(e))

    # Wrap-around check between first and last edge
    if len(merged) > 2 and merged[0]["type"] == merged[-1]["type"]:
        first = merged[0]
        last = merged[-1]
        tot_len = first["len"] + last["len"]
        new_pos = (
            (first["pos"] * first["len"] + last["pos"] * last["len"]) / tot_len
            if tot_len > 0
            else first["pos"]
        )
        merged[0] = {"type": first["type"], "pos": new_pos, "len": tot_len}
        merged.pop()

    return merged


def regularize_ortho(
    poly_simp: Polygon, dom_angle: float, tolerance_px: float = 1.5
) -> Polygon:
    """
    Orthogonalize polygon edges relative to building dominant angle.
    Snaps each edge to nearest 0°/90° axis, re-intersects adjacent edges,
    and preserves non-rectangular footprint shapes (L-shaped, T-shaped).
    """
    centroid = poly_simp.centroid
    # Rotate by -dom_angle to align dominant building axis with coordinate axes
    poly_rot = affinity.rotate(poly_simp, -dom_angle, origin=centroid)
    coords = list(poly_rot.exterior.coords)

    raw_edges = []
    for i in range(len(coords) - 1):
        p1 = coords[i]
        p2 = coords[i + 1]
        dx = p2[0] - p1[0]
        dy = p2[1] - p1[1]
        L = math.hypot(dx, dy)
        if L < 1e-2:
            continue
        if abs(dx) >= abs(dy):
            raw_edges.append({"type": "H", "pos": (p1[1] + p2[1]) / 2.0, "len": L})
        else:
            raw_edges.append({"type": "V", "pos": (p1[0] + p2[0]) / 2.0, "len": L})

    merged = merge_collinear_edges(raw_edges)
    if len(merged) < 4 or len(merged) % 2 != 0:
        return poly_simp

    # Intersect adjacent H and V lines to get exact right-angle corners
    corners = []
    for i in range(len(merged)):
        e_prev = merged[i - 1]
        e_curr = merged[i]
        if e_prev["type"] == "H" and e_curr["type"] == "V":
            corners.append((e_curr["pos"], e_prev["pos"]))
        elif e_prev["type"] == "V" and e_curr["type"] == "H":
            corners.append((e_prev["pos"], e_curr["pos"]))
        else:
            return poly_simp

    if len(corners) < 4:
        return poly_simp

    corners.append(corners[0])
    ortho_poly = Polygon(corners)
    if not ortho_poly.is_valid:
        ortho_poly = make_valid(ortho_poly)
    if isinstance(ortho_poly, MultiPolygon):
        valid_geoms = [g for g in ortho_poly.geoms if isinstance(g, Polygon) and not g.is_empty]
        ortho_poly = max(valid_geoms, key=lambda g: g.area) if valid_geoms else poly_simp

    # Drop redundant collinear vertices or sub-tolerance notches
    ortho_poly = ortho_poly.simplify(tolerance_px, preserve_topology=True)
    if isinstance(ortho_poly, MultiPolygon):
        valid_geoms = [g for g in ortho_poly.geoms if isinstance(g, Polygon) and not g.is_empty]
        ortho_poly = max(valid_geoms, key=lambda g: g.area) if valid_geoms else poly_simp

    # Rotate back to original orientation around the same centroid
    final_poly = affinity.rotate(ortho_poly, dom_angle, origin=centroid)
    return final_poly


def regularize_contour(
    contour_points: List[Tuple[float, float]],
    gsd_meters: float = 0.10,
) -> Polygon:
    """
    Complete regularization pipeline for a single raw mask contour:
    1. simplify(contour, gsd) with ground tolerance = 0.15 / gsd_meters
    2. dominant_angle via cv2.minAreaRect
    3. regularize:
       - If ratio > 0.90 and vertices <= 5: snap directly to minAreaRect
       - Otherwise: ortho mode (rotate, snap edges, intersect, rotate back)
    4. validate with make_valid()
    """
    poly = Polygon(contour_points)
    if not poly.is_valid:
        poly = poly.buffer(0)
    if isinstance(poly, MultiPolygon):
        valid_geoms = [g for g in poly.geoms if isinstance(g, Polygon) and not g.is_empty]
        if valid_geoms:
            poly = max(valid_geoms, key=lambda g: g.area)

    # 1. Ground distance derived tolerance: ~15cm on ground in pixels
    tol_px = max(0.5, min(10.0, 0.15 / max(1e-4, gsd_meters)))
    poly_simp = poly.simplify(tol_px, preserve_topology=True)
    if isinstance(poly_simp, MultiPolygon):
        valid_geoms = [g for g in poly_simp.geoms if isinstance(g, Polygon) and not g.is_empty]
        if valid_geoms:
            poly_simp = max(valid_geoms, key=lambda g: g.area)

    # 2. Dominant angle from minAreaRect
    pts_np = np.array(poly_simp.exterior.coords[:-1], dtype=np.float32)
    rect = cv2.minAreaRect(pts_np)
    box = cv2.boxPoints(rect)  # (4, 2)
    dom_ang = dominant_angle(pts_np)

    # 3. Regularize
    rect_poly = Polygon(box)
    ratio = poly_simp.area / rect_poly.area if rect_poly.area > 0 else 0.0
    v_simp = len(poly_simp.exterior.coords)

    if ratio > 0.90 and v_simp <= 5:
        # Snap directly to minAreaRect (4-corner rotated rectangle)
        box_ring = list(box) + [box[0]]
        reg_poly = Polygon(box_ring)
    else:
        # Ortho mode for L-shaped, T-shaped, or stepped buildings
        reg_poly = regularize_ortho(poly_simp, dom_ang, tolerance_px=tol_px)

    # 4. Final validation
    if not reg_poly.is_valid:
        reg_poly = make_valid(reg_poly)
    if isinstance(reg_poly, MultiPolygon):
        valid_geoms = [g for g in reg_poly.geoms if isinstance(g, Polygon) and not g.is_empty]
        reg_poly = max(valid_geoms, key=lambda g: g.area) if valid_geoms else poly_simp

    return reg_poly


def refine_detections(
    raster_source: Union[str, rasterio.DatasetReader],
    detections: List[Dict[str, Any]],
    sam_model=None,
    padding: int = 32,
    geo_info: Optional[geo_utils.RasterGeoInfo] = None,
    min_area_sqm: float = 4.0,
) -> List[Dict[str, Any]]:
    """
    Refine bounding-box detections into regularized polygon contours using MobileSAM.

    Parameters
    ----------
    raster_source : str or rasterio.DatasetReader
        Path to the raster or an open rasterio dataset reader.
    detections : list of dict
        Detections from ``rasterio_tiler.tile_and_detect``.
        Each dict must contain ``coordinates``: ``[xmin, ymin, xmax, ymax]``.
    sam_model : optional
        Pre-loaded SAM model. If None, loaded via ``get_sam_model()``.
    padding : int
        Pixels of context to include around the bounding box when cropping.
    geo_info : optional
        RasterGeoInfo from ``geo_utils.extract_raster_geo()``. If None and raster_source
        is a path, auto-extracted.
    min_area_sqm : float
        Minimum footprint area in m² (evaluated in auto-selected UTM CRS).
        Polygons below this threshold are dropped.

    Returns
    -------
    list of dict
        Updated detection dicts where:
        - ``coordinates``: List of ``[x, y]`` points forming a closed polygon ring
        - ``bbox``: Original ``[xmin, ymin, xmax, ymax]`` bounding box
        - ``is_polygon``: Boolean indicating if SAM successfully generated a contour
    """
    if not detections:
        return []

    if sam_model is None:
        sam_model = get_sam_model()

    # Open dataset if a path was passed
    if isinstance(raster_source, str):
        dataset = rasterio.open(raster_source)
        should_close = True
        if geo_info is None:
            geo_info = geo_utils.extract_raster_geo(raster_source)
    else:
        dataset = raster_source
        should_close = False

    # Determine GSD in metres for ground-distance tolerance (~15 cm)
    if geo_info is not None:
        gsd_meters = geo_utils.get_raster_gsd_meters(geo_info)
        # Centroid in native CRS units (may be metres if projected).
        # Reproject to EPSG:4326 degrees before calling auto_utm_crs().
        _cx = (geo_info.bounds.left + geo_info.bounds.right) / 2.0
        _cy = (geo_info.bounds.bottom + geo_info.bounds.top) / 2.0
        if geo_info.crs.is_projected:
            from pyproj import Transformer as _Tr
            _to_4326 = _Tr.from_crs(geo_info.crs, geo_utils._CRS_4326, always_xy=True)
            center_lon, center_lat = _to_4326.transform(_cx, _cy)
        else:
            center_lon, center_lat = _cx, _cy
        utm_crs = geo_utils.auto_utm_crs(center_lat, center_lon)
    else:
        gsd_meters = 0.10  # fallback ~10cm/px
        utm_crs = None

    refined: List[Dict[str, Any]] = []

    try:
        for idx, det in enumerate(detections):
            bbox = det["coordinates"]
            x1, y1, x2, y2 = bbox

            # Preserve original bounding box
            det_copy = dict(det)
            det_copy["bbox"] = [round(v, 2) for v in bbox]

            # Read crop around bbox
            try:
                crop_rgb, col_off, row_off = read_tile_for_sam(
                    dataset, bbox, padding=padding
                )

                # Relative bbox in crop coordinates
                rel_x1 = max(0.0, x1 - col_off)
                rel_y1 = max(0.0, y1 - row_off)
                rel_x2 = min(float(crop_rgb.shape[1]), x2 - col_off)
                rel_y2 = min(float(crop_rgb.shape[0]), y2 - row_off)

                # Ensure valid box
                if rel_x2 <= rel_x1 or rel_y2 <= rel_y1:
                    raise ValueError("Degenerate relative bounding box")

                with torch.inference_mode():
                    results = sam_model.predict(
                        source=crop_rgb,
                        bboxes=[[rel_x1, rel_y1, rel_x2, rel_y2]],
                        verbose=False,
                    )

                poly_coords = None
                if (
                    results
                    and results[0].masks is not None
                    and len(results[0].masks.xy) > 0
                    and len(results[0].masks.xy[0]) >= 3
                ):
                    local_contour = results[0].masks.xy[0]  # (N, 2)
                    # Shift from crop-local to global pixel coordinates (offset='ul')
                    global_pts = [
                        (float(pt[0]) + col_off, float(pt[1]) + row_off)
                        for pt in local_contour
                    ]

                    # Regularize contour into cadastral footprint
                    reg_poly = regularize_contour(global_pts, gsd_meters=gsd_meters)

                    if isinstance(reg_poly, Polygon) and not reg_poly.is_empty:
                        # Check 4.0 m² area floor in UTM projection
                        if geo_info is not None and utm_crs is not None:
                            geo_ring = geo_utils.pixels_to_geo(
                                list(reg_poly.exterior.coords),
                                geo_info.transform,
                                geo_info.crs,
                            )
                            metrics = geo_utils.compute_metric_properties(
                                Polygon(geo_ring), utm_crs
                            )
                            if metrics["area_sqm"] < min_area_sqm:
                                logger.info(
                                    "Dropping detection %d: area %.2f m² < %.1f m² floor",
                                    idx, metrics["area_sqm"], min_area_sqm,
                                )
                                continue

                        exterior_coords = list(reg_poly.exterior.coords)
                        if len(exterior_coords) >= 4:
                            poly_coords = [
                                [round(x, 2), round(y, 2)]
                                for x, y in exterior_coords
                            ]

                if poly_coords is not None:
                    det_copy["coordinates"] = poly_coords
                    det_copy["is_polygon"] = True
                else:
                    # Fallback to bbox rectangle
                    det_copy["coordinates"] = bbox_to_polygon_coords(bbox)
                    det_copy["is_polygon"] = False

            except Exception as e:
                logger.warning("SAM refinement failed for detection %d: %s", idx, e)
                det_copy["coordinates"] = bbox_to_polygon_coords(bbox)
                det_copy["is_polygon"] = False

            refined.append(det_copy)

            # Free GPU memory periodically
            if torch.cuda.is_available() and idx % 10 == 0:
                torch.cuda.empty_cache()

    finally:
        if should_close:
            dataset.close()
        if torch.cuda.is_available():
            torch.cuda.empty_cache()

    return refined

from fastapi import FastAPI
from pydantic import BaseModel
from typing import List
import math
"""
BhuMap Cadastral API â€” api_server.py
=====================================
Unified building-footprint detection pipeline:
  1. rasterio windowed reads (no full PIL load; supports â‰¥20 000Ã—20 000 px)
  2. YOLO tiled detection via rasterio_tiler.tile_and_detect()
  3. MobileSAM box-prompted segmentation + cadastral regularisation via
     sam_refiner.refine_detections()
  4. Geo-coordinate conversion (offset='ul', EPSG:4326 output) via geo_utils
  5. Metric area/perimeter in auto-selected UTM CRS (never EPSG:4326)
  6. PostGIS persistence â€” wrapped in try/except, not a hard dependency

Dead code removed in this version
-----------------------------------
  - extract_gps_from_exif()         â† deleted
  - convert_image_to_geotiff()      â† deleted
  - CITY_BBOXES / DEFAULT_LAT / DEFAULT_LON / BBOX_HALF_DEG  â† deleted
  - POST /predict                   â† deleted
  - POST /predict-stitched          â† deleted
  - POST /predict-geospatial        â† deleted
"""

from __future__ import annotations

import json
import logging
import os
import shutil
import tempfile
import uuid
from typing import Optional

# pyrefly: ignore [missing-import]
from fastapi import FastAPI, HTTPException, UploadFile, File
# pyrefly: ignore [missing-import]
from fastapi.middleware.cors import CORSMiddleware
# pyrefly: ignore [missing-import]
import uvicorn
# pyrefly: ignore [missing-import]
from shapely.geometry import Polygon, mapping

from color_utils import get_category_color, normalize_display_label
from tiling_engine import MODEL_PATH, IS_CUSTOM, DEFAULT_CONFIDENCE, MIN_AREA_PX, MIN_DIM_PX
import geo_utils
import rasterio_tiler
import sam_refiner

logger = logging.getLogger("bhumap.api")
logging.basicConfig(level=logging.INFO)

# ---------------------------------------------------------------------------
#  Optional PostGIS integration (graceful degradation if Docker is offline)
# ---------------------------------------------------------------------------

_db_available = False
_SessionLocal = None
_Parcel = None

try:
    from database import SessionLocal as _SL, engine as _engine
    from models import Base as _Base, Parcel as _Parcel_cls
    from sqlalchemy import func as _sql_func

    _Base.metadata.create_all(bind=_engine)
    _SessionLocal = _SL
    _Parcel = _Parcel_cls
    _db_available = True
    logger.info("[PostGIS] Database connection established.")
except Exception as _db_err:
    logger.warning(
        "[PostGIS] Database unavailable (%s). "
        "Detections will NOT be persisted. API continues normally.",
        _db_err,
    )


def _save_parcels_to_db(features: list[dict]) -> int:
    """
    Best-effort upsert of GeoJSON features into the PostGIS parcels table.
    Returns the number of rows inserted/updated.  Returns 0 silently on any error.
    """
    if not _db_available or _SessionLocal is None:
        return 0
    saved = 0
    db = _SessionLocal()
    try:
        for feat in features:
            props = feat.get("properties", {})
            geom_dict = feat.get("geometry", {})
            parcel_id = props.get("parcel_id", f"BLDG-{uuid.uuid4().hex[:8].upper()}")
            area_sqm = props.get("area_sqm", 0.0)
            geom_str = json.dumps(geom_dict)

            row = db.query(_Parcel).filter_by(parcel_id=parcel_id).first()
            if row:
                row.area_sqm = area_sqm
                row.geom = _sql_func.ST_SetSRID(
                    _sql_func.ST_GeomFromGeoJSON(geom_str), 4326
                )
            else:
                db.add(_Parcel(
                    parcel_id=parcel_id,
                    owner="BhuMap Auto-Detection",
                    area_sqm=area_sqm,
                    geom=_sql_func.ST_SetSRID(
                        _sql_func.ST_GeomFromGeoJSON(geom_str), 4326
                    ),
                ))
            saved += 1
        db.commit()
    except Exception as db_err:
        db.rollback()
        logger.warning("[PostGIS] Save failed: %s", db_err)
        saved = 0
    finally:
        db.close()
    return saved


# ---------------------------------------------------------------------------
#  App + YOLO setup
# ---------------------------------------------------------------------------

app = FastAPI(
    title="BhuMap Cadastral API",
    description=(
        "Aerial imagery building footprint detection. "
        "Pipeline: rasterio windowed tiling â†’ YOLO detection â†’ "
        "MobileSAM segmentation â†’ auto-UTM metric properties â†’ GeoJSON."
    )
from fastapi.middleware.cors import CORSMiddleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)
,
    version="2.0.0",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

logger.info("Loading YOLO model from: %s", MODEL_PATH)
try:
    from ultralytics import YOLO as _YOLO
    _yolo_model = _YOLO(MODEL_PATH)
except Exception as _yolo_err:
    logger.warning("Could not load %s (%s). Falling back to yolov8n.pt", MODEL_PATH, _yolo_err)
    from ultralytics import YOLO as _YOLO
    _yolo_model = _YOLO("yolov8n.pt")

# Lazy-load SAM (only when first request arrives)
_sam_model = None


def _get_sam():
    global _sam_model
    if _sam_model is None:
        _sam_model = sam_refiner.get_sam_model("mobile_sam.pt")
    return _sam_model


# Accepted extensions
_RASTER_EXTS = {".tif", ".tiff"}
_IMAGE_EXTS = {".jpg", ".jpeg", ".png", ".bmp", ".webp"}
_ALL_EXTS = _RASTER_EXTS | _IMAGE_EXTS


# ---------------------------------------------------------------------------
#  Helper: build ID prefix from category group
# ---------------------------------------------------------------------------

def _id_prefix(group: str) -> str:
    return {
        "building": "BLDG",
        "vehicle": "VEH",
        "person": "PERS",
    }.get(group, "OBJ")


# ---------------------------------------------------------------------------
#  Routes
# ---------------------------------------------------------------------------

@app.get("/", summary="Health check")
def health_check():
    """Returns API status, model info, and PostGIS availability."""
    return {
        "status": "online",
        "model": MODEL_PATH,
        "model_is_custom": IS_CUSTOM,
        "postgis_available": _db_available,
        "api_version": "2.0.0",
    }


@app.get("/api/parcels", summary="List stored parcels from PostGIS")
def list_parcels():
    """
    Returns all parcels persisted in the PostGIS database as a GeoJSON
    FeatureCollection.  Returns an empty collection if PostGIS is unavailable.
    """
    if not _db_available or _SessionLocal is None:
        return {
            "type": "FeatureCollection",
            "postgis_available": False,
            "features": [],
        }
    db = _SessionLocal()
    try:
        rows = db.query(_Parcel).all()
        features = []
        for r in rows:
            try:
                from geoalchemy2.shape import to_shape
                geom = mapping(to_shape(r.geom))
            except Exception:
                geom = None
            features.append({
                "type": "Feature",
                "id": r.id,
                "geometry": geom,
                "properties": {
                    "parcel_id": r.parcel_id,
                    "owner": r.owner,
                    "area_sqm": r.area_sqm,
                },
            })
        return {
            "type": "FeatureCollection",
            "postgis_available": True,
            "features": features,
        }
    except Exception as err:
        logger.warning("[PostGIS] list_parcels failed: %s", err)
        return {"type": "FeatureCollection", "postgis_available": False, "features": []}
    finally:
        db.close()


@app.post("/api/detect-footprints", summary="Detect building footprints (unified pipeline)")
@app.post("/detect-footprints")
async def detect_footprints(file: UploadFile = File(...)):
    """
    Accepts any drone image (.jpg/.jpeg/.png/.tif/.tiff, up to 20 000Ã—20 000 px).

    Pipeline
    --------
    1. Write upload to NamedTemporaryFile (no PIL full-load).
    2. Probe geo-metadata via geo_utils.extract_raster_geo().
    3. Run rasterio_tiler.tile_and_detect() â€” windowed reads, cross-tile NMS.
    4. Run sam_refiner.refine_detections() â€” MobileSAM + cadastral regularisation.
    5. If georeferenced: convert pixelsâ†’EPSG:4326 via geo_utils.pixels_to_geo()
       (offset='ul'), compute area/perimeter in auto-UTM (never EPSG:4326).
    6. Build GeoJSON FeatureCollection (EPSG:4326 coordinates).
    7. Best-effort PostGIS upsert (non-blocking on failure).

    Response
    --------
    JSON with ``status``, ``georeferenced``, ``footprints`` list, and
    ``geojson`` FeatureCollection.
    """
    filename = file.filename or "upload.bin"
    ext = os.path.splitext(filename)[1].lower()
    if ext not in _ALL_EXTS:
        raise HTTPException(
            status_code=400,
            detail=f"Unsupported format '{ext}'. Accepted: {', '.join(sorted(_ALL_EXTS))}",
        )

    # ------------------------------------------------------------------
    # 1. Write to temp file so rasterio can open it by path
    # ------------------------------------------------------------------
    suffix = ext if ext in _RASTER_EXTS else ".tif"
    tmp = tempfile.NamedTemporaryFile(delete=False, suffix=suffix)
    temp_path: Optional[str] = None

    try:
        content = await file.read()

        # Plain images must be wrapped in a minimal GeoTIFF for rasterio tiling.
        # We do NOT assign fake geo-coordinates â€” the wrapper has no CRS, so the
        # pipeline falls back to pixel-space mode automatically.
        if ext in _IMAGE_EXTS:
            import numpy as np
            from PIL import Image as _PilImage
            import io as _io
            import rasterio as _rio
            from rasterio.transform import from_bounds as _from_bounds
            pil_img = _PilImage.open(_io.BytesIO(content)).convert("RGB")
            arr = np.array(pil_img)          # (H, W, 3)
            arr = np.moveaxis(arr, -1, 0)    # (3, H, W)
            h, w = arr.shape[1], arr.shape[2]
            with _rio.open(
                tmp.name, "w",
                driver="GTiff",
                height=h, width=w, count=3,
                dtype="uint8",
                # No CRS, no transform â†’ extract_raster_geo() will return None
            ) as dst:
                dst.write(arr)
        else:
            tmp.write(content)
        tmp.flush()
        tmp.close()
        temp_path = tmp.name

        # ------------------------------------------------------------------
        # 2. Probe geo-metadata
        # ------------------------------------------------------------------
        geo_info = geo_utils.extract_raster_geo(temp_path)
        is_georeferenced = geo_info is not None
        raster_crs_str: Optional[str] = None
        utm_crs_str: Optional[str] = None
        utm_crs = None

        if is_georeferenced:
            _epsg = geo_info.crs.to_epsg()
            raster_crs_str = f"EPSG:{_epsg}" if _epsg else geo_info.crs.to_string()

            # Centroid in native CRS units (may be metres if projected).
            # Always reproject to EPSG:4326 degrees before calling auto_utm_crs(),
            # which expects (latÂ°, lonÂ°).
            _cx_native = (geo_info.bounds.left + geo_info.bounds.right) / 2.0
            _cy_native = (geo_info.bounds.bottom + geo_info.bounds.top) / 2.0
            if geo_info.crs.is_projected:
                from pyproj import Transformer as _Tr
                _to_4326 = _Tr.from_crs(geo_info.crs, geo_utils._CRS_4326, always_xy=True)
                center_lon, center_lat = _to_4326.transform(_cx_native, _cy_native)
            else:
                center_lon, center_lat = _cx_native, _cy_native

            utm_crs = geo_utils.auto_utm_crs(center_lat, center_lon)
            utm_crs_str = f"EPSG:{utm_crs.to_epsg()}"

        # ------------------------------------------------------------------
        # 3. Tiled YOLO detection â€” rasterio windowed reads
        # ------------------------------------------------------------------
        raw_detections = rasterio_tiler.tile_and_detect(
            temp_path,
            _yolo_model,
            tile_size=640,
            overlap=0.15,
            conf=DEFAULT_CONFIDENCE,
            min_area=MIN_AREA_PX,
            min_dim=MIN_DIM_PX,
        )

        # ------------------------------------------------------------------
        # 4. MobileSAM refinement + cadastral regularisation
        # ------------------------------------------------------------------
        sam = _get_sam()
        refined = sam_refiner.refine_detections(
            temp_path,
            raw_detections,
            sam_model=sam,
            geo_info=geo_info,
            min_area_sqm=4.0,
        )

        # ------------------------------------------------------------------
        # 5 & 6. Build footprints list + GeoJSON FeatureCollection
        # ------------------------------------------------------------------
        footprints = []
        features = []
        summary_counts: dict[str, int] = {
            "building": 0, "vehicle": 0, "person": 0, "other": 0
        }

        import rasterio as _rio_open
        with _rio_open.open(temp_path) as _ds:
            img_w = _ds.width
            img_h = _ds.height

        for det in refined:
            coords_px = det["coordinates"]   # list of [x, y] (closed ring) â€” offset='ul'
            bbox = det.get("bbox", det["coordinates"])
            conf = det.get("confidence", 0.0)
            raw_cat = det.get("category_name", "building")
            is_poly = det.get("is_polygon", False)

            display_name = normalize_display_label(raw_cat, is_custom_aerial=IS_CUSTOM)
            color_info = get_category_color(raw_cat, is_custom_aerial=IS_CUSTOM)
            group = color_info["group"]
            summary_counts[group] = summary_counts.get(group, 0) + 1

            # Pixel-space bbox area for display
            if isinstance(bbox[0], list):
                xs = [p[0] for p in bbox]
                ys = [p[1] for p in bbox]
                bx1, by1, bx2, by2 = min(xs), min(ys), max(xs), max(ys)
            else:
                bx1, by1, bx2, by2 = bbox
            box_w = round(bx2 - bx1, 1)
            box_h = round(by2 - by1, 1)
            area_px = round(box_w * box_h)

            item_id = f"{_id_prefix(group)}-{len(footprints)+1:03d}"

            # ---- Metric properties (UTM â€” never EPSG:4326) ----------------
            area_sqm: Optional[float] = None
            perimeter_m: Optional[float] = None
            geojson_coords = None

            if is_georeferenced and geo_info is not None and utm_crs is not None:
                # pixels_to_geo uses offset='ul' â€” coordinate convention locked
                geo_ring = geo_utils.pixels_to_geo(
                    coords_px, geo_info.transform, geo_info.crs
                )
                poly_4326 = Polygon(geo_ring)
                metrics = geo_utils.compute_metric_properties(poly_4326, utm_crs)
                area_sqm = metrics["area_sqm"]
                perimeter_m = metrics["perimeter_m"]
                geojson_feature = geo_utils.build_geojson_feature(
                    parcel_id=item_id,
                    polygon_4326=poly_4326,
                    properties={
                        "category": display_name,
                        "category_group": group,
                        "confidence": round(conf, 2),
                        "area_sqm": area_sqm,
                        "perimeter_m": perimeter_m,
                        "color": color_info["hex"],
                        "stroke": color_info["hex"],
                        "fillColor": color_info["fill"],
                        "dimensions": f"{box_w} Ã— {box_h} px",
                        "area_px": f"{area_px:,} pxÂ²",
                        "crs": "EPSG:4326",
                    },
                )
                geojson_coords = list(poly_4326.exterior.coords)
            else:
                # Pixel-space mode (CRS.Simple): [x, img_h - y] for Leaflet
                geojson_ring = [[px, img_h - py] for px, py in coords_px]
                geojson_feature = {
                    "type": "Feature",
                    "geometry": {"type": "Polygon", "coordinates": [geojson_ring]},
                    "properties": {
                        "parcel_id": item_id,
                        "category": display_name,
                        "category_group": group,
                        "confidence": round(conf, 2),
                        "area_sqm": None,
                        "perimeter_m": None,
                        "color": color_info["hex"],
                        "stroke": color_info["hex"],
                        "fillColor": color_info["fill"],
                        "dimensions": f"{box_w} Ã— {box_h} px",
                        "area_px": f"{area_px:,} pxÂ²",
                        "crs": "pixel",
                    },
                }

            footprints.append({
                "id": item_id,
                "category": display_name,
                "category_group": group,
                "confidence": round(conf, 2),
                "coordinates": coords_px,
                "bbox": [round(v, 2) for v in [bx1, by1, bx2, by2]],
                "area_sqm": area_sqm,
                "perimeter_m": perimeter_m,
                "area_px": f"{area_px:,} pxÂ²",
                "dimensions": f"{box_w} Ã— {box_h} px",
                "color": color_info["hex"],
                "stroke": color_info["hex"],
                "fillColor": color_info["fill"],
                "is_polygon": is_poly,
            })
            features.append(geojson_feature)

        # ------------------------------------------------------------------
        # 7. Best-effort PostGIS upsert (non-blocking)
        # ------------------------------------------------------------------
        db_saved = 0
        if is_georeferenced and features:
            try:
                db_saved = _save_parcels_to_db(features)
            except Exception as pg_err:
                logger.warning("[PostGIS] Upsert skipped: %s", pg_err)

        return {
            "status": "success",
            "georeferenced": is_georeferenced,
            "image_dimensions": {"width": img_w, "height": img_h},
            "raster_crs": raster_crs_str,
            "utm_crs": utm_crs_str,
            "footprints_detected": summary_counts.get("building", 0),
            "objects_detected": len(footprints),
            "class_summary": summary_counts,
            "postgis_saved": db_saved,
            "footprints": footprints,
            "geojson": {
                "type": "FeatureCollection",
                "crs_note": "EPSG:4326 (WGS84)" if is_georeferenced else "Pixel space (CRS.Simple)",
                "features": features,
            },
        }

    except HTTPException:
        raise
    except Exception as exc:
        logger.exception("detect_footprints failed")
        raise HTTPException(status_code=500, detail=f"Detection failed: {exc}")
    finally:
        if temp_path and os.path.exists(temp_path):
            try:
                os.remove(temp_path)
            except OSError:
                pass


if __name__ == "__main__":
    uvicorn.run("api_server:app", host="0.0.0.0", port=8000, reload=True)class PolygonPayload(BaseModel):
    coordinates: List[List[float]] # [[lat, lon], ...]

@app.post("/api/parcel-metrics")
def compute_metrics(payload: PolygonPayload):
    coords = payload.coordinates
    if not coords or len(coords) < 3:
        return {"area_m2": 0, "perimeter_m": 0, "area_ha": 0}
    
    # WGS84 Geodesic Area (Spherical Shoelace)
    R = 6378137.0
    total_rad = 0.0
    import math
    for i in range(len(coords)):
        lat1, lon1 = math.radians(coords[i][0]), math.radians(coords[i][1])
        lat2, lon2 = math.radians(coords[(i + 1) % len(coords)][0]), math.radians(coords[(i + 1) % len(coords)][1])
        total_rad += (lon2 - lon1) * (2 + math.sin(lat1) + math.sin(lat2))
    area_m2 = abs(total_rad * R * R / 4.0)

    # Haversine Perimeter
    R_dist = 6371000.0
    perimeter_m = 0.0
    for i in range(len(coords)):
        lat1, lon1 = math.radians(coords[i][0]), math.radians(coords[i][1])
        lat2, lon2 = math.radians(coords[(i + 1) % len(coords)][0]), math.radians(coords[(i + 1) % len(coords)][1])
        dlat = lat2 - lat1
        dlon = lon2 - lon1
        a = math.sin(dlat / 2)**2 + math.cos(lat1) * math.cos(lat2) * math.sin(dlon / 2)**2
        perimeter_m += 2 * R_dist * math.atan2(math.sqrt(a), math.sqrt(1 - a))

    return {
        "area_m2": int(round(area_m2)),
        "perimeter_m": int(round(perimeter_m)),
        "area_ha": round(area_m2 / 10000.0, 4)
    }

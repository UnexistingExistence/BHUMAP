"""
Geospatial utilities for BhuMap cadastral mapping pipeline.

Handles CRS detection, auto-UTM zone selection, pixel→geo coordinate
transforms, and metric area/perimeter calculation.

All area and length maths use a UTM CRS auto-selected from the raster
centroid.  GeoJSON output is always EPSG:4326.  Area is NEVER computed
directly in EPSG:4326 (degree² is meaningless for cadastral work).
"""

from __future__ import annotations

from dataclasses import dataclass
from typing import List, Optional, Tuple

import math

import rasterio
from rasterio.transform import xy, Affine
from pyproj import CRS, Transformer
from pyproj.aoi import AreaOfInterest
from pyproj.database import query_utm_crs_info
from shapely.geometry import Polygon, mapping
from shapely.ops import transform as shapely_transform


# ---------------------------------------------------------------------------
#  Data structures
# ---------------------------------------------------------------------------

@dataclass
class RasterGeoInfo:
    """Geospatial metadata extracted from a georeferenced raster."""

    crs: CRS
    transform: Affine
    bounds: rasterio.coords.BoundingBox
    width: int
    height: int
    gsd_x: float  # pixel size in CRS units (x direction)
    gsd_y: float  # pixel size in CRS units (y direction, absolute)


# ---------------------------------------------------------------------------
#  Raster metadata extraction
# ---------------------------------------------------------------------------

def extract_raster_geo(raster_path: str) -> Optional[RasterGeoInfo]:
    """
    Extract geospatial metadata from a raster file.

    Returns *None* (never raises) when the file is missing, unreadable,
    has no CRS, or its affine transform is the identity (i.e. no real
    georeferencing).
    """
    try:
        with rasterio.open(raster_path) as src:
            if src.crs is None:
                return None

            transform = src.transform

            # Identity transform → no real georeferencing
            if transform == Affine.identity():
                return None

            # Degenerate transform (zero pixel size)
            if transform.a == 0 or transform.e == 0:
                return None

            return RasterGeoInfo(
                crs=CRS.from_user_input(src.crs),
                transform=transform,
                bounds=src.bounds,
                width=src.width,
                height=src.height,
                gsd_x=abs(transform.a),
                gsd_y=abs(transform.e),
            )
    except Exception:
        return None


def get_raster_gsd_meters(geo_info: RasterGeoInfo) -> float:
    """
    Calculate the ground sampling distance (GSD) in metres.

    - If the native CRS is projected, linear units are metres.
    - If geographic (e.g. EPSG:4326 degrees), reprojects a 1-pixel displacement
      from the raster centroid into UTM to calculate ground distance in metres.
    """
    if geo_info.crs.is_projected:
        return float((geo_info.gsd_x + geo_info.gsd_y) / 2.0)

    # Geographic CRS (degrees): reproject 1-pixel step to UTM
    center_lon = (geo_info.bounds.left + geo_info.bounds.right) / 2.0
    center_lat = (geo_info.bounds.bottom + geo_info.bounds.top) / 2.0
    utm = auto_utm_crs(center_lat, center_lon)
    trans = Transformer.from_crs(geo_info.crs, utm, always_xy=True)

    x0, y0 = trans.transform(center_lon, center_lat)
    x1, y1 = trans.transform(center_lon + geo_info.gsd_x, center_lat)
    x2, y2 = trans.transform(center_lon, center_lat + geo_info.gsd_y)

    dx = math.hypot(x1 - x0, y1 - y0)
    dy = math.hypot(x2 - x0, y2 - y0)
    return float((dx + dy) / 2.0)


# ---------------------------------------------------------------------------
#  CRS helpers
# ---------------------------------------------------------------------------

_CRS_4326 = CRS.from_epsg(4326)


def auto_utm_crs(lat: float, lon: float) -> CRS:
    """
    Auto-select the correct UTM CRS for a given lat/lon point.

    Uses the PROJ database via ``pyproj.database.query_utm_crs_info``
    for accuracy (handles Norway / Svalbard edge-cases).  Falls back to
    manual zone calculation if the DB query returns nothing.
    """
    utm_crs_list = query_utm_crs_info(
        datum_name="WGS 84",
        area_of_interest=AreaOfInterest(
            west_lon_degree=lon,
            south_lat_degree=lat,
            east_lon_degree=lon,
            north_lat_degree=lat,
        ),
    )
    if not utm_crs_list:
        # Fallback: manual UTM zone calculation
        zone = int((lon + 180) / 6) + 1
        epsg = 32600 + zone if lat >= 0 else 32700 + zone
        return CRS.from_epsg(epsg)

    return CRS.from_epsg(utm_crs_list[0].code)


# ---------------------------------------------------------------------------
#  Coordinate transforms
# ---------------------------------------------------------------------------

def pixels_to_geo(
    pixel_coords: List[Tuple[float, float]],
    affine_transform: Affine,
    src_crs: CRS,
) -> List[Tuple[float, float]]:
    """
    Convert pixel coordinates to EPSG:4326 geographic coordinates.

    Parameters
    ----------
    pixel_coords : list of (col, row)  i.e. (x_px, y_px) in pixel space
    affine_transform : rasterio Affine transform of the source raster
    src_crs : CRS of the source raster

    Returns
    -------
    list of (longitude, latitude) tuples in EPSG:4326
    """
    # Step 1: pixel → native CRS coordinates
    native_coords = []
    for px, py in pixel_coords:
        # rasterio.transform.xy(transform, row, col, offset='ul')
        # offset='ul' → upper-left corner of pixel (exact, no +0.5 shift)
        x_geo, y_geo = xy(affine_transform, py, px, offset='ul')
        native_coords.append((x_geo, y_geo))

    # Step 2: reproject to EPSG:4326 if needed
    if src_crs.to_epsg() == 4326:
        return native_coords

    transformer = Transformer.from_crs(src_crs, _CRS_4326, always_xy=True)
    return [transformer.transform(x, y) for x, y in native_coords]


def geo_to_pixels(
    geo_coords_4326: List[Tuple[float, float]],
    affine_transform: Affine,
    raster_crs: CRS,
) -> List[Tuple[float, float]]:
    """
    Convert EPSG:4326 geographic coordinates back to pixel coordinates.

    This is the inverse of :func:`pixels_to_geo`.  It uses the exact
    inverse affine (no ``math.floor`` rounding) so that round-trip error
    stays below floating-point epsilon.

    Returns
    -------
    list of (col, row)  i.e. (x_px, y_px) in pixel space
    """
    # Step 1: EPSG:4326 → native CRS
    if raster_crs.to_epsg() == 4326:
        native_coords = geo_coords_4326
    else:
        transformer = Transformer.from_crs(_CRS_4326, raster_crs, always_xy=True)
        native_coords = [transformer.transform(lon, lat) for lon, lat in geo_coords_4326]

    # Step 2: native CRS → pixel via the inverse affine (no rounding)
    inv = ~affine_transform
    pixel_coords = []
    for x, y in native_coords:
        col, row = inv @ (x, y)
        pixel_coords.append((col, row))

    return pixel_coords


# ---------------------------------------------------------------------------
#  Metric computations
# ---------------------------------------------------------------------------

def compute_metric_properties(
    polygon_4326: Polygon,
    utm_crs: CRS,
) -> dict:
    """
    Compute area (m²) and perimeter (m) of a polygon.

    The polygon is reprojected from EPSG:4326 to the supplied UTM CRS
    before any measurement is taken.  This function **never** computes
    area directly in EPSG:4326 — degree² values are meaningless for
    cadastral work.

    Returns
    -------
    dict with keys ``area_sqm`` (float) and ``perimeter_m`` (float)
    """
    transformer = Transformer.from_crs(_CRS_4326, utm_crs, always_xy=True)
    polygon_utm = shapely_transform(transformer.transform, polygon_4326)

    return {
        "area_sqm": round(polygon_utm.area, 2),
        "perimeter_m": round(polygon_utm.length, 2),
    }


# ---------------------------------------------------------------------------
#  GeoJSON helpers
# ---------------------------------------------------------------------------

def build_geojson_feature(
    parcel_id: str,
    polygon_4326: Polygon,
    properties: dict,
) -> dict:
    """
    Construct a standards-compliant RFC 7946 GeoJSON Feature.

    Coordinates are in EPSG:4326 ``[longitude, latitude]`` order.
    """
    return {
        "type": "Feature",
        "geometry": mapping(polygon_4326),
        "properties": {
            "parcel_id": parcel_id,
            **properties,
        },
    }

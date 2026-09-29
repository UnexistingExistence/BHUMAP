"""
Direct pipeline test — bypasses the HTTP server entirely.
Runs the same code path as detect_footprints() to confirm the fix works.
"""
import sys, os, json, tempfile, shutil
sys.path.insert(0, ".")

import rasterio, geo_utils, rasterio_tiler, sam_refiner
from pyproj import Transformer
from shapely.geometry import Polygon

RASTER = r"data\test_samples\orthophoto.tif"
MIN_AREA = 400.0
MIN_DIM  = 15.0
CONF     = 0.55

# Step 1: copy raster to temp (server writes uploads to tmp)
tmp = tempfile.NamedTemporaryFile(delete=False, suffix=".tif")
tmp.close()
shutil.copy(RASTER, tmp.name)
temp_path = tmp.name

try:
    # Step 2: geo probe
    geo_info = geo_utils.extract_raster_geo(temp_path)
    print(f"georeferenced   : {geo_info is not None}")
    if geo_info:
        _epsg = geo_info.crs.to_epsg()
        raster_crs_str = f"EPSG:{_epsg}" if _epsg else geo_info.crs.to_string()

        _cx = (geo_info.bounds.left + geo_info.bounds.right) / 2.0
        _cy = (geo_info.bounds.bottom + geo_info.bounds.top) / 2.0
        if geo_info.crs.is_projected:
            to_4326 = Transformer.from_crs(geo_info.crs, geo_utils._CRS_4326, always_xy=True)
            center_lon, center_lat = to_4326.transform(_cx, _cy)
        else:
            center_lon, center_lat = _cx, _cy

        utm_crs = geo_utils.auto_utm_crs(center_lat, center_lon)
        utm_crs_str = f"EPSG:{utm_crs.to_epsg()}"
        print(f"raster_crs      : {raster_crs_str}")
        print(f"utm_crs         : {utm_crs_str}")
        print(f"centroid_4326   : lat={center_lat:.6f}, lon={center_lon:.6f}")
    else:
        utm_crs = None

    # Step 3: YOLO detection
    from ultralytics import YOLO
    from tiling_engine import MODEL_PATH, DEFAULT_CONFIDENCE
    model = YOLO(MODEL_PATH)
    print(f"\nRunning tiled YOLO on {RASTER} ...")
    raw_dets = rasterio_tiler.tile_and_detect(
        temp_path, model,
        tile_size=640, overlap=0.15, conf=CONF,
        min_area=MIN_AREA, min_dim=MIN_DIM,
    )
    print(f"Raw detections  : {len(raw_dets)}")

    # Step 4: SAM refine
    sam = sam_refiner.get_sam_model("mobile_sam.pt")
    refined = sam_refiner.refine_detections(
        temp_path, raw_dets,
        sam_model=sam,
        geo_info=geo_info,
        min_area_sqm=4.0,
    )
    print(f"Refined features: {len(refined)}")

    # Step 5: metric props for first 3
    print("\n--- First 3 features (area_sqm, perimeter_m, vertices) ---")
    for i, det in enumerate(refined[:3]):
        coords_px = det["coordinates"]
        geo_ring = geo_utils.pixels_to_geo(coords_px, geo_info.transform, geo_info.crs)
        poly_4326 = Polygon(geo_ring)
        metrics = geo_utils.compute_metric_properties(poly_4326, utm_crs)
        feat = geo_utils.build_geojson_feature(
            parcel_id=f"BLDG-{i+1:03d}",
            polygon_4326=poly_4326,
            properties={
                "category": det.get("category_name", "building"),
                "confidence": round(det.get("confidence", 0.0), 2),
                **metrics,
                "crs": "EPSG:4326",
            }
        )
        ring = feat["geometry"]["coordinates"][0]
        sample_coord = ring[0] if ring else "N/A"
        print(f"  #{i+1}: area_sqm={metrics['area_sqm']}, "
              f"perimeter_m={metrics['perimeter_m']}, "
              f"vertices={len(ring)}, "
              f"sample_coord={sample_coord}")

finally:
    os.remove(temp_path)

print("\nDone.")

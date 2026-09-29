"""
Verification script comparing Pre-Regularization vs Post-Regularization for Checkpoint B.
Runs on test_drone(1524).tif with the exact same 5 detections.
"""
import sys
from shapely.geometry import Polygon, MultiPolygon
from ultralytics import YOLO
import rasterio

import geo_utils
import rasterio_tiler
import sam_refiner

RASTER_PATH = "test_drone(1524).tif"
MODEL_PATH = "best.pt"

print("=" * 70)
print("RUNNING REGULARIZATION VERIFICATION PIPELINE ON test_drone(1524).tif")
print("=" * 70)

# 1. Geo metadata
geo_info = geo_utils.extract_raster_geo(RASTER_PATH)
center_lon = (geo_info.bounds[0] + geo_info.bounds[2]) / 2.0
center_lat = (geo_info.bounds[1] + geo_info.bounds[3]) / 2.0
utm_crs = geo_utils.auto_utm_crs(center_lat, center_lon)
gsd_m = geo_utils.get_raster_gsd_meters(geo_info)

print(f"Raster CRS: {geo_info.crs.to_epsg() or geo_info.crs.to_string()[:20]}")
print(f"Centroid UTM: {utm_crs.to_epsg()}")
print(f"Ground GSD: {gsd_m:.4f} m/px (~{gsd_m*100:.1f} cm)")
print(f"Ground-tolerance (0.15 / GSD): {0.15 / gsd_m:.2f} px\n")

# 2. YOLO Tiled Detection (same parameters)
yolo = YOLO(MODEL_PATH)
raw_detections = rasterio_tiler.tile_and_detect(
    RASTER_PATH,
    yolo,
    tile_size=640,
    overlap=0.15,
    conf=0.25,
)
print(f"YOLO detections: {len(raw_detections)}")

# 3. Post-Regularization run via sam_refiner.refine_detections
sam_model = sam_refiner.get_sam_model("mobile_sam.pt")
refined_post = sam_refiner.refine_detections(
    RASTER_PATH,
    raw_detections,
    sam_model=sam_model,
    geo_info=geo_info,
    min_area_sqm=4.0,
)

# Also run pre-regularization on the same detections (using 1.0px simplify as in earlier run)
with rasterio.open(RASTER_PATH) as ds:
    print("\n" + "=" * 70)
    print("DETECTION COMPARISON (BEFORE vs AFTER REGULARIZATION)")
    print("=" * 70)

    for i in range(min(5, len(refined_post))):
        det_post = refined_post[i]
        bbox = det_post["bbox"]
        conf = det_post["confidence"]
        cls_name = det_post["category_name"]

        # Pre-regularization raw mask
        crop_rgb, col_off, row_off = rasterio_tiler.read_tile_for_sam(ds, bbox, padding=32)
        rel_box = [
            max(0.0, bbox[0] - col_off),
            max(0.0, bbox[1] - row_off),
            min(float(crop_rgb.shape[1]), bbox[2] - col_off),
            min(float(crop_rgb.shape[0]), bbox[3] - row_off),
        ]
        res = sam_model.predict(source=crop_rgb, bboxes=[rel_box], verbose=False)
        pts = [(float(pt[0]) + col_off, float(pt[1]) + row_off) for pt in res[0].masks.xy[0]]
        poly_pre = Polygon(pts)
        if not poly_pre.is_valid:
            poly_pre = poly_pre.buffer(0)
        if isinstance(poly_pre, MultiPolygon):
            poly_pre = max(poly_pre.geoms, key=lambda g: g.area)
        poly_pre_simp = poly_pre.simplify(1.0, preserve_topology=True)
        if isinstance(poly_pre_simp, MultiPolygon):
            poly_pre_simp = max(poly_pre_simp.geoms, key=lambda g: g.area)

        # Pre metrics
        g_pre = geo_utils.pixels_to_geo(list(poly_pre_simp.exterior.coords), geo_info.transform, geo_info.crs)
        m_pre = geo_utils.compute_metric_properties(Polygon(g_pre), utm_crs)

        # Post metrics
        coords_post = det_post["coordinates"]
        g_post = geo_utils.pixels_to_geo(coords_post, geo_info.transform, geo_info.crs)
        m_post = geo_utils.compute_metric_properties(Polygon(g_post), utm_crs)

        v_pre = len(poly_pre_simp.exterior.coords)
        v_post = len(coords_post)
        area_diff = m_post["area_sqm"] - m_pre["area_sqm"]
        area_diff_pct = (area_diff / m_pre["area_sqm"]) * 100.0

        print(f"\n--- Detection #{i+1} ({cls_name}, conf={conf:.2f}) ---")
        print(f"   BBox: {bbox}")
        print(f"   Vertices:      {v_pre} pts (raw/simple)  -->  {v_post} pts (regularized)")
        print(f"   Area (UTM):    {m_pre['area_sqm']:.2f} m²  -->  {m_post['area_sqm']:.2f} m² (shift: {area_diff:+.2f} m² / {area_diff_pct:+.2f}%)")
        print(f"   Perim (UTM):   {m_pre['perimeter_m']:.2f} m  -->  {m_post['perimeter_m']:.2f} m")
        print(f"   Coordinates:   {coords_post[:3]} ... (total {v_post} points)")

print("\n" + "=" * 70)
print("VERIFICATION COMPLETE")
print("=" * 70)

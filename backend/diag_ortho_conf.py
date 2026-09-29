"""
Diagnostic: raw YOLO detections on orthophoto.tif
- Reports confidence threshold in use
- Runs YOLO at conf=0.0 to capture ALL raw detections (before any filtering)
- Re-runs at the production threshold to show what survives
- Saves a visual overlay PNG of the final detection
"""
import sys, os
sys.path.insert(0, ".")

import numpy as np
import rasterio
import torch
import cv2
from ultralytics import YOLO
from tiling_engine import MODEL_PATH, IS_CUSTOM, DEFAULT_CONFIDENCE, MIN_AREA_PX, MIN_DIM_PX
from rasterio.windows import Window
import rasterio_tiler

RASTER = r"data\test_samples\orthophoto.tif"
OVERLAY_OUT = r"data\test_samples\orthophoto_overlay.png"

print("=" * 65)
print("ORTHOPHOTO CONFIDENCE DIAGNOSTIC")
print("=" * 65)
print(f"Model path      : {MODEL_PATH}")
print(f"IS_CUSTOM       : {IS_CUSTOM}")
print(f"Production conf : {DEFAULT_CONFIDENCE}  (DEFAULT_CONFIDENCE from tiling_engine)")
print(f"MIN_AREA_PX     : {MIN_AREA_PX} px²")
print(f"MIN_DIM_PX      : {MIN_DIM_PX} px")

with rasterio.open(RASTER) as ds:
    print(f"\nRaster          : {ds.width} x {ds.height} px,  CRS={ds.crs},  bands={ds.count}")

# ── 1. Run at conf=0.001 to see ALL predictions the model emits ──────────────
print("\n" + "=" * 65)
print("STEP 1: ALL RAW DETECTIONS (conf=0.001, no area/dim filter, no NMS)")
print("=" * 65)

model = YOLO(MODEL_PATH)
all_raw_scores = []

with rasterio.open(RASTER) as ds:
    windows = rasterio_tiler._generate_windows(ds.width, ds.height, 640, 0.15)
    print(f"Total tiles     : {len(windows)}")

    tile_idx = 0
    for win in windows:
        tile_rgb = rasterio_tiler._read_window_rgb(ds, win)
        with torch.inference_mode():
            results = model.predict(source=tile_rgb, conf=0.001, verbose=False, imgsz=640)
        if results and results[0].boxes is not None and len(results[0].boxes) > 0:
            for j in range(len(results[0].boxes)):
                score = float(results[0].boxes.conf[j].cpu())
                x1, y1, x2, y2 = results[0].boxes.xyxy[j].cpu().numpy()
                gx1, gy1, gx2, gy2 = x1+win.col_off, y1+win.row_off, x2+win.col_off, y2+win.row_off
                cls_id = int(results[0].boxes.cls[j].cpu())
                cat = results[0].names.get(cls_id, f"cls{cls_id}")
                all_raw_scores.append((score, gx1, gy1, gx2, gy2, cat, win.col_off, win.row_off))
        tile_idx += 1
        if torch.cuda.is_available():
            torch.cuda.empty_cache()

print(f"\nTotal raw detections across all tiles (conf>0.001): {len(all_raw_scores)}")
print(f"\n{'Rank':>4}  {'Conf':>6}  {'Category':<20}  {'BBox (global px)'}")
print("-" * 65)
all_raw_scores.sort(key=lambda x: -x[0])
for rank, (score, gx1, gy1, gx2, gy2, cat, co, ro) in enumerate(all_raw_scores, 1):
    marker = "  ← ABOVE THRESHOLD" if score >= DEFAULT_CONFIDENCE else ""
    print(f"{rank:>4}  {score:>6.3f}  {cat:<20}  [{gx1:.0f},{gy1:.0f},{gx2:.0f},{gy2:.0f}]{marker}")

# ── 2. Production run (with threshold + NMS + area filter) ───────────────────
print("\n" + "=" * 65)
print(f"STEP 2: PRODUCTION PIPELINE (conf={DEFAULT_CONFIDENCE}, NMS IoU=0.5, area≥{MIN_AREA_PX}px²)")
print("=" * 65)

prod_dets = rasterio_tiler.tile_and_detect(
    RASTER, model,
    tile_size=640, overlap=0.15,
    conf=DEFAULT_CONFIDENCE,
    min_area=MIN_AREA_PX, min_dim=MIN_DIM_PX,
)
print(f"Surviving detections: {len(prod_dets)}")
for i, d in enumerate(prod_dets):
    bx = d["coordinates"]
    w, h = bx[2]-bx[0], bx[3]-bx[1]
    print(f"  #{i+1}: conf={d['confidence']:.3f}  cat={d['category_name']}"
          f"  bbox=[{bx[0]:.1f},{bx[1]:.1f},{bx[2]:.1f},{bx[3]:.1f}]"
          f"  size={w:.0f}x{h:.0f}px  area={w*h:.0f}px²")

# ── 3. Visual overlay ────────────────────────────────────────────────────────
print("\n" + "=" * 65)
print("STEP 3: VISUAL OVERLAY")
print("=" * 65)

if not prod_dets:
    print("No production detections — saving full thumbnail with 'NO DETECTIONS' label.")

# Render a thumbnail of the full ortho with boxes overlaid
THUMB_SIZE = 1024  # max dimension of output image
with rasterio.open(RASTER) as ds:
    # Read full image for overlay (ortho is only 3446x2758 ≈ 9 MP — fine for vis)
    bands = list(range(1, min(ds.count, 3) + 1))
    arr = ds.read(bands)                  # (C, H, W)
    if arr.dtype == np.uint16:
        arr = (arr / 256).astype(np.uint8)
    elif arr.dtype != np.uint8:
        arr = np.clip(arr, 0, 255).astype(np.uint8)
    img = np.transpose(arr, (1, 2, 0))   # (H, W, C)
    if img.shape[2] == 1:
        img = np.repeat(img, 3, axis=2)
    img_h, img_w = img.shape[:2]

# Scale factor for thumbnail
scale = min(THUMB_SIZE / img_w, THUMB_SIZE / img_h)
thumb_w = int(img_w * scale)
thumb_h = int(img_h * scale)
thumb = cv2.resize(img, (thumb_w, thumb_h), interpolation=cv2.INTER_AREA)
thumb_bgr = cv2.cvtColor(thumb, cv2.COLOR_RGB2BGR)

if prod_dets:
    for i, d in enumerate(prod_dets):
        bx = d["coordinates"]
        # Scale box to thumbnail coordinates
        tx1 = int(bx[0] * scale)
        ty1 = int(bx[1] * scale)
        tx2 = int(bx[2] * scale)
        ty2 = int(bx[3] * scale)
        conf = d["confidence"]
        label = f"{d['category_name']} {conf:.2f}"

        # Draw box and label
        cv2.rectangle(thumb_bgr, (tx1, ty1), (tx2, ty2), (0, 80, 255), 3)
        (lw, lh), base = cv2.getTextSize(label, cv2.FONT_HERSHEY_SIMPLEX, 0.7, 2)
        cv2.rectangle(thumb_bgr, (tx1, ty1 - lh - base - 6), (tx1 + lw + 4, ty1), (0, 80, 255), -1)
        cv2.putText(thumb_bgr, label, (tx1 + 2, ty1 - base - 2),
                    cv2.FONT_HERSHEY_SIMPLEX, 0.7, (255, 255, 255), 2, cv2.LINE_AA)
else:
    cv2.putText(thumb_bgr, "NO DETECTIONS", (20, 60),
                cv2.FONT_HERSHEY_SIMPLEX, 2, (0, 0, 255), 4, cv2.LINE_AA)

cv2.imwrite(OVERLAY_OUT, thumb_bgr)
print(f"Overlay saved → {os.path.abspath(OVERLAY_OUT)}")
print(f"Thumbnail size : {thumb_w} x {thumb_h} px  (scale={scale:.4f})")
if prod_dets:
    bx = prod_dets[0]["coordinates"]
    w_px, h_px = bx[2]-bx[0], bx[3]-bx[1]
    print(f"Detected box   : [{bx[0]:.1f},{bx[1]:.1f},{bx[2]:.1f},{bx[3]:.1f}]  "
          f"({w_px:.0f}x{h_px:.0f}px, area={w_px*h_px:.0f}px²)")

print("\nDone.")

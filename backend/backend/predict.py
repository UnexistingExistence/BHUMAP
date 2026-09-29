import os
from pathlib import Path
import cv2
import numpy as np
from PIL import Image
from ultralytics import YOLO

from tiling_engine import MODEL_PATH, DEFAULT_CONFIDENCE, predict_stitched
from color_utils import get_category_color, draw_bounding_boxes_cv2, draw_bounding_boxes_pil


def run_prediction(image_path: str = None, use_sahi: bool = True, conf: float = DEFAULT_CONFIDENCE):
    """
    Runs multi-class object detection and generates a color-coded annotated image:
      - Blue: Buildings / Roofs / Footprints
      - Red: Vehicles / Cars / Trucks
      - Green: People / Pedestrians
    """
    print(f"[Predict] Loading model from: {MODEL_PATH}")
    model = YOLO(MODEL_PATH)

    # 1. Resolve test image
    if not image_path:
        backend_dir = Path(__file__).resolve().parent
        candidate_images = [
            backend_dir / "1524.png",
            backend_dir / "test_drone_img.jpg",
            backend_dir / "datasets" / "aerial_mapping" / "dataset" / "dataset" / "test" / "images" / "1386.png",
        ]
        for img_p in candidate_images:
            if img_p.exists():
                image_path = str(img_p)
                break

    if not image_path or not os.path.exists(image_path):
        print("[Predict] No valid input image found to run prediction on.")
        return None

    print(f"[Predict] Running multi-class inference on: {image_path} (Confidence threshold: {conf})")

    # 2. Extract detections (via SAHI or YOLO)
    detections = []
    if use_sahi:
        sahi_out = predict_stitched(image_path, conf=conf)
        detections = sahi_out.get("data", [])
    else:
        results = model.predict(source=image_path, conf=conf, verbose=False)
        for r in results:
            for box in r.boxes:
                coords = [round(float(c), 2) for c in box.xyxy[0].tolist()]
                confidence = float(box.conf[0])
                cls_id = int(box.cls[0])
                cat_name = model.names.get(cls_id, "building")
                color_info = get_category_color(cat_name)
                detections.append({
                    "coordinates": coords,
                    "confidence": round(confidence, 2),
                    "category_name": cat_name,
                    "category_group": color_info["group"],
                    "category_id": cls_id,
                    "color": color_info["hex"],
                    "fillColor": color_info["fill"],
                    "stroke": color_info["hex"],
                })

    print(f"[Predict] Total detections above {conf} confidence: {len(detections)}")

    # 3. Draw multi-class color-coded bounding boxes using OpenCV
    cv2_img = cv2.imread(image_path)
    if cv2_img is not None:
        annotated_img = draw_bounding_boxes_cv2(cv2_img, detections, thickness=2)
        output_dir = Path(__file__).resolve().parent / "runs" / "annotated_predictions"
        output_dir.mkdir(parents=True, exist_ok=True)
        stem = Path(image_path).stem
        save_path = output_dir / f"{stem}_annotated.png"
        cv2.imwrite(str(save_path), annotated_img)
        print(f"[Predict] Color-coded annotated image saved to: {save_path}")
        return str(save_path)

    return None


if __name__ == "__main__":
    run_prediction()
"""
Color mapping and annotation utilities for multi-class drone object detection.
Assigns distinct color schemes:
  - Blue for houses / roofs / building footprints
  - Red for vehicles / cars / trucks
  - Green for people / pedestrians
  - Amber for others
"""

from typing import Dict, Any, Tuple, Union, List
import numpy as np
from PIL import Image, ImageDraw, ImageFont
import cv2

# Canonical category styling specifications
COLOR_SCHEMES = {
    "building": {
        "hex": "#3b82f6",          # Bright Blue
        "fill": "rgba(59, 130, 246, 0.35)",
        "rgb": (59, 130, 246),
        "bgr": (246, 130, 59),     # OpenCV BGR format
        "label": "Building / Roof",
    },
    "vehicle": {
        "hex": "#ef4444",          # Vivid Red
        "fill": "rgba(239, 68, 68, 0.35)",
        "rgb": (239, 68, 68),
        "bgr": (68, 68, 239),      # OpenCV BGR format
        "label": "Vehicle",
    },
    "person": {
        "hex": "#10b981",          # Emerald Green
        "fill": "rgba(16, 185, 129, 0.35)",
        "rgb": (16, 185, 129),
        "bgr": (129, 185, 16),     # OpenCV BGR format
        "label": "Person / Pedestrian",
    },
    "other": {
        "hex": "#f59e0b",          # Amber
        "fill": "rgba(245, 158, 11, 0.35)",
        "rgb": (245, 158, 11),
        "bgr": (11, 158, 245),     # OpenCV BGR format
        "label": "Object",
    },
}

BUILDING_KEYWORDS = {
    "roof", "building", "house", "footprint", "cadastral", "structure",
    "home", "apartment", "shed", "barn", "construction"
}

VEHICLE_KEYWORDS = {
    "car", "vehicle", "truck", "bus", "van", "automobile", "motorcycle",
    "motorbike", "bike", "bicycle", "train", "boat", "airplane", "aeroplane"
}

PERSON_KEYWORDS = {
    "person", "pedestrian", "people", "man", "woman", "child", "human"
}


def categorize_label(raw_label: str) -> str:
    """Classifies a detection label into building, vehicle, person, or other."""
    if not raw_label:
        return "building"
    norm = str(raw_label).strip().lower()

    if any(k in norm for k in BUILDING_KEYWORDS):
        return "building"
    if any(k in norm for k in VEHICLE_KEYWORDS):
        return "vehicle"
    if any(k in norm for k in PERSON_KEYWORDS):
        return "person"
    return "other"


def normalize_display_label(raw_label: str, is_custom_aerial: bool = False) -> str:
    """
    Returns a professional user-facing category title.
    If using the custom aerial model (which trains purely on buildings/roofs),
    all detections are cleanly presented as "Building Footprint".
    """
    if is_custom_aerial:
        return "Building Footprint"

    group = categorize_label(raw_label)
    if group == "building":
        return "Building Footprint"
    elif group == "vehicle":
        norm = str(raw_label).lower()
        if "truck" in norm: return "Truck"
        if "bus" in norm: return "Bus"
        if "motorcycle" in norm or "bike" in norm: return "Motorcycle"
        return "Vehicle"
    elif group == "person":
        return "Person"
    return str(raw_label).capitalize() if raw_label else "Building Footprint"


def get_category_color(category_name: str, is_custom_aerial: bool = False) -> Dict[str, Any]:
    """
    Returns the visual color mapping dictionary for a given category name.
    """
    if is_custom_aerial:
        scheme = COLOR_SCHEMES["building"].copy()
        scheme["group"] = "building"
        return scheme

    group = categorize_label(category_name)
    scheme = COLOR_SCHEMES.get(group, COLOR_SCHEMES["other"]).copy()
    scheme["group"] = group
    return scheme


def draw_bounding_boxes_cv2(
    image: np.ndarray,
    detections: List[Dict[str, Any]],
    thickness: int = 2,
) -> np.ndarray:
    """
    Draws multi-class color-coded bounding boxes onto an OpenCV BGR image.
    """
    output = image.copy()
    for det in detections:
        coords = det.get("coordinates") or det.get("bbox")
        if not coords or len(coords) < 4:
            continue
        xmin, ymin, xmax, ymax = [int(round(c)) for c in coords[:4]]
        cat = det.get("category_name") or det.get("category") or "building"
        conf = det.get("confidence", 0.0)

        color_info = get_category_color(cat)
        bgr_color = color_info["bgr"]

        # Draw main bounding box
        cv2.rectangle(output, (xmin, ymin), (xmax, ymax), bgr_color, thickness)

        # Label background pill
        label_text = f"{cat.capitalize()} {int(conf * 100)}%"
        font_scale = 0.5
        font_thick = 1
        (label_w, label_h), baseline = cv2.getTextSize(
            label_text, cv2.FONT_HERSHEY_SIMPLEX, font_scale, font_thick
        )
        
        # Ensure label sits nicely above or inside box
        label_ymin = max(ymin - 6, label_h + 6)
        cv2.rectangle(
            output,
            (xmin, label_ymin - label_h - 4),
            (xmin + label_w + 6, label_ymin + 2),
            bgr_color,
            -1,
        )
        cv2.putText(
            output,
            label_text,
            (xmin + 3, label_ymin - 2),
            cv2.FONT_HERSHEY_SIMPLEX,
            font_scale,
            (255, 255, 255),
            font_thick,
            cv2.LINE_AA,
        )

    return output


def draw_bounding_boxes_pil(
    image: Image.Image,
    detections: List[Dict[str, Any]],
    width: int = 2,
) -> Image.Image:
    """
    Draws multi-class color-coded bounding boxes onto a PIL Image.
    """
    output = image.copy().convert("RGBA")
    draw = ImageDraw.Draw(output)

    for det in detections:
        coords = det.get("coordinates") or det.get("bbox")
        if not coords or len(coords) < 4:
            continue
        xmin, ymin, xmax, ymax = [int(round(c)) for c in coords[:4]]
        cat = det.get("category_name") or det.get("category") or "building"
        conf = det.get("confidence", 0.0)

        color_info = get_category_color(cat)
        rgb_color = color_info["rgb"]

        # Draw bounding rectangle
        draw.rectangle([xmin, ymin, xmax, ymax], outline=rgb_color, width=width)

        # Label banner
        label_text = f"{cat.capitalize()} {int(conf * 100)}%"
        label_y = max(ymin - 16, 2)
        draw.rectangle([xmin, label_y, xmin + len(label_text) * 7 + 8, label_y + 14], fill=rgb_color)
        draw.text((xmin + 4, label_y + 1), label_text, fill=(255, 255, 255))

    return output.convert("RGB")

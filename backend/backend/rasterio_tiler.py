"""
Rasterio windowed-read tiling engine for large GeoTIFF inference.

Replaces SAHI's full-image-load approach with memory-efficient rasterio
windowed reads.  Supports images up to 20 000 × 20 000 px without loading
the full raster into memory.

Pixel convention
----------------
(0, 0) = upper-left corner of the top-left pixel, matching
``geo_utils.py``'s ``offset='ul'`` convention.  Tile-local coordinates
are offset to global coordinates by adding ``window.col_off`` /
``window.row_off`` — a pure translation with no half-pixel shift.
"""

from __future__ import annotations

import logging
from typing import Any, Dict, List, Tuple

import numpy as np
import torch
import torchvision
import rasterio
from rasterio.windows import Window

logger = logging.getLogger(__name__)

# ── Default tiling parameters (tuned for RTX 2050, 4 GB VRAM) ──────────────

TILE_SIZE = 640
OVERLAP_RATIO = 0.15
DEFAULT_CONF = 0.55
MIN_AREA_PX = 400
MIN_DIM_PX = 15


# ── Internal helpers ────────────────────────────────────────────────────────


def _generate_windows(
    raster_width: int,
    raster_height: int,
    tile_size: int = TILE_SIZE,
    overlap: float = OVERLAP_RATIO,
) -> List[Window]:
    """Generate a grid of ``rasterio.windows.Window`` with overlap."""
    stride = max(1, int(tile_size * (1 - overlap)))
    windows: List[Window] = []

    for row_off in range(0, raster_height, stride):
        for col_off in range(0, raster_width, stride):
            win_w = min(tile_size, raster_width - col_off)
            win_h = min(tile_size, raster_height - row_off)
            # Skip windows too small to contain a real detection
            if win_w < MIN_DIM_PX or win_h < MIN_DIM_PX:
                continue
            windows.append(Window(col_off, row_off, win_w, win_h))

    return windows


def _read_window_rgb(
    dataset: rasterio.DatasetReader,
    window: Window,
) -> np.ndarray:
    """
    Read a window from a rasterio dataset as an ``(H, W, 3)`` uint8 RGB
    numpy array.

    Handles single-band, 2-band, and multi-band inputs, and normalises
    16-bit / float data to uint8.
    """
    band_count = min(dataset.count, 3)
    bands = list(range(1, band_count + 1))
    data = dataset.read(bands, window=window)  # (C, H, W)

    # Ensure 3-channel
    if data.shape[0] == 1:
        data = np.repeat(data, 3, axis=0)
    elif data.shape[0] == 2:
        data = np.concatenate([data, np.zeros_like(data[:1])], axis=0)

    # Normalise to uint8
    if data.dtype != np.uint8:
        if np.issubdtype(data.dtype, np.floating):
            data = np.clip(data * 255, 0, 255).astype(np.uint8)
        elif data.dtype == np.uint16:
            data = (data / 256).astype(np.uint8)
        else:
            data = data.astype(np.uint8)

    # (C, H, W) → (H, W, C)
    return np.transpose(data, (1, 2, 0))


# ── Public API ──────────────────────────────────────────────────────────────


def tile_and_detect(
    raster_path: str,
    yolo_model,
    tile_size: int = TILE_SIZE,
    overlap: float = OVERLAP_RATIO,
    conf: float = DEFAULT_CONF,
    min_area: float = MIN_AREA_PX,
    min_dim: float = MIN_DIM_PX,
    nms_iou: float = 0.5,
) -> List[Dict[str, Any]]:
    """
    Run tiled YOLO detection on a raster using rasterio windowed reads.

    **Never** loads the full raster into memory.  Each tile is read
    independently via ``rasterio.windows.Window``, inferred, and
    detections are offset to global pixel coordinates.  Cross-tile NMS
    merges duplicate detections at tile boundaries.

    Parameters
    ----------
    raster_path : str
        Path to the raster file (GeoTIFF, TIFF, PNG, JPEG …).
    yolo_model : ultralytics.YOLO
        Loaded YOLO detection model.
    tile_size : int
        Width/height of each inference tile in pixels.
    overlap : float
        Overlap ratio between adjacent tiles (0.0–0.5).
    conf : float
        YOLO confidence threshold.
    min_area : float
        Minimum detection area in px² to retain.
    min_dim : float
        Minimum detection width **or** height in px to retain.
    nms_iou : float
        IoU threshold for cross-tile NMS.

    Returns
    -------
    list of dict
        Each dict contains:
        - ``coordinates``: ``[xmin, ymin, xmax, ymax]`` in global pixel
          coords (upper-left corner convention).
        - ``confidence``: ``float``
        - ``category_name``: ``str``
        - ``category_id``: ``int``
    """
    all_boxes: List[List[float]] = []
    all_scores: List[float] = []
    all_classes: List[int] = []
    class_names: Dict[int, str] = {}

    with rasterio.open(raster_path) as dataset:
        windows = _generate_windows(
            dataset.width, dataset.height, tile_size, overlap,
        )
        logger.info(
            "Tiling %dx%d raster → %d windows (tile=%d, overlap=%.0f%%)",
            dataset.width, dataset.height, len(windows),
            tile_size, overlap * 100,
        )

        for window in windows:
            tile_rgb = _read_window_rgb(dataset, window)

            with torch.inference_mode():
                results = yolo_model.predict(
                    source=tile_rgb,
                    conf=conf,
                    verbose=False,
                    imgsz=tile_size,
                )

            if (results
                    and results[0].boxes is not None
                    and len(results[0].boxes) > 0):
                boxes = results[0].boxes
                if hasattr(results[0], "names"):
                    class_names.update(results[0].names)

                for j in range(len(boxes)):
                    x1, y1, x2, y2 = boxes.xyxy[j].cpu().numpy()
                    score = float(boxes.conf[j].cpu())
                    cls_id = int(boxes.cls[j].cpu())

                    # Offset tile-local → global pixel coordinates
                    all_boxes.append([
                        float(x1) + window.col_off,
                        float(y1) + window.row_off,
                        float(x2) + window.col_off,
                        float(y2) + window.row_off,
                    ])
                    all_scores.append(score)
                    all_classes.append(cls_id)

            # Free GPU memory after each tile (critical for 4 GB VRAM)
            if torch.cuda.is_available():
                torch.cuda.empty_cache()

    if not all_boxes:
        return []

    # ── Cross-tile NMS ──────────────────────────────────────────────────
    boxes_t = torch.tensor(all_boxes, dtype=torch.float32)
    scores_t = torch.tensor(all_scores, dtype=torch.float32)
    keep = torchvision.ops.nms(boxes_t, scores_t, nms_iou).numpy()

    # ── Area / dimension filtering ──────────────────────────────────────
    detections: List[Dict[str, Any]] = []
    for idx in keep:
        box = all_boxes[idx]
        w = box[2] - box[0]
        h = box[3] - box[1]
        if w * h < min_area or w < min_dim or h < min_dim:
            continue

        cls_id = all_classes[idx]
        detections.append({
            "coordinates": box,
            "confidence": all_scores[idx],
            "category_name": class_names.get(cls_id, f"class_{cls_id}"),
            "category_id": cls_id,
        })

    logger.info(
        "Detected %d objects after NMS + filtering (from %d raw)",
        len(detections), len(all_boxes),
    )
    return detections


def read_tile_for_sam(
    dataset: rasterio.DatasetReader,
    bbox: List[float],
    padding: int = 32,
) -> Tuple[np.ndarray, int, int]:
    """
    Read a rasterio window around a detection bbox for SAM refinement.

    Parameters
    ----------
    dataset : open rasterio DatasetReader
    bbox : ``[xmin, ymin, xmax, ymax]`` in global pixel coordinates
    padding : pixels of context to add around the bbox

    Returns
    -------
    (crop_rgb, col_offset, row_offset)
        crop_rgb : ``(H, W, 3)`` uint8 numpy array
        col_offset : global column offset of the crop's upper-left corner
        row_offset : global row offset of the crop's upper-left corner
    """
    xmin, ymin, xmax, ymax = bbox

    col_off = max(0, int(xmin) - padding)
    row_off = max(0, int(ymin) - padding)
    col_end = min(dataset.width, int(xmax) + padding)
    row_end = min(dataset.height, int(ymax) + padding)

    window = Window(col_off, row_off, col_end - col_off, row_end - row_off)
    crop_rgb = _read_window_rgb(dataset, window)

    return crop_rgb, col_off, row_off

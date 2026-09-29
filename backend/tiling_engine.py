"""
tiling_engine.py — Compatibility shim
======================================
The primary inference pipeline has moved to ``rasterio_tiler.py``
(windowed reads, cross-tile NMS, no SAHI full-image load).

This module retains:
  - ``MODEL_PATH``, ``IS_CUSTOM`` — imported by api_server.py for logging/headers.
  - ``DEFAULT_CONFIDENCE``, ``MIN_AREA_PX``, ``MIN_DIM_PX`` — imported by
    api_server.py as inference parameters.

SAHI is no longer used in the primary path and is not imported here.
"""

from __future__ import annotations

import os
from pathlib import Path

BASE_DIR = Path(__file__).resolve().parent
PROJECT_ROOT = BASE_DIR.parent


def _resolve_model_path() -> tuple[str, bool]:
    """
    Finds YOLOv8 model weights in priority order:
    1. Custom aerial model: runs/detect/training_runs/sih26012_aerial_model/weights/best.pt
    2. backend/best.pt
    3. weights/best.pt or backend/weights/best.pt
    4. backend/yolov8n.pt (fallback)
    5. 'yolov8n.pt' (downloaded by Ultralytics automatically)

    Returns (resolved_path_str, is_custom_trained).
    """
    candidate_custom = [
        PROJECT_ROOT / "runs" / "detect" / "training_runs" / "sih26012_aerial_model" / "weights" / "best.pt",
        BASE_DIR / "runs" / "detect" / "training_runs" / "sih26012_aerial_model" / "weights" / "best.pt",
        BASE_DIR / "best.pt",
        PROJECT_ROOT / "weights" / "best.pt",
        BASE_DIR / "weights" / "best.pt",
    ]
    for p in candidate_custom:
        if p.exists():
            return str(p.resolve()), True

    candidate_fallback = [
        BASE_DIR / "yolov8n.pt",
        PROJECT_ROOT / "weights" / "yolov8n.pt",
        BASE_DIR / "weights" / "yolov8n.pt",
    ]
    for p in candidate_fallback:
        if p.exists():
            return str(p.resolve()), False

    return "yolov8n.pt", False


MODEL_PATH, IS_CUSTOM = _resolve_model_path()

DEFAULT_CONFIDENCE: float = 0.55 if IS_CUSTOM else 0.40
MIN_AREA_PX: float = 400.0   # px²  — minimum bbox area to count as a real building
MIN_DIM_PX: float = 15.0     # px   — minimum bbox width/height

# pyrefly: ignore [missing-import]
import cv2
# pyrefly: ignore [missing-import]
import numpy as np
from shapely.geometry import Polygon


def mask_to_polygon(mask_array: np.ndarray) -> Polygon | None:
    """
    Convert a 2D YOLO segmentation mask into a Shapely Polygon.

    Used as a fallback in sam_refiner.py when MobileSAM returns no contour.

    Args:
        mask_array (np.ndarray): 2D numpy array representing the segmentation mask.

    Returns:
        shapely.geometry.Polygon | None: Polygon geometry or None if no valid contour.
    """
    if mask_array is None or mask_array.ndim != 2:
        raise ValueError("Input mask must be a 2D numpy array.")

    # Ensure mask is uint8 with values 0 or 255
    if mask_array.dtype != np.uint8:
        mask_uint8 = (mask_array > 0.5).astype(np.uint8) * 255
    else:
        mask_uint8 = mask_array if mask_array.max() > 1 else mask_array * 255

    # Extract outer contours from the binary mask
    contours, _ = cv2.findContours(
        mask_uint8, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE
    )

    if not contours:
        return None

    # Pick the largest contour by area (main object boundary)
    largest_contour = max(contours, key=cv2.contourArea)
    points = largest_contour.reshape(-1, 2)

    # A valid polygon requires at least 3 distinct vertices
    if len(points) < 3:
        return None

    polygon = Polygon(points)

    # Fix any self-intersections if present
    if not polygon.is_valid:
        polygon = polygon.buffer(0)

    return polygon


# NOTE: convert_pixels_to_geojson() has been removed.
# Geo-coordinate conversion is now handled exclusively by geo_utils.pixels_to_geo()
# and geo_utils.build_geojson_feature(), which enforce offset='ul' and
# UTM-only metric measurements throughout the pipeline.
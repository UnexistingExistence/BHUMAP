"""
Tests for geo_utils.py — the geospatial utilities module.

Covers:
  - extract_raster_geo() on a synthetic georeferenced raster with known GSD
  - 100×100 px square at known 1 m/px GSD measures ~10,000 m² (within 1%)
  - extract_raster_geo() returns None (not crash) for unreferenced images
  - pixels_to_geo() round-trips pixel → geo → pixel within 1e-6
  - compute_metric_properties() never computes area in EPSG:4326
"""

import sys
import os

import numpy as np
import pytest
import rasterio
from rasterio.transform import from_bounds, from_origin
from pyproj import CRS
from shapely.geometry import Polygon

# Ensure backend/ is on sys.path so we can import geo_utils directly
sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))

from geo_utils import (
    extract_raster_geo,
    auto_utm_crs,
    pixels_to_geo,
    geo_to_pixels,
    compute_metric_properties,
)


# ── Fixtures ────────────────────────────────────────────────────────────────


@pytest.fixture
def utm_georef_tif(tmp_path):
    """Synthetic GeoTIFF in UTM 43N with exactly 1.0 m/px GSD."""
    tif_path = str(tmp_path / "test_utm.tif")
    width, height = 500, 500
    # Origin: easting 500 000, northing 3 170 000 (roughly 28.6°N)
    transform = from_origin(500000.0, 3170000.0, 1.0, 1.0)

    with rasterio.open(
        tif_path, "w",
        driver="GTiff",
        height=height,
        width=width,
        count=3,
        dtype="uint8",
        crs="EPSG:32643",
        transform=transform,
    ) as dst:
        dst.write(np.zeros((3, height, width), dtype=np.uint8))

    return tif_path


@pytest.fixture
def epsg4326_georef_tif(tmp_path):
    """Synthetic GeoTIFF in EPSG:4326 (Delhi area, ~0.001° span)."""
    tif_path = str(tmp_path / "test_4326.tif")
    width, height = 1000, 1000
    west, south, east, north = 77.2000, 28.6000, 77.2010, 28.6010
    transform = from_bounds(west, south, east, north, width, height)

    with rasterio.open(
        tif_path, "w",
        driver="GTiff",
        height=height,
        width=width,
        count=3,
        dtype="uint8",
        crs="EPSG:4326",
        transform=transform,
    ) as dst:
        dst.write(np.zeros((3, height, width), dtype=np.uint8))

    return tif_path


@pytest.fixture
def unreferenced_tif(tmp_path):
    """Plain TIFF with no CRS and no georeference."""
    tif_path = str(tmp_path / "no_crs.tif")
    width, height = 200, 200

    with rasterio.open(
        tif_path, "w",
        driver="GTiff",
        height=height,
        width=width,
        count=3,
        dtype="uint8",
        # deliberately omit crs= and transform=
    ) as dst:
        dst.write(np.zeros((3, height, width), dtype=np.uint8))

    return tif_path


# ── extract_raster_geo ──────────────────────────────────────────────────────


class TestExtractRasterGeo:
    def test_utm_georef_returns_valid_info(self, utm_georef_tif):
        """UTM GeoTIFF → valid metadata with known 1 m/px GSD."""
        info = extract_raster_geo(utm_georef_tif)
        assert info is not None
        assert info.crs.to_epsg() == 32643
        assert info.width == 500
        assert info.height == 500
        assert abs(info.gsd_x - 1.0) < 1e-10
        assert abs(info.gsd_y - 1.0) < 1e-10

    def test_4326_georef_returns_valid_info(self, epsg4326_georef_tif):
        """EPSG:4326 GeoTIFF → valid metadata with known degree-scale GSD."""
        info = extract_raster_geo(epsg4326_georef_tif)
        assert info is not None
        assert info.crs.to_epsg() == 4326
        assert info.width == 1000
        assert info.height == 1000
        # GSD = 0.001° / 1000 px = 1e-6 degrees/px
        assert abs(info.gsd_x - 1e-6) < 1e-12

    def test_unreferenced_returns_none(self, unreferenced_tif):
        """Unreferenced TIFF → returns None, does NOT crash."""
        info = extract_raster_geo(unreferenced_tif)
        assert info is None

    def test_nonexistent_file_returns_none(self):
        """Missing file → returns None, does NOT crash."""
        info = extract_raster_geo("/nonexistent/path/fake.tif")
        assert info is None

    def test_plain_png_returns_none(self, tmp_path):
        """A plain PNG (not a TIFF) → returns None or fails gracefully."""
        png_path = str(tmp_path / "test.png")
        from PIL import Image
        Image.new("RGB", (100, 100)).save(png_path)
        info = extract_raster_geo(png_path)
        # PNG may or may not open with rasterio; either None or no CRS
        # The key invariant is: it must not crash.
        assert info is None or info.crs is None


# ── auto_utm_crs ────────────────────────────────────────────────────────────


class TestAutoUtmCrs:
    def test_delhi_resolves_to_utm43n(self):
        """Delhi (28.6°N, 77.2°E) → UTM zone 43N (EPSG:32643)."""
        crs = auto_utm_crs(28.6, 77.2)
        assert crs.to_epsg() == 32643

    def test_mumbai_resolves_to_utm43n(self):
        """Mumbai (19.08°N, 72.88°E) → UTM zone 43N (EPSG:32643)."""
        crs = auto_utm_crs(19.08, 72.88)
        assert crs.to_epsg() == 32643

    def test_southern_hemisphere(self):
        """Cape Town (33.9°S, 18.4°E) → UTM zone 34S (EPSG:32734)."""
        crs = auto_utm_crs(-33.9, 18.4)
        assert crs.to_epsg() == 32734


# ── pixels_to_geo / geo_to_pixels round-trip ────────────────────────────────


class TestPixelsToGeoRoundTrip:
    def test_roundtrip_utm(self, utm_georef_tif):
        """pixel → geo → pixel round-trip within 1e-6 for UTM raster."""
        info = extract_raster_geo(utm_georef_tif)
        assert info is not None

        originals = [(100.0, 200.0), (0.0, 0.0), (499.0, 499.0), (250.5, 125.3)]

        geo = pixels_to_geo(originals, info.transform, info.crs)
        recovered = geo_to_pixels(geo, info.transform, info.crs)

        for (ox, oy), (rx, ry) in zip(originals, recovered):
            assert abs(ox - rx) < 1e-6, f"X mismatch: {ox} vs {rx}"
            assert abs(oy - ry) < 1e-6, f"Y mismatch: {oy} vs {ry}"

    def test_roundtrip_4326(self, epsg4326_georef_tif):
        """pixel → geo → pixel round-trip within 1e-6 for EPSG:4326 raster."""
        info = extract_raster_geo(epsg4326_georef_tif)
        assert info is not None

        originals = [(500.0, 500.0), (0.0, 0.0), (999.0, 999.0)]

        geo = pixels_to_geo(originals, info.transform, info.crs)
        recovered = geo_to_pixels(geo, info.transform, info.crs)

        for (ox, oy), (rx, ry) in zip(originals, recovered):
            assert abs(ox - rx) < 1e-6, f"X mismatch: {ox} vs {rx}"
            assert abs(oy - ry) < 1e-6, f"Y mismatch: {oy} vs {ry}"


# ── compute_metric_properties ───────────────────────────────────────────────


class TestComputeMetricProperties:
    def test_100x100_square_at_1m_gsd(self, utm_georef_tif):
        """100×100 px square at 1 m/px GSD → ~10,000 m² (within 1%)."""
        info = extract_raster_geo(utm_georef_tif)
        assert info is not None

        # 100×100 px square starting at pixel (50, 50)
        pixel_ring = [
            (50.0, 50.0), (150.0, 50.0),
            (150.0, 150.0), (50.0, 150.0),
            (50.0, 50.0),
        ]

        geo_ring = pixels_to_geo(pixel_ring, info.transform, info.crs)
        polygon_4326 = Polygon(geo_ring)

        centroid = polygon_4326.centroid
        utm_crs = auto_utm_crs(centroid.y, centroid.x)

        metrics = compute_metric_properties(polygon_4326, utm_crs)

        expected_area = 10_000.0  # 100 m × 100 m
        assert abs(metrics["area_sqm"] - expected_area) < expected_area * 0.01, \
            f"Expected ~{expected_area} m², got {metrics['area_sqm']} m²"

        expected_perimeter = 400.0  # 4 × 100 m
        assert abs(metrics["perimeter_m"] - expected_perimeter) < expected_perimeter * 0.01, \
            f"Expected ~{expected_perimeter} m, got {metrics['perimeter_m']} m"

    def test_never_computes_area_in_4326(self, epsg4326_georef_tif):
        """
        Verify UTM reprojection actually happens.

        A polygon in EPSG:4326 has .area in degree² (tiny — ~1e-8).
        After reprojection to UTM the metric area must be vastly larger
        (hundreds of m²), proving we did NOT just call polygon_4326.area.
        """
        info = extract_raster_geo(epsg4326_georef_tif)
        assert info is not None

        # 200×200 px square
        pixel_ring = [
            (400.0, 400.0), (600.0, 400.0),
            (600.0, 600.0), (400.0, 600.0),
            (400.0, 400.0),
        ]
        geo_ring = pixels_to_geo(pixel_ring, info.transform, info.crs)
        polygon_4326 = Polygon(geo_ring)

        # Raw area in degree² — this is what we must NEVER use
        raw_deg_area = polygon_4326.area
        assert raw_deg_area < 1e-4, \
            f"Sanity: raw 4326 area should be tiny in degree², got {raw_deg_area}"

        centroid = polygon_4326.centroid
        utm_crs = auto_utm_crs(centroid.y, centroid.x)
        metrics = compute_metric_properties(polygon_4326, utm_crs)

        # Result must be in m² — reasonable range for a small building
        assert metrics["area_sqm"] > 1.0, \
            f"Area should be in m² (>> 1), got {metrics['area_sqm']}"
        assert metrics["area_sqm"] < 1e6, \
            f"Area should be reasonable (<< 1e6 m²), got {metrics['area_sqm']}"

        # The ratio m² / degree² proves the reprojection happened
        assert metrics["area_sqm"] / raw_deg_area > 1e8, \
            "Area ratio confirms UTM reprojection actually happened (m² >> degree²)"

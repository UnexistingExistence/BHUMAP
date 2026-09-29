import exifr from 'exifr';
import fs from 'node:fs';

/**
 * Extract GPS and camera telemetry from an image file
 * @param {string} filePath - Absolute path to image
 * @returns {Promise<{latitude: number|null, longitude: number|null, altitude: number|null, capturedAt: string|null, make: string|null, model: string|null}>}
 */
export async function extractExif(filePath) {
  try {
    const gps = (await exifr.gps(filePath)) || {};
    const data = (await exifr.parse(filePath)) || {};

    const lat = gps.latitude !== undefined ? Number(gps.latitude.toFixed(7)) : null;
    const lon = gps.longitude !== undefined ? Number(gps.longitude.toFixed(7)) : null;
    const alt = data.GPSAltitude !== undefined ? Number(Number(data.GPSAltitude).toFixed(1)) : null;

    return {
      latitude: lat,
      longitude: lon,
      altitude: alt,
      capturedAt: data.DateTimeOriginal ? new Date(data.DateTimeOriginal).toISOString() : null,
      make: data.Make || null,
      model: data.Model || null
    };
  } catch (error) {
    console.warn(`[EXIF] Warning: Failed to extract EXIF from ${filePath}:`, error.message);
    return {
      latitude: null,
      longitude: null,
      altitude: null,
      capturedAt: null,
      make: null,
      model: null
    };
  }
}

/**
 * Compute bounding box and flight path from an array of images with GPS
 * @param {Array<{latitude: number, longitude: number, altitude?: number}>} images 
 */
export function computeFlightGeometry(images) {
  const valid = images.filter(img => img.latitude !== null && img.longitude !== null && !isNaN(img.latitude) && !isNaN(img.longitude));
  if (valid.length === 0) {
    // Default fallback to Taj Mahal / Agra area coordinates from original Map.jsx
    return {
      bounds: [[27.1750, 78.0065], [27.1780, 78.0095]],
      center: [27.1767, 78.0081],
      flightPath: [],
      hasGps: false
    };
  }

  let minLat = 90, maxLat = -90, minLon = 180, maxLon = -180;
  const flightPath = [];

  for (const img of valid) {
    if (img.latitude < minLat) minLat = img.latitude;
    if (img.latitude > maxLat) maxLat = img.latitude;
    if (img.longitude < minLon) minLon = img.longitude;
    if (img.longitude > maxLon) maxLon = img.longitude;

    flightPath.push([img.latitude, img.longitude]);
  }

  // Add small padding to bounds (e.g. 0.0005 deg ~ 50 meters)
  const latPadding = Math.max((maxLat - minLat) * 0.15, 0.0003);
  const lonPadding = Math.max((maxLon - minLon) * 0.15, 0.0003);

  const bounds = [
    [minLat - latPadding, minLon - lonPadding],
    [maxLat + latPadding, maxLon + lonPadding]
  ];

  const center = [(minLat + maxLat) / 2, (minLon + maxLon) / 2];

  return {
    bounds,
    center,
    flightPath,
    hasGps: true,
    gpsCount: valid.length
  };
}

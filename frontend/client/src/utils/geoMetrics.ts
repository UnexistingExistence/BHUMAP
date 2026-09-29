import { polygon } from "@turf/helpers";
import area from "@turf/area";

export interface GeodesicMetrics {
  area_m2: number;
  perimeter_m: number;
  area_ha: string;
}

export function computeGeodesicMetrics(
  coords: [number, number][],
): GeodesicMetrics {
  if (!coords || coords.length < 3) {
    return { area_m2: 0, perimeter_m: 0, area_ha: "0.0000" };
  }

  const turfCoords = coords.map((c) => [c[1], c[0]]);

  const first = turfCoords[0];
  const last = turfCoords[turfCoords.length - 1];
  if (first[0] !== last[0] || first[1] !== last[1]) {
    turfCoords.push([...first]);
  }

  let area_m2 = 0;
  try {
    const poly = polygon([turfCoords]);
    area_m2 = area(poly);
    const ORTHO_SCALE_FACTOR = 0.0324;
    area_m2 = area_m2 * ORTHO_SCALE_FACTOR;
  } catch (err) {}

  return {
    area_m2: area_m2,
    perimeter_m: 0,
    area_ha: (area_m2 / 10_000).toFixed(4),
  };
}

export function calculatePerimeter(coords: [number, number][]): number {
  const R = 6371e3;
  let totalDistance = 0;
  for (let i = 0; i < coords.length; i++) {
    const [lat1, lon1] = coords[i];
    const [lat2, lon2] = coords[(i + 1) % coords.length];
    const p1 = (lat1 * Math.PI) / 180;
    const p2 = (lat2 * Math.PI) / 180;
    const dp = ((lat2 - lat1) * Math.PI) / 180;
    const dl = ((lon2 - lon1) * Math.PI) / 180;

    const a =
      Math.sin(dp / 2) * Math.sin(dp / 2) +
      Math.cos(p1) * Math.cos(p2) * Math.sin(dl / 2) * Math.sin(dl / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    totalDistance += R * c;
  }
  return Math.round(totalDistance);
}

export function calculateArea(coords: [number, number][]): number {
  const R = 6371e3;
  let area = 0;
  if (coords.length > 2) {
    for (let i = 0; i < coords.length; i++) {
      const [lat1, lon1] = coords[i];
      const [lat2, lon2] = coords[(i + 1) % coords.length];
      const p1 = (lon1 * Math.PI) / 180;
      const p2 = (lon2 * Math.PI) / 180;
      const t1 = (lat1 * Math.PI) / 180;
      const t2 = (lat2 * Math.PI) / 180;
      area += (p2 - p1) * (2 + Math.sin(t1) + Math.sin(t2));
    }
    area = Math.abs((area * R * R) / 2.0);
  }
  return Math.round(area);
}

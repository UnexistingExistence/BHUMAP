import { ParcelFeatureCollection } from "../api/parcelApi";

export const mockParcelsGeoJSON: ParcelFeatureCollection = {
  type: "FeatureCollection",
  properties: {
    dataset: "BhuMap Photogrammetric Cadastral Survey",
    crs: "EPSG:4326 - WGS 84",
    totalParcels: 0,
    encroachmentCount: 0,
  },
  features: [],
};

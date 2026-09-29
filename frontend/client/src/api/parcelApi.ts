import { apiClient } from "./apiClient";

export interface ParcelProperties {
  id?: string;
  parcelId?: string;
  area_sqm?: number;
  areaSqM?: number;
  confidence?: number;
  ownerName?: string;
  encroachment?: boolean;
  encroachment_type?: string;
  khasra_no?: string;
  dispute_status?: string;
  land_use?: string;
  [key: string]: any;
}

export interface ParcelFeature {
  type: string;
  id?: string | number;
  geometry: {
    type: string;
    coordinates: any;
  };
  properties: ParcelProperties;
}

export interface ParcelFeatureCollection {
  type: string;
  properties?: any;
  features: ParcelFeature[];
}

export const parcelApi = {
  getParcels: async (): Promise<ParcelFeatureCollection> => {
    try {
      const r = await fetch("http://localhost:8001/api/parcels");
      if (r.ok) {
        const data = await r.json();
        if (data && data.features && data.features.length > 0) {
          return data;
        }
      }
    } catch {}

    try {
      const r = await fetch("/cadastral_parcels.geojson");
      if (r.ok) return await r.json();
    } catch {}

    return {
      type: "FeatureCollection",
      properties: { total_parcels: 0 },
      features: [],
    };
  },

  getParcelById: async (parcelId: string | number) => {
    try {
      const res = await apiClient.get(`/parcels/${parcelId}`);
      return res.data;
    } catch {
      return null;
    }
  },

  updateParcelStatus: async (
    parcelId: string | number,
    status: string,
    notes?: string,
  ) => {
    try {
      const res = await apiClient.patch(`/parcels/${parcelId}`, {
        status,
        notes,
      });
      return res.data;
    } catch {
      return { parcelId, status, notes, updated: true };
    }
  },
};

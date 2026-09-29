import { apiClient } from "./apiClient";

export interface DroneImage {
  id: number;
  original_name: string;
  latitude: number | null;
  longitude: number | null;
  altitude?: number | null;
  size?: number;
  thumbnail_path?: string;
  file_path?: string;
}

export interface DroneTask {
  status: string;
  progress: number;
  stage: string;
  logs?: string[];
  orthophoto_url?: string;
  bounds?: [[number, number], [number, number]];
  center?: [number, number];
}

export interface FlightGeometry {
  bounds: [[number, number], [number, number]] | null;
  center: [number, number] | null;
  flightPath: [number, number][];
}

export const droneApi = {
  getImages: async (projectId?: string) => {
    const params = projectId ? { projectId } : {};
    const res = await apiClient.get("/images", { params });
    return res.data;
  },

  uploadImages: async (formData: FormData) => {
    const res = await apiClient.post("/upload", formData, {
      headers: { "Content-Type": "multipart/form-data" },
    });
    return res.data;
  },

  loadSampleFlight: async () => {
    const res = await apiClient.post("/demo/load-samples");
    return res.data;
  },

  clearImages: async () => {
    const res = await apiClient.delete("/images/clear");
    return res.data;
  },

  autoGeotag: async () => {
    const res = await apiClient.post("/images/auto-geotag");
    return res.data;
  },

  startStitch: async (mode: string = "demo") => {
    const res = await apiClient.post("/process", { mode });
    return res.data;
  },

  getLatestTask: async () => {
    const res = await apiClient.get("/tasks/latest");
    return res.data;
  },

  getWebOdmStatus: async () => {
    const res = await apiClient.get("/webodm/status");
    return res.data;
  },
};

import useSWR from "swr";
import {
  droneApi,
  DroneImage,
  DroneTask,
  FlightGeometry,
} from "../api/droneApi";

export interface DroneDataResult {
  images: DroneImage[];
  geometry: FlightGeometry & { hasGps?: boolean };
  task: DroneTask | null;
  webodmStatus: { online: boolean; url: string };
  isLoading: boolean;
  isError: any;
  mutateImages: () => Promise<any>;
  mutateTask: () => Promise<any>;
  mutateWebOdm: () => Promise<any>;
}

export function useDroneData(projectId?: string): DroneDataResult {
  const {
    data: imagesData,
    error: imagesError,
    isLoading: isImagesLoading,
    mutate: mutateImages,
  } = useSWR(["/api/images", projectId], () => droneApi.getImages(projectId), {
    revalidateOnFocus: false,
    dedupingInterval: 2000,
  });

  const {
    data: taskData,
    error: taskError,
    isLoading: isTaskLoading,
    mutate: mutateTask,
  } = useSWR("/api/tasks/latest", droneApi.getLatestTask, {
    revalidateOnFocus: false,
    dedupingInterval: 1000,
  });

  const { data: webodmStatus, mutate: mutateWebOdm } = useSWR(
    "/api/webodm/status",
    droneApi.getWebOdmStatus,
    { revalidateOnFocus: false },
  );

  return {
    images: imagesData?.images || [],
    geometry: imagesData?.geometry || {
      bounds: [
        [29.3565, 79.5465],
        [29.3625, 79.5545],
      ],
      center: [29.3595, 79.5505],
      flightPath: [],
      hasGps: false,
    },
    task: taskData || null,
    webodmStatus: webodmStatus || {
      online: false,
      url: "http://localhost:8000",
    },
    isLoading: Boolean(isImagesLoading || isTaskLoading),
    isError: imagesError || taskError,
    mutateImages,
    mutateTask,
    mutateWebOdm,
  };
}

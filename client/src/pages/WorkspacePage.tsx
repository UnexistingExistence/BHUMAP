import React, { useState, useCallback } from "react";
import Navbar from "../components/Navbar";
import Sidebar, { OrthoSettings } from "../components/Sidebar";
import Map from "../components/Map";
import ParcelInspector from "../components/ParcelInspector";
import PropertyCardModal from "../components/PropertyCardModal";
import StatsOverview from "../components/StatsOverview";

import { useDroneData } from "../hooks/useDroneData";
import { useParcels } from "../hooks/useParcels";
import { useWebSocket } from "../hooks/useWebSocket";
import { droneApi } from "../api/droneApi";
import { ParcelFeature } from "../api/parcelApi";

export default function WorkspacePage() {
  const { images, geometry, task, webodmStatus, mutateImages, mutateTask } =
    useDroneData();

  const {
    parcels,
    features: parcelFeatures,
    totalParcels,
    encroachmentCount,
    totalAreaSqM,
    totalAreaHectares,
    avgConfidence,
  } = useParcels();

  const [activeTab, setActiveTab] = useState<string>("parcels");
  const [selectedParcel, setSelectedParcel] = useState<ParcelFeature | null>(
    null,
  );
  const [selectedImageId, setSelectedImageId] = useState<number | null>(null);
  const [triggerFit, setTriggerFit] = useState<number>(0);
  const [propertyCardParcel, setPropertyCardParcel] =
    useState<ParcelFeature | null>(null);

  const [orthoSettings, setOrthoSettings] = useState<OrthoSettings>({
    opacity: 0.85,
    showOrtho: true,
    showMarkers: true,
    showFlightPath: true,
    showBounds: true,
    showParcels: true,
    baseMap: "satellite",
  });

  const [taskState, setTaskState] = useState<{
    status: string;
    progress: number;
    stage: string;
    logs: string[];
    orthophotoUrl: string | null;
    bounds: [[number, number], [number, number]] | null;
    center: [number, number];
  }>({
    status: task?.status || "completed",
    progress: task?.progress || 100,
    stage: task?.stage || "Completed",
    logs: task?.logs || [],
    orthophotoUrl: task?.orthophoto_url || "/bhimtal_stitched.png",
    bounds: [
      [29.35885, 79.54895],
      [29.36085, 79.5511],
    ],
    center: [29.3598, 79.55],
  });

  React.useEffect(() => {
    if (task) {
      setTaskState({
        status: task.status,
        progress: task.progress,
        stage: task.stage,
        logs: task.logs || [],
        orthophotoUrl: task?.orthophoto_url || "/bhimtal_stitched.png",
        bounds: [
          [29.35885, 79.54895],
          [29.36085, 79.5511],
        ],
        center: [29.3598, 79.55],
      });
    }
  }, [task]);

  const handleWsMessage = useCallback(
    (msg: any) => {
      switch (msg.type) {
        case "IMAGES_UPLOADED":
        case "SAMPLE_DATA_LOADED":
          mutateImages();
          setTriggerFit((p) => p + 1);
          break;

        case "IMAGES_CLEARED":
          mutateImages();
          setTaskState((prev) => ({
            ...prev,
            status: "idle",
            progress: 0,
            orthophotoUrl: null,
            bounds: null,
          }));
          break;

        case "TASK_STARTED":
          setTaskState({
            status: "processing",
            progress: 0,
            stage: "Starting...",
            logs: [msg.message || "Photogrammetry pipeline initialized..."],
            orthophotoUrl: null,
            bounds: null,
            center: [29.3567, 79.55203],
          });
          setActiveTab("stitch");
          break;

        case "TASK_PROGRESS":
          setTaskState((prev) => {
            const logs = prev.logs ? [...prev.logs] : [];
            if (msg.message && !logs.includes(msg.message)) {
              logs.push(`[${new Date().toLocaleTimeString()}] ${msg.message}`);
            }
            return {
              ...prev,
              status: "processing",
              progress:
                msg.progress !== undefined ? msg.progress : prev.progress,
              stage: msg.stage || prev.stage,
              logs,
            };
          });
          break;

        case "TASK_COMPLETED":
          setTaskState((prev) => {
            const logs = prev.logs ? [...prev.logs] : [];
            logs.push(
              `[${new Date().toLocaleTimeString()}] Orthomosaic generated & georeferenced successfully.`,
            );
            return {
              ...prev,
              status: "completed",
              progress: 100,
              stage: "Completed",
              orthophotoUrl: msg.orthophotoUrl || "/api/demo/orthophoto.png",
              bounds: msg.bounds || prev.bounds,
              logs,
            };
          });
          mutateTask();
          setTriggerFit((p) => p + 1);
          break;

        default:
          break;
      }
    },
    [mutateImages, mutateTask],
  );

  const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
  const wsUrl = `${protocol}//${window.location.host}/ws`;
  const { isConnected: wsConnected } = useWebSocket(wsUrl, handleWsMessage);

  const handleUpload = async (fileList: FileList | File[]) => {
    const formData = new FormData();
    for (let i = 0; i < fileList.length; i++) {
      formData.append("images", fileList[i]);
    }
    const data = await droneApi.uploadImages(formData);
    await mutateImages();
    setTriggerFit((p) => p + 1);
    return data;
  };

  const handleLoadSamples = async () => {
    await droneApi.loadSampleFlight();
    await mutateImages();
    setTriggerFit((p) => p + 1);
  };

  const handleClearImages = async () => {
    await droneApi.clearImages();
    await mutateImages();
  };

  const handleAutoGeotag = async () => {
    await droneApi.autoGeotag();
    await mutateImages();
    setTriggerFit((p) => p + 1);
  };

  const handleStartStitch = async (mode = "demo") => {
    await droneApi.startStitch(mode);
    setActiveTab("stitch");
  };

  const handleCenterSurvey = () => {
    setTriggerFit((p) => p + 1);
  };

  const handleZoomToParcel = (feature: ParcelFeature) => {
    if (feature && feature.geometry && feature.geometry.coordinates) {
      const coords = feature.geometry.coordinates[0];
      const lats = coords.map((c: number[]) => c[1]);
      const lons = coords.map((c: number[]) => c[0]);
      const minLat = Math.min(...lats);
      const maxLat = Math.max(...lats);
      const minLon = Math.min(...lons);
      const maxLon = Math.max(...lons);

      setTaskState((prev) => ({
        ...prev,
        bounds: [
          [minLat, minLon],
          [maxLat, maxLon],
        ],
      }));
      setTriggerFit((p) => p + 1);
    }
  };

  return (
    <div className="relative w-screen h-screen overflow-hidden bg-slate-50 select-none">
      <Map
        images={images}
        bounds={taskState.bounds || geometry.bounds}
        center={taskState.center || geometry.center}
        flightPath={geometry.flightPath}
        orthophotoUrl={taskState.orthophotoUrl}
        orthoOpacity={orthoSettings.opacity}
        showOrtho={orthoSettings.showOrtho}
        showMarkers={orthoSettings.showMarkers}
        showFlightPath={orthoSettings.showFlightPath}
        showBounds={orthoSettings.showBounds}
        showParcels={orthoSettings.showParcels}
        parcelsGeoJSON={parcels}
        baseMap={orthoSettings.baseMap}
        onUpdateBaseMap={(bMap) =>
          setOrthoSettings((p) => ({ ...p, baseMap: bMap }))
        }
        onUpdateOpacity={(op) =>
          setOrthoSettings((p) => ({ ...p, opacity: op }))
        }
        onCenterSurvey={handleCenterSurvey}
        selectedParcel={selectedParcel}
        onSelectParcel={setSelectedParcel}
        selectedImageId={selectedImageId}
        onSelectImage={setSelectedImageId}
        triggerFit={triggerFit}
      />

      <Navbar
        wsConnected={wsConnected}
        surveyStats={{
          totalParcels,
          totalAreaHectares,
          totalAreaSqM,
          avgConfidence,
          encroachments: encroachmentCount,
        }}
        onOpenReport={() => {
          if (parcelFeatures.length > 0) {
            setPropertyCardParcel(selectedParcel || parcelFeatures[0]);
          }
        }}
      />

      <Sidebar
        images={images}
        onUpload={handleUpload}
        onStartStitch={handleStartStitch}
        taskState={taskState}
        parcels={parcelFeatures}
        selectedParcel={selectedParcel}
        onSelectParcel={setSelectedParcel}
        orthoSettings={orthoSettings}
        onUpdateOrthoSettings={(newSettings) =>
          setOrthoSettings((prev) => ({ ...prev, ...newSettings }))
        }
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        surveyStats={{
          totalParcels,
          totalAreaHectares,
          totalAreaSqM,
          avgConfidence,
          encroachments: encroachmentCount,
        }}
      />

      <ParcelInspector
        key={selectedParcel?.id || "detail-drawer"}
        parcel={selectedParcel}
        onClose={() => setSelectedParcel(null)}
        onOpenPropertyCard={(p) => setPropertyCardParcel(p)}
        onZoomTo={handleZoomToParcel}
      />

      <PropertyCardModal
        parcel={propertyCardParcel}
        isOpen={Boolean(propertyCardParcel)}
        onClose={() => setPropertyCardParcel(null)}
      />
    </div>
  );
}

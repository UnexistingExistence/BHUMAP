import { computeGeodesicMetrics } from "../utils/geoMetrics";
import { PARCELS_DATA } from "../data/parcels";
import React, { useState, useRef, useEffect } from "react";
import { gsap } from "gsap";
import {
  UploadCloud,
  Layers,
  Map as MapIcon,
  Crosshair,
  CheckCircle,
  Search,
  PieChart,
  RefreshCw,
  Play,
} from "lucide-react";
import { DroneImage } from "../api/droneApi";
import { ParcelFeature, ParcelFeatureCollection } from "../api/parcelApi";

export interface OrthoSettings {
  opacity: number;
  showOrtho: boolean;
  showMarkers: boolean;
  showFlightPath: boolean;
  showBounds: boolean;
  showParcels: boolean;
  baseMap: string;
}

export interface SidebarProps {
  images?: DroneImage[];
  onUpload?: (files: FileList | File[]) => Promise<any>;
  onLoadSamples?: () => Promise<any>;
  onClearImages?: () => Promise<any>;
  onStartStitch?: (mode: string) => Promise<any>;
  onAutoGeotag?: () => Promise<any>;
  taskState?: {
    status: string;
    progress: number;
    stage?: string;
    logs?: string[];
    [key: string]: any;
  };
  parcels?: ParcelFeature[] | ParcelFeatureCollection | any;
  parcelsGeoJSON?: ParcelFeatureCollection | null;
  selectedParcel?: ParcelFeature | null;
  onSelectParcel?: (parcel: ParcelFeature) => void;
  orthoSettings?: OrthoSettings;
  onUpdateOrthoSettings?: (settings: Partial<OrthoSettings>) => void;
  activeTab?: string;
  setActiveTab?: (tab: string) => void;
  surveyStats?: any;
}

export default function Sidebar({
  images = [],
  onUpload = async () => {},
  onStartStitch = async () => {},
  taskState = { status: "idle", progress: 0, stage: "", logs: [] },
  parcels = [],
  parcelsGeoJSON = null,
  selectedParcel = null,
  onSelectParcel = () => {},
  orthoSettings = {
    opacity: 0.85,
    showOrtho: true,
    showMarkers: true,
    showFlightPath: true,
    showBounds: true,
    showParcels: true,
    baseMap: "satellite",
  },
  onUpdateOrthoSettings = () => {},
  activeTab = "upload",
  setActiveTab = () => {},
  surveyStats = {},
}: SidebarProps) {
  const [searchQuery, setSearchQuery] = useState<string>("");
  const fileInputRef = useRef<HTMLInputElement>(null);

  const isProcessing = taskState.status === "processing";
  const isCompleted = taskState.status === "completed";

  const effectiveParcels = PARCELS_DATA;

  const filteredParcels = effectiveParcels.filter((f: any) => {
    const p = f.properties || f;
    const title = p.name || p.title || p.ownerName || "";
    const id = p.id || p.parcelId || "";
    return (
      !searchQuery.trim() ||
      id.toLowerCase().includes(searchQuery.toLowerCase()) ||
      title.toLowerCase().includes(searchQuery.toLowerCase())
    );
  });

  const glassStyle =
    "bg-white/70 backdrop-blur-2xl border border-white/40 shadow-[0_12px_32px_rgba(0,0,0,0.06),inset_0_1px_1px_rgba(255,255,255,0.8)]";

  const navItems = [
    { id: "upload", icon: <UploadCloud size={16} />, label: "Dashboard" },
    { id: "stitch", icon: <Layers size={16} />, label: "Photogrammetry" },
    { id: "parcels", icon: <MapIcon size={16} />, label: "Vectors" },
  ];

  const handleExportGeoJSON = () => {
    if (!effectiveParcels || effectiveParcels.length === 0) return;

    const geojson = {
      type: "FeatureCollection",
      features: effectiveParcels.map((p: any) => ({
        type: "Feature",
        id: p.id || p.properties?.parcelId,
        properties: {
          parcelId: p.id || p.properties?.parcelId,
          khasraNo: p.khasraNo || p.properties?.khasraNo,
          title: p.title || p.properties?.title,
          type: p.type || p.properties?.landUse,
          legalAreaM2: p.legalAreaM2 || p.properties?.legalAreaM2,
          auditStatus: p.auditStatus || p.properties?.auditStatus,
        },
        geometry: {
          type: "Polygon",
          coordinates: [
            (p.coordinates || p.geometry?.coordinates[0]).map((c: any) => [
              c[1],
              c[0],
            ]),
          ],
        },
      })),
    };

    const blob = new Blob([JSON.stringify(geojson, null, 2)], {
      type: "application/json",
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "BhuMap_Cadastral_Export.geojson";
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  return (
    <div className="absolute left-6 top-24 bottom-6 z-[1000] w-72 bg-[#f8fafc]/95 backdrop-blur-xl border border-slate-200/80 shadow-[0_8px_30px_rgb(0,0,0,0.08)] rounded-3xl p-5 flex flex-col gap-4 overflow-hidden text-slate-900 font-medium">
      <div className="flex-shrink-0 space-y-4">
        <div className="flex justify-between items-center px-1 mt-2">
          <span className="text-slate-500 text-xs font-bold tracking-widest uppercase">
            Vector Parcels
          </span>
          <label className="relative inline-flex items-center cursor-pointer">
            <input
              type="checkbox"
              checked={orthoSettings.showParcels}
              onChange={(e) =>
                onUpdateOrthoSettings({ showParcels: e.target.checked })
              }
              className="sr-only peer"
            />
            <div className="w-9 h-5 bg-neutral-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-neutral-900"></div>
          </label>
        </div>
        <div className="flex justify-between items-center px-1">
          <span className="text-slate-500 text-xs font-bold tracking-widest uppercase">
            Ortho Mesh
          </span>
          <label className="relative inline-flex items-center cursor-pointer">
            <input
              type="checkbox"
              checked={orthoSettings.showOrtho}
              onChange={(e) =>
                onUpdateOrthoSettings({ showOrtho: e.target.checked })
              }
              className="sr-only peer"
            />
            <div className="w-9 h-5 bg-neutral-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-neutral-900"></div>
          </label>
        </div>

        <div className="grid grid-cols-2 gap-2">
          <div className="bg-slate-900 border border-slate-700 shadow-md rounded-xl text-white p-3 hover:-translate-y-0.5 transition-transform">
            <div className="text-[9px] uppercase tracking-widest text-slate-400 mb-1 font-bold">
              Total Area
            </div>
            <div className="text-lg font-semibold tracking-tight text-white">
              {Math.round(surveyStats?.totalAreaSqM || 0).toLocaleString()}{" "}
              <span className="text-[10px] text-slate-400 font-normal">m²</span>
            </div>
          </div>
          <div className="bg-slate-900 border border-slate-700 shadow-md rounded-xl text-white p-3 hover:-translate-y-0.5 transition-transform">
            <div className="text-[9px] uppercase tracking-widest text-slate-400 mb-1 font-bold">
              Resolution
            </div>
            <div className="text-lg font-semibold tracking-tight text-white">
              9.47{" "}
              <span className="text-[10px] text-slate-400 font-normal">
                cm/px
              </span>
            </div>
          </div>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto pr-2 space-y-3 custom-scrollbar">
        <div className="flex justify-between items-center mb-1">
          <h3 className="text-slate-500 text-xs font-bold tracking-widest uppercase">
            Detected Parcels
          </h3>
          <button
            onClick={handleExportGeoJSON}
            className="bg-slate-900 hover:bg-slate-800 text-white rounded-full shadow-md px-3 py-1 text-[9px] font-bold transition-all"
          >
            Export
          </button>
        </div>

        {effectiveParcels.map((feature: any) => {
          const parcel = {
            id:
              feature.id ||
              feature.properties?.parcelId ||
              feature.properties?.id,
            status:
              feature.status ||
              feature.auditStatus ||
              feature.properties?.auditStatus ||
              "Verified",
            name:
              feature.name ||
              feature.title ||
              feature.properties?.title ||
              feature.properties?.ownerName ||
              "Verified Parcel",
            type:
              feature.type ||
              feature.properties?.type ||
              feature.properties?.landUse ||
              "Building",
          };

          return (
            <div
              key={parcel.id}
              onClick={() => onSelectParcel(feature)}
              className={`bg-white border border-slate-200 hover:border-slate-300 shadow-sm rounded-xl transition-all p-3 cursor-pointer ${selectedParcel?.id === parcel.id ? "ring-2 ring-indigo-400" : ""}`}
            >
              <div className="flex justify-between items-start mb-1">
                <span className="text-[9px] font-bold text-cyan-600 tracking-wider">
                  {parcel.id}
                </span>
                <span
                  className={`text-[8px] font-bold px-1.5 py-0.5 rounded uppercase ${
                    parcel.status === "Verified" || parcel.status === "MATCH"
                      ? "bg-emerald-100 text-emerald-700"
                      : "bg-amber-100 text-amber-700"
                  }`}
                >
                  {parcel.status === "Verified" || parcel.status === "MATCH"
                    ? "Verified"
                    : "Matched"}
                </span>
              </div>
              <h4 className="text-xs font-semibold text-slate-900 truncate">
                {parcel.name}
              </h4>
              <p className="text-[9px] font-semibold text-slate-500 truncate">
                {parcel.type}
              </p>
            </div>
          );
        })}
      </div>

      <div className="flex-shrink-0 space-y-3 pt-3 border-t border-neutral-200/70">
        <div className="bg-white border border-slate-200 hover:border-slate-300 shadow-sm rounded-xl transition-all p-4">
          <span className="text-slate-500 text-xs font-bold tracking-widest uppercase block mb-1.5">
            Pipeline Status
          </span>
          <ul className="text-[9px] font-semibold space-y-1 text-slate-600">
            <li className="flex items-center gap-1.5 text-emerald-600">
              <span>✓</span> UAV GeoTIFF Ingestion
            </li>
            <li className="flex items-center gap-1.5 text-emerald-600">
              <span>✓</span> AI Feature Extraction
            </li>
            <li className="flex items-center gap-1.5 text-emerald-600">
              <span>✓</span> GIS Topology Check
            </li>
            <li className="flex items-center gap-1.5 text-cyan-600 animate-pulse">
              <span>⟳</span> Human Verification (Active)
            </li>
          </ul>
        </div>

        <div className="bg-white border border-slate-200 hover:border-slate-300 shadow-sm rounded-xl transition-all p-2.5 flex gap-3 justify-center items-center">
          <div className="flex items-center gap-1">
            <div className="w-2 h-2 rounded-full bg-emerald-500"></div>
            <span className="text-[8px] font-bold text-slate-500 uppercase">
              Match
            </span>
          </div>
          <div className="flex items-center gap-1">
            <div className="w-2 h-2 rounded-full bg-amber-500"></div>
            <span className="text-[8px] font-bold text-slate-500 uppercase">
              Variance
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}

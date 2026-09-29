import { PARCELS_DATA, Parcel } from "../data/parcels";
const campusParcels = PARCELS_DATA;
import React, { useState, useEffect, useMemo, useRef } from "react";
import {
  MapContainer,
  TileLayer,
  ImageOverlay,
  SVGOverlay,
  Marker,
  Popup,
  Tooltip,
  Polyline,
  Polygon,
  GeoJSON,
  ZoomControl,
  useMap,
  useMapEvents,
  Pane,
} from "react-leaflet";
import L from "leaflet";
import { Compass, Maximize } from "lucide-react";
import "leaflet/dist/leaflet.css";

import { DroneImage } from "../api/droneApi";
import { ParcelFeature, ParcelFeatureCollection } from "../api/parcelApi";
import bhimtalStitched from "../assets/bhimtal_stitched.png";
import { calculatePerimeter, calculateArea } from "../utils/geo";
import { computeGeodesicMetrics } from "../utils/geoMetrics";
import ParcelDetailDrawer from "./ParcelInspector";

delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl:
    "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png",
  iconUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
  shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
});

export const createDroneMarkerIcon = (
  index: number,
  isSelected = false,
): L.DivIcon => {
  return L.divIcon({
    className: "custom-drone-marker",
    html: `
      <div style="
        background: ${isSelected ? "#224330" : "#2d5a40"};
        color: #ffffff;
        font-weight: 800;
        font-size: 11px;
        width: 24px;
        height: 24px;
        border-radius: 50%;
        display: flex;
        align-items: center;
        justify-content: center;
        border: 2px solid #ffffff;
        box-shadow: 0 3px 10px rgba(45, 90, 64, 0.45);
        transform: translate(-12px, -12px);
        cursor: pointer;
        transition: transform 0.15s ease;
      ">
        ${index + 1}
      </div>
    `,
    iconSize: [24, 24],
    iconAnchor: [0, 0],
  });
};

interface BoundsControllerProps {
  bounds: [[number, number], [number, number]] | null;
  triggerFit: number;
}

function MapBoundsController({ bounds, triggerFit }: BoundsControllerProps) {
  const map = useMap();

  const boundsStr = JSON.stringify(bounds);

  useEffect(() => {
    map.invalidateSize();
    if (bounds) {
      try {
        map.fitBounds(bounds as L.LatLngBoundsExpression, {
          padding: [35, 35],
          maxZoom: 19,
        });
      } catch (err) {
        console.error("Auto-center fitBounds error:", err);
      }
    }
  }, [map, boundsStr, triggerFit]);

  return null;
}


function VectorPaneInitializer() {
  const map = useMap();
  useEffect(() => {
    if (!map.getPane("vector-pane")) {
      map.createPane("vector-pane");
      map.getPane("vector-pane")!.style.zIndex = "999";
    }
  }, [map]);
  return null;
}

function ParcelsLayer({
  parcels,
  visible,
  onSelect,
}: {
  parcels: Parcel[];
  visible: boolean;
  onSelect?: (parcel: Parcel) => void;
}) {
  const map = useMap();
  const [paneReady, setPaneReady] = useState(() =>
    Boolean(map?.getPane("vector-pane")),
  );

  useEffect(() => {
    if (!map.getPane("vector-pane")) {
      map.createPane("vector-pane");
      map.getPane("vector-pane")!.style.zIndex = "999";
    }
    setPaneReady(true);
  }, [map]);


  if (
    !visible ||
    !parcels ||
    !Array.isArray(parcels) ||
    parcels.length === 0 ||
    !paneReady
  ) {
    return null;
  }


  const validParcels = parcels.filter(
    (p) =>
      p &&
      p.coordinates &&
      Array.isArray(p.coordinates) &&
      p.coordinates.length >= 3,
  );

  if (validParcels.length === 0) return null;

  return (
    <>
      {validParcels.map((parcel) => (
        <Polygon
          key={parcel.id}
          positions={parcel.coordinates as [number, number][]}
          pane="vector-pane"
          pathOptions={{
            color: parcel.status === "Verified" ? "#10b981" : "#f59e0b",
            fillColor: parcel.type === "ground" ? "#10b981" : "#3b82f6",
            fillOpacity: 0.45,
            weight: 2,
          }}
          eventHandlers={{
            click: () => onSelect && onSelect(parcel),
          }}
        >
          <Popup>
            <div className="text-slate-900 font-sans p-1">
              <div className="font-semibold text-sm">{parcel.name}</div>
              <div className="text-xs text-slate-500">
                {parcel.id} • {parcel.status}
              </div>
              <div className="text-xs mt-1">
                Area: {parcel.areaSqM.toLocaleString()} m²
              </div>
            </div>
          </Popup>
        </Polygon>
      ))}
    </>
  );
}

export type ImageFeature = DroneImage;
export type ParcelGeoJSON = ParcelFeatureCollection;

export interface MapProps {
  images?: DroneImage[];
  bounds?: [[number, number], [number, number]] | [number, number][] | null;
  center?: [number, number] | null;
  flightPath?: [number, number][];
  orthophotoUrl?: string | null;
  orthoOpacity?: number;
  showOrtho?: boolean;
  showMarkers?: boolean;
  showFlightPath?: boolean;
  showBounds?: boolean;
  showParcels?: boolean;
  parcelsGeoJSON?: ParcelFeatureCollection | null;
  baseMap?: string;
  onUpdateBaseMap?: (baseMap: string) => void;
  onUpdateOpacity?: (opacity: number) => void;
  onCenterSurvey?: () => void;
  selectedParcel?: ParcelFeature | null;
  onSelectParcel?: (parcel: ParcelFeature | null) => void;
  selectedImageId?: number | null;
  onSelectImage?: (id: number | null) => void;
  triggerFit?: number;
}


export const DRONE_SURVEY_BOUNDS: [[number, number], [number, number]] = [
  [29.35614, 79.55113],
  [29.35794, 79.55313],
];
export const imageBounds = DRONE_SURVEY_BOUNDS;

const createDragHandleIcon = () => {
  return L.divIcon({
    className: "bg-transparent border-none",
    html: `
      <div class="relative flex items-center justify-center cursor-grab active:cursor-grabbing w-full h-full group">
        <div class="absolute w-3.5 h-3.5 bg-white border-[2px] border-emerald-400 rounded-full shadow-[0_0_8px_rgba(52,211,153,0.6)] group-hover:scale-110 transition-transform"></div>
      </div>
    `,
    iconSize: [20, 20],
    iconAnchor: [10, 10],
  });
};

export default function Map({
  images = [],
  bounds = null,
  center = null,
  flightPath = [],
  orthophotoUrl = null,
  orthoOpacity = 0.85,
  showOrtho = true,
  showMarkers = true,
  showFlightPath = true,
  showBounds = true,
  showParcels = true,
  parcelsGeoJSON = null,
  baseMap = "satellite",
  onUpdateBaseMap = () => {},
  onUpdateOpacity = () => {},
  onCenterSurvey = () => {},
  selectedParcel: propSelectedParcel = null,
  onSelectParcel = () => {},
  selectedImageId = null,
  onSelectImage = () => {},
  triggerFit = 0,
}: MapProps) {
  const [selectedParcel, setSelectedParcel] = useState<any>(null);
  const [hoveredParcelId, setHoveredParcelId] = useState<string | null>(null);
  const [parcelMetrics, setParcelMetrics] = useState<{
    area_m2: number;
    perimeter_m: number;
    area_ha: string;
  } | null>(null);
  const [loadingMetrics, setLoadingMetrics] = useState(false);

  const [dragBounds, setDragBounds] = useState({
    north: 29.35792,
    south: 29.35545,
    east: 79.55353,
    west: 79.55072,
  });

  const [origDragBounds] = useState({
    north: DRONE_SURVEY_BOUNDS[1][0],
    south: DRONE_SURVEY_BOUNDS[0][0],
    east: DRONE_SURVEY_BOUNDS[1][1],
    west: DRONE_SURVEY_BOUNDS[0][1],
  });

  useEffect(() => {
    if (propSelectedParcel) {
      setSelectedParcel(propSelectedParcel);
    } else {
      setSelectedParcel(null);
    }
  }, [propSelectedParcel]);

  const calculateGeodesicMetrics = (coords: any) => {
    return {
      area_m2: calculateArea(coords),
      perimeter_m: calculatePerimeter(coords),
      area_ha: (calculateArea(coords) / 10000).toFixed(4),
    };
  };

  const handleSelectParcel = async (parcel: any) => {
    setSelectedParcel(parcel);
    if (onSelectParcel) onSelectParcel(parcel);
    try {
      setLoadingMetrics(true);

      const fallback = calculateGeodesicMetrics(parcel.coordinates);
      setParcelMetrics(fallback as any);
    } catch (err) {
      const fallback = calculateGeodesicMetrics(parcel.coordinates);
      setParcelMetrics(fallback as any);
    } finally {
      setLoadingMetrics(false);
    }
  };

  const geoJsonRef = useRef<L.GeoJSON | null>(null);
  const [metadata, setMetadata] = useState<any>(null);

  const [currentOpacity, setCurrentOpacity] = useState<number>(
    orthoOpacity !== undefined ? orthoOpacity : 0.85,
  );

  useEffect(() => {
    if (orthoOpacity !== undefined) {
      setCurrentOpacity(orthoOpacity);
    }
  }, [orthoOpacity]);


  const safeParcels =
    campusParcels && Array.isArray(campusParcels) ? campusParcels : [];
  const rawCoordinates = safeParcels.flatMap((p) =>
    Array.isArray(p.coordinates) ? p.coordinates : [],
  );


  const validCoords = rawCoordinates.filter(
    (c) =>
      Array.isArray(c) &&
      c.length >= 2 &&
      typeof c[0] === "number" &&
      typeof c[1] === "number" &&
      !isNaN(c[0]) &&
      !isNaN(c[1]),
  );

  let parcelsBounds: [[number, number], [number, number]] | null = null;
  let dynamicCenter: [number, number] | null = null;

  if (validCoords.length > 0) {
    const minLat = Math.min(...validCoords.map((c) => c[0]));
    const maxLat = Math.max(...validCoords.map((c) => c[0]));
    const minLng = Math.min(...validCoords.map((c) => c[1]));
    const maxLng = Math.max(...validCoords.map((c) => c[1]));
    parcelsBounds = [
      [minLat, minLng],
      [maxLat, maxLng],
    ];
    dynamicCenter = [(minLat + maxLat) / 2, (minLng + maxLng) / 2];
  }

  const effectiveBounds: [[number, number], [number, number]] =
    parcelsBounds || DRONE_SURVEY_BOUNDS;
  const effectiveCenter: [number, number] = dynamicCenter || [29.3598, 79.55];

  const effectiveTileUrl: string =
    orthophotoUrl && orthophotoUrl.includes("{z}")
      ? orthophotoUrl
      : metadata?.tileUrlAbsolute ||
        metadata?.tileUrl ||
        "/tiles/{z}/{x}/{y}.png";
  const isTileUrl = Boolean(
    effectiveTileUrl && effectiveTileUrl.includes("{z}"),
  );
  const isStreets = baseMap === "streets" || baseMap === "street";

  const currentBounds: [[number, number], [number, number]] = [
    [dragBounds.south, dragBounds.west],
    [dragBounds.north, dragBounds.east],
  ];

  return (
    <div className="w-screen h-screen absolute inset-0 z-0 overflow-hidden bg-neutral-950">
      <MapContainer
        center={effectiveCenter}
        zoom={18}
        minZoom={12}
        maxZoom={22}
        crs={L.CRS.EPSG3857}
        zoomControl={false}
        className="h-full w-full"
        scrollWheelZoom={true}
      >
        <ZoomControl position="bottomright" />

        <VectorPaneInitializer />

        <MapBoundsController bounds={effectiveBounds} triggerFit={triggerFit} />

        {isStreets ? (
          <TileLayer
            key="google-streets"
            maxZoom={22}
            url="https://mt1.google.com/vt/lyrs=m&x={x}&y={y}&z={z}"
            attribution="&copy; Google Maps Road"
          />
        ) : (
          <TileLayer
            key="esri-satellite"
            maxZoom={20}
            url="https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}"
            attribution="Esri World Imagery"
          />
        )}

        {showFlightPath && flightPath.length > 1 && (
          <Polyline
            positions={flightPath}
            pathOptions={{
              color: "#38bdf8",
              weight: 2.5,
              dashArray: "6, 4",
              opacity: 0.95,
            }}
          />
        )}

        <Marker
          draggable={true}
          icon={createDragHandleIcon()}
          position={[dragBounds.north, dragBounds.west]}
          eventHandlers={{
            dragend: (e: any) =>
              setDragBounds((prev) => ({
                ...prev,
                north: e.target.getLatLng().lat,
                west: e.target.getLatLng().lng,
              })),
          }}
        >
          <Tooltip
            permanent
            direction="bottom"
            className="bg-transparent border-none shadow-none p-0 overflow-visible"
          >
            <div
              style={{
                position: "absolute",
                top: "100%",
                marginTop: "8px",
                left: "50%",
                transform: "translateX(-50%)",
              }}
              className="pointer-events-none px-2 py-0.5 text-[10px] whitespace-nowrap bg-black/75 backdrop-blur-md text-cyan-300 border border-white/20 rounded shadow-md font-mono"
            >
              NW: {dragBounds.north.toFixed(5)}°N, {dragBounds.west.toFixed(5)}
              °E
            </div>
          </Tooltip>
        </Marker>
        <Marker
          draggable={true}
          icon={createDragHandleIcon()}
          position={[dragBounds.north, dragBounds.east]}
          eventHandlers={{
            dragend: (e: any) =>
              setDragBounds((prev) => ({
                ...prev,
                north: e.target.getLatLng().lat,
                east: e.target.getLatLng().lng,
              })),
          }}
        >
          <Tooltip
            permanent
            direction="bottom"
            className="bg-transparent border-none shadow-none p-0 overflow-visible"
          >
            <div
              style={{
                position: "absolute",
                top: "100%",
                marginTop: "8px",
                left: "50%",
                transform: "translateX(-50%)",
              }}
              className="pointer-events-none px-2 py-0.5 text-[10px] whitespace-nowrap bg-black/75 backdrop-blur-md text-cyan-300 border border-white/20 rounded shadow-md font-mono"
            >
              NE: {dragBounds.north.toFixed(5)}°N, {dragBounds.east.toFixed(5)}
              °E
            </div>
          </Tooltip>
        </Marker>
        <Marker
          draggable={true}
          icon={createDragHandleIcon()}
          position={[dragBounds.south, dragBounds.east]}
          eventHandlers={{
            dragend: (e: any) =>
              setDragBounds((prev) => ({
                ...prev,
                south: e.target.getLatLng().lat,
                east: e.target.getLatLng().lng,
              })),
          }}
        >
          <Tooltip
            permanent
            direction="bottom"
            className="bg-transparent border-none shadow-none p-0 overflow-visible"
          >
            <div
              style={{
                position: "absolute",
                top: "100%",
                marginTop: "8px",
                left: "50%",
                transform: "translateX(-50%)",
              }}
              className="pointer-events-none px-2 py-0.5 text-[10px] whitespace-nowrap bg-black/75 backdrop-blur-md text-cyan-300 border border-white/20 rounded shadow-md font-mono"
            >
              SE: {dragBounds.south.toFixed(5)}°N, {dragBounds.east.toFixed(5)}
              °E
            </div>
          </Tooltip>
        </Marker>
        <Marker
          draggable={true}
          icon={createDragHandleIcon()}
          position={[dragBounds.south, dragBounds.west]}
          eventHandlers={{
            dragend: (e: any) =>
              setDragBounds((prev) => ({
                ...prev,
                south: e.target.getLatLng().lat,
                west: e.target.getLatLng().lng,
              })),
          }}
        >
          <Tooltip
            permanent
            direction="bottom"
            className="bg-transparent border-none shadow-none p-0 overflow-visible"
          >
            <div
              style={{
                position: "absolute",
                top: "100%",
                marginTop: "8px",
                left: "50%",
                transform: "translateX(-50%)",
              }}
              className="pointer-events-none px-2 py-0.5 text-[10px] whitespace-nowrap bg-black/75 backdrop-blur-md text-cyan-300 border border-white/20 rounded shadow-md font-mono"
            >
              SW: {dragBounds.south.toFixed(5)}°N, {dragBounds.west.toFixed(5)}
              °E
            </div>
          </Tooltip>
        </Marker>

        {showOrtho && (
          <ImageOverlay
            key="bhimtal-drone-ortho"
            url="/bhimtal_stitched.png"
            bounds={currentBounds}
            opacity={currentOpacity ?? 0.85}
            zIndex={400}
            eventHandlers={{
              load: () => {},
              error: (e) => {},
            }}
          />
        )}


        {showParcels && campusParcels && campusParcels.length > 0 && (
          <ParcelsLayer
            parcels={campusParcels.map((p: any) => {
              return {
                ...p,
                coordinates: p.coordinates
                  ? p.coordinates.map((c: any) => {
                      const lat = c[0];
                      const lng = c[1];
                      const latRatio =
                        (lat - origDragBounds.south) /
                        (origDragBounds.north - origDragBounds.south);
                      const lngRatio =
                        (lng - origDragBounds.west) /
                        (origDragBounds.east - origDragBounds.west);

                      const warpedLat =
                        dragBounds.south +
                        latRatio * (dragBounds.north - dragBounds.south);
                      const warpedLng =
                        dragBounds.west +
                        lngRatio * (dragBounds.east - dragBounds.west);

                      return [warpedLat, warpedLng];
                    })
                  : [],
              };
            })}
            visible={showParcels}
            onSelect={handleSelectParcel}
          />
        )}

        {showMarkers &&
          images
            .filter((img) => img.latitude !== null && img.longitude !== null)
            .map((img, idx) => {
              const isSelected = selectedImageId === img.id;
              const thumbUrl = img.thumbnail_path
                ? `/api/images/${img.id}/thumbnail`
                : `/api/images/${img.id}/file`;

              return (
                <Marker
                  key={img.id}
                  position={[img.latitude as number, img.longitude as number]}
                  icon={createDroneMarkerIcon(idx, isSelected)}
                  eventHandlers={{
                    click: () => onSelectImage(img.id),
                  }}
                ></Marker>
              );
            })}

        {selectedParcel && (
          <ParcelDetailDrawer
            metrics={parcelMetrics}
            onClose={() => {
              setSelectedParcel(null);
              if (onSelectParcel) onSelectParcel(null);
            }}
            parcel={selectedParcel}
          />
        )}
      </MapContainer>

      <div className="absolute bottom-8 inset-x-0 flex justify-center z-[1000] pointer-events-none select-none">
        <div
          className="pointer-events-auto flex items-center gap-2 p-1.5 rounded-full bg-white/40 backdrop-blur-3xl border border-white/60 shadow-[0_8px_32px_rgba(31,38,135,0.07)] transition-all duration-300 hover:-translate-y-1"
          onMouseDown={(e) => e.stopPropagation()}
          onDoubleClick={(e) => e.stopPropagation()}
          onClick={(e) => e.stopPropagation()}
          onWheel={(e) => e.stopPropagation()}
        >
          <div className="flex items-center gap-1">
            <button
              onClick={() => onUpdateBaseMap("satellite")}
              className={`px-4 py-2 rounded-full text-xs font-bold transition-all duration-300 cursor-pointer ${
                !isStreets
                  ? "bg-slate-800 text-white shadow-md"
                  : "text-neutral-600 hover:bg-white hover:text-neutral-900"
              }`}
            >
              Satellite
            </button>
            <button
              onClick={() => onUpdateBaseMap("streets")}
              className={`px-4 py-2 rounded-full text-xs font-bold transition-all duration-300 cursor-pointer ${
                isStreets
                  ? "bg-slate-800 text-white shadow-md"
                  : "text-neutral-600 hover:bg-white hover:text-neutral-900"
              }`}
            >
              Streets
            </button>
          </div>

          {showOrtho && (
            <>
              <div className="h-6 w-px bg-neutral-300 mx-2" />
              <div className="flex items-center gap-3 px-3">
                <span className="text-[10px] font-bold uppercase tracking-widest text-neutral-500">
                  Mesh Opacity
                </span>
                <input
                  type="range"
                  min="0"
                  max="1"
                  step="0.05"
                  value={currentOpacity}
                  onChange={(e) => {
                    const val = parseFloat(e.target.value);
                    setCurrentOpacity(val);
                    onUpdateOpacity(val);
                  }}
                  className="w-24 h-1.5 accent-neutral-900 bg-neutral-200 rounded-full appearance-none cursor-pointer [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-4 [&::-webkit-slider-thumb]:h-4 [&::-webkit-slider-thumb]:bg-neutral-900 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:shadow-md"
                />
                <span className="font-mono font-bold text-[11px] text-neutral-800 w-8 text-right">
                  {Math.round(currentOpacity * 100)}%
                </span>
              </div>
            </>
          )}

          <div className="h-6 w-px bg-neutral-300 mx-2" />
          <button
            onClick={() => {
              if (!document.fullscreenElement) {
                document.documentElement.requestFullscreen();
              } else {
                document.exitFullscreen();
              }
            }}
            className="w-10 h-10 flex items-center justify-center rounded-full text-neutral-600 hover:text-neutral-900 hover:bg-white transition-all duration-300 cursor-pointer shrink-0"
            title="Toggle Fullscreen"
          >
            <Maximize size={16} />
          </button>
          <button
            onClick={onCenterSurvey}
            className="w-10 h-10 flex items-center justify-center rounded-full text-neutral-600 hover:text-neutral-900 hover:bg-white transition-all duration-300 cursor-pointer shrink-0"
            title="Fit Survey Footprint"
          >
            <Compass size={16} />
          </button>
        </div>
      </div>
    </div>
  );
}

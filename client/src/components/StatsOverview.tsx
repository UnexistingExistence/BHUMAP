import React, { useEffect, useRef } from "react";
import {
  Building2,
  Maximize2,
  CheckCircle2,
  AlertTriangle,
  Crosshair,
  Activity,
  Camera,
} from "lucide-react";
import { gsap } from "gsap";
import { ParcelFeature, ParcelFeatureCollection } from "../api/parcelApi";
import { DroneImage } from "../api/droneApi";

export interface StatsOverviewProps {
  parcelsGeoJSON?: ParcelFeatureCollection | null;
  parcels?: ParcelFeature[] | ParcelFeatureCollection | null;
  images?: DroneImage[] | null;
  imagesCount?: number | null;
  totalParcels?: number;
  totalAreaSqM?: number;
  avgConfidence?: string | number | null;
  encroachments?: number;
  gsd?: string;
}

export default function StatsOverview({
  parcelsGeoJSON = null,
  parcels = null,
  images = null,
  imagesCount = null,
  totalParcels: propTotalParcels,
  totalAreaSqM: propTotalAreaSqM,
  avgConfidence: propAvgConfidence,
  encroachments: propEncroachments,
  gsd = "2.1 cm/px",
}: StatsOverviewProps) {
  const dockRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (dockRef.current) {
      gsap.fromTo(
        dockRef.current,
        { opacity: 0, y: 16, scale: 0.96 },
        { opacity: 1, y: 0, scale: 1, duration: 0.5, ease: "power3.out" },
      );
    }
  }, []);

  const features: ParcelFeature[] =
    parcelsGeoJSON?.features ||
    (Array.isArray(parcels) ? parcels : parcels?.features) ||
    [];

  const totalParcels =
    propTotalParcels !== undefined ? propTotalParcels : features.length;

  const totalAreaSqM =
    propTotalAreaSqM !== undefined
      ? propTotalAreaSqM
      : features.reduce(
          (sum, f) =>
            sum + (f.properties?.areaSqM || f.properties?.area_sqm || 0),
          0,
        );

  const totalHectares = ((totalAreaSqM || 0) / 10000).toFixed(2);

  const avgConfidence =
    propAvgConfidence !== undefined
      ? propAvgConfidence
      : features.length > 0
        ? (
            (features.reduce(
              (sum, f) => sum + (f.properties?.confidence || 0),
              0,
            ) /
              features.length) *
            100
          ).toFixed(1)
        : null;

  const encroachments =
    propEncroachments !== undefined
      ? propEncroachments
      : features.filter((f) => f.properties?.encroachment).length;

  const resolvedImageCount =
    imagesCount !== null && imagesCount !== undefined
      ? imagesCount
      : Array.isArray(images)
        ? images.length
        : null;

  const stats = [
    { icon: <Activity size={12} />, label: "Altitude", value: "85.0m AGL" },
    { icon: <Crosshair size={12} />, label: "GSD", value: gsd },
    {
      icon: <Building2 size={12} />,
      label: "Parcels",
      value: totalParcels > 0 ? String(totalParcels) : "—",
    },
    {
      icon: <Maximize2 size={12} />,
      label: "Area",
      value: totalAreaSqM > 0 ? `${totalHectares} Ha` : "—",
    },
    {
      icon: <CheckCircle2 size={12} />,
      label: "Accuracy",
      value:
        avgConfidence && Number(avgConfidence) > 0 ? `${avgConfidence}%` : "—",
    },
    {
      icon: <AlertTriangle size={12} />,
      label: "Anomalies",
      value: encroachments > 0 ? `${encroachments}` : "Clear",
      alert: encroachments > 0,
    },
    { icon: null, label: "Overlap", value: "75% / 65%" },
    { icon: null, label: "RMSE", value: "0.018m" },
    ...(resolvedImageCount !== null && resolvedImageCount > 0
      ? [
          {
            icon: <Camera size={12} />,
            label: "Captures",
            value: String(resolvedImageCount),
          },
        ]
      : []),
  ];

  return (
    <div className="absolute bottom-5 inset-x-0 flex justify-center z-[998] pointer-events-none select-none">
      <div
        ref={dockRef}
        className="pointer-events-auto flex items-center gap-1 px-4 py-2 rounded-full bg-white/12 dark:bg-black/20 backdrop-blur-2xl border border-white/25 dark:border-white/12 shadow-[0_8px_32px_0_rgba(0,0,0,0.2)] overflow-x-auto no-scrollbar"
      >
        {stats.map((s, i) => (
          <React.Fragment key={s.label}>
            {i > 0 && <div className="h-3 w-px bg-white/15 mx-1 shrink-0" />}
            <div
              className={`flex flex-col items-center px-3 py-0.5 shrink-0 ${s.alert ? "text-orange-300" : "text-white/80"}`}
            >
              <div className="flex items-center gap-1 mb-0.5 opacity-60">
                {s.icon && s.icon}
                <span className="text-[9px] tracking-widest uppercase">
                  {s.label}
                </span>
              </div>
              <span
                className={`text-[12px] font-semibold leading-none ${s.alert ? "text-orange-300" : "text-white/95"}`}
              >
                {s.value}
              </span>
            </div>
          </React.Fragment>
        ))}
      </div>
    </div>
  );
}

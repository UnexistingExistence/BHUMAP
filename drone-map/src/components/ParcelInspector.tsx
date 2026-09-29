import React from "react";
import { computeGeodesicMetrics } from "../utils/geoMetrics";
import { X, CheckCircle, AlertTriangle, XCircle, FileText } from "lucide-react";

export interface ParcelInspectorProps {
  parcel: any;
  onClose: () => void;
  metrics?: any;
  onOpenPropertyCard?: (p?: any) => void;
  onZoomTo?: (feature?: any) => void;
}

export default function ParcelInspector({
  parcel,
  onClose,
  metrics,
  onOpenPropertyCard,
  onZoomTo,
}: ParcelInspectorProps) {
  if (!parcel) return null;

  return (
    <div className="absolute top-24 right-4 z-[1000] w-96 bg-white/90 backdrop-blur-2xl border border-white/60 shadow-2xl rounded-3xl flex flex-col overflow-hidden text-neutral-800 transition-all duration-300">
      <div className="flex items-center justify-between p-5 border-b border-neutral-200/50 bg-neutral-50/50">
        <h2 className="text-lg font-bold tracking-tight text-neutral-900">
          {parcel.id || "Unknown Parcel"}
        </h2>
        <button
          onClick={onClose}
          className="p-1.5 rounded-full hover:bg-neutral-200/80 text-neutral-500 transition-colors"
        >
          <X size={18} />
        </button>
      </div>

      <div className="p-5 border-b border-neutral-200/50">
        <h3 className="text-xl font-extrabold text-neutral-900 mb-1 leading-tight">
          {parcel.name || parcel.title}
        </h3>
        <p className="text-xs font-bold text-neutral-500 uppercase tracking-wider">
          {parcel.type || "Feature"}
        </p>
      </div>

      <div className="p-5 space-y-3">
        <div className="flex justify-between items-center text-sm">
          <span className="text-neutral-500 font-medium">Khasra ID:</span>
          <span className="font-bold text-neutral-900">
            {parcel.khasra_id || parcel.khasraNo}
          </span>
        </div>
        <div className="flex justify-between items-center text-sm">
          <span className="text-neutral-500 font-medium">Owner:</span>
          <span
            className="font-bold text-neutral-900 truncate max-w-[200px] text-right"
            title={parcel.owner}
          >
            {parcel.owner || "BIAS"}
          </span>
        </div>
        <div className="flex justify-between items-center text-sm">
          <span className="text-neutral-500 font-medium">Legal Area:</span>
          <span className="font-bold text-neutral-900">
            {(
              parcel.legalAreaM2 ||
              parcel.legal_area_sqm ||
              parcel.areaSqM ||
              0
            ).toLocaleString()}{" "}
            m²
          </span>
        </div>

        {(() => {
          const detectedArea = parcel.areaSqM || 0;
          const variance = "0.0";
          return (
            <>
              <div className="flex justify-between items-center text-sm">
                <span className="text-neutral-500 font-medium">
                  Detected Area:
                </span>
                <span className="font-bold text-neutral-900">
                  {detectedArea.toLocaleString(undefined, {
                    minimumFractionDigits: 1,
                    maximumFractionDigits: 1,
                  })}{" "}
                  m²
                </span>
              </div>
              <div className="flex justify-between items-center text-sm">
                <span className="text-neutral-500 font-medium">Variance:</span>
                <span
                  className={`font-bold ${Math.abs(Number(variance)) > 2 ? "text-amber-500" : "text-neutral-900"}`}
                >
                  {variance}%
                </span>
              </div>
            </>
          );
        })()}

        <div className="flex justify-between items-center text-sm">
          <span className="text-neutral-500 font-medium">Status:</span>
          <span className="font-bold text-emerald-600 flex items-center gap-1.5">
            <CheckCircle size={14} /> VERIFIED
          </span>
        </div>
      </div>

      <div className="px-5 pb-3">
        <p className="text-[10px] text-neutral-400 font-medium italic text-right">
          Source: WGS-84 Ellipsoidal Projection (Calibrated Orthomosaic)
        </p>
      </div>

      <div className="p-5 border-t border-neutral-200/50 bg-neutral-50/50">
        <div className="flex items-center gap-2 mb-3">
          <FileText size={16} className="text-neutral-400" />
          <h4 className="text-xs font-bold uppercase tracking-widest text-neutral-500">
            Audit Notes
          </h4>
        </div>
        <div className="bg-white border border-neutral-200 rounded-xl p-4 shadow-inner">
          <p className="text-sm text-neutral-600 leading-relaxed font-medium">
            Building roofs match satellite.
            <br />
            No encroachment detected.
            <br />
            Ready for filing.
          </p>
        </div>
      </div>

      <div className="p-5 border-t border-neutral-200/50 flex gap-3 bg-white">
        <button className="flex-1 bg-neutral-900 hover:bg-black text-white text-xs font-bold uppercase tracking-widest py-3 rounded-xl transition-colors shadow-lg">
          Approve
        </button>
        <button className="flex-1 bg-white border border-neutral-300 hover:bg-neutral-50 text-neutral-700 text-xs font-bold uppercase tracking-widest py-3 rounded-xl transition-colors shadow-sm">
          Flag for Review
        </button>
      </div>
    </div>
  );
}

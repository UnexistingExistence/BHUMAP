import React from "react";
import { X, Printer, ShieldCheck } from "lucide-react";

export default function PropertyCardModal({ parcel, isOpen, onClose }: any) {
  if (!isOpen) return null;

  const exportGeoJSON = () => {
    if (!parcel) return;
    const geojson = {
      type: "FeatureCollection",
      features: [
        {
          type: "Feature",
          geometry: {
            type: "Polygon",
            coordinates: parcel.geometry?.coordinates || [
              parcel.coordinates?.map((c: any) => [c[1], c[0]]),
            ],
          },
          properties: parcel.properties || parcel,
        },
      ],
    };
    const blob = new Blob([JSON.stringify(geojson, null, 2)], {
      type: "application/geo+json",
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${parcel.id || "parcel"}.geojson`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const props = parcel?.properties || parcel || {};


  const rawArea =
    props.legalArea ??
    props.detectedArea ??
    props.area ??
    props.areaSqM ??
    props.area_sqm ??
    "280 m²";
  const parsedArea =
    typeof rawArea === "string"
      ? parseFloat(rawArea.replace(/[^0-9.]/g, "")) || 0
      : Number(rawArea) || 0;

  const rawPerimeter = props.perimeter ?? Math.round(Math.sqrt(parsedArea) * 4);
  const parsedPerimeter =
    typeof rawPerimeter === "string"
      ? parseFloat(rawPerimeter.replace(/[^0-9.]/g, "")) ||
        Math.round(Math.sqrt(parsedArea) * 4)
      : Number(rawPerimeter) || Math.round(Math.sqrt(parsedArea) * 4);

  const valuation = Math.round(parsedArea * 12500);

  return (
    <div className="fixed inset-0 z-[1000] flex items-center justify-center p-4 bg-black/20 backdrop-blur-md animate-in fade-in duration-300">
      <div className="relative w-full max-w-4xl bg-white/40 backdrop-blur-3xl border border-white/60 shadow-[0_8px_32px_rgba(31,38,135,0.07)] rounded-3xl overflow-hidden font-sans text-slate-900 font-medium">

        <div className="px-6 py-5 bg-gradient-to-br from-indigo-400/85 to-purple-500/85 backdrop-blur-xl border border-white/40 shadow-[0_8px_24px_rgba(99,102,241,0.2)] text-white flex items-center justify-between">
          <div className="flex items-center">
            <div>
              <span className="text-indigo-50 text-[11px] font-bold tracking-widest uppercase block mb-0.5">
                State Cadastral Registry • SVAMITVA
              </span>
              <h3 className="text-lg font-bold text-white tracking-tight">
                {props.name || props.title || "Cadastral Parcel"}
              </h3>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <button className="px-4 py-2 bg-white/60 border border-white/80 text-slate-700 backdrop-blur-md rounded-full hover:bg-white/80 transition-all shadow-sm flex items-center gap-2 text-sm font-bold">
              <Printer className="w-4 h-4 text-slate-700" /> Print Title Card
            </button>
            <button
              onClick={onClose}
              className="p-2.5 bg-white/60 border border-white/80 text-slate-700 backdrop-blur-md rounded-full hover:bg-white/80 transition-all shadow-sm"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>


        <div className="p-7 grid grid-cols-1 md:grid-cols-12 gap-6">

          <div className="md:col-span-8 space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="bg-white/55 hover:bg-white/80 border border-white/70 rounded-2xl shadow-[inset_0_1px_0_rgba(255,255,255,1)] transition-all text-slate-800 p-4">
                <span className="text-slate-500 text-[11px] font-bold tracking-wider uppercase block mb-1">
                  Unique Property ID (UPID)
                </span>
                <span className="text-slate-800 font-bold text-sm">
                  {parcel?.id || props?.upid || props?.parcelId || "PARCEL-101"}
                </span>
              </div>
              <div className="bg-white/55 hover:bg-white/80 border border-white/70 rounded-2xl shadow-[inset_0_1px_0_rgba(255,255,255,1)] transition-all text-slate-800 p-4">
                <span className="text-slate-500 text-[11px] font-bold tracking-wider uppercase block mb-1">
                  Khata / Khasra No.
                </span>
                <span className="text-slate-800 font-bold text-sm">
                  {props?.khasraId || props?.khasraNo || "104/1A"}
                </span>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="bg-white/55 hover:bg-white/80 border border-white/70 rounded-2xl shadow-[inset_0_1px_0_rgba(255,255,255,1)] transition-all text-slate-800 p-4">
                <span className="text-slate-500 text-[11px] font-bold tracking-wider uppercase block mb-1">
                  Registered Landowner
                </span>
                <span className="text-slate-800 font-bold text-sm">
                  {props?.owner ||
                    props?.ownerName ||
                    "Government of Uttarakhand / Cadastral Authority"}
                </span>
              </div>
              <div className="bg-white/55 hover:bg-white/80 border border-white/70 rounded-2xl shadow-[inset_0_1px_0_rgba(255,255,255,1)] transition-all text-slate-800 p-4">
                <span className="text-slate-500 text-[11px] font-bold tracking-wider uppercase block mb-1">
                  Trust / Authority
                </span>
                <span className="text-slate-800 font-bold text-sm">
                  Founding Educational Trust
                </span>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="bg-white/55 hover:bg-white/80 border border-white/70 rounded-2xl shadow-[inset_0_1px_0_rgba(255,255,255,1)] transition-all text-slate-800 p-4">
                <span className="text-slate-500 text-[11px] font-bold tracking-wider uppercase block mb-2">
                  Land Classification
                </span>
                <span className="inline-block px-3 py-1 rounded-lg bg-slate-100 text-slate-700 text-xs font-bold border border-slate-200 shadow-sm">
                  INSTITUTIONAL_ZONE_A
                </span>
              </div>
              <div className="bg-white/55 hover:bg-white/80 border border-white/70 rounded-2xl shadow-[inset_0_1px_0_rgba(255,255,255,1)] transition-all text-slate-800 p-4">
                <span className="text-slate-500 text-[11px] font-bold tracking-wider uppercase block mb-2">
                  Municipal Tax Status
                </span>
                <span className="inline-block px-3 py-1 rounded-lg bg-emerald-50 text-emerald-700 text-xs font-bold border border-emerald-200 shadow-sm">
                  VERIFIED_EXEMPT
                </span>
              </div>
            </div>


            <div className="grid grid-cols-2 gap-4">
              <div className="bg-white/55 hover:bg-white/80 border border-white/70 rounded-2xl shadow-[inset_0_1px_0_rgba(255,255,255,1)] transition-all text-slate-800 p-5">
                <span className="text-slate-500 text-[11px] font-bold tracking-wider uppercase block mb-1">
                  Surveyed Geo-Area
                </span>
                <div className="flex items-baseline mt-2">
                  <span className="text-emerald-700 font-extrabold text-2xl tracking-tight">
                    {parsedArea.toLocaleString("en-IN")}
                  </span>
                  <span className="text-slate-500 text-sm ml-1.5 font-bold">
                    m²
                  </span>
                  <span className="ml-3 px-2 py-0.5 rounded-md bg-emerald-50 border border-emerald-200 text-emerald-700 text-xs font-bold shadow-sm">
                    {(parsedArea / 10000).toFixed(4)} Ha
                  </span>
                </div>
              </div>
              <div className="bg-white/55 hover:bg-white/80 border border-white/70 rounded-2xl shadow-[inset_0_1px_0_rgba(255,255,255,1)] transition-all text-slate-800 p-5">
                <span className="text-slate-500 text-[11px] font-bold tracking-wider uppercase block mb-1">
                  Boundary Perimeter
                </span>
                <div className="flex items-baseline mt-2">
                  <span className="text-slate-800 font-extrabold text-2xl tracking-tight">
                    {parsedPerimeter}
                  </span>
                  <span className="text-slate-500 text-sm ml-1.5 font-bold">
                    m
                  </span>
                </div>
              </div>
            </div>

            <div className="bg-white/55 hover:bg-white/80 border border-white/70 rounded-2xl shadow-[inset_0_1px_0_rgba(255,255,255,1)] transition-all text-slate-800 p-5 flex items-center justify-between">
              <div>
                <span className="text-slate-500 text-[11px] font-bold tracking-wider uppercase block">
                  Circle Rate Valuation
                </span>
                <span className="text-slate-400 text-[10px] font-bold mt-0.5 block">
                  BASE RATE: ₹ 12,500/m²
                </span>
              </div>
              <span className="text-emerald-700 font-extrabold text-2xl tracking-tight drop-shadow-sm">
                ₹ {valuation.toLocaleString("en-IN")}
              </span>
            </div>
          </div>


          <div className="md:col-span-4 bg-white/55 border border-white/70 rounded-2xl shadow-[inset_0_1px_0_rgba(255,255,255,1)] p-6 flex flex-col items-center justify-between text-center transition-all text-slate-800">
            <div className="w-full">
              <span className="text-slate-500 text-[11px] font-bold tracking-widest uppercase block mb-6">
                Authenticity Registry
              </span>


              <div className="relative p-3 rounded-2xl bg-white mx-auto w-fit shadow-sm border border-slate-200">
                <img
                  src={`https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=${encodeURIComponent("UPID: " + (parcel?.id || props?.upid || props?.parcelId || "PARCEL-101") + "\nStatus: Verified Cadastre")}`}
                  alt="Cadastral Verification QR"
                  className="w-32 h-32 rounded-xl object-contain opacity-95"
                />
              </div>

              <span className="text-slate-500 text-[10px] font-bold block mt-6 tracking-widest uppercase">
                HASH: UK-29-79-BHM-9421
              </span>
              <span className="text-slate-500 text-[10px] font-bold block mt-1 tracking-widest uppercase">
                UAV-CADASTRE-RTK VERIFIED
              </span>
            </div>

            <div className="w-full mt-8">
              <div className="flex items-center justify-center gap-2 py-2.5 w-full bg-emerald-50 text-emerald-700 font-bold border border-emerald-200 shadow-sm rounded-xl hover:bg-emerald-100 cursor-pointer transition-all">
                <ShieldCheck className="w-4 h-4" />
                <span className="tracking-wide">TITLE DEED VERIFIED</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

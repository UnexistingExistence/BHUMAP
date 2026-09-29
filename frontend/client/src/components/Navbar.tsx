import React from "react";
import { Link } from "react-router-dom";
import { Compass, Search, User, Plus, Download } from "lucide-react";

export interface SurveyStats {
  totalParcels: number;
  totalAreaHectares: string;
  totalAreaSqM: number;
  avgConfidence: string | number;
  encroachments: number;
}

export interface NavbarProps {
  wsConnected?: boolean;
  surveyStats?: SurveyStats;
  onOpenReport?: () => void;
}

export default function Navbar({ surveyStats, onOpenReport }: NavbarProps) {
  const glassStyle =
    "bg-[#f8fafc]/95 backdrop-blur-xl border border-slate-200/80 shadow-[0_8px_30px_rgb(0,0,0,0.08)] text-slate-900 font-medium";

  return (
    <header className="absolute top-6 inset-x-6 z-[1000] flex items-center justify-between pointer-events-none">

      <div
        className={`pointer-events-auto flex items-center justify-between w-full p-2.5 rounded-full ${glassStyle} transition-all duration-300 hover:-translate-y-1`}
      >

        <Link
          to="/"
          className="flex items-center gap-3 group cursor-pointer no-underline pl-3 pr-6"
          title="BhuMap Home"
        >
          <div className="bg-neutral-900 text-white p-2 rounded-full shadow-md transition-transform duration-300 group-hover:scale-105">
            <Compass size={18} strokeWidth={2.5} />
          </div>
          <div className="flex flex-col leading-tight">
            <span className="font-semibold text-base tracking-tight text-slate-900">
              BhuMap Cadastral
            </span>
            <span className="text-[10px] font-medium tracking-widest text-slate-500 uppercase">
              State Registry
            </span>
          </div>
        </Link>


        <div className="flex-1 max-w-md hidden md:block">
          <div className="relative flex items-center w-full h-10 rounded-full bg-white/50 border border-white/60 shadow-inner overflow-hidden focus-within:bg-white/80 focus-within:ring-2 focus-within:ring-neutral-200 transition-all">
            <Search size={16} className="absolute left-4 text-neutral-400" />
            <input
              type="text"
              placeholder="Search Khasra ID, Owner, or Coordinates..."
              className="w-full h-full pl-11 pr-4 bg-transparent outline-none text-sm text-neutral-800 placeholder:text-neutral-400"
            />
          </div>
        </div>


        <div className="flex items-center gap-3 pr-2 pl-6">
          <button className="flex items-center gap-2 bg-white/60 hover:bg-white/80 border border-white/80 text-slate-700 backdrop-blur-md rounded-full px-4 py-2 text-xs font-semibold transition-all shadow-sm">
            <Plus size={14} />
            <span>Create Survey</span>
          </button>
          <button
            onClick={onOpenReport}
            className="flex items-center gap-2 bg-slate-900 hover:bg-slate-800 text-white rounded-full shadow-md px-5 py-2 text-xs font-semibold transition-all"
          >
            <Download size={14} />
            <span>Export Report</span>
          </button>

          <div className="w-px h-6 bg-neutral-200 mx-2" />

          <button className="w-10 h-10 rounded-full bg-white/60 border border-white/80 text-slate-700 backdrop-blur-md flex items-center justify-center hover:shadow-md transition-all">
            <User size={18} />
          </button>
        </div>
      </div>
    </header>
  );
}

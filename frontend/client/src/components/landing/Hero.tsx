import React from "react";

interface HeroProps {
  onWorkspaceAccess: () => void;
}

export default function Hero({ onWorkspaceAccess }: HeroProps) {
  return (
    <section className="relative z-10 max-w-[1300px] mx-auto px-6 pt-16 pb-12 lg:pt-20 lg:pb-24 flex flex-col lg:flex-row items-center justify-between gap-12 font-['Plus_Jakarta_Sans',sans-serif]">
      <div className="w-full lg:w-[58%] flex flex-col items-center lg:items-start text-center lg:text-left">
        <div className="hero-text-elem inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-white border border-[#121e17]/10 text-xs font-semibold text-[#121e17] shadow-xs mb-8">
          <div className="w-4 h-4 rounded-full bg-[#dcefe3] text-[#2d5a40] flex items-center justify-center text-[10px]">
            <svg
              width="10"
              height="10"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="3"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <polyline points="20 6 9 17 4 12"></polyline>
            </svg>
          </div>
          <span>SIH 2026 Problem Statement 26012</span>
        </div>

        <div className="hero-text-elem flex flex-col gap-1 mb-6 w-full text-left">
          <h1 className="text-[3.2rem] md:text-[4.5rem] lg:text-[5.4rem] font-extrabold tracking-[-0.04em] leading-[1.05] text-[#121e17] dark:text-zinc-100 m-0">
            <span className="text-[#2d5a40] dark:text-emerald-400">BhuMap</span>{" "}
            is your
          </h1>

          <div className="flex items-center flex-wrap gap-x-3 text-[3.2rem] md:text-[4.5rem] lg:text-[5.4rem] font-extrabold tracking-[-0.04em] leading-[1.05] text-[#121e17] dark:text-zinc-100">
            <span>automated</span>
            <span className="inline-flex items-center justify-center w-28 h-12 md:w-36 md:h-16 rounded-full overflow-hidden border-2 border-white dark:border-zinc-700 shadow-md align-middle flex-shrink-0 mx-1">
              <img
                src="/tiles/17/35787/49033.png"
                alt="Orthophoto preview"
                className="w-full h-full object-cover"
                onError={(e) => {
                  (e.target as HTMLElement).style.display = "none";
                }}
              />
            </span>
          </div>

          <h1 className="text-[3.2rem] md:text-[4.5rem] lg:text-[5.4rem] font-extrabold tracking-[-0.04em] leading-[1.05] text-[#121e17] dark:text-zinc-100 m-0">
            cadastral mapper
          </h1>
        </div>

        <p className="hero-text-elem text-[17px] md:text-[19px] leading-[1.65] font-normal text-[#121e17]/70 max-w-xl mt-6 text-left">
          AI-Based Automated Urban Parcel Mapping and Cadastral Feature
          Extraction System. Transform high-resolution drone imagery into
          verified GIS datasets instantly.
        </p>

        <div className="hero-text-elem mt-8 flex flex-col sm:flex-row items-center gap-5 w-full justify-start">
          <button
            onClick={onWorkspaceAccess}
            className="px-7 py-3.5 bg-[#4e8264] hover:bg-[#2d5a40] text-white font-medium rounded-full inline-flex items-center gap-2.5 shadow-sm text-sm transition-all cursor-pointer active:scale-98"
          >
            <svg
              width="18"
              height="18"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect>
              <line x1="3" y1="9" x2="21" y2="9"></line>
              <line x1="9" y1="21" x2="9" y2="9"></line>
            </svg>
            Access GIS Workspace
          </button>
          <div className="flex flex-col border-l-2 border-[#121e17]/10 pl-4 py-0.5 text-left text-xs text-[#121e17]/80 font-medium">
            <span className="font-semibold text-[#121e17]">
              Web Environment
            </span>
            <span className="text-[#2d5a40] font-semibold">
              Drone imagery ready
            </span>
          </div>
        </div>
      </div>

      <div className="hero-visual w-full lg:w-[42%] flex justify-center lg:justify-end relative">
        <div className="relative w-[280px] md:w-[320px] aspect-[19.5/40] rounded-[3rem] p-[2px] bg-gradient-to-br from-[#a3a3a3] via-[#e5e5e5] to-[#737373] dark:from-[#333] dark:via-[#555] dark:to-[#222] shadow-[0_30px_60px_-15px_rgba(0,0,0,0.4)] transition-all">
          <div className="absolute inset-[2px] bg-[#111814] rounded-[2.9rem] p-[6px]">
            <div className="absolute top-2.5 left-1/2 -translate-x-1/2 w-[95px] h-[26px] bg-[#000000] rounded-full z-50 flex items-center justify-between px-3 shadow-inner">
              <div className="w-2.5 h-2.5 rounded-full bg-[#1c1c1c] border border-white/10"></div>
              <div className="w-1.5 h-1.5 rounded-full bg-green-500/90 shadow-[0_0_8px_rgba(34,197,94,0.8)]"></div>
            </div>

            <div className="relative w-full h-full bg-[#2a3630] rounded-[2.5rem] overflow-hidden flex flex-col">
              <img
                src="/images/hero-gis-interface.png"
                alt="BhuMap Workspace"
                className="w-full h-full object-cover z-0"
              />

              <div className="absolute top-14 left-4 bg-white/95 dark:bg-[#1a261f]/95 backdrop-blur-md rounded-2xl p-3 shadow-lg border border-[#1c2b23]/10 dark:border-white/10 z-20 flex items-center gap-3">
                <div className="w-8 h-8 rounded-full bg-[#5b8c69]/20 flex items-center justify-center">
                  <svg
                    width="14"
                    height="14"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="#2d5a40"
                    strokeWidth="3"
                  >
                    <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
                  </svg>
                </div>
                <div className="flex flex-col">
                  <span className="text-[10px] font-bold text-[#1c2b23]/50 dark:text-white/50 uppercase">
                    Accuracy
                  </span>
                  <span className="text-[13px] font-bold text-[#1c2b23] dark:text-white">
                    99.2% Validated
                  </span>
                </div>
              </div>

              <div className="absolute bottom-[10px] left-1/2 -translate-x-1/2 w-[100px] h-[4px] bg-white rounded-full z-20 shadow-sm"></div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

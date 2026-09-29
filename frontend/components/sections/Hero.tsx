import Image from "next/image";

interface HeroProps {
  onWorkspaceAccess: () => void;
}

export default function Hero({ onWorkspaceAccess }: HeroProps) {
  return (
    <section className="relative z-10 max-w-[1300px] mx-auto px-6 pt-16 pb-12 lg:pt-20 lg:pb-24 flex flex-col lg:flex-row items-center justify-between gap-12">
      <div className="w-full lg:w-[55%] flex flex-col items-center lg:items-start text-center lg:text-left">
        <div className="hero-text-elem flex items-center gap-3 mb-6 bg-white/70 dark:bg-[#1a261f]/80 backdrop-blur-md pr-4 py-1.5 rounded-full border border-[#1c2b23]/10 dark:border-white/10 shadow-sm transition-colors">
          <div className="bg-[#5b8c69] p-1.5 rounded-full ml-1">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path><polyline points="22 4 12 14.01 9 11.01"></polyline></svg>
          </div>
          <span className="text-[13px] font-bold">SIH 2026 Problem Statement 26012</span>
        </div>

        <h1 className="hero-text-elem text-[2.8rem] md:text-[4rem] leading-[1.05] lg:text-[4.8rem] font-bold tracking-tighter w-full">
          <span className="text-[#5b8c69]">BhuMap</span> is your <br className="hidden md:block" />
          automated
          <div className="inline-flex align-middle mx-2 lg:mx-3 w-20 h-9 md:w-28 md:h-12 lg:w-[130px] lg:h-[60px] rounded-full overflow-hidden relative shadow-inner translate-y-[-4px] lg:translate-y-[-6px]">
            <Image src="/images/hero-gis-interface.png" alt="Cadastral Map snippet" fill className="object-cover" priority />
          </div>
          <br />
          cadastral mapper
        </h1>

        <p className="hero-text-elem mt-6 text-[15px] md:text-[17px] text-[#1c2b23]/70 dark:text-white/70 max-w-xl leading-[1.6] font-medium lg:pr-10 transition-colors">
          AI-Based Automated Urban Parcel Mapping and Cadastral Feature Extraction System. Transform high-resolution drone imagery into verified GIS datasets instantly.
        </p>

        <div className="hero-text-elem mt-8 flex flex-col sm:flex-row items-center gap-5">
          <button onClick={onWorkspaceAccess} className="flex items-center justify-center gap-2 w-full sm:w-auto px-8 py-3.5 rounded-full bg-[#5b8c69] text-white text-[15px] font-bold hover:bg-[#4a7258] hover:shadow-xl hover:-translate-y-1 transition-all cursor-pointer">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect><line x1="3" y1="9" x2="21" y2="9"></line><line x1="9" y1="21" x2="9" y2="9"></line></svg>
            Access GIS Workspace
          </button>
          <div className="flex flex-col border-l-2 border-[#1c2b23]/10 dark:border-white/10 pl-4 py-1 text-left transition-colors">
            <span className="text-[13px] font-bold">Web Environment</span>
            <span className="text-[13px] font-bold text-[#5b8c69]">Drone imagery ready</span>
          </div>
        </div>
      </div>

      <div className="hero-visual w-full lg:w-[45%] flex justify-center lg:justify-end relative">
        <div className="relative w-[280px] md:w-[320px] aspect-[19.5/40] rounded-[3rem] p-[2px] bg-gradient-to-br from-[#a3a3a3] via-[#e5e5e5] to-[#737373] dark:from-[#333] dark:via-[#555] dark:to-[#222] shadow-[0_30px_60px_-15px_rgba(0,0,0,0.4)] transition-all">
          <div className="absolute inset-[2px] bg-[#111814] rounded-[2.9rem] p-[6px]">
            
            <div className="absolute top-2.5 left-1/2 -translate-x-1/2 w-[95px] h-[26px] bg-[#000000] rounded-full z-50 flex items-center justify-between px-3 shadow-inner">
               <div className="w-2.5 h-2.5 rounded-full bg-[#1c1c1c] border border-white/10"></div>
               <div className="w-1.5 h-1.5 rounded-full bg-green-500/90 shadow-[0_0_8px_rgba(34,197,94,0.8)]"></div>
            </div>

            <div className="relative w-full h-full bg-[#2a3630] rounded-[2.5rem] overflow-hidden flex flex-col">
              <Image src="/images/hero-gis-interface.png" alt="BhuMap Workspace" fill className="object-cover z-0" priority />
              
              <div className="absolute top-14 left-4 bg-white/95 dark:bg-[#1a261f]/95 backdrop-blur-md rounded-2xl p-3 shadow-lg border border-[#1c2b23]/10 dark:border-white/10 z-20 flex items-center gap-3 animate-[bounce_4s_infinite]">
                <div className="w-8 h-8 rounded-full bg-[#5b8c69]/20 flex items-center justify-center">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#5b8c69" strokeWidth="3"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>
                </div>
                <div className="flex flex-col">
                  <span className="text-[10px] font-bold text-[#1c2b23]/50 dark:text-white/50 uppercase">Accuracy</span>
                  <span className="text-[13px] font-bold text-[#1c2b23] dark:text-white">99.2% Validated</span>
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
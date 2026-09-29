export default function Process() {
  return (
    <section id="process" className="relative z-10 max-w-[1100px] mx-auto px-6 pt-16 pb-16">
      <div className="mb-14 text-center">
        <h2 className="text-[2.2rem] md:text-[3.2rem] font-bold mb-4 tracking-tight">How it works</h2>
        <p className="text-[15px] md:text-[17px] opacity-70 leading-relaxed font-medium max-w-2xl mx-auto">
          Embrace efficiency as you navigate the automated pipeline of cadastral feature extraction, designed specifically to solve <strong className="text-[#5b8c69]">SIH Problem Statement 26012</strong>.
        </p>
      </div>

      <div className="flex flex-col gap-10 lg:gap-16">
        <div className="process-step bg-white dark:bg-[#111814] rounded-[2rem] p-8 md:p-12 shadow-sm border border-[#1c2b23]/5 dark:border-white/5 flex flex-col lg:flex-row items-center gap-10 relative overflow-hidden transition-colors">
          <span className="absolute -top-10 -left-6 md:-top-16 md:-left-8 text-[8rem] md:text-[12rem] font-bold text-[#1c2b23]/5 dark:text-white/5 leading-none select-none z-0 pointer-events-none">01</span>
          
          <div className="w-full lg:w-1/2 relative z-10">
            <h3 className="text-[1.8rem] md:text-[2.2rem] font-bold mb-4">Data Ingestion</h3>
            <p className="text-[15px] opacity-70 leading-relaxed font-medium">
              Initiate the workflow by securely connecting state land registers and uploading high-resolution drone orthomosaics. We automatically sanitize the imagery to prepare it for the extraction engine, maintaining a verified chain of custody.
            </p>
          </div>
          
          <div className="w-full lg:w-1/2 relative z-10 flex justify-center lg:justify-end">
             <div className="bg-[#f4f8f5] dark:bg-[#1a261f] rounded-2xl p-6 w-full max-w-[300px] border border-[#1c2b23]/5 dark:border-white/5 flex flex-col gap-4">
                <div className="flex justify-between items-center pb-3 border-b border-[#1c2b23]/10 dark:border-white/10">
                  <span className="text-[13px] font-bold">Orthomosaic Upload</span>
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#5b8c69" strokeWidth="2.5"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/></svg>
                </div>
                <div className="flex flex-col gap-1">
                   <span className="text-[11px] font-bold opacity-50 uppercase">Drone Source</span>
                   <span className="text-[13px] font-bold">Sector_4_Mapping.tif</span>
                </div>
                <div className="w-full bg-white dark:bg-[#111814] rounded-full h-1.5 mt-2"><div className="bg-[#5b8c69] h-1.5 rounded-full w-[85%]"></div></div>
             </div>
          </div>
        </div>

        <div className="process-step bg-white dark:bg-[#111814] rounded-[2rem] p-8 md:p-12 shadow-sm border border-[#1c2b23]/5 dark:border-white/5 flex flex-col lg:flex-row items-center gap-10 relative overflow-hidden transition-colors">
          <span className="absolute -top-10 -right-6 md:-top-16 md:-right-8 text-[8rem] md:text-[12rem] font-bold text-[#1c2b23]/5 dark:text-white/5 leading-none select-none z-0 pointer-events-none">02</span>
          
          <div className="w-full lg:w-1/2 relative z-10 flex justify-center lg:justify-start order-2 lg:order-1">
             <div className="bg-[#f4f8f5] dark:bg-[#1a261f] rounded-2xl p-6 w-full max-w-[300px] border border-[#1c2b23]/5 dark:border-white/5 flex flex-col gap-4">
                <div className="flex items-center gap-3 pb-3 border-b border-[#1c2b23]/10 dark:border-white/10">
                  <div className="w-2.5 h-2.5 rounded-full bg-green-500 animate-pulse"></div>
                  <span className="text-[13px] font-bold">AI Engine Active</span>
                </div>
                <div className="flex flex-col gap-2">
                   <div className="flex justify-between items-center bg-white dark:bg-[#111814] px-3 py-2 rounded-lg border border-transparent dark:border-white/5">
                      <span className="text-[12px] font-semibold opacity-70">Parcel Boundaries</span>
                      <span className="text-[12px] font-bold text-[#5b8c69]">Extracted</span>
                   </div>
                   <div className="flex justify-between items-center bg-white dark:bg-[#111814] px-3 py-2 rounded-lg border border-transparent dark:border-white/5">
                      <span className="text-[12px] font-semibold opacity-70">Building Footprints</span>
                      <span className="text-[12px] font-bold text-[#5b8c69]">Extracted</span>
                   </div>
                </div>
             </div>
          </div>

          <div className="w-full lg:w-1/2 relative z-10 order-1 lg:order-2">
            <h3 className="text-[1.8rem] md:text-[2.2rem] font-bold mb-4">AI Feature Extraction</h3>
            <p className="text-[15px] opacity-70 leading-relaxed font-medium">
              Addressing the core of <strong className="text-inherit opacity-100">Problem Statement 26012</strong>, our computer vision models automatically delineate parcel boundaries and structures directly from the imagery, replacing manual plotting with high-speed automated accuracy.
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}
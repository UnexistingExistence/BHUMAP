import Image from "next/image";

export default function About() {
  return (
    <section id="about" className="relative z-10 max-w-[1300px] mx-auto px-6 pt-12 pb-16">
      <h2 className="text-[2rem] md:text-[2.6rem] font-bold mb-12 tracking-tight text-center lg:text-left">About BhuMap Core</h2>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-10 lg:gap-16 items-center">
        
        {/* FIXED: Changed h-[450px] to min-h-[580px] to prevent absolute images from overlapping text below */}
        <div className="about-visuals relative min-h-[580px] md:min-h-[620px] w-full flex justify-center items-center scale-[0.9] md:scale-100">
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[300px] h-[300px] bg-[#5b8c69] rounded-full opacity-[0.08] blur-[70px]"></div>
          
          <div className="absolute right-[5%] lg:right-[15%] top-[20px] w-[240px] md:w-[270px] aspect-[19.5/40] rounded-[3rem] p-[2px] bg-gradient-to-br from-[#a3a3a3] via-[#e5e5e5] to-[#737373] dark:from-[#333] dark:via-[#555] dark:to-[#222] shadow-2xl rotate-[3deg] z-10">
            <div className="absolute inset-[2px] bg-[#111814] rounded-[2.9rem] p-[6px]">
              <div className="relative w-full h-full bg-[#f4f8f5] dark:bg-[#1a261f] rounded-[2.5rem] overflow-hidden">
                <div className="absolute top-2.5 left-1/2 -translate-x-1/2 w-[80px] h-[22px] bg-[#000] rounded-full z-50"></div>
                
                <Image src="/images/hero-gis-interface.png" alt="Map View" fill className="object-cover z-0" />
                
                <div className="absolute right-3 top-1/2 -translate-y-1/2 bg-white/95 dark:bg-[#1a261f]/95 backdrop-blur-md rounded-[14px] flex flex-col shadow-lg border border-black/5 dark:border-white/5 z-20">
                  <button className="p-2.5 border-b border-[#1c2b23]/10 dark:border-white/10 flex items-center justify-center cursor-pointer">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 2L2 22l10-4 10 4L12 2z"/></svg>
                  </button>
                  <button className="p-2.5 border-b border-[#1c2b23]/10 dark:border-white/10 flex items-center justify-center cursor-pointer">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
                  </button>
                  <button className="p-2.5 flex items-center justify-center cursor-pointer">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="5" y1="12" x2="19" y2="12"/></svg>
                  </button>
                </div>

                <div className="absolute bottom-0 left-0 w-full bg-[#edf2ef]/90 dark:bg-[#111814]/90 backdrop-blur-xl pt-3 pb-6 px-4 flex justify-between items-center border-t border-[#1c2b23]/5 dark:border-white/5 z-30">
                  <div className="flex flex-col items-center gap-1 opacity-100 text-[#1c2b23] dark:text-white"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><circle cx="12" cy="12" r="10"/><circle cx="12" cy="12" r="2"/></svg><span className="text-[8px] font-bold">Maps</span></div>
                  <div className="flex flex-col items-center gap-1 opacity-50 text-[#1c2b23] dark:text-white"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/></svg><span className="text-[8px] font-semibold">My requests</span></div>
                  <div className="flex flex-col items-center gap-1 opacity-50 text-[#1c2b23] dark:text-white"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/></svg><span className="text-[8px] font-semibold">Documents</span></div>
                  <div className="flex flex-col items-center gap-1 opacity-50 text-[#1c2b23] dark:text-white"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg><span className="text-[8px] font-semibold">Favorites</span></div>
                  <div className="flex flex-col items-center gap-1 opacity-50 text-[#1c2b23] dark:text-white"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l-.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"/></svg><span className="text-[8px] font-semibold">Settings</span></div>
                </div>
              </div>
            </div>
          </div>

          <div className="absolute left-[5%] lg:left-[10%] top-[80px] w-[240px] md:w-[270px] aspect-[19.5/40] rounded-[3rem] p-[2px] bg-gradient-to-br from-[#a3a3a3] via-[#e5e5e5] to-[#737373] dark:from-[#333] dark:via-[#555] dark:to-[#222] shadow-[0_30px_60px_-15px_rgba(0,0,0,0.4)] z-30 -rotate-[2deg]">
            <div className="absolute inset-[2px] bg-[#111814] rounded-[2.9rem] p-[6px]">
              <div className="relative w-full h-full bg-[#edf2ef] dark:bg-[#151f18] rounded-[2.5rem] overflow-hidden flex flex-col transition-colors">
                
                <div className="pt-3 px-5 pb-3">
                  <div className="flex justify-between items-center mb-5">
                    <span className="text-[10px] font-semibold text-[#1c2b23] dark:text-white">9:41</span>
                    <div className="absolute top-2.5 left-1/2 -translate-x-1/2 w-[80px] h-[22px] bg-[#000] rounded-full z-50"></div>
                    <div className="flex gap-1 items-center text-[#1c2b23] dark:text-white">
                       <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor"><path d="M12 2C6.48 2 2 6.48 2 12C2 17.52 6.48 22 12 22C17.52 22 22 17.52 22 12C22 6.48 17.52 2 12 2ZM11 19.93C7.05 19.43 4 16.05 4 12C4 7.95 7.05 4.57 11 4.07V19.93ZM13 4.07C16.95 4.57 20 7.95 20 12C20 16.05 16.95 19.43 13 19.93V4.07Z"/></svg>
                    </div>
                  </div>
                  
                  <div className="flex justify-between items-center mb-4">
                    <span className="text-[15px] font-bold text-center w-full relative">My requests
                      <span className="absolute right-0 top-1/2 -translate-y-1/2 text-[11px] font-semibold opacity-50">Edit</span>
                    </span>
                  </div>

                  <div className="flex bg-white dark:bg-[#0c120e] p-1 rounded-[14px] shadow-sm border border-transparent dark:border-white/5">
                    <div className="flex-1 text-center text-[11px] font-bold text-white bg-[#434b46] dark:bg-[#5b8c69] rounded-[10px] py-1.5">History</div>
                    <div className="flex-1 text-center text-[11px] font-bold opacity-50 py-1.5">Measurement</div>
                  </div>
                </div>

                <div className="flex-1 overflow-y-auto px-4 pb-20 flex flex-col gap-3">
                  {[
                    { date: '10.08.23 - 10:10 am', id: '7110000000:00:000:0000', area: 'Area 1, 2004 ha', color: '#bce4ce', fill: true },
                    { date: '07.08.23 - 11:20 am', id: '7110000000:00:034:0011', area: 'Area 2, 101 ha', color: '#e4cdbc', fill: true },
                    { date: '01.08.23 - 09:15 am', id: '7110000000:00:000:0349', area: 'Area 3, 1002 ha', color: '#bce4ce', fill: true },
                    { date: '29.07.23 - 10:45 am', id: '7110000000:00:000:0358', area: 'Area 1, 0009 ha', color: 'none', fill: false }
                  ].map((item, i) => (
                    <div key={i} className="bg-[#fcfdfc] dark:bg-[#111814] p-3 rounded-2xl shadow-sm border border-[#1c2b23]/5 dark:border-white/5 flex gap-3 items-center">
                      <div className="w-8 h-8 flex-shrink-0 flex items-center justify-center">
                         <svg width="24" height="24" viewBox="0 0 24 24" fill={item.color !== 'none' ? item.color : 'none'} stroke={item.fill ? 'none' : '#bce4ce'} strokeWidth="1.5" className={item.color === 'none' ? 'dark:fill-[#1a261f]' : ''}>
                            <polygon points="5,5 19,8 15,20 3,15" />
                         </svg>
                      </div>
                      <div className="flex flex-col w-full">
                        <div className="flex justify-between items-center mb-0.5">
                          <span className="text-[8px] font-bold opacity-40">{item.date}</span>
                          <svg width="10" height="10" viewBox="0 0 24 24" fill={item.fill ? "currentColor" : "none"} stroke="currentColor" strokeWidth="2" className="text-[#434b46] dark:text-white"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg>
                        </div>
                        <span className="text-[11px] font-bold tracking-tight">{item.id}</span>
                        <span className="text-[9px] font-semibold opacity-50">{item.area}</span>
                      </div>
                    </div>
                  ))}
                </div>

                <div className="absolute bottom-0 left-0 w-full bg-[#edf2ef]/90 dark:bg-[#111814]/90 backdrop-blur-xl pt-3 pb-6 px-4 flex justify-between items-center border-t border-[#1c2b23]/5 dark:border-white/5 z-30">
                  <div className="flex flex-col items-center gap-1 opacity-50"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><circle cx="12" cy="12" r="10"/><circle cx="12" cy="12" r="2"/></svg><span className="text-[8px] font-semibold">Maps</span></div>
                  <div className="flex flex-col items-center gap-1 opacity-100"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/></svg><span className="text-[8px] font-bold">My requests</span></div>
                  <div className="flex flex-col items-center gap-1 opacity-50"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/></svg><span className="text-[8px] font-semibold">Documents</span></div>
                  <div className="flex flex-col items-center gap-1 opacity-50"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg><span className="text-[8px] font-semibold">Favorites</span></div>
                  <div className="flex flex-col items-center gap-1 opacity-50"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l-.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"/></svg><span className="text-[8px] font-semibold">Settings</span></div>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="flex flex-col items-start lg:pl-6 pt-4 lg:pt-0">
          <h3 className="about-text-elem text-[2.2rem] md:text-[2.6rem] font-bold leading-[1.1] mb-4 tracking-tight">
            Automated <span className="text-[#5b8c69]">Cadastral Extraction</span>
          </h3>
          <p className="about-text-elem text-[#1c2b23]/70 dark:text-white/70 text-[15px] md:text-[16px] leading-relaxed mb-8 font-medium">
            Explore extracted urban parcels effortlessly, harness the power of AI-driven geometry delineation, and streamline surveyor validation tasks.
          </p>
          <div className="flex flex-col gap-6 md:gap-8">
            <div className="about-text-elem flex items-start gap-4">
              <div className="mt-1 bg-white dark:bg-[#1a261f] p-2.5 rounded-xl shadow-sm border border-[#1c2b23]/5 dark:border-white/5">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M3 3h18v18H3zM9 3v18M15 3v18M3 9h18M3 15h18"></path><path d="M9 9l6 6"></path></svg>
              </div>
              <div className="flex flex-col">
                <h4 className="text-[16px] font-bold mb-1">Direct GIS Integration</h4>
                <p className="text-[14px] opacity-70 leading-relaxed font-medium">Select extracted parcels and perform automated area calculations. Export boundaries directly into GIS formats.</p>
              </div>
            </div>
            <div className="about-text-elem flex items-start gap-4">
              <div className="mt-1 bg-white dark:bg-[#1a261f] p-2.5 rounded-xl shadow-sm border border-[#1c2b23]/5 dark:border-white/5">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path><polyline points="14 2 14 8 20 8"></polyline><line x1="12" y1="18" x2="12" y2="12"></line><line x1="9" y1="15" x2="12" y2="18"></line><line x1="15" y1="15" x2="12" y2="18"></line></svg>
              </div>
              <div className="flex flex-col">
                <h4 className="text-[16px] font-bold mb-1">Validate, Store and Export</h4>
                <p className="text-[14px] opacity-70 leading-relaxed font-medium">Compare extracted geometry with existing cadastral information. Track discrepancy history securely.</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
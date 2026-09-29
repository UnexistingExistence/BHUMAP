export default function Footer() {
  return (
    <footer className="relative z-10 border-t border-[#1c2b23]/10 dark:border-white/5 bg-white/40 dark:bg-[#0c120e]/40 backdrop-blur-md pt-12 pb-8 transition-colors">
      <div className="max-w-[1300px] mx-auto px-6 flex flex-col gap-10">
        <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-8">
          <div className="flex flex-col gap-3">
            <div className="flex items-center gap-2">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" className="text-[#1c2b23] dark:text-white">
                <path d="M12 2L2 7L12 12L22 7L12 2Z" fill="currentColor"/>
                <path d="M2 17L12 22L22 17M2 12L12 17L22 12" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
              <span className="text-xl font-bold tracking-tight">BhuMap</span>
            </div>
            <p className="text-[14px] opacity-70 font-medium max-w-sm">
              Smart India Hackathon 2026 • Problem Statement 26012<br />
              AI-Based Automated Urban Parcel Mapping System.
            </p>
          </div>

          <div className="flex flex-wrap gap-8 lg:gap-16">
            <div className="flex flex-col gap-3">
              <span className="text-[12px] font-bold uppercase tracking-wider">Platform</span>
              <a href="/about" className="text-[14px] opacity-70 hover:text-[#5b8c69] hover:opacity-100 font-bold transition-colors">Core Overview</a>
              <a href="/features" className="text-[14px] opacity-70 hover:text-[#5b8c69] hover:opacity-100 font-bold transition-colors">Extraction Engine</a>
            </div>
            <div className="flex flex-col gap-3">
              <span className="text-[12px] font-bold uppercase tracking-wider">Resources</span>
              <a href="/faq" className="text-[14px] opacity-70 hover:text-[#5b8c69] hover:opacity-100 font-bold transition-colors">Documentation</a>
              <a href="/faq" className="text-[14px] opacity-70 hover:text-[#5b8c69] hover:opacity-100 font-bold transition-colors">GIS Standards</a>
            </div>
          </div>
        </div>

        <div className="flex flex-col sm:flex-row justify-between items-center gap-4 pt-6 border-t border-[#1c2b23]/10 dark:border-white/5">
          <span className="text-[13px] opacity-60 font-bold">
            © 2026 BhuMap Team. Smart India Hackathon Submission.
          </span>
          <div className="flex items-center gap-6">
            <span className="text-[13px] opacity-70 hover:text-[#5b8c69] hover:opacity-100 font-bold cursor-pointer transition-colors">Privacy Policy</span>
            <span className="text-[13px] opacity-70 hover:text-[#5b8c69] hover:opacity-100 font-bold cursor-pointer transition-colors">Terms of Service</span>
          </div>
        </div>
      </div>
    </footer>
  );
}
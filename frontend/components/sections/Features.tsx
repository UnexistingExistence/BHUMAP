export default function Features() {
  return (
    <section id="features" className="relative z-10 max-w-[1300px] mx-auto px-6 pt-12 pb-12">
      <h2 className="text-[2rem] md:text-[2.6rem] font-bold mb-8 tracking-tight text-center lg:text-left">System Features</h2>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5">
        {[
          { t: 'Automated Pipeline', d: 'Drone imagery is processed through AI models, pulling geometries directly to the map automatically.', i: <path d="M21 12a9 9 0 11-9-9c2.52 0 4.93 1 6.74 2.74L21 8 M21 3v5h-5 M12 7v5l3 3"/> },
          { t: 'High Accuracy Extraction', d: 'Advanced algorithms ensure high fidelity to land-use features, identifying buildings and roads.', i: <><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/><path d="M9 12l2 2 4-4"/></> },
          { t: 'Surveyor Validation', d: 'Easy access to validation tools through the interface, streamlining geometry adjustment workflows.', i: <><circle cx="12" cy="12" r="10"/><path d="M12 16v-4"/><path d="M12 8h.01"/></> },
          { t: 'Standardized Export', d: 'Seamlessly export verified parcel geometries directly into state registers from the web dashboard.', i: <><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></> }
        ].map((feat, index) => (
          <div key={index} className="feature-card bg-white dark:bg-[#111814] rounded-[2rem] p-8 shadow-sm border border-[#1c2b23]/5 dark:border-white/5 flex flex-col hover:shadow-xl hover:-translate-y-1 transition-all duration-300">
            <div className="w-14 h-14 rounded-2xl bg-[#f4f8f5] dark:bg-[#1a261f] flex items-center justify-center mb-6">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">{feat.i}</svg>
            </div>
            <h4 className="text-[17px] font-bold mb-3">{feat.t}</h4>
            <p className="text-[14px] opacity-70 leading-relaxed font-medium">{feat.d}</p>
          </div>
        ))}
      </div>
    </section>
  );
}
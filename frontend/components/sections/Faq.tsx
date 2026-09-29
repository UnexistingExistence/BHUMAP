"use client";

import { useState } from "react";

export default function Faq() {
  const [activeCategory, setActiveCategory] = useState("Extraction");
  const [openFaq, setOpenFaq] = useState<number | null>(0);

  const faqData: Record<string, { q: string; a: string }[]> = {
    "General": [
      {
        q: "What is BhuMap and how does it address Problem Statement 26012?",
        a: "BhuMap is an AI-based automated urban parcel mapping and cadastral feature extraction system designed for Smart India Hackathon 2026. It transforms high-resolution drone imagery into structured, verifiable GIS datasets."
      },
      {
        q: "What drone imagery formats are supported for ingestion?",
        a: "The platform ingests high-resolution orthomosaics, GeoTIFFs, and multi-spectral aerial datasets captured by standard UAV survey platforms."
      }
    ],
    "Extraction": [
      {
        q: "How does the AI model extract parcel boundaries and buildings?",
        a: "BhuMap employs deep learning segmentation models trained on aerial imagery to automatically delineate parcel boundaries, building footprints, and access corridors with high spatial precision."
      },
      {
        q: "Can generated layers be compared with existing cadastral data?",
        a: "Yes. Newly extracted AI geometries are overlaid directly on top of legacy state cadastral layers to instantly highlight shifts, boundary discrepancies, and unmapped structures."
      }
    ],
    "Validation": [
      {
        q: "How do surveyors perform ground truthing and verification?",
        a: "Surveyors use the interactive web GIS workspace to review flagged discrepancies, adjust boundary vertices, and sign off on verified parcels before final archival."
      },
      {
        q: "Is a complete audit trail maintained for surveyor edits?",
        a: "Every modification, verification stamp, and timestamp is logged securely under the surveyor profile ID to ensure an immutable chain of custody."
      }
    ],
    "GIS Export": [
      {
        q: "What export formats are available for state land registries?",
        a: "Verified datasets can be exported instantly into standard GIS vector formats including GeoJSON, ESRI Shapefile (SHP), and KML."
      },
      {
        q: "Does BhuMap integrate with existing state GIS portals?",
        a: "Yes. The platform provides secure API endpoints and standardized schema exports designed for seamless integration into state-level land administration workflows."
      }
    ]
  };

  return (
    <section id="faq" className="relative z-10 max-w-[1300px] mx-auto px-6 pt-8 pb-16">
      <h2 className="text-[2rem] md:text-[2.6rem] font-bold mb-10 tracking-tight text-center lg:text-left">Frequently Asked Questions</h2>
      
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12 items-start">
        <div className="lg:col-span-4 bg-white/80 dark:bg-[#111814]/80 backdrop-blur-md rounded-[2rem] p-4 shadow-sm border border-[#1c2b23]/5 dark:border-white/5 flex flex-col gap-2 transition-colors">
          {Object.keys(faqData).map((cat) => (
            <button
              key={cat}
              onClick={() => { setActiveCategory(cat); setOpenFaq(0); }}
              className={`w-full text-left px-5 py-4 rounded-xl text-[15px] font-bold transition-all flex items-center justify-between cursor-pointer ${
                activeCategory === cat ? "bg-[#1c2b23] dark:bg-white text-white dark:text-[#1c2b23] shadow-md" : "opacity-70 hover:bg-[#f4f8f5] dark:hover:bg-[#1a261f] hover:opacity-100"
              }`}
            >
              <span>{cat}</span>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M9 18l6-6-6-6"/></svg>
            </button>
          ))}
        </div>

        <div className="lg:col-span-8 flex flex-col gap-4">
          {faqData[activeCategory].map((item, index) => {
            const isOpen = openFaq === index;
            return (
              <div 
                key={index}
                className="bg-white dark:bg-[#111814] rounded-[1.5rem] p-6 shadow-sm border border-[#1c2b23]/5 dark:border-white/5 transition-all cursor-pointer hover:shadow-md"
                onClick={() => setOpenFaq(isOpen ? null : index)}
              >
                <div className="flex justify-between items-center gap-4">
                  <h4 className="text-[16px] md:text-[17px] font-bold leading-snug">{item.q}</h4>
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center transition-transform shrink-0 ${isOpen ? "rotate-45 bg-[#5b8c69] text-white" : "bg-[#f4f8f5] dark:bg-[#1a261f]"}`}>
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
                  </div>
                </div>
                {isOpen && (
                  <p className="mt-4 text-[14px] md:text-[15px] opacity-70 leading-relaxed font-medium pt-4 border-t border-[#1c2b23]/5 dark:border-white/5">
                    {item.a}
                  </p>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
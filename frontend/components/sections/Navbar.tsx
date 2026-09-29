"use client";

import { useState, useEffect } from "react";
import { useTheme } from "next-themes";
import { usePathname } from "next/navigation";

interface NavbarProps {
  isLoggedIn: boolean;
  onWorkspaceAccess: () => void;
  onLogout: () => void;
  onOpenAuth: () => void;
}

export default function Navbar({ isLoggedIn, onWorkspaceAccess, onLogout, onOpenAuth }: NavbarProps) {
  const { theme, resolvedTheme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);
  const pathname = usePathname();

  useEffect(() => {
    setMounted(true);
  }, []);

  const toggleTheme = () => {
    const current = theme === "system" ? resolvedTheme : theme;
    setTheme(current === "dark" ? "light" : "dark");
  };

  // Handles clean URL update + smooth scrolling without reloading
  const handleNavClick = (e: React.MouseEvent<HTMLAnchorElement>, path: string, targetId: string) => {
    e.preventDefault();
    window.history.pushState(null, '', path);
    
    if (targetId === "top") {
      window.scrollTo({ top: 0, behavior: "smooth" });
    } else {
      const el = document.getElementById(targetId);
      if (el) el.scrollIntoView({ behavior: "smooth" });
    }
  };

  return (
    <nav className="relative z-20 max-w-[1400px] mx-auto px-6 pt-8 pb-6 flex items-center justify-between">
      <a href="/" onClick={(e) => handleNavClick(e, "/", "top")} className="nav-elem flex items-center gap-3 cursor-pointer">
        <svg width="26" height="26" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" className="text-[#1c2b23] dark:text-white">
          <path d="M12 2L2 7L12 12L22 7L12 2Z" fill="currentColor"/>
          <path d="M2 17L12 22L22 17M2 12L12 17L22 12" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/>
        </svg>
        <span className="text-[1.35rem] font-bold tracking-tight">BhuMap</span>
      </a>

      <div className="hidden md:flex items-center gap-10">
        <a href="/platform" onClick={(e) => handleNavClick(e, "/platform", "about")} className={`nav-elem text-[15px] font-semibold text-[#1c2b23]/70 dark:text-white/70 hover:text-[#5b8c69] dark:hover:text-[#5b8c69] transition-colors cursor-pointer ${pathname === "/platform" ? "text-[#5b8c69] dark:text-[#5b8c69]" : ""}`}>Platform</a>
        <a href="/feature" onClick={(e) => handleNavClick(e, "/feature", "features")} className={`nav-elem text-[15px] font-semibold text-[#1c2b23]/70 dark:text-white/70 hover:text-[#5b8c69] dark:hover:text-[#5b8c69] transition-colors cursor-pointer ${pathname === "/feature" ? "text-[#5b8c69] dark:text-[#5b8c69]" : ""}`}>Features</a>
        <a href="/platform/how-it-work" onClick={(e) => handleNavClick(e, "/platform/how-it-work", "process")} className={`nav-elem text-[15px] font-semibold text-[#1c2b23]/70 dark:text-white/70 hover:text-[#5b8c69] dark:hover:text-[#5b8c69] transition-colors cursor-pointer ${pathname === "/platform/how-it-work" ? "text-[#5b8c69] dark:text-[#5b8c69]" : ""}`}>How it works</a>
        <a href="/faq" onClick={(e) => handleNavClick(e, "/faq", "faq")} className={`nav-elem text-[15px] font-semibold text-[#1c2b23]/70 dark:text-white/70 hover:text-[#5b8c69] dark:hover:text-[#5b8c69] transition-colors cursor-pointer ${pathname === "/faq" ? "text-[#5b8c69] dark:text-[#5b8c69]" : ""}`}>FAQ</a>
      </div>

      <div className="nav-elem flex items-center gap-3">
        {mounted && (
          <button onClick={toggleTheme} className="p-2.5 rounded-full bg-white dark:bg-[#1a261f] border border-[#1c2b23]/10 dark:border-white/10 text-[#1c2b23] dark:text-white hover:shadow-md transition-all flex items-center justify-center cursor-pointer" aria-label="Toggle Dark Mode">
            {theme === 'dark' || resolvedTheme === 'dark' ? (
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="5"/><line x1="12" y1="1" x2="12" y2="3"/><line x1="12" y1="21" x2="12" y2="23"/><line x1="4.22" y1="4.22" x2="5.64" y2="5.64"/><line x1="18.36" y1="18.36" x2="19.78" y2="19.78"/><line x1="1" y1="12" x2="3" y2="12"/><line x1="21" y1="12" x2="23" y2="12"/><line x1="4.22" y1="19.78" x2="5.64" y2="18.36"/><line x1="18.36" y1="4.22" x2="19.78" y2="5.64"/></svg>
            ) : (
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/></svg>
            )}
          </button>
        )}

        {isLoggedIn ? (
          <div className="flex items-center gap-2">
            <button onClick={onWorkspaceAccess} className="flex items-center gap-2 px-5 py-2.5 rounded-full bg-[#5b8c69] text-white text-[13px] font-bold hover:bg-[#4a7258] transition-all shadow-md cursor-pointer">
              Go to Workspace
            </button>
            <button onClick={onLogout} className="px-3 py-2.5 rounded-full text-xs font-semibold text-[#1c2b23]/60 dark:text-white/60 hover:text-red-500 transition-colors cursor-pointer">
              Sign Out
            </button>
          </div>
        ) : (
          <div className="flex items-center gap-2">
            <button onClick={onOpenAuth} className="px-4 py-2.5 text-[14px] font-bold text-[#1c2b23] dark:text-white hover:text-[#5b8c69] transition-colors cursor-pointer">
              Sign In
            </button>
            <button onClick={onWorkspaceAccess} className="flex items-center gap-2 px-6 py-2.5 rounded-full bg-[#1c2b23] dark:bg-white text-white dark:text-[#1c2b23] text-[14px] font-semibold hover:bg-[#344b3e] dark:hover:bg-[#e2ebe6] transition-all shadow-sm cursor-pointer">
              <span className="hidden sm:inline">Launch Web GIS</span>
              <span className="inline sm:hidden">Login</span>
            </button>
          </div>
        )}
      </div>
    </nav>
  );
}
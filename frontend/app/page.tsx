"use client";

import { useRef, useState, useEffect } from "react";
import { usePathname } from "next/navigation";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { useGSAP } from "@gsap/react";
import AuthForm from "@/components/AuthForm";

import Navbar from "@/components/sections/Navbar";
import Hero from "@/components/sections/Hero";
import About from "@/components/sections/About";
import Features from "@/components/sections/Features";
import Process from "@/components/sections/Process";
import Faq from "@/components/sections/Faq";
import Footer from "@/components/sections/Footer";

gsap.registerPlugin(ScrollTrigger);

export default function BhuMapLanding() {
  const container = useRef<HTMLElement>(null);
  const [showAuth, setShowAuth] = useState(false);
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [user, setUser] = useState<{ name: string; email: string; role: string } | null>(null);
  const pathname = usePathname();

  useEffect(() => {
    const savedUser = localStorage.getItem("bhumap_user");
    if (savedUser) {
      setUser(JSON.parse(savedUser));
      setIsLoggedIn(true);
    }
  }, []);

  useEffect(() => {
    const scrollToSection = (path: string) => {
      let targetId = "";
      if (path === "/platform") targetId = "about";
      else if (path === "/feature") targetId = "features";
      else if (path === "/platform/how-it-work") targetId = "process";
      else if (path === "/faq") targetId = "faq";

      if (targetId) {
        setTimeout(() => {
          const el = document.getElementById(targetId);
          if (el) el.scrollIntoView({ behavior: "smooth" });
        }, 100);
      } else if (path === "/") {
        window.scrollTo({ top: 0, behavior: "smooth" });
      }
    };

    scrollToSection(pathname);

    const handlePopState = () => {
      scrollToSection(window.location.pathname);
    };

    window.addEventListener("popstate", handlePopState);
    return () => window.removeEventListener("popstate", handlePopState);
  }, [pathname]);

  const handleWorkspaceAccess = () => {
    if (isLoggedIn) {
      window.location.href = "/workspace";
    } else {
      setShowAuth(true);
    }
  };

  const handleAuthSuccess = () => {
    const mockUser = { name: "Authorized Surveyor", email: "surveyor@bhumap.gov.in", role: "SURVEYOR" };
    setUser(mockUser);
    setIsLoggedIn(true);
    localStorage.setItem("bhumap_user", JSON.stringify(mockUser));
    setShowAuth(false);
    window.location.href = "/workspace";
  };

  const handleLogout = () => {
    setIsLoggedIn(false);
    setUser(null);
    localStorage.removeItem("bhumap_user");
  };

  useGSAP(() => {
    const prefersReducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (prefersReducedMotion) {
      gsap.set(".hero-text-elem, .hero-visual, .about-visuals, .about-text-elem, .feature-card, .process-step", { opacity: 1, y: 0, x: 0, scale: 1 });
      return;
    }

    gsap.fromTo(".nav-elem", { opacity: 0, y: -10 }, { opacity: 1, y: 0, duration: 0.6, stagger: 0.05, ease: "power2.out" });
    gsap.fromTo(".hero-text-elem", { y: 20, opacity: 0 }, { y: 0, opacity: 1, stagger: 0.1, duration: 0.8, ease: "power3.out", delay: 0.1 });
    gsap.fromTo(".hero-visual", { scale: 0.96, opacity: 0, y: 30 }, { scale: 1, opacity: 1, y: 0, duration: 1, ease: "power3.out", delay: 0.2 });
    gsap.fromTo(".about-visuals", { x: -30, opacity: 0 }, { x: 0, opacity: 1, duration: 0.8, ease: "power2.out", scrollTrigger: { trigger: "#about", start: "top 80%", toggleActions: "play reset play reset" } });
    gsap.fromTo(".about-text-elem", { x: 30, opacity: 0 }, { x: 0, opacity: 1, stagger: 0.1, duration: 0.8, ease: "power2.out", scrollTrigger: { trigger: "#about", start: "top 80%", toggleActions: "play reset play reset" } });
    gsap.fromTo(".feature-card", { y: 25, opacity: 0 }, { y: 0, opacity: 1, stagger: 0.08, duration: 0.6, ease: "power2.out", scrollTrigger: { trigger: "#features", start: "top 85%", toggleActions: "play reset play reset" } });

    const steps = gsap.utils.toArray('.process-step');
    steps.forEach((step: any) => {
      gsap.fromTo(step, { y: 30, opacity: 0 }, { y: 0, opacity: 1, duration: 0.8, ease: "power3.out", scrollTrigger: { trigger: step, start: "top 85%", toggleActions: "play reset play reset" } });
    });
  }, { scope: container });

  return (
    <main 
      ref={container}
      className="min-h-screen bg-[#f4f8f5] dark:bg-[#0c120e] text-[#1c2b23] dark:text-white/90 relative font-sans selection:bg-[#4a7258] selection:text-white pb-12 overflow-x-hidden transition-colors duration-300"
    >
      <div className="absolute inset-0 z-0 opacity-100 dark:opacity-[0.05] pointer-events-none transition-opacity duration-300" style={{ backgroundImage: "url('/images/topography.svg')", backgroundSize: "100% auto", backgroundPosition: "center top", backgroundRepeat: "repeat-y" }}></div>
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[1000px] h-[600px] bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-[#5b8c69]/15 dark:from-[#5b8c69]/10 via-transparent to-transparent pointer-events-none z-0"></div>

      {showAuth && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="relative w-full max-w-md">
            <AuthForm onSuccess={handleAuthSuccess} onClose={() => setShowAuth(false)} />
          </div>
        </div>
      )}

      <Navbar isLoggedIn={isLoggedIn} onWorkspaceAccess={handleWorkspaceAccess} onLogout={handleLogout} onOpenAuth={() => setShowAuth(true)} />
      
      <Hero onWorkspaceAccess={handleWorkspaceAccess} />
      <div id="about"><About /></div>
      <div id="features"><Features /></div>
      <div id="process"><Process /></div>
      <div id="faq"><Faq /></div>
      <Footer />
    </main>
  );
}
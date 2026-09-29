import React, { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { authApi } from "../api/authApi";

export default function Login() {
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (!email.trim() || !password.trim()) {
      setError("Please fill in both email and password.");
      return;
    }

    setIsLoading(true);
    try {
      const data = await authApi.login({ email, password });
      if (data.token) {
        localStorage.setItem("token", data.token);
        if (data.user) {
          localStorage.setItem("bhumap_user", JSON.stringify(data.user));
        }
        navigate("/workspace", { replace: true });
      } else {
        setError(data.message || "Failed to authenticate.");
      }
    } catch (err: unknown) {
      const msg =
        err instanceof Error ? err.message : "Invalid email or password.";
      setError(msg);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <main className="min-h-screen relative flex items-center justify-center px-4 py-12 bg-[#f4f8f5] dark:bg-[#0c120e] text-[#1c2b23] dark:text-white/90 font-['Plus_Jakarta_Sans',sans-serif] selection:bg-[#4a7258] selection:text-white overflow-hidden transition-colors duration-300">
      <div
        className="absolute inset-0 z-0 opacity-100 dark:opacity-[0.05] pointer-events-none transition-opacity duration-300"
        style={{
          backgroundImage: "url('/images/topography.svg')",
          backgroundSize: "100% auto",
          backgroundPosition: "center top",
          backgroundRepeat: "repeat-y",
        }}
      />
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[900px] h-[500px] bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-[#5b8c69]/20 dark:from-[#5b8c69]/15 via-transparent to-transparent pointer-events-none z-0" />

      <div className="relative z-10 w-full max-w-md">
        <div className="text-center mb-8">
          <Link
            to="/"
            className="inline-flex items-center gap-2.5 mb-3 group cursor-pointer"
          >
            <div className="w-10 h-10 rounded-xl bg-[#2d5a40] flex items-center justify-center shadow-md group-hover:scale-105 transition-transform">
              <svg
                width="20"
                height="20"
                viewBox="0 0 24 24"
                fill="none"
                stroke="white"
                strokeWidth="2.2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <circle cx="12" cy="12" r="10" />
                <path d="m4.93 4.93 4.24 4.24" />
                <path d="m14.83 9.17 4.24-4.24" />
                <path d="m14.83 14.83 4.24 4.24" />
                <path d="m9.17 14.83-4.24 4.24" />
                <circle cx="12" cy="12" r="4" />
              </svg>
            </div>
            <span className="font-extrabold text-2xl tracking-tight text-[#121e17] dark:text-white">
              <span className="text-[#2d5a40] dark:text-emerald-400">Bhu</span>
              Map
            </span>
          </Link>
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/80 dark:bg-zinc-800/80 border border-slate-200 dark:border-zinc-700/80 text-[11px] font-semibold text-slate-700 dark:text-zinc-300 shadow-xs">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
            SIH 2026 Problem Statement 26012
          </div>
        </div>

        <div className="bg-white/85 dark:bg-zinc-900/85 backdrop-blur-xl border border-slate-200/80 dark:border-zinc-800 rounded-3xl p-8 shadow-2xl">
          <div className="mb-6">
            <h2 className="text-2xl font-bold tracking-tight text-[#121e17] dark:text-white">
              Surveyor Sign In
            </h2>
            <p className="text-xs text-slate-500 dark:text-zinc-400 mt-1">
              Authenticate to unlock the cadastral GIS mapping workspace
            </p>
          </div>

          {error && (
            <div className="mb-5 p-3.5 rounded-2xl bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-900/50 flex items-start gap-3 text-xs text-red-700 dark:text-red-400">
              <svg
                className="w-4 h-4 shrink-0 mt-0.5 text-red-600 dark:text-red-400"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2.2"
              >
                <circle cx="12" cy="12" r="10" />
                <line x1="12" y1="8" x2="12" y2="12" />
                <line x1="12" y1="16" x2="12.01" y2="16" />
              </svg>
              <span>{error}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-zinc-300 mb-1.5">
                Official Email Address
              </label>
              <div className="relative">
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="surveyor@bhumap.gov.in"
                  required
                  className="w-full px-4 py-3 rounded-xl bg-slate-50 dark:bg-zinc-800/80 border border-slate-200 dark:border-zinc-700/80 text-sm text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-zinc-500 focus:outline-hidden focus:ring-2 focus:ring-[#2d5a40] transition-all"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-zinc-300 mb-1.5">
                Password
              </label>
              <div className="relative">
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  required
                  className="w-full px-4 py-3 rounded-xl bg-slate-50 dark:bg-zinc-800/80 border border-slate-200 dark:border-zinc-700/80 text-sm text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-zinc-500 focus:outline-hidden focus:ring-2 focus:ring-[#2d5a40] transition-all"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="w-full py-3.5 px-6 rounded-full bg-[#2d5a40] hover:bg-[#224330] active:scale-[0.98] text-white text-sm font-semibold shadow-md transition-all cursor-pointer flex items-center justify-center gap-2 mt-2 disabled:opacity-60 disabled:cursor-not-allowed"
            >
              {isLoading ? (
                <>
                  <svg
                    className="animate-spin -ml-1 mr-2 h-4 w-4 text-white"
                    fill="none"
                    viewBox="0 0 24 24"
                  >
                    <circle
                      className="opacity-25"
                      cx="12"
                      cy="12"
                      r="10"
                      stroke="currentColor"
                      strokeWidth="4"
                    ></circle>
                    <path
                      className="opacity-75"
                      fill="currentColor"
                      d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                    ></path>
                  </svg>
                  Authenticating...
                </>
              ) : (
                <>
                  <span>Sign In to Workspace</span>
                  <svg
                    width="16"
                    height="16"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2.5"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <line x1="5" y1="12" x2="19" y2="12"></line>
                    <polyline points="12 5 19 12 12 19"></polyline>
                  </svg>
                </>
              )}
            </button>
          </form>

          <div className="mt-6 pt-6 border-t border-slate-200/80 dark:border-zinc-800/80 flex flex-col items-center gap-3 text-xs text-slate-600 dark:text-zinc-400">
            <div>
              Don't have a surveyor account?{" "}
              <Link
                to="/signup"
                className="text-[#2d5a40] dark:text-emerald-400 font-semibold hover:underline cursor-pointer"
              >
                Create Account
              </Link>
            </div>
            <Link
              to="/"
              className="text-slate-500 hover:text-slate-700 dark:text-zinc-400 dark:hover:text-zinc-200 font-medium transition-colors cursor-pointer"
            >
              ← Return to Landing Page
            </Link>
          </div>
        </div>
      </div>
    </main>
  );
}

"use client";

import React from "react";
import { motion } from "framer-motion";
import { Toaster } from "react-hot-toast";
import PosterBuilder from "./PosterBuilder";
import ErrorBoundary from "../ErrorBoundary";

const PosterGenerator: React.FC = () => {
  return (
    <div className="relative min-h-screen w-full overflow-hidden bg-gradient-to-b from-slate-900 via-indigo-950 to-slate-900 text-slate-100 flex flex-col justify-between selection:bg-emerald-500 selection:text-white">
      {/* Ambient decorative background glow */}
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="absolute -top-32 -left-24 w-[28rem] h-[28rem] rounded-full bg-emerald-500/20 blur-[110px]" />
        <div className="absolute -top-20 right-0 w-[24rem] h-[24rem] rounded-full bg-sky-500/20 blur-[110px]" />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 w-[36rem] h-[36rem] rounded-full bg-indigo-500/10 blur-[140px]" />
      </div>

      <Toaster
        position="top-center"
        toastOptions={{
          duration: 4000,
          style: {
            background: "#0f172a",
            color: "#f8fafc",
            border: "1px solid #334155",
            fontSize: "14px",
            borderRadius: "14px",
            boxShadow: "0 10px 25px -5px rgba(0, 0, 0, 0.4)",
          },
        }}
      />

      {/* Hero Header */}
      <header className="pt-6 sm:pt-10 pb-4 text-center px-4 relative z-10">
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="max-w-4xl mx-auto space-y-3"
        >
          {/* Badge */}
          <div className="inline-flex items-center gap-2.5 px-4 py-1.5 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 text-xs sm:text-sm font-semibold tracking-wide backdrop-blur-md">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
            <span>10TH OCTOBER 2026 • OFFICIAL CELEBRATION</span>
          </div>

          {/* Title */}
          <h1 className="text-2xl sm:text-4xl md:text-5xl font-extrabold tracking-tight text-white drop-shadow-sm">
            World Mental Health Day <span className="text-transparent bg-clip-text bg-gradient-to-r from-sky-400 to-emerald-400">2026</span>
          </h1>

          {/* Subtitle */}
          <p className="text-sm sm:text-lg text-slate-300 max-w-2xl mx-auto font-medium">
            “Everyone deserves good mental health”
          </p>

          <p className="text-xs sm:text-sm text-slate-400">
            Create and personalize your official social media banner in seconds
          </p>

          {/* Trust signals */}
          <div className="flex flex-wrap items-center justify-center gap-2 pt-1">
            {["✨ Free & instant", "🖼️ 1754×1240 HD", "📲 Instagram · WhatsApp · LinkedIn"].map(
              (label) => (
                <span
                  key={label}
                  className="text-[11px] sm:text-xs font-medium text-slate-300 bg-white/5 border border-white/10 rounded-full px-3 py-1 backdrop-blur-md"
                >
                  {label}
                </span>
              )
            )}
          </div>
        </motion.div>
      </header>

      {/* Main Content Area */}
      <main className="flex-1 w-full relative z-10">
        <ErrorBoundary>
          <PosterBuilder />
        </ErrorBoundary>
      </main>

      {/* Modern Footer */}
      <footer className="mt-8 py-6 px-4 border-t border-slate-800/80 bg-slate-950/60 backdrop-blur-md relative z-10">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row justify-between items-center gap-4 text-xs text-slate-400 text-center sm:text-left">
          <div>
            <p className="font-semibold text-emerald-400">
              Hiranis Pharmaceuticals (Pvt) Ltd
            </p>
            <p className="font-semibold text-slate-300 mt-0.5">
              World Mental Health Day 2026 Official Banner Generator
            </p>
            <p className="text-slate-500 mt-0.5">
              Empowering global health communities worldwide
            </p>
          </div>
          <div>
            <p className="text-slate-400">
              Developed by{" "}
              <a
                href="https://softsols.pk"
                target="_blank"
                rel="noopener noreferrer"
                className="text-emerald-400 hover:text-emerald-300 font-semibold underline decoration-emerald-500/40 hover:decoration-emerald-300 transition-colors"
              >
                Softsols Pakistan
              </a>
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default PosterGenerator;

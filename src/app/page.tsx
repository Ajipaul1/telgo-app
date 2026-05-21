"use client";

import Image from "next/image";
import Link from "next/link";
import { motion } from "framer-motion";
import { 
  Download, 
  ShieldCheck, 
  MapPin, 
  Zap, 
  RefreshCw, 
  LogIn, 
  ArrowRight,
  Sparkles,
  Layers,
  Database
} from "lucide-react";
import { Logo } from "@/components/ui";

export default function LandingPage() {
  const features = [
    {
      icon: <MapPin className="h-6 w-6 text-telgo-cyan" />,
      title: "Geofenced Tracking",
      description: "Real-time Google Maps geofencing ensures accurate location-verified field presence and attendance marks."
    },
    {
      icon: <Database className="h-6 w-6 text-telgo-blue" />,
      title: "Supabase Backend",
      description: "All assignments, shifts, attendance sheets, and reports persist directly in production-grade tables."
    },
    {
      icon: <Layers className="h-6 w-6 text-telgo-violet" />,
      title: "Role-Based Hub",
      description: "Tailored enterprise dashboard views and permissions for Admins, Supervisors, Engineers, Finance, and Clients."
    },
    {
      icon: <ShieldCheck className="h-6 w-6 text-telgo-green" />,
      title: "Production Ready",
      description: "Secure, reliable, offline-capable database synchronization with zero-compromise live system flows."
    }
  ];

  return (
    <main className="min-h-screen relative overflow-hidden bg-industrial-radial text-white flex flex-col justify-between font-sans selection:bg-telgo-cyan/30 selection:text-white">
      {/* Background Grid Image overlay for modern texture */}
      <div className="absolute inset-0 bg-[linear-gradient(to_right,#0c2034_1px,transparent_1px),linear-gradient(to_bottom,#0c2034_1px,transparent_1px)] bg-[size:4rem_4rem] [mask-image:radial-gradient(ellipse_60%_50%_at_50%_0%,#000_70%,transparent_100%)] opacity-35" />

      {/* Decorative colored glow orbs */}
      <div className="absolute top-[-10%] left-[-10%] w-[500px] h-[500px] rounded-full bg-telgo-cyan/8 blur-[120px] pointer-events-none" />
      <div className="absolute bottom-[20%] right-[-10%] w-[600px] h-[600px] rounded-full bg-telgo-violet/5 blur-[150px] pointer-events-none" />

      {/* Header */}
      <header className="relative z-10 w-full max-w-7xl mx-auto px-6 py-6 flex items-center justify-between">
        <Logo />
        <Link 
          href="/login"
          className="flex items-center gap-2 px-4 py-2 rounded-xl border border-ink-800 bg-ink-950/65 text-slate-200 hover:text-white hover:bg-ink-900 transition-all duration-200"
        >
          <LogIn className="h-4 w-4 text-telgo-cyan" />
          <span className="text-sm font-medium">Web Portal</span>
        </Link>
      </header>

      {/* Main Content Area */}
      <div className="relative z-10 w-full max-w-7xl mx-auto px-6 py-8 md:py-16 grid grid-cols-1 lg:grid-cols-12 gap-12 lg:gap-16 items-center flex-grow">
        {/* Left Column: Introductions & Features */}
        <div className="lg:col-span-7 space-y-8 text-center lg:text-left">
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-telgo-cyan/20 bg-telgo-cyan/5 text-telgo-cyan text-sm font-semibold"
          >
            <Sparkles className="h-4 w-4 animate-pulse" />
            <span>Enterprise Field Operations System</span>
          </motion.div>

          <motion.h1
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.1 }}
            className="text-4xl sm:text-5xl lg:text-6xl font-extrabold tracking-tight leading-[1.1] text-transparent bg-clip-text bg-gradient-to-r from-white via-slate-100 to-slate-300"
          >
            Next-Gen Operations <br className="hidden sm:inline" />
            <span className="bg-gradient-to-r from-telgo-cyan via-telgo-blue to-telgo-violet bg-clip-text text-transparent">
              Control Center
            </span>
          </motion.h1>

          <motion.p
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.2 }}
            className="text-lg text-slate-400 max-w-2xl mx-auto lg:mx-0 font-light leading-relaxed"
          >
            TELGO bridges the gap between administrators, engineers, supervisors, and clients. 
            Track exact GPS corridor presence, review live attendance sheets, manage project deliverables, 
            and streamline operations with unified, high-integrity precision.
          </motion.p>

          {/* Feature highlights */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.3 }}
            className="grid grid-cols-1 sm:grid-cols-2 gap-6 pt-4 text-left"
          >
            {features.map((feat, idx) => (
              <div 
                key={idx} 
                className="flex items-start gap-4 p-4 rounded-2xl border border-ink-800/40 bg-ink-950/20 hover:border-ink-800 transition-all duration-200"
              >
                <div className="p-2 rounded-xl bg-ink-900/60 border border-ink-850">
                  {feat.icon}
                </div>
                <div className="space-y-1">
                  <h3 className="font-semibold text-slate-100">{feat.title}</h3>
                  <p className="text-sm text-slate-400 leading-normal">{feat.description}</p>
                </div>
              </div>
            ))}
          </motion.div>
        </div>

        {/* Right Column: Download Card */}
        <motion.div
          id="download-android"
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.5, delay: 0.2 }}
          className="lg:col-span-5 w-full max-w-[480px] mx-auto"
        >
          <div className="relative group p-[1px] rounded-[32px] bg-gradient-to-br from-telgo-cyan/30 via-telgo-violet/10 to-telgo-cyan/20 group-hover:from-telgo-cyan/50 transition-all duration-300 shadow-card">
            {/* Inner background box with glowing panel */}
            <div className="relative rounded-[31px] bg-panel-glow backdrop-blur-md p-8 sm:p-10 space-y-8 flex flex-col items-center">
              
              {/* Device Mock / Graphic */}
              <div className="relative w-40 h-40 flex items-center justify-center bg-gradient-to-b from-ink-900 to-ink-950 rounded-full border border-ink-800 shadow-glow">
                <div className="absolute inset-2 bg-gradient-to-tr from-telgo-violet/20 to-telgo-cyan/20 rounded-full blur-md opacity-70" />
                <Download className="h-16 w-16 text-telgo-cyan relative z-10 animate-bounce" />
              </div>

              <div className="text-center space-y-3">
                <h2 className="text-2xl font-bold tracking-tight text-white">Get the TELGO App</h2>
                <p className="text-sm text-slate-400 leading-normal max-w-xs mx-auto">
                  Install the official Android application to access field tools, exact GPS attendance, and map corridors.
                </p>
              </div>

              {/* Glowing CTA Button */}
              <a
                href="/downloads/telgo-hub.apk"
                className="w-full relative group/btn flex items-center justify-center gap-3 py-4 rounded-2xl bg-gradient-to-r from-telgo-cyan via-telgo-blue to-telgo-violet text-ink-950 font-bold text-base tracking-wide hover:brightness-110 active:scale-[0.98] transition-all duration-200 shadow-[0_4px_24px_rgba(5,217,255,0.4)]"
              >
                <Download className="h-5 w-5 stroke-[2.5]" />
                <span>Download Android APK</span>
              </a>

              {/* Sub-label */}
              <div className="w-full border-t border-ink-850 pt-6 flex flex-col items-center gap-3 text-xs text-slate-500">
                <div className="flex items-center gap-2">
                  <ShieldCheck className="h-4 w-4 text-telgo-cyan" />
                  <span>Version 1.0.0 (Safe & Verified Build)</span>
                </div>
                <div className="flex items-center gap-1.5 text-center text-[10px]">
                  <span>Supports: Android 8.0+ • Native Geolocation • offline Sync</span>
                </div>
              </div>

              {/* Link to web portal */}
              <div className="w-full flex justify-center border-t border-ink-850 pt-5">
                <Link 
                  href="/login" 
                  className="inline-flex min-h-[44px] items-center gap-1 text-sm text-telgo-cyan hover:text-white transition-all duration-150 font-medium group/portal"
                  style={{ minHeight: "48px" }}
                >
                  <span>Or enter via Web Portal</span>
                  <ArrowRight className="h-4 w-4 transition-transform group-hover/portal:translate-x-1" />
                </Link>
              </div>

            </div>
          </div>
        </motion.div>
      </div>

      {/* Footer */}
      <footer className="relative z-10 w-full max-w-7xl mx-auto px-6 py-8 border-t border-ink-850/40 text-center flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-slate-500">
        <p>© {new Date().getFullYear()} TELGO Power Projects. All corporate rights reserved.</p>
        <div className="flex items-center gap-6">
          <Link href="/login" className="hover:text-slate-400 transition-colors">Administrator Portal</Link>
          <a href="#" className="hover:text-slate-400 transition-colors">Client Support Desk</a>
        </div>
      </footer>
    </main>
  );
}

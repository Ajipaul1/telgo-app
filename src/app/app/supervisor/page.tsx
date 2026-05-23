"use client";
import { useEffect, useState } from "react";
import { useGeolocation } from "@/lib/use-geolocation";
import { ProfileModal, ProfileHeaderWidget, ProfileUser } from "@/components/profile-modal";

export default function SupervisorDashboard() {
  const [user, setUser] = useState<ProfileUser | null>(null);
  const { permission, requestPermission } = useGeolocation();

  useEffect(() => {
    fetch("/api/mobile/me").then(r=>r.json()).then(d=>{ if(d.ok) setUser(d.user); else window.location.href="/login"; });
  }, []);

  if (permission !== "granted") {
    return (
      <div style={{
        position: "fixed",
        inset: 0,
        background: "rgba(6, 9, 18, 0.95)",
        backdropFilter: "blur(12px)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: 24,
        zIndex: 9999,
        fontFamily: "Outfit, sans-serif"
      }}>
        <div className="glass" style={{
          width: "100%",
          maxWidth: 420,
          padding: "40px 32px",
          background: "linear-gradient(135deg, #0e0829 0%, #060912 100%)",
          borderRadius: 24,
          textAlign: "center",
          border: "1px solid rgba(6, 182, 212, 0.25)",
          boxShadow: "0 24px 64px rgba(0, 0, 0, 0.7)"
        }}>
          {/* Animated Glow Location Pin */}
          <div style={{
            width: 72,
            height: 72,
            borderRadius: "50%",
            background: "rgba(6, 182, 212, 0.12)",
            border: "1px solid rgba(6, 182, 212, 0.3)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            margin: "0 auto 24px",
            boxShadow: "0 0 30px rgba(6, 182, 212, 0.2)"
          }}>
            <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="#06b6d4" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z"/>
              <circle cx="12" cy="10" r="3"/>
            </svg>
          </div>

          <h3 style={{ fontSize: 22, fontWeight: 900, color: "#f1f5f9", marginBottom: 12, letterSpacing: "-0.02em" }}>
            Location Access Required
          </h3>
          
          <p style={{ fontSize: 14, color: "#94a3b8", marginBottom: 28, lineHeight: 1.6 }}>
            To comply with Telgo operational guidelines, supervisors must enable high-accuracy location services. This tracks live site coordinates for secure check-ins, reports, and attendance verification.
          </p>

          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            <button 
              onClick={requestPermission}
              style={{
                minHeight: 48,
                background: "linear-gradient(135deg, #06b6d4 0%, #7c3aed 100%)",
                border: "none",
                borderRadius: 14,
                color: "white",
                fontSize: 15,
                fontWeight: 700,
                cursor: "pointer",
                fontFamily: "Outfit, sans-serif",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                gap: 8,
                boxShadow: "0 8px 24px rgba(6, 182, 212, 0.3)"
              }}
            >
              <span>Enable Location Access</span>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <polygon points="3 11 22 2 13 21 11 13 3 11"/>
              </svg>
            </button>

            {permission === "denied" && (
              <div style={{
                background: "rgba(239, 68, 68, 0.08)",
                border: "1px solid rgba(239, 68, 68, 0.2)",
                borderRadius: 12,
                padding: "12px 14px",
                fontSize: 12,
                color: "#fca5a5",
                lineHeight: 1.5,
                textAlign: "left"
              }}>
                ⚠️ <strong>Access Denied:</strong> Please open your device's browser/app settings, allow location permissions for Telgo Hub, and refresh the page to unlock.
              </div>
            )}
            
            <button 
              onClick={async () => {
                await fetch("/api/mobile/sign-out", { method: "POST" });
                window.location.href = "/login";
              }}
              style={{
                minHeight: 44,
                background: "rgba(255,255,255,0.03)",
                border: "1px solid rgba(255,255,255,0.08)",
                borderRadius: 12,
                color: "#94a3b8",
                fontSize: 13,
                fontWeight: 600,
                cursor: "pointer",
                fontFamily: "Outfit, sans-serif",
                marginTop: 8
              }}
            >
              Cancel & Sign Out
            </button>
          </div>
        </div>
      </div>
    );
  }

  const [isSettingsOpen, setIsSettingsOpen] = useState(false);

  return (
    <div style={{ minHeight: "100dvh", background: "#060912", display: "flex", flexDirection: "column", color: "#f1f5f9", fontFamily: "Outfit, sans-serif" }}>
      {/* Immersive Header with Circular Avatar Profile Pic */}
      <ProfileHeaderWidget 
        user={user} 
        onOpenSettings={() => setIsSettingsOpen(true)} 
        dashboardTitle="Supervisor Console" 
      />

      <main style={{ flex: 1, padding: "24px 20px", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center" }}>
        <div className="glass fade-in" style={{ width: "100%", maxWidth: 420, padding: "40px 28px", textAlign: "center", borderRadius: 20, border: "1px solid rgba(255, 255, 255, 0.05)", background: "rgba(255, 255, 255, 0.01)" }}>
          <div style={{ width: 64, height: 64, borderRadius: "50%", background: "linear-gradient(135deg,#0e7490,#06b6d4)", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 20px", boxShadow: "0 8px 24px rgba(6, 182, 212, 0.25)" }}>
            <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>
          </div>
          
          <h2 style={{ fontSize: 22, fontWeight: 800, color: "#f1f5f9", marginBottom: 6 }}>Welcome, {user?.fullName}!</h2>
          <p style={{ fontSize: 13, color: "#64748b", marginBottom: 20 }}>{user?.email}</p>
          
          <span style={{ display: "inline-block", background: "rgba(6,182,212,0.15)", color: "#67e8f9", border: "1px solid rgba(6,182,212,0.25)", borderRadius: 8, padding: "4px 14px", fontSize: 12, fontWeight: 700, textTransform: "uppercase", marginBottom: 28 }}>
            Supervisor
          </span>
          
          <p style={{ fontSize: 14, color: "#94a3b8", lineHeight: 1.6, marginBottom: 32 }}>
            Your operations dashboard is currently active. Crew schedules, geological tracking tools, and mark-attendance sheets are loading.
          </p>

          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            <button 
              onClick={() => setIsSettingsOpen(true)}
              style={{
                width: "100%",
                minHeight: 46,
                background: "linear-gradient(135deg, #06b6d4 0%, #7c3aed 100%)",
                border: "none",
                borderRadius: 12,
                color: "white",
                fontSize: 14,
                fontWeight: 750,
                cursor: "pointer",
                fontFamily: "Outfit, sans-serif",
                boxShadow: "0 4px 15px rgba(6, 182, 212, 0.2)"
              }}
            >
              ⚙️ Manage Profile Settings
            </button>

            <button 
              onClick={async () => { 
                await fetch("/api/mobile/sign-out", { method: "POST" }); 
                window.location.href = "/login"; 
              }} 
              style={{ 
                width: "100%", 
                minHeight: 44, 
                background: "transparent", 
                border: "1px solid rgba(239,68,68,0.2)", 
                borderRadius: 12, 
                color: "#f87171", 
                fontSize: 14, 
                fontWeight: 600, 
                cursor: "pointer", 
                fontFamily: "Outfit,sans-serif" 
              }}
            >
              Sign Out
            </button>
          </div>
        </div>
      </main>

      {/* Account Settings Editor Modal */}
      <ProfileModal 
        isOpen={isSettingsOpen} 
        onClose={() => setIsSettingsOpen(false)} 
        user={user} 
        onUpdate={(updated) => setUser(updated)} 
      />
    </div>
  );
}

"use client";
import { useEffect, useState } from "react";
import { ProfileModal, ProfileHeaderWidget, ProfileUser } from "@/components/profile-modal";

export default function ClientDashboard() {
  const [user, setUser] = useState<ProfileUser | null>(null);
  useEffect(() => {
    fetch("/api/mobile/me").then(r=>r.json()).then(d=>{ if(d.ok) setUser(d.user); else window.location.href="/login"; });
  }, []);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);

  return (
    <div style={{ minHeight: "100dvh", background: "#060912", display: "flex", flexDirection: "column", color: "#f1f5f9", fontFamily: "Outfit, sans-serif" }}>
      {/* Immersive Header with Circular Avatar Profile Pic */}
      <ProfileHeaderWidget 
        user={user} 
        onOpenSettings={() => setIsSettingsOpen(true)} 
        dashboardTitle="Client Hub" 
      />

      <main style={{ flex: 1, padding: "24px 20px", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center" }}>
        <div className="glass fade-in" style={{ width: "100%", maxWidth: 420, padding: "40px 28px", textAlign: "center", borderRadius: 20, border: "1px solid rgba(255, 255, 255, 0.05)", background: "rgba(255, 255, 255, 0.01)" }}>
          <div style={{ width: 64, height: 64, borderRadius: "50%", background: "linear-gradient(135deg,#16a34a,#4ade80)", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 20px", boxShadow: "0 8px 24px rgba(74, 222, 128, 0.25)" }}>
            <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>
          </div>
          
          <h2 style={{ fontSize: 22, fontWeight: 800, color: "#f1f5f9", marginBottom: 6 }}>Welcome, {user?.fullName}!</h2>
          <p style={{ fontSize: 13, color: "#64748b", marginBottom: 20 }}>{user?.email}</p>
          
          <span style={{ display: "inline-block", background: "rgba(74,222,128,0.15)", color: "#86efac", border: "1px solid rgba(74,222,128,0.25)", borderRadius: 8, padding: "4px 14px", fontSize: 12, fontWeight: 700, textTransform: "uppercase", marginBottom: 28 }}>
            Client
          </span>
          
          <p style={{ fontSize: 14, color: "#94a3b8", lineHeight: 1.6, marginBottom: 32 }}>
            Your operational metrics and project progress tracking are active. Live status and telemetry updates are loading.
          </p>

          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            <button 
              onClick={() => setIsSettingsOpen(true)}
              style={{
                width: "100%",
                minHeight: 46,
                background: "linear-gradient(135deg, #10b981 0%, #06b6d4 100%)",
                border: "none",
                borderRadius: 12,
                color: "white",
                fontSize: 14,
                fontWeight: 750,
                cursor: "pointer",
                fontFamily: "Outfit, sans-serif",
                boxShadow: "0 4px 15px rgba(16, 185, 129, 0.2)"
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

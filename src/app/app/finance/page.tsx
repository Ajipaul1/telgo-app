"use client";
import { useEffect, useState } from "react";
import { useGeolocation } from "@/lib/use-geolocation";
import { ProfileModal, ProfileHeaderWidget, ProfileUser } from "@/components/profile-modal";

export default function FinanceDashboard() {
  const [user, setUser] = useState<ProfileUser | null>(null);
  const { permission, requestPermission } = useGeolocation();
  
  const [isShiftActive, setIsShiftActive] = useState(false);
  const [checkInTime, setCheckInTime] = useState("");
  const [checkingIn, setCheckingIn] = useState(false);
  const [toast, setToast] = useState("");

  function showToast(msg: string) {
    setToast(msg);
    setTimeout(() => setToast(""), 3500);
  }

  useEffect(() => {
    fetch("/api/mobile/me")
      .then((r) => r.json())
      .then((d) => {
        if (d.ok) setUser(d.user);
        else window.location.href = "/login";
      });
  }, []);

  // Load shift state from localStorage once user is loaded
  useEffect(() => {
    if (user) {
      const active = localStorage.getItem(`telgo_shift_active_${user.userId}`) === "true";
      const time = localStorage.getItem(`telgo_shift_time_${user.userId}`) ?? "";
      setIsShiftActive(active);
      setCheckInTime(time);
    }
  }, [user]);

  // Background tracking effect
  useEffect(() => {
    if (!isShiftActive || !user) return;

    let watchId: number;

    const updateBackgroundLocation = (pos: GeolocationPosition) => {
      fetch("/api/mobile/live-map", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          latitude: pos.coords.latitude,
          longitude: pos.coords.longitude,
          gpsAccuracyM: pos.coords.accuracy,
          projectId: "vadakkekotta-sn-cable"
        })
      }).catch(() => { /* silently ignore network failures in background */ });
    };

    if (navigator.geolocation) {
      // Start watchPosition for continuous background updates
      watchId = navigator.geolocation.watchPosition(
        updateBackgroundLocation,
        () => {},
        { enableHighAccuracy: true, timeout: 15000, maximumAge: 0 }
      );
    }

    return () => {
      if (watchId && navigator.geolocation) {
        navigator.geolocation.clearWatch(watchId);
      }
    };
  }, [isShiftActive, user]);

  async function handleToggleShift() {
    if (!user) return;
    
    if (isShiftActive) {
      if (!confirm("Are you sure you want to conclude your active shift and stop location telemetry?")) return;
      localStorage.removeItem(`telgo_shift_active_${user.userId}`);
      localStorage.removeItem(`telgo_shift_time_${user.userId}`);
      setIsShiftActive(false);
      setCheckInTime("");
      showToast("🔴 Shift concluded. Background telemetry stopped.");
    } else {
      setCheckingIn(true);
      showToast("⏳ Checking device GPS coordinates...");
      
      if (!navigator.geolocation) {
        showToast("❌ Geolocation is not supported by your device.");
        setCheckingIn(false);
        return;
      }

      navigator.geolocation.getCurrentPosition(
        async (position) => {
          try {
            const res = await fetch("/api/mobile/attendance", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                latitude: position.coords.latitude,
                longitude: position.coords.longitude,
                gpsAccuracyM: position.coords.accuracy,
                projectId: "vadakkekotta-sn-cable"
              })
            });
            const data = await res.json();
            if (res.ok && data.ok) {
              const now = new Date().toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" });
              localStorage.setItem(`telgo_shift_active_${user.userId}`, "true");
              localStorage.setItem(`telgo_shift_time_${user.userId}`, now);
              setIsShiftActive(true);
              setCheckInTime(now);
              showToast("🚀 Shift active! On-site duty marked successfully.");
            } else {
              showToast(`❌ ${data.message || "Attendance marking failed."}`);
            }
          } catch {
            showToast("❌ Network error. Please try again.");
          } finally {
            setCheckingIn(false);
          }
        },
        (error) => {
          showToast(`❌ GPS access error: ${error.message}`);
          setCheckingIn(false);
        },
        { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
      );
    }
  }

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
          border: "1px solid rgba(250, 204, 21, 0.25)",
          boxShadow: "0 24px 64px rgba(0, 0, 0, 0.7)"
        }}>
          <div style={{
            width: 72,
            height: 72,
            borderRadius: "50%",
            background: "rgba(250, 204, 21, 0.12)",
            border: "1px solid rgba(250, 204, 21, 0.3)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            margin: "0 auto 24px",
            boxShadow: "0 0 30px rgba(250, 204, 21, 0.2)"
          }}>
            <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="#facc15" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z"/>
              <circle cx="12" cy="10" r="3"/>
            </svg>
          </div>

          <h3 style={{ fontSize: 22, fontWeight: 900, color: "#f1f5f9", marginBottom: 12, letterSpacing: "-0.02em" }}>
            Location Access Required
          </h3>
          
          <p style={{ fontSize: 14, color: "#94a3b8", marginBottom: 28, lineHeight: 1.6 }}>
            To comply with Telgo operational guidelines, finance team members must enable high-accuracy location services. This tracks live site coordinates for secure expense claims, reports, and attendance verification.
          </p>

          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            <button 
              onClick={requestPermission}
              style={{
                minHeight: 48,
                background: "linear-gradient(135deg, #facc15 0%, #7c3aed 100%)",
                border: "none",
                borderRadius: 14,
                color: "black",
                fontSize: 15,
                fontWeight: 700,
                cursor: "pointer",
                fontFamily: "Outfit, sans-serif",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                gap: 8,
                boxShadow: "0 8px 24px rgba(250, 204, 21, 0.3)"
              }}
            >
              <span style={{ color: "#060912" }}>Enable Location Access</span>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#060912" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
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
        dashboardTitle="Finance Control" 
      />

      <main style={{ flex: 1, padding: "24px 20px", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center" }}>
        <div className="glass fade-in" style={{ width: "100%", maxWidth: 420, padding: "32px 24px", textAlign: "center", borderRadius: 24, border: "1px solid rgba(255, 255, 255, 0.05)", background: "rgba(255, 255, 255, 0.01)" }}>
          
          {/* Avatar Profile Display */}
          <div style={{ display: "flex", flexDirection: "column", alignItems: "center", marginBottom: 20 }}>
            <div style={{
              width: 56,
              height: 56,
              borderRadius: "50%",
              background: "linear-gradient(135deg,#ca8a04,#facc15)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              color: "black",
              fontSize: 22,
              fontWeight: 800,
              boxShadow: "0 8px 24px rgba(250,204,21,0.15)",
              border: "1.5px solid rgba(255,255,255,0.1)",
              textTransform: "uppercase"
            }}>
              {(user?.fullName || "U").charAt(0)}
            </div>
            <h2 style={{ fontSize: 18, fontWeight: 800, color: "#f1f5f9", margin: "10px 0 2px" }}>{user?.fullName}</h2>
            <p style={{ fontSize: 11, color: "#64748b", margin: 0 }}>{user?.email}</p>
          </div>

          {/* Active Duty Status Section */}
          <div className="glass" style={{ padding: 20, borderRadius: 18, border: "1px solid rgba(255,255,255,0.06)", background: "rgba(0,0,0,0.2)", marginBottom: 24, textAlign: "left" }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 12 }}>
              <span style={{ fontSize: 10, fontWeight: 800, color: "#64748b", textTransform: "uppercase", letterSpacing: "0.08em" }}>Duty Status</span>
              {isShiftActive ? (
                <span style={{ display: "inline-flex", alignItems: "center", gap: 6, background: "rgba(250,204,21,0.15)", color: "#fcd34d", border: "1px solid rgba(250,204,21,0.25)", borderRadius: 8, padding: "4px 10px", fontSize: 11, fontWeight: 800, textTransform: "uppercase" }}>
                  <span className="dot-pulse" style={{ background: "#eab308", width: 6, height: 6 }} /> Active Deployment
                </span>
              ) : (
                <span style={{ display: "inline-flex", alignItems: "center", gap: 6, background: "rgba(255,255,255,0.04)", color: "#94a3b8", border: "1px solid rgba(255,255,255,0.08)", borderRadius: 8, padding: "4px 10px", fontSize: 11, fontWeight: 800, textTransform: "uppercase" }}>
                  ⚫ Off Duty / Standby
                </span>
              )}
            </div>

            {isShiftActive ? (
              <div>
                <p style={{ fontSize: 13, color: "#cbd5e1", lineHeight: 1.5, margin: 0 }}>
                  You are currently checked-in at <strong style={{ color: "#fcd34d" }}>{checkInTime}</strong> for on-site financial auditing.
                </p>
                <div style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 14, background: "rgba(250,204,21,0.05)", border: "1px solid rgba(250,204,21,0.15)", borderRadius: 10, padding: "10px 12px" }}>
                  <div className="dot-pulse" style={{ background: "#facc15" }} />
                  <span style={{ fontSize: 11, color: "#facc15", fontWeight: 700 }}>Background Telemetry Loop Active</span>
                </div>
              </div>
            ) : (
              <div>
                <p style={{ fontSize: 13, color: "#94a3b8", lineHeight: 1.5, margin: 0 }}>
                  Initiate your active shift to enable high-accuracy background location telemetry and register your on-site attendance check-in.
                </p>
              </div>
            )}
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            <button 
              onClick={handleToggleShift}
              disabled={checkingIn}
              style={{
                width: "100%",
                minHeight: 48,
                background: isShiftActive ? "rgba(239,68,68,0.1)" : "linear-gradient(135deg, #facc15 0%, #7c3aed 100%)",
                border: isShiftActive ? "1px solid rgba(239,68,68,0.2)" : "none",
                borderRadius: 14,
                color: isShiftActive ? "#f87171" : "#060912",
                fontSize: 14,
                fontWeight: 750,
                cursor: checkingIn ? "not-allowed" : "pointer",
                fontFamily: "Outfit, sans-serif",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                gap: 8,
                boxShadow: isShiftActive ? "none" : "0 4px 15px rgba(250, 204, 21, 0.2)",
                transition: "all 0.2s ease"
              }}
            >
              {checkingIn ? (
                <>
                  <div className="spinner" style={{ width: 16, height: 16 }} />
                  Verifying GPS Coordinates...
                </>
              ) : isShiftActive ? (
                <>🔴 Conclude Active Shift</>
              ) : (
                <>🚀 Initiate Active Shift</>
              )}
            </button>

            <button 
              onClick={() => setIsSettingsOpen(true)}
              style={{
                width: "100%",
                minHeight: 44,
                background: "rgba(255,255,255,0.03)",
                border: "1px solid rgba(255,255,255,0.08)",
                borderRadius: 12,
                color: "#cbd5e1",
                fontSize: 13,
                fontWeight: 700,
                cursor: "pointer",
                fontFamily: "Outfit, sans-serif"
              }}
            >
              ⚙️ Manage Profile Settings
            </button>
          </div>
        </div>
      </main>

      {/* Account Settings Editor Modal */}
      <ProfileModal 
        isOpen={isSettingsOpen} 
        onClose={() => setIsSettingsOpen(false)} 
        user={user as any} 
        onUpdate={(updated: any) => setUser(updated)} 
      />

      {/* Toast Notification */}
      {toast && (
        <div style={{ position: "fixed", bottom: 24, left: 16, right: 16, background: "#1e293b", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 14, padding: "14px 18px", fontSize: 13, fontWeight: 600, color: "#f1f5f9", zIndex: 10000, textAlign: "center", boxShadow: "0 8px 32px rgba(0,0,0,0.5)", animation: "fadeIn 0.3s ease" }}>
          {toast}
        </div>
      )}
    </div>
  );
}

"use client";
import { useEffect, useState } from "react";
import { ProfileModal, ProfileHeaderWidget, ProfileUser } from "@/components/profile-modal";

export default function FinanceDashboard() {
  const [user, setUser] = useState<ProfileUser | null>(null);
  const [isShiftActive, setIsShiftActive] = useState(false);
  const [checkInTime, setCheckInTime] = useState("");
  const [checkingIn, setCheckingIn] = useState(false);
  const [toast, setToast] = useState("");
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isAttendanceOpen, setIsAttendanceOpen] = useState(false);
  const [isTrackingActiveThisSession, setIsTrackingActiveThisSession] = useState(false);

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
    if (!isShiftActive || !user || !isTrackingActiveThisSession) return;

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
  }, [isShiftActive, user, isTrackingActiveThisSession]);

  async function performAttendanceMarking(isReRegister: boolean) {
    if (!user) return;
    setCheckingIn(true);
    
    if (!navigator.geolocation) {
      showToast("❌ Geolocation is not supported by your device.");
      setCheckingIn(false);
      return;
    }

    const handleSuccess = async (position: GeolocationPosition) => {
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
          setIsTrackingActiveThisSession(true);
          showToast(isReRegister ? "🔄 Location coordinates updated & re-registered!" : "🚀 Shift Active! Daily attendance registered.");
          setIsAttendanceOpen(false);
        } else {
          showToast(`❌ ${data.message || "Attendance marking failed."}`);
        }
      } catch {
        showToast("❌ Network error. Please try again.");
      } finally {
        setCheckingIn(false);
      }
    };

    const handleError = (error: GeolocationPositionError) => {
      if (error.code === error.TIMEOUT) {
        showToast("⚠️ Precise GPS timed out. Retrying in network mode...");
        navigator.geolocation.getCurrentPosition(
          handleSuccess,
          (err2) => {
            showToast(`❌ GPS access error: ${err2.message}`);
            setCheckingIn(false);
          },
          { enableHighAccuracy: false, timeout: 20000, maximumAge: 30000 }
        );
      } else {
        showToast(`❌ GPS access error: ${error.message}`);
        setCheckingIn(false);
      }
    };

    navigator.geolocation.getCurrentPosition(handleSuccess, handleError, {
      enableHighAccuracy: true,
      timeout: 15000,
      maximumAge: 10000
    });
  }

  async function handleToggleShift() {
    if (!user) return;
    
    if (isShiftActive) {
      if (!confirm("Are you sure you want to conclude your active shift and stop location telemetry?")) return;
      setCheckingIn(true);
      
      const proceedCheckout = async (position: GeolocationPosition | null) => {
        try {
          await fetch("/api/mobile/attendance", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              latitude: position ? position.coords.latitude : 9.9538,
              longitude: position ? position.coords.longitude : 76.3428,
              gpsAccuracyM: position ? position.coords.accuracy : null,
              projectId: "vadakkekotta-sn-cable",
              status: "checked_out"
            })
          });
        } catch { /* ignore */ }
        
        localStorage.removeItem(`telgo_shift_active_${user.userId}`);
        localStorage.removeItem(`telgo_shift_time_${user.userId}`);
        setIsShiftActive(false);
        setCheckInTime("");
        setCheckingIn(false);
        showToast("🔴 Shift concluded. Background telemetry stopped.");
      };

      if (navigator.geolocation) {
        navigator.geolocation.getCurrentPosition(
          (pos) => proceedCheckout(pos),
          () => proceedCheckout(null),
          { enableHighAccuracy: false, timeout: 5000, maximumAge: 30000 }
        );
      } else {
        proceedCheckout(null);
      }
    } else {
      performAttendanceMarking(false);
    }
  }

  async function handleReRegisterAttendance() {
    performAttendanceMarking(true);
  }

  return (
    <div style={{ minHeight: "100dvh", background: "#060912", display: "flex", flexDirection: "column", color: "#f1f5f9", fontFamily: "Outfit, sans-serif" }}>
      {/* Immersive Header */}
      <ProfileHeaderWidget 
        user={user} 
        onOpenSettings={() => setIsSettingsOpen(true)} 
        dashboardTitle="Finance Control" 
      />

      <main style={{ flex: 1, padding: "24px 20px", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center" }}>
        
        {/* Core Field Operations Console */}
        <div style={{ width: "100%", maxWidth: 420, textAlign: "center" }}>
          
          {/* Circular Initials Avatar */}
          <div style={{ display: "flex", flexDirection: "column", alignItems: "center", marginBottom: 24 }}>
            <div style={{
              width: 64,
              height: 64,
              borderRadius: "50%",
              background: "linear-gradient(135deg, #ca8a04, #facc15)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              color: "black",
              fontSize: 26,
              fontWeight: 800,
              boxShadow: "0 10px 28px rgba(250,204,21,0.2)",
              border: "2px solid rgba(255,255,255,0.1)",
              textTransform: "uppercase"
            }}>
              {(user?.fullName || "U").charAt(0)}
            </div>
            <h2 style={{ fontSize: 20, fontWeight: 800, color: "#f1f5f9", margin: "12px 0 2px" }}>{user?.fullName}</h2>
            <p style={{ fontSize: 12, color: "#64748b", margin: 0, fontFamily: "monospace" }}>{user?.loginId}</p>
          </div>

          {/* GRID OF MODULES */}
          <div style={{ display: "grid", gridTemplateColumns: "1fr", gap: 16, marginBottom: 28 }}>
            
            {/* ATTENDANCE SHIFT MODULE CARD */}
            <div 
              onClick={() => setIsAttendanceOpen(true)}
              style={{
                background: "rgba(255,255,255,0.01)",
                border: isShiftActive ? "1px solid rgba(250, 204, 21, 0.25)" : "1px solid rgba(255,255,255,0.06)",
                borderRadius: 20,
                padding: "24px 20px",
                cursor: "pointer",
                textAlign: "left",
                transition: "all 0.25s ease",
                boxShadow: isShiftActive ? "0 10px 30px rgba(250, 204, 21, 0.05)" : "none",
                display: "flex",
                alignItems: "center",
                gap: 16
              }}
              className="glass"
            >
              <div style={{
                width: 48,
                height: 48,
                borderRadius: 14,
                background: isShiftActive ? "rgba(250, 204, 21, 0.12)" : "rgba(6, 182, 212, 0.08)",
                border: isShiftActive ? "1px solid rgba(250, 204, 21, 0.3)" : "1px solid rgba(6, 182, 212, 0.2)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                flexShrink: 0
              }}>
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke={isShiftActive ? "#facc15" : "#06b6d4"} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
                  <circle cx="12" cy="10" r="3"/>
                </svg>
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <h3 style={{ fontSize: 15, fontWeight: 800, margin: "0 0 3px", color: "#f1f5f9" }}>Duty Attendance</h3>
                <p style={{ fontSize: 12, color: "#64748b", margin: 0, textOverflow: "ellipsis", overflow: "hidden", whiteSpace: "nowrap" }}>
                  {isShiftActive ? `Completed ✓ (${checkInTime})` : "Pending — click to sign in"}
                </p>
              </div>
              <div style={{ flexShrink: 0 }}>
                {isShiftActive ? (
                  <span style={{ fontSize: 11, fontWeight: 800, color: "#facc15", background: "rgba(250,204,21,0.15)", borderRadius: 8, padding: "4px 8px" }}>ACTIVE</span>
                ) : (
                  <span style={{ fontSize: 11, fontWeight: 800, color: "#64748b", background: "rgba(255,255,255,0.03)", borderRadius: 8, padding: "4px 8px" }}>PENDING</span>
                )}
              </div>
            </div>

            {/* RE-REGISTER ATTENDANCE MODULE CARD */}
            <div 
              onClick={handleReRegisterAttendance}
              style={{
                background: "rgba(255,255,255,0.01)",
                border: "1px solid rgba(255,255,255,0.06)",
                borderRadius: 20,
                padding: "24px 20px",
                cursor: checkingIn ? "not-allowed" : "pointer",
                textAlign: "left",
                transition: "all 0.25s ease",
                display: "flex",
                alignItems: "center",
                gap: 16
              }}
              className="glass"
            >
              <div style={{
                width: 48,
                height: 48,
                borderRadius: 14,
                background: "rgba(250, 204, 21, 0.08)",
                border: "1px solid rgba(250, 204, 21, 0.2)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                flexShrink: 0
              }}>
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#facc15" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M21.5 2v6h-6M21.34 15.57a10 10 0 1 1-.57-8.38l5.67-5.67"/>
                </svg>
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <h3 style={{ fontSize: 15, fontWeight: 800, margin: "0 0 3px", color: "#f1f5f9" }}>Re-Register Attendance</h3>
                <p style={{ fontSize: 12, color: "#64748b", margin: 0, textOverflow: "ellipsis", overflow: "hidden", whiteSpace: "nowrap" }}>
                  {checkingIn ? "Registering updated coordinates..." : "Update GPS & log shift reattendance"}
                </p>
              </div>
              <div style={{ flexShrink: 0 }}>
                {checkingIn ? (
                  <div className="spinner" style={{ width: 16, height: 16, border: "2px solid rgba(255,255,255,0.1)", borderTop: "2px solid #facc15" }} />
                ) : (
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#64748b" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12h14"/><path d="m12 5 7 7-7 7"/></svg>
                )}
              </div>
            </div>

            {/* PROJECT ASSIGNMENT DETAILS CARD */}
            <div 
              style={{
                background: "rgba(255,255,255,0.01)",
                border: "1px solid rgba(255,255,255,0.06)",
                borderRadius: 20,
                padding: "20px 20px",
                textAlign: "left",
                display: "flex",
                alignItems: "center",
                gap: 16
              }}
              className="glass"
            >
              <div style={{
                width: 48,
                height: 48,
                borderRadius: 14,
                background: "rgba(6, 182, 212, 0.08)",
                border: "1px solid rgba(6, 182, 212, 0.2)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                flexShrink: 0
              }}>
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#06b6d4" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"/>
                </svg>
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <h3 style={{ fontSize: 14, fontWeight: 800, margin: "0 0 3px", color: "#f1f5f9" }}>Assigned Corridor</h3>
                <p style={{ fontSize: 12, color: "#94a3b8", margin: 0, textOverflow: "ellipsis", overflow: "hidden", whiteSpace: "nowrap" }}>Vadakkekotta Sn-Cable Corridor</p>
              </div>
            </div>

          </div>

          {/* Quick Settings Action */}
          <button 
            onClick={() => setIsSettingsOpen(true)}
            style={{
              width: "100%",
              minHeight: 46,
              background: "rgba(255,255,255,0.02)",
              border: "1px solid rgba(255,255,255,0.06)",
              borderRadius: 14,
              color: "#94a3b8",
              fontSize: 13,
              fontWeight: 750,
              cursor: "pointer",
              fontFamily: "Outfit, sans-serif"
            }}
          >
            ⚙️ Edit Profile Credentials
          </button>

          {/* Secure Sign Out Button */}
          <button 
            onClick={async () => {
              if (confirm("Are you sure you want to sign out securely from Telgo Hub?")) {
                await fetch("/api/mobile/sign-out", { method: "POST" });
                localStorage.removeItem("telgo_saved_email");
                localStorage.removeItem("telgo_saved_password");
                window.location.href = "/login";
              }
            }}
            style={{
              width: "100%",
              minHeight: 46,
              background: "rgba(239, 68, 68, 0.06)",
              border: "1px solid rgba(239, 68, 68, 0.2)",
              borderRadius: 14,
              color: "#f87171",
              fontSize: 13,
              fontWeight: 750,
              cursor: "pointer",
              fontFamily: "Outfit, sans-serif",
              marginTop: 12
            }}
          >
            🚪 Secure Sign Out
          </button>
        </div>

      </main>

      {/* SECURE ATTENDANCE REGISTRY OVERLAY MODAL */}
      {isAttendanceOpen && (
        <div style={{
          position: "fixed",
          inset: 0,
          background: "rgba(6, 9, 18, 0.85)",
          backdropFilter: "blur(12px)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          padding: 20,
          zIndex: 999,
          fontFamily: "Outfit, sans-serif"
        }}>
          <div className="glass fade-in" style={{
            width: "100%",
            maxWidth: 400,
            background: "linear-gradient(135deg, #0e0828 0%, #060912 100%)",
            border: "1px solid rgba(255,255,255,0.08)",
            borderRadius: 24,
            padding: 30,
            textAlign: "center",
            boxShadow: "0 24px 64px rgba(0,0,0,0.7)"
          }}>
            {/* Header */}
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 20 }}>
              <span style={{ fontSize: 10, fontWeight: 800, color: "#64748b", textTransform: "uppercase", letterSpacing: "0.08em" }}>Duty Registry</span>
              <button 
                onClick={() => setIsAttendanceOpen(false)}
                style={{
                  background: "rgba(255,255,255,0.04)",
                  border: "1px solid rgba(255,255,255,0.08)",
                  width: 28,
                  height: 28,
                  borderRadius: "50%",
                  color: "#94a3b8",
                  cursor: "pointer",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center"
                }}
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
              </button>
            </div>

            {/* Glowing Map Pin Icon */}
            <div style={{
              width: 56,
              height: 56,
              borderRadius: "50%",
              background: isShiftActive ? "rgba(250,204,21,0.1)" : "rgba(6,182,212,0.1)",
              border: isShiftActive ? "1.5px solid rgba(250,204,21,0.35)" : "1.5px solid rgba(6,182,212,0.35)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              margin: "0 auto 16px",
              boxShadow: isShiftActive ? "0 0 20px rgba(250,204,21,0.2)" : "0 0 20px rgba(6,182,212,0.2)"
            }}>
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke={isShiftActive ? "#facc15" : "#06b6d4"} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
                <circle cx="12" cy="10" r="3"/>
              </svg>
            </div>

            <h3 style={{ fontSize: 18, fontWeight: 900, color: "#f1f5f9", margin: "0 0 8px" }}>On-Site Duty Shift</h3>
            
            {isShiftActive ? (
              <div style={{ marginBottom: 24 }}>
                <p style={{ fontSize: 13, color: "#cbd5e1", lineHeight: 1.5, margin: "0 0 16px" }}>
                  Your daily attendance was successfully marked at <strong style={{ color: "#facc15" }}>{checkInTime}</strong>. Silent background telemetry is running to verify operations coverage.
                </p>
                <div style={{ background: "rgba(250,204,21,0.06)", border: "1px solid rgba(250,204,21,0.15)", borderRadius: 12, padding: "10px 12px", display: "inline-flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
                  <div className="dot-pulse" style={{ background: "#facc15" }} />
                  <span style={{ fontSize: 11, color: "#facc15", fontWeight: 750 }}>Shift Active — completed ✓</span>
                </div>
              </div>
            ) : (
              <div style={{ marginBottom: 24 }}>
                <p style={{ fontSize: 13, color: "#94a3b8", lineHeight: 1.5, margin: 0 }}>
                  Click below to sign in and mark your daily attendance. The system will securely verify your device coordinates and synchronize background logs.
                </p>
              </div>
            )}

            {/* Re-Register Attendance Coordinate Refresh Button */}
            {isShiftActive && (
              <button
                onClick={handleReRegisterAttendance}
                disabled={checkingIn}
                style={{
                  width: "100%",
                  minHeight: 46,
                  background: "linear-gradient(135deg, #facc15 0%, #7c3aed 100%)",
                  border: "none",
                  borderRadius: 12,
                  color: "#060912",
                  fontSize: 14,
                  fontWeight: 800,
                  cursor: checkingIn ? "not-allowed" : "pointer",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: 8,
                  boxShadow: "0 4px 15px rgba(250, 204, 21, 0.25)",
                  marginBottom: 10
                }}
              >
                {checkingIn ? (
                  <>
                    <div className="spinner" style={{ width: 14, height: 14 }} />
                    Updating location...
                  </>
                ) : (
                  <>🔄 Refresh Coordinates / Re-Register</>
                )}
              </button>
            )}

            {/* Check-In / Check-Out Action Button */}
            <button
              onClick={handleToggleShift}
              disabled={checkingIn}
              style={{
                width: "100%",
                minHeight: 46,
                background: isShiftActive ? "rgba(239,68,68,0.08)" : "linear-gradient(135deg, #facc15 0%, #7c3aed 100%)",
                border: isShiftActive ? "1px solid rgba(239,68,68,0.2)" : "none",
                borderRadius: 12,
                color: isShiftActive ? "#f87171" : "#060912",
                fontSize: 14,
                fontWeight: 800,
                cursor: checkingIn ? "not-allowed" : "pointer",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                gap: 8,
                boxShadow: isShiftActive ? "none" : "0 4px 15px rgba(250, 204, 21, 0.25)"
              }}
            >
              {checkingIn ? (
                <>
                  <div className="spinner" style={{ width: 14, height: 14 }} />
                  Fetching Coordinates...
                </>
              ) : isShiftActive ? (
                <>🔴 Sign Out / Conclude Shift</>
              ) : (
                <>🚀 Sign In & Mark Completed</>
              )}
            </button>

            <button 
              onClick={() => setIsAttendanceOpen(false)}
              style={{
                width: "100%",
                minHeight: 40,
                background: "transparent",
                border: "none",
                color: "#64748b",
                fontSize: 13,
                fontWeight: 700,
                cursor: "pointer",
                marginTop: 12
              }}
            >
              Dismiss
            </button>
          </div>
        </div>
      )}

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

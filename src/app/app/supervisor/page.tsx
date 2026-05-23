"use client";
import { useEffect, useState } from "react";
import { ProfileModal, ProfileHeaderWidget, ProfileUser } from "@/components/profile-modal";

export default function SupervisorDashboard() {
  const [user, setUser] = useState<ProfileUser | null>(null);
  const [isShiftActive, setIsShiftActive] = useState(false);
  const [checkInTime, setCheckInTime] = useState("");
  const [checkingIn, setCheckingIn] = useState(false);
  const [toast, setToast] = useState("");
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isAttendanceOpen, setIsAttendanceOpen] = useState(false);
  const [isTrackingActiveThisSession, setIsTrackingActiveThisSession] = useState(false);
  const [isProjectsOpen, setIsProjectsOpen] = useState(false);
  const [projectsList, setProjectsList] = useState<any[]>([]);
  const [selectedProjectItem, setSelectedProjectItem] = useState<any | null>(null);

  const DEFAULT_PROJECTS = [
    {
      id: "PRV-EDP-001",
      name: "Palarivattom–Edappally Highway Utility Shift",
      code: "PRV-EDP-001",
      district: "Ernakulam",
      distance: "2.3 km",
      description: "A standard highway corridor project involving HDD drilling and cable laying along the busy NH 66 bypass stretch.",
      startLabel: "Palarivattom Bypass Junction",
      startCoords: [10.0055, 76.3082],
      endLabel: "Edappally Toll Junction",
      endCoords: [10.0261, 76.3084]
    },
    {
      id: "INF-SMC-002",
      name: "IT Expressway OFC Expansion",
      code: "INF-SMC-002",
      district: "Ernakulam",
      distance: "1.8 km",
      description: "An optical fiber cable (OFC) expansion project connecting major tech parks, primarily utilizing open trenching and straight-through joining.",
      startLabel: "Kakkanad Infopark Phase 1",
      startCoords: [10.0094, 76.3594],
      endLabel: "SmartCity Kochi",
      endCoords: [10.0135, 76.3725]
    },
    {
      id: "CHT-ALP-003",
      name: "Coastal Bypass Power Grid Routing",
      code: "CHT-ALP-003",
      district: "Alappuzha",
      distance: "18.5 km",
      description: "A longer stretch involving heavy RMU transformer foundation work and underground power cable mounding along the coastal route.",
      startLabel: "Cherthala X-Ray Junction",
      startCoords: [9.6845, 76.3355],
      endLabel: "Alappuzha Bypass Starting Point",
      endCoords: [9.5312, 76.3268]
    },
    {
      id: "MNR-DVK-004",
      name: "High-Range Telecom Link",
      code: "MNR-DVK-004",
      district: "Idukki",
      distance: "5.5 km",
      description: "A challenging terrain project requiring specialized HDD drilling through rocky elevations.",
      startLabel: "Munnar Town Center",
      startCoords: [10.0889, 77.0595],
      endLabel: "Devikulam Town",
      endCoords: [10.0617, 77.0863]
    },
    {
      id: "TCR-KUT-005",
      name: "Urban Ring Road Gas Pipeline (GAIL)",
      code: "TCR-KUT-005",
      district: "Thrissur",
      distance: "4.2 km",
      description: "A city-center trenching project requiring heavy coordination with local traffic police and municipal authorities.",
      startLabel: "Sakthan Thampuran Bus Stand",
      startCoords: [10.5167, 76.2167],
      endLabel: "Kuttanellur Junction",
      endCoords: [10.4900, 76.2415]
    }
  ];

  // Sync projects list with localStorage to show Admin updates instantly in read-only format
  useEffect(() => {
    const saved = localStorage.getItem("telgo_custom_projects");
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        setProjectsList(parsed);
        if (parsed.length > 0) setSelectedProjectItem(parsed[0]);
      } catch {
        setProjectsList(DEFAULT_PROJECTS);
        setSelectedProjectItem(DEFAULT_PROJECTS[0]);
      }
    } else {
      setProjectsList(DEFAULT_PROJECTS);
      setSelectedProjectItem(DEFAULT_PROJECTS[0]);
    }
  }, [isProjectsOpen]);

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
    <div style={{ minHeight: "100dvh", display: "flex", flexDirection: "column", background: "#060912", color: "#e2e8f0" }}>
      <style>{`
        .menu-grid {
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          gap: 12px;
          margin-bottom: 24px;
        }
        .module-card {
          transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
          cursor: pointer;
        }
        .module-card:hover {
          transform: translateY(-4px) scale(1.02);
          border-color: rgba(6, 182, 212, 0.3) !important;
          background: rgba(255, 255, 255, 0.04) !important;
        }
      `}</style>
      {/* Immersive Header */}
      <ProfileHeaderWidget 
        user={user} 
        onOpenSettings={() => setIsSettingsOpen(true)} 
        dashboardTitle="Supervisor Console" 
      />

      <main style={{ flex: 1, padding: "24px 20px", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: isProjectsOpen ? "flex-start" : "center" }}>
        
        {isProjectsOpen ? (
          /* READ-ONLY PROJECTS DIRECTORY SUB-VIEW */
          <div className="fade-in" style={{ width: "100%", maxWidth: 420 }}>
            {/* Header back row */}
            <div style={{ display: "flex", alignItems: "center", gap: 14, marginBottom: 20 }}>
              <button 
                onClick={() => { setIsProjectsOpen(false); setSelectedProjectItem(null); }}
                style={{ width: 38, height: 38, borderRadius: 10, border: "1px solid rgba(255,255,255,0.08)", background: "rgba(255,255,255,0.03)", display: "flex", alignItems: "center", justifyContent: "center", color: "#f1f5f9", cursor: "pointer" }}
              >
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="19" y1="12" x2="5" y2="12"/><polyline points="12 19 5 12 12 5"/></svg>
              </button>
              <div>
                <p style={{ fontSize: 9, fontWeight: 800, color: "#06b6d4", letterSpacing: "0.1em", textTransform: "uppercase", margin: 0 }}>Telgo Power Corridors</p>
                <h1 style={{ fontSize: 18, fontWeight: 800, color: "#f1f5f9", margin: "2px 0 0", letterSpacing: "-0.5px" }}>Projects Directory</h1>
              </div>
            </div>

            {/* Project List */}
            <div style={{ display: "grid", gridTemplateColumns: "1fr", gap: 10, marginBottom: 20 }}>
              {projectsList.map(p => {
                const isSelected = selectedProjectItem?.id === p.id;
                return (
                  <div
                    key={p.id}
                    onClick={() => setSelectedProjectItem(p)}
                    className="glass module-card"
                    style={{
                      padding: "14px 16px",
                      borderRadius: 16,
                      background: isSelected ? "rgba(6, 182, 212, 0.08)" : "rgba(255,255,255,0.01)",
                      border: isSelected ? "1px solid rgba(6, 182, 212, 0.3)" : "1px solid rgba(255,255,255,0.04)",
                      cursor: "pointer",
                      display: "flex",
                      flexDirection: "column",
                      gap: 6,
                      textAlign: "left",
                      transition: "all 0.2s ease"
                    }}
                  >
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 10 }}>
                      <h3 style={{ fontSize: 13, fontWeight: 800, color: isSelected ? "#06b6d4" : "#f1f5f9", margin: 0 }}>{p.name}</h3>
                      <span style={{ fontSize: 9, fontWeight: 800, color: "#67e8f9", background: "rgba(6, 182, 212, 0.12)", border: "1px solid rgba(6, 182, 212, 0.2)", borderRadius: 6, padding: "2px 6px", textTransform: "uppercase", fontFamily: "monospace", flexShrink: 0 }}>
                        {p.code}
                      </span>
                    </div>
                    <div style={{ display: "flex", justifyContent: "space-between", fontSize: 10, color: "#94a3b8" }}>
                      <span>District: <b>{p.district}</b></span>
                      <span>Distance: <b>{p.distance}</b></span>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Selected Project Map (Read-Only) */}
            {selectedProjectItem && (
              <div className="glass fade-in" style={{ padding: 18, border: "1px solid rgba(255,255,255,0.06)", borderRadius: 20, background: "rgba(255,255,255,0.01)", textAlign: "left" }}>
                <h2 style={{ fontSize: 14, fontWeight: 900, color: "#f1f5f9", margin: 0 }}>{selectedProjectItem.name}</h2>
                <p style={{ fontSize: 11, color: "#94a3b8", margin: "4px 0 14px" }}>{selectedProjectItem.description}</p>

                {/* Map Display Card */}
                <div className="glass" style={{ padding: 0, border: "1px solid rgba(255,255,255,0.08)", borderRadius: 16, overflow: "hidden", background: "#080b13", marginBottom: 14 }}>
                  <div style={{ position: "relative", height: 220, width: "100%" }}>
                    <iframe
                      title="Project Corridor Map"
                      style={{ width: "100%", height: "100%", border: "none" }}
                      srcDoc={`
                        <!DOCTYPE html>
                        <html>
                        <head>
                          <link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css" />
                          <script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"></script>
                          <style>
                            html, body, #map { margin: 0; padding: 0; width: 100%; height: 100%; background: #060912; }
                            .leaflet-control-attribution { display: none !important; }
                            .leaflet-container { background: #060912 !important; }
                            .leaflet-bar a { background-color: #0b0f19 !important; color: #fff !important; border-color: rgba(255,255,255,0.15) !important; }
                            .leaflet-bar a:hover { background-color: #121826 !important; }
                            
                            .start-pulse {
                              background: #22c55e;
                              border: 2px solid #ffffff;
                              border-radius: 50%;
                              box-shadow: 0 0 0 0 rgba(34, 197, 94, 0.7);
                              animation: pulse-green 1.8s infinite;
                            }
                            .end-pulse {
                              background: #ef4444;
                              border: 2px solid #ffffff;
                              border-radius: 50%;
                              box-shadow: 0 0 0 0 rgba(239, 68, 68, 0.7);
                              animation: pulse-red 1.8s infinite;
                            }
                            @keyframes pulse-green {
                              0% { transform: scale(0.95); box-shadow: 0 0 0 0 rgba(34, 197, 94, 0.7); }
                              70% { transform: scale(1); box-shadow: 0 0 0 6px rgba(34, 197, 94, 0); }
                              100% { transform: scale(0.95); box-shadow: 0 0 0 0 rgba(34, 197, 94, 0); }
                            }
                            @keyframes pulse-red {
                              0% { transform: scale(0.95); box-shadow: 0 0 0 0 rgba(239, 68, 68, 0.7); }
                              70% { transform: scale(1); box-shadow: 0 0 0 6px rgba(239, 68, 68, 0); }
                              100% { transform: scale(0.95); box-shadow: 0 0 0 0 rgba(239, 68, 68, 0); }
                            }
                          </style>
                        </head>
                        <body>
                          <div id="map"></div>
                          <script>
                            const start = [${selectedProjectItem.startCoords[0]}, ${selectedProjectItem.startCoords[1]}];
                            const end = [${selectedProjectItem.endCoords[0]}, ${selectedProjectItem.endCoords[1]}];
                            const map = L.map('map').setView([(start[0] + end[0]) / 2, (start[1] + end[1]) / 2], 14);
                            
                            L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png', {
                              maxZoom: 20
                            }).addTo(map);

                            const path = [start, end];
                            L.polyline(path, { color: '#06b6d4', weight: 8, opacity: 0.25, lineJoin: 'round' }).addTo(map);
                            const mainLine = L.polyline(path, { color: '#06b6d4', weight: 3.5, opacity: 0.95, lineJoin: 'round' }).addTo(map);
                            
                            const startIcon = L.divIcon({ className: 'start-pulse', iconSize: [12, 12] });
                            L.marker(start, { icon: startIcon }).addTo(map).bindPopup('<b>Start:</b> ${selectedProjectItem.startLabel}');
                            
                            const endIcon = L.divIcon({ className: 'end-pulse', iconSize: [12, 12] });
                            L.marker(end, { icon: endIcon }).addTo(map).bindPopup('<b>End:</b> ${selectedProjectItem.endLabel}');
                            
                            try {
                              map.fitBounds(mainLine.getBounds(), { padding: [30, 30] });
                            } catch(e) {}
                          </script>
                        </body>
                        </html>
                      `}
                    />
                  </div>
                </div>

                {/* Corridor Coords Details Card */}
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, background: "rgba(0,0,0,0.2)", border: "1px solid rgba(255,255,255,0.04)", padding: 12, borderRadius: 14 }}>
                  <div>
                    <span style={{ fontSize: 8, fontWeight: 700, color: "#64748b", textTransform: "uppercase" }}>Start Position</span>
                    <p style={{ margin: "2px 0 0", fontSize: 11, fontWeight: 750, color: "#4ade80" }}>{selectedProjectItem.startLabel}</p>
                    <span style={{ fontSize: 9, fontFamily: "monospace", color: "#64748b" }}>{selectedProjectItem.startCoords[0]}° N, {selectedProjectItem.startCoords[1]}° E</span>
                  </div>
                  <div>
                    <span style={{ fontSize: 8, fontWeight: 700, color: "#64748b", textTransform: "uppercase" }}>End Position</span>
                    <p style={{ margin: "2px 0 0", fontSize: 11, fontWeight: 750, color: "#f87171" }}>{selectedProjectItem.endLabel}</p>
                    <span style={{ fontSize: 9, fontFamily: "monospace", color: "#64748b" }}>{selectedProjectItem.endCoords[0]}° N, {selectedProjectItem.endCoords[1]}° E</span>
                  </div>
                </div>
              </div>
            )}
          </div>
        ) : (
          /* CORE FIELD OPERATIONS CONSOLE */
          <div style={{ width: "100%", maxWidth: 420, textAlign: "center" }}>
            
            {/* Circular Initials Avatar */}
            <div style={{ display: "flex", flexDirection: "column", alignItems: "center", marginBottom: 24 }}>
              <div style={{
                width: 64,
                height: 64,
                borderRadius: "50%",
                background: "linear-gradient(135deg, #0e7490, #06b6d4)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                color: "white",
                fontSize: 26,
                fontWeight: 800,
                boxShadow: "0 10px 28px rgba(6,182,212,0.2)",
                border: "2px solid rgba(255,255,255,0.1)",
                textTransform: "uppercase"
              }}>
                {(user?.fullName || "U").charAt(0)}
              </div>
              <h2 style={{ fontSize: 20, fontWeight: 800, color: "#f1f5f9", margin: "12px 0 2px" }}>{user?.fullName}</h2>
              <p style={{ fontSize: 12, color: "#64748b", margin: 0, fontFamily: "monospace" }}>{user?.loginId}</p>
            </div>

            {/* GRID OF MODULES */}
            <div className="menu-grid">
              
              {/* MODULE 1: ATTENDANCE SHIFT (Interactive) */}
              <div 
                onClick={() => setIsAttendanceOpen(true)}
                style={{
                  background: isShiftActive ? "rgba(167, 139, 250, 0.02)" : "rgba(255,255,255,0.01)",
                  border: isShiftActive ? "1px solid rgba(167, 139, 250, 0.25)" : "1px solid rgba(255,255,255,0.06)",
                  borderRadius: 18,
                  padding: "18px 14px",
                  cursor: "pointer",
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "center",
                  textAlign: "center",
                  gap: 8,
                  boxShadow: isShiftActive ? "0 8px 24px rgba(167, 139, 250, 0.05)" : "none",
                }}
                className="glass module-card"
              >
                <div style={{
                  width: 44,
                  height: 44,
                  borderRadius: 12,
                  background: isShiftActive ? "rgba(167, 139, 250, 0.12)" : "rgba(6, 182, 212, 0.08)",
                  border: isShiftActive ? "1px solid rgba(167, 139, 250, 0.3)" : "1px solid rgba(6, 182, 212, 0.2)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  flexShrink: 0
                }}>
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke={isShiftActive ? "#a78bfa" : "#06b6d4"} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
                    <circle cx="12" cy="10" r="3"/>
                  </svg>
                </div>
                <div>
                  <h4 style={{ fontSize: 13, fontWeight: 800, color: "#f1f5f9", margin: "0 0 2px" }}>Attendance</h4>
                  <span style={{ fontSize: 9, color: isShiftActive ? "#a78bfa" : "#64748b", fontWeight: 700 }}>
                    {isShiftActive ? `Active (${checkInTime})` : "Pending Sign In"}
                  </span>
                </div>
              </div>

              {/* MODULE 2: PROJECTS DIRECTORY (Read-Only) */}
              <div 
                onClick={() => { setIsProjectsOpen(true); if (projectsList.length > 0) setSelectedProjectItem(projectsList[0]); }}
                style={{
                  background: "rgba(255,255,255,0.01)",
                  border: "1px solid rgba(255,255,255,0.06)",
                  borderRadius: 18,
                  padding: "18px 14px",
                  cursor: "pointer",
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "center",
                  textAlign: "center",
                  gap: 8,
                }}
                className="glass module-card"
              >
                <div style={{
                  width: 44,
                  height: 44,
                  borderRadius: 12,
                  background: "rgba(6, 182, 212, 0.08)",
                  border: "1px solid rgba(6, 182, 212, 0.2)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  flexShrink: 0
                }}>
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#06b6d4" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"/>
                    <line x1="12" y1="11" x2="12" y2="17"/>
                    <line x1="9" y1="14" x2="15" y2="14"/>
                  </svg>
                </div>
                <div>
                  <h4 style={{ fontSize: 13, fontWeight: 800, color: "#f1f5f9", margin: "0 0 2px" }}>Projects</h4>
                  <span style={{ fontSize: 9, color: "#06b6d4", fontWeight: 700 }}>Corridors</span>
                </div>
              </div>

              {/* MODULE 3: PROJECT ASSIGNMENT DETAILS */}
              <div 
                style={{
                  background: "rgba(255,255,255,0.01)",
                  border: "1px solid rgba(255,255,255,0.06)",
                  borderRadius: 18,
                  padding: "18px 14px",
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "center",
                  textAlign: "center",
                  gap: 8,
                }}
                className="glass"
              >
                <div style={{
                  width: 44,
                  height: 44,
                  borderRadius: 12,
                  background: "rgba(6, 182, 212, 0.08)",
                  border: "1px solid rgba(6, 182, 212, 0.2)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  flexShrink: 0
                }}>
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#06b6d4" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"/>
                  </svg>
                </div>
                <div>
                  <h4 style={{ fontSize: 13, fontWeight: 800, color: "#f1f5f9", margin: "0 0 2px" }}>Corridor</h4>
                  <span style={{ fontSize: 9, color: "#06b6d4", fontWeight: 800, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", maxWidth: 100, display: "block" }}>Vadakkekotta</span>
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
                  try {
                    await fetch("/api/mobile/sign-out", { method: "POST" });
                  } catch (e) {
                    console.error("Sign out API failed:", e);
                  }
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
        )}

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
              background: isShiftActive ? "rgba(167,139,250,0.1)" : "rgba(6,182,212,0.1)",
              border: isShiftActive ? "1.5px solid rgba(167,139,250,0.35)" : "1.5px solid rgba(6,182,212,0.35)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              margin: "0 auto 16px",
              boxShadow: isShiftActive ? "0 0 20px rgba(167,139,250,0.2)" : "0 0 20px rgba(6,182,212,0.2)"
            }}>
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke={isShiftActive ? "#a78bfa" : "#06b6d4"} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
                <circle cx="12" cy="10" r="3"/>
              </svg>
            </div>

            <h3 style={{ fontSize: 18, fontWeight: 900, color: "#f1f5f9", margin: "0 0 8px" }}>On-Site Duty Shift</h3>
            
            {isShiftActive ? (
              <div style={{ marginBottom: 24 }}>
                <p style={{ fontSize: 13, color: "#cbd5e1", lineHeight: 1.5, margin: "0 0 16px" }}>
                  Your daily attendance was successfully marked at <strong style={{ color: "#a78bfa" }}>{checkInTime}</strong>. Silent background telemetry is running to verify operations coverage.
                </p>
                <div style={{ background: "rgba(167,139,250,0.06)", border: "1px solid rgba(167,139,250,0.15)", borderRadius: 12, padding: "10px 12px", display: "inline-flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
                  <div className="dot-pulse" style={{ background: "#a78bfa" }} />
                  <span style={{ fontSize: 11, color: "#a78bfa", fontWeight: 750 }}>Shift Active — completed ✓</span>
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
                  background: "linear-gradient(135deg, #06b6d4 0%, #7c3aed 100%)",
                  border: "none",
                  borderRadius: 12,
                  color: "white",
                  fontSize: 14,
                  fontWeight: 800,
                  cursor: checkingIn ? "not-allowed" : "pointer",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: 8,
                  boxShadow: "0 4px 15px rgba(6, 182, 212, 0.25)",
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
                background: isShiftActive ? "rgba(239,68,68,0.08)" : "linear-gradient(135deg, #06b6d4 0%, #7c3aed 100%)",
                border: isShiftActive ? "1px solid rgba(239,68,68,0.2)" : "none",
                borderRadius: 12,
                color: isShiftActive ? "#f87171" : "white",
                fontSize: 14,
                fontWeight: 800,
                cursor: checkingIn ? "not-allowed" : "pointer",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                gap: 8,
                boxShadow: isShiftActive ? "none" : "0 4px 15px rgba(6, 182, 212, 0.25)"
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

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

  // Sync projects list with localStorage & database server to show Admin updates instantly
  useEffect(() => {
    const saved = localStorage.getItem("telgo_custom_projects");
    let initialList = DEFAULT_PROJECTS;
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (parsed && parsed.length > 0) {
          initialList = parsed;
        }
      } catch {}
    }
    setProjectsList(initialList);
    if (initialList.length > 0) setSelectedProjectItem(initialList[0]);

    fetch("/api/mobile/projects")
      .then(res => res.json())
      .then(d => {
        if (d.ok && d.projects && d.projects.length > 0) {
          setProjectsList(d.projects);
          setSelectedProjectItem(d.projects[0]);
          localStorage.setItem("telgo_custom_projects", JSON.stringify(d.projects));
        }
      })
      .catch(err => console.error("Error loading projects on finance:", err));
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
    <div style={{ minHeight: "100dvh", background: "var(--bg)", display: "flex", flexDirection: "column", color: "var(--text)", fontFamily: "Outfit, sans-serif" }}>
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
          border-color: rgba(250, 204, 21, 0.3) !important;
          background: rgba(255, 255, 255, 0.04) !important;
        }
      `}</style>
      {/* Immersive Header */}
      <ProfileHeaderWidget 
        user={user} 
        onOpenSettings={() => setIsSettingsOpen(true)} 
        dashboardTitle="Finance Control" 
      />

      <main style={{ flex: 1, padding: "24px 20px", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: isProjectsOpen ? "flex-start" : "center" }}>
        
        {isProjectsOpen ? (
          /* READ-ONLY PROJECTS DIRECTORY SUB-VIEW (FINANCE GOLD-THEMED) */
          <div className="fade-in" style={{ width: "100%", maxWidth: 420 }}>
            {/* Header back row */}
            <div style={{ display: "flex", alignItems: "center", gap: 14, marginBottom: 20 }}>
              <button 
                onClick={() => { setIsProjectsOpen(false); setSelectedProjectItem(null); }}
                style={{ width: 38, height: 38, borderRadius: 10, border: "1px solid var(--border)", background: "var(--surface)", display: "flex", alignItems: "center", justifyContent: "center", color: "var(--text)", cursor: "pointer" }}
              >
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="19" y1="12" x2="5" y2="12"/><polyline points="12 19 5 12 12 5"/></svg>
              </button>
              <div>
                <p style={{ fontSize: 9, fontWeight: 800, color: "#d97706", letterSpacing: "0.1em", textTransform: "uppercase", margin: 0 }}>Telgo Power Corridors</p>
                <h1 style={{ fontSize: 18, fontWeight: 800, color: "var(--text)", margin: "2px 0 0", letterSpacing: "-0.5px" }}>Projects Directory</h1>
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
                      background: isSelected ? "rgba(250, 204, 21, 0.08)" : "rgba(255,255,255,0.01)",
                      border: isSelected ? "1px solid rgba(250, 204, 21, 0.3)" : "1px solid rgba(255,255,255,0.04)",
                      cursor: "pointer",
                      display: "flex",
                      flexDirection: "column",
                      gap: 6,
                      textAlign: "left",
                      transition: "all 0.2s ease"
                    }}
                  >
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 10 }}>
                      <h3 style={{ fontSize: 13, fontWeight: 800, color: isSelected ? "#d97706" : "var(--text)", margin: 0 }}>{p.name}</h3>
                      <span style={{ fontSize: 9, fontWeight: 800, color: "#d97706", background: "rgba(217, 119, 6, 0.08)", border: "1px solid rgba(217, 119, 6, 0.2)", borderRadius: 6, padding: "2px 6px", textTransform: "uppercase", fontFamily: "monospace", flexShrink: 0 }}>
                        {p.code}
                      </span>
                    </div>
                    <div style={{ display: "flex", justifyContent: "space-between", fontSize: 10, color: "var(--dim)" }}>
                      <span>District: <b>{p.district}</b></span>
                      <span>Distance: <b>{p.distance}</b></span>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Selected Project Map (Read-Only) */}
            {selectedProjectItem && (
              <div className="glass fade-in" style={{ padding: 18, border: "1px solid var(--border)", borderRadius: 20, background: "var(--surface)", textAlign: "left" }}>
                <h2 style={{ fontSize: 14, fontWeight: 900, color: "var(--text)", margin: 0 }}>{selectedProjectItem.name}</h2>
                <p style={{ fontSize: 11, color: "var(--dim)", margin: "4px 0 14px" }}>{selectedProjectItem.description}</p>

                {/* Map Display Card */}
                <div className="glass" style={{ padding: 0, border: "1px solid var(--border)", borderRadius: 16, overflow: "hidden", background: "var(--bg)", marginBottom: 14 }}>
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
                            html, body, #map { margin: 0; padding: 0; width: 100%; height: 100%; background: #f8fafc; }
                            .leaflet-control-attribution { display: none !important; }
                            .leaflet-container { background: #f8fafc !important; }
                            .leaflet-bar a { background-color: #ffffff !important; color: #334155 !important; border-color: #e2e8f0 !important; }
                            .leaflet-bar a:hover { background-color: #f1f5f9 !important; }
                            
                            .start-pulse {
                              background: #22c55e;
                              border: 2px solid #ffffff;
                              border-radius: 50%;
                              box-shadow: 0 0 10px rgba(34, 197, 94, 0.7);
                            }
                            .end-pulse {
                              background: #ef4444;
                              border: 2px solid #ffffff;
                              border-radius: 50%;
                              box-shadow: 0 0 10px rgba(239, 68, 68, 0.7);
                            }
                            .hdd-dot {
                              background: #eab308;
                              border: 1.5px solid #ffffff;
                              border-radius: 50%;
                              box-shadow: 0 0 8px rgba(234, 179, 8, 0.6);
                            }
                            .term-dot {
                              background: #2563eb;
                              border: 1.5px solid #ffffff;
                              border-radius: 3px;
                              box-shadow: 0 0 8px rgba(37, 99, 235, 0.6);
                            }
                          </style>
                        </head>
                        <body>
                          <div id="map"></div>
                          <script>
                            const start = [${selectedProjectItem.startCoords[0]}, ${selectedProjectItem.startCoords[1]}];
                            const end = [${selectedProjectItem.endCoords[0]}, ${selectedProjectItem.endCoords[1]}];
                            const map = L.map('map').setView([(start[0] + end[0]) / 2, (start[1] + end[1]) / 2], 14);
                            
                            L.tileLayer('https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png', {
                              maxZoom: 20
                            }).addTo(map);

                            // Primary Route (Purple utilityPath if present, else Gold line)
                            const customUtility = ${JSON.stringify(selectedProjectItem.utilityPath ?? [])};
                            if (customUtility && customUtility.length >= 2) {
                              L.polyline(customUtility, { color: '#a855f7', weight: 4, opacity: 0.95, lineJoin: 'round' }).addTo(map);
                            } else {
                              L.polyline([start, end], { color: "#d97706", weight: 4, opacity: 0.8, lineJoin: 'round' }).addTo(map);
                            }

                            // Plot HDD Points
                            const hddPts = ${JSON.stringify(selectedProjectItem.hddPoints ?? [])};
                            const hddIcon = L.divIcon({ className: 'hdd-dot', iconSize: [10, 10] });
                            if (hddPts && hddPts.length > 0) {
                              hddPts.forEach((pt, idx) => {
                                L.marker(pt, { icon: hddIcon }).addTo(map).bindPopup("<b>HDD Location " + (idx + 1) + "</b>");
                              });
                            }

                            // Plot Terminations
                            const termPts = ${JSON.stringify(selectedProjectItem.terminationPoints ?? [])};
                            const termIcon = L.divIcon({ className: 'term-dot', iconSize: [10, 10] });
                            if (termPts && termPts.length > 0) {
                              termPts.forEach((pt, idx) => {
                                L.marker(pt, { icon: termIcon }).addTo(map).bindPopup("<b>Grid Termination " + (idx + 1) + "</b>");
                              });
                            }

                            // Plot Trenching Lines
                            const trenchLine = ${JSON.stringify(selectedProjectItem.trenchingLine ?? [])};
                            if (trenchLine && trenchLine.length >= 2) {
                              L.polyline(trenchLine, { color: '#f97316', dashArray: '5, 5', weight: 3, opacity: 0.95, lineJoin: 'round' }).addTo(map);
                              trenchLine.forEach(pt => {
                                L.circle(pt, { color: '#f97316', fillColor: '#f97316', fillOpacity: 0.8, radius: 3 }).addTo(map);
                              });
                            }
                            
                            const startIcon = L.divIcon({ className: 'start-pulse', iconSize: [12, 12] });
                            L.marker(start, { icon: startIcon }).addTo(map).bindPopup('<b>Start:</b> ${selectedProjectItem.startLabel}');
                            
                            const endIcon = L.divIcon({ className: 'end-pulse', iconSize: [12, 12] });
                            L.marker(end, { icon: endIcon }).addTo(map).bindPopup('<b>End:</b> ${selectedProjectItem.endLabel}');
                            
                            // Auto zoom to all markers
                            const bounds = [start, end];
                            if (trenchLine && trenchLine.length > 0) trenchLine.forEach(pt => bounds.push(pt));
                            if (customUtility && customUtility.length > 0) customUtility.forEach(pt => bounds.push(pt));
                            if (hddPts && hddPts.length > 0) hddPts.forEach(pt => bounds.push(pt));
                            if (termPts && termPts.length > 0) termPts.forEach(pt => bounds.push(pt));

                            try {
                              map.fitBounds(bounds, { padding: [30, 30] });
                            } catch(e) {}
                          </script>
                        </body>
                        </html>
                      `}
                    />
                  </div>
                </div>

                {/* Corridor Coords Details Card */}
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, background: "var(--surface)", border: "1px solid var(--border)", padding: 12, borderRadius: 14 }}>
                  <div>
                    <span style={{ fontSize: 8, fontWeight: 700, color: "var(--dim)", textTransform: "uppercase" }}>Start Position</span>
                    <p style={{ margin: "2px 0 0", fontSize: 11, fontWeight: 750, color: "#15803d" }}>{selectedProjectItem.startLabel}</p>
                    <span style={{ fontSize: 9, fontFamily: "monospace", color: "var(--dim)" }}>{selectedProjectItem.startCoords[0]}° N, {selectedProjectItem.startCoords[1]}° E</span>
                  </div>
                  <div>
                    <span style={{ fontSize: 8, fontWeight: 700, color: "var(--dim)", textTransform: "uppercase" }}>End Position</span>
                    <p style={{ margin: "2px 0 0", fontSize: 11, fontWeight: 750, color: "var(--red)" }}>{selectedProjectItem.endLabel}</p>
                    <span style={{ fontSize: 9, fontFamily: "monospace", color: "var(--dim)" }}>{selectedProjectItem.endCoords[0]}° N, {selectedProjectItem.endCoords[1]}° E</span>
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
                background: "linear-gradient(135deg, #d97706, #fbbf24)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                color: "black",
                fontSize: 26,
                fontWeight: 800,
                boxShadow: "0 10px 28px rgba(250,204,21,0.2)",
                border: "2px solid var(--border)",
                textTransform: "uppercase"
              }}>
                {(user?.fullName || "U").charAt(0)}
              </div>
              <h2 style={{ fontSize: 20, fontWeight: 800, color: "var(--text)", margin: "12px 0 2px" }}>{user?.fullName}</h2>
              <p style={{ fontSize: 12, color: "var(--dim)", margin: 0, fontFamily: "monospace" }}>{user?.loginId}</p>
            </div>

            {/* GRID OF MODULES */}
            <div className="menu-grid">
              
              {/* MODULE 1: ATTENDANCE SHIFT (Interactive) */}
              <div 
                onClick={() => setIsAttendanceOpen(true)}
                style={{
                  background: isShiftActive ? "rgba(250, 204, 21, 0.02)" : "rgba(255,255,255,0.01)",
                  border: isShiftActive ? "1px solid rgba(250, 204, 21, 0.25)" : "1px solid rgba(255,255,255,0.06)",
                  borderRadius: 18,
                  padding: "18px 14px",
                  cursor: "pointer",
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "center",
                  textAlign: "center",
                  gap: 8,
                  boxShadow: isShiftActive ? "0 8px 24px rgba(250, 204, 21, 0.05)" : "none",
                }}
                className="glass module-card"
              >
                <div style={{
                  width: 44,
                  height: 44,
                  borderRadius: 12,
                  background: isShiftActive ? "rgba(250, 204, 21, 0.12)" : "rgba(6, 182, 212, 0.08)",
                  border: isShiftActive ? "1px solid rgba(250, 204, 21, 0.3)" : "1px solid rgba(6, 182, 212, 0.2)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  flexShrink: 0
                }}>
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke={isShiftActive ? "#facc15" : "#06b6d4"} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
                    <circle cx="12" cy="10" r="3"/>
                  </svg>
                </div>
                <div>
                  <h4 style={{ fontSize: 13, fontWeight: 800, color: "var(--text)", margin: "0 0 2px" }}>Attendance</h4>
                  <span style={{ fontSize: 9, color: isShiftActive ? "#facc15" : "#64748b", fontWeight: 700 }}>
                    {isShiftActive ? `Active (${checkInTime})` : "Pending Sign In"}
                  </span>
                </div>
              </div>

              {/* MODULE 2: PROJECTS DIRECTORY (Read-Only) */}
              <div 
                onClick={() => { setIsProjectsOpen(true); if (projectsList.length > 0) setSelectedProjectItem(projectsList[0]); }}
                style={{
                  background: "var(--surface)",
                  border: "1px solid var(--border)",
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
                  <h4 style={{ fontSize: 13, fontWeight: 800, color: "var(--text)", margin: "0 0 2px" }}>Projects</h4>
                  <span style={{ fontSize: 9, color: "#06b6d4", fontWeight: 700 }}>Corridors</span>
                </div>
              </div>

              {/* MODULE 3: PROJECT ASSIGNMENT DETAILS */}
              <div 
                style={{
                  background: "var(--surface)",
                  border: "1px solid var(--border)",
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
                  <h4 style={{ fontSize: 13, fontWeight: 800, color: "var(--text)", margin: "0 0 2px" }}>Corridor</h4>
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
                background: "var(--surface)",
                border: "1px solid var(--border)",
                borderRadius: 14,
                color: "var(--dim)",
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
                color: "var(--red)",
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
          background: "rgba(15, 23, 42, 0.3)",
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
            background: "linear-gradient(135deg, #ffffff 0%, #f8fafc 100%)",
            border: "1px solid var(--border)",
            borderRadius: 24,
            padding: 30,
            textAlign: "center",
            boxShadow: "0 8px 32px rgba(15, 23, 42, 0.06)"
          }}>
            {/* Header */}
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 20 }}>
              <span style={{ fontSize: 10, fontWeight: 800, color: "var(--dim)", textTransform: "uppercase", letterSpacing: "0.08em" }}>Duty Registry</span>
              <button 
                onClick={() => setIsAttendanceOpen(false)}
                style={{
                  background: "var(--surface)",
                  border: "1px solid var(--border)",
                  width: 28,
                  height: 28,
                  borderRadius: "50%",
                  color: "var(--dim)",
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

            <h3 style={{ fontSize: 18, fontWeight: 900, color: "var(--text)", margin: "0 0 8px" }}>On-Site Duty Shift</h3>
            
            {isShiftActive ? (
              <div style={{ marginBottom: 24 }}>
                <p style={{ fontSize: 13, color: "var(--muted)", lineHeight: 1.5, margin: "0 0 16px" }}>
                  Your daily attendance was successfully marked at <strong style={{ color: "#d97706" }}>{checkInTime}</strong>. Silent background telemetry is running to verify operations coverage.
                </p>
                <div style={{ background: "rgba(217, 119, 6, 0.08)", border: "1px solid rgba(217, 119, 6, 0.15)", borderRadius: 12, padding: "10px 12px", display: "inline-flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
                  <div className="dot-pulse" style={{ background: "#facc15" }} />
                  <span style={{ fontSize: 11, color: "#d97706", fontWeight: 750 }}>Shift Active — completed ✓</span>
                </div>
              </div>
            ) : (
              <div style={{ marginBottom: 24 }}>
                <p style={{ fontSize: 13, color: "var(--dim)", lineHeight: 1.5, margin: 0 }}>
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
                  color: "var(--text)",
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
                color: isShiftActive ? "var(--red)" : "white",
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
                color: "var(--dim)",
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
        <div style={{ position: "fixed", bottom: 24, left: 16, right: 16, background: "#1e293b", border: "1px solid var(--border)", borderRadius: 14, padding: "14px 18px", fontSize: 13, fontWeight: 600, color: "var(--text)", zIndex: 10000, textAlign: "center", boxShadow: "0 8px 32px rgba(0,0,0,0.5)", animation: "fadeIn 0.3s ease" }}>
          {toast}
        </div>
      )}
    </div>
  );
}

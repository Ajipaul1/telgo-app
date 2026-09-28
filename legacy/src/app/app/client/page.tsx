"use client";
import { useEffect, useState, useRef } from "react";
import { ProfileModal, ProfileHeaderWidget, ProfileUser } from "@/components/profile-modal";

type ActiveWorker = {
  userId: string;
  fullName: string;
  email: string;
  role: string;
  status: "active" | "offline";
  latitude: number;
  longitude: number;
  projectName: string;
  distanceFromSiteM: number;
  withinGeofence: boolean;
};

export default function ClientDashboard() {
  const [user, setUser] = useState<ProfileUser | null>(null);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  
  // Tactical Radar States
  const [radarOpen, setRadarOpen] = useState(false);
  const [selectedWorker, setSelectedWorker] = useState<ActiveWorker | null>(null);
  const [workers, setWorkers] = useState<ActiveWorker[]>([]);
  const [loadingRadar, setLoadingRadar] = useState(false);
  const [mapAnimateProgress, setMapAnimateProgress] = useState(0);

  // Project & Daily Report inspection sheet states for client review
  const [projectsList, setProjectsList] = useState<any[]>([]);
  const [selectedProjectId, setSelectedProjectId] = useState("");
  const [reportsList, setReportsList] = useState<any[]>([]);
  const [loadingReports, setLoadingReports] = useState(false);

  const animationRef = useRef<number | null>(null);

  // Fetch client details
  useEffect(() => {
    fetch("/api/mobile/me")
      .then((r) => r.json())
      .then((d) => {
        if (d.ok) setUser(d.user);
        else window.location.href = "/login";
      });

    // Fetch projects list for dropdown selection
    fetch("/api/mobile/projects")
      .then(res => res.json())
      .then(d => {
        if (d.ok && d.projects && d.projects.length > 0) {
          setProjectsList(d.projects);
          setSelectedProjectId(d.projects[0].id);
        }
      })
      .catch(err => console.error("Error fetching projects:", err));
  }, []);

  // Fetch reports when selectedProjectId changes
  useEffect(() => {
    if (!selectedProjectId) return;
    setLoadingReports(true);
    fetch(`/api/mobile/daily-reports?projectId=${selectedProjectId}`)
      .then(res => res.json())
      .then(d => {
        if (d.ok && d.reports) {
          setReportsList(d.reports);
        } else {
          setReportsList([]);
        }
      })
      .catch(err => {
        console.error("Error fetching project reports:", err);
        setReportsList([]);
      })
      .finally(() => {
        setLoadingReports(false);
      });
  }, [selectedProjectId]);

  // Poll live coordinates from api
  const fetchLiveTelemetry = async () => {
    try {
      const res = await fetch("/api/mobile/live-map");
      const data = await res.json();
      
      if (res.ok && data.ok) {
        // Dynamic crew roster list loaded from registered database users
        const dbCrew = data.crew ?? [];

        // Map live locations from API rows
        const activeLocations = data.locations ?? [];
        
        const mappedWorkers = dbCrew.map((item: any) => {
          const liveLoc = activeLocations.find((loc: any) => loc.mobileUserId === item.userId);
          
          if (liveLoc) {
            return {
              ...item,
              status: "active" as const,
              latitude: liveLoc.latitude,
              longitude: liveLoc.longitude,
              projectName: liveLoc.projectName || "Vadakkekotta Sn-Cable Corridor",
              distanceFromSiteM: liveLoc.distanceFromSiteM ?? 0,
              withinGeofence: liveLoc.withinGeofence ?? true,
            };
          }
          
          // Default offline fallback
          return {
            ...item,
            status: "offline" as const,
            latitude: 9.9538,
            longitude: 76.3428,
            projectName: "Vadakkekotta Sn-Cable Corridor",
            distanceFromSiteM: 0,
            withinGeofence: false,
          };
        });

        setWorkers(mappedWorkers);

        // Update selected worker live coordinates if they are active
        if (selectedWorker) {
          const updated = mappedWorkers.find((w: any) => w.userId === selectedWorker.userId);
          if (updated && updated.status === "active") {
            setSelectedWorker(updated);
          }
        }
      }
    } catch { /* silently ignore telemetry network errors */ }
  };

  useEffect(() => {
    fetchLiveTelemetry();
    const interval = setInterval(fetchLiveTelemetry, 6000);
    return () => clearInterval(interval);
  }, [selectedWorker]);

  // Smooth Zomato-style movement coordinate animation
  useEffect(() => {
    if (selectedWorker && selectedWorker.status === "active") {
      let progress = 0;
      const animate = () => {
        progress += 0.005;
        if (progress > 1) progress = 0; // loop ping-pong movement
        setMapAnimateProgress(progress);
        animationRef.current = requestAnimationFrame(animate);
      };
      animationRef.current = requestAnimationFrame(animate);
    }
    return () => {
      if (animationRef.current) cancelAnimationFrame(animationRef.current);
    };
  }, [selectedWorker]);

  const handleOpenRadar = () => {
    setLoadingRadar(true);
    fetchLiveTelemetry().then(() => {
      setLoadingRadar(false);
      setRadarOpen(true);
    });
  };

  const handleSelectWorker = (w: ActiveWorker) => {
    setSelectedWorker(w);
    setMapAnimateProgress(0);
  };

  // Determine role colors
  function roleColor(role: string) {
    return role === "finance" ? "#fcd34d" : "#67e8f9";
  }

  // Calculate animated position along target path for premium vector map rendering
  const getAnimatedCoords = () => {
    if (!selectedWorker) return { x: 120, y: 150 };
    
    // Simulating moving along a geological project corridor duct line (Zomato-style path drawing)
    const pathPoints = [
      { x: 60, y: 220 },   // Start check-in point
      { x: 130, y: 170 },  // Middle pipeline junction
      { x: 190, y: 190 },  // Geofence marker boundary
      { x: 260, y: 110 },  // Project site center
    ];

    // Determine current point based on animated progress
    const segmentCount = pathPoints.length - 1;
    const scaledProgress = mapAnimateProgress * segmentCount;
    const index = Math.floor(scaledProgress);
    const fraction = scaledProgress - index;

    if (index >= segmentCount) return pathPoints[segmentCount];

    const start = pathPoints[index];
    const end = pathPoints[index + 1];

    return {
      x: start.x + (end.x - start.x) * fraction,
      y: start.y + (end.y - start.y) * fraction,
    };
  };

  const workerCoords = getAnimatedCoords();

  return (
    <div style={{ minHeight: "100dvh", background: "var(--bg)", display: "flex", flexDirection: "column", color: "var(--text)", fontFamily: "Outfit, sans-serif", overflowX: "hidden" }}>
      {/* Immersive Header with Circular Avatar Profile Pic */}
      <ProfileHeaderWidget 
        user={user} 
        onOpenSettings={() => setIsSettingsOpen(true)} 
        dashboardTitle="Client Hub" 
      />

      <main style={{ flex: 1, padding: "24px 20px", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center" }}>
        <div className="glass fade-in" style={{ width: "100%", maxWidth: 420, padding: "40px 28px", textAlign: "center", borderRadius: 20, border: "1px solid var(--border)", background: "var(--surface)" }}>
          <div style={{ width: 64, height: 64, borderRadius: "50%", background: "linear-gradient(135deg,#16a34a,#4ade80)", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 20px", boxShadow: "0 8px 24px rgba(74, 222, 128, 0.25)" }}>
            <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"/>
              <polyline points="3.27 6.96 12 12.01 20.73 6.96"/>
              <line x1="12" y1="22.08" x2="12" y2="12"/>
            </svg>
          </div>
          
          <h2 style={{ fontSize: 22, fontWeight: 800, color: "var(--text)", marginBottom: 6 }}>Welcome, {user?.fullName}!</h2>
          <p style={{ fontSize: 13, color: "var(--dim)", marginBottom: 20 }}>{user?.email}</p>
          
          <span style={{ display: "inline-block", background: "rgba(22, 163, 74, 0.08)", color: "var(--green)", border: "1px solid rgba(22, 163, 74, 0.2)", borderRadius: 8, padding: "4px 14px", fontSize: 12, fontWeight: 700, textTransform: "uppercase", marginBottom: 28 }}>
            Client
          </span>
          
          <p style={{ fontSize: 14, color: "var(--dim)", lineHeight: 1.6, marginBottom: 32 }}>
            Review real-time crew positions, pipeline coordinates, and geofence tracking telemetry securely from the operational radar.
          </p>

          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            {/* Live Deployment Radar Access Button */}
            <button 
              onClick={handleOpenRadar}
              disabled={loadingRadar}
              style={{
                width: "100%",
                minHeight: 48,
                background: "linear-gradient(135deg, #10b981 0%, #06b6d4 100%)",
                border: "none",
                borderRadius: 14,
                color: "var(--text)",
                fontSize: 14,
                fontWeight: 750,
                cursor: loadingRadar ? "not-allowed" : "pointer",
                fontFamily: "Outfit, sans-serif",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                gap: 8,
                boxShadow: "0 4px 15px rgba(16, 185, 129, 0.2)"
              }}
            >
              {loadingRadar ? (
                <>
                  <div className="spinner" style={{ width: 16, height: 16 }} />
                  Synchronizing Radar...
                </>
              ) : (
                <>
                  <span style={{ width: 8, height: 8, borderRadius: "50%", background: "#22c55e", boxShadow: "0 0 10px #22c55e" }} />
                  📡 On-Site Deployment Radar
                </>
              )}
            </button>

            <button 
              onClick={() => setIsSettingsOpen(true)}
              style={{
                width: "100%",
                minHeight: 44,
                background: "var(--surface)",
                border: "1px solid var(--border)",
                borderRadius: 12,
                color: "var(--muted)",
                fontSize: 13,
                fontWeight: 700,
                cursor: "pointer",
                fontFamily: "Outfit, sans-serif"
              }}
            >
              ⚙️ Manage Profile Settings
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
                minHeight: 44,
                background: "rgba(239, 68, 68, 0.06)",
                border: "1px solid rgba(239, 68, 68, 0.2)",
                borderRadius: 12,
                color: "var(--red)",
                fontSize: 13,
                fontWeight: 700,
                cursor: "pointer",
                fontFamily: "Outfit, sans-serif",
                marginTop: 10
              }}
            >
              🚪 Secure Sign Out
            </button>
          </div>
        </div>

        {/* Progress & Inspection Sheets Panel */}
        <div className="glass fade-in" style={{ width: "100%", maxWidth: 420, padding: "24px", borderRadius: 20, border: "1px solid var(--border)", background: "var(--surface)", marginTop: 20 }}>
          <h3 style={{ fontSize: 15, fontWeight: 900, color: "var(--text)", margin: "0 0 12px", display: "flex", alignItems: "center", gap: 6 }}>
            <span>🗂️ Progress Inspection Sheets</span>
          </h3>

          {/* Project Selector Dropdown */}
          <div style={{ marginBottom: 16 }}>
            <label style={{ display: "block", fontSize: 10, fontWeight: 700, color: "var(--dim)", marginBottom: 6, textTransform: "uppercase" }}>Select Project Route</label>
            <select
              value={selectedProjectId}
              onChange={(e) => setSelectedProjectId(e.target.value)}
              style={{ width: "100%", height: 38, background: "var(--bg)", border: "1px solid var(--border)", borderRadius: 10, padding: "0 10px", color: "var(--text)", fontSize: 13, outline: "none", cursor: "pointer", fontFamily: "Outfit, sans-serif" }}
            >
              {projectsList.map(p => (
                <option key={p.id} value={p.id}>{p.name} ({p.code})</option>
              ))}
            </select>
          </div>

          {/* Submitted Reports List */}
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            <span style={{ fontSize: 10, fontWeight: 800, color: "var(--dim)", textTransform: "uppercase" }}>Submitted Progress Reports</span>
            
            {loadingReports ? (
              <div style={{ textAlign: "center", padding: "16px 0", color: "var(--dim)", fontSize: 12 }}>Loading project logs...</div>
            ) : reportsList.length === 0 ? (
              <div style={{ textAlign: "center", padding: "20px 10px", background: "var(--bg)", borderRadius: 12, border: "1px solid var(--border)", fontSize: 11, color: "var(--muted)" }}>
                No submitted daily reports found for this project route.
              </div>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: 8, maxHeight: 200, overflowY: "auto" }}>
                {reportsList.map((r) => (
                  <div
                    key={r.id}
                    style={{
                      padding: 12,
                      borderRadius: 12,
                      background: "var(--bg)",
                      border: "1px solid var(--border)",
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "center"
                    }}
                  >
                    <div style={{ minWidth: 0, paddingRight: 8 }}>
                      <span style={{ fontSize: 9, color: "var(--dim)", fontWeight: 700 }}>Date: {r.reportDate}</span>
                      <h4 style={{ fontSize: 11, fontWeight: 800, color: "var(--text)", margin: "2px 0 0", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>Report by {r.supervisorName}</h4>
                      <div style={{ display: "flex", gap: 6, marginTop: 4, flexWrap: "wrap" }}>
                        {r.hddLength > 0 && <span style={{ fontSize: 8, background: "rgba(234, 179, 8, 0.1)", color: "#d97706", borderRadius: 4, padding: "1px 4px", fontWeight: 700 }}>🕳️ HDD: {r.hddLength}m</span>}
                        {r.excavationLength > 0 && <span style={{ fontSize: 8, background: "rgba(249, 115, 22, 0.1)", color: "#ea580c", borderRadius: 4, padding: "1px 4px", fontWeight: 700 }}>⛏️ Trench: {r.excavationLength}m</span>}
                      </div>
                    </div>
                    {r.hddLength > 0 && (
                      <button
                        onClick={() => window.open(`/app/print-hdd?reportId=${r.id}`, '_blank')}
                        style={{
                          fontSize: 9,
                          fontWeight: 750,
                          color: "#ffffff",
                          background: "linear-gradient(135deg, #059669 0%, #10b981 100%)",
                          border: "none",
                          borderRadius: 6,
                          padding: "4px 8px",
                          cursor: "pointer",
                          fontFamily: "Outfit, sans-serif",
                          flexShrink: 0
                        }}
                      >
                        🖨️ PDF Sheet
                      </button>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </main>

      {/* ZOMATO-STYLE FULL-SCREEN/HALF-SCREEN ON-SITE DEPLOYMENT RADAR MODAL */}
      {radarOpen && (
        <div style={{
          position: "fixed",
          inset: 0,
          background: "rgba(15, 23, 42, 0.3)",
          backdropFilter: "blur(12px)",
          display: "flex",
          flexDirection: "column",
          justifyContent: "flex-end",
          zIndex: 1000,
          animation: "fadeIn 0.25s ease"
        }}>
          {/* Main Overlay Panel Container */}
          <div className="glass glow-emerald" style={{
            width: "100%",
            maxWidth: 480,
            maxHeight: "92dvh",
            height: "100%",
            margin: "0 auto",
            background: "linear-gradient(180deg, #ffffff 0%, #f8fafc 100%)",
            borderTopLeftRadius: 28,
            borderTopRightRadius: 28,
            border: "1px solid rgba(16, 185, 129, 0.2)",
            borderBottom: "none",
            display: "flex",
            flexDirection: "column",
            overflow: "hidden",
            boxShadow: "0 -4px 20px rgba(0, 0, 0, 0.05)"
          }}>
            {/* Grabber Drag Handle */}
            <div style={{ display: "flex", justifyContent: "center", padding: "12px 0 6px" }}>
              <div style={{ width: 44, height: 5, borderRadius: 3, background: "rgba(255, 255, 255, 0.15)" }} />
            </div>

            {/* Header */}
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "10px 24px" }}>
              <div>
                <span style={{ fontSize: 10, fontWeight: 800, color: "#10b981", letterSpacing: "0.15em", textTransform: "uppercase" }}>Geological Radar</span>
                <h3 style={{ fontSize: 18, fontWeight: 900, margin: "2px 0 0", color: "var(--text)" }}>On-Site Deployment</h3>
              </div>
              <button 
                onClick={() => { setRadarOpen(false); setSelectedWorker(null); }}
                style={{
                  background: "var(--surface)",
                  border: "1px solid var(--border)",
                  width: 32,
                  height: 32,
                  borderRadius: "50%",
                  color: "var(--dim)",
                  cursor: "pointer",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center"
                }}
              >
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
              </button>
            </div>

            {/* Split 1: Roster List (Scrollable) */}
            <div style={{
              flex: selectedWorker ? "none" : 1,
              maxHeight: selectedWorker ? 130 : "none",
              overflowY: "auto",
              padding: "16px 20px 8px",
              display: "flex",
              flexDirection: "column",
              gap: 8,
              borderBottom: selectedWorker ? "1px solid rgba(255,255,255,0.06)" : "none"
            }}>
              <p style={{ fontSize: 10, fontWeight: 700, textTransform: "uppercase", color: "var(--dim)", letterSpacing: "0.08em", margin: "0 0 4px" }}>Field Operations Roster</p>
              
              {workers.length === 0 ? (
                <div style={{ textAlign: "center", padding: 20, color: "var(--muted)", fontSize: 13 }}>
                  No workers in database registry.
                </div>
              ) : (
                workers.map((w) => (
                  <div 
                    key={w.userId}
                    onClick={() => handleSelectWorker(w)}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "space-between",
                      padding: "12px 14px",
                      background: selectedWorker?.userId === w.userId ? "rgba(16, 185, 129, 0.08)" : "var(--surface)",
                      border: selectedWorker?.userId === w.userId ? "1px solid rgba(16, 185, 129, 0.35)" : "1px solid var(--border)",
                      borderRadius: 14,
                      cursor: "pointer",
                      transition: "all 0.2s ease"
                    }}
                  >
                    <div style={{ display: "flex", alignItems: "center", gap: 12, minWidth: 0 }}>
                      {/* Avatar Preset Circle */}
                      <div style={{
                        width: 34,
                        height: 34,
                        borderRadius: "50%",
                        background: "linear-gradient(135deg, var(--violet), var(--cyan))",
                        border: `1.5px solid ${selectedWorker?.userId === w.userId ? "var(--green)" : "var(--border)"}`,
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        color: "var(--text)",
                        fontSize: 13,
                        fontWeight: 800
                      }}>
                        {w.fullName.charAt(0)}
                      </div>
                      
                      <div style={{ minWidth: 0 }}>
                        <h4 style={{ fontSize: 13, fontWeight: 700, margin: 0, color: "var(--text)" }}>{w.fullName}</h4>
                        <span style={{ fontSize: 10, fontWeight: 700, color: roleColor(w.role), textTransform: "uppercase" }}>{w.role}</span>
                      </div>
                    </div>

                    <div>
                      {w.status === "active" ? (
                        <span style={{ display: "inline-flex", alignItems: "center", gap: 4, background: "rgba(22, 163, 74, 0.08)", color: "var(--green)", border: "1px solid rgba(22, 163, 74, 0.2)", borderRadius: 6, padding: "2px 6px", fontSize: 9, fontWeight: 800, textTransform: "uppercase" }}>
                          <span className="dot-pulse" style={{ background: "#22c55e", width: 5, height: 5 }} /> Active
                        </span>
                      ) : (
                        <span style={{ display: "inline-flex", alignItems: "center", gap: 4, background: "var(--surface)", color: "var(--dim)", border: "1px solid var(--border)", borderRadius: 6, padding: "2px 6px", fontSize: 9, fontWeight: 800, textTransform: "uppercase" }}>
                          Offline
                        </span>
                      )}
                    </div>
                  </div>
                ))
              )}
            </div>

            {/* Split 2: Zomato-style Half-screen live moving map */}
            {selectedWorker ? (
              <div style={{ flex: 1, display: "flex", flexDirection: "column", background: "var(--surface)", position: "relative" }}>
                
                {/* Simulated Tactical Geological Vector Map */}
                <div style={{ flex: 1, position: "relative", overflow: "hidden", display: "flex", alignItems: "center", justifyContent: "center", borderBottom: "1px solid var(--border)" }}>
                  
                  {/* Grid lines background */}
                  <div style={{
                    position: "absolute",
                    inset: 0,
                    backgroundSize: "30px 30px",
                    backgroundImage: "linear-gradient(to right, rgba(15,23,42,0.025) 1px, transparent 1px), linear-gradient(to bottom, rgba(15,23,42,0.025) 1px, transparent 1px)",
                    zIndex: 1
                  }} />

                  {/* Pulsing Tactical radar sweep */}
                  <div className="radar-sweep" style={{
                    position: "absolute",
                    width: 280,
                    height: 280,
                    borderRadius: "50%",
                    border: "1px dashed rgba(16, 185, 129, 0.15)",
                    zIndex: 1,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center"
                  }}>
                    <div style={{ width: 140, height: 140, borderRadius: "50%", border: "1px solid rgba(16, 185, 129, 0.08)" }} />
                  </div>

                  {/* Map Elements */}
                  <svg style={{ width: 320, height: 260, zIndex: 2, position: "relative" }}>
                    {/* Definitions */}
                    <defs>
                      <linearGradient id="ductGrad" x1="0%" y1="100%" x2="100%" y2="0%">
                        <stop offset="0%" stopColor="#059669" stopOpacity="0.8" />
                        <stop offset="100%" stopColor="#10b981" stopOpacity="0.8" />
                      </linearGradient>
                      <filter id="glow">
                        <feGaussianBlur stdDeviation="3" result="coloredBlur"/>
                        <feMerge>
                          <feMergeNode in="coloredBlur"/>
                          <feMergeNode in="SourceGraphic"/>
                        </feMerge>
                      </filter>
                    </defs>

                    {/* Geological Project Corridor Duct Pipeline Path */}
                    <path 
                      d="M 60 220 L 130 170 L 190 190 L 260 110" 
                      fill="none" 
                      stroke="url(#ductGrad)" 
                      strokeWidth="5" 
                      strokeLinecap="round"
                      filter="url(#glow)"
                    />
                    <path 
                      d="M 60 220 L 130 170 L 190 190 L 260 110" 
                      fill="none" 
                      stroke="#34d399" 
                      strokeWidth="1.5" 
                      strokeDasharray="4 4" 
                      strokeLinecap="round"
                    />

                    {/* Geofence target boundary circle */}
                    <circle cx="260" cy="110" r="32" fill="rgba(16, 185, 129, 0.06)" stroke="rgba(16, 185, 129, 0.25)" strokeWidth="1.5" strokeDasharray="3 3" filter="url(#glow)" />
                    <text x="260" y="70" fill="#10b981" fontSize="9" fontWeight="800" textAnchor="middle" letterSpacing="0.05em">GEOFENCE LIMIT (120m)</text>

                    {/* Corridor Markers */}
                    <circle cx="60" cy="220" r="4" fill="#64748b" />
                    <text x="50" y="240" fill="#64748b" fontSize="8" fontWeight="600">Start</text>

                    <circle cx="260" cy="110" r="5" fill="#f43f5e" />
                    <text x="280" y="125" fill="#f1f5f9" fontSize="9" fontWeight="800">PROJECT SITE</text>

                    {/* ZOMATO PULSING ACTIVE ROUTING PIN */}
                    {selectedWorker.status === "active" ? (
                      <g>
                        {/* Outer expanding pulse ring */}
                        <circle cx={workerCoords.x} cy={workerCoords.y} r="18" fill="rgba(124, 58, 237, 0.12)" stroke="rgba(124, 58, 237, 0.3)" strokeWidth="1">
                          <animate attributeName="r" values="8;20;8" dur="2s" repeatCount="indefinite" />
                          <animate attributeName="opacity" values="0.8;0;0.8" dur="2s" repeatCount="indefinite" />
                        </circle>

                        {/* Connection line from marker to site */}
                        <line x1={workerCoords.x} y1={workerCoords.y} x2="260" y2="110" stroke="rgba(124,58,237,0.3)" strokeWidth="1.2" strokeDasharray="2 2" />

                        {/* Animated Worker Avatar Pin */}
                        <circle cx={workerCoords.x} cy={workerCoords.y} r="10" fill="#7c3aed" filter="url(#glow)" />
                        
                        {/* Mini Circular Photo Border inside pin */}
                        <circle cx={workerCoords.x} cy={workerCoords.y} r="8" fill="#ffffff" />
                        <text x={workerCoords.x} y={workerCoords.y + 3} fill="white" fontSize="9" fontWeight="950" textAnchor="middle">
                          {selectedWorker.fullName.charAt(0)}
                        </text>
                      </g>
                    ) : (
                      <g>
                        {/* Offline Static Marker */}
                        <circle cx="120" cy="150" r="6" fill="#475569" />
                        <text x="120" y="170" fill="#475569" fontSize="9" fontWeight="600" textAnchor="middle">Offline</text>
                      </g>
                    )}
                  </svg>

                  {/* Satellite status info overlay */}
                  <div style={{ position: "absolute", bottom: 12, left: 16, background: "rgba(255, 255, 255, 0.85)", border: "1px solid var(--border)", borderRadius: 10, padding: "8px 12px", zIndex: 3, display: "flex", gap: 14 }}>
                    <div>
                      <span style={{ fontSize: 8, color: "var(--dim)", textTransform: "uppercase", fontWeight: 700 }}>Telemetry Link</span>
                      <p style={{ margin: "2px 0 0", fontSize: 10, color: selectedWorker.status === "active" ? "#4ade80" : "#64748b", fontWeight: 800 }}>
                        {selectedWorker.status === "active" ? "🟢 ACTIVE (9 Sats)" : "⚫ STANDBY"}
                      </p>
                    </div>
                    <div style={{ width: 1, background: "rgba(255,255,255,0.1)" }} />
                    <div>
                      <span style={{ fontSize: 8, color: "var(--dim)", textTransform: "uppercase", fontWeight: 700 }}>Drift Speed</span>
                      <p style={{ margin: "2px 0 0", fontSize: 10, color: selectedWorker.status === "active" ? "#06b6d4" : "#64748b", fontWeight: 800 }}>
                        {selectedWorker.status === "active" ? "1.2 m/s" : "0.0 m/s"}
                      </p>
                    </div>
                  </div>
                </div>

                {/* Bottom Stats Sheet */}
                <div style={{ padding: 20, background: "linear-gradient(180deg, #ffffff 0%, #f8fafc 100%)", borderTop: "1px solid var(--border)" }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 14 }}>
                    <div>
                      <h4 style={{ fontSize: 15, fontWeight: 900, color: "var(--text)", margin: 0 }}>{selectedWorker.fullName}</h4>
                      <p style={{ fontSize: 11, color: "var(--dim)", margin: "2px 0 0" }}>{selectedWorker.projectName}</p>
                    </div>
                    {selectedWorker.status === "active" ? (
                      <span style={{ background: selectedWorker.withinGeofence ? "rgba(34,197,94,0.12)" : "rgba(245,158,11,0.12)", color: selectedWorker.withinGeofence ? "#4ade80" : "#fbbf24", border: `1px solid ${selectedWorker.withinGeofence ? "rgba(34,197,94,0.2)" : "rgba(245,158,11,0.2)"}`, borderRadius: 6, padding: "3px 8px", fontSize: 10, fontWeight: 800, textTransform: "uppercase" }}>
                        {selectedWorker.withinGeofence ? "Within Site Geofence" : "Outside Geofence"}
                      </span>
                    ) : (
                      <span style={{ background: "var(--surface)", color: "var(--dim)", border: "1px solid var(--border)", borderRadius: 6, padding: "3px 8px", fontSize: 10, fontWeight: 800, textTransform: "uppercase" }}>
                        Offline
                      </span>
                    )}
                  </div>

                  {selectedWorker.status === "active" ? (
                    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                      <div className="glass" style={{ padding: "10px 12px", border: "1px solid var(--border)", borderRadius: 10 }}>
                        <span style={{ fontSize: 8, color: "var(--dim)", textTransform: "uppercase", fontWeight: 700 }}>Telemetry Coordinates</span>
                        <p style={{ margin: "2px 0 0", fontSize: 11, fontWeight: 700, fontFamily: "monospace", color: "var(--text)" }}>
                          {selectedWorker.latitude.toFixed(6)}° N<br/>
                          {selectedWorker.longitude.toFixed(6)}° E
                        </p>
                      </div>
                      <div className="glass" style={{ padding: "10px 12px", border: "1px solid var(--border)", borderRadius: 10 }}>
                        <span style={{ fontSize: 8, color: "var(--dim)", textTransform: "uppercase", fontWeight: 700 }}>Proximity Distance</span>
                        <p style={{ margin: "2px 0 0", fontSize: 16, fontWeight: 900, color: "#a78bfa" }}>
                          {selectedWorker.distanceFromSiteM} <span style={{ fontSize: 10, fontWeight: 600 }}>meters</span>
                        </p>
                      </div>
                    </div>
                  ) : (
                    <div className="glass" style={{ padding: 14, borderRadius: 10, border: "1px solid var(--border)", textAlign: "center", color: "var(--dim)", fontSize: 12 }}>
                      ⚠️ Roster member is currently standby off-duty. No live tracking coordinates available.
                    </div>
                  )}

                  <button 
                    onClick={() => setSelectedWorker(null)}
                    style={{
                      width: "100%",
                      minHeight: 40,
                      background: "var(--surface)",
                      border: "1px solid var(--border)",
                      borderRadius: 10,
                      color: "var(--muted)",
                      fontSize: 12,
                      fontWeight: 700,
                      cursor: "pointer",
                      marginTop: 14,
                      fontFamily: "Outfit, sans-serif"
                    }}
                  >
                    ← Back to Active Roster
                  </button>
                </div>
              </div>
            ) : (
              <div style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: 30, background: "var(--surface)", color: "var(--dim)", textAlign: "center" }}>
                <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="#1e293b" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ marginBottom: 16 }}><path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z"/><circle cx="12" cy="10" r="3"/></svg>
                <p style={{ fontSize: 13, color: "var(--muted)", margin: 0, maxWidth: 280 }}>
                  Select an active supervisor or finance controller from the field roster above to initialize their Zomato-style live tracking radar path.
                </p>
              </div>
            )}
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
    </div>
  );
}

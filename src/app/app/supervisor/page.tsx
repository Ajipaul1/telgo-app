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

  const [isDailyReportOpen, setIsDailyReportOpen] = useState(false);
  const [reportStep, setReportStep] = useState(1);
  const [reportProjectId, setReportProjectId] = useState("");
  const [reportDate, setReportDate] = useState("");
  
  const [laborCount, setLaborCount] = useState(0);
  const [otHours, setOtHours] = useState(0);
  const [fuelExpenses, setFuelExpenses] = useState("");
  const [travelExpenses, setTravelExpenses] = useState("");
  const [roomRent, setRoomRent] = useState("");
  const [roomRentReceipt, setRoomRentReceipt] = useState("");
  const [toolRent, setToolRent] = useState("");
  const [toolRentReceipt, setToolRentReceipt] = useState("");

  const [excavationLength, setExcavationLength] = useState("");
  const [hddLength, setHddLength] = useState("");
  const [cableLayingLength, setCableLayingLength] = useState("");
  const [cableMoundingLength, setCableMoundingLength] = useState("");
  const [joiningLinksCompleted, setJoiningLinksCompleted] = useState("");
  const [rmuFoundationStatus, setRmuFoundationStatus] = useState("");
  const [terminationEndpoints, setTerminationEndpoints] = useState("");
  const [terminationGpsLat, setTerminationGpsLat] = useState("");
  const [terminationGpsLng, setTerminationGpsLng] = useState("");

  const [pwdClearance, setPwdClearance] = useState("None");
  const [pwdReceipt, setPwdReceipt] = useState("");
  const [ksebClearance, setKsebClearance] = useState("None");
  const [ksebReceipt, setKsebReceipt] = useState("");
  const [nhClearance, setNhClearance] = useState("None");
  const [nhReceipt, setNhReceipt] = useState("");

  const [submittingReport, setSubmittingReport] = useState(false);

  const compressImage = (file: File): Promise<string> => {
    return new Promise((resolve) => {
      const reader = new FileReader();
      reader.onload = (e) => {
        const img = new Image();
        img.onload = () => {
          const canvas = document.createElement("canvas");
          let width = img.width;
          let height = img.height;
          const maxDim = 1200;
          if (width > maxDim || height > maxDim) {
            if (width > height) {
              height = Math.round((height * maxDim) / width);
              width = maxDim;
            } else {
              width = Math.round((width * maxDim) / height);
              height = maxDim;
            }
          }
          canvas.width = width;
          canvas.height = height;
          const ctx = canvas.getContext("2d");
          if (ctx) {
            ctx.drawImage(img, 0, 0, width, height);
            resolve(canvas.toDataURL("image/jpeg", 0.7));
          } else {
            resolve(String(e.target?.result || ""));
          }
        };
        img.src = String(e.target?.result || "");
      };
      reader.readAsDataURL(file);
    });
  };

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

  useEffect(() => {
    if (!reportProjectId) return;
    const saved = localStorage.getItem(`telgo_draft_report_${reportProjectId}`);
    if (saved) {
      try {
        const d = JSON.parse(saved);
        setReportDate(d.reportDate || "");
        setLaborCount(Number(d.laborCount || 0));
        setOtHours(Number(d.otHours || 0));
        setFuelExpenses(d.fuelExpenses || "");
        setTravelExpenses(d.travelExpenses || "");
        setRoomRent(d.roomRent || "");
        setRoomRentReceipt(d.roomRentReceipt || "");
        setToolRent(d.toolRent || "");
        setToolRentReceipt(d.toolRentReceipt || "");
        setExcavationLength(d.excavationLength || "");
        setHddLength(d.hddLength || "");
        setCableLayingLength(d.cableLayingLength || "");
        setCableMoundingLength(d.cableMoundingLength || "");
        setJoiningLinksCompleted(d.joiningLinksCompleted || "");
        setRmuFoundationStatus(d.rmuFoundationStatus || "");
        setTerminationEndpoints(d.terminationEndpoints || "");
        setTerminationGpsLat(d.terminationGpsLat || "");
        setTerminationGpsLng(d.terminationGpsLng || "");
        setPwdClearance(d.pwdClearance || "None");
        setPwdReceipt(d.pwdReceipt || "");
        setKsebClearance(d.ksebClearance || "None");
        setKsebReceipt(d.ksebReceipt || "");
        setNhClearance(d.nhClearance || "None");
        setNhReceipt(d.nhReceipt || "");
      } catch (e) {
        console.error("Error parsing report draft:", e);
      }
    } else {
      setReportDate("");
      setLaborCount(0);
      setOtHours(0);
      setFuelExpenses("");
      setTravelExpenses("");
      setRoomRent("");
      setRoomRentReceipt("");
      setToolRent("");
      setToolRentReceipt("");
      setExcavationLength("");
      setHddLength("");
      setCableLayingLength("");
      setCableMoundingLength("");
      setJoiningLinksCompleted("");
      setRmuFoundationStatus("");
      setTerminationEndpoints("");
      setTerminationGpsLat("");
      setTerminationGpsLng("");
      setPwdClearance("None");
      setPwdReceipt("");
      setKsebClearance("None");
      setKsebReceipt("");
      setNhClearance("None");
      setNhReceipt("");
    }
  }, [reportProjectId]);

  useEffect(() => {
    if (!reportProjectId) return;
    const draft = {
      reportDate,
      laborCount,
      otHours,
      fuelExpenses,
      travelExpenses,
      roomRent,
      roomRentReceipt,
      toolRent,
      toolRentReceipt,
      excavationLength,
      hddLength,
      cableLayingLength,
      cableMoundingLength,
      joiningLinksCompleted,
      rmuFoundationStatus,
      terminationEndpoints,
      terminationGpsLat,
      terminationGpsLng,
      pwdClearance,
      pwdReceipt,
      ksebClearance,
      ksebReceipt,
      nhClearance,
      nhReceipt
    };
    localStorage.setItem(`telgo_draft_report_${reportProjectId}`, JSON.stringify(draft));
  }, [
    reportProjectId,
    reportDate,
    laborCount,
    otHours,
    fuelExpenses,
    travelExpenses,
    roomRent,
    roomRentReceipt,
    toolRent,
    toolRentReceipt,
    excavationLength,
    hddLength,
    cableLayingLength,
    cableMoundingLength,
    joiningLinksCompleted,
    rmuFoundationStatus,
    terminationEndpoints,
    terminationGpsLat,
    terminationGpsLng,
    pwdClearance,
    pwdReceipt,
    ksebClearance,
    ksebReceipt,
    nhClearance,
    nhReceipt
  ]);

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
          grid-template-columns: repeat(2, 1fr);
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
                            
                            L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png', {
                              maxZoom: 20
                            }).addTo(map);

                            // Primary Route (Purple utilityPath if present, else Teal line)
                            const customUtility = ${JSON.stringify(selectedProjectItem.utilityPath ?? [])};
                            if (customUtility && customUtility.length >= 2) {
                              L.polyline(customUtility, { color: '#a855f7', weight: 4, opacity: 0.95, lineJoin: 'round' }).addTo(map);
                            } else {
                              L.polyline([start, end], { color: '#06b6d4', weight: 4, opacity: 0.8, lineJoin: 'round' }).addTo(map);
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

              {/* MODULE 4: DAILY REPORT WIZARD (Interactive) */}
              <div 
                onClick={() => {
                  if (projectsList.length > 0) {
                    setReportProjectId(projectsList[0].id);
                  }
                  setIsDailyReportOpen(true);
                  setReportStep(1);
                }}
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
                  background: "rgba(245, 158, 11, 0.08)",
                  border: "1px solid rgba(245, 158, 11, 0.2)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  flexShrink: 0
                }}>
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#fbbf24" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
                    <polyline points="14 2 14 8 20 8"/>
                    <line x1="16" y1="13" x2="8" y2="13"/>
                    <line x1="16" y1="17" x2="8" y2="17"/>
                    <polyline points="10 9 9 9 8 9"/>
                  </svg>
                </div>
                <div>
                  <h4 style={{ fontSize: 13, fontWeight: 800, color: "#f1f5f9", margin: "0 0 2px" }}>Daily Report</h4>
                  <span style={{ fontSize: 9, color: "#fbbf24", fontWeight: 700 }}>Site Update</span>
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

      {isDailyReportOpen && (
        <div style={{
          position: "fixed",
          inset: 0,
          background: "rgba(6, 9, 18, 0.9)",
          backdropFilter: "blur(14px)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          padding: "20px 10px",
          zIndex: 1000,
          fontFamily: "Outfit, sans-serif",
          overflowY: "auto"
        }}>
          <div className="glass fade-in" style={{
            width: "100%",
            maxWidth: 440,
            background: "linear-gradient(135deg, #0e0828 0%, #060912 100%)",
            border: "1px solid rgba(255,255,255,0.08)",
            borderRadius: 24,
            padding: "24px 20px",
            boxShadow: "0 24px 64px rgba(0,0,0,0.8)",
            maxHeight: "92dvh",
            display: "flex",
            flexDirection: "column",
            gap: 16
          }}>
            {/* Modal Header */}
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", borderBottom: "1px solid rgba(255,255,255,0.06)", paddingBottom: 12 }}>
              <div>
                <span style={{ fontSize: 9, fontWeight: 800, color: "#fbbf24", textTransform: "uppercase", letterSpacing: "0.1em" }}>DAILY OPERATION HUB</span>
                <h3 style={{ fontSize: 16, fontWeight: 900, color: "#f1f5f9", margin: "2px 0 0" }}>Daily Report Wizard</h3>
              </div>
              <button 
                onClick={() => {
                  if (confirm("Are you sure you want to dismiss the daily report wizard? Your inputs will remain saved as a local draft.")) {
                    setIsDailyReportOpen(false);
                  }
                }}
                style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)", width: 28, height: 28, borderRadius: "50%", color: "#94a3b8", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
              </button>
            </div>

            {/* Step Progress Bar */}
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.04)", padding: "10px 14px", borderRadius: 14 }}>
              {[1, 2, 3, 4].map((step) => (
                <div key={step} style={{ display: "flex", alignItems: "center", gap: 6 }}>
                  <div style={{
                    width: 22,
                    height: 22,
                    borderRadius: "50%",
                    background: reportStep === step ? "linear-gradient(135deg, #06b6d4, #7c3aed)" : reportStep > step ? "#10b981" : "rgba(255,255,255,0.05)",
                    border: reportStep === step ? "none" : "1px solid rgba(255,255,255,0.1)",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    fontSize: 10,
                    fontWeight: 800,
                    color: "white"
                  }}>
                    {reportStep > step ? "✓" : step}
                  </div>
                  {step < 4 && <div style={{ width: 14, height: 1, background: reportStep > step ? "#10b981" : "rgba(255,255,255,0.08)" }} />}
                </div>
              ))}
              <span style={{ fontSize: 10, fontWeight: 800, color: "#64748b", textTransform: "uppercase" }}>
                Step {reportStep} of 4
              </span>
            </div>

            {/* Scrollable Wizard Body */}
            <div style={{ flex: 1, overflowY: "auto", paddingRight: 4, display: "flex", flexDirection: "column", gap: 14, textAlign: "left" }}>
              
              {/* STEP 1: SELECT PROJECT, DATE & EXPENSES */}
              {reportStep === 1 && (
                <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                  <h4 style={{ fontSize: 12, fontWeight: 800, color: "#fbbf24", textTransform: "uppercase", margin: "0 0 4px" }}>Step A: Project & Wages/Expenses</h4>
                  
                  {/* Project Selector */}
                  <div>
                    <label style={{ display: "block", fontSize: 11, fontWeight: 700, color: "#94a3b8", marginBottom: 6, textTransform: "uppercase" }}>Project Corridor</label>
                    <select
                      value={reportProjectId}
                      onChange={(e) => setReportProjectId(e.target.value)}
                      style={{ width: "100%", height: 38, background: "#060912", border: "1px solid rgba(255,255,255,0.08)", borderRadius: 10, padding: "0 10px", color: "#cbd5e1", fontSize: 12, outline: "none", cursor: "pointer" }}
                    >
                      {projectsList.map((p) => (
                        <option key={p.id} value={p.id}>{p.name} ({p.code})</option>
                      ))}
                    </select>
                  </div>

                  {/* Date picker */}
                  <div>
                    <label style={{ display: "block", fontSize: 11, fontWeight: 700, color: "#94a3b8", marginBottom: 6, textTransform: "uppercase" }}>Report Date</label>
                    <input
                      type="date"
                      value={reportDate}
                      onChange={(e) => setReportDate(e.target.value)}
                      max={new Date().toISOString().split("T")[0]}
                      min={(() => {
                        const d = new Date();
                        d.setDate(d.getDate() - 7);
                        return d.toISOString().split("T")[0];
                      })()}
                      style={{ width: "100%", height: 38, background: "#060912", border: "1px solid rgba(255,255,255,0.08)", borderRadius: 10, padding: "0 10px", color: "#cbd5e1", fontSize: 12, outline: "none" }}
                      required
                    />
                    <span style={{ fontSize: 9, color: "#64748b", display: "block", marginTop: 4 }}>Maximum submission range is today or up to 7 days in the past.</span>
                  </div>

                  {/* Wages Counter logic */}
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.04)", padding: 12, borderRadius: 14 }}>
                    <div>
                      <label style={{ display: "block", fontSize: 10, fontWeight: 700, color: "#94a3b8", marginBottom: 6, textTransform: "uppercase" }}>Workers Count</label>
                      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                        <button type="button" onClick={() => setLaborCount(Math.max(0, laborCount - 1))} style={{ width: 28, height: 28, borderRadius: 6, border: "1px solid rgba(255,255,255,0.1)", background: "rgba(255,255,255,0.04)", color: "white", cursor: "pointer", fontWeight: 900 }}>-</button>
                        <input
                          type="number"
                          value={laborCount}
                          onChange={(e) => setLaborCount(Math.max(0, parseInt(e.target.value) || 0))}
                          style={{ width: 40, height: 28, background: "transparent", border: "none", color: "white", fontSize: 14, fontWeight: 800, textAlign: "center", outline: "none" }}
                        />
                        <button type="button" onClick={() => setLaborCount(laborCount + 1)} style={{ width: 28, height: 28, borderRadius: 6, border: "1px solid rgba(255,255,255,0.1)", background: "rgba(255,255,255,0.04)", color: "white", cursor: "pointer", fontWeight: 900 }}>+</button>
                      </div>
                    </div>
                    <div>
                      <label style={{ display: "block", fontSize: 10, fontWeight: 700, color: "#94a3b8", marginBottom: 6, textTransform: "uppercase" }}>Overtime Hours</label>
                      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                        <button type="button" onClick={() => setOtHours(Math.max(0, otHours - 1))} style={{ width: 28, height: 28, borderRadius: 6, border: "1px solid rgba(255,255,255,0.1)", background: "rgba(255,255,255,0.04)", color: "white", cursor: "pointer", fontWeight: 900 }}>-</button>
                        <input
                          type="number"
                          value={otHours}
                          onChange={(e) => setOtHours(Math.max(0, parseInt(e.target.value) || 0))}
                          style={{ width: 40, height: 28, background: "transparent", border: "none", color: "white", fontSize: 14, fontWeight: 800, textAlign: "center", outline: "none" }}
                        />
                        <button type="button" onClick={() => setOtHours(otHours + 1)} style={{ width: 28, height: 28, borderRadius: 6, border: "1px solid rgba(255,255,255,0.1)", background: "rgba(255,255,255,0.04)", color: "white", cursor: "pointer", fontWeight: 900 }}>+</button>
                      </div>
                    </div>
                    
                    {/* Live wages display */}
                    <div style={{ gridColumn: "span 2", borderTop: "1px solid rgba(255,255,255,0.05)", paddingTop: 10, marginTop: 4, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                      <div>
                        <span style={{ fontSize: 10, color: "#64748b", fontWeight: 800, textTransform: "uppercase" }}>Calculated Wages</span>
                        <p style={{ margin: 0, fontSize: 8, color: "#64748b" }}>(₹900/worker + ₹150/OT-hour)</p>
                      </div>
                      <span style={{ fontSize: 18, fontWeight: 900, color: "#10b981", letterSpacing: "-0.5px" }}>
                        ₹{(laborCount * 900) + (otHours * 150)}
                      </span>
                    </div>
                  </div>

                  {/* Operational Expenses */}
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
                    <div>
                      <label style={{ display: "block", fontSize: 11, fontWeight: 700, color: "#94a3b8", marginBottom: 6, textTransform: "uppercase" }}>Fuel Expense (₹)</label>
                      <input
                        type="number"
                        placeholder="0.00"
                        value={fuelExpenses}
                        onChange={(e) => setFuelExpenses(e.target.value)}
                        style={{ width: "100%", height: 38, background: "#060912", border: "1px solid rgba(255,255,255,0.08)", borderRadius: 10, padding: "0 10px", color: "#cbd5e1", fontSize: 12, outline: "none" }}
                      />
                    </div>
                    <div>
                      <label style={{ display: "block", fontSize: 11, fontWeight: 700, color: "#94a3b8", marginBottom: 6, textTransform: "uppercase" }}>Travel Expense (₹)</label>
                      <input
                        type="number"
                        placeholder="0.00"
                        value={travelExpenses}
                        onChange={(e) => setTravelExpenses(e.target.value)}
                        style={{ width: "100%", height: 38, background: "#060912", border: "1px solid rgba(255,255,255,0.08)", borderRadius: 10, padding: "0 10px", color: "#cbd5e1", fontSize: 12, outline: "none" }}
                      />
                    </div>
                  </div>

                  {/* Room rent + Receipt */}
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, background: "rgba(255,255,255,0.01)", border: "1px solid rgba(255,255,255,0.03)", padding: 10, borderRadius: 12 }}>
                    <div>
                      <label style={{ display: "block", fontSize: 11, fontWeight: 700, color: "#94a3b8", marginBottom: 6, textTransform: "uppercase" }}>Room Rent (₹)</label>
                      <input
                        type="number"
                        placeholder="0.00"
                        value={roomRent}
                        onChange={(e) => setRoomRent(e.target.value)}
                        style={{ width: "100%", height: 34, background: "#060912", border: "1px solid rgba(255,255,255,0.08)", borderRadius: 8, padding: "0 8px", color: "#cbd5e1", fontSize: 12, outline: "none" }}
                      />
                    </div>
                    <div>
                      <label style={{ display: "block", fontSize: 11, fontWeight: 700, color: "#94a3b8", marginBottom: 6, textTransform: "uppercase" }}>Rent Receipt</label>
                      <label style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 6, width: "100%", height: 34, background: roomRentReceipt ? "rgba(16,185,129,0.08)" : "rgba(255,255,255,0.03)", border: roomRentReceipt ? "1px dashed #10b981" : "1px dashed rgba(255,255,255,0.15)", borderRadius: 8, color: roomRentReceipt ? "#10b981" : "#cbd5e1", fontSize: 11, fontWeight: 700, cursor: "pointer", transition: "all 0.2s" }}>
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M21.44 11.05l-9.19 9.19a6 6 0 0 1-8.49-8.49l9.19-9.19a4 4 0 0 1 5.66 5.66l-9.2 9.19a2 2 0 0 1-2.83-2.83l8.49-8.48"/></svg>
                        {roomRentReceipt ? "Receipt ✓" : "Upload File"}
                        <input
                          type="file"
                          accept="image/*"
                          onChange={async (e) => {
                            const file = e.target.files?.[0];
                            if (file) {
                              const compressed = await compressImage(file);
                              setRoomRentReceipt(compressed);
                            }
                          }}
                          style={{ display: "none" }}
                        />
                      </label>
                    </div>
                  </div>

                  {/* Tool rent + Receipt */}
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, background: "rgba(255,255,255,0.01)", border: "1px solid rgba(255,255,255,0.03)", padding: 10, borderRadius: 12 }}>
                    <div>
                      <label style={{ display: "block", fontSize: 11, fontWeight: 700, color: "#94a3b8", marginBottom: 6, textTransform: "uppercase" }}>Tool Rent (₹)</label>
                      <input
                        type="number"
                        placeholder="0.00"
                        value={toolRent}
                        onChange={(e) => setToolRent(e.target.value)}
                        style={{ width: "100%", height: 34, background: "#060912", border: "1px solid rgba(255,255,255,0.08)", borderRadius: 8, padding: "0 8px", color: "#cbd5e1", fontSize: 12, outline: "none" }}
                      />
                    </div>
                    <div>
                      <label style={{ display: "block", fontSize: 11, fontWeight: 700, color: "#94a3b8", marginBottom: 6, textTransform: "uppercase" }}>Rent Receipt</label>
                      <label style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 6, width: "100%", height: 34, background: toolRentReceipt ? "rgba(16,185,129,0.08)" : "rgba(255,255,255,0.03)", border: toolRentReceipt ? "1px dashed #10b981" : "1px dashed rgba(255,255,255,0.15)", borderRadius: 8, color: toolRentReceipt ? "#10b981" : "#cbd5e1", fontSize: 11, fontWeight: 700, cursor: "pointer", transition: "all 0.2s" }}>
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M21.44 11.05l-9.19 9.19a6 6 0 0 1-8.49-8.49l9.19-9.19a4 4 0 0 1 5.66 5.66l-9.2 9.19a2 2 0 0 1-2.83-2.83l8.49-8.48"/></svg>
                        {toolRentReceipt ? "Receipt ✓" : "Upload File"}
                        <input
                          type="file"
                          accept="image/*"
                          onChange={async (e) => {
                            const file = e.target.files?.[0];
                            if (file) {
                              const compressed = await compressImage(file);
                              setToolRentReceipt(compressed);
                            }
                          }}
                          style={{ display: "none" }}
                        />
                      </label>
                    </div>
                  </div>
                </div>
              )}

              {/* STEP 2: WIP PROGRESS (TRENCHING & TERMINATIONS) */}
              {reportStep === 2 && (
                <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                  <h4 style={{ fontSize: 12, fontWeight: 800, color: "#fbbf24", textTransform: "uppercase", margin: "0 0 4px" }}>Step B: WIP operational progress</h4>

                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
                    <div>
                      <label style={{ display: "block", fontSize: 11, fontWeight: 700, color: "#94a3b8", marginBottom: 6, textTransform: "uppercase" }}>Trenching / Excavation (m)</label>
                      <input
                        type="number"
                        placeholder="0.00"
                        value={excavationLength}
                        onChange={(e) => setExcavationLength(e.target.value)}
                        style={{ width: "100%", height: 38, background: "#060912", border: "1px solid rgba(255,255,255,0.08)", borderRadius: 10, padding: "0 10px", color: "#cbd5e1", fontSize: 12, outline: "none" }}
                      />
                    </div>
                    <div>
                      <label style={{ display: "block", fontSize: 11, fontWeight: 700, color: "#94a3b8", marginBottom: 6, textTransform: "uppercase" }}>HDD Drilling (m)</label>
                      <input
                        type="number"
                        placeholder="0.00"
                        value={hddLength}
                        onChange={(e) => setHddLength(e.target.value)}
                        style={{ width: "100%", height: 38, background: "#060912", border: "1px solid rgba(255,255,255,0.08)", borderRadius: 10, padding: "0 10px", color: "#cbd5e1", fontSize: 12, outline: "none" }}
                      />
                    </div>
                  </div>

                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
                    <div>
                      <label style={{ display: "block", fontSize: 11, fontWeight: 700, color: "#94a3b8", marginBottom: 6, textTransform: "uppercase" }}>Cable Laying (m)</label>
                      <input
                        type="number"
                        placeholder="0.00"
                        value={cableLayingLength}
                        onChange={(e) => setCableLayingLength(e.target.value)}
                        style={{ width: "100%", height: 38, background: "#060912", border: "1px solid rgba(255,255,255,0.08)", borderRadius: 10, padding: "0 10px", color: "#cbd5e1", fontSize: 12, outline: "none" }}
                      />
                    </div>
                    <div>
                      <label style={{ display: "block", fontSize: 11, fontWeight: 700, color: "#94a3b8", marginBottom: 6, textTransform: "uppercase" }}>Cable Mounding (m)</label>
                      <input
                        type="number"
                        placeholder="0.00"
                        value={cableMoundingLength}
                        onChange={(e) => setCableMoundingLength(e.target.value)}
                        style={{ width: "100%", height: 38, background: "#060912", border: "1px solid rgba(255,255,255,0.08)", borderRadius: 10, padding: "0 10px", color: "#cbd5e1", fontSize: 12, outline: "none" }}
                      />
                    </div>
                  </div>

                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
                    <div>
                      <label style={{ display: "block", fontSize: 11, fontWeight: 700, color: "#94a3b8", marginBottom: 6, textTransform: "uppercase" }}>Joining Links Completed</label>
                      <input
                        type="number"
                        placeholder="0"
                        value={joiningLinksCompleted}
                        onChange={(e) => setJoiningLinksCompleted(e.target.value)}
                        style={{ width: "100%", height: 38, background: "#060912", border: "1px solid rgba(255,255,255,0.08)", borderRadius: 10, padding: "0 10px", color: "#cbd5e1", fontSize: 12, outline: "none" }}
                      />
                    </div>
                    <div>
                      <label style={{ display: "block", fontSize: 11, fontWeight: 700, color: "#94a3b8", marginBottom: 6, textTransform: "uppercase" }}>RMU Foundations</label>
                      <input
                        type="number"
                        placeholder="0"
                        value={rmuFoundationStatus}
                        onChange={(e) => setRmuFoundationStatus(e.target.value)}
                        style={{ width: "100%", height: 38, background: "#060912", border: "1px solid rgba(255,255,255,0.08)", borderRadius: 10, padding: "0 10px", color: "#cbd5e1", fontSize: 12, outline: "none" }}
                      />
                    </div>
                  </div>

                  {/* GPS Terminations and Snapped Coordinates */}
                  <div style={{ background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.04)", padding: 12, borderRadius: 14 }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
                      <label style={{ fontSize: 11, fontWeight: 700, color: "#94a3b8", textTransform: "uppercase", margin: 0 }}>Termination Endpoints</label>
                      <button
                        type="button"
                        onClick={() => {
                          if (navigator.geolocation) {
                            showToast("⏳ Fetching accurate coordinates...");
                            navigator.geolocation.getCurrentPosition(
                              (p) => {
                                setTerminationGpsLat(p.coords.latitude.toFixed(6));
                                setTerminationGpsLng(p.coords.longitude.toFixed(6));
                                showToast("✓ GPS Coordinates fetched and synchronized!");
                              },
                              (err) => {
                                showToast(`❌ GPS fetch failed: ${err.message}`);
                              },
                              { enableHighAccuracy: true, timeout: 8000 }
                            );
                          } else {
                            showToast("❌ Geolocation not supported by device.");
                          }
                        }}
                        style={{ fontSize: 10, fontWeight: 800, color: "#06b6d4", background: "rgba(6, 182, 212, 0.08)", border: "1px solid rgba(6, 182, 212, 0.2)", borderRadius: 6, padding: "3px 8px", cursor: "pointer" }}
                      >
                        ⚡ Fetch GPS Coords
                      </button>
                    </div>

                    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 8 }}>
                      <div>
                        <span style={{ fontSize: 9, color: "#64748b", fontWeight: 700 }}>Endpoints (Qty)</span>
                        <input
                          type="number"
                          placeholder="0"
                          value={terminationEndpoints}
                          onChange={(e) => setTerminationEndpoints(e.target.value)}
                          style={{ width: "100%", height: 34, background: "#060912", border: "1px solid rgba(255,255,255,0.08)", borderRadius: 8, padding: "0 8px", color: "#cbd5e1", fontSize: 12, outline: "none", marginTop: 4 }}
                        />
                      </div>
                      <div>
                        <span style={{ fontSize: 9, color: "#64748b", fontWeight: 700 }}>Latitude</span>
                        <input
                          type="number"
                          step="0.000001"
                          placeholder="9.9538"
                          value={terminationGpsLat}
                          onChange={(e) => setTerminationGpsLat(e.target.value)}
                          style={{ width: "100%", height: 34, background: "#060912", border: "1px solid rgba(255,255,255,0.08)", borderRadius: 8, padding: "0 8px", color: "#cbd5e1", fontSize: 11, outline: "none", marginTop: 4 }}
                        />
                      </div>
                      <div>
                        <span style={{ fontSize: 9, color: "#64748b", fontWeight: 700 }}>Longitude</span>
                        <input
                          type="number"
                          step="0.000001"
                          placeholder="76.3428"
                          value={terminationGpsLng}
                          onChange={(e) => setTerminationGpsLng(e.target.value)}
                          style={{ width: "100%", height: 34, background: "#060912", border: "1px solid rgba(255,255,255,0.08)", borderRadius: 8, padding: "0 8px", color: "#cbd5e1", fontSize: 11, outline: "none", marginTop: 4 }}
                        />
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* STEP 3: STATUTORY CLEARANCES */}
              {reportStep === 3 && (
                <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                  <h4 style={{ fontSize: 12, fontWeight: 800, color: "#fbbf24", textTransform: "uppercase", margin: "0 0 4px" }}>Step C: Clearance & Authority Approvals</h4>
                  
                  {/* PWD */}
                  <div style={{ background: "rgba(255,255,255,0.01)", border: "1px solid rgba(255,255,255,0.04)", padding: 12, borderRadius: 14, display: "flex", flexDirection: "column", gap: 8 }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                      <span style={{ fontSize: 12, fontWeight: 800, color: "#cbd5e1" }}>PWD Authority</span>
                      <span style={{ fontSize: 9, fontWeight: 700, color: pwdClearance === "Permission Gathered" ? "#10b981" : pwdClearance === "Demand Issued" ? "#fbbf24" : "#64748b" }}>{pwdClearance}</span>
                    </div>
                    <div style={{ display: "grid", gridTemplateColumns: "1.2fr 1fr", gap: 8 }}>
                      <select
                        value={pwdClearance}
                        onChange={(e) => setPwdClearance(e.target.value)}
                        style={{ height: 34, background: "#060912", border: "1px solid rgba(255,255,255,0.08)", borderRadius: 8, padding: "0 6px", color: "#cbd5e1", fontSize: 11, cursor: "pointer" }}
                      >
                        <option value="None">None / Initiated</option>
                        <option value="Demand Issued">Demand Note Issued</option>
                        <option value="Permission Gathered">Permission Gathered</option>
                      </select>
                      <label style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 6, height: 34, background: pwdReceipt ? "rgba(16,185,129,0.08)" : "rgba(255,255,255,0.03)", border: pwdReceipt ? "1px dashed #10b981" : "1px dashed rgba(255,255,255,0.15)", borderRadius: 8, color: pwdReceipt ? "#10b981" : "#cbd5e1", fontSize: 10, fontWeight: 700, cursor: "pointer" }}>
                        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M21.44 11.05l-9.19 9.19a6 6 0 0 1-8.49-8.49l9.19-9.19a4 4 0 0 1 5.66 5.66l-9.2 9.19a2 2 0 0 1-2.83-2.83l8.49-8.48"/></svg>
                        {pwdReceipt ? "Receipt ✓" : "Upload File"}
                        <input
                          type="file"
                          accept="image/*"
                          onChange={async (e) => {
                            const file = e.target.files?.[0];
                            if (file) {
                              const compressed = await compressImage(file);
                              setPwdReceipt(compressed);
                            }
                          }}
                          style={{ display: "none" }}
                        />
                      </label>
                    </div>
                  </div>

                  {/* KSEB */}
                  <div style={{ background: "rgba(255,255,255,0.01)", border: "1px solid rgba(255,255,255,0.04)", padding: 12, borderRadius: 14, display: "flex", flexDirection: "column", gap: 8 }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                      <span style={{ fontSize: 12, fontWeight: 800, color: "#cbd5e1" }}>KSEB Grid Access</span>
                      <span style={{ fontSize: 9, fontWeight: 700, color: ksebClearance === "Permission Gathered" ? "#10b981" : ksebClearance === "Demand Issued" ? "#fbbf24" : "#64748b" }}>{ksebClearance}</span>
                    </div>
                    <div style={{ display: "grid", gridTemplateColumns: "1.2fr 1fr", gap: 8 }}>
                      <select
                        value={ksebClearance}
                        onChange={(e) => setKsebClearance(e.target.value)}
                        style={{ height: 34, background: "#060912", border: "1px solid rgba(255,255,255,0.08)", borderRadius: 8, padding: "0 6px", color: "#cbd5e1", fontSize: 11, cursor: "pointer" }}
                      >
                        <option value="None">None / Initiated</option>
                        <option value="Demand Issued">Demand Note Issued</option>
                        <option value="Permission Gathered">Permission Gathered</option>
                      </select>
                      <label style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 6, height: 34, background: ksebReceipt ? "rgba(16,185,129,0.08)" : "rgba(255,255,255,0.03)", border: ksebReceipt ? "1px dashed #10b981" : "1px dashed rgba(255,255,255,0.15)", borderRadius: 8, color: ksebReceipt ? "#10b981" : "#cbd5e1", fontSize: 10, fontWeight: 700, cursor: "pointer" }}>
                        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M21.44 11.05l-9.19 9.19a6 6 0 0 1-8.49-8.49l9.19-9.19a4 4 0 0 1 5.66 5.66l-9.2 9.19a2 2 0 0 1-2.83-2.83l8.49-8.48"/></svg>
                        {ksebReceipt ? "Receipt ✓" : "Upload File"}
                        <input
                          type="file"
                          accept="image/*"
                          onChange={async (e) => {
                            const file = e.target.files?.[0];
                            if (file) {
                              const compressed = await compressImage(file);
                              setKsebReceipt(compressed);
                            }
                          }}
                          style={{ display: "none" }}
                        />
                      </label>
                    </div>
                  </div>

                  {/* NH Authority */}
                  <div style={{ background: "rgba(255,255,255,0.01)", border: "1px solid rgba(255,255,255,0.04)", padding: 12, borderRadius: 14, display: "flex", flexDirection: "column", gap: 8 }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                      <span style={{ fontSize: 12, fontWeight: 800, color: "#cbd5e1" }}>National Highway</span>
                      <span style={{ fontSize: 9, fontWeight: 700, color: nhClearance === "Permission Gathered" ? "#10b981" : nhClearance === "Demand Issued" ? "#fbbf24" : "#64748b" }}>{nhClearance}</span>
                    </div>
                    <div style={{ display: "grid", gridTemplateColumns: "1.2fr 1fr", gap: 8 }}>
                      <select
                        value={nhClearance}
                        onChange={(e) => setNhClearance(e.target.value)}
                        style={{ height: 34, background: "#060912", border: "1px solid rgba(255,255,255,0.08)", borderRadius: 8, padding: "0 6px", color: "#cbd5e1", fontSize: 11, cursor: "pointer" }}
                      >
                        <option value="None">None / Initiated</option>
                        <option value="Demand Issued">Demand Note Issued</option>
                        <option value="Permission Gathered">Permission Gathered</option>
                      </select>
                      <label style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 6, height: 34, background: nhReceipt ? "rgba(16,185,129,0.08)" : "rgba(255,255,255,0.03)", border: nhReceipt ? "1px dashed #10b981" : "1px dashed rgba(255,255,255,0.15)", borderRadius: 8, color: nhReceipt ? "#10b981" : "#cbd5e1", fontSize: 10, fontWeight: 700, cursor: "pointer" }}>
                        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M21.44 11.05l-9.19 9.19a6 6 0 0 1-8.49-8.49l9.19-9.19a4 4 0 0 1 5.66 5.66l-9.2 9.19a2 2 0 0 1-2.83-2.83l8.49-8.48"/></svg>
                        {nhReceipt ? "Receipt ✓" : "Upload File"}
                        <input
                          type="file"
                          accept="image/*"
                          onChange={async (e) => {
                            const file = e.target.files?.[0];
                            if (file) {
                              const compressed = await compressImage(file);
                              setNhReceipt(compressed);
                            }
                          }}
                          style={{ display: "none" }}
                        />
                      </label>
                    </div>
                  </div>
                </div>
              )}

              {/* STEP 4: VERIFY & SUBMIT */}
              {reportStep === 4 && (
                <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                  <h4 style={{ fontSize: 12, fontWeight: 800, color: "#fbbf24", textTransform: "uppercase", margin: "0 0 4px" }}>Step D: Review operational draft</h4>
                  
                  {/* Category 1: Financials */}
                  <div style={{ background: "rgba(255,255,255,0.01)", border: "1px solid rgba(255,255,255,0.04)", padding: 12, borderRadius: 14 }}>
                    <span style={{ fontSize: 9, fontWeight: 800, color: "#06b6d4", textTransform: "uppercase", letterSpacing: "0.08em" }}>Wages & Expenses</span>
                    <div style={{ display: "flex", flexDirection: "column", gap: 5, marginTop: 8 }}>
                      <div style={{ display: "flex", justifyContent: "space-between", fontSize: 11 }}>
                        <span style={{ color: "#94a3b8" }}>Workers / Overtime</span>
                        <span style={{ color: "white", fontWeight: 700 }}>{laborCount} crew | {otHours} OT hrs</span>
                      </div>
                      <div style={{ display: "flex", justifyContent: "space-between", fontSize: 11 }}>
                        <span style={{ color: "#94a3b8" }}>Calculated Wages</span>
                        <span style={{ color: "#10b981", fontWeight: 800 }}>₹{(laborCount * 900) + (otHours * 150)}</span>
                      </div>
                      <div style={{ display: "flex", justifyContent: "space-between", fontSize: 11 }}>
                        <span style={{ color: "#94a3b8" }}>Fuel / Travel Expenses</span>
                        <span style={{ color: "white" }}>₹{fuelExpenses || "0"} / ₹{travelExpenses || "0"}</span>
                      </div>
                      <div style={{ display: "flex", justifyContent: "space-between", fontSize: 11 }}>
                        <span style={{ color: "#94a3b8" }}>Room / Tool Rent</span>
                        <span style={{ color: "white" }}>₹{roomRent || "0"} {roomRentReceipt ? "(📎)" : ""} / ₹{toolRent || "0"} {toolRentReceipt ? "(📎)" : ""}</span>
                      </div>
                    </div>
                  </div>

                  {/* Category 2: WIP lengths */}
                  <div style={{ background: "rgba(255,255,255,0.01)", border: "1px solid rgba(255,255,255,0.04)", padding: 12, borderRadius: 14 }}>
                    <span style={{ fontSize: 9, fontWeight: 800, color: "#06b6d4", textTransform: "uppercase", letterSpacing: "0.08em" }}>Physical Infrastructure Work</span>
                    <div style={{ display: "flex", flexDirection: "column", gap: 5, marginTop: 8 }}>
                      <div style={{ display: "flex", justifyContent: "space-between", fontSize: 11 }}>
                        <span style={{ color: "#94a3b8" }}>Trenching / Excavation</span>
                        <span style={{ color: "white", fontWeight: 700 }}>{excavationLength || "0"} m</span>
                      </div>
                      <div style={{ display: "flex", justifyContent: "space-between", fontSize: 11 }}>
                        <span style={{ color: "#94a3b8" }}>HDD Boring / Drilling</span>
                        <span style={{ color: "white", fontWeight: 700 }}>{hddLength || "0"} m</span>
                      </div>
                      <div style={{ display: "flex", justifyContent: "space-between", fontSize: 11 }}>
                        <span style={{ color: "#94a3b8" }}>Cable Laying / Mounding</span>
                        <span style={{ color: "white" }}>{cableLayingLength || "0"}m / {cableMoundingLength || "0"}m</span>
                      </div>
                      <div style={{ display: "flex", justifyContent: "space-between", fontSize: 11 }}>
                        <span style={{ color: "#94a3b8" }}>Joints / Foundations / Terminations</span>
                        <span style={{ color: "white" }}>{joiningLinksCompleted || "0"} / {rmuFoundationStatus || "0"} / {terminationEndpoints || "0"}</span>
                      </div>
                      {terminationGpsLat && (
                        <div style={{ display: "flex", justifyContent: "space-between", fontSize: 10, color: "#a78bfa" }}>
                          <span>Termination Coordinates</span>
                          <span>[{Number(terminationGpsLat).toFixed(4)}, {Number(terminationGpsLng).toFixed(4)}]</span>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Category 3: Clearances */}
                  <div style={{ background: "rgba(255,255,255,0.01)", border: "1px solid rgba(255,255,255,0.04)", padding: 12, borderRadius: 14 }}>
                    <span style={{ fontSize: 9, fontWeight: 800, color: "#06b6d4", textTransform: "uppercase", letterSpacing: "0.08em" }}>Clearances & Approvals</span>
                    <div style={{ display: "flex", flexDirection: "column", gap: 5, marginTop: 8 }}>
                      <div style={{ display: "flex", justifyContent: "space-between", fontSize: 11 }}>
                        <span style={{ color: "#94a3b8" }}>PWD Authority</span>
                        <span style={{ color: pwdClearance === "Permission Gathered" ? "#10b981" : pwdClearance === "Demand Issued" ? "#fbbf24" : "#64748b", fontWeight: 700 }}>{pwdClearance} {pwdReceipt ? "📎" : ""}</span>
                      </div>
                      <div style={{ display: "flex", justifyContent: "space-between", fontSize: 11 }}>
                        <span style={{ color: "#94a3b8" }}>KSEB Grid Access</span>
                        <span style={{ color: ksebClearance === "Permission Gathered" ? "#10b981" : ksebClearance === "Demand Issued" ? "#fbbf24" : "#64748b", fontWeight: 700 }}>{ksebClearance} {ksebReceipt ? "📎" : ""}</span>
                      </div>
                      <div style={{ display: "flex", justifyContent: "space-between", fontSize: 11 }}>
                        <span style={{ color: "#94a3b8" }}>National Highway</span>
                        <span style={{ color: nhClearance === "Permission Gathered" ? "#10b981" : nhClearance === "Demand Issued" ? "#fbbf24" : "#64748b", fontWeight: 700 }}>{nhClearance} {nhReceipt ? "📎" : ""}</span>
                      </div>
                    </div>
                  </div>

                  <p style={{ margin: "4px 0 0", fontSize: 10, color: "#fbbf24", textAlign: "center", lineHeight: 1.4 }}>
                    ⚠️ Submitting will lock operations for {reportDate || new Date().toISOString().split("T")[0]} under project ID. Verify coordinates & receipts!
                  </p>
                </div>
              )}

            </div>

            {/* Modal Footer (Controls) */}
            <div style={{ display: "flex", gap: 10, borderTop: "1px solid rgba(255,255,255,0.06)", paddingTop: 14 }}>
              {reportStep > 1 && (
                <button
                  type="button"
                  onClick={() => setReportStep(reportStep - 1)}
                  style={{ flex: 0.8, height: 42, background: "transparent", border: "1px solid rgba(255,255,255,0.15)", borderRadius: 12, color: "#cbd5e1", fontSize: 13, fontWeight: 750, cursor: "pointer" }}
                >
                  Back
                </button>
              )}
              
              {reportStep < 4 ? (
                <button
                  type="button"
                  onClick={() => {
                    if (reportStep === 1) {
                      if (!reportDate) {
                        showToast("❌ Please select a report date.");
                        return;
                      }
                      if (!reportProjectId) {
                        showToast("❌ Please select a project corridor.");
                        return;
                      }
                    }
                    setReportStep(reportStep + 1);
                  }}
                  style={{ flex: 1.2, height: 42, background: "linear-gradient(135deg, #06b6d4 0%, #7c3aed 100%)", border: "none", borderRadius: 12, color: "white", fontSize: 13, fontWeight: 800, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: 6, boxShadow: "0 4px 14px rgba(6, 182, 212, 0.25)" }}
                >
                  Continue ➔
                </button>
              ) : (
                <button
                  type="button"
                  onClick={async () => {
                    setSubmittingReport(true);
                    
                    const payload = {
                      reportDate,
                      projectId: reportProjectId,
                      laborCount,
                      otHours,
                      fuelExpenses: Number(fuelExpenses || 0),
                      travelExpenses: Number(travelExpenses || 0),
                      roomRent: Number(roomRent || 0),
                      roomRentReceipt,
                      toolRent: Number(toolRent || 0),
                      toolRentReceipt,
                      excavationLength: Number(excavationLength || 0),
                      hddLength: Number(hddLength || 0),
                      cableLayingLength: Number(cableLayingLength || 0),
                      cableMoundingLength: Number(cableMoundingLength || 0),
                      joiningLinksCompleted: Number(joiningLinksCompleted || 0),
                      rmuFoundationStatus: Number(rmuFoundationStatus || 0),
                      terminationEndpoints: Number(terminationEndpoints || 0),
                      terminationGpsLat: terminationGpsLat ? Number(terminationGpsLat) : undefined,
                      terminationGpsLng: terminationGpsLng ? Number(terminationGpsLng) : undefined,
                      stockAvailable: {},
                      clearances: {
                        PWD: { status: pwdClearance, receipt: pwdReceipt },
                        KSEB: { status: ksebClearance, receipt: ksebReceipt },
                        NH: { status: nhClearance, receipt: nhReceipt }
                      }
                    };

                    try {
                      const res = await fetch("/api/mobile/daily-reports", {
                        method: "POST",
                        headers: { "Content-Type": "application/json" },
                        body: JSON.stringify(payload)
                      });

                      const data = await res.json();
                      if (res.ok && data.ok) {
                        showToast("🚀 Daily report submitted successfully! Approved status pending Admin Lock.");
                        localStorage.removeItem(`telgo_draft_report_${reportProjectId}`);
                        setIsDailyReportOpen(false);
                      } else {
                        showToast(`❌ Submission error: ${data.message || "Unknown error."}`);
                      }
                    } catch (err) {
                      showToast("📡 Connection drop detected! Report cached locally in offline submissions queue.");
                      const localQueue = localStorage.getItem("telgo_offline_submissions");
                      const parsedQueue = localQueue ? JSON.parse(localQueue) : [];
                      parsedQueue.push(payload);
                      localStorage.setItem("telgo_offline_submissions", JSON.stringify(parsedQueue));
                      localStorage.removeItem(`telgo_draft_report_${reportProjectId}`);
                      setIsDailyReportOpen(false);
                    } finally {
                      setSubmittingReport(false);
                    }
                  }}
                  disabled={submittingReport}
                  style={{ flex: 1.2, height: 42, background: "linear-gradient(135deg, #10b981 0%, #059669 100%)", border: "none", borderRadius: 12, color: "white", fontSize: 13, fontWeight: 800, cursor: submittingReport ? "not-allowed" : "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: 6, boxShadow: "0 4px 14px rgba(16, 185, 129, 0.25)" }}
                >
                  {submittingReport ? (
                    <>
                      <div className="spinner" style={{ width: 14, height: 14 }} />
                      Submitting...
                    </>
                  ) : (
                    <>🚀 Submit Daily Report</>
                  )}
                </button>
              )}
            </div>
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

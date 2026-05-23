"use client";
import { useState, useEffect, useCallback } from "react";
import { ProfileModal, ProfileUser } from "@/components/profile-modal";

type AccessUser = {
  id: string;
  email: string;
  full_name: string;
  role: string;
  login_id: string | null;
  access_status: string;
  created_at: string;
};

export default function AdminDashboard() {
  const [users, setUsers] = useState<AccessUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [approving, setApproving] = useState<string | null>(null);
  const [blocking, setBlocking] = useState<string | null>(null);
  const [toast, setToast] = useState("");
  const [approvedCreds, setApprovedCreds] = useState<{ email: string; password: string; loginId: string } | null>(null);
  const [resending, setResending] = useState<string | null>(null);

  // Tactical Geolocation Radar States
  const [radarSelectedWorker, setRadarSelectedWorker] = useState<any | null>(null);
  const [radarWorkers, setRadarWorkers] = useState<any[]>([]);
  const [mapAnimateProgress, setMapAnimateProgress] = useState(0);
  
  // Navigation & Multi-View State
  const [activeView, setActiveView] = useState<"hub" | "approvals" | "map" | "settings" | "attendance" | "projects">("hub");

  // Real Database Attendance History States
  const [attendanceRecords, setAttendanceRecords] = useState<any[]>([]);
  const [loadingAttendance, setLoadingAttendance] = useState(false);
  const [selectedAttendanceWorker, setSelectedAttendanceWorker] = useState<any | null>(null);
  const [radarWorkerHistory, setRadarWorkerHistory] = useState<any[]>([]);
  
  // Active User Search State
  const [searchQuery, setSearchQuery] = useState("");

  // Admin Self Profile State
  const [adminSelf, setAdminSelf] = useState<ProfileUser | null>(null);
  const [isAdminSettingsOpen, setIsAdminSettingsOpen] = useState(false);
  const [approvalsTab, setApprovalsTab] = useState<"pending" | "active">("pending");

  // User Administration Edit State
  const [selectedUser, setSelectedUser] = useState<AccessUser | null>(null);
  const [editName, setEditName] = useState("");
  const [editEmail, setEditEmail] = useState("");
  const [editRole, setEditRole] = useState("");
  const [editStatus, setEditStatus] = useState("");
  const [savingUser, setSavingUser] = useState(false);

  // Real Projects States
  const [projectsList, setProjectsList] = useState<any[]>([]);
  const [selectedProjectItem, setSelectedProjectItem] = useState<any | null>(null);
  const [editingProjectItem, setEditingProjectItem] = useState<any | null>(null);
  
  // Edit Project fields
  const [projName, setProjName] = useState("");
  const [projCode, setProjCode] = useState("");
  const [projDistrict, setProjDistrict] = useState("");
  const [projDistance, setProjDistance] = useState("");
  const [projDesc, setProjDesc] = useState("");
  const [projStartLabel, setProjStartLabel] = useState("");
  const [projStartLat, setProjStartLat] = useState("");
  const [projStartLng, setProjStartLng] = useState("");
  const [projEndLabel, setProjEndLabel] = useState("");
  const [projEndLat, setProjEndLat] = useState("");
  const [projEndLng, setProjEndLng] = useState("");

  // Upgraded GIS Marks & Drawing State parameters
  const [activePinMode, setActivePinMode] = useState<"start" | "end" | "hdd" | "termination" | "trench" | "utility">("start");
  const [hddPoints, setHddPoints] = useState<[number, number][]>([]);
  const [terminationPoints, setTerminationPoints] = useState<[number, number][]>([]);
  const [trenchingLine, setTrenchingLine] = useState<[number, number][]>([]);
  const [utilityPath, setUtilityPath] = useState<[number, number][]>([]);

  // Great-Circle Haversine Formula for distance calculations
  const calculateHaversineDistance = (lat1: number, lng1: number, lat2: number, lng2: number): number => {
    const R = 6371; // Earth radius in kilometers
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLng = (lng2 - lng1) * Math.PI / 180;
    const a = 
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * 
      Math.sin(dLng / 2) * Math.sin(dLng / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c; // returns distance in km
  };

  const updateCalculatedDistance = (
    sLat: string,
    sLng: string,
    eLat: string,
    eLng: string,
    tLine: [number, number][]
  ) => {
    if (tLine && tLine.length >= 2) {
      let total = 0;
      for (let i = 0; i < tLine.length - 1; i++) {
        total += calculateHaversineDistance(tLine[i][0], tLine[i][1], tLine[i + 1][0], tLine[i + 1][1]);
      }
      setProjDistance(`${total.toFixed(2)} km`);
    } else {
      const lat1 = parseFloat(sLat);
      const lng1 = parseFloat(sLng);
      const lat2 = parseFloat(eLat);
      const lng2 = parseFloat(eLng);
      if (!isNaN(lat1) && !isNaN(lng1) && !isNaN(lat2) && !isNaN(lng2)) {
        const dist = calculateHaversineDistance(lat1, lng1, lat2, lng2);
        setProjDistance(`${dist.toFixed(2)} km`);
      } else {
        setProjDistance("0.00 km");
      }
    }
  };

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
      endCoords: [10.0261, 76.3084],
      hddPoints: [[10.0120, 76.3083], [10.0190, 76.3083]] as [number, number][],
      terminationPoints: [[10.0060, 76.3082], [10.0255, 76.3084]] as [number, number][],
      trenchingLine: [[10.0055, 76.3082], [10.0100, 76.3083], [10.0150, 76.3083], [10.0200, 76.3083], [10.0261, 76.3084]] as [number, number][],
      utilityPath: [[10.0055, 76.3082], [10.0080, 76.3082], [10.0180, 76.3083], [10.0261, 76.3084]] as [number, number][]
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
      endCoords: [10.0135, 76.3725],
      hddPoints: [[10.0110, 76.3650]] as [number, number][],
      terminationPoints: [[10.0095, 76.3595], [10.0130, 76.3720]] as [number, number][],
      trenchingLine: [[10.0094, 76.3594], [10.0110, 76.3650], [10.0135, 76.3725]] as [number, number][],
      utilityPath: [[10.0094, 76.3594], [10.0135, 76.3725]] as [number, number][]
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
      endCoords: [9.5312, 76.3268],
      hddPoints: [[9.6200, 76.3300], [9.5800, 76.3280]] as [number, number][],
      terminationPoints: [[9.6845, 76.3355], [9.5312, 76.3268]] as [number, number][],
      trenchingLine: [[9.6845, 76.3355], [9.6200, 76.3300], [9.5800, 76.3280], [9.5312, 76.3268]] as [number, number][],
      utilityPath: [[9.6845, 76.3355], [9.5312, 76.3268]] as [number, number][]
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
      endCoords: [10.0617, 77.0863],
      hddPoints: [[10.0750, 77.0720]] as [number, number][],
      terminationPoints: [[10.0889, 77.0595], [10.0617, 77.0863]] as [number, number][],
      trenchingLine: [[10.0889, 77.0595], [10.0750, 77.0720], [10.0617, 77.0863]] as [number, number][],
      utilityPath: [[10.0889, 77.0595], [10.0617, 77.0863]] as [number, number][]
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
      endCoords: [10.4900, 76.2415],
      hddPoints: [[10.5010, 76.2280]] as [number, number][],
      terminationPoints: [[10.5167, 76.2167], [10.4900, 76.2415]] as [number, number][],
      trenchingLine: [[10.5167, 76.2167], [10.5050, 76.2250], [10.4900, 76.2415]] as [number, number][],
      utilityPath: [[10.5167, 76.2167], [10.4900, 76.2415]] as [number, number][]
    }
  ];

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
  }, []);

  const resetToDefaults = () => {
    if (confirm("Are you sure you want to reset all projects and coordinates to their real default parameters?")) {
      setProjectsList(DEFAULT_PROJECTS);
      setSelectedProjectItem(DEFAULT_PROJECTS[0]);
      localStorage.removeItem("telgo_custom_projects");
      showToast("🔄 Reset to default coordinates and metadata.");
    }
  };

  // Real-time postMessage listener to capture pins from interactive iframe map editor
  useEffect(() => {
    const handleMapMessage = (e: MessageEvent) => {
      if (e.data && e.data.type === "MAP_CLICK") {
        const { lat, lng } = e.data;
        const latStr = lat.toFixed(6);
        const lngStr = lng.toFixed(6);

        if (activePinMode === "start") {
          setProjStartLat(latStr);
          setProjStartLng(lngStr);
          updateCalculatedDistance(latStr, projStartLng, projEndLat, projEndLng, trenchingLine);
          showToast(`🟢 Start Coordinate updated: [${latStr}, ${lngStr}]`);
        } else if (activePinMode === "end") {
          setProjEndLat(latStr);
          setProjEndLng(lngStr);
          updateCalculatedDistance(projStartLat, projStartLng, latStr, projEndLng, trenchingLine);
          showToast(`🔴 End Coordinate updated: [${latStr}, ${lngStr}]`);
        } else if (activePinMode === "hdd") {
          setHddPoints(prev => {
            const next = [...prev, [lat, lng] as [number, number]];
            showToast(`🟡 HDD Drilling location marked.`);
            return next;
          });
        } else if (activePinMode === "termination") {
          setTerminationPoints(prev => {
            const next = [...prev, [lat, lng] as [number, number]];
            showToast(`🔵 Grid Termination location marked.`);
            return next;
          });
        } else if (activePinMode === "trench") {
          setTrenchingLine(prev => {
            const next = [...prev, [lat, lng] as [number, number]];
            updateCalculatedDistance(projStartLat, projStartLng, projEndLat, projEndLng, next);
            showToast(`🟠 Trench segment coordinate appended.`);
            return next;
          });
        } else if (activePinMode === "utility") {
          setUtilityPath(prev => {
            const next = [...prev, [lat, lng] as [number, number]];
            showToast(`🟣 Utility shift path coordinate appended.`);
            return next;
          });
        }
      }
    };

    window.addEventListener("message", handleMapMessage);
    return () => window.removeEventListener("message", handleMapMessage);
  }, [activePinMode, projStartLat, projStartLng, projEndLat, projEndLng, trenchingLine, utilityPath]);

  useEffect(() => {
    if (editingProjectItem) {
      setProjName(editingProjectItem.name);
      setProjCode(editingProjectItem.code);
      setProjDistrict(editingProjectItem.district);
      setProjDistance(editingProjectItem.distance);
      setProjDesc(editingProjectItem.description);
      setProjStartLabel(editingProjectItem.startLabel);
      setProjStartLat(String(editingProjectItem.startCoords[0]));
      setProjStartLng(String(editingProjectItem.startCoords[1]));
      setProjEndLabel(editingProjectItem.endLabel);
      setProjEndLat(String(editingProjectItem.endCoords[0]));
      setProjEndLng(String(editingProjectItem.endCoords[1]));

      // Load additional dynamic GIS markings
      setHddPoints(editingProjectItem.hddPoints ?? []);
      setTerminationPoints(editingProjectItem.terminationPoints ?? []);
      setTrenchingLine(editingProjectItem.trenchingLine ?? []);
      setUtilityPath(editingProjectItem.utilityPath ?? []);
      setActivePinMode("start"); // default active mode
    }
  }, [editingProjectItem]);

  const handleUpdateProject = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingProjectItem) return;

    const lat1 = parseFloat(projStartLat);
    const lng1 = parseFloat(projStartLng);
    const lat2 = parseFloat(projEndLat);
    const lng2 = parseFloat(projEndLng);

    if (isNaN(lat1) || isNaN(lng1) || isNaN(lat2) || isNaN(lng2)) {
      showToast("❌ Latitude and Longitude must be valid decimal numbers!");
      return;
    }

    const updated = {
      ...editingProjectItem,
      name: projName,
      code: projCode,
      district: projDistrict,
      distance: projDistance,
      description: projDesc,
      startLabel: projStartLabel,
      startCoords: [lat1, lng1] as [number, number],
      endLabel: projEndLabel,
      endCoords: [lat2, lng2] as [number, number],
      hddPoints,
      terminationPoints,
      trenchingLine,
      utilityPath
    };

    const nextList = projectsList.map(p => p.id === editingProjectItem.id ? updated : p);
    setProjectsList(nextList);
    setSelectedProjectItem(updated);
    setEditingProjectItem(null);
    localStorage.setItem("telgo_custom_projects", JSON.stringify(nextList));
    showToast("✅ Corridor parameters updated successfully!");
  };

  // Fetch admin self profile
  useEffect(() => {
    fetch("/api/mobile/me")
      .then(r => r.json())
      .then(d => {
        if (d.ok) setAdminSelf(d.user);
        else window.location.href = "/login";
      });
  }, []);

  // Poll live telemetry for Admin Radar Map
  useEffect(() => {
    if (activeView !== "map") return;

    const fetchRadarTelemetry = async () => {
      try {
        const res = await fetch("/api/mobile/live-map");
        const data = await res.json();
        if (res.ok && data.ok) {
          const activeLocations = data.locations ?? [];

          // Dynamic roster populated from database active users (supervisor and finance)
          const combinedRoster = users
            .filter(u => u.access_status === "active" && (u.role === "supervisor" || u.role === "finance"))
            .map(u => ({
              userId: u.id,
              fullName: u.full_name,
              email: u.email,
              role: u.role
            }));

          const mapped = combinedRoster.map(item => {
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
                recordedAt: liveLoc.recordedAt,
              };
            }
            return {
              ...item,
              status: "offline" as const,
              latitude: 9.9538,
              longitude: 76.3428,
              projectName: "Vadakkekotta Sn-Cable Corridor",
              distanceFromSiteM: 0,
              withinGeofence: false,
              recordedAt: null,
            };
          });

          setRadarWorkers(mapped);

          // Auto-select the first worker if none is selected yet!
          if (mapped.length > 0) {
            setRadarSelectedWorker((prev: any) => {
              if (prev) {
                const updated = mapped.find(w => w.userId === prev.userId);
                return updated ?? prev;
              }
              return mapped[0];
            });
          }
        }
      } catch { /* ignore */ }
    };

    fetchRadarTelemetry();
    const interval = setInterval(fetchRadarTelemetry, 5000);
    return () => clearInterval(interval);
  }, [activeView, users, radarSelectedWorker]);

  // Smooth movement animation loop
  useEffect(() => {
    if (activeView === "map" && radarSelectedWorker && radarSelectedWorker.status === "active") {
      let progress = 0;
      let frameId: number;
      const animate = () => {
        progress += 0.005;
        if (progress > 1) progress = 0;
        setMapAnimateProgress(progress);
        frameId = requestAnimationFrame(animate);
      };
      frameId = requestAnimationFrame(animate);
      return () => cancelAnimationFrame(frameId);
    }
  }, [activeView, radarSelectedWorker]);

  // Synchronously initialize radar roster directory on map view mount
  useEffect(() => {
    if (activeView === "map") {
      const combinedRoster = users
        .filter(u => u.access_status === "active" && (u.role === "supervisor" || u.role === "finance"))
        .map(u => ({
          userId: u.id,
          fullName: u.full_name,
          email: u.email,
          role: u.role
        }));

      const mapped = combinedRoster.map(item => ({
        ...item,
        status: "offline" as const, // default to offline until live telemetry polling resolves
        latitude: 9.9538,
        longitude: 76.3428,
        projectName: "Vadakkekotta Sn-Cable Corridor",
        distanceFromSiteM: 0,
        withinGeofence: false,
        recordedAt: null,
      }));

      setRadarWorkers(mapped);

      // Instantly select the first worker in roster on page load
      if (mapped.length > 0) {
        setRadarSelectedWorker(mapped[0]);
      }
    }
  }, [activeView, users]);

  // Fetch historical route coordinates when a worker is selected
  useEffect(() => {
    if (activeView !== "map" || !radarSelectedWorker) {
      setRadarWorkerHistory([]);
      return;
    }

    const fetchWorkerHistory = async () => {
      try {
        const res = await fetch(`/api/mobile/live-map?userId=${radarSelectedWorker.userId}`);
        const data = await res.json();
        if (res.ok && data.ok) {
          setRadarWorkerHistory(data.history ?? []);
        }
      } catch { /* ignore */ }
    };

    fetchWorkerHistory();
    const interval = setInterval(fetchWorkerHistory, 8000);
    return () => clearInterval(interval);
  }, [activeView, radarSelectedWorker?.userId]);

  const fetchUsers = useCallback(async () => {
    try {
      const r = await fetch("/api/mobile/admin/users");
      const d = await r.json();
      if (d.ok) setUsers(d.users);
    } catch { /* silently fail */ }
    setLoading(false);
  }, []);

  useEffect(() => { 
    fetchUsers(); 
  }, [fetchUsers]);

  // Poll database attendance records for the selected worker when in attendance view
  useEffect(() => {
    if (activeView !== "attendance" || !selectedAttendanceWorker) return;

    const fetchRecords = async () => {
      try {
        const res = await fetch(`/api/mobile/attendance?userId=${selectedAttendanceWorker.id}`);
        const data = await res.json();
        if (res.ok && data.ok) {
          setAttendanceRecords(data.records ?? []);
        }
      } catch { /* ignore */ }
    };

    const interval = setInterval(fetchRecords, 5000);
    return () => clearInterval(interval);
  }, [activeView, selectedAttendanceWorker?.id]);

  function showToast(msg: string) {
    setToast(msg);
    setTimeout(() => setToast(""), 3500);
  }

  async function approve(userId: string) {
    setApproving(userId);
    try {
      const r = await fetch("/api/mobile/approve-access", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId })
      });
      const d = await r.json();
      if (r.ok && d.ok) { 
        showToast("✅ Access approved successfully!"); 
        if (d.password) {
          setApprovedCreds({ email: d.email, password: d.password, loginId: d.loginId });
        }
        fetchUsers(); 
      }
      else showToast("❌ " + (d.message || "Approval failed"));
    } catch { showToast("❌ Network error"); }
    setApproving(null);
  }

  async function blockUser(userId: string) {
    setBlocking(userId);
    try {
      const r = await fetch("/api/mobile/block-access", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId })
      });
      const d = await r.json();
      if (r.ok && d.ok) { showToast("🚫 User blocked."); fetchUsers(); }
      else showToast("❌ " + (d.message || "Block failed"));
    } catch { showToast("❌ Network error"); }
    setBlocking(null);
  }

  async function resendCredentials(userId: string) {
    setResending(userId);
    try {
      const r = await fetch("/api/mobile/resend-credentials", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId })
      });
      const d = await r.json();
      if (r.ok && d.ok) {
        showToast("🔑 Credentials reset and emailed!");
        if (d.password) {
          setApprovedCreds({ email: d.email, password: d.password, loginId: d.loginId });
        }
        fetchUsers();
      } else {
        showToast("❌ " + (d.message || "Reset failed"));
      }
    } catch {
      showToast("❌ Network error");
    }
    setResending(null);
  }

  function openEditUser(u: AccessUser) {
    setSelectedUser(u);
    setEditName(u.full_name);
    setEditEmail(u.email);
    setEditRole(u.role);
    setEditStatus(u.access_status);
  }

  async function handleUpdateUser(e: React.FormEvent) {
    e.preventDefault();
    if (!selectedUser) return;
    setSavingUser(true);
    try {
      const r = await fetch("/api/mobile/admin/user/update", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userId: selectedUser.id,
          fullName: editName,
          email: editEmail,
          role: editRole,
          accessStatus: editStatus
        })
      });
      const d = await r.json();
      if (r.ok && d.ok) {
        showToast("✅ User settings updated successfully!");
        setSelectedUser(null);
        fetchUsers();
      } else {
        showToast("❌ " + (d.message || "Failed to update user."));
      }
    } catch {
      showToast("❌ Network connection error.");
    } finally {
      setSavingUser(false);
    }
  }

  async function handleTerminateUser() {
    if (!selectedUser) return;
    if (!confirm(`Are you absolutely sure you want to terminate and revoke access for ${editName}?`)) return;
    
    setSavingUser(true);
    try {
      const r = await fetch("/api/mobile/block-access", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId: selectedUser.id })
      });
      const d = await r.json();
      if (r.ok && d.ok) {
        showToast("🚫 Access terminated successfully.");
        setSelectedUser(null);
        fetchUsers();
      } else {
        showToast("❌ " + (d.message || "Failed to terminate access."));
      }
    } catch {
      showToast("❌ Network error.");
    } finally {
      setSavingUser(false);
    }
  }

  const pending = users.filter(u => u.access_status === "pending");
  const active  = users.filter(u => u.access_status === "active");

  // Search Filtered Active Users
  const filteredActive = active.filter(u => 
    u.full_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    u.email.toLowerCase().includes(searchQuery.toLowerCase())
  );

  function roleColor(role: string) {
    const map: Record<string,string> = { supervisor: "#67e8f9", client: "#86efac", finance: "#fcd34d", admin: "#c4b5fd" };
    return map[role] ?? "#94a3b8";
  }

  const getRadarAnimatedCoords = () => {
    if (!radarSelectedWorker) return { x: 120, y: 150 };
    const pathPoints = [
      { x: 60, y: 220 },
      { x: 130, y: 170 },
      { x: 190, y: 190 },
      { x: 260, y: 110 },
    ];
    const segmentCount = pathPoints.length - 1;
    const scaled = mapAnimateProgress * segmentCount;
    const index = Math.floor(scaled);
    const fraction = scaled - index;

    if (index >= segmentCount) return pathPoints[segmentCount];
    const start = pathPoints[index];
    const end = pathPoints[index + 1];
    return {
      x: start.x + (end.x - start.x) * fraction,
      y: start.y + (end.y - start.y) * fraction,
    };
  };

  const animCoords = getRadarAnimatedCoords();

  // Get dynamic greeting based on system time
  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return "Good morning";
    if (hour < 17) return "Good afternoon";
    return "Good evening";
  };

  return (
    <div className="page" style={{ background: "#060912", minHeight: "100vh", position: "relative", color: "#f1f5f9" }}>
      <style>{`
        .module-card {
          transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
          cursor: pointer;
          position: relative;
          overflow: hidden;
        }
        .module-card:hover {
          transform: translateY(-4px) scale(1.015);
          border-color: rgba(124, 58, 237, 0.35) !important;
          background: rgba(255, 255, 255, 0.06) !important;
          box-shadow: 0 16px 36px rgba(124, 58, 237, 0.15) !important;
        }
        .search-input {
          transition: all 0.2s ease;
        }
        .search-input:focus {
          border-color: #06b6d4 !important;
          box-shadow: 0 0 0 3px rgba(6, 182, 212, 0.2) !important;
          background: rgba(0, 0, 0, 0.6) !important;
        }
        .back-btn {
          transition: all 0.2s ease;
        }
        .back-btn:hover {
          background: rgba(255, 255, 255, 0.08) !important;
          transform: translateX(-2px);
        }
        .action-btn {
          transition: all 0.2s ease;
        }
        .action-btn:hover {
          transform: scale(1.02);
          opacity: 0.95;
        }
        .action-btn:active {
          transform: scale(0.98);
        }
        @keyframes subtleGlow {
          0%, 100% { box-shadow: 0 0 20px rgba(245, 158, 11, 0.2); }
          50% { box-shadow: 0 0 30px rgba(245, 158, 11, 0.4); }
        }
        .active-glow-pending {
          animation: subtleGlow 2s infinite ease-in-out;
        }
        .admin-grid {
          display: grid;
          grid-template-columns: repeat(2, 1fr);
          gap: 12px;
        }
        @media (min-width: 580px) {
          .admin-grid {
            grid-template-columns: repeat(4, 1fr);
          }
        }
        
        /* GIS Integrated Editor Styles */
        .editor-container {
          display: grid;
          grid-template-columns: 1fr;
          gap: 20px;
        }
        @media (min-width: 900px) {
          .editor-container {
            grid-template-columns: 1.25fr 1fr !important;
          }
        }
        .tool-btn {
          transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
          cursor: pointer;
          font-family: Outfit, sans-serif;
          font-size: 11px;
          font-weight: 800;
          text-transform: uppercase;
          letter-spacing: 0.05em;
          border-radius: 12px;
          min-height: 40px;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 8px;
          border: 1px solid rgba(255,255,255,0.08);
          background: rgba(255,255,255,0.02);
          color: #94a3b8;
        }
        .tool-btn:hover {
          transform: translateY(-2px);
          background: rgba(255,255,255,0.06);
          border-color: rgba(255,255,255,0.15);
        }
        .tool-btn:active {
          transform: translateY(0);
        }
      `}</style>

      {/* VIEW 1: CENTRAL CONTROL HUB */}
      {activeView === "hub" && (
        <div className="fade-in" style={{ paddingBottom: 40 }}>
          {/* Header */}
          <div style={{ padding: "24px 16px 0", paddingTop: "calc(env(safe-area-inset-top, 0px) + 24px)" }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 16 }}>
              <div>
                <p style={{ fontSize: 10, fontWeight: 800, letterSpacing: "0.15em", textTransform: "uppercase", color: "#06b6d4", marginBottom: 4 }}>TELGO OPERATIONS</p>
                <h1 style={{ fontSize: 24, fontWeight: 900, color: "#f1f5f9", margin: 0, letterSpacing: "-0.5px" }}>Control Center</h1>
              </div>
              
              {/* Premium Circular Profile Photo Button */}
              <button 
                onClick={() => setIsAdminSettingsOpen(true)}
                style={{
                  background: "none",
                  border: "none",
                  cursor: "pointer",
                  display: "flex",
                  alignItems: "center",
                  outline: "none",
                  padding: 0
                }}
              >
                <div style={{
                  width: 42,
                  height: 42,
                  borderRadius: "50%",
                  background: "linear-gradient(135deg, #7c3aed, #06b6d4)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  color: "white",
                  fontSize: 16,
                  fontWeight: 800,
                  border: "1.5px solid rgba(255,255,255,0.15)",
                  boxShadow: "0 4px 15px rgba(124, 58, 237, 0.3)",
                  textTransform: "uppercase"
                }}>
                  {adminSelf ? adminSelf.fullName.charAt(0) : "A"}
                </div>
              </button>
            </div>

            {/* Greeting & Subtitle */}
            <div className="glass" style={{ padding: "18px 20px", display: "flex", alignItems: "center", gap: 14, border: "1px solid rgba(255,255,255,0.06)", borderRadius: 16, background: "linear-gradient(135deg, rgba(255,255,255,0.02) 0%, rgba(255,255,255,0.04) 100%)", marginBottom: 24 }}>
              <div style={{ width: 10, height: 10, borderRadius: "50%", background: "#10b981", boxShadow: "0 0 10px #10b981" }} />
              <div>
                <h2 style={{ fontSize: 16, fontWeight: 700, color: "#f1f5f9", margin: 0 }}>{getGreeting()}, {adminSelf?.fullName || "Control"}</h2>
                <p style={{ fontSize: 12, color: "#94a3b8", margin: "2px 0 0" }}>System is online. Click your avatar to manage your profile.</p>
              </div>
            </div>
          </div>

          {/* Quick Metrics Banner */}
          <div style={{ padding: "0 16px 24px" }}>
            <p style={{ fontSize: 11, fontWeight: 700, letterSpacing: "0.12em", textTransform: "uppercase", color: "#475569", marginBottom: 12 }}>Active Telemetry</p>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
              <div className="glass" style={{ padding: "16px 18px", border: "1px solid rgba(255,255,255,0.05)" }}>
                <span style={{ fontSize: 10, color: "#94a3b8", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.05em" }}>Total Crews</span>
                <p style={{ fontSize: 32, fontWeight: 900, color: "#f1f5f9", margin: "4px 0 0", letterSpacing: "-1px" }}>{users.length}</p>
              </div>
              <div className="glass" style={{ padding: "16px 18px", border: "1px solid rgba(255,255,255,0.05)" }}>
                <span style={{ fontSize: 10, color: "#94a3b8", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.05em" }}>Active Mailers</span>
                <p style={{ fontSize: 15, fontWeight: 700, color: "#4ade80", margin: "16px 0 0", display: "flex", alignItems: "center", gap: 6 }}>
                  <span style={{ width: 8, height: 8, borderRadius: "50%", background: "#22c55e" }} />
                  SMTP Ready
                </p>
              </div>
            </div>
          </div>

          {/* Core System Grid */}
          <div style={{ padding: "0 16px" }}>
            <p style={{ fontSize: 11, fontWeight: 800, letterSpacing: "0.12em", textTransform: "uppercase", color: "#64748b", marginBottom: 14 }}>System Modules</p>
            
            <div className="admin-grid">
              
              {/* MODULE 1: ACCESS & PERSONNEL */}
              <div 
                className={`glass module-card ${pending.length > 0 ? "active-glow-pending" : ""}`}
                onClick={() => setActiveView("approvals")}
                style={{ 
                  padding: "18px 14px", 
                  borderRadius: 16,
                  border: pending.length > 0 ? "1px solid rgba(251, 191, 36, 0.35)" : "1px solid rgba(255,255,255,0.05)",
                  background: pending.length > 0 ? "linear-gradient(135deg, rgba(251,191,36,0.06) 0%, rgba(6,9,18,0.7) 100%)" : "rgba(255,255,255,0.01)",
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "center",
                  textAlign: "center",
                  gap: 10
                }}
              >
                <div style={{ position: "relative" }}>
                  <div style={{ width: 44, height: 44, borderRadius: 12, background: pending.length > 0 ? "rgba(251,191,36,0.12)" : "rgba(196, 181, 253, 0.1)", border: pending.length > 0 ? "1px solid rgba(251,191,36,0.3)" : "1px solid rgba(196, 181, 253, 0.2)", display: "flex", alignItems: "center", justifyContent: "center" }}>
                    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke={pending.length > 0 ? "#fbbf24" : "#c4b5fd"} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M16 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="8.5" cy="7" r="4"/><line x1="20" y1="8" x2="20" y2="14"/><line x1="23" y1="11" x2="17" y2="11"/></svg>
                  </div>
                  {pending.length > 0 && (
                    <span style={{ position: "absolute", top: -4, right: -4, fontSize: 9, fontWeight: 900, background: "#fbbf24", color: "#060912", borderRadius: "50%", width: 18, height: 18, display: "flex", alignItems: "center", justifyContent: "center", border: "1.5px solid #060912" }}>
                      {pending.length}
                    </span>
                  )}
                </div>
                <div>
                  <h4 style={{ fontSize: 14, fontWeight: 800, color: "#f1f5f9", margin: 0 }}>Access Control</h4>
                  <span style={{ fontSize: 10, color: "#64748b", fontWeight: 700, textTransform: "uppercase" }}>
                    {pending.length > 0 ? `${pending.length} Pending` : "Personnel Directory"}
                  </span>
                </div>
              </div>

              {/* MODULE 2: LIVE GPS TRACKING */}
              <div 
                className="glass module-card"
                onClick={() => setActiveView("map")}
                style={{ 
                  padding: "18px 14px", 
                  borderRadius: 16,
                  border: "1px solid rgba(255,255,255,0.05)",
                  background: "rgba(255,255,255,0.01)",
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "center",
                  textAlign: "center",
                  gap: 10
                }}
              >
                <div style={{ width: 44, height: 44, borderRadius: 12, background: "rgba(6, 182, 212, 0.1)", border: "1px solid rgba(6, 182, 212, 0.2)", display: "flex", alignItems: "center", justifyContent: "center" }}>
                  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#06b6d4" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/><circle cx="12" cy="10" r="3"/></svg>
                </div>
                <div>
                  <h4 style={{ fontSize: 14, fontWeight: 800, color: "#f1f5f9", margin: 0 }}>Live Radar Map</h4>
                  <span style={{ fontSize: 10, color: "#06b6d4", fontWeight: 800, textTransform: "uppercase", display: "inline-flex", alignItems: "center", gap: 4 }}>
                    <span className="dot-pulse" style={{ background: "#06b6d4", width: 5, height: 5 }} /> Radar Active
                  </span>
                </div>
              </div>

              {/* MODULE 3: REAL DATABASE ATTENDANCE HISTORY */}
              <div 
                className="glass module-card"
                onClick={() => setActiveView("attendance")}
                style={{ 
                  padding: "18px 14px", 
                  borderRadius: 16,
                  border: "1px solid rgba(255,255,255,0.05)",
                  background: "rgba(255,255,255,0.01)",
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "center",
                  textAlign: "center",
                  gap: 10
                }}
              >
                <div style={{ width: 44, height: 44, borderRadius: 12, background: "rgba(167, 139, 250, 0.1)", border: "1px solid rgba(167, 139, 250, 0.2)", display: "flex", alignItems: "center", justifyContent: "center" }}>
                  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#a78bfa" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><rect width="18" height="18" x="3" y="4" rx="2" ry="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>
                </div>
                <div>
                  <h4 style={{ fontSize: 14, fontWeight: 800, color: "#f1f5f9", margin: 0 }}>Attendance Ledger</h4>
                  <span style={{ fontSize: 10, color: "#a78bfa", fontWeight: 700, textTransform: "uppercase" }}>Monthly registry</span>
                </div>
              </div>

              {/* MODULE 4: SYSTEM METRICS */}
              <div 
                className="glass module-card"
                onClick={() => showToast("📊 Log analytics are being collected in the secure cloud.")}
                style={{ 
                  padding: "18px 14px", 
                  borderRadius: 16,
                  border: "1px solid rgba(255,255,255,0.05)",
                  background: "rgba(255,255,255,0.01)",
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "center",
                  textAlign: "center",
                  gap: 10
                }}
              >
                <div style={{ width: 44, height: 44, borderRadius: 12, background: "rgba(34, 197, 94, 0.1)", border: "1px solid rgba(34, 197, 94, 0.2)", display: "flex", alignItems: "center", justifyContent: "center" }}>
                  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#22c55e" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="20" x2="18" y2="10"/><line x1="12" y1="20" x2="12" y2="4"/><line x1="6" y1="20" x2="6" y2="14"/></svg>
                </div>
                <div>
                  <h4 style={{ fontSize: 14, fontWeight: 800, color: "#f1f5f9", margin: 0 }}>Metrics Hub</h4>
                  <span style={{ fontSize: 10, color: "#22c55e", fontWeight: 700, textTransform: "uppercase" }}>Operations logs</span>
                </div>
              </div>

              {/* MODULE 5: PROJECTS DIRECTORY */}
              <div 
                className="glass module-card"
                onClick={() => { setActiveView("projects"); if (projectsList.length > 0) setSelectedProjectItem(projectsList[0]); }}
                style={{ 
                  padding: "18px 14px", 
                  borderRadius: 16,
                  border: "1px solid rgba(255,255,255,0.05)",
                  background: "rgba(255,255,255,0.01)",
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "center",
                  textAlign: "center",
                  gap: 10
                }}
              >
                <div style={{ width: 44, height: 44, borderRadius: 12, background: "rgba(167, 139, 250, 0.1)", border: "1px solid rgba(167, 139, 250, 0.2)", display: "flex", alignItems: "center", justifyContent: "center" }}>
                  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#a78bfa" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"/><line x1="12" y1="11" x2="12" y2="17"/><line x1="9" y1="14" x2="15" y2="14"/></svg>
                </div>
                <div>
                  <h4 style={{ fontSize: 14, fontWeight: 800, color: "#f1f5f9", margin: 0 }}>Projects Hub</h4>
                  <span style={{ fontSize: 10, color: "#a78bfa", fontWeight: 700, textTransform: "uppercase" }}>Corridor mapping</span>
                </div>
              </div>
              
            </div>
          </div>

          {/* Logout */}
          <div style={{ padding: "32px 16px 16px" }}>
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
              className="action-btn"
              style={{ width: "100%", minHeight: 48, background: "transparent", border: "1px solid rgba(239,68,68,0.25)", borderRadius: 14, color: "#f87171", fontSize: 14, fontWeight: 700, cursor: "pointer", fontFamily: "Outfit,sans-serif" }}
            >
              Secure Sign Out
            </button>
          </div>
        </div>
      )}

      {/* VIEW 2: DEDICATED APPROVALS MODULE */}
      {activeView === "approvals" && (
        <div className="fade-in" style={{ paddingBottom: 60 }}>
          
          {/* Sub Header */}
          <div style={{ padding: "20px 16px 14px", paddingTop: "calc(env(safe-area-inset-top, 0px) + 16px)", borderBottom: "1px solid rgba(255,255,255,0.05)", background: "rgba(6,9,18,0.6)", backdropFilter: "blur(10px)", position: "sticky", top: 0, zIndex: 10 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
              <button 
                onClick={() => setActiveView("hub")}
                className="back-btn"
                style={{ width: 38, height: 38, borderRadius: 10, border: "1px solid rgba(255,255,255,0.08)", background: "rgba(255,255,255,0.03)", display: "flex", alignItems: "center", justifyContent: "center", color: "#f1f5f9", cursor: "pointer" }}
              >
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="19" y1="12" x2="5" y2="12"/><polyline points="12 19 5 12 12 5"/></svg>
              </button>
              <div>
                <p style={{ fontSize: 10, fontWeight: 800, color: "#06b6d4", letterSpacing: "0.1em", textTransform: "uppercase", margin: 0 }}>System Management</p>
                <h1 style={{ fontSize: 20, fontWeight: 800, color: "#f1f5f9", margin: "2px 0 0", letterSpacing: "-0.5px" }}>Access Control</h1>
              </div>
            </div>
          </div>

          {/* Professional Tab Switcher */}
          <div style={{ padding: "16px 16px 0", display: "flex", gap: 10 }}>
            <button 
              onClick={() => setApprovalsTab("pending")}
              style={{
                flex: 1,
                minHeight: 40,
                background: approvalsTab === "pending" ? "rgba(124, 58, 237, 0.15)" : "rgba(255, 255, 255, 0.02)",
                border: approvalsTab === "pending" ? "1px solid rgba(124, 58, 237, 0.35)" : "1px solid rgba(255, 255, 255, 0.06)",
                borderRadius: 12,
                color: approvalsTab === "pending" ? "#c4b5fd" : "#94a3b8",
                fontSize: 13,
                fontWeight: 700,
                cursor: "pointer",
                fontFamily: "Outfit, sans-serif",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                gap: 6
              }}
            >
              <span>⏳ Requests</span>
              {pending.length > 0 && (
                <span style={{ fontSize: 10, background: "#fbbf24", color: "#060912", borderRadius: "50%", width: 18, height: 18, display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 800 }}>
                  {pending.length}
                </span>
              )}
            </button>
            <button 
              onClick={() => setApprovalsTab("active")}
              style={{
                flex: 1,
                minHeight: 40,
                background: approvalsTab === "active" ? "rgba(6, 182, 212, 0.15)" : "rgba(255, 255, 255, 0.02)",
                border: approvalsTab === "active" ? "1px solid rgba(6, 182, 212, 0.35)" : "1px solid rgba(255, 255, 255, 0.06)",
                borderRadius: 12,
                color: approvalsTab === "active" ? "#67e8f9" : "#94a3b8",
                fontSize: 13,
                fontWeight: 700,
                cursor: "pointer",
                fontFamily: "Outfit, sans-serif",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                gap: 6
              }}
            >
              <span>👥 Active Crew</span>
              <span style={{ fontSize: 10, background: "rgba(6, 182, 212, 0.2)", color: "#06b6d4", borderRadius: 10, padding: "2px 6px", fontWeight: 800 }}>
                {active.length}
              </span>
            </button>
          </div>

          {/* Tab A: Pending Requests */}
          {approvalsTab === "pending" && (
            <div style={{ padding: "20px 16px 0" }}>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 12 }}>
                <p style={{ fontSize: 11, fontWeight: 700, letterSpacing: "0.12em", textTransform: "uppercase", color: "#94a3b8" }}>Pending Approvals</p>
                {pending.length > 0 && <span className="badge badge-pending">{pending.length} waiting</span>}
              </div>

              {loading ? (
                <div style={{ textAlign: "center", padding: "40px 0", color: "#475569" }}>
                  <div className="spinner" style={{ margin: "0 auto 12px" }} />
                  Loading Database...
                </div>
              ) : pending.length === 0 ? (
                <div className="glass" style={{ padding: "24px 18px", textAlign: "center", border: "1px solid rgba(255,255,255,0.05)" }}>
                  <div style={{ fontSize: 28, marginBottom: 6 }}>✨</div>
                  <p style={{ color: "#64748b", fontSize: 13, margin: 0 }}>No pending onboarding requests.</p>
                </div>
              ) : (
                <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                  {pending.map(u => (
                    <div key={u.id} className="approval-card fade-in" style={{ background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.05)", borderRadius: 16, padding: 16 }}>
                      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 12, marginBottom: 4 }}>
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <p style={{ fontWeight: 700, fontSize: 15, color: "#f1f5f9", marginBottom: 2, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{u.full_name}</p>
                          <p style={{ fontSize: 12, color: "#64748b", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{u.email}</p>
                        </div>
                        <span style={{ fontSize: 11, fontWeight: 700, color: roleColor(u.role), background: `${roleColor(u.role)}18`, border: `1px solid ${roleColor(u.role)}30`, borderRadius: 8, padding: "3px 9px", flexShrink: 0, textTransform: "capitalize" }}>{u.role}</span>
                      </div>
                      
                      <div style={{ display: "flex", gap: 8, marginTop: 8 }}>
                        <button
                          onClick={() => approve(u.id)}
                          disabled={approving === u.id}
                          className="action-btn"
                          style={{ flex: 1, minHeight: 40, background: "linear-gradient(135deg,#16a34a,#15803d)", border: "none", borderRadius: 10, color: "white", fontSize: 13, fontWeight: 700, cursor: "pointer", fontFamily: "Outfit,sans-serif", display: "flex", alignItems: "center", justifyContent: "center", gap: 6, opacity: approving === u.id ? 0.6 : 1 }}
                        >
                          {approving === u.id ? <><div className="spinner" style={{ width: 14, height: 14 }} /> Approving...</> : <>✓ Approve</>}
                        </button>
                        <button
                          onClick={() => blockUser(u.id)}
                          disabled={blocking === u.id}
                          className="action-btn"
                          style={{ minWidth: 70, minHeight: 40, background: "rgba(239,68,68,0.08)", border: "1px solid rgba(239,68,68,0.2)", borderRadius: 10, color: "#f87171", fontSize: 13, fontWeight: 700, cursor: "pointer", fontFamily: "Outfit,sans-serif", opacity: blocking === u.id ? 0.6 : 1 }}
                        >
                          {blocking === u.id ? "..." : "Block"}
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Tab B: Active Crew Directory */}
          {approvalsTab === "active" && (
            <div style={{ padding: "20px 16px 0" }}>
              <p style={{ fontSize: 11, fontWeight: 700, letterSpacing: "0.12em", textTransform: "uppercase", color: "#94a3b8", marginBottom: 12 }}>Authorized Personnel Directory</p>
              
              {/* Search Box */}
              <div style={{ marginBottom: 14 }}>
                <input 
                  type="text" 
                  placeholder="🔍 Search active crew by name or email..." 
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="search-input"
                  style={{ 
                    width: "100%", 
                    height: 44, 
                    background: "rgba(0,0,0,0.3)", 
                    border: "1px solid rgba(255,255,255,0.08)", 
                    borderRadius: 12, 
                    padding: "0 14px", 
                    color: "#f1f5f9", 
                    fontSize: 13, 
                    outline: "none", 
                    fontFamily: "Outfit, sans-serif" 
                  }} 
                />
              </div>

              {loading ? (
                <div style={{ textAlign: "center", padding: "20px 0", color: "#475569" }}>
                  Loading Users...
                </div>
              ) : filteredActive.length === 0 ? (
                <div className="glass" style={{ padding: "20px", textAlign: "center", border: "1px solid rgba(255,255,255,0.05)" }}>
                  <p style={{ color: "#64748b", fontSize: 12, margin: 0 }}>
                    {searchQuery ? "No matching crew members found." : "No active crew members authorized yet."}
                  </p>
                </div>
              ) : (
                <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                  {filteredActive.map(u => (
                    <div 
                      key={u.id} 
                      className="glass module-card" 
                      onClick={() => openEditUser(u)}
                      style={{ 
                        padding: "14px 16px", 
                        display: "flex", 
                        alignItems: "center", 
                        justifyContent: "space-between", 
                        gap: 12, 
                        border: "1px solid rgba(255,255,255,0.04)",
                        borderRadius: 14,
                        background: "rgba(255,255,255,0.01)"
                      }}
                    >
                      <div style={{ display: "flex", alignItems: "center", gap: 12, minWidth: 0, flex: 1 }}>
                        {/* Round Initials Avatar */}
                        <div style={{
                          width: 38,
                          height: 38,
                          borderRadius: "50%",
                          background: "linear-gradient(135deg, #475569, #1e293b)",
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          color: "white",
                          fontSize: 14,
                          fontWeight: 800,
                          border: "1px solid rgba(255,255,255,0.1)",
                          textTransform: "uppercase"
                        }}>
                          {u.full_name.charAt(0)}
                        </div>
                        
                        <div style={{ minWidth: 0, flex: 1 }}>
                          <p style={{ fontWeight: 700, fontSize: 14, color: "#e2e8f0", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", margin: 0 }}>{u.full_name}</p>
                          <p style={{ fontSize: 11, color: "#64748b", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", margin: "2px 0 0" }}>{u.email}</p>
                        </div>
                      </div>

                      <div style={{ display: "flex", alignItems: "center", gap: 10, flexShrink: 0 }}>
                        <span style={{ fontSize: 10, fontWeight: 800, color: roleColor(u.role), textTransform: "uppercase", background: `${roleColor(u.role)}12`, padding: "4px 8px", borderRadius: 6, border: `1px solid ${roleColor(u.role)}20` }}>{u.role}</span>
                        <div style={{ width: 28, height: 28, borderRadius: "50%", background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.08)", display: "flex", alignItems: "center", justifyContent: "center", color: "#64748b" }}>
                          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M12 20h9"/><path d="M16.5 3.5a2.12 2.12 0 0 1 3 3L7 19l-4 1 1-4Z"/></svg>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* VIEW 3: LIVE TELEMETRY RADAR MAP */}
      {activeView === "map" && (
        <div className="fade-in" style={{ paddingBottom: 60 }}>
          {/* Header */}
          <div style={{ padding: "20px 16px 14px", paddingTop: "calc(env(safe-area-inset-top, 0px) + 16px)", borderBottom: "1px solid rgba(255,255,255,0.05)", background: "rgba(6,9,18,0.6)", backdropFilter: "blur(10px)", position: "sticky", top: 0, zIndex: 10 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
              <button 
                onClick={() => { setActiveView("hub"); setRadarSelectedWorker(null); }}
                className="back-btn"
                style={{ width: 38, height: 38, borderRadius: 10, border: "1px solid rgba(255,255,255,0.08)", background: "rgba(255,255,255,0.03)", display: "flex", alignItems: "center", justifyContent: "center", color: "#f1f5f9", cursor: "pointer" }}
              >
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="19" y1="12" x2="5" y2="12"/><polyline points="12 19 5 12 12 5"/></svg>
              </button>
              <div>
                <p style={{ fontSize: 10, fontWeight: 800, color: "#06b6d4", letterSpacing: "0.1em", textTransform: "uppercase", margin: 0 }}>Operations tactical map</p>
                <h1 style={{ fontSize: 20, fontWeight: 800, color: "#f1f5f9", margin: "2px 0 0", letterSpacing: "-0.5px" }}>Field Crew Radar</h1>
              </div>
            </div>
          </div>

          <div style={{ padding: "16px", display: "grid", gridTemplateColumns: "1fr", gap: 16 }}>
            {/* Split Grid for Large Screens, Stacked on Mobile */}
            <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
              
              {/* Roster Section */}
              <div className="glass" style={{ padding: 20, border: "1px solid rgba(255,255,255,0.06)", borderRadius: 20 }}>
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 16 }}>
                  <h2 style={{ fontSize: 14, fontWeight: 800, textTransform: "uppercase", letterSpacing: "0.08em", color: "#94a3b8", margin: 0 }}>Operational Crew Roster</h2>
                </div>
                
                <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                  {radarWorkers.map(w => {
                    const isSelected = radarSelectedWorker?.userId === w.userId;
                    const isActive = w.status === "active";
                    
                    return (
                      <div 
                        key={w.userId}
                        onClick={() => setRadarSelectedWorker(w)}
                        style={{
                          padding: "12px 14px",
                          borderRadius: 14,
                          background: isSelected ? "rgba(6, 182, 212, 0.08)" : "rgba(255,255,255,0.01)",
                          border: isSelected ? "1px solid rgba(6, 182, 212, 0.3)" : "1px solid rgba(255,255,255,0.04)",
                          cursor: "pointer",
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "space-between",
                          transition: "all 0.2s ease"
                        }}
                      >
                        <div style={{ display: "flex", alignItems: "center", gap: 10, minWidth: 0 }}>
                          <div style={{
                            width: 32,
                            height: 32,
                            borderRadius: "50%",
                            background: "linear-gradient(135deg, #1e293b, #0f172a)",
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                            fontSize: 12,
                            fontWeight: 800,
                            color: roleColor(w.role),
                            border: `1.5px solid ${roleColor(w.role)}30`,
                            textTransform: "uppercase"
                          }}>
                            {w.fullName.charAt(0)}
                          </div>
                          
                          <div style={{ minWidth: 0 }}>
                            <p style={{ fontSize: 13, fontWeight: 750, color: isSelected ? "#06b6d4" : "#f1f5f9", margin: 0 }}>{w.fullName}</p>
                            <span style={{ fontSize: 10, color: roleColor(w.role), fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.03em" }}>{w.role}</span>
                          </div>
                        </div>

                        <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 4 }}>
                          {isActive ? (
                            <>
                              <span style={{ display: "inline-flex", alignItems: "center", gap: 4, background: "rgba(34,197,94,0.15)", color: "#4ade80", border: "1px solid rgba(34,197,94,0.2)", borderRadius: 6, padding: "2px 6px", fontSize: 9, fontWeight: 800, textTransform: "uppercase" }}>
                                <span style={{ width: 5, height: 5, borderRadius: "50%", background: "#22c55e", display: "inline-block" }} /> Active
                              </span>
                              {w.recordedAt && (
                                <span style={{ fontSize: 9, color: "#a78bfa", fontFamily: "monospace", fontWeight: 700 }}>
                                  In: {new Date(w.recordedAt).toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" })}
                                </span>
                              )}
                            </>
                          ) : (
                            <span style={{ display: "inline-flex", alignItems: "center", gap: 4, background: "rgba(255,255,255,0.02)", color: "#64748b", border: "1px solid rgba(255,255,255,0.06)", borderRadius: 6, padding: "2px 6px", fontSize: 9, fontWeight: 800, textTransform: "uppercase" }}>
                              Offline
                            </span>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Map Tactical Module */}
              <div className="glass glow-cyan" style={{ padding: 0, border: "1px solid rgba(6,182,212,0.15)", borderRadius: 24, overflow: "hidden", background: "#080b13" }}>
                
                {/* Visual Leaflet Map Container */}
                <div style={{ position: "relative", height: 280, width: "100%", borderBottom: "1px solid rgba(255,255,255,0.05)" }}>
                  {radarSelectedWorker ? (
                    <div style={{ width: "100%", height: "100%", position: "relative" }}>
                      
                      {/* Leaflet Iframe for Interactive Map */}
                      <iframe
                        title="Live Tracking Map"
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
                              
                              /* Pulsing glow animation for active marker pin */
                              .live-pulse {
                                background: #06b6d4;
                                border: 2px solid #ffffff;
                                border-radius: 50%;
                                box-shadow: 0 0 0 0 rgba(6, 182, 212, 0.7);
                                animation: pulse-glow 1.5s infinite;
                              }
                              .live-pulse-offline {
                                background: #64748b;
                                border: 2px solid #ffffff;
                                border-radius: 50%;
                              }
                              @keyframes pulse-glow {
                                0% { transform: scale(0.95); box-shadow: 0 0 0 0 rgba(6, 182, 212, 0.7); }
                                70% { transform: scale(1); box-shadow: 0 0 0 8px rgba(6, 182, 212, 0); }
                                100% { transform: scale(0.95); box-shadow: 0 0 0 0 rgba(6, 182, 212, 0); }
                              }
                            </style>
                          </head>
                          <body>
                            <div id="map"></div>
                            <script>
                              const map = L.map('map').setView([${radarSelectedWorker.latitude}, ${radarSelectedWorker.longitude}], 15);
                              
                              // Dark-themed premium street tiles (no API key required)
                              L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png', {
                                maxZoom: 20
                              }).addTo(map);

                              // Add circular geofence boundary (150 meters)
                              L.circle([${radarSelectedWorker.latitude}, ${radarSelectedWorker.longitude}], {
                                color: '${radarSelectedWorker.status === "active" ? "#06b6d4" : "#64748b"}',
                                fillColor: '${radarSelectedWorker.status === "active" ? "#06b6d4" : "#64748b"}',
                                fillOpacity: 0.1,
                                weight: 1.5,
                                radius: 150
                              }).addTo(map);

                              // Draw historical route polyline if coordinate history exists
                              const historyCoords = ${JSON.stringify(radarWorkerHistory.map(pt => [pt.latitude, pt.longitude]))};
                              if (historyCoords && historyCoords.length > 1) {
                                // Glow path (thick semi-transparent back)
                                const polylineGlow = L.polyline(historyCoords, {
                                  color: '#06b6d4',
                                  weight: 8,
                                  opacity: 0.3,
                                  lineJoin: 'round'
                                }).addTo(map);

                                // Forepath (sharp high-opacity front)
                                const polylineMain = L.polyline(historyCoords, {
                                  color: '#06b6d4',
                                  weight: 3.5,
                                  opacity: 0.95,
                                  lineJoin: 'round'
                                }).addTo(map);

                                try {
                                  map.fitBounds(polylineMain.getBounds(), { padding: [40, 40] });
                                } catch(e) {}
                              }

                              // Custom pulsing HTML marker icon
                              const pulseIcon = L.divIcon({
                                className: '${radarSelectedWorker.status === "active" ? "live-pulse" : "live-pulse-offline"}',
                                iconSize: [14, 14],
                                iconAnchor: [7, 7]
                              });

                              const marker = L.marker([${radarSelectedWorker.latitude}, ${radarSelectedWorker.longitude}], { icon: pulseIcon }).addTo(map);
                              marker.bindPopup("<b>${radarSelectedWorker.fullName}</b><br/>${radarSelectedWorker.role.toUpperCase()}<br/>${radarSelectedWorker.status === 'active' ? '🟢 Checked In' : '⚫ Offline'}").openPopup();
                            </script>
                          </body>
                          </html>
                        `}
                      />

                      {/* Map Hub Info Tag Overlay */}
                      <div style={{ position: "absolute", top: 12, left: 12, padding: "6px 12px", background: "rgba(6,9,18,0.75)", border: "1px solid rgba(255,255,255,0.06)", borderRadius: 10, display: "flex", alignItems: "center", gap: 6, zIndex: 1000 }}>
                        <span className="dot-pulse" style={{ background: radarSelectedWorker.status === "active" ? "#06b6d4" : "#64748b" }} />
                        <span style={{ fontSize: 10, fontWeight: 700, fontFamily: "monospace", color: "#94a3b8" }}>
                          {radarSelectedWorker.status === "active" ? "RADAR LIVE: SCANNING" : "OFFLINE: HISTORICAL"}
                        </span>
                      </div>

                      {/* Map Coordinate telemetry readouts Overlay */}
                      <div style={{ position: "absolute", bottom: 12, right: 12, padding: "6px 10px", background: "rgba(6,9,18,0.75)", border: "1px solid rgba(255,255,255,0.06)", borderRadius: 10, textAlign: "right", zIndex: 1000 }}>
                        <p style={{ fontSize: 9, fontFamily: "monospace", color: "#64748b", margin: 0 }}>COORDINATES</p>
                        <p style={{ fontSize: 10, fontFamily: "monospace", fontWeight: 700, color: "#cbd5e1", margin: 0 }}>
                          {`${radarSelectedWorker.latitude.toFixed(5)}° N, ${radarSelectedWorker.longitude.toFixed(5)}° E`}
                        </p>
                      </div>
                    </div>
                  ) : (
                    /* Circular Radar Sweep Placeholder */
                    <div style={{ width: "100%", height: "100%", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: 24, boxSizing: "border-box", background: "#060912" }}>
                      <div style={{ width: 64, height: 64, borderRadius: "50%", background: "rgba(6, 182, 212, 0.05)", border: "1.5px dashed rgba(6, 182, 212, 0.2)", display: "flex", alignItems: "center", justifyContent: "center", marginBottom: 14 }}>
                        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#06b6d4" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><path d="m16.2 7.8-2.9 2.9-2.9-2.9"/></svg>
                      </div>
                      <h4 style={{ fontSize: 13, fontWeight: 800, color: "#cbd5e1", margin: "0 0 4px", textTransform: "uppercase", letterSpacing: "0.05em" }}>Operational Radar Standby</h4>
                      <p style={{ fontSize: 11, color: "#64748b", margin: 0, textAlign: "center", maxWidth: 280, lineHeight: 1.4 }}>Select an active worker from the roster above to trace real-time tactical operations telemetry.</p>
                    </div>
                  )}
                </div>

                {/* HUD Telemetry Panel */}
                <div style={{ padding: 20 }}>
                  {radarSelectedWorker ? (
                    <div>
                      {/* Worker & Status Row */}
                      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 14 }}>
                        <div>
                          <h3 style={{ fontSize: 16, fontWeight: 900, color: "#f1f5f9", margin: 0 }}>{radarSelectedWorker.fullName}</h3>
                          <p style={{ fontSize: 11, color: roleColor(radarSelectedWorker.role), fontWeight: 700, margin: "2px 0 0", textTransform: "uppercase" }}>{radarSelectedWorker.role}</p>
                        </div>
                        {radarSelectedWorker.status === "active" ? (
                          <span style={{ display: "inline-flex", alignItems: "center", gap: 6, background: "rgba(34,197,94,0.12)", color: "#4ade80", border: "1px solid rgba(34,197,94,0.2)", borderRadius: 10, padding: "4px 10px", fontSize: 11, fontWeight: 800, textTransform: "uppercase" }}>
                            🟢 Connected
                          </span>
                        ) : (
                          <span style={{ display: "inline-flex", alignItems: "center", gap: 6, background: "rgba(255,255,255,0.03)", color: "#64748b", border: "1px solid rgba(255,255,255,0.06)", borderRadius: 10, padding: "4px 10px", fontSize: 11, fontWeight: 800, textTransform: "uppercase" }}>
                            Offline
                          </span>
                        )}
                      </div>

                      {/* Monospace telemetry data block */}
                      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, background: "rgba(0,0,0,0.3)", border: "1px solid rgba(255,255,255,0.05)", borderRadius: 16, padding: 14 }}>
                        <div>
                          <span style={{ fontSize: 9, color: "#64748b", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.05em" }}>Associated Project</span>
                          <p style={{ margin: "2px 0 0", fontSize: 12, fontWeight: 750, color: "#e2e8f0", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{radarSelectedWorker.projectName}</p>
                        </div>
                        <div>
                          <span style={{ fontSize: 9, color: "#64748b", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.05em" }}>Geofence Check</span>
                          <p style={{ margin: "2px 0 0", fontSize: 12, fontWeight: 800, color: radarSelectedWorker.withinGeofence ? "#4ade80" : "#fbbf24" }}>
                            {radarSelectedWorker.withinGeofence ? "WITHIN RANGE" : "OUTSIDE RANGE"}
                          </p>
                        </div>
                        <div>
                          <span style={{ fontSize: 9, color: "#64748b", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.05em" }}>Duty Status</span>
                          <p style={{ margin: "2px 0 0", fontSize: 12, fontWeight: 750, color: radarSelectedWorker.status === "active" ? "#06b6d4" : "#94a3b8" }}>
                            {radarSelectedWorker.status === "active" ? "ACTIVE / WATCH" : "STANDBY"}
                          </p>
                        </div>
                        <div>
                          <span style={{ fontSize: 9, color: "#64748b", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.05em" }}>Drift telemetry</span>
                          <p style={{ margin: "2px 0 0", fontSize: 12, fontWeight: 700, fontFamily: "monospace", color: "#a78bfa" }}>
                            {radarSelectedWorker.status === "active" ? `${radarSelectedWorker.distanceFromSiteM} meters` : "0.00m"}
                          </p>
                        </div>
                      </div>

                      {/* Zomato-style active tracking trace banner */}
                      {radarSelectedWorker.status === "active" && (
                        <div style={{ marginTop: 14, background: "rgba(6,182,212,0.04)", border: "1px solid rgba(6,182,212,0.12)", borderRadius: 12, padding: "10px 12px", display: "flex", alignItems: "center", gap: 10 }}>
                          <div className="dot-pulse" style={{ background: "#06b6d4", flexShrink: 0 }} />
                          <span style={{ fontSize: 11, color: "#06b6d4", fontWeight: 700, lineHeight: 1.4 }}>
                            Trace active. Pulsing dot is moving smoothly along the sn-cable pipeline project site path in Kottayam.
                          </span>
                        </div>
                      )}
                    </div>
                  ) : (
                    <div style={{ textAlign: "center", color: "#475569", fontSize: 12, padding: "10px 0" }}>
                      No active telemetry feed.
                    </div>
                  )}
                </div>

              </div>

            </div>
          </div>
        </div>
      )}

      {/* VIEW 4: MONTHLY DATABASE ATTENDANCE LEDGER */}
      {activeView === "attendance" && (
        <div className="fade-in" style={{ paddingBottom: 60 }}>
          {/* Header */}
          <div style={{ padding: "20px 16px 14px", paddingTop: "calc(env(safe-area-inset-top, 0px) + 16px)", borderBottom: "1px solid rgba(255,255,255,0.05)", background: "rgba(6,9,18,0.6)", backdropFilter: "blur(10px)", position: "sticky", top: 0, zIndex: 10 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
              <button 
                onClick={() => { setActiveView("hub"); setSelectedAttendanceWorker(null); setAttendanceRecords([]); }}
                className="back-btn"
                style={{ width: 38, height: 38, borderRadius: 10, border: "1px solid rgba(255,255,255,0.08)", background: "rgba(255,255,255,0.03)", display: "flex", alignItems: "center", justifyContent: "center", color: "#f1f5f9", cursor: "pointer" }}
              >
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="19" y1="12" x2="5" y2="12"/><polyline points="12 19 5 12 12 5"/></svg>
              </button>
              <div>
                <p style={{ fontSize: 10, fontWeight: 800, color: "#a78bfa", letterSpacing: "0.1em", textTransform: "uppercase", margin: 0 }}>On-Site Registry Ledger</p>
                <h1 style={{ fontSize: 20, fontWeight: 800, color: "#f1f5f9", margin: "2px 0 0", letterSpacing: "-0.5px" }}>Crew Attendance Logs</h1>
              </div>
            </div>
          </div>

          <div style={{ padding: "16px", display: "grid", gridTemplateColumns: "1fr", gap: 16 }}>
            {/* Roster Selection Panel */}
            <div className="glass" style={{ padding: 20, border: "1px solid rgba(255,255,255,0.06)", borderRadius: 20 }}>
              <h2 style={{ fontSize: 14, fontWeight: 800, textTransform: "uppercase", letterSpacing: "0.08em", color: "#94a3b8", margin: "0 0 14px" }}>Operational Crew Members</h2>
              
              <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                {active
                  .filter(u => u.role === "supervisor" || u.role === "finance")
                  .map(u => {
                    const isSelected = selectedAttendanceWorker?.id === u.id;
                    return (
                      <div
                        key={u.id}
                        onClick={async () => {
                          setSelectedAttendanceWorker(u);
                          setLoadingAttendance(true);
                          setAttendanceRecords([]);
                          try {
                            const res = await fetch(`/api/mobile/attendance?userId=${u.id}`);
                            const data = await res.json();
                            if (res.ok && data.ok) {
                              setAttendanceRecords(data.records ?? []);
                            }
                          } catch { /* ignore */ }
                          setLoadingAttendance(false);
                        }}
                        style={{
                          padding: "12px 14px",
                          borderRadius: 14,
                          background: isSelected ? "rgba(167, 139, 250, 0.08)" : "rgba(255,255,255,0.01)",
                          border: isSelected ? "1px solid rgba(167, 139, 250, 0.3)" : "1px solid rgba(255,255,255,0.04)",
                          cursor: "pointer",
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "space-between",
                          transition: "all 0.2s ease"
                        }}
                      >
                        <div style={{ display: "flex", alignItems: "center", gap: 10, minWidth: 0 }}>
                          <div style={{
                            width: 32,
                            height: 32,
                            borderRadius: "50%",
                            background: "linear-gradient(135deg, #1e293b, #0f172a)",
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                            fontSize: 12,
                            fontWeight: 800,
                            color: roleColor(u.role),
                            border: `1.5px solid ${roleColor(u.role)}30`,
                            textTransform: "uppercase"
                          }}>
                            {u.full_name.charAt(0)}
                          </div>
                          <div style={{ minWidth: 0 }}>
                            <p style={{ fontSize: 13, fontWeight: 750, color: isSelected ? "#a78bfa" : "#f1f5f9", margin: 0 }}>{u.full_name}</p>
                            <span style={{ fontSize: 9, color: "#64748b", fontFamily: "monospace" }}>{u.login_id}</span>
                          </div>
                        </div>
                        <span style={{ fontSize: 9, fontWeight: 800, color: roleColor(u.role), textTransform: "uppercase", background: `${roleColor(u.role)}12`, padding: "2px 6px", borderRadius: 4 }}>{u.role}</span>
                      </div>
                    );
                  })}
              </div>
            </div>

            {/* Attendance Logs Details Table */}
            <div className="glass" style={{ padding: 20, border: "1px solid rgba(255,255,255,0.06)", borderRadius: 20 }}>
              {selectedAttendanceWorker ? (() => {
                const getProcessedDailyLogs = () => {
                  const shifts: {
                    dateStr: string;
                    signInTime: string;
                    signInAt: string | null;
                    signOutTime: string;
                    signOutAt: string | null;
                    withinGeofence: boolean;
                    distanceFromSiteM: number;
                    latitude: number;
                    longitude: number;
                    records: any[];
                  }[] = [];

                  // Sort raw records chronologically ascending to pair check-in/outs
                  const sortedRecs = [...attendanceRecords].sort(
                    (a, b) => new Date(a.checkInAt).getTime() - new Date(b.checkInAt).getTime()
                  );

                  let currentShift: any = null;

                  sortedRecs.forEach((rec) => {
                    const dateObj = new Date(rec.checkInAt);
                    const dateLabel = dateObj.toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" });
                    const timeLabel = dateObj.toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" });

                    if (rec.status === "checked_out") {
                      if (currentShift) {
                        currentShift.signOutTime = timeLabel;
                        currentShift.signOutAt = rec.checkInAt;
                        currentShift.records.push(rec);
                        shifts.push(currentShift);
                        currentShift = null;
                      } else {
                        shifts.push({
                          dateStr: dateLabel,
                          signInTime: "--",
                          signInAt: null,
                          signOutTime: timeLabel,
                          signOutAt: rec.checkInAt,
                          withinGeofence: rec.withinGeofence,
                          distanceFromSiteM: rec.distanceFromSiteM,
                          latitude: rec.latitude,
                          longitude: rec.longitude,
                          records: [rec]
                        });
                      }
                    } else {
                      if (!currentShift) {
                        currentShift = {
                          dateStr: dateLabel,
                          signInTime: timeLabel,
                          signInAt: rec.checkInAt,
                          signOutTime: "--",
                          signOutAt: null,
                          withinGeofence: rec.withinGeofence,
                          distanceFromSiteM: rec.distanceFromSiteM,
                          latitude: rec.latitude,
                          longitude: rec.longitude,
                          records: [rec]
                        };
                      } else {
                        // Intermediate re-registration/refresh coordinate record inside active shift.
                        // We swallow it from creating a new row, but append it to the active shift records.
                        currentShift.records.push(rec);
                      }
                    }
                  });

                  if (currentShift) {
                    shifts.push(currentShift);
                  }

                  // Sort shift runs newest first
                  return shifts.reverse();
                };

                const processedLogs = getProcessedDailyLogs();
                const uniqueDays = Array.from(new Set(processedLogs.map(l => l.dateStr)));
                const totalDays = uniqueDays.length;
                const onSiteDays = Array.from(new Set(processedLogs.filter(l => l.withinGeofence).map(l => l.dateStr))).length;
                const onSiteRate = totalDays > 0 ? Math.round((onSiteDays / totalDays) * 100) : 100;
                
                return (
                  <div>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
                      <div>
                        <h3 style={{ fontSize: 16, fontWeight: 900, color: "#f1f5f9", margin: 0 }}>{selectedAttendanceWorker.full_name}</h3>
                        <p style={{ fontSize: 11, color: "#64748b", margin: "2px 0 0" }}>Monthly Duty summary (100% Real Database logs)</p>
                      </div>
                      <span style={{ fontSize: 10, fontWeight: 700, color: "#a78bfa", background: "rgba(167,139,250,0.1)", border: "1px solid rgba(167,139,250,0.2)", borderRadius: 6, padding: "3px 8px" }}>
                        {attendanceRecords.length} Raw Logs
                      </span>
                    </div>

                    {loadingAttendance ? (
                      <div style={{ textAlign: "center", padding: "40px 0", color: "#64748b" }}>
                        <div className="spinner" style={{ margin: "0 auto 12px", borderColor: "#a78bfa", borderTopColor: "transparent" }} />
                        Retrieving Database Ledger...
                      </div>
                    ) : processedLogs.length === 0 ? (
                      <div style={{ background: "rgba(0,0,0,0.2)", border: "1px solid rgba(255,255,255,0.04)", borderRadius: 16, padding: "32px 20px", textAlign: "center" }}>
                        <span style={{ fontSize: 24, display: "block", marginBottom: 8 }}>📅</span>
                        <p style={{ fontSize: 13, color: "#64748b", margin: 0 }}>No active check-in history found in the database for this user in the current month.</p>
                      </div>
                    ) : (
                      <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
                        {/* Premium Stats Grid */}
                        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 10 }}>
                          <div className="glass" style={{ padding: "12px 14px", border: "1px solid rgba(255,255,255,0.04)", borderRadius: 12, background: "rgba(255,255,255,0.01)" }}>
                            <span style={{ fontSize: 8, color: "#64748b", textTransform: "uppercase", fontWeight: 700 }}>Days Present</span>
                            <p style={{ margin: "2px 0 0", fontSize: 20, fontWeight: 900, color: "#cbd5e1" }}>{totalDays} <span style={{ fontSize: 10, fontWeight: 650, color: "#64748b" }}>Days</span></p>
                          </div>
                          <div className="glass" style={{ padding: "12px 14px", border: "1px solid rgba(255,255,255,0.04)", borderRadius: 12, background: "rgba(255,255,255,0.01)" }}>
                            <span style={{ fontSize: 8, color: "#64748b", textTransform: "uppercase", fontWeight: 700 }}>On-Site Rating</span>
                            <p style={{ margin: "2px 0 0", fontSize: 20, fontWeight: 900, color: onSiteRate >= 80 ? "#4ade80" : "#fbbf24" }}>{onSiteRate}%</p>
                          </div>
                          <div className="glass" style={{ padding: "12px 14px", border: "1px solid rgba(255,255,255,0.04)", borderRadius: 12, background: "rgba(255,255,255,0.01)" }}>
                            <span style={{ fontSize: 8, color: "#64748b", textTransform: "uppercase", fontWeight: 700 }}>Total Shifts</span>
                            <p style={{ margin: "2px 0 0", fontSize: 20, fontWeight: 900, color: "#a78bfa" }}>
                              {processedLogs.length} <span style={{ fontSize: 10, fontWeight: 650, color: "#64748b" }}>Runs</span>
                            </p>
                          </div>
                        </div>

                        {/* Highly Organized Table Layout */}
                        <div style={{ overflowX: "auto" }}>
                          <table style={{ width: "100%", borderCollapse: "collapse", textAlign: "left", fontSize: 12 }}>
                            <thead>
                              <tr style={{ borderBottom: "1px solid rgba(255,255,255,0.08)", color: "#64748b", textTransform: "uppercase", fontSize: 10, fontWeight: 800 }}>
                                <th style={{ padding: "10px 8px" }}>Date</th>
                                <th style={{ padding: "10px 8px" }}>Sign In</th>
                                <th style={{ padding: "10px 8px" }}>Sign Out</th>
                                <th style={{ padding: "10px 8px" }}>Duration</th>
                                <th style={{ padding: "10px 8px" }}>Geofence</th>
                                <th style={{ padding: "10px 8px" }}>Drift</th>
                              </tr>
                            </thead>
                            <tbody>
                              {processedLogs.map((log, index) => {
                                const durationStr = (() => {
                                  if (!log.signInAt || !log.signOutAt) return "--";
                                  const diffMs = new Date(log.signOutAt).getTime() - new Date(log.signInAt).getTime();
                                  if (diffMs <= 0) return "0 mins";
                                  const diffMins = Math.round(diffMs / 60000);
                                  if (diffMins < 60) return `${diffMins} mins`;
                                  const hrs = Math.floor(diffMins / 60);
                                  const mins = diffMins % 60;
                                  return mins > 0 ? `${hrs}h ${mins}m` : `${hrs}h`;
                                })();

                                return (
                                  <tr key={index} style={{ borderBottom: "1px solid rgba(255,255,255,0.04)", color: "#cbd5e1" }}>
                                    <td style={{ padding: "12px 8px", fontWeight: 700 }}>{log.dateStr}</td>
                                    <td style={{ padding: "12px 8px", fontFamily: "monospace", color: "#4ade80" }}>{log.signInTime}</td>
                                    <td style={{ padding: "12px 8px", fontFamily: "monospace", color: log.signOutTime !== "--" ? "#f87171" : "#64748b" }}>{log.signOutTime}</td>
                                    <td style={{ padding: "12px 8px", fontFamily: "monospace", color: "#fbbf24", fontWeight: 700 }}>{durationStr}</td>
                                    <td style={{ padding: "12px 8px" }}>
                                      <span style={{
                                        fontSize: 9,
                                        fontWeight: 800,
                                        background: log.withinGeofence ? "rgba(34,197,94,0.1)" : "rgba(239,68,68,0.1)",
                                        color: log.withinGeofence ? "#4ade80" : "#f87171",
                                        border: `1px solid ${log.withinGeofence ? "rgba(34,197,94,0.2)" : "rgba(239,68,68,0.2)"}`,
                                        padding: "2px 6px",
                                        borderRadius: 4,
                                        textTransform: "uppercase"
                                      }}>
                                        {log.withinGeofence ? "On-Site" : "Off-Site"}
                                      </span>
                                    </td>
                                    <td style={{ padding: "12px 8px", fontFamily: "monospace", color: "#a78bfa" }}>
                                      {log.distanceFromSiteM}m
                                    </td>
                                  </tr>
                                );
                              })}
                            </tbody>
                          </table>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })() : (
                <div style={{ textAlign: "center", color: "#64748b", padding: "20px 0" }}>
                  <p style={{ fontSize: 13, margin: 0 }}>Select a crew member from the directory above to display their monthly database check-in history records.</p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* VIEW 5: PROJECTS DIRECTORY MODULE */}
      {activeView === "projects" && (
        <div className="fade-in" style={{ paddingBottom: 60 }}>
          {/* Header */}
          <div style={{ padding: "20px 16px 14px", paddingTop: "calc(env(safe-area-inset-top, 0px) + 16px)", borderBottom: "1px solid rgba(255,255,255,0.05)", background: "rgba(6,9,18,0.6)", backdropFilter: "blur(10px)", position: "sticky", top: 0, zIndex: 10 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
              <button 
                onClick={() => { setActiveView("hub"); setSelectedProjectItem(null); }}
                className="back-btn"
                style={{ width: 38, height: 38, borderRadius: 10, border: "1px solid rgba(255,255,255,0.08)", background: "rgba(255,255,255,0.03)", display: "flex", alignItems: "center", justifyContent: "center", color: "#f1f5f9", cursor: "pointer" }}
              >
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="19" y1="12" x2="5" y2="12"/><polyline points="12 19 5 12 12 5"/></svg>
              </button>
              <div style={{ flex: 1 }}>
                <p style={{ fontSize: 10, fontWeight: 800, color: "#a78bfa", letterSpacing: "0.1em", textTransform: "uppercase", margin: 0 }}>Telgo Power Corridors</p>
                <h1 style={{ fontSize: 20, fontWeight: 800, color: "#f1f5f9", margin: "2px 0 0", letterSpacing: "-0.5px" }}>Projects Directory</h1>
              </div>
              <button
                onClick={resetToDefaults}
                style={{
                  background: "rgba(239, 68, 68, 0.08)",
                  border: "1px solid rgba(239, 68, 68, 0.2)",
                  borderRadius: 10,
                  padding: "6px 12px",
                  fontSize: 11,
                  fontWeight: 700,
                  color: "#fca5a5",
                  cursor: "pointer",
                  fontFamily: "Outfit, sans-serif"
                }}
              >
                🔄 Reset
              </button>
            </div>
          </div>

          <div style={{ padding: "16px", display: "flex", flexDirection: "column", gap: 16 }}>
            {/* Project List */}
            <div style={{ display: "grid", gridTemplateColumns: "1fr", gap: 10 }}>
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
                      background: isSelected ? "rgba(124, 58, 237, 0.08)" : "rgba(255,255,255,0.01)",
                      border: isSelected ? "1px solid rgba(124, 58, 237, 0.3)" : "1px solid rgba(255,255,255,0.04)",
                      cursor: "pointer",
                      display: "flex",
                      flexDirection: "column",
                      gap: 6,
                      transition: "all 0.2s ease"
                    }}
                  >
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 10 }}>
                      <h3 style={{ fontSize: 14, fontWeight: 800, color: isSelected ? "#c4b5fd" : "#f1f5f9", margin: 0 }}>{p.name}</h3>
                      <span style={{ fontSize: 10, fontWeight: 800, color: "#67e8f9", background: "rgba(6, 182, 212, 0.12)", border: "1px solid rgba(6, 182, 212, 0.2)", borderRadius: 6, padding: "2px 6px", textTransform: "uppercase", fontFamily: "monospace", flexShrink: 0 }}>
                        {p.code}
                      </span>
                    </div>
                    <div style={{ display: "flex", justifyContent: "space-between", fontSize: 11, color: "#94a3b8" }}>
                      <span>📍 District: <b>{p.district}</b></span>
                      <span>📏 Est: <b>{p.distance}</b></span>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Selected Project Detailed Corridor View & Map */}
            {selectedProjectItem && (
              <div className="glass fade-in" style={{ padding: 20, border: "1px solid rgba(255,255,255,0.06)", borderRadius: 24, background: "rgba(255,255,255,0.01)" }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 12, marginBottom: 16 }}>
                  <div>
                    <h2 style={{ fontSize: 16, fontWeight: 900, color: "#f1f5f9", margin: 0 }}>{selectedProjectItem.name}</h2>
                    <p style={{ fontSize: 12, color: "#94a3b8", margin: "4px 0 0" }}>{selectedProjectItem.description}</p>
                  </div>
                  <button
                    onClick={() => setEditingProjectItem(selectedProjectItem)}
                    style={{
                      background: "rgba(124, 58, 237, 0.12)",
                      border: "1px solid rgba(124, 58, 237, 0.3)",
                      borderRadius: 10,
                      padding: "8px 14px",
                      fontSize: 12,
                      fontWeight: 750,
                      color: "#c4b5fd",
                      cursor: "pointer",
                      fontFamily: "Outfit, sans-serif",
                      flexShrink: 0
                    }}
                  >
                    ✏️ Edit Corridor
                  </button>
                </div>

                {/* Map Display Card */}
                <div className="glass" style={{ padding: 0, border: "1px solid rgba(255,255,255,0.08)", borderRadius: 20, overflow: "hidden", background: "#080b13", marginBottom: 20 }}>
                  <div style={{ position: "relative", height: 260, width: "100%" }}>
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

                            // Primary Route (Purple utilityPath if present, else straight line)
                            const customUtility = ${JSON.stringify(selectedProjectItem.utilityPath ?? [])};
                            if (customUtility && customUtility.length >= 2) {
                              L.polyline(customUtility, { color: '#a855f7', weight: 4, opacity: 0.95, lineJoin: 'round' }).addTo(map);
                            } else {
                              L.polyline([start, end], { color: '#a855f7', weight: 4, opacity: 0.8, lineJoin: 'round' }).addTo(map);
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
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, background: "rgba(0,0,0,0.2)", border: "1px solid rgba(255,255,255,0.04)", padding: 16, borderRadius: 16 }}>
                  <div>
                    <span style={{ fontSize: 9, fontWeight: 700, color: "#64748b", textTransform: "uppercase" }}>Start Position</span>
                    <p style={{ margin: "2px 0 0", fontSize: 13, fontWeight: 750, color: "#4ade80" }}>{selectedProjectItem.startLabel}</p>
                    <span style={{ fontSize: 10, fontFamily: "monospace", color: "#64748b" }}>{selectedProjectItem.startCoords[0]}° N, {selectedProjectItem.startCoords[1]}° E</span>
                  </div>
                  <div>
                    <span style={{ fontSize: 9, fontWeight: 700, color: "#64748b", textTransform: "uppercase" }}>End Position</span>
                    <p style={{ margin: "2px 0 0", fontSize: 13, fontWeight: 750, color: "#f87171" }}>{selectedProjectItem.endLabel}</p>
                    <span style={{ fontSize: 10, fontFamily: "monospace", color: "#64748b" }}>{selectedProjectItem.endCoords[0]}° N, {selectedProjectItem.endCoords[1]}° E</span>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ADMINISTRATIVE PROJECT EDITING MODAL */}
      {editingProjectItem && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(6,9,18,0.85)", backdropFilter: "blur(8px)", display: "flex", alignItems: "center", justifyContent: "center", padding: 20, zIndex: 1100, animation: "fadeIn 0.2s ease" }}>
          <div className="glass glow-cyan" style={{ width: "100%", maxWidth: "1000px", maxHeight: "95vh", overflowY: "auto", padding: "28px 24px", background: "linear-gradient(135deg, #0d0621 0%, #060912 100%)", borderRadius: 24, border: "1px solid rgba(255, 255, 255, 0.08)", boxShadow: "0 24px 64px rgba(0, 0, 0, 0.75)", color: "#f1f5f9" }}>
            
            {/* Modal Header */}
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 20, borderBottom: "1px solid rgba(255,255,255,0.06)", paddingBottom: 14 }}>
              <div>
                <h3 style={{ fontSize: 20, fontWeight: 900, letterSpacing: "-0.5px", margin: 0, background: "linear-gradient(90deg, #c4b5fd, #06b6d4)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>Corridor GIS Editor</h3>
                <p style={{ fontSize: 11, color: "#64748b", margin: "2px 0 0", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.05em" }}>Operational Map & Project Parameters</p>
              </div>
              <button onClick={() => setEditingProjectItem(null)} style={{ background: "rgba(255, 255, 255, 0.04)", border: "1px solid rgba(255, 255, 255, 0.08)", width: 32, height: 32, borderRadius: "50%", color: "#94a3b8", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}>
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
              </button>
            </div>

            <div className="editor-container">
              
              {/* LEFT COLUMN: INTERACTIVE GIS MAP & DRAWING TOOLBAR */}
              <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <span style={{ fontSize: 11, fontWeight: 800, color: "#94a3b8", textTransform: "uppercase", letterSpacing: "0.03em" }}>Interactive GIS Tools</span>
                  <span style={{ fontSize: 10, color: "#fbbf24", background: "rgba(251,191,36,0.1)", border: "1px solid rgba(251,191,36,0.2)", borderRadius: 6, padding: "2px 6px", fontWeight: 700 }}>
                    Click Map to Draw
                  </span>
                </div>

                {/* Grid of operational drawing tools */}
                <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 8 }}>
                  <button
                    type="button"
                    onClick={() => setActivePinMode("start")}
                    className="tool-btn"
                    style={{
                      borderColor: activePinMode === "start" ? "#22c55e" : "rgba(255,255,255,0.08)",
                      background: activePinMode === "start" ? "rgba(34,197,94,0.12)" : "rgba(255,255,255,0.01)",
                      color: activePinMode === "start" ? "#4ade80" : "#94a3b8"
                    }}
                  >
                    🟢 Pin Start
                  </button>
                  <button
                    type="button"
                    onClick={() => setActivePinMode("end")}
                    className="tool-btn"
                    style={{
                      borderColor: activePinMode === "end" ? "#ef4444" : "rgba(255,255,255,0.08)",
                      background: activePinMode === "end" ? "rgba(239,68,68,0.12)" : "rgba(255,255,255,0.01)",
                      color: activePinMode === "end" ? "#f87171" : "#94a3b8"
                    }}
                  >
                    🔴 Pin End
                  </button>
                  <button
                    type="button"
                    onClick={() => setActivePinMode("hdd")}
                    className="tool-btn"
                    style={{
                      borderColor: activePinMode === "hdd" ? "#eab308" : "rgba(255,255,255,0.08)",
                      background: activePinMode === "hdd" ? "rgba(234,179,8,0.12)" : "rgba(255,255,255,0.01)",
                      color: activePinMode === "hdd" ? "#fcd34d" : "#94a3b8"
                    }}
                  >
                    🟡 HDD Pin
                  </button>
                  <button
                    type="button"
                    onClick={() => setActivePinMode("termination")}
                    className="tool-btn"
                    style={{
                      borderColor: activePinMode === "termination" ? "#2563eb" : "rgba(255,255,255,0.08)",
                      background: activePinMode === "termination" ? "rgba(37,99,235,0.12)" : "rgba(255,255,255,0.01)",
                      color: activePinMode === "termination" ? "#60a5fa" : "#94a3b8"
                    }}
                  >
                    🔵 Grid Term
                  </button>
                  <button
                    type="button"
                    onClick={() => setActivePinMode("trench")}
                    className="tool-btn"
                    style={{
                      borderColor: activePinMode === "trench" ? "#f97316" : "rgba(255,255,255,0.08)",
                      background: activePinMode === "trench" ? "rgba(249,115,22,0.12)" : "rgba(255,255,255,0.01)",
                      color: activePinMode === "trench" ? "#ff9d5c" : "#94a3b8"
                    }}
                  >
                    🟠 Trench Line
                  </button>
                  <button
                    type="button"
                    onClick={() => setActivePinMode("utility")}
                    className="tool-btn"
                    style={{
                      borderColor: activePinMode === "utility" ? "#a855f7" : "rgba(255,255,255,0.08)",
                      background: activePinMode === "utility" ? "rgba(168,85,247,0.12)" : "rgba(255,255,255,0.01)",
                      color: activePinMode === "utility" ? "#c084fc" : "#94a3b8"
                    }}
                  >
                    🟣 Utility Link
                  </button>
                </div>

                {/* Large Interactive Iframe Map */}
                <div className="glass" style={{ padding: 0, border: "1px solid rgba(255,255,255,0.08)", borderRadius: 20, overflow: "hidden", background: "#080b13" }}>
                  <div style={{ position: "relative", height: "350px", width: "100%" }}>
                    <iframe
                      title="Interactive GIS Corridor Editor"
                      style={{ width: "100%", height: "100%", border: "none" }}
                      srcDoc={`
                        <!DOCTYPE html>
                        <html>
                        <head>
                          <link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css" />
                          <script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"></script>
                          <style>
                            html, body, #map { margin: 0; padding: 0; width: 100%; height: 100%; background: #060912; cursor: crosshair; }
                            .leaflet-control-attribution { display: none !important; }
                            .leaflet-container { background: #060912 !important; }
                            .leaflet-bar a { background-color: #0b0f19 !important; color: #fff !important; border-color: rgba(255,255,255,0.15) !important; }
                            .leaflet-bar a:hover { background-color: #121826 !important; }
                            
                            .start-marker {
                              background: #22c55e;
                              border: 2.5px solid #ffffff;
                              border-radius: 50%;
                              box-shadow: 0 0 12px rgba(34, 197, 94, 0.6);
                            }
                            .end-marker {
                              background: #ef4444;
                              border: 2.5px solid #ffffff;
                              border-radius: 50%;
                              box-shadow: 0 0 12px rgba(239, 68, 68, 0.6);
                            }
                            .hdd-marker {
                              background: #eab308;
                              border: 2px solid #ffffff;
                              border-radius: 50%;
                              box-shadow: 0 0 10px rgba(234, 179, 8, 0.6);
                            }
                            .term-marker {
                              background: #2563eb;
                              border: 2px solid #ffffff;
                              border-radius: 4px;
                              box-shadow: 0 0 10px rgba(37, 99, 235, 0.6);
                            }
                          </style>
                        </head>
                        <body>
                          <div id="map"></div>
                          <script>
                            const startLat = parseFloat("${projStartLat}");
                            const startLng = parseFloat("${projStartLng}");
                            const endLat = parseFloat("${projEndLat}");
                            const endLng = parseFloat("${projEndLng}");

                            const hasStart = !isNaN(startLat) && !isNaN(startLng);
                            const hasEnd = !isNaN(endLat) && !isNaN(endLng);

                            let center = [10.0055, 76.3082];
                            if (hasStart) center = [startLat, startLng];
                            else if (hasEnd) center = [endLat, endLng];

                            const map = L.map('map').setView(center, 14);
                            
                            L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png', {
                              maxZoom: 20
                            }).addTo(map);

                            // Send map clicks to parent React view
                            map.on('click', function(e) {
                              window.parent.postMessage({
                                type: 'MAP_CLICK',
                                lat: e.latlng.lat,
                                lng: e.latlng.lng
                              }, '*');
                            });

                            const startIcon = L.divIcon({ className: 'start-marker', iconSize: [14, 14] });
                            const endIcon = L.divIcon({ className: 'end-marker', iconSize: [14, 14] });
                            const hddIcon = L.divIcon({ className: 'hdd-marker', iconSize: [12, 12] });
                            const termIcon = L.divIcon({ className: 'term-marker', iconSize: [12, 12] });

                            // Plot Start Coordinates
                            if (hasStart) {
                              L.marker([startLat, startLng], { icon: startIcon }).addTo(map).bindPopup("<b>Start Position</b>");
                            }

                            // Plot End Coordinates
                            if (hasEnd) {
                              L.marker([endLat, endLng], { icon: endIcon }).addTo(map).bindPopup("<b>End Position</b>");
                            }

                            // Primary Route (Purple utilityPath if present, else straight line)
                            const customUtilityPath = ${JSON.stringify(utilityPath)};
                            if (customUtilityPath && customUtilityPath.length >= 2) {
                              L.polyline(customUtilityPath, { color: '#a855f7', weight: 4.5, opacity: 0.95, lineJoin: 'round' }).addTo(map);
                            } else if (hasStart && hasEnd) {
                              L.polyline([[startLat, startLng], [endLat, endLng]], { color: '#a855f7', weight: 4.5, opacity: 0.8, lineJoin: 'round' }).addTo(map);
                            }

                            // Plot HDD Points
                            const hddPts = ${JSON.stringify(hddPoints)};
                            if (hddPts && hddPts.length > 0) {
                              hddPts.forEach((pt, idx) => {
                                L.marker(pt, { icon: hddIcon }).addTo(map).bindPopup("<b>HDD Location " + (idx + 1) + "</b>");
                              });
                            }

                            // Plot Grid Terminations
                            const termPts = ${JSON.stringify(terminationPoints)};
                            if (termPts && termPts.length > 0) {
                              termPts.forEach((pt, idx) => {
                                L.marker(pt, { icon: termIcon }).addTo(map).bindPopup("<b>Grid Termination " + (idx + 1) + "</b>");
                              });
                            }

                            // Plot Trenching Lines
                            const trenchLine = ${JSON.stringify(trenchingLine)};
                            if (trenchLine && trenchLine.length >= 2) {
                              L.polyline(trenchLine, { color: '#f97316', dashArray: '6, 6', weight: 3.5, opacity: 0.95, lineJoin: 'round' }).addTo(map);
                              trenchLine.forEach(pt => {
                                L.circle(pt, { color: '#f97316', fillColor: '#f97316', fillOpacity: 0.8, radius: 4 }).addTo(map);
                              });
                            }

                            // Autozoom to bounds of markers
                            const bounds = [];
                            if (hasStart) bounds.push([startLat, startLng]);
                            if (hasEnd) bounds.push([endLat, endLng]);
                            if (trenchLine && trenchLine.length > 0) trenchLine.forEach(pt => bounds.push(pt));
                            if (customUtilityPath && customUtilityPath.length > 0) customUtilityPath.forEach(pt => bounds.push(pt));
                            if (hddPts && hddPts.length > 0) hddPts.forEach(pt => bounds.push(pt));
                            if (termPts && termPts.length > 0) termPts.forEach(pt => bounds.push(pt));

                            if (bounds.length > 1) {
                              try {
                                map.fitBounds(bounds, { padding: [30, 30] });
                              } catch(e) {}
                            }
                          </script>
                        </body>
                        </html>
                      `}
                    />
                  </div>
                </div>

                {/* Visual guidelines */}
                <div style={{ background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.04)", borderRadius: 14, padding: "10px 14px", fontSize: 11, color: "#64748b", lineHeight: 1.5, display: "flex", gap: 8, alignItems: "flex-start" }}>
                  <span style={{ fontSize: 14 }}>💡</span>
                  <span>Select any drawing mode button above, then click directly on the dark-theme map on the left to set junctions, drop yellow HDD pins, blue square terminations, or draw polylines. Physical distance calculates in real-time.</span>
                </div>

                {/* Drawing Actions & Clear buttons */}
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
                  <button
                    type="button"
                    onClick={() => {
                      setHddPoints([]);
                      showToast("🧹 HDD Pins cleared!");
                    }}
                    style={{ background: "rgba(239, 68, 68, 0.05)", border: "1px solid rgba(239,68,68,0.15)", borderRadius: 10, padding: "6px 12px", fontSize: 11, fontWeight: 700, color: "#fca5a5", cursor: "pointer", fontFamily: "Outfit, sans-serif" }}
                  >
                    Clear HDD Pins
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setTerminationPoints([]);
                      showToast("🧹 Grid Terminations cleared!");
                    }}
                    style={{ background: "rgba(239, 68, 68, 0.05)", border: "1px solid rgba(239,68,68,0.15)", borderRadius: 10, padding: "6px 12px", fontSize: 11, fontWeight: 700, color: "#fca5a5", cursor: "pointer", fontFamily: "Outfit, sans-serif" }}
                  >
                    Clear Terminations
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setTrenchingLine([]);
                      updateCalculatedDistance(projStartLat, projStartLng, projEndLat, projEndLng, []);
                      showToast("🧹 Trenching path cleared!");
                    }}
                    style={{ background: "rgba(249, 115, 22, 0.08)", border: "1px solid rgba(249,115,22,0.2)", borderRadius: 10, padding: "6px 12px", fontSize: 11, fontWeight: 700, color: "#ffb07a", cursor: "pointer", fontFamily: "Outfit, sans-serif" }}
                  >
                    Clear Trench Path
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setUtilityPath([]);
                      showToast("🧹 Utility Shift path cleared!");
                    }}
                    style={{ background: "rgba(168, 85, 247, 0.08)", border: "1px solid rgba(168,85,247,0.2)", borderRadius: 10, padding: "6px 12px", fontSize: 11, fontWeight: 700, color: "#d8b4fe", cursor: "pointer", fontFamily: "Outfit, sans-serif" }}
                  >
                    Clear Utility Path
                  </button>
                </div>
              </div>

              {/* RIGHT COLUMN: PARAMETERS EDITOR FORM */}
              <form onSubmit={handleUpdateProject} style={{ display: "flex", flexDirection: "column", gap: 14 }}>
                <span style={{ fontSize: 11, fontWeight: 800, color: "#94a3b8", textTransform: "uppercase", letterSpacing: "0.03em" }}>Project parameters</span>

                {/* Project Name */}
                <div>
                  <label style={{ display: "block", fontSize: 11, fontWeight: 700, color: "#64748b", marginBottom: 6, textTransform: "uppercase", letterSpacing: "0.03em" }}>Project Name</label>
                  <input
                    type="text"
                    value={projName}
                    onChange={(e) => setProjName(e.target.value)}
                    required
                    style={{ width: "100%", height: 40, background: "rgba(0, 0, 0, 0.3)", border: "1px solid rgba(255, 255, 255, 0.08)", borderRadius: 12, padding: "0 14px", color: "#f1f5f9", fontSize: 13, fontFamily: "Outfit, sans-serif", outline: "none" }}
                  />
                </div>

                {/* Code & District */}
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                  <div>
                    <label style={{ display: "block", fontSize: 11, fontWeight: 700, color: "#64748b", marginBottom: 6, textTransform: "uppercase", letterSpacing: "0.03em" }}>Corridor ID</label>
                    <input
                      type="text"
                      value={projCode}
                      onChange={(e) => setProjCode(e.target.value)}
                      required
                      style={{ width: "100%", height: 40, background: "rgba(0, 0, 0, 0.3)", border: "1px solid rgba(255, 255, 255, 0.08)", borderRadius: 12, padding: "0 14px", color: "#f1f5f9", fontSize: 13, fontFamily: "monospace", outline: "none" }}
                    />
                  </div>
                  <div>
                    <label style={{ display: "block", fontSize: 11, fontWeight: 700, color: "#64748b", marginBottom: 6, textTransform: "uppercase", letterSpacing: "0.03em" }}>District</label>
                    <input
                      type="text"
                      value={projDistrict}
                      onChange={(e) => setProjDistrict(e.target.value)}
                      required
                      style={{ width: "100%", height: 40, background: "rgba(0, 0, 0, 0.3)", border: "1px solid rgba(255, 255, 255, 0.08)", borderRadius: 12, padding: "0 14px", color: "#f1f5f9", fontSize: 13, fontFamily: "Outfit, sans-serif", outline: "none" }}
                    />
                  </div>
                </div>

                {/* Distance calculation display */}
                <div>
                  <label style={{ display: "block", fontSize: 11, fontWeight: 700, color: "#64748b", marginBottom: 6, textTransform: "uppercase", letterSpacing: "0.03em" }}>Calculated Corridor Distance</label>
                  <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
                    <input
                      type="text"
                      value={projDistance}
                      readOnly
                      style={{ flex: 1, height: 40, background: "rgba(0,0,0,0.4)", border: "1px solid rgba(6,182,212,0.2)", borderRadius: 12, padding: "0 14px", color: "#06b6d4", fontSize: 14, fontWeight: 800, fontFamily: "monospace", outline: "none" }}
                    />
                    <span style={{ fontSize: 10, color: "#94a3b8", fontWeight: 700, textTransform: "uppercase", width: 110, lineHeight: 1.2 }}>
                      📏 Great-Circle spherical calc
                    </span>
                  </div>
                </div>

                {/* Description */}
                <div>
                  <label style={{ display: "block", fontSize: 11, fontWeight: 700, color: "#64748b", marginBottom: 6, textTransform: "uppercase", letterSpacing: "0.03em" }}>Description</label>
                  <textarea
                    value={projDesc}
                    onChange={(e) => setProjDesc(e.target.value)}
                    required
                    rows={2}
                    style={{ width: "100%", background: "rgba(0, 0, 0, 0.3)", border: "1px solid rgba(255, 255, 255, 0.08)", borderRadius: 12, padding: "10px 14px", color: "#f1f5f9", fontSize: 13, fontFamily: "Outfit, sans-serif", outline: "none", resize: "none" }}
                  />
                </div>

                {/* Start Location Parameters */}
                <div style={{ borderTop: "1px solid rgba(255,255,255,0.06)", paddingTop: 10 }}>
                  <span style={{ fontSize: 11, fontWeight: 800, color: "#4ade80", textTransform: "uppercase" }}>Start Position Parameters</span>
                  <div style={{ marginTop: 6 }}>
                    <label style={{ display: "block", fontSize: 10, color: "#64748b", marginBottom: 4, fontWeight: 700 }}>Junction/Station Label</label>
                    <input
                      type="text"
                      value={projStartLabel}
                      onChange={(e) => setProjStartLabel(e.target.value)}
                      required
                      style={{ width: "100%", height: 36, background: "rgba(0, 0, 0, 0.3)", border: "1px solid rgba(255, 255, 255, 0.08)", borderRadius: 10, padding: "0 12px", color: "#f1f5f9", fontSize: 12, outline: "none" }}
                    />
                  </div>
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginTop: 6 }}>
                    <div>
                      <label style={{ display: "block", fontSize: 10, color: "#64748b", marginBottom: 4, fontWeight: 700 }}>Latitude</label>
                      <input
                        type="text"
                        value={projStartLat}
                        onChange={(e) => {
                          setProjStartLat(e.target.value);
                          updateCalculatedDistance(e.target.value, projStartLng, projEndLat, projEndLng, trenchingLine);
                        }}
                        required
                        style={{ width: "100%", height: 36, background: "rgba(0, 0, 0, 0.3)", border: "1px solid rgba(255, 255, 255, 0.08)", borderRadius: 10, padding: "0 12px", color: "#f1f5f9", fontSize: 12, fontFamily: "monospace", outline: "none" }}
                      />
                    </div>
                    <div>
                      <label style={{ display: "block", fontSize: 10, color: "#64748b", marginBottom: 4, fontWeight: 700 }}>Longitude</label>
                      <input
                        type="text"
                        value={projStartLng}
                        onChange={(e) => {
                          setProjStartLng(e.target.value);
                          updateCalculatedDistance(projStartLat, e.target.value, projEndLat, projEndLng, trenchingLine);
                        }}
                        required
                        style={{ width: "100%", height: 36, background: "rgba(0, 0, 0, 0.3)", border: "1px solid rgba(255, 255, 255, 0.08)", borderRadius: 10, padding: "0 12px", color: "#f1f5f9", fontSize: 12, fontFamily: "monospace", outline: "none" }}
                      />
                    </div>
                  </div>
                </div>

                {/* End Location Parameters */}
                <div style={{ borderTop: "1px solid rgba(255,255,255,0.06)", paddingTop: 10 }}>
                  <span style={{ fontSize: 11, fontWeight: 800, color: "#f87171", textTransform: "uppercase" }}>End Position Parameters</span>
                  <div style={{ marginTop: 6 }}>
                    <label style={{ display: "block", fontSize: 10, color: "#64748b", marginBottom: 4, fontWeight: 700 }}>Junction/Station Label</label>
                    <input
                      type="text"
                      value={projEndLabel}
                      onChange={(e) => setProjEndLabel(e.target.value)}
                      required
                      style={{ width: "100%", height: 36, background: "rgba(0, 0, 0, 0.3)", border: "1px solid rgba(255, 255, 255, 0.08)", borderRadius: 10, padding: "0 12px", color: "#f1f5f9", fontSize: 12, outline: "none" }}
                    />
                  </div>
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginTop: 6 }}>
                    <div>
                      <label style={{ display: "block", fontSize: 10, color: "#64748b", marginBottom: 4, fontWeight: 700 }}>Latitude</label>
                      <input
                        type="text"
                        value={projEndLat}
                        onChange={(e) => {
                          setProjEndLat(e.target.value);
                          updateCalculatedDistance(projStartLat, projStartLng, e.target.value, projEndLng, trenchingLine);
                        }}
                        required
                        style={{ width: "100%", height: 36, background: "rgba(0, 0, 0, 0.3)", border: "1px solid rgba(255, 255, 255, 0.08)", borderRadius: 10, padding: "0 12px", color: "#f1f5f9", fontSize: 12, fontFamily: "monospace", outline: "none" }}
                      />
                    </div>
                    <div>
                      <label style={{ display: "block", fontSize: 10, color: "#64748b", marginBottom: 4, fontWeight: 700 }}>Longitude</label>
                      <input
                        type="text"
                        value={projEndLng}
                        onChange={(e) => {
                          setProjEndLng(e.target.value);
                          updateCalculatedDistance(projStartLat, projStartLng, projEndLat, e.target.value, trenchingLine);
                        }}
                        required
                        style={{ width: "100%", height: 36, background: "rgba(0, 0, 0, 0.3)", border: "1px solid rgba(255, 255, 255, 0.08)", borderRadius: 10, padding: "0 12px", color: "#f1f5f9", fontSize: 12, fontFamily: "monospace", outline: "none" }}
                      />
                    </div>
                  </div>
                </div>

                {/* Submit Action Buttons */}
                <div style={{ display: "flex", gap: 12, borderTop: "1px solid rgba(255,255,255,0.06)", paddingTop: 14, marginTop: 6 }}>
                  <button
                    type="button"
                    onClick={() => setEditingProjectItem(null)}
                    style={{ flex: 0.8, minHeight: 44, background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.08)", borderRadius: 12, color: "#94a3b8", fontSize: 13, fontWeight: 750, cursor: "pointer", fontFamily: "Outfit, sans-serif" }}
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    style={{ flex: 1.2, minHeight: 44, background: "linear-gradient(135deg, #06b6d4 0%, #7c3aed 100%)", border: "none", borderRadius: 12, color: "white", fontSize: 13, fontWeight: 800, cursor: "pointer", display: "flex", alignItems: "center", justifyItems: "center", justifyContent: "center", gap: 6, boxShadow: "0 4px 15px rgba(6, 182, 212, 0.25)" }}
                  >
                    ✓ Save Project & GIS
                  </button>
                </div>
              </form>

            </div>
          </div>
        </div>
      )}

      {/* Credentials Modal */}
      {approvedCreds && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(6,9,18,0.85)", backdropFilter: "blur(8px)", display: "flex", alignItems: "center", justifyContent: "center", padding: 20, zIndex: 1000, animation: "fadeIn 0.2s ease" }}>
          <div className="glass glow-cyan" style={{ width: "100%", maxWidth: 400, padding: 30, background: "linear-gradient(135deg, #0e0829 0%, #060912 100%)", borderRadius: 24, textAlign: "center", border: "1px solid rgba(6,182,212,0.3)" }}>
            <div style={{ width: 56, height: 56, borderRadius: "50%", background: "rgba(6,182,212,0.15)", border: "1px solid rgba(6,182,212,0.3)", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 16px" }}>
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#06b6d4" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
            </div>
            <h3 style={{ fontSize: 20, fontWeight: 800, color: "#f1f5f9", marginBottom: 8 }}>Credentials Active!</h3>
            <p style={{ fontSize: 13, color: "#94a3b8", marginBottom: 20, lineHeight: 1.5 }}>
              Account is active. The credentials have been sent via email from <strong style={{ color: "#06b6d4" }}>ajipaul96@gmail.com</strong>! You can also copy them below:
            </p>
            
            <div style={{ background: "rgba(0,0,0,0.3)", border: "1px solid rgba(255,255,255,0.06)", borderRadius: 16, padding: 18, marginBottom: 24, textAlign: "left", display: "flex", flexDirection: "column", gap: 12 }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <div>
                  <span style={{ fontSize: 10, fontWeight: 700, color: "#64748b", textTransform: "uppercase", letterSpacing: "0.08em" }}>Login Email</span>
                  <p style={{ fontSize: 14, fontFamily: "monospace", color: "#e2e8f0", margin: "2px 0 0" }}>{approvedCreds.email}</p>
                </div>
                <button onClick={() => { navigator.clipboard.writeText(approvedCreds.email); showToast("📋 Email copied!"); }} style={{ background: "rgba(6,182,212,0.1)", border: "1px solid rgba(6,182,212,0.2)", borderRadius: 8, padding: "4px 8px", fontSize: 11, fontWeight: 600, color: "#06b6d4", cursor: "pointer", fontFamily: "Outfit, sans-serif" }}>Copy</button>
              </div>
              <div style={{ height: 1, background: "rgba(255,255,255,0.05)" }} />
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <div>
                  <span style={{ fontSize: 10, fontWeight: 700, color: "#64748b", textTransform: "uppercase", letterSpacing: "0.08em" }}>Password</span>
                  <p style={{ fontSize: 16, fontFamily: "monospace", fontWeight: 800, color: "#a78bfa", margin: "2px 0 0", letterSpacing: "1px" }}>{approvedCreds.password}</p>
                </div>
                <button onClick={() => { navigator.clipboard.writeText(approvedCreds.password); showToast("📋 Password copied!"); }} style={{ background: "rgba(167,139,250,0.1)", border: "1px solid rgba(167,139,250,0.2)", borderRadius: 8, padding: "4px 8px", fontSize: 11, fontWeight: 600, color: "#a78bfa", cursor: "pointer", fontFamily: "Outfit, sans-serif" }}>Copy</button>
              </div>
            </div>
            
            <button onClick={() => setApprovedCreds(null)} className="btn-primary" style={{ minHeight: 44, fontSize: 14 }}>
              Done & Dismiss
            </button>
          </div>
        </div>
      )}

      {/* Admin Self Profile Settings Modal */}
      <ProfileModal
        isOpen={isAdminSettingsOpen}
        onClose={() => setIsAdminSettingsOpen(false)}
        user={adminSelf as any}
        onUpdate={(updated: any) => setAdminSelf(updated)}
      />

      {/* ADMINISTRATIVE USER MANAGEMENT MODAL */}
      {selectedUser && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(6,9,18,0.85)", backdropFilter: "blur(8px)", display: "flex", alignItems: "center", justifyContent: "center", padding: 20, zIndex: 1100, animation: "fadeIn 0.2s ease" }}>
          <div className="glass" style={{ width: "100%", maxWidth: 420, padding: "28px 24px", background: "linear-gradient(135deg, #0f082e 0%, #060912 100%)", borderRadius: 24, border: "1px solid rgba(255, 255, 255, 0.08)", boxShadow: "0 24px 64px rgba(0, 0, 0, 0.7)", color: "#f1f5f9" }}>
            
            {/* Modal Header */}
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 20 }}>
              <h3 style={{ fontSize: 18, fontWeight: 900, letterSpacing: "-0.02em", margin: 0 }}>Manage Crew Profile</h3>
              <button onClick={() => setSelectedUser(null)} style={{ background: "rgba(255, 255, 255, 0.04)", border: "1px solid rgba(255, 255, 255, 0.08)", width: 32, height: 32, borderRadius: "50%", color: "#94a3b8", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}>
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
              </button>
            </div>

            {/* Avatar Preview */}
            <div style={{ display: "flex", flexDirection: "column", alignItems: "center", marginBottom: 20 }}>
              <div style={{
                width: 64,
                height: 64,
                borderRadius: "50%",
                background: "linear-gradient(135deg, #475569, #1e293b)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                color: "white",
                fontSize: 24,
                fontWeight: 800,
                border: "2px solid rgba(255,255,255,0.1)",
                textTransform: "uppercase",
                marginBottom: 8
              }}>
                {editName ? editName.charAt(0) : "U"}
              </div>
              <span style={{ fontSize: 11, fontWeight: 700, color: roleColor(editRole), textTransform: "uppercase", letterSpacing: "0.05em" }}>{editRole}</span>
            </div>

            <form onSubmit={handleUpdateUser} style={{ display: "flex", flexDirection: "column", gap: 14 }}>
              {/* Name field */}
              <div>
                <label style={{ display: "block", fontSize: 11, fontWeight: 700, color: "#94a3b8", marginBottom: 6, textTransform: "uppercase", letterSpacing: "0.03em" }}>Display Name</label>
                <input
                  type="text"
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  required
                  style={{ width: "100%", height: 44, background: "rgba(0, 0, 0, 0.3)", border: "1px solid rgba(255, 255, 255, 0.08)", borderRadius: 12, padding: "0 14px", color: "#f1f5f9", fontSize: 14, fontFamily: "Outfit, sans-serif", outline: "none" }}
                />
              </div>

              {/* Email field */}
              <div>
                <label style={{ display: "block", fontSize: 11, fontWeight: 700, color: "#94a3b8", marginBottom: 6, textTransform: "uppercase", letterSpacing: "0.03em" }}>Email Address</label>
                <input
                  type="email"
                  value={editEmail}
                  onChange={(e) => setEditEmail(e.target.value)}
                  required
                  style={{ width: "100%", height: 44, background: "rgba(0, 0, 0, 0.3)", border: "1px solid rgba(255, 255, 255, 0.08)", borderRadius: 12, padding: "0 14px", color: "#f1f5f9", fontSize: 14, fontFamily: "monospace", outline: "none" }}
                />
              </div>

              {/* Role selector field */}
              <div>
                <label style={{ display: "block", fontSize: 11, fontWeight: 700, color: "#94a3b8", marginBottom: 6, textTransform: "uppercase", letterSpacing: "0.03em" }}>Security & Operations Role</label>
                <select
                  value={editRole}
                  onChange={(e) => setEditRole(e.target.value)}
                  style={{ width: "100%", height: 44, background: "#060912", border: "1px solid rgba(255, 255, 255, 0.08)", borderRadius: 12, padding: "0 14px", color: "#f1f5f9", fontSize: 14, outline: "none", cursor: "pointer", fontFamily: "Outfit, sans-serif" }}
                >
                  <option value="supervisor">Supervisor (Field Engineer)</option>
                  <option value="client">Client (KSEB / Board Member)</option>
                  <option value="finance">Finance Team Member</option>
                  <option value="admin">Administrator</option>
                </select>
              </div>

              {/* Account Status Display */}
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginTop: 4 }}>
                <div>
                  <span style={{ fontSize: 10, color: "#475569", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.05em" }}>Operational ID</span>
                  <p style={{ margin: "2px 0 0", fontSize: 13, fontWeight: 700, fontFamily: "monospace", color: "#94a3b8" }}>{(selectedUser as any).login_id}</p>
                </div>
                <div>
                  <span style={{ fontSize: 10, color: "#475569", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.05em" }}>Status</span>
                  <p style={{ margin: "2px 0 0", fontSize: 13, fontWeight: 800, color: editStatus === "blocked" ? "#f87171" : "#4ade80", textTransform: "uppercase" }}>{editStatus}</p>
                </div>
              </div>

              {/* Action Buttons Row */}
              <div style={{ display: "flex", flexDirection: "column", gap: 10, marginTop: 14 }}>
                <button
                  type="submit"
                  disabled={savingUser}
                  style={{ width: "100%", minHeight: 44, background: "linear-gradient(135deg, #06b6d4 0%, #7c3aed 100%)", border: "none", borderRadius: 12, color: "white", fontSize: 14, fontWeight: 750, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: 6, boxShadow: "0 4px 15px rgba(6, 182, 212, 0.2)" }}
                >
                  {savingUser ? <div className="spinner" style={{ width: 14, height: 14 }} /> : "✓ Apply & Save Changes"}
                </button>

                <div style={{ display: "flex", gap: 10 }}>
                  {/* Resend credentials button */}
                  <button
                    type="button"
                    onClick={() => { resendCredentials(selectedUser.id); setSelectedUser(null); }}
                    style={{ flex: 1, minHeight: 40, background: "rgba(6, 182, 212, 0.08)", border: "1px solid rgba(6, 182, 212, 0.2)", borderRadius: 10, color: "#06b6d4", fontSize: 13, fontWeight: 700, cursor: "pointer" }}
                  >
                    🔑 Resend Mail
                  </button>

                  {/* Terminate Access Button */}
                  <button
                    type="button"
                    onClick={handleTerminateUser}
                    style={{ flex: 1, minHeight: 40, background: "rgba(239, 68, 68, 0.08)", border: "1px solid rgba(239, 68, 68, 0.2)", borderRadius: 10, color: "#fca5a5", fontSize: 13, fontWeight: 700, cursor: "pointer" }}
                  >
                    🚫 Terminate
                  </button>
                </div>
              </div>

            </form>
          </div>
        </div>
      )}

      {/* Toast */}
      {toast && (
        <div style={{ position: "fixed", bottom: 24, left: 16, right: 16, background: "#1e293b", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 14, padding: "14px 18px", fontSize: 14, fontWeight: 600, color: "#f1f5f9", zIndex: 10000, textAlign: "center", boxShadow: "0 8px 32px rgba(0,0,0,0.5)", animation: "fadeIn 0.3s ease" }}>
          {toast}
        </div>
      )}
    </div>
  );
}


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
  const [activeView, setActiveView] = useState<"hub" | "approvals" | "map" | "settings" | "attendance" | "projects" | "reports" | "ledger" | "progress" | "expense_fuel" | "expense_travel" | "expense_room" | "expense_tool" | "expense_other" | "progress_analytics">("hub");

  // New States for Financials & Site Progress Modules
  const [financialFilterProjectId, setFinancialFilterProjectId] = useState("");
  const [financialFilterMonth, setFinancialFilterMonth] = useState(() => String(new Date().getMonth() + 1));
  const [financialFilterYear, setFinancialFilterYear] = useState(() => String(new Date().getFullYear()));
  const [allApprovedDailyReports, setAllApprovedDailyReports] = useState<any[]>([]);
  const [loadingApprovedReports, setLoadingApprovedReports] = useState(false);
  
  // Clarification Chat States
  const [clarificationMessages, setClarificationMessages] = useState<any[]>([]);
  const [loadingClarificationMessages, setLoadingClarificationMessages] = useState(false);
  const [newClarificationMessage, setNewClarificationMessage] = useState("");
  const [flaggedItemType, setFlaggedItemType] = useState("general");
  const [isFlagRequestOpen, setIsFlagRequestOpen] = useState(false);
  
  // Inline Admin Edit States
  const [isAdminEditMode, setIsAdminEditMode] = useState(false);
  const [editReportLaborCount, setEditReportLaborCount] = useState(0);
  const [editReportOtHours, setEditReportOtHours] = useState(0);
  const [editReportCalculatedWages, setEditReportCalculatedWages] = useState(0);
  const [editReportFuelExpenses, setEditReportFuelExpenses] = useState(0);
  const [editReportTravelExpenses, setEditReportTravelExpenses] = useState(0);
  const [editReportRoomRent, setEditReportRoomRent] = useState(0);
  const [editReportToolRent, setEditReportToolRent] = useState(0);
  const [editReportExcavationLength, setEditReportExcavationLength] = useState(0);
  const [editReportHddLength, setEditReportHddLength] = useState(0);
  const [editReportCableLayingLength, setEditReportCableLayingLength] = useState(0);
  const [editReportCableMoundingLength, setEditReportCableMoundingLength] = useState(0);
  const [editReportJoiningLinksCompleted, setEditReportJoiningLinksCompleted] = useState(0);
  const [editReportRmuFoundationStatus, setEditReportRmuFoundationStatus] = useState(0);
  const [editReportTerminationEndpoints, setEditReportTerminationEndpoints] = useState(0);
  const [savingReportEdits, setSavingReportEdits] = useState(false);

  // Daily Reports & Master Ledger States
  const [pendingReports, setPendingReports] = useState<any[]>([]);
  const [loadingReports, setLoadingReports] = useState(false);
  const [selectedReport, setSelectedReport] = useState<any | null>(null);
  const [reportFilterDate, setReportFilterDate] = useState(() => new Date().toISOString().split("T")[0]);
  const [reportFilterProjectId, setReportFilterProjectId] = useState("");
  const [masterLedgerList, setMasterLedgerList] = useState<any[]>([]);
  const [loadingLedger, setLoadingLedger] = useState(false);
  const [selectedLedgerProject, setSelectedLedgerProject] = useState("");
  const [approvingReportId, setApprovingReportId] = useState<string | null>(null);
  const [adminActiveImagePreview, setAdminActiveImagePreview] = useState<string | null>(null);

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

  // Notifications Operations Feed State
  const [adminNotifications, setAdminNotifications] = useState<any[]>([]);
  const [lastNotificationId, setLastNotificationId] = useState<string | null>(null);

  const fetchNotifications = () => {
    fetch("/api/mobile/notifications")
      .then(res => res.json())
      .then(d => {
        if (d.ok && d.notifications) {
          setAdminNotifications(d.notifications);

          const newest = d.notifications[0];
          if (newest && newest.id !== lastNotificationId) {
            setLastNotificationId(newest.id);
            if (newest.title?.includes("Project Updated") || newest.title?.includes("Project Created")) {
              fetchProjectsFromServer();
            }
          }
        }
      })
      .catch(err => console.error("Error fetching notifications:", err));
  };

  useEffect(() => {
    fetchNotifications();
    const interval = setInterval(fetchNotifications, 5000);
    return () => clearInterval(interval);
  }, [lastNotificationId]);

  // Dynamically draw the bore path grid graph on HTML5 Canvas in Admin daily report preview
  useEffect(() => {
    if (!selectedReport || activeView !== "reports") return;
    const canvas = document.getElementById("adminHddBoreCanvas") as HTMLCanvasElement;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const width = canvas.width;
    const height = canvas.height;

    ctx.clearRect(0, 0, width, height);

    const marginLeft = 45;
    const marginRight = 20;
    const marginTop = 30;
    const marginBottom = 30;

    const plotWidth = width - marginLeft - marginRight;
    const plotHeight = height - marginTop - marginBottom;

    // Draw white background
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, width, height);

    // Draw grid background matching paper
    ctx.strokeStyle = "#e2e8f0";
    ctx.lineWidth = 0.5;
    
    // Vertical grid lines
    const gridCols = 20;
    for (let i = 0; i <= gridCols; i++) {
      const x = marginLeft + (i * plotWidth) / gridCols;
      ctx.beginPath();
      ctx.moveTo(x, marginTop);
      ctx.lineTo(x, marginTop + plotHeight);
      ctx.stroke();
    }

    // Horizontal grid lines
    const gridRows = 10;
    for (let i = 0; i <= gridRows; i++) {
      const y = marginTop + (i * plotHeight) / gridRows;
      ctx.beginPath();
      ctx.moveTo(marginLeft, y);
      ctx.lineTo(marginLeft + plotWidth, y);
      ctx.stroke();
    }

    // Draw solid axes
    ctx.strokeStyle = "#475569";
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(marginLeft, marginTop);
    ctx.lineTo(marginLeft + plotWidth, marginTop);
    ctx.moveTo(marginLeft, marginTop);
    ctx.lineTo(marginLeft, marginTop + plotHeight);
    ctx.stroke();

    // Title / Header Labels
    ctx.fillStyle = "#0f172a";
    ctx.font = "bold 9px Outfit, sans-serif";
    ctx.fillText("Bore Path Elevation Profile", marginLeft, marginTop - 15);
    ctx.fillStyle = "#64748b";
    ctx.font = "8px Outfit, sans-serif";
    ctx.fillText("X-Axis: Distance (m)  |  Y-Axis: Depth (m) (Downward)", marginLeft, marginTop - 5);

    const logs = selectedReport.hddDrillingLogs || [];
    const rodLength = Number(selectedReport.hddMetadata?.hddRodLengthM || 3.0);

    if (logs.length === 0) {
      ctx.fillStyle = "#94a3b8";
      ctx.font = "italic 11px Outfit, sans-serif";
      ctx.textAlign = "center";
      ctx.fillText("No rod logs entered.", width / 2 + 10, height / 2 + 10);
      ctx.textAlign = "left";
      return;
    }

    // Process logs to get coordinates
    const points = logs.map((log: any, index: number) => {
      const dist = (index + 1) * rodLength;
      const depth = Number(log.depth || 0);
      return { dist, depth, strata: log.strata, crossing: log.crossing, rodNo: index + 1 };
    });

    const maxDist = Math.max(50, ...points.map((p: any) => p.dist));
    const maxDepth = Math.max(6, ...points.map((p: any) => p.depth));

    const axisMaxDist = Math.ceil(maxDist / 10) * 10;
    const axisMaxDepth = Math.ceil(maxDepth / 2) * 2;

    // Draw X-axis ticks (Distance)
    ctx.fillStyle = "#475569";
    ctx.font = "8px Outfit, sans-serif";
    ctx.textAlign = "center";
    for (let i = 0; i <= 5; i++) {
      const distVal = (axisMaxDist * i) / 5;
      const x = marginLeft + (distVal / axisMaxDist) * plotWidth;
      ctx.fillText(distVal.toFixed(0) + "m", x, marginTop + plotHeight + 12);
    }

    // Draw Y-axis ticks (Depth - Downward)
    ctx.textAlign = "right";
    for (let i = 0; i <= 4; i++) {
      const depthVal = (axisMaxDepth * i) / 4;
      const y = marginTop + (depthVal / axisMaxDepth) * plotHeight;
      ctx.fillText(depthVal.toFixed(1) + "m", marginLeft - 6, y + 3);
    }
    ctx.textAlign = "left";

    // Plot Bore Path Line
    ctx.strokeStyle = "#0284c7";
    ctx.lineWidth = 2.5;
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    ctx.beginPath();
    ctx.moveTo(marginLeft, marginTop);

    points.forEach(p => {
      const x = marginLeft + (p.dist / axisMaxDist) * plotWidth;
      const y = marginTop + (p.depth / axisMaxDepth) * plotHeight;
      ctx.lineTo(x, y);
    });
    ctx.stroke();

    // Plot node points
    points.forEach(p => {
      const x = marginLeft + (p.dist / axisMaxDist) * plotWidth;
      const y = marginTop + (p.depth / axisMaxDepth) * plotHeight;

      ctx.fillStyle = "#ffffff";
      ctx.strokeStyle = "#0284c7";
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(x, y, 4, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();

      // Label rod number
      ctx.fillStyle = "#475569";
      ctx.font = "bold 7px Outfit, sans-serif";
      ctx.fillText(p.rodNo.toString(), x - 2, y - 6);

      if (p.crossing && p.crossing.trim() !== "") {
        ctx.fillStyle = "#dc2626";
        ctx.strokeStyle = "#ffffff";
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.arc(x, y, 6, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();

        ctx.fillStyle = "#dc2626";
        ctx.font = "bold 7px Outfit, sans-serif";
        ctx.fillText(p.crossing.trim(), x + 8, y + 3);
      }
    });

  }, [selectedReport, activeView]);

  const dismissNotification = (id: string) => {
    setAdminNotifications(prev => prev.filter(n => n.id !== id));
    fetch(`/api/mobile/notifications?id=${id}`, {
      method: "DELETE"
    })
      .then(res => res.json())
      .then(d => {
        if (!d.ok) {
          console.error("Failed to dismiss notification on backend:", d.message);
          fetchNotifications();
        }
      })
      .catch(err => {
        console.error("Error dismissing notification:", err);
        fetchNotifications();
      });
  };

  const clearAllNotifications = () => {
    setAdminNotifications([]);
    fetch("/api/mobile/notifications", {
      method: "DELETE"
    })
      .then(res => res.json())
      .then(d => {
        if (!d.ok) {
          console.error("Failed to clear notifications on backend:", d.message);
          fetchNotifications();
        }
      })
      .catch(err => {
        console.error("Error clearing notifications:", err);
        fetchNotifications();
      });
  };

  // User Administration Edit State
  const [selectedUser, setSelectedUser] = useState<AccessUser | null>(null);
  const [editName, setEditName] = useState("");
  const [editEmail, setEditEmail] = useState("");
  const [editRole, setEditRole] = useState("");
  const [editStatus, setEditStatus] = useState("");
  const [savingUser, setSavingUser] = useState(false);

  // User Administration Create State
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [createName, setCreateName] = useState("");
  const [createEmail, setCreateEmail] = useState("");
  const [createRole, setCreateRole] = useState("supervisor");
  const [createPassword, setCreatePassword] = useState("");
  const [isCreatingUser, setIsCreatingUser] = useState(false);

  // Real Projects States
  const [projectsList, setProjectsList] = useState<any[]>([]);
  const [selectedProjectItem, setSelectedProjectItem] = useState<any | null>(null);
  const [editingProjectItem, setEditingProjectItem] = useState<any | null>(null);
  const [gisEditLayer, setGisEditLayer] = useState<"corridor" | "cable" | "hdd" | "trench">("corridor");
  
  // Advanced Segment-based GIS planning states
  const [roadChangeSegments, setRoadChangeSegments] = useState<[[number, number], [number, number]][]>([]);
  const [hddSegments, setHddSegments] = useState<[[number, number], [number, number]][]>([]);
  const [trenchingSegments, setTrenchingSegments] = useState<[[number, number], [number, number]][]>([]);
  const [tempRoadStart, setTempRoadStart] = useState<[number, number] | null>(null);
  const [tempHddStart, setTempHddStart] = useState<[number, number] | null>(null);
  const [tempTrenchStart, setTempTrenchStart] = useState<[number, number] | null>(null);

  // Daily Progress logger & documents states
  const [progressDate, setProgressDate] = useState(() => new Date().toISOString().split("T")[0]);
  const [progressType, setProgressType] = useState<"trenching" | "hdd">("trenching");
  const [progressMeters, setProgressMeters] = useState("");
  const [progressNote, setProgressNote] = useState("");
  const [progressActiveTab, setProgressActiveTab] = useState<"log" | "docs">("log");
  
  // Edit Project fields
  const [projName, setProjName] = useState("");
  const [projCode, setProjCode] = useState("");
  const [projDistrict, setProjDistrict] = useState("");
  const [projDistance, setProjDistance] = useState("");
  const [projManualDistance, setProjManualDistance] = useState("");
  const [projMiddlePoints, setProjMiddlePoints] = useState<[number, number][]>([]);
  const [projDesc, setProjDesc] = useState("");
  const [projStartLabel, setProjStartLabel] = useState("");
  const [projStartLat, setProjStartLat] = useState("");
  const [projStartLng, setProjStartLng] = useState("");
  const [projEndLabel, setProjEndLabel] = useState("");
  const [projEndLat, setProjEndLat] = useState("");
  const [projEndLng, setProjEndLng] = useState("");

  // HDD Defaults Configuration Editor States
  const [projHddDefaultMachineName, setProjHddDefaultMachineName] = useState("");
  const [projHddDefaultVendorName, setProjHddDefaultVendorName] = useState("");
  const [projHddDefaultTrackerName, setProjHddDefaultTrackerName] = useState("");
  const [projHddDefaultOperatorName, setProjHddDefaultOperatorName] = useState("");
  const [projHddDefaultDuctsInfo, setProjHddDefaultDuctsInfo] = useState("");
  const [projHddDefaultRodLengthM, setProjHddDefaultRodLengthM] = useState("3.0");

  // Sub-maps editing parameters
  const [cableStartLat, setCableStartLat] = useState("");
  const [cableStartLng, setCableStartLng] = useState("");
  const [cableEndLat, setCableEndLat] = useState("");
  const [cableEndLng, setCableEndLng] = useState("");
  const [cableMiddlePoints, setCableMiddlePoints] = useState<[number, number][]>([]);
  const [cableDesc, setCableDesc] = useState("");

  const [hddStartLat, setHddStartLat] = useState("");
  const [hddStartLng, setHddStartLng] = useState("");
  const [hddEndLat, setHddEndLat] = useState("");
  const [hddEndLng, setHddEndLng] = useState("");
  const [hddMiddlePoints, setHddMiddlePoints] = useState<[number, number][]>([]);
  const [hddDesc, setHddDesc] = useState("");

  const [trenchStartLat, setTrenchStartLat] = useState("");
  const [trenchStartLng, setTrenchStartLng] = useState("");
  const [trenchEndLat, setTrenchEndLat] = useState("");
  const [trenchEndLng, setTrenchEndLng] = useState("");
  const [trenchMiddlePoints, setTrenchMiddlePoints] = useState<[number, number][]>([]);
  const [trenchDesc, setTrenchDesc] = useState("");

  // Upgraded GIS Marks & Drawing State parameters
  const [activePinMode, setActivePinMode] = useState<"start" | "end" | "middle" | "project_start" | "project_end" | "road_segment" | "hdd" | "hdd_segment" | "trench" | "trench_segment" | "termination" | "utility">("start");
  const [hddPoints, setHddPoints] = useState<[number, number][]>([]);
  const [terminationPoints, setTerminationPoints] = useState<[number, number][]>([]);
  const [trenchingLine, setTrenchingLine] = useState<[number, number][]>([]);
  const [utilityPath, setUtilityPath] = useState<[number, number][]>([]);

  // Upgraded Geocoding Search States
  const [searchQueryMap, setSearchQueryMap] = useState("");
  const [searchingMap, setSearchingMap] = useState(false);

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
    middlePts: [number, number][] = []
  ) => {
    const lat1 = parseFloat(sLat);
    const lng1 = parseFloat(sLng);
    const lat2 = parseFloat(eLat);
    const lng2 = parseFloat(eLng);
    if (!isNaN(lat1) && !isNaN(lng1) && !isNaN(lat2) && !isNaN(lng2)) {
      // Build OSRM query route string including middle connection points
      let queryPoints = `${lng1},${lat1}`;
      if (middlePts && middlePts.length > 0) {
        queryPoints += ";" + middlePts.map(pt => `${pt[1]},${pt[0]}`).join(";");
      }
      queryPoints += `;${lng2},${lat2}`;

      // Fetch driving distance AND coordinates snapped to actual roads
      fetch(`https://router.project-osrm.org/route/v1/driving/${queryPoints}?overview=full&geometries=geojson`)
        .then(r => r.json())
        .then(data => {
          if (data.code === "Ok" && data.routes && data.routes.length > 0) {
            const routeDistanceKm = data.routes[0].distance / 1000;
            setProjDistance(`${routeDistanceKm.toFixed(2)} km`);
            
            // Dynamically set utility path to follow the road network
            const routeCoords = data.routes[0].geometry.coordinates.map((c: [number, number]) => [c[1], c[0]] as [number, number]);
            setUtilityPath(routeCoords);
          } else {
            const dist = calculateHaversineDistance(lat1, lng1, lat2, lng2);
            setProjDistance(`${dist.toFixed(2)} km`);
            setUtilityPath([[lat1, lng1], [lat2, lng2]]);
          }
        })
        .catch(() => {
          const dist = calculateHaversineDistance(lat1, lng1, lat2, lng2);
          setProjDistance(`${dist.toFixed(2)} km`);
          setUtilityPath([[lat1, lng1], [lat2, lng2]]);
        });
    } else {
      setProjDistance("0.00 km");
    }
  };

  // Automatically recalculate road distance and path when start, end, or middle coordinates change
  useEffect(() => {
    if (!editingProjectItem) return;
    const timer = setTimeout(() => {
      updateCalculatedDistance(projStartLat, projStartLng, projEndLat, projEndLng, projMiddlePoints);
    }, 400); // 400ms debounce
    return () => clearTimeout(timer);
  }, [projStartLat, projStartLng, projEndLat, projEndLng, projMiddlePoints, editingProjectItem]);

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

  function fetchProjectsFromServer() {
    fetch("/api/mobile/projects")
      .then(res => res.json())
      .then(d => {
        if (d.ok && d.projects && d.projects.length > 0) {
          setProjectsList(d.projects);
          setSelectedProjectItem((prev: any) => {
            if (!prev) return d.projects[0];
            const updated = d.projects.find((p: any) => p.id === prev.id);
            return updated || d.projects[0];
          });
          localStorage.setItem("telgo_custom_projects", JSON.stringify(d.projects));
        }
      })
      .catch(err => console.error("Error fetching projects from database:", err));
  };

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
    setSelectedProjectItem(initialList[0]);

    // Fetch projects from Supabase database
    fetchProjectsFromServer();
  }, []);

  const syncProjectUpdate = (updated: any, nextList: any[]) => {
    setProjectsList(nextList);
    setSelectedProjectItem(updated);
    localStorage.setItem("telgo_custom_projects", JSON.stringify(nextList));

    const isNew = !projectsList.some(p => p.id === updated.id);
    const url = isNew ? "/api/mobile/projects" : `/api/mobile/projects/${updated.id}`;
    const method = isNew ? "POST" : "PATCH";

    fetch(url, {
      method: method,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(updated)
    })
      .then(res => res.json())
      .then(d => {
        if (d.ok) {
          fetchProjectsFromServer();
        } else {
          console.error("Database project sync failed:", d.message);
        }
      })
      .catch(err => console.error("Error syncing project update:", err));
  };

  // Set default financial project when list loads
  useEffect(() => {
    if (projectsList.length > 0 && !financialFilterProjectId) {
      setFinancialFilterProjectId(projectsList[0].id);
    }
  }, [projectsList, financialFilterProjectId]);

  const fetchAllProjectApprovedReports = useCallback(async (projectId: string) => {
    if (!projectId) return;
    setLoadingApprovedReports(true);
    try {
      const res = await fetch(`/api/mobile/daily-reports?projectId=${projectId}`);
      const data = await res.json();
      if (res.ok && data.ok) {
        setAllApprovedDailyReports(data.reports ?? []);
      } else {
        setAllApprovedDailyReports([]);
      }
    } catch (err) {
      console.error("Failed to load approved reports:", err);
      setAllApprovedDailyReports([]);
    } finally {
      setLoadingApprovedReports(false);
    }
  }, []);

  useEffect(() => {
    if (["expense_fuel", "expense_travel", "expense_room", "expense_tool", "expense_other", "progress_analytics"].includes(activeView) && financialFilterProjectId) {
      fetchAllProjectApprovedReports(financialFilterProjectId);
    }
  }, [activeView, financialFilterProjectId, fetchAllProjectApprovedReports]);

  const fetchClarificationMessages = useCallback(async (reportId: string) => {
    if (!reportId) return;
    setLoadingClarificationMessages(true);
    try {
      const res = await fetch(`/api/mobile/daily-reports/comments?reportId=${reportId}`);
      const data = await res.json();
      if (res.ok && data.ok) {
        setClarificationMessages(data.comments ?? []);
      }
    } catch (err) {
      console.error("Failed to load comments:", err);
    } finally {
      setLoadingClarificationMessages(false);
    }
  }, []);

  useEffect(() => {
    if (selectedReport && selectedReport.id) {
      fetchClarificationMessages(selectedReport.id);
      
      // Load initial values for inline editing
      setEditReportLaborCount(selectedReport.laborCount || 0);
      setEditReportOtHours(selectedReport.otHours || 0);
      setEditReportCalculatedWages(selectedReport.calculatedWages || 0);
      setEditReportFuelExpenses(selectedReport.fuelExpenses || 0);
      setEditReportTravelExpenses(selectedReport.travelExpenses || 0);
      setEditReportRoomRent(selectedReport.roomRent || 0);
      setEditReportToolRent(selectedReport.toolRent || 0);
      setEditReportExcavationLength(selectedReport.excavationLength || 0);
      setEditReportHddLength(selectedReport.hddLength || 0);
      setEditReportCableLayingLength(selectedReport.cableLayingLength || 0);
      setEditReportCableMoundingLength(selectedReport.cableMoundingLength || 0);
      setEditReportJoiningLinksCompleted(selectedReport.joiningLinksCompleted || 0);
      setEditReportRmuFoundationStatus(selectedReport.rmuFoundationStatus || 0);
      setEditReportTerminationEndpoints(selectedReport.terminationEndpoints || 0);
      setIsAdminEditMode(false);
      setIsFlagRequestOpen(false);
    }
  }, [selectedReport, fetchClarificationMessages]);

  const handleSendClarificationMessage = async () => {
    if (!newClarificationMessage.trim() || !selectedReport) return;
    try {
      const res = await fetch("/api/mobile/daily-reports/comments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          reportId: selectedReport.id,
          message: newClarificationMessage,
          itemType: flaggedItemType
        })
      });
      const data = await res.json();
      if (res.ok && data.ok) {
        setNewClarificationMessage("");
        showToast("❓ Clarification requested from supervisor!");
        fetchClarificationMessages(selectedReport.id);
        setSelectedReport((prev: any) => prev ? { ...prev, status: "clarification" } : null);
        fetchPendingReports(reportFilterProjectId, reportFilterDate);
      } else {
        showToast(`❌ Request failed: ${data.message}`);
      }
    } catch (err) {
      showToast("❌ Connection error requesting clarification.");
    }
  };

  const handleSaveReportEdits = async () => {
    if (!selectedReport) return;
    setSavingReportEdits(true);
    try {
      // Recalculate wages based on rate
      const rich = selectedReport.stockAvailable?.richDetails || {};
      const workerRate = selectedReport.workerWageRate ?? rich.workerWageRate ?? 900;
      const supervisorRate = selectedReport.supervisorWageRate ?? rich.supervisorWageRate ?? 1200;
      const crewLabor = editReportLaborCount - (rich.includeSupervisor ? 1 : 0);
      const crewWages = (crewLabor * workerRate) + (rich.includeSupervisor ? supervisorRate : 0);
      
      // Overtime workers array calculation
      const otList = rich.otWorkers || [];
      let totalOtWages = 0;
      if (otList.length > 0) {
        const originalOtHours = selectedReport.otHours || 1;
        const ratio = editReportOtHours / originalOtHours;
        otList.forEach((w: any) => {
          totalOtWages += Math.round(Number(w.hours || 0) * ratio * Number(w.rate || 0) * Number(w.workerCount || 1));
        });
      }
      const calculatedWages = crewWages + totalOtWages;

      const updates = {
        laborCount: editReportLaborCount,
        otHours: editReportOtHours,
        calculatedWages: calculatedWages,
        fuelExpenses: editReportFuelExpenses,
        travelExpenses: editReportTravelExpenses,
        roomRent: editReportRoomRent,
        toolRent: editReportToolRent,
        excavationLength: editReportExcavationLength,
        hddLength: editReportHddLength,
        cableLayingLength: editReportCableLayingLength,
        cableMoundingLength: editReportCableMoundingLength,
        joiningLinksCompleted: editReportJoiningLinksCompleted,
        rmuFoundationStatus: editReportRmuFoundationStatus,
        terminationEndpoints: editReportTerminationEndpoints
      };

      const res = await fetch("/api/mobile/admin/update-report", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          reportId: selectedReport.id,
          updates
        })
      });
      const data = await res.json();
      if (res.ok && data.ok) {
        showToast("💾 Staging updates saved successfully!");
        setIsAdminEditMode(false);
        setSelectedReport((prev: any) => prev ? { ...prev, ...updates } : null);
        fetchPendingReports(reportFilterProjectId, reportFilterDate);
      } else {
        showToast(`❌ Edit failed: ${data.message}`);
      }
    } catch (err) {
      showToast("❌ Connection error. Failed to save edits.");
    } finally {
      setSavingReportEdits(false);
    }
  };

  const renderFinancialExpenseView = (category: "fuel" | "travel" | "room" | "tool" | "other") => {
    const config = {
      fuel: { title: "Fuel Expenses Registry", icon: "⛽", color: "#f59e0b", bg: "rgba(245,158,11,0.08)" },
      travel: { title: "Travel & Transit Logistics", icon: "🚗", color: "#0ea5e9", bg: "rgba(14,165,233,0.08)" },
      room: { title: "Room Rent Accommodation", icon: "🏠", color: "#8b5cf6", bg: "rgba(139,92,246,0.08)" },
      tool: { title: "Tool Rentals Registry", icon: "🔧", color: "#10b981", bg: "rgba(16,185,129,0.08)" },
      other: { title: "Other Miscellaneous Expenses", icon: "💡", color: "#f43f5e", bg: "rgba(244,63,94,0.08)" }
    }[category];

    // Filter approved reports for selected month & year
    const filteredReports = allApprovedDailyReports.filter(r => {
      if (r.status !== "approved") return false;
      const dateObj = new Date(r.reportDate);
      const matchMonth = String(dateObj.getMonth() + 1) === financialFilterMonth;
      const matchYear = String(dateObj.getFullYear()) === financialFilterYear;
      return matchMonth && matchYear;
    });

    // Flatten detailed entries from richDetails lists or fall back to main record sums
    const entries: any[] = [];
    filteredReports.forEach(r => {
      const rich = r.stockAvailable?.richDetails || {};
      const list = {
        fuel: rich.fuelExpensesList || [],
        travel: rich.travelExpensesList || [],
        room: rich.roomRentList || [],
        tool: rich.toolRentList || [],
        other: rich.otherExpensesList || []
      }[category];

      if (list && list.length > 0) {
        list.forEach((item: any, i: number) => {
          entries.push({
            id: `${r.id}-${category}-${i}`,
            date: r.reportDate,
            supervisor: r.supervisorName,
            amount: Number(item.amount || 0),
            narration: item.narration || (category === "tool" ? `Tool: ${item.toolName}` : category === "other" ? `Misc: ${item.expenseName}` : "--"),
            billImage: item.billImage || (category === "room" ? r.roomRentReceipt : category === "tool" ? r.toolRentReceipt : null)
          });
        });
      } else {
        const amount = {
          fuel: r.fuelExpenses,
          travel: r.travelExpenses,
          room: r.roomRent,
          tool: r.toolRent,
          other: 0
        }[category];

        if (amount > 0) {
          entries.push({
            id: `${r.id}-${category}-fallback`,
            date: r.reportDate,
            supervisor: r.supervisorName,
            amount: amount,
            narration: `Legacy record sum`,
            billImage: category === "room" ? r.roomRentReceipt : category === "tool" ? r.toolRentReceipt : null
          });
        }
      }
    });

    const totalSpent = entries.reduce((sum, item) => sum + item.amount, 0);

    return (
      <div className="fade-in" style={{ paddingBottom: 60 }}>
        {/* Header */}
        <div style={{ padding: "20px 16px 14px", paddingTop: "calc(env(safe-area-inset-top, 0px) + 16px)", borderBottom: "1px solid var(--border)", background: "rgba(255,255,255,0.85)", backdropFilter: "blur(10px)", position: "sticky", top: 0, zIndex: 10 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
            <button 
              onClick={() => { setActiveView("hub"); }}
              className="back-btn"
              style={{ width: 38, height: 38, borderRadius: 10, border: "1px solid var(--border)", background: "var(--surface)", display: "flex", alignItems: "center", justifyContent: "center", color: "var(--text)", cursor: "pointer" }}
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="19" y1="12" x2="5" y2="12"/><polyline points="12 19 5 12 12 5"/></svg>
            </button>
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <div style={{ width: 32, height: 32, borderRadius: 8, background: config.bg, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 16 }}>
                {config.icon}
              </div>
              <div>
                <p style={{ fontSize: 10, fontWeight: 800, color: config.color, letterSpacing: "0.1em", textTransform: "uppercase", margin: 0 }}>Category Ledger</p>
                <h1 style={{ fontSize: 20, fontWeight: 800, color: "var(--text)", margin: "2px 0 0", letterSpacing: "-0.5px" }}>{config.title}</h1>
              </div>
            </div>
          </div>
        </div>

        <div style={{ padding: "16px", display: "flex", flexDirection: "column", gap: 16 }}>
          
          {/* Filtering Funnel */}
          <div className="glass" style={{ padding: 18, border: "1px solid var(--border)", borderRadius: 20 }}>
            <h2 style={{ fontSize: 11, fontWeight: 800, textTransform: "uppercase", letterSpacing: "0.08em", color: "var(--dim)", margin: "0 0 14px", textAlign: "left" }}>Filter Parameters</h2>
            <div style={{ display: "grid", gridTemplateColumns: "1.5fr 1fr 1fr", gap: 10 }}>
              <div>
                <label style={{ display: "block", fontSize: 9, color: "var(--dim)", marginBottom: 4, fontWeight: 700, textTransform: "uppercase" }}>Project Corridor</label>
                <select
                  value={financialFilterProjectId}
                  onChange={(e) => setFinancialFilterProjectId(e.target.value)}
                  style={{ width: "100%", height: 38, background: "var(--bg)", border: "1px solid var(--border)", borderRadius: 10, padding: "0 6px", color: "var(--muted)", fontSize: 11, outline: "none", cursor: "pointer" }}
                >
                  {projectsList.map(p => (
                    <option key={p.id} value={p.id}>{p.name}</option>
                  ))}
                </select>
              </div>
              <div>
                <label style={{ display: "block", fontSize: 9, color: "var(--dim)", marginBottom: 4, fontWeight: 700, textTransform: "uppercase" }}>Select Month</label>
                <select
                  value={financialFilterMonth}
                  onChange={(e) => setFinancialFilterMonth(e.target.value)}
                  style={{ width: "100%", height: 38, background: "var(--bg)", border: "1px solid var(--border)", borderRadius: 10, padding: "0 6px", color: "var(--muted)", fontSize: 11, outline: "none", cursor: "pointer" }}
                >
                  {["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"].map((m, i) => (
                    <option key={i} value={String(i + 1)}>{m}</option>
                  ))}
                </select>
              </div>
              <div>
                <label style={{ display: "block", fontSize: 9, color: "var(--dim)", marginBottom: 4, fontWeight: 700, textTransform: "uppercase" }}>Select Year</label>
                <select
                  value={financialFilterYear}
                  onChange={(e) => setFinancialFilterYear(e.target.value)}
                  style={{ width: "100%", height: 38, background: "var(--bg)", border: "1px solid var(--border)", borderRadius: 10, padding: "0 6px", color: "var(--muted)", fontSize: 11, outline: "none", cursor: "pointer" }}
                >
                  {["2026", "2027", "2028"].map(y => (
                    <option key={y} value={y}>{y}</option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          {/* Quick Aggregation Summary Widget */}
          <div style={{ display: "grid", gridTemplateColumns: "1.5fr 1fr", gap: 12 }}>
            <div className="glass" style={{ padding: "16px 18px", border: "1px solid var(--border)", display: "flex", flexDirection: "column", justifyContent: "center" }}>
              <span style={{ fontSize: 10, color: "var(--dim)", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.05em" }}>Total Period Spent</span>
              <p style={{ fontSize: 28, fontWeight: 900, color: config.color, margin: "4px 0 0", letterSpacing: "-1px" }}>₹{totalSpent.toLocaleString("en-IN")}</p>
            </div>
            <div className="glass" style={{ padding: "16px 18px", border: "1px solid var(--border)", display: "flex", flexDirection: "column", justifyContent: "center" }}>
              <span style={{ fontSize: 10, color: "var(--dim)", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.05em" }}>Transactions</span>
              <p style={{ fontSize: 24, fontWeight: 900, color: "var(--text)", margin: "4px 0 0", letterSpacing: "-1px" }}>{entries.length} items</p>
            </div>
          </div>

          {/* Detailed Receipts Table */}
          <div className="glass" style={{ padding: 20, border: "1px solid var(--border)", borderRadius: 20 }}>
            <h2 style={{ fontSize: 11, fontWeight: 800, textTransform: "uppercase", letterSpacing: "0.08em", color: "var(--dim)", margin: "0 0 16px", textAlign: "left" }}>Financial Transaction Audit Sheet</h2>

            {loadingApprovedReports ? (
              <div style={{ textAlign: "center", padding: "40px 0", color: "var(--dim)" }}>
                <div className="spinner" style={{ margin: "0 auto 12px", borderColor: config.color, borderTopColor: "transparent" }} />
                Retrieving Approved Financial Logs...
              </div>
            ) : entries.length === 0 ? (
              <div style={{ background: "var(--surface)", border: "1px solid var(--border)", borderRadius: 16, padding: "32px 20px", textAlign: "center" }}>
                <span style={{ fontSize: 24, display: "block", marginBottom: 8 }}>💎</span>
                <p style={{ fontSize: 13, color: "var(--dim)", margin: 0 }}>No approved {category} expenses consolidated for this month/year combination.</p>
              </div>
            ) : (
              <div style={{ overflowX: "auto" }}>
                <table style={{ width: "100%", borderCollapse: "collapse", textAlign: "left", fontSize: 12, minWidth: 500 }}>
                  <thead>
                    <tr style={{ borderBottom: "1px solid var(--border)", color: "var(--dim)", textTransform: "uppercase", fontSize: 10, fontWeight: 800 }}>
                      <th style={{ padding: "10px 8px" }}>Date</th>
                      <th style={{ padding: "10px 8px" }}>Supervisor</th>
                      <th style={{ padding: "10px 8px" }}>Narration Notes</th>
                      <th style={{ padding: "10px 8px" }}>Receipt</th>
                      <th style={{ padding: "10px 8px", textAlign: "right" }}>Amount</th>
                    </tr>
                  </thead>
                  <tbody>
                    {entries.map((item) => (
                      <tr key={item.id} style={{ borderBottom: "1px solid var(--border)", color: "var(--muted)" }}>
                        <td style={{ padding: "12px 8px", fontWeight: 700, whiteSpace: "nowrap" }}>{item.date}</td>
                        <td style={{ padding: "12px 8px", fontWeight: 600 }}>{item.supervisor}</td>
                        <td style={{ padding: "12px 8px", maxWidth: 220, overflow: "hidden", textOverflow: "ellipsis" }}>{item.narration}</td>
                        <td style={{ padding: "12px 8px" }}>
                          {item.billImage ? (
                            <button 
                              onClick={() => setAdminActiveImagePreview(item.billImage)}
                              style={{ border: "1px solid rgba(124, 58, 237, 0.25)", background: "rgba(124, 58, 237, 0.05)", borderRadius: 6, color: "#7c3aed", fontSize: 10, padding: "3px 8px", fontWeight: 800, cursor: "zoom-in", fontFamily: "Outfit, sans-serif" }}
                            >
                              📎 View File
                            </button>
                          ) : (
                            <span style={{ fontSize: 10, color: "var(--dim)" }}>No upload</span>
                          )}
                        </td>
                        <td style={{ padding: "12px 8px", fontFamily: "monospace", color: config.color, fontWeight: 800, textAlign: "right", fontSize: 13 }}>₹{item.amount.toLocaleString("en-IN")}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      </div>
    );
  };

  const renderProgressAnalyticsView = () => {
    const filteredReports = allApprovedDailyReports.filter(r => {
      if (r.status !== "approved") return false;
      const dateObj = new Date(r.reportDate);
      const matchMonth = String(dateObj.getMonth() + 1) === financialFilterMonth;
      const matchYear = String(dateObj.getFullYear()) === financialFilterYear;
      return matchMonth && matchYear;
    });

    let totalTrench = 0;
    let totalHdd = 0;
    let totalLaying = 0;
    let totalMounding = 0;
    let totalJoining = 0;
    let totalRmu = 0;
    let totalTerminations = 0;

    filteredReports.forEach(r => {
      totalTrench += Number(r.excavationLength || 0);
      totalHdd += Number(r.hddLength || 0);
      totalLaying += Number(r.cableLayingLength || 0);
      totalMounding += Number(r.cableMoundingLength || 0);
      totalJoining += Number(r.joiningLinksCompleted || 0);
      totalRmu += Number(r.rmuFoundationStatus || 0);
      totalTerminations += Number(r.terminationEndpoints || 0);
    });

    return (
      <div className="fade-in" style={{ paddingBottom: 60 }}>
        {/* Header */}
        <div style={{ padding: "20px 16px 14px", paddingTop: "calc(env(safe-area-inset-top, 0px) + 16px)", borderBottom: "1px solid var(--border)", background: "rgba(255,255,255,0.85)", backdropFilter: "blur(10px)", position: "sticky", top: 0, zIndex: 10 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
            <button 
              onClick={() => { setActiveView("hub"); }}
              className="back-btn"
              style={{ width: 38, height: 38, borderRadius: 10, border: "1px solid var(--border)", background: "var(--surface)", display: "flex", alignItems: "center", justifyContent: "center", color: "var(--text)", cursor: "pointer" }}
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="19" y1="12" x2="5" y2="12"/><polyline points="12 19 5 12 12 5"/></svg>
            </button>
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <div style={{ width: 32, height: 32, borderRadius: 8, background: "rgba(217, 70, 239, 0.08)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 16 }}>
                🏗️
              </div>
              <div>
                <p style={{ fontSize: 10, fontWeight: 800, color: "#d946ef", letterSpacing: "0.1em", textTransform: "uppercase", margin: 0 }}>Progress Analytics</p>
                <h1 style={{ fontSize: 20, fontWeight: 800, color: "var(--text)", margin: "2px 0 0", letterSpacing: "-0.5px" }}>Site Progress Ledger</h1>
              </div>
            </div>
          </div>
        </div>

        <div style={{ padding: "16px", display: "flex", flexDirection: "column", gap: 16 }}>
          
          {/* Filtering Funnel */}
          <div className="glass" style={{ padding: 18, border: "1px solid var(--border)", borderRadius: 20 }}>
            <h2 style={{ fontSize: 11, fontWeight: 800, textTransform: "uppercase", letterSpacing: "0.08em", color: "var(--dim)", margin: "0 0 14px", textAlign: "left" }}>Filter Parameters</h2>
            <div style={{ display: "grid", gridTemplateColumns: "1.5fr 1fr 1fr", gap: 10 }}>
              <div>
                <label style={{ display: "block", fontSize: 9, color: "var(--dim)", marginBottom: 4, fontWeight: 700, textTransform: "uppercase" }}>Project Corridor</label>
                <select
                  value={financialFilterProjectId}
                  onChange={(e) => setFinancialFilterProjectId(e.target.value)}
                  style={{ width: "100%", height: 38, background: "var(--bg)", border: "1px solid var(--border)", borderRadius: 10, padding: "0 6px", color: "var(--muted)", fontSize: 11, outline: "none", cursor: "pointer" }}
                >
                  {projectsList.map(p => (
                    <option key={p.id} value={p.id}>{p.name}</option>
                  ))}
                </select>
              </div>
              <div>
                <label style={{ display: "block", fontSize: 9, color: "var(--dim)", marginBottom: 4, fontWeight: 700, textTransform: "uppercase" }}>Select Month</label>
                <select
                  value={financialFilterMonth}
                  onChange={(e) => setFinancialFilterMonth(e.target.value)}
                  style={{ width: "100%", height: 38, background: "var(--bg)", border: "1px solid var(--border)", borderRadius: 10, padding: "0 6px", color: "var(--muted)", fontSize: 11, outline: "none", cursor: "pointer" }}
                >
                  {["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"].map((m, i) => (
                    <option key={i} value={String(i + 1)}>{m}</option>
                  ))}
                </select>
              </div>
              <div>
                <label style={{ display: "block", fontSize: 9, color: "var(--dim)", marginBottom: 4, fontWeight: 700, textTransform: "uppercase" }}>Select Year</label>
                <select
                  value={financialFilterYear}
                  onChange={(e) => setFinancialFilterYear(e.target.value)}
                  style={{ width: "100%", height: 38, background: "var(--bg)", border: "1px solid var(--border)", borderRadius: 10, padding: "0 6px", color: "var(--muted)", fontSize: 11, outline: "none", cursor: "pointer" }}
                >
                  {["2026", "2027", "2028"].map(y => (
                    <option key={y} value={y}>{y}</option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          {/* Aggregate Metrics Grid */}
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(130px, 1fr))", gap: 10 }}>
            <div className="glass" style={{ padding: 14, border: "1px solid var(--border)" }}>
              <span style={{ fontSize: 9, color: "var(--dim)", fontWeight: 700, textTransform: "uppercase" }}>Trenching</span>
              <p style={{ fontSize: 20, fontWeight: 900, color: "#d946ef", margin: "2px 0 0" }}>{totalTrench}m</p>
            </div>
            <div className="glass" style={{ padding: 14, border: "1px solid var(--border)" }}>
              <span style={{ fontSize: 9, color: "var(--dim)", fontWeight: 700, textTransform: "uppercase" }}>HDD Drilling</span>
              <p style={{ fontSize: 20, fontWeight: 900, color: "#f59e0b", margin: "2px 0 0" }}>{totalHdd}m</p>
            </div>
            <div className="glass" style={{ padding: 14, border: "1px solid var(--border)" }}>
              <span style={{ fontSize: 9, color: "var(--dim)", fontWeight: 700, textTransform: "uppercase" }}>Cable Laying</span>
              <p style={{ fontSize: 20, fontWeight: 900, color: "#10b981", margin: "2px 0 0" }}>{totalLaying}m</p>
            </div>
            <div className="glass" style={{ padding: 14, border: "1px solid var(--border)" }}>
              <span style={{ fontSize: 9, color: "var(--dim)", fontWeight: 700, textTransform: "uppercase" }}>Cable Mounting</span>
              <p style={{ fontSize: 20, fontWeight: 900, color: "#0ea5e9", margin: "2px 0 0" }}>{totalMounding}m</p>
            </div>
            <div className="glass" style={{ padding: 14, border: "1px solid var(--border)" }}>
              <span style={{ fontSize: 9, color: "var(--dim)", fontWeight: 700, textTransform: "uppercase" }}>Cable Joining</span>
              <p style={{ fontSize: 20, fontWeight: 900, color: "#8b5cf6", margin: "2px 0 0" }}>{totalJoining} links</p>
            </div>
            <div className="glass" style={{ padding: 14, border: "1px solid var(--border)" }}>
              <span style={{ fontSize: 9, color: "var(--dim)", fontWeight: 700, textTransform: "uppercase" }}>RMU Foundations</span>
              <p style={{ fontSize: 20, fontWeight: 900, color: "#ec4899", margin: "2px 0 0" }}>{totalRmu} bases</p>
            </div>
            <div className="glass" style={{ padding: 14, border: "1px solid var(--border)" }}>
              <span style={{ fontSize: 9, color: "var(--dim)", fontWeight: 700, textTransform: "uppercase" }}>Terminations</span>
              <p style={{ fontSize: 20, fontWeight: 900, color: "#14b8a6", margin: "2px 0 0" }}>{totalTerminations} pts</p>
            </div>
          </div>

          {/* Detailed Progress Table */}
          <div className="glass" style={{ padding: 20, border: "1px solid var(--border)", borderRadius: 20 }}>
            <h2 style={{ fontSize: 11, fontWeight: 800, textTransform: "uppercase", letterSpacing: "0.08em", color: "var(--dim)", margin: "0 0 16px", textAlign: "left" }}>Physical Progress History Sheet</h2>

            {loadingApprovedReports ? (
              <div style={{ textAlign: "center", padding: "40px 0", color: "var(--dim)" }}>
                <div className="spinner" style={{ margin: "0 auto 12px", borderColor: "#d946ef", borderTopColor: "transparent" }} />
                Retrieving Approved Progress Logs...
              </div>
            ) : filteredReports.length === 0 ? (
              <div style={{ background: "var(--surface)", border: "1px solid var(--border)", borderRadius: 16, padding: "32px 20px", textAlign: "center" }}>
                <span style={{ fontSize: 24, display: "block", marginBottom: 8 }}>🏗️</span>
                <p style={{ fontSize: 13, color: "var(--dim)", margin: 0 }}>No approved physical progress logs consolidated for this period.</p>
              </div>
            ) : (
              <div style={{ overflowX: "auto" }}>
                <table style={{ width: "100%", borderCollapse: "collapse", textAlign: "left", fontSize: 11, minWidth: 700 }}>
                  <thead>
                    <tr style={{ borderBottom: "1px solid var(--border)", color: "var(--dim)", textTransform: "uppercase", fontSize: 9, fontWeight: 800 }}>
                      <th style={{ padding: "10px 6px" }}>Date</th>
                      <th style={{ padding: "10px 6px" }}>Supervisor</th>
                      <th style={{ padding: "10px 6px" }}>Trenching</th>
                      <th style={{ padding: "10px 6px" }}>HDD</th>
                      <th style={{ padding: "10px 6px" }}>Laying</th>
                      <th style={{ padding: "10px 6px" }}>Mounding</th>
                      <th style={{ padding: "10px 6px" }}>Joining</th>
                      <th style={{ padding: "10px 6px" }}>RMU</th>
                      <th style={{ padding: "10px 6px" }}>Terminations</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredReports.map((r) => (
                      <tr key={r.id} style={{ borderBottom: "1px solid var(--border)", color: "var(--muted)" }}>
                        <td style={{ padding: "12px 6px", fontWeight: 700, whiteSpace: "nowrap" }}>{r.reportDate}</td>
                        <td style={{ padding: "12px 6px", fontWeight: 600 }}>{r.supervisorName}</td>
                        <td style={{ padding: "12px 6px", fontFamily: "monospace", color: "#d946ef", fontWeight: 700 }}>{r.excavationLength}m</td>
                        <td style={{ padding: "12px 6px", fontFamily: "monospace", color: "#f59e0b", fontWeight: 700 }}>{r.hddLength}m</td>
                        <td style={{ padding: "12px 6px", fontFamily: "monospace" }}>{r.cableLayingLength}m</td>
                        <td style={{ padding: "12px 6px", fontFamily: "monospace" }}>{r.cableMoundingLength}m</td>
                        <td style={{ padding: "12px 6px", fontFamily: "monospace" }}>{r.joiningLinksCompleted} links</td>
                        <td style={{ padding: "12px 6px", fontFamily: "monospace" }}>{r.rmuFoundationStatus} bases</td>
                        <td style={{ padding: "12px 6px", fontFamily: "monospace", color: "#14b8a6", fontWeight: 700 }}>{r.terminationEndpoints} pts</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      </div>
    );
  };

  const fetchPendingReports = useCallback(async (projectId: string, date: string) => {
    if (!projectId || !date) return;
    setLoadingReports(true);
    setSelectedReport(null);
    try {
      const res = await fetch(`/api/mobile/daily-reports?projectId=${projectId}&reportDate=${date}`);
      const data = await res.json();
      if (res.ok && data.ok) {
        setPendingReports(data.reports ?? []);
      } else {
        setPendingReports([]);
      }
    } catch {
      setPendingReports([]);
    } finally {
      setLoadingReports(false);
    }
  }, []);

  const fetchMasterLedger = useCallback(async (projectId: string) => {
    if (!projectId) return;
    setLoadingLedger(true);
    try {
      const res = await fetch(`/api/mobile/admin/master-ledger?projectId=${projectId}`);
      const data = await res.json();
      if (res.ok && data.ok) {
        setMasterLedgerList(data.ledger ?? []);
      } else {
        setMasterLedgerList([]);
      }
    } catch {
      setMasterLedgerList([]);
    } finally {
      setLoadingLedger(false);
    }
  }, []);

  useEffect(() => {
    if (activeView === "reports" && reportFilterProjectId && reportFilterDate) {
      fetchPendingReports(reportFilterProjectId, reportFilterDate);
    }
  }, [activeView, reportFilterProjectId, reportFilterDate, fetchPendingReports]);

  useEffect(() => {
    if (activeView === "ledger" && selectedLedgerProject) {
      fetchMasterLedger(selectedLedgerProject);
    }
  }, [activeView, selectedLedgerProject, fetchMasterLedger]);

  async function handleApproveDailyReport(reportId: string) {
    if (!reportId) return;
    setApprovingReportId(reportId);
    try {
      const res = await fetch("/api/mobile/admin/approve-report", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reportId })
      });
      const data = await res.json();
      if (res.ok && data.ok) {
        showToast("✓ Report approved & atomic ledger consolidated!");
        fetchPendingReports(reportFilterProjectId, reportFilterDate);
      } else {
        showToast(`❌ Approval failed: ${data.message}`);
      }
    } catch {
      showToast("❌ Network error. Approval failed.");
    } finally {
      setApprovingReportId(null);
    }
  }

  const resetToDefaults = () => {
    if (confirm("Are you sure you want to reset all projects and coordinates to their real default parameters?")) {
      setProjectsList(DEFAULT_PROJECTS);
      setSelectedProjectItem(DEFAULT_PROJECTS[0]);
      localStorage.removeItem("telgo_custom_projects");
      showToast("🔄 Reset to default coordinates and metadata.");
    }
  };

  // Real-time postMessage listener to capture pins from interactive iframe map editor
  // Real-time postMessage listener to capture pins from interactive iframe map editor
  useEffect(() => {
    const handleMapMessage = (e: MessageEvent) => {
      if (!e.data) return;
      
      if (e.data.type === "MAP_CLICK") {
        const { lat, lng } = e.data;
        const latStr = lat.toFixed(6);
        const lngStr = lng.toFixed(6);
        const latNum = parseFloat(latStr);
        const lngNum = parseFloat(lngStr);

        if (activePinMode === "middle") {
          if (gisEditLayer === "corridor") {
            setProjMiddlePoints(prev => [...prev, [latNum, lngNum]]);
            showToast(`🟡 Added Corridor Middle Point: [${latStr}, ${lngStr}]`);
          } else if (gisEditLayer === "cable") {
            setCableMiddlePoints(prev => [...prev, [latNum, lngNum]]);
            showToast(`🟡 Added Cable Middle Point: [${latStr}, ${lngStr}]`);
          } else if (gisEditLayer === "hdd") {
            setHddMiddlePoints(prev => [...prev, [latNum, lngNum]]);
            showToast(`🟡 Added HDD Middle Point: [${latStr}, ${lngStr}]`);
          } else if (gisEditLayer === "trench") {
            setTrenchMiddlePoints(prev => [...prev, [latNum, lngNum]]);
            showToast(`🟡 Added Trench Middle Point: [${latStr}, ${lngStr}]`);
          }
          return;
        }

        if (gisEditLayer === "corridor") {
          if (activePinMode === "start" || activePinMode === "project_start") {
            setProjStartLat(latStr);
            setProjStartLng(lngStr);
            showToast(`🟢 Project Start Position set: [${latStr}, ${lngStr}]`);
          } else if (activePinMode === "end" || activePinMode === "project_end") {
            setProjEndLat(latStr);
            setProjEndLng(lngStr);
            showToast(`🔴 Project End Position set: [${latStr}, ${lngStr}]`);
          }
        } else if (gisEditLayer === "cable") {
          if (activePinMode === "start" || activePinMode === "project_start") {
            setCableStartLat(latStr);
            setCableStartLng(lngStr);
            showToast(`🟢 Cable Start Position set: [${latStr}, ${lngStr}]`);
          } else if (activePinMode === "end" || activePinMode === "project_end") {
            setCableEndLat(latStr);
            setCableEndLng(lngStr);
            showToast(`🔴 Cable End Position set: [${latStr}, ${lngStr}]`);
          }
        } else if (gisEditLayer === "hdd") {
          if (activePinMode === "start" || activePinMode === "project_start") {
            setHddStartLat(latStr);
            setHddStartLng(lngStr);
            showToast(`🟢 HDD Start Position set: [${latStr}, ${lngStr}]`);
          } else if (activePinMode === "end" || activePinMode === "project_end") {
            setHddEndLat(latStr);
            setHddEndLng(lngStr);
            showToast(`🔴 HDD End Position set: [${latStr}, ${lngStr}]`);
          }
        } else if (gisEditLayer === "trench") {
          if (activePinMode === "start" || activePinMode === "project_start") {
            setTrenchStartLat(latStr);
            setTrenchStartLng(lngStr);
            showToast(`🟢 Trench Start Position set: [${latStr}, ${lngStr}]`);
          } else if (activePinMode === "end" || activePinMode === "project_end") {
            setTrenchEndLat(latStr);
            setTrenchEndLng(lngStr);
            showToast(`🔴 Trench End Position set: [${latStr}, ${lngStr}]`);
          }
        }
      } else if (e.data.type === "MIDDLE_POINT_DRAG") {
        const { index, lat, lng } = e.data;
        const latNum = parseFloat(lat.toFixed(6));
        const lngNum = parseFloat(lng.toFixed(6));
        if (gisEditLayer === "corridor") {
          setProjMiddlePoints(prev => prev.map((pt, idx) => idx === index ? [latNum, lngNum] : pt));
        } else if (gisEditLayer === "cable") {
          setCableMiddlePoints(prev => prev.map((pt, idx) => idx === index ? [latNum, lngNum] : pt));
        } else if (gisEditLayer === "hdd") {
          setHddMiddlePoints(prev => prev.map((pt, idx) => idx === index ? [latNum, lngNum] : pt));
        } else if (gisEditLayer === "trench") {
          setTrenchMiddlePoints(prev => prev.map((pt, idx) => idx === index ? [latNum, lngNum] : pt));
        }
      } else if (e.data.type === "MARKER_DRAG") {
        const { target, lat, lng } = e.data;
        const latStr = lat.toFixed(6);
        const lngStr = lng.toFixed(6);
        
        if (gisEditLayer === "corridor") {
          if (target === "start") {
            setProjStartLat(latStr);
            setProjStartLng(lngStr);
            showToast(`🟢 Start Position dragged to: [${latStr}, ${lngStr}]`);
          } else if (target === "end") {
            setProjEndLat(latStr);
            setProjEndLng(lngStr);
            showToast(`🔴 End Position dragged to: [${latStr}, ${lngStr}]`);
          }
        } else if (gisEditLayer === "cable") {
          if (target === "start") {
            setCableStartLat(latStr);
            setCableStartLng(lngStr);
            showToast(`🟢 Cable Start dragged to: [${latStr}, ${lngStr}]`);
          } else if (target === "end") {
            setCableEndLat(latStr);
            setCableEndLng(lngStr);
            showToast(`🔴 Cable End dragged to: [${latStr}, ${lngStr}]`);
          }
        } else if (gisEditLayer === "hdd") {
          if (target === "start") {
            setHddStartLat(latStr);
            setHddStartLng(lngStr);
            showToast(`🟢 HDD Start dragged to: [${latStr}, ${lngStr}]`);
          } else if (target === "end") {
            setHddEndLat(latStr);
            setHddEndLng(lngStr);
            showToast(`🔴 HDD End dragged to: [${latStr}, ${lngStr}]`);
          }
        } else if (gisEditLayer === "trench") {
          if (target === "start") {
            setTrenchStartLat(latStr);
            setTrenchStartLng(lngStr);
            showToast(`🟢 Trench Start dragged to: [${latStr}, ${lngStr}]`);
          } else if (target === "end") {
            setTrenchEndLat(latStr);
            setTrenchEndLng(lngStr);
            showToast(`🔴 Trench End dragged to: [${latStr}, ${lngStr}]`);
          }
        }
      } else if (e.data.type === "ROUTE_CALCULATED") {
        const { distance, utilityPath } = e.data;
        if (gisEditLayer === "corridor") {
          setProjDistance(distance);
          setUtilityPath(utilityPath);
        }
      }
    };

    window.addEventListener("message", handleMapMessage);
    return () => window.removeEventListener("message", handleMapMessage);
  }, [activePinMode, gisEditLayer, projStartLat, projStartLng, projEndLat, projEndLng, utilityPath]);

  // Bi-directional state transmitter to iframe map frame
  useEffect(() => {
    if (!editingProjectItem) return;

    let sLat = parseFloat(projStartLat);
    let sLng = parseFloat(projStartLng);
    let eLat = parseFloat(projEndLat);
    let eLng = parseFloat(projEndLng);
    let middles = projMiddlePoints;

    if (gisEditLayer === "cable") {
      sLat = parseFloat(cableStartLat);
      sLng = parseFloat(cableStartLng);
      eLat = parseFloat(cableEndLat);
      eLng = parseFloat(cableEndLng);
      middles = cableMiddlePoints;
    } else if (gisEditLayer === "hdd") {
      sLat = parseFloat(hddStartLat);
      sLng = parseFloat(hddStartLng);
      eLat = parseFloat(hddEndLat);
      eLng = parseFloat(hddEndLng);
      middles = hddMiddlePoints;
    } else if (gisEditLayer === "trench") {
      sLat = parseFloat(trenchStartLat);
      sLng = parseFloat(trenchStartLng);
      eLat = parseFloat(trenchEndLat);
      eLng = parseFloat(trenchEndLng);
      middles = trenchMiddlePoints;
    }
    
    const timer = setTimeout(() => {
      const iframe = document.getElementById("gis-editor-iframe") as HTMLIFrameElement | null;
      if (iframe && iframe.contentWindow) {
        iframe.contentWindow.postMessage({
          type: 'UPDATE_MARKERS',
          startLat: isNaN(sLat) ? null : sLat,
          startLng: isNaN(sLng) ? null : sLng,
          endLat: isNaN(eLat) ? null : eLat,
          endLng: isNaN(eLng) ? null : eLng,
          middlePoints: middles,
          gisEditLayer,
          hddPoints,
          terminationPoints,
          trenchingLine,
          utilityPath,
          roadChangeSegments,
          hddSegments,
          trenchingSegments,
          tempRoadStart,
          tempHddStart,
          tempTrenchStart
        }, '*');
      }
    }, 50); // slight debounce for fluent text typing and dragging updates

    return () => clearTimeout(timer);
  }, [
    projStartLat, projStartLng, projEndLat, projEndLng, JSON.stringify(projMiddlePoints),
    cableStartLat, cableStartLng, cableEndLat, cableEndLng, JSON.stringify(cableMiddlePoints),
    hddStartLat, hddStartLng, hddEndLat, hddEndLng, JSON.stringify(hddMiddlePoints),
    trenchStartLat, trenchStartLng, trenchEndLat, trenchEndLng, JSON.stringify(trenchMiddlePoints),
    gisEditLayer, hddPoints, terminationPoints, trenchingLine, utilityPath,
    roadChangeSegments, hddSegments, trenchingSegments, tempRoadStart, tempHddStart, tempTrenchStart,
    editingProjectItem
  ]);

  // OSM Location Nominatim Geocoder
  const handleSearchMap = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!searchQueryMap.trim()) return;
    setSearchingMap(true);
    try {
      const res = await fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(searchQueryMap.trim())}+Kerala+India`);
      const data = await res.json();
      if (data && data.length > 0) {
        const first = data[0];
        const lat = parseFloat(first.lat);
        const lng = parseFloat(first.lon);
        
        const iframe = document.getElementById("gis-editor-iframe") as HTMLIFrameElement | null;
        if (iframe && iframe.contentWindow) {
          iframe.contentWindow.postMessage({
            type: 'FLY_TO',
            lat,
            lng
          }, '*');
          showToast(`📍 Centered: ${first.display_name.split(",")[0]}`);
        }
      } else {
        showToast("❌ Location not found. Please verify search query.");
      }
    } catch {
      showToast("❌ Connection error on geocoder lookup.");
    } finally {
      setSearchingMap(false);
    }
  };



  useEffect(() => {
    if (editingProjectItem) {
      setProjName(editingProjectItem.name);
      setProjCode(editingProjectItem.code);
      setProjDistrict(editingProjectItem.district);
      setProjDistance(editingProjectItem.distance);
      setProjManualDistance(editingProjectItem.manualDistance || "");
      setProjMiddlePoints(editingProjectItem.middlePoints || []);
      setProjDesc(editingProjectItem.description);
      setProjStartLabel(editingProjectItem.startLabel);
      setProjStartLat(String(editingProjectItem.startCoords[0]));
      setProjStartLng(String(editingProjectItem.startCoords[1]));
      setProjEndLabel(editingProjectItem.endLabel);
      setProjEndLat(String(editingProjectItem.endCoords[0]));
      setProjEndLng(String(editingProjectItem.endCoords[1]));

      setProjHddDefaultMachineName(editingProjectItem.hddDefaultMachineName || "");
      setProjHddDefaultVendorName(editingProjectItem.hddDefaultVendorName || "");
      setProjHddDefaultTrackerName(editingProjectItem.hddDefaultTrackerName || "");
      setProjHddDefaultOperatorName(editingProjectItem.hddDefaultOperatorName || "");
      setProjHddDefaultDuctsInfo(editingProjectItem.hddDefaultDuctsInfo || "");
      setProjHddDefaultRodLengthM(String(editingProjectItem.hddDefaultRodLengthM ?? "3.0"));

      // Load additional dynamic GIS markings
      setHddPoints(editingProjectItem.hddPoints ?? []);
      setTerminationPoints(editingProjectItem.terminationPoints ?? []);
      setTrenchingLine(editingProjectItem.trenchingLine ?? []);
      setUtilityPath(editingProjectItem.utilityPath ?? []);
      
      // Load segment mappings
      setRoadChangeSegments(editingProjectItem.roadChangeSegments ?? []);
      setHddSegments(editingProjectItem.hddSegments ?? []);
      setTrenchingSegments(editingProjectItem.trenchingSegments ?? []);
      setTempRoadStart(null);
      setTempHddStart(null);
      setTempTrenchStart(null);

      setGisEditLayer("corridor");
      
      const cable = editingProjectItem.cableLayingCoords || {};
      setCableStartLat(cable.startCoords ? String(cable.startCoords[0]) : "");
      setCableStartLng(cable.startCoords ? String(cable.startCoords[1]) : "");
      setCableEndLat(cable.endCoords ? String(cable.endCoords[0]) : "");
      setCableEndLng(cable.endCoords ? String(cable.endCoords[1]) : "");
      setCableMiddlePoints(cable.middlePoints || []);
      setCableDesc(cable.description || "");

      const hddDrill = editingProjectItem.hddDrillingCoords || {};
      setHddStartLat(hddDrill.startCoords ? String(hddDrill.startCoords[0]) : "");
      setHddStartLng(hddDrill.startCoords ? String(hddDrill.startCoords[1]) : "");
      setHddEndLat(hddDrill.endCoords ? String(hddDrill.endCoords[0]) : "");
      setHddEndLng(hddDrill.endCoords ? String(hddDrill.endCoords[1]) : "");
      setHddMiddlePoints(hddDrill.middlePoints || []);
      setHddDesc(hddDrill.description || "");

      const trench = editingProjectItem.openTrenchCoords || {};
      setTrenchStartLat(trench.startCoords ? String(trench.startCoords[0]) : "");
      setTrenchStartLng(trench.startCoords ? String(trench.startCoords[1]) : "");
      setTrenchEndLat(trench.endCoords ? String(trench.endCoords[0]) : "");
      setTrenchEndLng(trench.endCoords ? String(trench.endCoords[1]) : "");
      setTrenchMiddlePoints(trench.middlePoints || []);
      setTrenchDesc(trench.description || "");

      setActivePinMode("project_start"); // default active mode
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
      location: editingProjectItem.location || projDistrict + ", Kerala",
      district: projDistrict,
      distance: projDistance,
      manualDistance: projManualDistance,
      middlePoints: projMiddlePoints,
      description: projDesc,
      startLabel: projStartLabel,
      startCoords: [lat1, lng1] as [number, number],
      endLabel: projEndLabel,
      endCoords: [lat2, lng2] as [number, number],
      hddPoints,
      terminationPoints,
      trenchingLine,
      utilityPath,
      roadChangeSegments,
      hddSegments,
      trenchingSegments,
      cableLayingCoords: {
        startCoords: cableStartLat && cableStartLng ? [parseFloat(cableStartLat), parseFloat(cableStartLng)] : null,
        endCoords: cableEndLat && cableEndLng ? [parseFloat(cableEndLat), parseFloat(cableEndLng)] : null,
        middlePoints: cableMiddlePoints,
        description: cableDesc
      },
      hddDrillingCoords: {
        startCoords: hddStartLat && hddStartLng ? [parseFloat(hddStartLat), parseFloat(hddStartLng)] : null,
        endCoords: hddEndLat && hddEndLng ? [parseFloat(hddEndLat), parseFloat(hddEndLng)] : null,
        middlePoints: hddMiddlePoints,
        description: hddDesc
      },
      openTrenchCoords: {
        startCoords: trenchStartLat && trenchStartLng ? [parseFloat(trenchStartLat), parseFloat(trenchStartLng)] : null,
        endCoords: trenchEndLat && trenchEndLng ? [parseFloat(trenchEndLat), parseFloat(trenchEndLng)] : null,
        middlePoints: trenchMiddlePoints,
        description: trenchDesc
      },
      hddDefaultMachineName: projHddDefaultMachineName,
      hddDefaultVendorName: projHddDefaultVendorName,
      hddDefaultTrackerName: projHddDefaultTrackerName,
      hddDefaultOperatorName: projHddDefaultOperatorName,
      hddDefaultDuctsInfo: projHddDefaultDuctsInfo,
      hddDefaultRodLengthM: parseFloat(projHddDefaultRodLengthM) || 3.0
    };

    const isNew = !projectsList.some(p => p.id === editingProjectItem.id);
    let nextList;
    if (isNew) {
      nextList = [...projectsList, updated];
      showToast("✅ New Corridor Project created successfully!");
    } else {
      nextList = projectsList.map(p => p.id === editingProjectItem.id ? updated : p);
      showToast("✅ Corridor parameters updated successfully!");
    }
    syncProjectUpdate(updated, nextList);
    setEditingProjectItem(null);
  };

  // Automatic project distance calculation helper including intermediate road changes
  const updateProjectLength = (
    sLat: string,
    sLng: string,
    eLat: string,
    eLng: string,
    roadSegs: [[number, number], [number, number]][]
  ) => {
    const lat1 = parseFloat(sLat);
    const lng1 = parseFloat(sLng);
    const lat2 = parseFloat(eLat);
    const lng2 = parseFloat(eLng);
    
    let baseDist = 0;
    if (!isNaN(lat1) && !isNaN(lng1) && !isNaN(lat2) && !isNaN(lng2)) {
      baseDist = calculateHaversineDistance(lat1, lng1, lat2, lng2);
    }
    
    let roadDist = 0;
    if (roadSegs && roadSegs.length > 0) {
      roadSegs.forEach(seg => {
        roadDist += calculateHaversineDistance(seg[0][0], seg[0][1], seg[1][0], seg[1][1]);
      });
    }
    
    const totalDist = baseDist + roadDist;
    setProjDistance(`${totalDist.toFixed(2)} km`);
  };

  useEffect(() => {
    if (editingProjectItem) {
      updateProjectLength(projStartLat, projStartLng, projEndLat, projEndLng, roadChangeSegments);
    }
  }, [projStartLat, projStartLng, projEndLat, projEndLng, roadChangeSegments, editingProjectItem]);

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
            
            // Check attendance fallback
            const activeAtt = data.attendance?.find((att: any) => att.mobileUserId === item.userId);
            if (activeAtt) {
              return {
                ...item,
                status: "active" as const,
                latitude: activeAtt.latitude || 9.9538,
                longitude: activeAtt.longitude || 76.3428,
                projectName: activeAtt.projectName || "Vadakkekotta Sn-Cable Corridor",
                distanceFromSiteM: activeAtt.distanceFromSiteM ?? 0,
                withinGeofence: activeAtt.withinGeofence ?? true,
                recordedAt: activeAtt.checkInAt,
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

  async function handleCreateUser(e: React.FormEvent) {
    e.preventDefault();
    setIsCreatingUser(true);
    try {
      const r = await fetch("/api/mobile/admin/user/create", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          fullName: createName,
          email: createEmail,
          role: createRole,
          password: createPassword
        })
      });
      const d = await r.json();
      if (r.ok && d.ok) {
        showToast("✅ Member profile created successfully!");
        setIsCreateModalOpen(false);
        setApprovedCreds({
          email: createEmail.trim().toLowerCase(),
          password: createPassword.trim(),
          loginId: d.user?.login_id || ""
        });
        fetchUsers();
      } else {
        showToast("❌ " + (d.message || "Failed to create user."));
      }
    } catch {
      showToast("❌ Network connection error.");
    } finally {
      setIsCreatingUser(false);
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
    <div className="page" style={{ background: "var(--bg)", minHeight: "100vh", position: "relative", color: "var(--text)" }}>
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
          background: #f1f5f9 !important;
          box-shadow: 0 16px 36px rgba(124, 58, 237, 0.15) !important;
        }
        .search-input {
          transition: all 0.2s ease;
        }
        .search-input:focus {
          border-color: #06b6d4 !important;
          box-shadow: 0 0 0 3px rgba(6, 182, 212, 0.2) !important;
          background: #ffffff !important;
        }
        .back-btn {
          transition: all 0.2s ease;
        }
        .back-btn:hover {
          background: #f1f5f9 !important;
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
          border: 1px solid var(--border); background: var(--surface); color: var(--dim);
        }
        .tool-btn:hover {
          transform: translateY(-2px);
          background: #f1f5f9; border-color: #cbd5e1;
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
                <p style={{ fontSize: 10, fontWeight: 800, letterSpacing: "0.15em", textTransform: "uppercase", color: "var(--cyan)", marginBottom: 4 }}>TELGO OPERATIONS</p>
                <h1 style={{ fontSize: 24, fontWeight: 900, color: "var(--text)", margin: 0, letterSpacing: "-0.5px" }}>Control Center</h1>
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
                  background: adminSelf?.avatarUrl && adminSelf.avatarUrl.startsWith("data:image/") ? "none" : "linear-gradient(135deg, #7c3aed, #06b6d4)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  color: "var(--text)",
                  fontSize: 16,
                  fontWeight: 800,
                  border: "1.5px solid var(--border)",
                  boxShadow: "0 4px 15px rgba(124, 58, 237, 0.3)",
                  textTransform: "uppercase",
                  overflow: "hidden"
                }}>
                  {adminSelf?.avatarUrl && adminSelf.avatarUrl.startsWith("data:image/") ? (
                    <img src={adminSelf.avatarUrl} alt="Admin Profile" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                  ) : (
                    adminSelf ? adminSelf.fullName.charAt(0) : "A"
                  )}
                </div>
              </button>
            </div>

            {/* Greeting & Subtitle */}
            <div className="glass" style={{ padding: "18px 20px", display: "flex", alignItems: "center", gap: 14, border: "1px solid var(--border)", borderRadius: 16, background: "linear-gradient(135deg, #ffffff 0%, #f8fafc 100%)", marginBottom: 24 }}>
              <div style={{ width: 10, height: 10, borderRadius: "50%", background: "#10b981", boxShadow: "0 0 10px #10b981" }} />
              <div>
                <h2 style={{ fontSize: 16, fontWeight: 700, color: "var(--text)", margin: 0 }}>{getGreeting()}, {adminSelf?.fullName || "Control"}</h2>
                <p style={{ fontSize: 12, color: "var(--dim)", margin: "2px 0 0" }}>System is online. Click your avatar to manage your profile.</p>
              </div>
            </div>
          </div>

          {/* Quick Metrics Banner */}
          <div style={{ padding: "0 16px 24px" }}>
            <p style={{ fontSize: 11, fontWeight: 700, letterSpacing: "0.12em", textTransform: "uppercase", color: "var(--muted)", marginBottom: 12 }}>Active Telemetry</p>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
              <div className="glass" style={{ padding: "16px 18px", border: "1px solid var(--border)" }}>
                <span style={{ fontSize: 10, color: "var(--dim)", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.05em" }}>Total Crews</span>
                <p style={{ fontSize: 32, fontWeight: 900, color: "var(--text)", margin: "4px 0 0", letterSpacing: "-1px" }}>{users.length}</p>
              </div>
              <div className="glass" style={{ padding: "12px 14px", border: "1px solid var(--border)", display: "flex", flexDirection: "column", minHeight: 90 }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 6 }}>
                  <span style={{ fontSize: 10, color: "var(--dim)", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.05em" }}>
                    🔔 Operations Feed ({adminNotifications.length})
                  </span>
                  {adminNotifications.length > 0 && (
                    <button 
                      onClick={clearAllNotifications}
                      style={{
                        background: "none",
                        border: "none",
                        fontSize: 9,
                        color: "#ef4444",
                        cursor: "pointer",
                        fontWeight: 700,
                        textTransform: "uppercase",
                        padding: 0
                      }}
                    >
                      Clear All
                    </button>
                  )}
                </div>
                
                <div style={{ 
                  flex: 1, 
                  overflowY: "auto", 
                  maxHeight: 180, 
                  display: "flex", 
                  flexDirection: "column", 
                  gap: 8,
                  paddingRight: 4
                }}>
                  {adminNotifications.length === 0 ? (
                    <div style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", color: "var(--muted)", fontSize: 11, fontStyle: "italic", minHeight: 40 }}>
                      All clear! No new logs. ✨
                    </div>
                  ) : (
                    adminNotifications.map(n => {
                      const timeStr = new Date(n.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) + " " + new Date(n.createdAt).toLocaleDateString([], { month: 'short', day: 'numeric' });
                      return (
                        <div 
                          key={n.id}
                          style={{
                            display: "flex",
                            alignItems: "flex-start",
                            justifyContent: "space-between",
                            background: "rgba(255, 255, 255, 0.4)",
                            border: "1px solid var(--border)",
                            borderRadius: 10,
                            padding: "6px 8px",
                            gap: 6
                          }}
                        >
                          <div style={{ display: "flex", flexDirection: "column", gap: 2, flex: 1 }}>
                            <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                              <span style={{ fontSize: 12, fontWeight: 800, color: "var(--text)" }}>{n.title}</span>
                              <span style={{ fontSize: 8, color: "var(--muted)", fontFamily: "monospace" }}>{timeStr}</span>
                            </div>
                            {n.body && <p style={{ margin: 0, fontSize: 10.5, color: "var(--dim)", lineHeight: 1.3 }}>{n.body}</p>}
                          </div>
                          
                          <button 
                            onClick={() => dismissNotification(n.id)}
                            style={{
                              background: "none",
                              border: "none",
                              color: "var(--muted)",
                              cursor: "pointer",
                              fontSize: 14,
                              fontWeight: 700,
                              lineHeight: 1,
                              padding: "0 2px"
                            }}
                          >
                            ×
                          </button>
                        </div>
                      );
                    })
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Core System Grid */}
          <div style={{ padding: "0 16px" }}>
            <p style={{ fontSize: 11, fontWeight: 800, letterSpacing: "0.12em", textTransform: "uppercase", color: "var(--dim)", marginBottom: 14 }}>System Modules</p>
            
            <div className="admin-grid">
              
              {/* MODULE 1: ACCESS & PERSONNEL */}
              <div 
                className={`glass module-card ${pending.length > 0 ? "active-glow-pending" : ""}`}
                onClick={() => setActiveView("approvals")}
                style={{ 
                  padding: "18px 14px", 
                  borderRadius: 16,
                  border: pending.length > 0 ? "1px solid rgba(217, 119, 6, 0.35)" : "1px solid var(--border)",
                  background: pending.length > 0 ? "linear-gradient(135deg, #fffbeb 0%, #fef3c7 100%)" : "var(--surface)",
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "center",
                  textAlign: "center",
                  gap: 10
                }}
              >
                <div style={{ position: "relative" }}>
                  <div style={{ width: 44, height: 44, borderRadius: 12, background: pending.length > 0 ? "rgba(217, 119, 6, 0.12)" : "rgba(124, 58, 237, 0.08)", border: pending.length > 0 ? "1px solid rgba(217, 119, 6, 0.3)" : "1px solid rgba(124, 58, 237, 0.2)", display: "flex", alignItems: "center", justifyContent: "center" }}>
                    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke={pending.length > 0 ? "#d97706" : "#7c3aed"} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M16 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="8.5" cy="7" r="4"/><line x1="20" y1="8" x2="20" y2="14"/><line x1="23" y1="11" x2="17" y2="11"/></svg>
                  </div>
                  {pending.length > 0 && (
                    <span style={{ position: "absolute", top: -4, right: -4, fontSize: 9, fontWeight: 900, background: "#fbbf24", color: "#ffffff", borderRadius: "50%", width: 18, height: 18, display: "flex", alignItems: "center", justifyContent: "center", border: "1.5px solid #ffffff" }}>
                      {pending.length}
                    </span>
                  )}
                </div>
                <div>
                  <h4 style={{ fontSize: 14, fontWeight: 800, color: "var(--text)", margin: 0 }}>Access Control</h4>
                  <span style={{ fontSize: 10, color: "var(--dim)", fontWeight: 700, textTransform: "uppercase" }}>
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
                  border: "1px solid var(--border)",
                  background: "var(--surface)",
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "center",
                  textAlign: "center",
                  gap: 10
                }}
              >
                <div style={{ width: 44, height: 44, borderRadius: 12, background: "rgba(6, 182, 212, 0.1)", border: "1px solid rgba(14, 165, 233, 0.2)", display: "flex", alignItems: "center", justifyContent: "center" }}>
                  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#06b6d4" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/><circle cx="12" cy="10" r="3"/></svg>
                </div>
                <div>
                  <h4 style={{ fontSize: 14, fontWeight: 800, color: "var(--text)", margin: 0 }}>Live Location</h4>
                  <span style={{ fontSize: 10, color: "var(--cyan)", fontWeight: 800, textTransform: "uppercase", display: "inline-flex", alignItems: "center", gap: 4 }}>
                    <span className="dot-pulse" style={{ background: "#06b6d4", width: 5, height: 5 }} /> Location Live
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
                  border: "1px solid var(--border)",
                  background: "var(--surface)",
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "center",
                  textAlign: "center",
                  gap: 10
                }}
              >
                <div style={{ width: 44, height: 44, borderRadius: 12, background: "rgba(167, 139, 250, 0.1)", border: "1px solid rgba(124, 58, 237, 0.2)", display: "flex", alignItems: "center", justifyContent: "center" }}>
                  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#a78bfa" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><rect width="18" height="18" x="3" y="4" rx="2" ry="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>
                </div>
                <div>
                  <h4 style={{ fontSize: 14, fontWeight: 800, color: "var(--text)", margin: 0 }}>Attendance Ledger</h4>
                  <span style={{ fontSize: 10, color: "#a78bfa", fontWeight: 700, textTransform: "uppercase" }}>Monthly registry</span>
                </div>
              </div>

              {/* MODULE 4: PROJECTS PROGRESS */}
              <div 
                className="glass module-card"
                onClick={() => { setActiveView("progress"); if (projectsList.length > 0) setSelectedProjectItem(projectsList[0]); }}
                style={{ 
                  padding: "18px 14px", 
                  borderRadius: 16,
                  border: "1px solid var(--border)",
                  background: "var(--surface)",
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "center",
                  textAlign: "center",
                  gap: 10,
                  cursor: "pointer"
                }}
              >
                <div style={{ width: 44, height: 44, borderRadius: 12, background: "rgba(16, 185, 129, 0.1)", border: "1px solid rgba(16, 185, 129, 0.2)", display: "flex", alignItems: "center", justifyContent: "center" }}>
                  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#10b981" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <line x1="18" y1="20" x2="18" y2="10"/>
                    <line x1="12" y1="20" x2="12" y2="4"/>
                    <line x1="6" y1="20" x2="6" y2="14"/>
                  </svg>
                </div>
                <div>
                  <h4 style={{ fontSize: 14, fontWeight: 800, color: "var(--text)", margin: 0 }}>Projects Progress</h4>
                  <span style={{ fontSize: 10, color: "#10b981", fontWeight: 700, textTransform: "uppercase" }}>Planning & Docs</span>
                </div>
              </div>

              {/* MODULE 5: PROJECTS DIRECTORY */}
              <div 
                className="glass module-card"
                onClick={() => { setActiveView("projects"); if (projectsList.length > 0) setSelectedProjectItem(projectsList[0]); }}
                style={{ 
                  padding: "18px 14px", 
                  borderRadius: 16,
                  border: "1px solid var(--border)",
                  background: "var(--surface)",
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "center",
                  textAlign: "center",
                  gap: 10
                }}
              >
                <div style={{ width: 44, height: 44, borderRadius: 12, background: "rgba(167, 139, 250, 0.1)", border: "1px solid rgba(124, 58, 237, 0.2)", display: "flex", alignItems: "center", justifyContent: "center" }}>
                  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#a78bfa" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"/><line x1="12" y1="11" x2="12" y2="17"/><line x1="9" y1="14" x2="15" y2="14"/></svg>
                </div>
                <div>
                  <h4 style={{ fontSize: 14, fontWeight: 800, color: "var(--text)", margin: 0 }}>Projects Hub</h4>
                  <span style={{ fontSize: 10, color: "#a78bfa", fontWeight: 700, textTransform: "uppercase" }}>Corridor mapping</span>
                </div>
              </div>

              {/* MODULE 6: DAILY REPORTS HUB */}
              <div 
                className="glass module-card"
                onClick={() => { setActiveView("reports"); if (projectsList.length > 0) setReportFilterProjectId(projectsList[0].id); }}
                style={{ 
                  padding: "18px 14px", 
                  borderRadius: 16,
                  border: "1px solid var(--border)",
                  background: "var(--surface)",
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "center",
                  textAlign: "center",
                  gap: 10
                }}
              >
                <div style={{ width: 44, height: 44, borderRadius: 12, background: "rgba(16, 185, 129, 0.1)", border: "1px solid rgba(16, 185, 129, 0.2)", display: "flex", alignItems: "center", justifyContent: "center" }}>
                  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#10b981" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
                    <polyline points="14 2 14 8 20 8"/>
                    <line x1="16" y1="13" x2="8" y2="13"/>
                    <line x1="16" y1="17" x2="8" y2="17"/>
                  </svg>
                </div>
                <div>
                  <h4 style={{ fontSize: 14, fontWeight: 800, color: "var(--text)", margin: 0 }}>Daily Reports</h4>
                  <span style={{ fontSize: 10, color: "#10b981", fontWeight: 700, textTransform: "uppercase" }}>Verification</span>
                </div>
              </div>

              {/* MODULE 7: MASTER LEDGER HUB */}
              <div 
                className="glass module-card"
                onClick={() => { setActiveView("ledger"); if (projectsList.length > 0) { setSelectedLedgerProject(projectsList[0].id); fetchMasterLedger(projectsList[0].id); } }}
                style={{ 
                  padding: "18px 14px", 
                  borderRadius: 16,
                  border: "1px solid var(--border)",
                  background: "var(--surface)",
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "center",
                  textAlign: "center",
                  gap: 10
                }}
              >
                <div style={{ width: 44, height: 44, borderRadius: 12, background: "rgba(245, 158, 11, 0.1)", border: "1px solid rgba(217, 119, 6, 0.2)", display: "flex", alignItems: "center", justifyContent: "center" }}>
                  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#f59e0b" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <line x1="18" y1="20" x2="18" y2="10"/>
                    <line x1="12" y1="20" x2="12" y2="4"/>
                    <line x1="6" y1="20" x2="6" y2="14"/>
                  </svg>
                </div>
                <div>
                  <h4 style={{ fontSize: 14, fontWeight: 800, color: "var(--text)", margin: 0 }}>Master Ledger</h4>
                  <span style={{ fontSize: 10, color: "#f59e0b", fontWeight: 700, textTransform: "uppercase" }}>Aggregates</span>
                </div>
              </div>
            </div>

            {/* NEW SECTION: OPERATIONAL FINANCIALS & PROGRESS SEPARATE REGISTRY */}
            <p style={{ fontSize: 11, fontWeight: 800, letterSpacing: "0.12em", textTransform: "uppercase", color: "var(--dim)", marginTop: 24, marginBottom: 14 }}>Operational Financials & Site Progress</p>
            <div className="admin-grid" style={{ marginBottom: 20 }}>
              
              {/* MODULE A.1: FUEL EXPENSE REGISTRY */}
              <div 
                className="glass module-card"
                onClick={() => { setActiveView("expense_fuel"); if (projectsList.length > 0) setFinancialFilterProjectId(projectsList[0].id); }}
                style={{ 
                  padding: "18px 14px", 
                  borderRadius: 16,
                  border: "1px solid var(--border)",
                  background: "var(--surface)",
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "center",
                  textAlign: "center",
                  gap: 10
                }}
              >
                <div style={{ width: 44, height: 44, borderRadius: 12, background: "rgba(245, 158, 11, 0.08)", border: "1px solid rgba(245, 158, 11, 0.2)", display: "flex", alignItems: "center", justifyContent: "center" }}>
                  <span style={{ fontSize: 20 }}>⛽</span>
                </div>
                <div>
                  <h4 style={{ fontSize: 13, fontWeight: 800, color: "var(--text)", margin: 0 }}>Fuel Expenses</h4>
                  <span style={{ fontSize: 10, color: "#f59e0b", fontWeight: 700, textTransform: "uppercase" }}>Diesel aggregates</span>
                </div>
              </div>

              {/* MODULE A.2: TRAVEL EXPENSE REGISTRY */}
              <div 
                className="glass module-card"
                onClick={() => { setActiveView("expense_travel"); if (projectsList.length > 0) setFinancialFilterProjectId(projectsList[0].id); }}
                style={{ 
                  padding: "18px 14px", 
                  borderRadius: 16,
                  border: "1px solid var(--border)",
                  background: "var(--surface)",
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "center",
                  textAlign: "center",
                  gap: 10
                }}
              >
                <div style={{ width: 44, height: 44, borderRadius: 12, background: "rgba(14, 165, 233, 0.08)", border: "1px solid rgba(14, 165, 233, 0.2)", display: "flex", alignItems: "center", justifyContent: "center" }}>
                  <span style={{ fontSize: 20 }}>🚗</span>
                </div>
                <div>
                  <h4 style={{ fontSize: 13, fontWeight: 800, color: "var(--text)", margin: 0 }}>Travel & Transit</h4>
                  <span style={{ fontSize: 10, color: "#0ea5e9", fontWeight: 700, textTransform: "uppercase" }}>Logistics logs</span>
                </div>
              </div>

              {/* MODULE A.3: ROOM RENT REGISTRY */}
              <div 
                className="glass module-card"
                onClick={() => { setActiveView("expense_room"); if (projectsList.length > 0) setFinancialFilterProjectId(projectsList[0].id); }}
                style={{ 
                  padding: "18px 14px", 
                  borderRadius: 16,
                  border: "1px solid var(--border)",
                  background: "var(--surface)",
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "center",
                  textAlign: "center",
                  gap: 10
                }}
              >
                <div style={{ width: 44, height: 44, borderRadius: 12, background: "rgba(139, 92, 246, 0.08)", border: "1px solid rgba(139, 92, 246, 0.2)", display: "flex", alignItems: "center", justifyContent: "center" }}>
                  <span style={{ fontSize: 20 }}>🏠</span>
                </div>
                <div>
                  <h4 style={{ fontSize: 13, fontWeight: 800, color: "var(--text)", margin: 0 }}>Room Rents</h4>
                  <span style={{ fontSize: 10, color: "#8b5cf6", fontWeight: 700, textTransform: "uppercase" }}>Stay lodging</span>
                </div>
              </div>

              {/* MODULE A.4: TOOL RENT REGISTRY */}
              <div 
                className="glass module-card"
                onClick={() => { setActiveView("expense_tool"); if (projectsList.length > 0) setFinancialFilterProjectId(projectsList[0].id); }}
                style={{ 
                  padding: "18px 14px", 
                  borderRadius: 16,
                  border: "1px solid var(--border)",
                  background: "var(--surface)",
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "center",
                  textAlign: "center",
                  gap: 10
                }}
              >
                <div style={{ width: 44, height: 44, borderRadius: 12, background: "rgba(16, 185, 129, 0.08)", border: "1px solid rgba(16, 185, 129, 0.2)", display: "flex", alignItems: "center", justifyContent: "center" }}>
                  <span style={{ fontSize: 20 }}>🔧</span>
                </div>
                <div>
                  <h4 style={{ fontSize: 13, fontWeight: 800, color: "var(--text)", margin: 0 }}>Tool Rentals</h4>
                  <span style={{ fontSize: 10, color: "#10b981", fontWeight: 700, textTransform: "uppercase" }}>Machinery rents</span>
                </div>
              </div>

              {/* MODULE A.5: OTHER EXPENSE REGISTRY */}
              <div 
                className="glass module-card"
                onClick={() => { setActiveView("expense_other"); if (projectsList.length > 0) setFinancialFilterProjectId(projectsList[0].id); }}
                style={{ 
                  padding: "18px 14px", 
                  borderRadius: 16,
                  border: "1px solid var(--border)",
                  background: "var(--surface)",
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "center",
                  textAlign: "center",
                  gap: 10
                }}
              >
                <div style={{ width: 44, height: 44, borderRadius: 12, background: "rgba(244, 63, 94, 0.08)", border: "1px solid rgba(244, 63, 94, 0.2)", display: "flex", alignItems: "center", justifyContent: "center" }}>
                  <span style={{ fontSize: 20 }}>💡</span>
                </div>
                <div>
                  <h4 style={{ fontSize: 13, fontWeight: 800, color: "var(--text)", margin: 0 }}>Other Expenses</h4>
                  <span style={{ fontSize: 10, color: "#f43f5e", fontWeight: 700, textTransform: "uppercase" }}>Miscellaneous logs</span>
                </div>
              </div>

              {/* MODULE B.1: SITE PROGRESS TRACKER */}
              <div 
                className="glass module-card"
                onClick={() => { setActiveView("progress_analytics"); if (projectsList.length > 0) setFinancialFilterProjectId(projectsList[0].id); }}
                style={{ 
                  padding: "18px 14px", 
                  borderRadius: 16,
                  border: "1px solid var(--border)",
                  background: "var(--surface)",
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "center",
                  textAlign: "center",
                  gap: 10
                }}
              >
                <div style={{ width: 44, height: 44, borderRadius: 12, background: "rgba(217, 70, 239, 0.08)", border: "1px solid rgba(217, 70, 239, 0.2)", display: "flex", alignItems: "center", justifyContent: "center" }}>
                  <span style={{ fontSize: 20 }}>🏗️</span>
                </div>
                <div>
                  <h4 style={{ fontSize: 13, fontWeight: 800, color: "var(--text)", margin: 0 }}>Site Progress</h4>
                  <span style={{ fontSize: 10, color: "#d946ef", fontWeight: 700, textTransform: "uppercase" }}>Work updates</span>
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
              style={{ width: "100%", minHeight: 48, background: "transparent", border: "1px solid rgba(239,68,68,0.25)", borderRadius: 14, color: "#dc2626", fontSize: 14, fontWeight: 700, cursor: "pointer", fontFamily: "Outfit,sans-serif" }}
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
          <div style={{ padding: "20px 16px 14px", paddingTop: "calc(env(safe-area-inset-top, 0px) + 16px)", borderBottom: "1px solid var(--border)", background: "rgba(255,255,255,0.85)", backdropFilter: "blur(10px)", position: "sticky", top: 0, zIndex: 10 }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 14 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
                <button 
                  onClick={() => setActiveView("hub")}
                  className="back-btn"
                  style={{ width: 38, height: 38, borderRadius: 10, border: "1px solid var(--border)", background: "var(--surface)", display: "flex", alignItems: "center", justifyContent: "center", color: "var(--text)", cursor: "pointer" }}
                >
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="19" y1="12" x2="5" y2="12"/><polyline points="12 19 5 12 12 5"/></svg>
                </button>
                <div>
                  <p style={{ fontSize: 10, fontWeight: 800, color: "var(--cyan)", letterSpacing: "0.1em", textTransform: "uppercase", margin: 0 }}>System Management</p>
                  <h1 style={{ fontSize: 20, fontWeight: 800, color: "var(--text)", margin: "2px 0 0", letterSpacing: "-0.5px" }}>Access Control</h1>
                </div>
              </div>
              <button 
                onClick={() => {
                  setCreateName("");
                  setCreateEmail("");
                  setCreateRole("supervisor");
                  setCreatePassword("");
                  setIsCreateModalOpen(true);
                }}
                style={{
                  height: 38,
                  padding: "0 14px",
                  borderRadius: 10,
                  border: "none",
                  background: "linear-gradient(135deg, #06b6d4 0%, #7c3aed 100%)",
                  color: "#ffffff",
                  fontWeight: 700,
                  fontSize: 12,
                  display: "flex",
                  alignItems: "center",
                  gap: 6,
                  cursor: "pointer",
                  boxShadow: "0 4px 12px rgba(6, 182, 212, 0.15)",
                  fontFamily: "Outfit, sans-serif"
                }}
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
                Add Member
              </button>
            </div>
          </div>

          {/* Professional Tab Switcher */}
          <div style={{ padding: "16px 16px 0", display: "flex", gap: 10 }}>
            <button 
              onClick={() => setApprovalsTab("pending")}
              style={{
                flex: 1,
                minHeight: 40,
                background: approvalsTab === "pending" ? "rgba(124, 58, 237, 0.08)" : "var(--surface)",
                border: approvalsTab === "pending" ? "1px solid rgba(124, 58, 237, 0.3)" : "1px solid var(--border)",
                borderRadius: 12,
                color: approvalsTab === "pending" ? "var(--violet)" : "var(--dim)",
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
                <span style={{ fontSize: 10, background: "#fbbf24", color: "#ffffff", borderRadius: "50%", width: 18, height: 18, display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 800 }}>
                  {pending.length}
                </span>
              )}
            </button>
            <button 
              onClick={() => setApprovalsTab("active")}
              style={{
                flex: 1,
                minHeight: 40,
                background: approvalsTab === "active" ? "rgba(14, 165, 233, 0.08)" : "var(--surface)",
                border: approvalsTab === "active" ? "1px solid rgba(14, 165, 233, 0.3)" : "1px solid var(--border)",
                borderRadius: 12,
                color: approvalsTab === "active" ? "var(--cyan)" : "var(--dim)",
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
              <span style={{ fontSize: 10, background: "rgba(14, 165, 233, 0.12)", color: "var(--cyan)", borderRadius: 10, padding: "2px 6px", fontWeight: 800 }}>
                {active.length}
              </span>
            </button>
          </div>

          {/* Tab A: Pending Requests */}
          {approvalsTab === "pending" && (
            <div style={{ padding: "20px 16px 0" }}>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 12 }}>
                <p style={{ fontSize: 11, fontWeight: 700, letterSpacing: "0.12em", textTransform: "uppercase", color: "var(--dim)" }}>Pending Approvals</p>
                {pending.length > 0 && <span className="badge badge-pending">{pending.length} waiting</span>}
              </div>

              {loading ? (
                <div style={{ textAlign: "center", padding: "40px 0", color: "var(--muted)" }}>
                  <div className="spinner" style={{ margin: "0 auto 12px" }} />
                  Loading Database...
                </div>
              ) : pending.length === 0 ? (
                <div className="glass" style={{ padding: "24px 18px", textAlign: "center", border: "1px solid var(--border)" }}>
                  <div style={{ fontSize: 28, marginBottom: 6 }}>✨</div>
                  <p style={{ color: "var(--dim)", fontSize: 13, margin: 0 }}>No pending onboarding requests.</p>
                </div>
              ) : (
                <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                  {pending.map(u => (
                    <div key={u.id} className="approval-card fade-in" style={{ background: "var(--surface)", border: "1px solid var(--border)", borderRadius: 16, padding: 16 }}>
                      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 12, marginBottom: 4 }}>
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <p style={{ fontWeight: 700, fontSize: 15, color: "var(--text)", marginBottom: 2, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{u.full_name}</p>
                          <p style={{ fontSize: 12, color: "var(--dim)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{u.email}</p>
                        </div>
                        <span style={{ fontSize: 11, fontWeight: 700, color: "var(--text)", background: `${roleColor(u.role)}18`, border: `1px solid ${roleColor(u.role)}30`, borderRadius: 8, padding: "3px 9px", flexShrink: 0, textTransform: "capitalize" }}>{u.role}</span>
                      </div>
                      
                      <div style={{ display: "flex", gap: 8, marginTop: 8 }}>
                        <button
                          onClick={() => approve(u.id)}
                          disabled={approving === u.id}
                          className="action-btn"
                          style={{ flex: 1, minHeight: 40, background: "linear-gradient(135deg,#16a34a,#15803d)", border: "none", borderRadius: 10, color: "var(--text)", fontSize: 13, fontWeight: 700, cursor: "pointer", fontFamily: "Outfit,sans-serif", display: "flex", alignItems: "center", justifyContent: "center", gap: 6, opacity: approving === u.id ? 0.6 : 1 }}
                        >
                          {approving === u.id ? <><div className="spinner" style={{ width: 14, height: 14 }} /> Approving...</> : <>✓ Approve</>}
                        </button>
                        <button
                          onClick={() => blockUser(u.id)}
                          disabled={blocking === u.id}
                          className="action-btn"
                          style={{ minWidth: 70, minHeight: 40, background: "rgba(220, 38, 38, 0.08)", border: "1px solid rgba(239,68,68,0.2)", borderRadius: 10, color: "#dc2626", fontSize: 13, fontWeight: 700, cursor: "pointer", fontFamily: "Outfit,sans-serif", opacity: blocking === u.id ? 0.6 : 1 }}
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
              <p style={{ fontSize: 11, fontWeight: 700, letterSpacing: "0.12em", textTransform: "uppercase", color: "var(--dim)", marginBottom: 12 }}>Authorized Personnel Directory</p>
              
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
                    background: "#ffffff", 
                    border: "1px solid var(--border)", 
                    borderRadius: 12, 
                    padding: "0 14px", 
                    color: "var(--text)", 
                    fontSize: 13, 
                    outline: "none", 
                    fontFamily: "Outfit, sans-serif" 
                  }} 
                />
              </div>

              {loading ? (
                <div style={{ textAlign: "center", padding: "20px 0", color: "var(--muted)" }}>
                  Loading Users...
                </div>
              ) : filteredActive.length === 0 ? (
                <div className="glass" style={{ padding: "20px", textAlign: "center", border: "1px solid var(--border)" }}>
                  <p style={{ color: "var(--dim)", fontSize: 12, margin: 0 }}>
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
                        border: "1px solid var(--border)",
                        borderRadius: 14,
                        background: "var(--surface)"
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
                          color: "var(--text)",
                          fontSize: 14,
                          fontWeight: 800,
                          border: "1px solid var(--border)",
                          textTransform: "uppercase"
                        }}>
                          {u.full_name.charAt(0)}
                        </div>
                        
                        <div style={{ minWidth: 0, flex: 1 }}>
                          <p style={{ fontWeight: 700, fontSize: 14, color: "var(--text)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", margin: 0 }}>{u.full_name}</p>
                          <p style={{ fontSize: 11, color: "var(--dim)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", margin: "2px 0 0" }}>{u.email}</p>
                        </div>
                      </div>

                      <div style={{ display: "flex", alignItems: "center", gap: 10, flexShrink: 0 }}>
                        <span style={{ fontSize: 10, fontWeight: 800, color: "var(--text)", textTransform: "uppercase", background: `${roleColor(u.role)}12`, padding: "4px 8px", borderRadius: 6, border: `1px solid ${roleColor(u.role)}20` }}>{u.role}</span>
                        <div style={{ width: 28, height: 28, borderRadius: "50%", background: "var(--surface)", border: "1px solid var(--border)", display: "flex", alignItems: "center", justifyContent: "center", color: "var(--dim)" }}>
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

      {/* VIEW 3: LIVE TELEMETRY LOCATION MAP */}
      {activeView === "map" && (
        <div className="fade-in" style={{ paddingBottom: 60 }}>
          {/* Header */}
          <div style={{ padding: "20px 16px 14px", paddingTop: "calc(env(safe-area-inset-top, 0px) + 16px)", borderBottom: "1px solid var(--border)", background: "rgba(255,255,255,0.85)", backdropFilter: "blur(10px)", position: "sticky", top: 0, zIndex: 10 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
              <button 
                onClick={() => { setActiveView("hub"); setRadarSelectedWorker(null); }}
                className="back-btn"
                style={{ width: 38, height: 38, borderRadius: 10, border: "1px solid var(--border)", background: "var(--surface)", display: "flex", alignItems: "center", justifyContent: "center", color: "var(--text)", cursor: "pointer" }}
              >
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="19" y1="12" x2="5" y2="12"/><polyline points="12 19 5 12 12 5"/></svg>
              </button>
              <div>
                <p style={{ fontSize: 10, fontWeight: 800, color: "var(--cyan)", letterSpacing: "0.1em", textTransform: "uppercase", margin: 0 }}>Operations tactical map</p>
                <h1 style={{ fontSize: 20, fontWeight: 800, color: "var(--text)", margin: "2px 0 0", letterSpacing: "-0.5px" }}>Live Location</h1>
              </div>
            </div>
          </div>

          <div style={{ padding: "16px", display: "flex", flexDirection: "column", gap: 16 }}>
            {/* Roster Section */}
            <div className="glass" style={{ padding: 20, border: "1px solid var(--border)", borderRadius: 20 }}>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 16 }}>
                <h2 style={{ fontSize: 14, fontWeight: 800, textTransform: "uppercase", letterSpacing: "0.08em", color: "var(--dim)", margin: 0 }}>Total Worker Present</h2>
              </div>
              
              <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
                {radarWorkers.map(w => {
                  const isSelected = radarSelectedWorker?.userId === w.userId;
                  const isActive = w.status === "active";
                  const avatarChar = w.fullName ? w.fullName.charAt(0) : "U";
                  const photoUrl = w.avatarUrl || w.avatar_url || "";
                  const hasPhoto = photoUrl && photoUrl.startsWith("data:image/");
                  
                  return (
                    <div 
                      key={w.userId}
                      style={{
                        background: "var(--surface)",
                        border: "1px solid var(--border)",
                        borderRadius: 18,
                        padding: 16,
                        display: "flex",
                        flexDirection: "column",
                        gap: 12,
                        transition: "all 0.25s cubic-bezier(0.4, 0, 0.2, 1)",
                        boxShadow: isSelected ? "0 8px 30px rgba(6, 182, 212, 0.08)" : "none",
                        borderColor: isSelected ? "rgba(6, 182, 212, 0.4)" : "var(--border)"
                      }}
                    >
                      {/* Header Row */}
                      <div 
                        onClick={() => setRadarSelectedWorker(isSelected ? null : w)}
                        style={{
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "space-between",
                          cursor: "pointer"
                        }}
                      >
                        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                          <div style={{
                            width: 36,
                            height: 36,
                            borderRadius: "50%",
                            background: hasPhoto ? "none" : "linear-gradient(135deg, #06b6d4 0%, #7c3aed 100%)",
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                            color: "white",
                            fontSize: 14,
                            fontWeight: 800,
                            border: "1px solid var(--border)",
                            overflow: "hidden"
                          }}>
                            {hasPhoto ? (
                              <img src={photoUrl} alt="Avatar" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                            ) : (
                              avatarChar
                            )}
                          </div>
                          <div>
                            <h3 style={{ fontSize: 14, fontWeight: 800, color: "var(--text)", margin: 0 }}>{w.fullName}</h3>
                            <span style={{ fontSize: 10, color: roleColor(w.role), fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.03em" }}>{w.role}</span>
                          </div>
                        </div>
                        
                        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                          {isActive ? (
                            <span style={{ display: "inline-flex", alignItems: "center", gap: 4, background: "rgba(34,197,94,0.12)", color: "#15803d", border: "1px solid rgba(34,197,94,0.2)", borderRadius: 6, padding: "3px 8px", fontSize: 9, fontWeight: 800, textTransform: "uppercase" }}>
                              <span className="dot-pulse" style={{ background: "#22c55e", width: 5, height: 5 }} /> Active
                            </span>
                          ) : (
                            <span style={{ display: "inline-flex", alignItems: "center", gap: 4, background: "var(--surface)", color: "var(--dim)", border: "1px solid var(--border)", borderRadius: 6, padding: "3px 8px", fontSize: 9, fontWeight: 800, textTransform: "uppercase" }}>
                              Offline
                            </span>
                          )}
                        </div>
                      </div>

                      {/* Collapsible Inline Map */}
                      {isActive && (
                        <div style={{
                          height: isSelected ? 300 : 120,
                          width: "100%",
                          borderRadius: 12,
                          overflow: "hidden",
                          border: "1px solid var(--border)",
                          transition: "height 0.3s ease",
                          marginTop: 10
                        }}>
                          <iframe
                            title={`map-${w.userId}`}
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
                                  
                                  .live-pulse {
                                    background: #06b6d4;
                                    border: 2px solid #ffffff;
                                    border-radius: 50%;
                                    box-shadow: 0 0 0 0 rgba(6, 182, 212, 0.7);
                                    animation: pulse-glow 1.5s infinite;
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
                                  const map = L.map('map', {
                                    zoomControl: ${isSelected ? "true" : "false"},
                                    dragging: ${isSelected ? "true" : "false"},
                                    scrollWheelZoom: false,
                                    doubleClickZoom: false
                                  }).setView([${w.latitude}, ${w.longitude}], 15);
                                  
                                  L.tileLayer('https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png', {
                                    maxZoom: 20
                                  }).addTo(map);

                                  L.circle([${w.latitude}, ${w.longitude}], {
                                    color: '#06b6d4',
                                    fillColor: '#06b6d4',
                                    fillOpacity: 0.1,
                                    weight: 1.5,
                                    radius: 150
                                  }).addTo(map);

                                  const pulseIcon = L.divIcon({
                                    className: 'live-pulse',
                                    iconSize: [12, 12],
                                    iconAnchor: [6, 6]
                                  });

                                  L.marker([${w.latitude}, ${w.longitude}], { icon: pulseIcon }).addTo(map);

                                  const historyCoords = ${isSelected ? JSON.stringify(radarWorkerHistory.map(pt => [pt.latitude, pt.longitude])) : "[]"};
                                  if (historyCoords && historyCoords.length > 1) {
                                    L.polyline(historyCoords, {
                                      color: '#06b6d4',
                                      weight: 6,
                                      opacity: 0.4,
                                      lineJoin: 'round'
                                    }).addTo(map);

                                    L.polyline(historyCoords, {
                                      color: '#06b6d4',
                                      weight: 2.5,
                                      opacity: 0.95,
                                      lineJoin: 'round'
                                    }).addTo(map);

                                    try {
                                      map.fitBounds(historyCoords, { padding: [20, 20] });
                                    } catch(e) {}
                                  }
                                </script>
                              </body>
                              </html>
                            `}
                          />
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Consolidated Global Map */}
            <div className="glass glow-cyan" style={{ padding: 20, border: "1px solid rgba(14, 165, 233, 0.2)", borderRadius: 20, display: "flex", flexDirection: "column", gap: 12 }}>
              <div>
                <h3 style={{ fontSize: 14, fontWeight: 800, textTransform: "uppercase", letterSpacing: "0.08em", color: "var(--dim)", margin: 0 }}>Consolidated Field Map</h3>
                <p style={{ fontSize: 11, color: "var(--dim)", margin: "2px 0 0" }}>Real-time location of all active crew members on duty.</p>
              </div>
              <div style={{ height: 350, width: "100%", borderRadius: 12, overflow: "hidden", border: "1px solid var(--border)", position: "relative" }}>
                <iframe
                  title="Consolidated Map"
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
                        
                        .live-pulse {
                          background: #06b6d4;
                          border: 2px solid #ffffff;
                          border-radius: 50%;
                          box-shadow: 0 0 0 0 rgba(6, 182, 212, 0.7);
                          animation: pulse-glow 1.5s infinite;
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
                        const map = L.map('map').setView([9.9312, 76.2673], 10);
                        
                        L.tileLayer('https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png', {
                          maxZoom: 20
                        }).addTo(map);

                        const activeWorkers = ${JSON.stringify(
                          radarWorkers
                            .filter(w => w.status === "active")
                            .map(w => ({
                              fullName: w.fullName,
                              role: w.role,
                              latitude: w.latitude,
                              longitude: w.longitude
                            }))
                        )};

                        const bounds = [];
                        
                        activeWorkers.forEach(w => {
                          const pulseIcon = L.divIcon({
                            className: 'live-pulse',
                            iconSize: [12, 12],
                            iconAnchor: [6, 6]
                          });
                          
                          const marker = L.marker([w.latitude, w.longitude], { icon: pulseIcon }).addTo(map);
                          marker.bindPopup("<b>" + w.fullName + "</b><br/>" + w.role.toUpperCase());
                          marker.bindTooltip("<b>" + w.fullName + "</b>", { permanent: true, direction: "top", className: "worker-tooltip" });
                          bounds.push([w.latitude, w.longitude]);
                        });

                        if (bounds.length > 0) {
                          map.fitBounds(bounds, { padding: [40, 40] });
                        }
                      </script>
                    </body>
                    </html>
                  `}
                />
              </div>
            </div>

          </div>
        </div>
      )}

      {/* VIEW 4: MONTHLY DATABASE ATTENDANCE LEDGER */}
      {activeView === "attendance" && (
        <div className="fade-in" style={{ paddingBottom: 60 }}>
          {/* Header */}
          <div style={{ padding: "20px 16px 14px", paddingTop: "calc(env(safe-area-inset-top, 0px) + 16px)", borderBottom: "1px solid var(--border)", background: "rgba(255,255,255,0.85)", backdropFilter: "blur(10px)", position: "sticky", top: 0, zIndex: 10 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
              <button 
                onClick={() => { setActiveView("hub"); setSelectedAttendanceWorker(null); setAttendanceRecords([]); }}
                className="back-btn"
                style={{ width: 38, height: 38, borderRadius: 10, border: "1px solid var(--border)", background: "var(--surface)", display: "flex", alignItems: "center", justifyContent: "center", color: "var(--text)", cursor: "pointer" }}
              >
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="19" y1="12" x2="5" y2="12"/><polyline points="12 19 5 12 12 5"/></svg>
              </button>
              <div>
                <p style={{ fontSize: 10, fontWeight: 800, color: "#a78bfa", letterSpacing: "0.1em", textTransform: "uppercase", margin: 0 }}>On-Site Registry Ledger</p>
                <h1 style={{ fontSize: 20, fontWeight: 800, color: "var(--text)", margin: "2px 0 0", letterSpacing: "-0.5px" }}>Team Attendance Logs</h1>
              </div>
            </div>
          </div>

          <div style={{ padding: "16px", display: "grid", gridTemplateColumns: "1fr", gap: 16 }}>
            {/* Roster Selection Panel */}
            <div className="glass" style={{ padding: 20, border: "1px solid var(--border)", borderRadius: 20 }}>
              <h2 style={{ fontSize: 14, fontWeight: 800, textTransform: "uppercase", letterSpacing: "0.08em", color: "var(--dim)", margin: "0 0 14px" }}>Team Members</h2>
              
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
                          background: isSelected ? "rgba(124, 58, 237, 0.08)" : "var(--surface)",
                          border: isSelected ? "1px solid rgba(124, 58, 237, 0.3)" : "1px solid var(--border)",
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
                            background: "linear-gradient(135deg, #f8fafc, #e2e8f0)",
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                            fontSize: 12,
                            fontWeight: 800,
                            color: "var(--text)",
                            border: "1px solid var(--border)",
                            textTransform: "uppercase"
                          }}>
                            {u.full_name.charAt(0)}
                          </div>
                          <div style={{ minWidth: 0 }}>
                            <p style={{ fontSize: 13, fontWeight: 750, color: isSelected ? "var(--violet)" : "var(--text)", margin: 0 }}>{u.full_name}</p>
                            <span style={{ fontSize: 9, color: "var(--dim)", fontFamily: "monospace" }}>{u.login_id}</span>
                          </div>
                        </div>
                        <span style={{ fontSize: 9, fontWeight: 800, color: "var(--text)", textTransform: "uppercase", background: `${roleColor(u.role)}12`, padding: "2px 6px", borderRadius: 4 }}>{u.role}</span>
                      </div>
                    );
                  })}
              </div>
            </div>

            {/* Attendance Logs Details Table */}
            <div className="glass" style={{ padding: 20, border: "1px solid var(--border)", borderRadius: 20 }}>
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
                        <h3 style={{ fontSize: 16, fontWeight: 900, color: "var(--text)", margin: 0 }}>{selectedAttendanceWorker.full_name}</h3>
                        <p style={{ fontSize: 11, color: "var(--dim)", margin: "2px 0 0" }}>Monthly Duty summary (100% Real Database logs)</p>
                      </div>
                      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                        <button
                          onClick={() => {
                            if (!selectedAttendanceWorker || !attendanceRecords.length) return;
                            const headers = ["Date", "Status", "Clock In Time"];
                            const rows = [...attendanceRecords].sort((a,b) => new Date(a.checkInAt).getTime() - new Date(b.checkInAt).getTime()).map(rec => {
                              const d = new Date(rec.checkInAt);
                              const dateStr = d.toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" });
                              const statusStr = rec.status === "checked_out" ? "Checked Out" : "Checked In";
                              const timeStr = d.toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit", second: "2-digit" });
                              return [dateStr, statusStr, timeStr].map(val => `"${val.replace(/"/g, '""')}"`).join(",");
                            });
                            const csvContent = [headers.join(","), ...rows].join("\n");
                            const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
                            const url = URL.createObjectURL(blob);
                            const link = document.createElement("a");
                            link.setAttribute("href", url);
                            link.setAttribute("download", `${selectedAttendanceWorker.full_name.replace(/\s+/g, "_")}_attendance.csv`);
                            document.body.appendChild(link);
                            link.click();
                            document.body.removeChild(link);
                          }}
                          style={{
                            fontSize: 10,
                            fontWeight: 800,
                            color: "white",
                            background: "linear-gradient(135deg, #7c3aed, #06b6d4)",
                            border: "none",
                            borderRadius: 6,
                            padding: "4px 10px",
                            cursor: "pointer",
                            display: "flex",
                            alignItems: "center",
                            gap: 4,
                            fontFamily: "Outfit, sans-serif"
                          }}
                        >
                          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
                          Download CSV
                        </button>
                        <span style={{ fontSize: 10, fontWeight: 700, color: "#a78bfa", background: "rgba(167,139,250,0.1)", border: "1px solid rgba(124, 58, 237, 0.2)", borderRadius: 6, padding: "3px 8px" }}>
                          {attendanceRecords.length} Raw Logs
                        </span>
                      </div>
                    </div>

                    {loadingAttendance ? (
                      <div style={{ textAlign: "center", padding: "40px 0", color: "var(--dim)" }}>
                        <div className="spinner" style={{ margin: "0 auto 12px", borderColor: "#a78bfa", borderTopColor: "transparent" }} />
                        Retrieving Database Ledger...
                      </div>
                    ) : processedLogs.length === 0 ? (
                      <div style={{ background: "var(--surface)", border: "1px solid var(--border)", borderRadius: 16, padding: "32px 20px", textAlign: "center" }}>
                        <span style={{ fontSize: 24, display: "block", marginBottom: 8 }}>📅</span>
                        <p style={{ fontSize: 13, color: "var(--dim)", margin: 0 }}>No active check-in history found in the database for this user in the current month.</p>
                      </div>
                    ) : (
                      <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
                        {/* Premium Stats Grid */}
                        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 10 }}>
                          <div className="glass" style={{ padding: "12px 14px", border: "1px solid var(--border)", borderRadius: 12, background: "var(--surface)" }}>
                            <span style={{ fontSize: 8, color: "var(--dim)", textTransform: "uppercase", fontWeight: 700 }}>Days Present</span>
                            <p style={{ margin: "2px 0 0", fontSize: 20, fontWeight: 900, color: "var(--muted)" }}>{totalDays} <span style={{ fontSize: 10, fontWeight: 650, color: "var(--dim)" }}>Days</span></p>
                          </div>
                          <div className="glass" style={{ padding: "12px 14px", border: "1px solid var(--border)", borderRadius: 12, background: "var(--surface)" }}>
                            <span style={{ fontSize: 8, color: "var(--dim)", textTransform: "uppercase", fontWeight: 700 }}>On-Site Rating</span>
                            <p style={{ margin: "2px 0 0", fontSize: 20, fontWeight: 900, color: onSiteRate >= 80 ? "#4ade80" : "#fbbf24" }}>{onSiteRate}%</p>
                          </div>
                          <div className="glass" style={{ padding: "12px 14px", border: "1px solid var(--border)", borderRadius: 12, background: "var(--surface)" }}>
                            <span style={{ fontSize: 8, color: "var(--dim)", textTransform: "uppercase", fontWeight: 700 }}>Total Shifts</span>
                            <p style={{ margin: "2px 0 0", fontSize: 20, fontWeight: 900, color: "#a78bfa" }}>
                              {processedLogs.length} <span style={{ fontSize: 10, fontWeight: 650, color: "var(--dim)" }}>Runs</span>
                            </p>
                          </div>
                        </div>

                        {/* Highly Organized Table Layout */}
                        <div style={{ overflowX: "auto" }}>
                          <table style={{ width: "100%", borderCollapse: "collapse", textAlign: "left", fontSize: 12 }}>
                            <thead>
                              <tr style={{ borderBottom: "1px solid var(--border)", color: "var(--dim)", textTransform: "uppercase", fontSize: 10, fontWeight: 800 }}>
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
                                  <tr key={index} style={{ borderBottom: "1px solid var(--border)", color: "var(--muted)" }}>
                                    <td style={{ padding: "12px 8px", fontWeight: 700 }}>{log.dateStr}</td>
                                    <td style={{ padding: "12px 8px", fontFamily: "monospace", color: "#15803d" }}>{log.signInTime}</td>
                                    <td style={{ padding: "12px 8px", fontFamily: "monospace", color: log.signOutTime !== "--" ? "#f87171" : "#64748b" }}>{log.signOutTime}</td>
                                    <td style={{ padding: "12px 8px", fontFamily: "monospace", color: "#d97706", fontWeight: 700 }}>{durationStr}</td>
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
                <div style={{ textAlign: "center", color: "var(--dim)", padding: "20px 0" }}>
                  <p style={{ fontSize: 13, margin: 0 }}>Select a crew member from the directory above to display their monthly database check-in history records.</p>
                </div>
              )}
            </div>
          </div>

          <div style={{ padding: "0 16px 20px" }}>
            <div className="glass" style={{ padding: 20, border: "1px solid var(--border)", borderRadius: 20, display: "flex", flexDirection: "column", alignItems: "center", gap: 12, textAlign: "center", background: "linear-gradient(135deg, rgba(124,58,237,0.02) 0%, rgba(6,182,212,0.02) 100%)" }}>
              <h3 style={{ fontSize: 14, fontWeight: 800, color: "var(--text)", margin: 0 }}>Total Work Crew Attendance Page</h3>
              <p style={{ fontSize: 12, color: "var(--dim)", margin: 0, maxWidth: 400 }}>
                Generate and export the consolidated attendance records for all active supervisors and finance crew members registered in the database.
              </p>
              <button
                onClick={async () => {
                  try {
                    const res = await fetch("/api/mobile/attendance");
                    const data = await res.json();
                    if (!res.ok || !data.ok || !data.records) {
                      alert("Failed to fetch crew attendance records.");
                      return;
                    }
                    const records = data.records;
                    const headers = ["User Name", "Login ID", "Role", "Date", "Status", "Clock In Time", "Project Name", "Geofence Status", "Drift (m)"];
                    const rows = [...records].sort((a,b) => new Date(a.checkInAt).getTime() - new Date(b.checkInAt).getTime()).map(rec => {
                      const d = new Date(rec.checkInAt);
                      const dateStr = d.toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" });
                      const statusStr = rec.status === "checked_out" ? "Checked Out" : "Checked In";
                      const timeStr = d.toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit", second: "2-digit" });
                      const geofenceStr = rec.withinGeofence ? "On-Site" : "Off-Site";
                      return [
                        rec.userName || "",
                        rec.userLoginId || "",
                        rec.userRole || "",
                        dateStr,
                        statusStr,
                        timeStr,
                        rec.projectName || "",
                        geofenceStr,
                        `${rec.distanceFromSiteM}m`
                      ].map(val => `"${String(val).replace(/"/g, '""')}"`).join(",");
                    });
                    const csvContent = [headers.join(","), ...rows].join("\n");
                    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
                    const url = URL.createObjectURL(blob);
                    const link = document.createElement("a");
                    link.setAttribute("href", url);
                    link.setAttribute("download", `telgo_master_crew_attendance.csv`);
                    document.body.appendChild(link);
                    link.click();
                    document.body.removeChild(link);
                  } catch (err) {
                    alert("Error exporting consolidated attendance data.");
                  }
                }}
                style={{
                  minHeight: 40,
                  padding: "0 24px",
                  background: "linear-gradient(135deg, #7c3aed 0%, #06b6d4 100%)",
                  border: "none",
                  borderRadius: 10,
                  color: "white",
                  fontSize: 13,
                  fontWeight: 800,
                  cursor: "pointer",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: 8,
                  boxShadow: "0 4px 12px rgba(124, 58, 237, 0.15)",
                  fontFamily: "Outfit, sans-serif"
                }}
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
                Download Consolidated CSV
              </button>
            </div>
          </div>
        </div>
      )}

      {/* VIEW 5: PROJECTS DIRECTORY MODULE */}
      {activeView === "projects" && (
        <div className="fade-in" style={{ paddingBottom: 60 }}>
          {/* Header */}
          <div style={{ padding: "20px 16px 14px", paddingTop: "calc(env(safe-area-inset-top, 0px) + 16px)", borderBottom: "1px solid var(--border)", background: "rgba(255,255,255,0.85)", backdropFilter: "blur(10px)", position: "sticky", top: 0, zIndex: 10 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
              <button 
                onClick={() => { setActiveView("hub"); setSelectedProjectItem(null); }}
                className="back-btn"
                style={{ width: 38, height: 38, borderRadius: 10, border: "1px solid var(--border)", background: "var(--surface)", display: "flex", alignItems: "center", justifyContent: "center", color: "var(--text)", cursor: "pointer" }}
              >
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="19" y1="12" x2="5" y2="12"/><polyline points="12 19 5 12 12 5"/></svg>
              </button>
              <div style={{ flex: 1 }}>
                <p style={{ fontSize: 10, fontWeight: 800, color: "#a78bfa", letterSpacing: "0.1em", textTransform: "uppercase", margin: 0 }}>Telgo Power Corridors</p>
                <h1 style={{ fontSize: 20, fontWeight: 800, color: "var(--text)", margin: "2px 0 0", letterSpacing: "-0.5px" }}>Available Projects</h1>
              </div>
              <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                <button
                  onClick={() => {
                    const newId = "PRJ-" + Math.floor(1000 + Math.random() * 9000);
                    const blankProject = {
                      id: newId,
                      name: "New Power Grid Corridor",
                      code: "PRJ-" + Math.floor(100 + Math.random() * 900),
                      location: "Ernakulam, Kerala",
                      district: "Ernakulam",
                      distance: "0.00 km",
                      description: "Enter a brief description of the new corridor shift project.",
                      startLabel: "Start Junction",
                      startCoords: [10.0055, 76.3082] as [number, number],
                      endLabel: "End Junction",
                      endCoords: [10.0261, 76.3084] as [number, number],
                      hddPoints: [] as [number, number][],
                      terminationPoints: [] as [number, number][],
                      trenchingLine: [] as [number, number][],
                      utilityPath: [] as [number, number][]
                    };
                    setEditingProjectItem(blankProject);
                  }}
                  style={{
                    background: "rgba(6, 182, 212, 0.12)",
                    border: "1px solid rgba(14, 165, 233, 0.3)",
                    borderRadius: 10,
                    padding: "6px 12px",
                    fontSize: 11,
                    fontWeight: 750,
                    color: "#0284c7",
                    cursor: "pointer",
                    fontFamily: "Outfit, sans-serif"
                  }}
                >
                  ➕ Add Project
                </button>
                <button
                  onClick={resetToDefaults}
                  style={{
                    background: "rgba(220, 38, 38, 0.08)",
                    border: "1px solid rgba(239, 68, 68, 0.2)",
                    borderRadius: 10,
                    padding: "6px 12px",
                    fontSize: 11,
                    fontWeight: 700,
                    color: "#dc2626",
                    cursor: "pointer",
                    fontFamily: "Outfit, sans-serif"
                  }}
                >
                  🔄 Reset
                </button>
              </div>
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
                      background: isSelected ? "rgba(124, 58, 237, 0.08)" : "var(--surface)",
                      border: isSelected ? "1px solid rgba(124, 58, 237, 0.3)" : "1px solid var(--border)",
                      cursor: "pointer",
                      display: "flex",
                      flexDirection: "column",
                      gap: 6,
                      transition: "all 0.2s ease"
                    }}
                  >
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 10 }}>
                      <h3 style={{ fontSize: 14, fontWeight: 800, color: isSelected ? "var(--violet)" : "var(--text)", margin: 0 }}>{p.name}</h3>
                      <span style={{ fontSize: 10, fontWeight: 800, color: "#0284c7", background: "rgba(6, 182, 212, 0.12)", border: "1px solid rgba(14, 165, 233, 0.2)", borderRadius: 6, padding: "2px 6px", textTransform: "uppercase", fontFamily: "monospace", flexShrink: 0 }}>
                        {p.code}
                      </span>
                    </div>
                    <div style={{ display: "flex", justifyContent: "space-between", fontSize: 11, color: "var(--dim)" }}>
                      <span>📍 District: <b>{p.district}</b></span>
                      <span>📏 Est: <b>{p.distance}</b></span>
                    </div>
                  </div>
                );
              })}

              {/* Add New Project Prominent Dashed Card */}
              <div
                onClick={() => {
                  const newId = "PRJ-" + Math.floor(1000 + Math.random() * 9000);
                  const blankProject = {
                    id: newId,
                    name: "New Power Grid Corridor",
                    code: "PRJ-" + Math.floor(100 + Math.random() * 900),
                    location: "Ernakulam, Kerala",
                    district: "Ernakulam",
                    distance: "0.00 km",
                    description: "Enter a brief description of the new corridor shift project.",
                    startLabel: "Start Junction",
                    startCoords: [10.0055, 76.3082] as [number, number],
                    endLabel: "End Junction",
                    endCoords: [10.0261, 76.3084] as [number, number],
                    hddPoints: [] as [number, number][],
                    terminationPoints: [] as [number, number][],
                    trenchingLine: [] as [number, number][],
                    utilityPath: [] as [number, number][]
                  };
                  setEditingProjectItem(blankProject);
                }}
                className="glass module-card"
                style={{
                  padding: "16px",
                  borderRadius: 16,
                  background: "rgba(14, 165, 233, 0.08)",
                  border: "1px dashed rgba(6, 182, 212, 0.4)",
                  cursor: "pointer",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: 10,
                  transition: "all 0.2s ease",
                  minHeight: 60,
                  marginTop: 4
                }}
              >
                <span style={{ fontSize: 18, color: "#0284c7" }}>➕</span>
                <span style={{ fontSize: 13, fontWeight: 800, color: "#0284c7", letterSpacing: "0.05em", textTransform: "uppercase" }}>Add New Corridor Project</span>
              </div>
            </div>

            {/* Selected Project Detailed Corridor View & Map */}
            {selectedProjectItem && (
              <div className="glass fade-in" style={{ padding: 20, border: "1px solid var(--border)", borderRadius: 24, background: "var(--surface)" }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 12, marginBottom: 16 }}>
                  <div>
                    <h2 style={{ fontSize: 16, fontWeight: 900, color: "var(--text)", margin: 0 }}>{selectedProjectItem.name}</h2>
                    <p style={{ fontSize: 12, color: "var(--dim)", margin: "4px 0 0" }}>{selectedProjectItem.description}</p>
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
                <div className="glass" style={{ padding: 0, border: "1px solid var(--border)", borderRadius: 20, overflow: "hidden", background: "var(--bg)", marginBottom: 20 }}>
                  <div style={{ position: "relative", height: 260, width: "100%" }}>
                    <iframe
                      key={`${selectedProjectItem.id}-${selectedProjectItem.startCoords.join(",")}-${selectedProjectItem.endCoords.join(",")}-${(selectedProjectItem.utilityPath || []).length}`}
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
                            
                            const streetMap = L.tileLayer('https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png', {
                              maxZoom: 20
                            });
                            const satelliteMap = L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}', {
                              maxZoom: 19
                            });
                            streetMap.addTo(map);
                            const baseMaps = {
                              "Street View": streetMap,
                              "Satellite View": satelliteMap
                            };
                            L.control.layers(baseMaps, null, { position: 'bottomleft' }).addTo(map);

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

                            // Plot segments
                            const roadSegs = ${JSON.stringify(selectedProjectItem.roadChangeSegments ?? [])};
                            if (roadSegs && roadSegs.length > 0) {
                              roadSegs.forEach((seg, idx) => {
                                L.polyline(seg, { color: '#8b5cf6', weight: 4.5, opacity: 0.95, lineJoin: 'round' }).addTo(map).bindPopup('<b>Road Change Segment ' + (idx + 1) + '</b>');
                              });
                            }

                            const hddSegs = ${JSON.stringify(selectedProjectItem.hddSegments ?? [])};
                            if (hddSegs && hddSegs.length > 0) {
                              hddSegs.forEach((seg, idx) => {
                                L.polyline(seg, { color: '#d97706', weight: 4.5, opacity: 0.95, dashArray: '5, 5', lineJoin: 'round' }).addTo(map).bindPopup('<b>HDD Crossing Segment ' + (idx + 1) + '</b>');
                              });
                            }

                            const trenchSegs = ${JSON.stringify(selectedProjectItem.trenchingSegments ?? [])};
                            if (trenchSegs && trenchSegs.length > 0) {
                              trenchSegs.forEach((seg, idx) => {
                                L.polyline(seg, { color: '#f97316', weight: 4.5, opacity: 0.95, lineJoin: 'round' }).addTo(map).bindPopup('<b>Trench Planning Segment ' + (idx + 1) + '</b>');
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
                            if (roadSegs && roadSegs.length > 0) roadSegs.forEach(seg => seg.forEach(pt => bounds.push(pt)));
                            if (hddSegs && hddSegs.length > 0) hddSegs.forEach(seg => seg.forEach(pt => bounds.push(pt)));
                            if (trenchSegs && trenchSegs.length > 0) trenchSegs.forEach(seg => seg.forEach(pt => bounds.push(pt)));

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
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, background: "var(--surface)", border: "1px solid var(--border)", padding: 16, borderRadius: 16 }}>
                  <div>
                    <span style={{ fontSize: 9, fontWeight: 700, color: "var(--dim)", textTransform: "uppercase" }}>Start Position</span>
                    <p style={{ margin: "2px 0 0", fontSize: 13, fontWeight: 750, color: "#15803d" }}>{selectedProjectItem.startLabel}</p>
                    <span style={{ fontSize: 10, fontFamily: "monospace", color: "var(--dim)" }}>{selectedProjectItem.startCoords[0]}° N, {selectedProjectItem.startCoords[1]}° E</span>
                  </div>
                  <div>
                    <span style={{ fontSize: 9, fontWeight: 700, color: "var(--dim)", textTransform: "uppercase" }}>End Position</span>
                    <p style={{ margin: "2px 0 0", fontSize: 13, fontWeight: 750, color: "#dc2626" }}>{selectedProjectItem.endLabel}</p>
                    <span style={{ fontSize: 10, fontFamily: "monospace", color: "var(--dim)" }}>{selectedProjectItem.endCoords[0]}° N, {selectedProjectItem.endCoords[1]}° E</span>
                  </div>
                </div>

                {/* Site Storage / Raw Materials present in site */}
                <div style={{ marginTop: 20, border: "1px solid var(--border)", borderRadius: 16, padding: 16, background: "var(--surface)" }}>
                  <h3 style={{ fontSize: 13, fontWeight: 800, color: "var(--text)", marginBottom: 12, textTransform: "uppercase", letterSpacing: "0.05em" }}>
                    📦 Site Storage & Raw Materials
                  </h3>
                  <div style={{ display: "flex", flexDirection: "column", gap: 10, maxHeight: 200, overflowY: "auto", paddingRight: 4 }}>
                    {(!selectedProjectItem.storageMaterials || selectedProjectItem.storageMaterials.length === 0) ? (
                      <span style={{ fontSize: 12, color: "var(--dim)", textAlign: "center", display: "block", padding: "10px 0" }}>
                        No raw materials logged for this corridor yet.
                      </span>
                    ) : (
                      selectedProjectItem.storageMaterials.map((m: any) => (
                        <div key={m.id} className="glass" style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "10px 12px", border: "1px solid var(--border)", borderRadius: 10, background: "rgba(255, 255, 255, 0.4)" }}>
                          <div style={{ flex: 1 }}>
                            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                              <strong style={{ fontSize: 12, color: "var(--text)" }}>{m.materialName}</strong>
                              <span style={{ fontSize: 10, color: "var(--dim)", fontFamily: "monospace" }}>({m.date})</span>
                            </div>
                            <p style={{ margin: "2px 0 0", fontSize: 11, color: "var(--muted)" }}>
                              Qty: {m.quantityMeters} | Loc: {m.location}
                            </p>
                            {m.notes && (
                              <p style={{ margin: "4px 0 0", fontSize: 11, color: "var(--dim)", fontStyle: "italic" }}>
                                "{m.notes}"
                              </p>
                            )}
                          </div>
                          {m.photoUrl && (
                            <img 
                              src={m.photoUrl} 
                              alt="Material Thumbnail" 
                              style={{ width: 40, height: 40, borderRadius: 8, objectFit: "cover", border: "1px solid var(--border)", marginLeft: 8 }} 
                            />
                          )}
                        </div>
                      ))
                    )}
                  </div>
                </div>

                {/* PROJECT SUB-MAPS: CABLE LAYING, HDD DRILLING, OPEN TRENCH */}
                <div style={{ marginTop: 20, display: "flex", flexDirection: "column", gap: 16, borderTop: "1px solid var(--border)", paddingTop: 16 }}>
                  <h3 style={{ fontSize: 13, fontWeight: 900, color: "var(--text)", textTransform: "uppercase", letterSpacing: "0.08em", margin: "0 0 4px" }}>
                    Project Progress Maps
                  </h3>
                  
                  {/* 1. Cable Laying Map */}
                  <div className="glass glow-cyan" style={{ border: "1px solid var(--border)", borderRadius: 16, padding: 16, background: "var(--surface)", display: "flex", flexDirection: "column", gap: 10 }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                      <span style={{ fontSize: 12, fontWeight: 800, color: "var(--cyan)", textTransform: "uppercase" }}>🔌 Cable Laying Map</span>
                      <button
                        onClick={() => {
                          setEditingProjectItem(selectedProjectItem);
                          setGisEditLayer("cable");
                        }}
                        style={{
                          background: "rgba(6, 182, 212, 0.12)",
                          border: "1px solid rgba(6, 182, 212, 0.3)",
                          borderRadius: 8,
                          padding: "4px 10px",
                          fontSize: 10,
                          fontWeight: 750,
                          color: "#c4b5fd",
                          cursor: "pointer",
                          fontFamily: "Outfit, sans-serif"
                        }}
                      >
                        ✏️ Edit Map
                      </button>
                    </div>
                    {selectedProjectItem.cableLayingCoords?.startCoords ? (
                      <>
                        <div style={{ height: 200, width: "100%", borderRadius: 12, overflow: "hidden", border: "1px solid var(--border)" }}>
                          <iframe
                            title="Cable Laying Progress Map"
                            style={{ width: "100%", height: "100%", border: "none" }}
                            srcDoc={`
                              <!DOCTYPE html>
                              <html>
                              <head>
                                <link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css" />
                                <script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"></script>
                                <style>
                                  html, body, #map { margin: 0; padding: 0; width: 100%; height: 100%; }
                                </style>
                              </head>
                              <body>
                                <div id="map"></div>
                                <script>
                                  const start = [${selectedProjectItem.cableLayingCoords.startCoords[0]}, ${selectedProjectItem.cableLayingCoords.startCoords[1]}];
                                  const end = [${selectedProjectItem.cableLayingCoords.endCoords[0]}, ${selectedProjectItem.cableLayingCoords.endCoords[1]}];
                                  const middles = ${JSON.stringify(selectedProjectItem.cableLayingCoords.middlePoints || [])};
                                  const path = [start, ...middles, end];

                                  const map = L.map('map', { zoomControl: false }).setView(start, 15);
                                  L.tileLayer('https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png', { maxZoom: 19 }).addTo(map);

                                  L.polyline(path, { color: '#06b6d4', weight: 5, opacity: 0.95 }).addTo(map);
                                  L.circleMarker(start, { color: '#16a34a', radius: 6, fillOpacity: 1 }).addTo(map);
                                  L.circleMarker(end, { color: '#dc2626', radius: 6, fillOpacity: 1 }).addTo(map);
                                  
                                  middles.forEach(pt => L.circleMarker(pt, { color: '#a855f7', radius: 5 }).addTo(map));

                                  map.fitBounds(path, { padding: [20, 20] });
                                </script>
                              </body>
                              </html>
                            `}
                          />
                        </div>
                        <p style={{ margin: 0, fontSize: 11, color: "var(--muted)" }}><b>Progress Logged:</b> {selectedProjectItem.cableLayingCoords.description || "No description logged."}</p>
                      </>
                    ) : (
                      <span style={{ fontSize: 11, color: "var(--dim)", fontStyle: "italic" }}>No progress coordinates marked for Cable Laying Map.</span>
                    )}
                  </div>

                  {/* 2. HDD Drilling Map */}
                  <div className="glass glow-cyan" style={{ border: "1px solid var(--border)", borderRadius: 16, padding: 16, background: "var(--surface)", display: "flex", flexDirection: "column", gap: 10 }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                      <span style={{ fontSize: 12, fontWeight: 800, color: "var(--cyan)", textTransform: "uppercase" }}>🕳️ HDD Drilling Map</span>
                      <button
                        onClick={() => {
                          setEditingProjectItem(selectedProjectItem);
                          setGisEditLayer("hdd");
                        }}
                        style={{
                          background: "rgba(16, 185, 129, 0.12)",
                          border: "1px solid rgba(16, 185, 129, 0.3)",
                          borderRadius: 8,
                          padding: "4px 10px",
                          fontSize: 10,
                          fontWeight: 750,
                          color: "#c4b5fd",
                          cursor: "pointer",
                          fontFamily: "Outfit, sans-serif"
                        }}
                      >
                        ✏️ Edit Map
                      </button>
                    </div>
                    {selectedProjectItem.hddDrillingCoords?.startCoords ? (
                      <>
                        <div style={{ height: 200, width: "100%", borderRadius: 12, overflow: "hidden", border: "1px solid var(--border)" }}>
                          <iframe
                            title="HDD Drilling Progress Map"
                            style={{ width: "100%", height: "100%", border: "none" }}
                            srcDoc={`
                              <!DOCTYPE html>
                              <html>
                              <head>
                                <link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css" />
                                <script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"></script>
                                <style>
                                  html, body, #map { margin: 0; padding: 0; width: 100%; height: 100%; }
                                </style>
                              </head>
                              <body>
                                <div id="map"></div>
                                <script>
                                  const start = [${selectedProjectItem.hddDrillingCoords.startCoords[0]}, ${selectedProjectItem.hddDrillingCoords.startCoords[1]}];
                                  const end = [${selectedProjectItem.hddDrillingCoords.endCoords[0]}, ${selectedProjectItem.hddDrillingCoords.endCoords[1]}];
                                  const middles = ${JSON.stringify(selectedProjectItem.hddDrillingCoords.middlePoints || [])};
                                  const path = [start, ...middles, end];

                                  const map = L.map('map', { zoomControl: false }).setView(start, 15);
                                  L.tileLayer('https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png', { maxZoom: 19 }).addTo(map);

                                  L.polyline(path, { color: '#eab308', weight: 5, opacity: 0.95, dashArray: '5, 5' }).addTo(map);
                                  L.circleMarker(start, { color: '#16a34a', radius: 6, fillOpacity: 1 }).addTo(map);
                                  L.circleMarker(end, { color: '#dc2626', radius: 6, fillOpacity: 1 }).addTo(map);
                                  
                                  middles.forEach(pt => L.circleMarker(pt, { color: '#a855f7', radius: 5 }).addTo(map));

                                  map.fitBounds(path, { padding: [20, 20] });
                                </script>
                              </body>
                              </html>
                            `}
                          />
                        </div>
                        <p style={{ margin: 0, fontSize: 11, color: "var(--muted)" }}><b>Progress Logged:</b> {selectedProjectItem.hddDrillingCoords.description || "No description logged."}</p>
                      </>
                    ) : (
                      <span style={{ fontSize: 11, color: "var(--dim)", fontStyle: "italic" }}>No progress coordinates marked for HDD Drilling Map.</span>
                    )}
                  </div>

                  {/* 3. Open Trench Map */}
                  <div className="glass glow-cyan" style={{ border: "1px solid var(--border)", borderRadius: 16, padding: 16, background: "var(--surface)", display: "flex", flexDirection: "column", gap: 10 }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                      <span style={{ fontSize: 12, fontWeight: 800, color: "var(--cyan)", textTransform: "uppercase" }}>🚜 Open Trench Map</span>
                      <button
                        onClick={() => {
                          setEditingProjectItem(selectedProjectItem);
                          setGisEditLayer("trench");
                        }}
                        style={{
                          background: "rgba(249, 115, 22, 0.12)",
                          border: "1px solid rgba(249, 115, 22, 0.3)",
                          borderRadius: 8,
                          padding: "4px 10px",
                          fontSize: 10,
                          fontWeight: 750,
                          color: "#c4b5fd",
                          cursor: "pointer",
                          fontFamily: "Outfit, sans-serif"
                        }}
                      >
                        ✏️ Edit Map
                      </button>
                    </div>
                    {selectedProjectItem.openTrenchCoords?.startCoords ? (
                      <>
                        <div style={{ height: 200, width: "100%", borderRadius: 12, overflow: "hidden", border: "1px solid var(--border)" }}>
                          <iframe
                            title="Open Trench Progress Map"
                            style={{ width: "100%", height: "100%", border: "none" }}
                            srcDoc={`
                              <!DOCTYPE html>
                              <html>
                              <head>
                                <link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css" />
                                <script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"></script>
                                <style>
                                  html, body, #map { margin: 0; padding: 0; width: 100%; height: 100%; }
                                </style>
                              </head>
                              <body>
                                <div id="map"></div>
                                <script>
                                  const start = [${selectedProjectItem.openTrenchCoords.startCoords[0]}, ${selectedProjectItem.openTrenchCoords.startCoords[1]}];
                                  const end = [${selectedProjectItem.openTrenchCoords.endCoords[0]}, ${selectedProjectItem.openTrenchCoords.endCoords[1]}];
                                  const middles = ${JSON.stringify(selectedProjectItem.openTrenchCoords.middlePoints || [])};
                                  const path = [start, ...middles, end];

                                  const map = L.map('map', { zoomControl: false }).setView(start, 15);
                                  L.tileLayer('https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png', { maxZoom: 19 }).addTo(map);

                                  L.polyline(path, { color: '#f97316', weight: 5, opacity: 0.95 }).addTo(map);
                                  L.circleMarker(start, { color: '#16a34a', radius: 6, fillOpacity: 1 }).addTo(map);
                                  L.circleMarker(end, { color: '#dc2626', radius: 6, fillOpacity: 1 }).addTo(map);
                                  
                                  middles.forEach(pt => L.circleMarker(pt, { color: '#a855f7', radius: 5 }).addTo(map));

                                  map.fitBounds(path, { padding: [20, 20] });
                                </script>
                              </body>
                              </html>
                            `}
                          />
                        </div>
                        <p style={{ margin: 0, fontSize: 11, color: "var(--muted)" }}><b>Progress Logged:</b> {selectedProjectItem.openTrenchCoords.description || "No description logged."}</p>
                      </>
                    ) : (
                      <span style={{ fontSize: 11, color: "var(--dim)", fontStyle: "italic" }}>No progress coordinates marked for Open Trench Map.</span>
                    )}
                  </div>
                </div>

              </div>
            )}
          </div>
        </div>
      )}

      {/* VIEW 5.5: PROJECTS PROGRESS CONSOLE */}
      {activeView === "progress" && (
        <div className="fade-in" style={{ paddingBottom: 60 }}>
          {/* Header */}
          <div style={{ padding: "20px 16px 14px", paddingTop: "calc(env(safe-area-inset-top, 0px) + 16px)", borderBottom: "1px solid var(--border)", background: "rgba(255,255,255,0.85)", backdropFilter: "blur(10px)", position: "sticky", top: 0, zIndex: 10 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
              <button 
                onClick={() => { setActiveView("hub"); setSelectedProjectItem(null); }}
                className="back-btn"
                style={{ width: 38, height: 38, borderRadius: 10, border: "1px solid var(--border)", background: "var(--surface)", display: "flex", alignItems: "center", justifyContent: "center", color: "var(--text)", cursor: "pointer" }}
              >
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="19" y1="12" x2="5" y2="12"/><polyline points="12 19 5 12 12 5"/></svg>
              </button>
              <div style={{ flex: 1 }}>
                <p style={{ fontSize: 10, fontWeight: 800, color: "#10b981", letterSpacing: "0.1em", textTransform: "uppercase", margin: 0 }}>Telgo Operations</p>
                <h1 style={{ fontSize: 20, fontWeight: 800, color: "var(--text)", margin: "2px 0 0", letterSpacing: "-0.5px" }}>Projects Progress Report</h1>
              </div>
            </div>
          </div>

          <div style={{ padding: "16px", display: "flex", flexDirection: "column", gap: 16 }}>
            {/* Sidebar list of projects */}
            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              <span style={{ fontSize: 11, fontWeight: 800, color: "var(--dim)", textTransform: "uppercase", letterSpacing: "0.03em" }}>Corridor Projects</span>
              <div style={{ display: "grid", gridTemplateColumns: "1fr", gap: 8 }}>
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
                        background: isSelected ? "rgba(16, 185, 129, 0.08)" : "var(--surface)",
                        border: isSelected ? "1px solid rgba(16, 185, 129, 0.3)" : "1px solid var(--border)",
                        cursor: "pointer",
                        display: "flex",
                        justifyContent: "space-between",
                        alignItems: "center",
                        transition: "all 0.2s ease"
                      }}
                    >
                      <div>
                        <h3 style={{ fontSize: 14, fontWeight: 800, color: isSelected ? "#10b981" : "var(--text)", margin: 0 }}>{p.name}</h3>
                        <p style={{ fontSize: 11, color: "var(--dim)", margin: "2px 0 0" }}>📍 {p.district} • 📏 {p.distance}</p>
                      </div>
                      <span style={{ fontSize: 10, fontWeight: 800, color: "#10b981", background: "rgba(16, 185, 129, 0.1)", border: "1px solid rgba(16, 185, 129, 0.2)", borderRadius: 6, padding: "2px 6px", fontFamily: "monospace" }}>
                        {p.code}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Selected Project Console */}
            {selectedProjectItem ? (() => {
              const p = selectedProjectItem;
              
              // Sum completed progress
              const log = p.progressLog || [];
              const totalTrenchingDone = log.filter((e: any) => e.type === "trenching").reduce((acc: number, curr: any) => acc + curr.value, 0);
              const totalHddDone = log.filter((e: any) => e.type === "hdd").reduce((acc: number, curr: any) => acc + curr.value, 0);

              // Documents count
              const docs = p.permissions || {};
              const uploadedDocsCount = Object.keys(docs).length;

              return (
                <div className="glass fade-in" style={{ padding: 20, border: "1px solid var(--border)", borderRadius: 24, background: "var(--surface)", display: "flex", flexDirection: "column", gap: 20 }}>
                  {/* Project Info */}
                  <div>
                    <h2 style={{ fontSize: 18, fontWeight: 900, color: "var(--text)", margin: 0 }}>{p.name}</h2>
                    <p style={{ fontSize: 12, color: "var(--dim)", margin: "4px 0 0" }}>{p.description}</p>
                  </div>

                  {/* Visual Progress Status Gauges */}
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                    <div style={{ background: "var(--bg)", border: "1px solid var(--border)", borderRadius: 16, padding: 14 }}>
                      <span style={{ fontSize: 9, fontWeight: 700, color: "var(--dim)", textTransform: "uppercase" }}>Trenching completed</span>
                      <p style={{ margin: "2px 0 4px", fontSize: 20, fontWeight: 900, color: "#f97316" }}>{totalTrenchingDone} m</p>
                      <div style={{ width: "100%", height: 6, background: "var(--border)", borderRadius: 3, overflow: "hidden" }}>
                        <div style={{ width: `${Math.min(100, (totalTrenchingDone / 2000) * 100)}%`, height: "100%", background: "#f97316", borderRadius: 3 }} />
                      </div>
                      <span style={{ fontSize: 9, color: "var(--dim)", display: "block", marginTop: 4 }}>Dynamic target planning status</span>
                    </div>

                    <div style={{ background: "var(--bg)", border: "1px solid var(--border)", borderRadius: 16, padding: 14 }}>
                      <span style={{ fontSize: 9, fontWeight: 700, color: "var(--dim)", textTransform: "uppercase" }}>HDD crossing completed</span>
                      <p style={{ margin: "2px 0 4px", fontSize: 20, fontWeight: 900, color: "#d97706" }}>{totalHddDone} m</p>
                      <div style={{ width: "100%", height: 6, background: "var(--border)", borderRadius: 3, overflow: "hidden" }}>
                        <div style={{ width: `${Math.min(100, (totalHddDone / 500) * 100)}%`, height: "100%", background: "#d97706", borderRadius: 3 }} />
                      </div>
                      <span style={{ fontSize: 9, color: "var(--dim)", display: "block", marginTop: 4 }}>Planned horizontal directional drilling progress</span>
                    </div>
                  </div>

                  {/* Read-Only Map iframe displaying all active segments */}
                  <div className="glass" style={{ padding: 0, border: "1px solid var(--border)", borderRadius: 20, overflow: "hidden", background: "var(--bg)" }}>
                    <div style={{ position: "relative", height: 260, width: "100%" }}>
                      <iframe
                        key={`${p.id}-${p.startCoords.join(",")}-${p.endCoords.join(",")}-${(p.utilityPath || []).length}`} // forces reload on switching projects or saving edits
                        title="Project Corridor Progress Map"
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
                              const start = [${p.startCoords[0]}, ${p.startCoords[1]}];
                              const end = [${p.endCoords[0]}, ${p.endCoords[1]}];
                              const map = L.map('map').setView([(start[0] + end[0]) / 2, (start[1] + end[1]) / 2], 14);
                              
                              const streetMap = L.tileLayer('https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png', {
                                maxZoom: 20
                              });
                              const satelliteMap = L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}', {
                                maxZoom: 19
                              });
                              streetMap.addTo(map);
                              const baseMaps = {
                                "Street View": streetMap,
                                "Satellite View": satelliteMap
                              };
                              L.control.layers(baseMaps, null, { position: 'bottomleft' }).addTo(map);

                              // Primary Route (Purple utilityPath if present, else straight line)
                              const customUtility = ${JSON.stringify(p.utilityPath ?? [])};
                              if (customUtility && customUtility.length >= 2) {
                                L.polyline(customUtility, { color: '#a855f7', weight: 4, opacity: 0.95, lineJoin: 'round' }).addTo(map);
                              } else {
                                L.polyline([start, end], { color: '#a855f7', weight: 4, opacity: 0.8, lineJoin: 'round' }).addTo(map);
                              }

                              // Plot Grid Terminations
                              const termPts = ${JSON.stringify(p.terminationPoints ?? [])};
                              const termIcon = L.divIcon({ className: 'term-dot', iconSize: [10, 10] });
                              if (termPts && termPts.length > 0) {
                                termPts.forEach((pt, idx) => {
                                  L.marker(pt, { icon: termIcon }).addTo(map).bindPopup("<b>Grid Termination " + (idx + 1) + "</b>");
                                });
                              }

                              // Plot segments
                              const roadSegs = ${JSON.stringify(p.roadChangeSegments ?? [])};
                              if (roadSegs && roadSegs.length > 0) {
                                roadSegs.forEach((seg, idx) => {
                                  L.polyline(seg, { color: '#8b5cf6', weight: 4.5, opacity: 0.95, lineJoin: 'round' }).addTo(map).bindPopup('<b>Road Change Segment ' + (idx + 1) + '</b>');
                                });
                              }

                              const hddSegs = ${JSON.stringify(p.hddSegments ?? [])};
                              if (hddSegs && hddSegs.length > 0) {
                                hddSegs.forEach((seg, idx) => {
                                  L.polyline(seg, { color: '#d97706', weight: 4.5, opacity: 0.95, dashArray: '5, 5', lineJoin: 'round' }).addTo(map).bindPopup('<b>HDD Crossing Segment ' + (idx + 1) + '</b>');
                                });
                              }

                              const trenchSegs = ${JSON.stringify(p.trenchingSegments ?? [])};
                              if (trenchSegs && trenchSegs.length > 0) {
                                trenchSegs.forEach((seg, idx) => {
                                  L.polyline(seg, { color: '#f97316', weight: 4.5, opacity: 0.95, lineJoin: 'round' }).addTo(map).bindPopup('<b>Trench Planning Segment ' + (idx + 1) + '</b>');
                                });
                              }
                              
                              const startIcon = L.divIcon({ className: 'start-pulse', iconSize: [12, 12] });
                              L.marker(start, { icon: startIcon }).addTo(map).bindPopup('<b>Start:</b> ${p.startLabel}');
                              
                              const endIcon = L.divIcon({ className: 'end-pulse', iconSize: [12, 12] });
                              L.marker(end, { icon: endIcon }).addTo(map).bindPopup('<b>End:</b> ${p.endLabel}');
                              
                              // Auto zoom to all markers
                              const bounds = [start, end];
                              if (customUtility && customUtility.length > 0) customUtility.forEach(pt => bounds.push(pt));
                              if (termPts && termPts.length > 0) termPts.forEach(pt => bounds.push(pt));
                              if (roadSegs && roadSegs.length > 0) roadSegs.forEach(seg => seg.forEach(pt => bounds.push(pt)));
                              if (hddSegs && hddSegs.length > 0) hddSegs.forEach(seg => seg.forEach(pt => bounds.push(pt)));
                              if (trenchSegs && trenchSegs.length > 0) trenchSegs.forEach(seg => seg.forEach(pt => bounds.push(pt)));

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

                  {/* Tabs bar */}
                  <div style={{ display: "flex", borderBottom: "1px solid var(--border)", paddingBottom: 6 }}>
                    <button
                      onClick={() => setProgressActiveTab("log")}
                      style={{
                        flex: 1,
                        padding: "8px 12px",
                        background: "none",
                        border: "none",
                        fontSize: 13,
                        fontWeight: 800,
                        color: progressActiveTab === "log" ? "#10b981" : "var(--dim)",
                        borderBottom: progressActiveTab === "log" ? "2.5px solid #10b981" : "none",
                        cursor: "pointer",
                        fontFamily: "Outfit, sans-serif"
                      }}
                    >
                      📊 Daily Progress Log
                    </button>
                    <button
                      onClick={() => setProgressActiveTab("docs")}
                      style={{
                        flex: 1,
                        padding: "8px 12px",
                        background: "none",
                        border: "none",
                        fontSize: 13,
                        fontWeight: 800,
                        color: progressActiveTab === "docs" ? "#10b981" : "var(--dim)",
                        borderBottom: progressActiveTab === "docs" ? "2.5px solid #10b981" : "none",
                        cursor: "pointer",
                        fontFamily: "Outfit, sans-serif"
                      }}
                    >
                      📂 Permission Documents ({uploadedDocsCount}/5)
                    </button>
                  </div>

                  {/* TAB CONTENT: PROGRESS LOG */}
                  {progressActiveTab === "log" && (
                    <div className="fade-in" style={{ display: "flex", flexDirection: "column", gap: 16 }}>
                      {/* Add entry form */}
                      <form onSubmit={(e) => {
                        e.preventDefault();
                        const metersVal = parseFloat(progressMeters);
                        if (isNaN(metersVal) || metersVal <= 0) {
                          showToast("❌ Please enter a valid number of meters!");
                          return;
                        }
                        const newEntry = {
                          id: "PRG-" + Date.now(),
                          date: progressDate,
                          type: progressType,
                          value: metersVal,
                          notes: progressNote.trim()
                        };
                        const updated = {
                          ...p,
                          progressLog: [newEntry, ...(p.progressLog || [])]
                        };
                        const nextList = projectsList.map(pr => pr.id === p.id ? updated : pr);
                        syncProjectUpdate(updated, nextList);
                        
                        setProgressMeters("");
                        setProgressNote("");
                        showToast("📈 Daily progress entry logged!");
                      }} style={{ background: "var(--surface)", border: "1px solid var(--border)", padding: 16, borderRadius: 18, display: "flex", flexDirection: "column", gap: 12 }}>
                        <span style={{ fontSize: 11, fontWeight: 800, color: "var(--dim)", textTransform: "uppercase" }}>Add Progress Entry</span>
                        
                        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
                          <div>
                            <label style={{ display: "block", fontSize: 10, color: "var(--dim)", marginBottom: 4, fontWeight: 700 }}>Select Date</label>
                            <input
                              type="date"
                              value={progressDate}
                              onChange={(e) => setProgressDate(e.target.value)}
                              required
                              style={{ width: "100%", height: 38, background: "var(--bg)", border: "1px solid var(--border)", borderRadius: 10, padding: "0 10px", color: "var(--text)", fontSize: 12 }}
                            />
                          </div>
                          <div>
                            <label style={{ display: "block", fontSize: 10, color: "var(--dim)", marginBottom: 4, fontWeight: 700 }}>Select Metric</label>
                            <select
                              value={progressType}
                              onChange={(e) => setProgressType(e.target.value as any)}
                              style={{ width: "100%", height: 38, background: "var(--bg)", border: "1px solid var(--border)", borderRadius: 10, padding: "0 10px", color: "var(--text)", fontSize: 12, cursor: "pointer" }}
                            >
                              <option value="trenching">Trenching Completed (m)</option>
                              <option value="hdd">HDD Completed (m)</option>
                            </select>
                          </div>
                        </div>

                        <div style={{ display: "grid", gridTemplateColumns: "1fr", gap: 10 }}>
                          <div>
                            <label style={{ display: "block", fontSize: 10, color: "var(--dim)", marginBottom: 4, fontWeight: 700 }}>Distance in Meters</label>
                            <input
                              type="number"
                              placeholder="e.g. 150"
                              value={progressMeters}
                              onChange={(e) => setProgressMeters(e.target.value)}
                              required
                              style={{ width: "100%", height: 38, background: "var(--bg)", border: "1px solid var(--border)", borderRadius: 10, padding: "0 10px", color: "var(--text)", fontSize: 12 }}
                            />
                          </div>
                        </div>

                        <div>
                          <label style={{ display: "block", fontSize: 10, color: "var(--dim)", marginBottom: 4, fontWeight: 700 }}>Optional Notes</label>
                          <input
                            type="text"
                            placeholder="Shift details, crew names, ground conditions..."
                            value={progressNote}
                            onChange={(e) => setProgressNote(e.target.value)}
                            style={{ width: "100%", height: 38, background: "var(--bg)", border: "1px solid var(--border)", borderRadius: 10, padding: "0 12px", color: "var(--text)", fontSize: 12 }}
                          />
                        </div>

                        <button
                          type="submit"
                          style={{ width: "100%", height: 40, background: "linear-gradient(135deg, #10b981 0%, #059669 100%)", border: "none", borderRadius: 10, color: "white", fontSize: 12, fontWeight: 800, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: 6, boxShadow: "0 4px 10px rgba(16,185,129,0.2)" }}
                        >
                          ➕ Add Progress Entry
                        </button>
                      </form>

                      {/* Entries Log List */}
                      <div>
                        <span style={{ fontSize: 11, fontWeight: 800, color: "var(--dim)", textTransform: "uppercase", display: "block", marginBottom: 8 }}>Chronological Daily Log</span>
                        {log.length === 0 ? (
                          <div style={{ background: "var(--bg)", border: "1px dashed var(--border)", borderRadius: 16, padding: "24px 16px", textAlign: "center", color: "var(--dim)", fontSize: 12 }}>
                            No daily progress entries submitted yet. Submit using the form above.
                          </div>
                        ) : (
                          <div style={{ display: "flex", flexDirection: "column", gap: 8, maxHeight: "250px", overflowY: "auto", paddingRight: 4 }}>
                            {log.map((entry: any) => (
                              <div
                                key={entry.id}
                                style={{
                                  background: "var(--surface)",
                                  border: "1px solid var(--border)",
                                  borderRadius: 14,
                                  padding: "10px 14px",
                                  display: "flex",
                                  alignItems: "center",
                                  justifyContent: "space-between",
                                  gap: 12
                                }}
                              >
                                <div>
                                  <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                                    <span style={{
                                      fontSize: 9,
                                      fontWeight: 800,
                                      background: entry.type === "trenching" ? "rgba(249,115,22,0.1)" : "rgba(217,119,6,0.1)",
                                      color: entry.type === "trenching" ? "#f97316" : "#d97706",
                                      border: `1.5px solid ${entry.type === "trenching" ? "rgba(249,115,22,0.2)" : "rgba(217,119,6,0.2)"}`,
                                      padding: "1.5px 5px",
                                      borderRadius: 4,
                                      textTransform: "uppercase"
                                    }}>{entry.type}</span>
                                    <span style={{ fontSize: 13, fontWeight: 900, color: "var(--text)" }}>{entry.value} meters</span>
                                  </div>
                                  <div style={{ fontSize: 10, color: "var(--dim)", marginTop: 4 }}>
                                    📅 <b>{entry.date}</b> {entry.notes && `• 💬 ${entry.notes}`}
                                  </div>
                                </div>
                                <button
                                  type="button"
                                  onClick={() => {
                                    if (confirm("Are you sure you want to delete this progress entry?")) {
                                      const updatedLog = log.filter((e: any) => e.id !== entry.id);
                                      const updated = { ...p, progressLog: updatedLog };
                                      const nextList = projectsList.map(pr => pr.id === p.id ? updated : pr);
                                      syncProjectUpdate(updated, nextList);
                                      showToast("🗑️ Progress entry removed.");
                                    }
                                  }}
                                  style={{ background: "none", border: "none", color: "#f87171", cursor: "pointer", display: "flex", padding: 6 }}
                                >
                                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/><line x1="10" y1="11" x2="10" y2="17"/><line x1="14" y1="11" x2="14" y2="17"/></svg>
                                </button>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                  )}

                  {/* TAB CONTENT: DOCUMENTS UPLOAD */}
                  {progressActiveTab === "docs" && (
                    <div className="fade-in" style={{ display: "flex", flexDirection: "column", gap: 14 }}>
                      <span style={{ fontSize: 11, fontWeight: 800, color: "var(--dim)", textTransform: "uppercase" }}>Clearance Documents</span>
                      
                      {[
                        { key: "pwd", label: "PWD Permission", color: "#3b82f6", desc: "Public Works Department road excavation permit" },
                        { key: "kseb", label: "KSEB Permission", color: "#10b981", desc: "Kerala State Electricity Board utility permission" },
                        { key: "nh", label: "NH Authority Permission", color: "#f59e0b", desc: "National Highway authority bypass trenching NOC" },
                        { key: "police", label: "Police NOC", color: "#8b5cf6", desc: "Local Police highway traffic management clearance" },
                        { key: "municipal", label: "Municipal Clearance", color: "#ec4899", desc: "Municipal corporation local pathway utility NOC" }
                      ].map(doc => {
                        const fileInfo = docs[doc.key];
                        return (
                          <div
                            key={doc.key}
                            style={{
                              background: "var(--surface)",
                              border: "1px solid var(--border)",
                              borderRadius: 16,
                              padding: "14px 16px",
                              display: "flex",
                              flexDirection: "column",
                              gap: 10
                            }}
                          >
                            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 10 }}>
                              <div>
                                <h4 style={{ fontSize: 13, fontWeight: 800, color: "var(--text)", margin: 0 }}>{doc.label}</h4>
                                <p style={{ fontSize: 10, color: "var(--dim)", margin: "2px 0 0" }}>{doc.desc}</p>
                              </div>
                              {fileInfo ? (
                                <span style={{ fontSize: 9, fontWeight: 800, color: "#10b981", background: "rgba(16,185,129,0.1)", border: "1px solid rgba(16,185,129,0.2)", borderRadius: 6, padding: "2px 6px", textTransform: "uppercase" }}>
                                  ✅ ACTIVE
                                </span>
                              ) : (
                                <span style={{ fontSize: 9, fontWeight: 800, color: "var(--dim)", background: "var(--bg)", border: "1px solid var(--border)", borderRadius: 6, padding: "2px 6px", textTransform: "uppercase" }}>
                                  ⚠️ PENDING
                                </span>
                              )}
                            </div>

                            {fileInfo && (
                              <div style={{ background: "var(--bg)", border: "1px solid var(--border)", padding: "8px 12px", borderRadius: 10, fontSize: 11, color: "var(--muted)", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                                <span style={{ textOverflow: "ellipsis", overflow: "hidden", whiteSpace: "nowrap", maxWidth: "200px" }}>📄 <b>{fileInfo.name}</b></span>
                                <span style={{ fontSize: 9, color: "var(--dim)" }}>{new Date(fileInfo.uploadedAt).toLocaleDateString()}</span>
                              </div>
                            )}

                            <div style={{ display: "flex", gap: 8, marginTop: 2 }}>
                              <input
                                id={`file-input-${doc.key}`}
                                type="file"
                                accept=".pdf,image/*"
                                onChange={(e) => {
                                  const file = e.target.files?.[0];
                                  if (!file) return;
                                  const reader = new FileReader();
                                  reader.onload = (event) => {
                                    const base64 = event.target?.result as string;
                                    const updated = {
                                      ...p,
                                      permissions: {
                                        ...(p.permissions || {}),
                                        [doc.key]: {
                                          name: file.name,
                                          uploadedAt: new Date().toISOString(),
                                          data: base64
                                        }
                                      }
                                    };
                                    const nextList = projectsList.map(pr => pr.id === p.id ? updated : pr);
                                    syncProjectUpdate(updated, nextList);
                                    showToast(`📂 Uploaded ${file.name} successfully!`);
                                  };
                                  reader.readAsDataURL(file);
                                }}
                                style={{ display: "none" }}
                              />

                              <button
                                type="button"
                                onClick={() => document.getElementById(`file-input-${doc.key}`)?.click()}
                                style={{
                                  flex: 1,
                                  height: 34,
                                  background: "none",
                                  border: "1px solid var(--border)",
                                  borderRadius: 8,
                                  color: "var(--text)",
                                  fontSize: 11,
                                  fontWeight: 750,
                                  cursor: "pointer",
                                  display: "flex",
                                  alignItems: "center",
                                  justifyContent: "center",
                                  gap: 6
                                }}
                              >
                                📤 Upload Document
                              </button>

                              {fileInfo && (
                                <>
                                  <button
                                    type="button"
                                    onClick={() => {
                                      setAdminActiveImagePreview(fileInfo.data);
                                    }}
                                    style={{
                                      flex: 0.8,
                                      height: 34,
                                      background: "rgba(16,185,129,0.08)",
                                      border: "1px solid rgba(16,185,129,0.2)",
                                      borderRadius: 8,
                                      color: "#10b981",
                                      fontSize: 11,
                                      fontWeight: 750,
                                      cursor: "pointer"
                                    }}
                                  >
                                    👁️ Preview
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => {
                                      if (confirm(`Remove document for ${doc.label}?`)) {
                                        const updatedDocs = { ...docs };
                                        delete updatedDocs[doc.key];
                                        const updated = { ...p, permissions: updatedDocs };
                                        const nextList = projectsList.map(pr => pr.id === p.id ? updated : pr);
                                        syncProjectUpdate(updated, nextList);
                                        showToast(`🗑️ Removed ${doc.label} document.`);
                                      }
                                    }}
                                    style={{
                                      width: 34,
                                      height: 34,
                                      background: "rgba(220,38,38,0.08)",
                                      border: "1px solid rgba(239,68,68,0.2)",
                                      borderRadius: 8,
                                      color: "#ef4444",
                                      cursor: "pointer",
                                      display: "flex",
                                      alignItems: "center",
                                      justifyContent: "center"
                                    }}
                                  >
                                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/><line x1="10" y1="11" x2="10" y2="17"/><line x1="14" y1="11" x2="14" y2="17"/></svg>
                                  </button>
                                </>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}

                </div>
              );
            })() : (
              <div style={{ textShadow: "none", color: "var(--dim)", padding: "40px 20px", textAlign: "center", background: "var(--surface)", border: "1px dashed var(--border)", borderRadius: 24 }}>
                Select a project corridor from the directory roster above to log progress or manage document checklists.
              </div>
            )}
          </div>
        </div>
      )}

      {/* VIEW 6: DAILY REPORTS VERIFICATION FUNNEL */}
      {activeView === "reports" && (
        <div className="fade-in" style={{ paddingBottom: 60 }}>
          {/* Header */}
          <div style={{ padding: "20px 16px 14px", paddingTop: "calc(env(safe-area-inset-top, 0px) + 16px)", borderBottom: "1px solid var(--border)", background: "rgba(255,255,255,0.85)", backdropFilter: "blur(10px)", position: "sticky", top: 0, zIndex: 10 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
              <button 
                onClick={() => { setActiveView("hub"); setSelectedReport(null); }}
                className="back-btn"
                style={{ width: 38, height: 38, borderRadius: 10, border: "1px solid var(--border)", background: "var(--surface)", display: "flex", alignItems: "center", justifyContent: "center", color: "var(--text)", cursor: "pointer" }}
              >
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="19" y1="12" x2="5" y2="12"/><polyline points="12 19 5 12 12 5"/></svg>
              </button>
              <div>
                <p style={{ fontSize: 10, fontWeight: 800, color: "#10b981", letterSpacing: "0.1em", textTransform: "uppercase", margin: 0 }}>Daily Reports Hub</p>
                <h1 style={{ fontSize: 20, fontWeight: 800, color: "var(--text)", margin: "2px 0 0", letterSpacing: "-0.5px" }}>Staging Verification</h1>
              </div>
            </div>
          </div>

          <div style={{ padding: "16px", display: "flex", flexDirection: "column", gap: 16 }}>
            {/* STRICT FUNNEL NAVIGATION BAR */}
            <div className="glass" style={{ padding: 20, border: "1px solid var(--border)", borderRadius: 20 }}>
              <h2 style={{ fontSize: 11, fontWeight: 800, textTransform: "uppercase", letterSpacing: "0.08em", color: "var(--dim)", margin: "0 0 14px", textAlign: "left" }}>1. Verification Funnel Filter</h2>
              
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                <div>
                  <label style={{ display: "block", fontSize: 10, color: "var(--dim)", marginBottom: 6, fontWeight: 700, textTransform: "uppercase" }}>Select Date</label>
                  <input
                    type="date"
                    value={reportFilterDate}
                    onChange={(e) => setReportFilterDate(e.target.value)}
                    style={{ width: "100%", height: 38, background: "var(--bg)", border: "1px solid var(--border)", borderRadius: 10, padding: "0 10px", color: "var(--muted)", fontSize: 12, outline: "none", fontFamily: "monospace" }}
                  />
                </div>
                <div>
                  <label style={{ display: "block", fontSize: 10, color: "var(--dim)", marginBottom: 6, fontWeight: 700, textTransform: "uppercase" }}>Select Corridor</label>
                  <select
                    value={reportFilterProjectId}
                    onChange={(e) => setReportFilterProjectId(e.target.value)}
                    style={{ width: "100%", height: 38, background: "var(--bg)", border: "1px solid var(--border)", borderRadius: 10, padding: "0 8px", color: "var(--muted)", fontSize: 12, outline: "none", cursor: "pointer" }}
                  >
                    <option value="">-- Choose Project --</option>
                    {projectsList.map(p => (
                      <option key={p.id} value={p.id}>{p.name}</option>
                    ))}
                  </select>
                </div>
              </div>
            </div>

            {/* ROSTER GRID SECTION */}
            <div className="glass" style={{ padding: 20, border: "1px solid var(--border)", borderRadius: 20 }}>
              <h2 style={{ fontSize: 11, fontWeight: 800, textTransform: "uppercase", letterSpacing: "0.08em", color: "var(--dim)", margin: "0 0 14px", textAlign: "left" }}>2. Submitting Crew Roster</h2>

              {loadingReports ? (
                <div style={{ textAlign: "center", padding: "40px 0", color: "var(--dim)" }}>
                  <div className="spinner" style={{ margin: "0 auto 12px", borderColor: "#10b981", borderTopColor: "transparent" }} />
                  Retrieving Pending Crew Logs...
                </div>
              ) : pendingReports.length === 0 ? (
                <div style={{ background: "var(--surface)", border: "1px solid var(--border)", borderRadius: 16, padding: "32px 20px", textAlign: "center" }}>
                  <span style={{ fontSize: 24, display: "block", marginBottom: 8 }}>✨</span>
                  <p style={{ fontSize: 13, color: "var(--dim)", margin: 0 }}>No pending reports submitted for this date and project corridor.</p>
                </div>
              ) : (
                <div style={{ display: "grid", gridTemplateColumns: "1fr", gap: 10 }}>
                  {pendingReports.map((r) => {
                    const isSelected = selectedReport?.id === r.id;
                    return (
                      <div
                        key={r.id}
                        onClick={() => setSelectedReport(r)}
                        style={{
                          padding: "14px 16px",
                          borderRadius: 16,
                          background: isSelected ? "rgba(22, 163, 74, 0.08)" : "var(--surface)",
                          border: isSelected ? "1px solid rgba(22, 163, 74, 0.3)" : "1px solid var(--border)",
                          cursor: "pointer",
                          display: "flex",
                          justifyContent: "space-between",
                          alignItems: "center",
                          transition: "all 0.2s ease"
                        }}
                      >
                        <div style={{ textAlign: "left" }}>
                          <h4 style={{ fontSize: 13, fontWeight: 800, color: isSelected ? "#10b981" : "var(--text)", margin: 0 }}>{r.supervisorName}</h4>
                          <div style={{ display: "flex", flexWrap: "wrap", alignItems: "center", gap: 6, marginTop: 2 }}>
                            <span style={{ fontSize: 9, color: "var(--dim)", fontFamily: "monospace" }}>Staged: {new Date(r.createdAt).toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" })}</span>
                            {r.status === "approved" ? (
                              <span style={{ fontSize: 9, background: "#dcfce7", color: "#15803d", border: "1px solid #bbf7d0", borderRadius: 4, padding: "1px 4px", fontWeight: 800 }}>✓ Approved & Locked</span>
                            ) : (
                              <span style={{ fontSize: 9, background: "#fef3c7", color: "#d97706", border: "1px solid #fde68a", borderRadius: 4, padding: "1px 4px", fontWeight: 800 }}>⏳ Pending</span>
                            )}
                          </div>
                        </div>
                        <div style={{ textAlign: "right" }}>
                          <span style={{ fontSize: 10, fontWeight: 750, color: "#10b981", display: "block" }}>₹{r.calculatedWages}</span>
                          <span style={{ fontSize: 9, color: "var(--dim)" }}>{r.excavationLength}m trench | {r.hddLength}m HDD</span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

{/* REVIEW DRAWERS */}
            {selectedReport && (() => {
              const rich = selectedReport.stockAvailable?.richDetails || {};
              const otList = rich.otWorkers || [];
              const fuelList = rich.fuelExpensesList || [];
              const travelList = rich.travelExpensesList || [];
              const roomList = rich.roomRentList || [];
              const toolList = rich.toolRentList || [];
              const otherList = rich.otherExpensesList || [];
              const wip = rich.wipProgressList || {};
              const reqs = rich.requestsAndNotes || {};
              const clearances = selectedReport.clearances || {};
              const workerRate = selectedReport.workerWageRate ?? rich.workerWageRate ?? 900;
              const supervisorRate = selectedReport.supervisorWageRate ?? rich.supervisorWageRate ?? 1200;

              const calculatedLiveWages = (() => {
                const standardLaborCount = editReportLaborCount;
                const isSupervisorIncluded = rich.includeSupervisor;
                const standardRate = workerRate;
                const standardSupervisorRate = supervisorRate;
                
                const activeWorkers = standardLaborCount - (isSupervisorIncluded ? 1 : 0);
                const baseWages = Math.max(0, activeWorkers * standardRate) + (isSupervisorIncluded ? standardSupervisorRate : 0);
                
                let otWages = 0;
                if (selectedReport.otHours) {
                  const baseOtSum = (rich.otWorkers || []).reduce((sum: number, w: any) => {
                    const wc = Number(w.workerCount || 0);
                    const wr = Number(w.rate || 0);
                    const wh = Number(w.hours || 0);
                    return sum + (wc * wr * wh);
                  }, 0);
                  otWages = Math.round(baseOtSum * (editReportOtHours / (selectedReport.otHours || 1)));
                }
                
                return baseWages + otWages;
              })();

              const handleExportJSON = () => {
                const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(selectedReport, null, 2));
                const dlAnchorElem = document.createElement('a');
                dlAnchorElem.setAttribute("href",     dataStr);
                dlAnchorElem.setAttribute("download", `daily_report_${selectedReport.supervisorName}_${selectedReport.reportDate}.json`);
                dlAnchorElem.click();
              };

              const handlePrintPDF = () => {
                const printWindow = window.open("", "_blank");
                if (!printWindow) return;
                printWindow.document.write(`
                  <!DOCTYPE html>
                  <html>
                  <head>
                    <title>Daily Operational Report - ${selectedReport.supervisorName} (${selectedReport.reportDate})</title>
                    <style>
                      @import url('https://fonts.googleapis.com/css2?family=Outfit:wght@300;400;600;800&family=JetBrains+Mono:wght@400;700&display=swap');
                      body {
                        font-family: 'Outfit', sans-serif;
                        color: #1e293b;
                        background: #ffffff;
                        margin: 0;
                        padding: 40px;
                        line-height: 1.5;
                      }
                      .header {
                        border-bottom: 2px solid #7c3aed;
                        padding-bottom: 20px;
                        margin-bottom: 30px;
                        display: flex;
                        justify-content: space-between;
                        align-items: center;
                      }
                      .logo {
                        font-weight: 800;
                        font-size: 24px;
                        letter-spacing: 2px;
                        color: #7c3aed;
                      }
                      .meta-grid {
                        display: grid;
                        grid-template-columns: repeat(2, 1fr);
                        gap: 15px;
                        margin-bottom: 30px;
                        background: #f8fafc;
                        padding: 20px;
                        border-radius: 12px;
                        border: 1px solid #e2e8f0;
                      }
                      .meta-item span {
                        display: block;
                        font-size: 11px;
                        text-transform: uppercase;
                        color: #64748b;
                        font-weight: 700;
                        letter-spacing: 0.05em;
                      }
                      .meta-item strong {
                        font-size: 15px;
                        color: #0f172a;
                      }
                      h2 {
                        font-size: 18px;
                        color: #0f172a;
                        border-left: 4px solid #7c3aed;
                        padding-left: 10px;
                        margin-top: 30px;
                        margin-bottom: 15px;
                        text-transform: uppercase;
                        letter-spacing: 0.03em;
                      }
                      table {
                        width: 100%;
                        border-collapse: collapse;
                        margin-bottom: 20px;
                        font-size: 13px;
                      }
                      th {
                        background: #f1f5f9;
                        color: #475569;
                        font-weight: 700;
                        text-align: left;
                        padding: 10px 12px;
                        border-bottom: 1px solid #cbd5e1;
                      }
                      td {
                        padding: 10px 12px;
                        border-bottom: 1px solid #e2e8f0;
                        color: #334155;
                      }
                      .narration {
                        font-style: italic;
                        color: #64748b;
                        font-size: 12px;
                        margin-top: 4px;
                      }
                      .photo-grid {
                        display: grid;
                        grid-template-columns: repeat(3, 1fr);
                        gap: 15px;
                        margin-top: 10px;
                      }
                      .photo-card {
                        border: 1px solid #e2e8f0;
                        border-radius: 8px;
                        padding: 8px;
                        background: #f8fafc;
                        text-align: center;
                      }
                      .photo-card img {
                        max-width: 100%;
                        height: 120px;
                        object-fit: cover;
                        border-radius: 6px;
                        margin-bottom: 6px;
                      }
                      .photo-card span {
                        display: block;
                        font-size: 11px;
                        font-weight: 600;
                        color: #475569;
                      }
                      .badge {
                        display: inline-block;
                        padding: 2px 6px;
                        border-radius: 4px;
                        font-size: 11px;
                        font-weight: 700;
                        text-transform: uppercase;
                      }
                      .badge-success { background: #dcfce7; color: #15803d; }
                      .badge-warning { background: #fef9c3; color: #a16207; }
                      .badge-danger { background: #fee2e2; color: #b91c1c; }
                      .total-wages-badge {
                        font-size: 20px;
                        color: #166534;
                        font-weight: 800;
                      }
                      .print-btn-container {
                        text-align: center;
                        margin-top: 40px;
                        border-top: 1px solid #e2e8f0;
                        padding-top: 20px;
                      }
                      .btn-print {
                        background: #7c3aed;
                        color: white;
                        border: none;
                        padding: 12px 24px;
                        border-radius: 8px;
                        font-size: 14px;
                        font-weight: 700;
                        cursor: pointer;
                        font-family: 'Outfit', sans-serif;
                        box-shadow: 0 4px 10px rgba(124, 58, 237, 0.2);
                      }
                      .btn-print:hover {
                        background: #6d28d9;
                      }
                      @media print {
                        .print-btn-container { display: none; }
                        body { padding: 0; }
                      }
                    </style>
                  </head>
                  <body>
                    <div class="header">
                      <div class="logo">TELGO POWER PROJECTS</div>
                      <div style="font-size: 12px; color: #64748b; font-weight: 600; text-transform: uppercase; letter-spacing: 0.1em;">DAILY FIELD UPDATE SHEET</div>
                    </div>

                    <div class="meta-grid">
                      <div class="meta-item">
                        <span>Supervisor Name</span>
                        <strong>${selectedReport.supervisorName}</strong>
                      </div>
                      <div class="meta-item">
                        <span>Report Date</span>
                        <strong>${selectedReport.reportDate}</strong>
                      </div>
                      <div class="meta-item">
                        <span>Submission Time</span>
                        <strong>${new Date(selectedReport.created_at).toLocaleString("en-IN")}</strong>
                      </div>
                      <div class="meta-item">
                        <span>Calculated Crew Wages</span>
                        <strong class="total-wages-badge">₹${selectedReport.calculatedWages}</strong>
                      </div>
                    </div>

                    <h2>1. Labor, Crew & Overtime Wages</h2>
                    <p style="font-size: 13px; color: #334155; margin-bottom: 10px;">
                      Standard Crew Size: <strong>${selectedReport.laborCount - (rich.includeSupervisor ? 1 : 0)} labours</strong> ${rich.includeSupervisor ? "(Supervisor active at ₹1200)" : "(Supervisor not included)"}.
                    </p>
                    ${rich.laborWagesNarration ? `<div class="narration" style="margin-bottom: 20px;">Standard wages note: ${rich.laborWagesNarration}</div>` : ""}
                    ${rich.supervisorNarration ? `<div class="narration" style="margin-bottom: 20px;">Supervisor note: ${rich.supervisorNarration}</div>` : ""}

                    ${otList.length > 0 ? `
                      <h3 style="font-size: 14px; color: #0f172a; margin-top: 15px; margin-bottom: 8px;">Overtime Breakdowns</h3>
                      <table>
                        <thead>
                          <tr>
                            <th>Workers Count</th>
                            <th>Hours Registered</th>
                            <th>Rate / Hour</th>
                            <th>Subtotal</th>
                            <th>Narration Notes</th>
                          </tr>
                        </thead>
                        <tbody>
                          ${otList.map((o: any) => `
                            <tr>
                              <td><strong>${o.workerCount} workers</strong></td>
                              <td>${o.hours} hrs</td>
                              <td>₹${o.rate}</td>
                              <td><strong>₹${Number(o.workerCount) * Number(o.hours) * Number(o.rate)}</strong></td>
                              <td>${o.narration || "--"}</td>
                            </tr>
                          `).join("")}
                        </tbody>
                      </table>
                    ` : `<p style="font-size: 12px; color: #64748b; font-style: italic;">No overtime worker breakdowns registered for this date.</p>`}

                    <h2>2. Logistics, Rents & Miscellaneous Expenses</h2>
                    <table>
                      <thead>
                        <tr>
                          <th>Expense Category</th>
                          <th>Associated Details / Name</th>
                          <th>Amount</th>
                          <th>Receipt Status</th>
                          <th>Narration Notes</th>
                        </tr>
                      </thead>
                      <tbody>
                        ${fuelList.map((f: any) => `
                          <tr>
                            <td><strong>⛽ Fuel / Diesel</strong></td>
                            <td>Field Machinery / Fuel</td>
                            <td><strong>₹${f.amount}</strong></td>
                            <td>${f.billImage ? "📎 Receipt Attached" : "No Attachment"}</td>
                            <td>${f.narration || "--"}</td>
                          </tr>
                        `).join("")}
                        ${travelList.map((t: any) => `
                          <tr>
                            <td><strong>🚗 Transit & Travel</strong></td>
                            <td>Crew Travel & Logistics</td>
                            <td><strong>₹${t.amount}</strong></td>
                            <td>${t.billImage ? "📎 Receipt Attached" : "No Attachment"}</td>
                            <td>${t.narration || "--"}</td>
                          </tr>
                        `).join("")}
                        ${roomList.map((r: any) => `
                          <tr>
                            <td><strong>🏠 Room Rent / Lodging</strong></td>
                            <td>Crew Stay Accommodation</td>
                            <td><strong>₹${r.amount}</strong></td>
                            <td>${r.billImage ? "📎 Receipt Attached" : "No Attachment"}</td>
                            <td>${r.narration || "--"}</td>
                          </tr>
                        `).join("")}
                        ${toolList.map((t: any) => `
                          <tr>
                            <td><strong>🔧 Tool Rent</strong></td>
                            <td>${t.toolName}</td>
                            <td><strong>₹${t.amount}</strong></td>
                            <td>${t.billImage ? "📎 Receipt Attached" : "No Attachment"}</td>
                            <td>${t.narration || "--"}</td>
                          </tr>
                        `).join("")}
                        ${otherList.map((o: any) => `
                          <tr>
                            <td><strong>💡 Miscellaneous</strong></td>
                            <td>${o.expenseName}</td>
                            <td><strong>₹${o.amount}</strong></td>
                            <td>${o.billImage ? "📎 Receipt Attached" : "No Attachment"}</td>
                            <td>${o.narration || "--"}</td>
                          </tr>
                        `).join("")}
                        ${(fuelList.length === 0 && travelList.length === 0 && roomList.length === 0 && toolList.length === 0 && otherList.length === 0) ? `
                          <tr>
                            <td colspan="5" style="text-align: center; color: #64748b; font-style: italic;">No logistics or rental expenses registered for this date.</td>
                          </tr>
                        ` : ""}
                      </tbody>
                    </table>

                    <h2>3. Physical Work-In-Progress (WIP) Metrics</h2>
                    <table>
                      <thead>
                        <tr>
                          <th>Operations Metric</th>
                          <th>Value Completed</th>
                          <th>Photo Log</th>
                          <th>Narration Notes</th>
                        </tr>
                      </thead>
                      <tbody>
                        <tr>
                          <td><strong>Site Clearance Trenching</strong></td>
                          <td>
                            <strong>${selectedReport.excavationLength} meters</strong>
                            ${rich.startGpsLat ? `<br><span style="font-size: 11px; font-family: 'JetBrains Mono', monospace; color: #64748b;">🏁 Start: [${Number(rich.startGpsLat).toFixed(5)}, ${Number(rich.startGpsLng).toFixed(5)}]</span>` : ""}
                            ${selectedReport.terminationGpsLat ? `<br><span style="font-size: 11px; font-family: 'JetBrains Mono', monospace; color: #64748b;">🎯 End: [${selectedReport.terminationGpsLat.toFixed(5)}, ${selectedReport.terminationGpsLng.toFixed(5)}]</span>` : ""}
                          </td>
                          <td>${wip.trenching?.photo ? "📎 Photo Logged" : "No Photo"}</td>
                          <td>${wip.trenching?.narration || "--"}</td>
                        </tr>
                        <tr>
                          <td><strong>Horizontal Direction Drilling</strong></td>
                          <td><strong>${selectedReport.hddLength} meters</strong></td>
                          <td>${wip.hdd?.photo ? "📎 Photo Logged" : "No Photo"}</td>
                          <td>${wip.hdd?.narration || "--"}</td>
                        </tr>
                        <tr>
                          <td><strong>Cable Laying</strong></td>
                          <td><strong>${selectedReport.cableLayingLength} meters</strong></td>
                          <td>${wip.cableLaying?.photo ? "📎 Photo Logged" : "No Photo"}</td>
                          <td>${wip.cableLaying?.narration || "--"}</td>
                        </tr>
                        <tr>
                          <td><strong>Cable Mounting</strong></td>
                          <td><strong>${selectedReport.cableMoundingLength} meters</strong></td>
                          <td>${wip.cableMounding?.photo ? "📎 Photo Logged" : "No Photo"}</td>
                          <td>${wip.cableMounding?.narration || "--"}</td>
                        </tr>
                        <tr>
                          <td><strong>Cable Joining</strong></td>
                          <td><strong>${selectedReport.joiningLinksCompleted} links</strong></td>
                          <td>${wip.joining?.photo ? "📎 Photo Logged" : "No Photo"}</td>
                          <td>${wip.joining?.narration || "--"}</td>
                        </tr>
                        <tr>
                          <td><strong>RMU Transformer Foundations</strong></td>
                          <td><strong>${selectedReport.rmuFoundationStatus} bases</strong></td>
                          <td>${wip.rmu?.photo ? "📎 Photo Logged" : "No Photo"}</td>
                          <td>${wip.rmu?.narration || "--"}</td>
                        </tr>
                        <tr>
                          <td><strong>Outdoor / Indoor Terminations</strong></td>
                          <td>
                            <strong>${selectedReport.terminationEndpoints} points</strong>
                            ${selectedReport.terminationGpsLat ? `<br><span style="font-size: 11px; font-family: 'JetBrains Mono', monospace; color: #64748b;">🎯 [${selectedReport.terminationGpsLat.toFixed(5)}, ${selectedReport.terminationGpsLng.toFixed(5)}]</span>` : ""}
                          </td>
                          <td>${wip.terminations?.photo ? "📎 Photo Logged" : "No Photo"}</td>
                          <td>${wip.terminations?.narration || "--"}</td>
                        </tr>
                      </tbody>
                    </table>

                    <h2>4. Statutory Clearances & Agency Permissions</h2>
                    <table>
                      <thead>
                        <tr>
                          <th>Regulatory Agency</th>
                          <th>Authority Status</th>
                          <th>Uploaded Document</th>
                        </tr>
                      </thead>
                      <tbody>
                        ${Object.keys(clearances).map(agency => {
                          const info = clearances[agency];
                          const isSuccess = info.status === "Permission Granted" || info.status === "Permission Gathered";
                          const isWarning = info.status === "Demand Note Issued" || info.status === "Demand Issued";
                          return `
                            <tr>
                              <td><strong>${agency} Authority</strong></td>
                              <td>
                                <span class="badge ${isSuccess ? "badge-success" : isWarning ? "badge-warning" : "badge-danger"}">
                                  ${info.status}
                                </span>
                              </td>
                              <td>${info.receipt ? "📎 Receipt Document Attached" : "No Attachment"}</td>
                            </tr>
                          `;
                        }).join("")}
                        ${Object.keys(clearances).length === 0 ? `
                          <tr>
                            <td colspan="3" style="text-align: center; color: #64748b; font-style: italic;">No clearance stages updated in this report.</td>
                          </tr>
                        ` : ""}
                      </tbody>
                    </table>

                    <h2>5. Site Concerns, Planning Requests & Directives</h2>
                    <div style="background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 12px; padding: 20px; font-size: 13px;">
                      <div style="margin-bottom: 12px;">
                        <strong style="color: #475569; display: block; font-size: 11px; text-transform: uppercase;">Daily Work Report:</strong>
                        <div style="margin-top: 4px; color: #0f172a; white-space: pre-wrap;">${reqs.dailyWorkReport || "--"}</div>
                      </div>
                      <div style="margin-bottom: 12px; border-top: 1px solid #e2e8f0; padding-top: 12px;">
                        <strong style="color: #475569; display: block; font-size: 11px; text-transform: uppercase;">Upcoming Next-Day Objectives:</strong>
                        <div style="margin-top: 4px; color: #0f172a;">${reqs.plans || "--"}</div>
                      </div>
                      <div style="margin-bottom: 12px; border-top: 1px solid #e2e8f0; padding-top: 12px;">
                        <strong style="color: #475569; display: block; font-size: 11px; text-transform: uppercase;">Site Impediments / Roadblocks:</strong>
                        <div style="margin-top: 4px; color: #b91c1c; font-weight: 600;">${reqs.problems || "--"}</div>
                      </div>
                      <div style="margin-bottom: 12px; border-top: 1px solid #e2e8f0; padding-top: 12px;">
                        <strong style="color: #475569; display: block; font-size: 11px; text-transform: uppercase;">Urgent Administrative Concerns:</strong>
                        <div style="margin-top: 4px; color: #0f172a;">${reqs.adminConcerns || "--"}</div>
                      </div>
                      <div style="border-top: 1px solid #e2e8f0; padding-top: 12px;">
                        <strong style="color: #475569; display: block; font-size: 11px; text-transform: uppercase;">Finance & Imprest Refill Requests:</strong>
                        <div style="margin-top: 4px; color: #166534; font-weight: 700;">
                          ${reqs.financeAmount ? `Amount Requested: ₹${reqs.financeAmount}` : "No finance request submitted"}
                        </div>
                        ${reqs.financeNarration ? `<div style="font-style: italic; color: #64748b; font-size: 12px; margin-top: 2px;">Details: ${reqs.financeNarration}</div>` : ""}
                        ${reqs.financeReceipt ? `<div style="margin-top: 6px; font-weight: 600; color: #7c3aed;">📎 Cash request receipt file logged</div>` : ""}
                      </div>
                    </div>

                    <!-- IMAGE ATTACHMENTS PRINT LOG -->
                    ${(
                      fuelList.some((x: any) => x.billImage) || 
                      travelList.some((x: any) => x.billImage) || 
                      roomList.some((x: any) => x.billImage) || 
                      toolList.some((x: any) => x.billImage) || 
                      otherList.some((x: any) => x.billImage) || 
                      Object.values(wip).some((x: any) => x.photo) || 
                      Object.values(clearances).some((x: any) => x.receipt) ||
                      reqs.financeReceipt
                    ) ? `
                      <h2>6. Visual Logs & Receipt Attachments Reference</h2>
                      <div class="photo-grid">
                        ${fuelList.filter((x: any) => x.billImage).map((x: any, i: number) => `
                          <div class="photo-card">
                            <img src="${x.billImage}" alt="Fuel receipt" />
                            <span>Fuel Expense Log #${i + 1} (₹${x.amount})</span>
                          </div>
                        `).join("")}
                        ${travelList.filter((x: any) => x.billImage).map((x: any, i: number) => `
                          <div class="photo-card">
                            <img src="${x.billImage}" alt="Travel receipt" />
                            <span>Transit Expense Log #${i + 1} (₹${x.amount})</span>
                          </div>
                        `).join("")}
                        ${roomList.filter((x: any) => x.billImage).map((x: any, i: number) => `
                          <div class="photo-card">
                            <img src="${x.billImage}" alt="Room rent receipt" />
                            <span>Lodging Expense Log #${i + 1} (₹${x.amount})</span>
                          </div>
                        `).join("")}
                        ${toolList.filter((x: any) => x.billImage).map((x: any, i: number) => `
                          <div class="photo-card">
                            <img src="${x.toolImage || x.billImage}" alt="Tool rent receipt" />
                            <span>Tool Rental: ${x.toolName} (₹${x.amount})</span>
                          </div>
                        `).join("")}
                        ${otherList.filter((x: any) => x.billImage).map((x: any, i: number) => `
                          <div class="photo-card">
                            <img src="${x.billImage}" alt="Misc receipt" />
                            <span>Misc Rental: ${x.expenseName} (₹${x.amount})</span>
                          </div>
                        `).join("")}
                        ${Object.keys(wip).filter(k => wip[k]?.photo).map(k => `
                          <div class="photo-card">
                            <img src="${wip[k].photo}" alt="${k} progress" />
                            <span>WIP Progress: ${k.toUpperCase()} (${wip[k].value}m)</span>
                          </div>
                        `).join("")}
                        ${Object.keys(clearances).filter(k => clearances[k]?.receipt).map(k => `
                          <div class="photo-card">
                            <img src="${clearances[k].receipt}" alt="${k} receipt" />
                            <span>Clearance Document: ${k} Authority</span>
                          </div>
                        `).join("")}
                        ${reqs.financeReceipt ? `
                          <div class="photo-card">
                            <img src="${reqs.financeReceipt}" alt="Finance request receipt" />
                            <span>Finance Request Receipt (₹${reqs.financeAmount})</span>
                          </div>
                        ` : ""}
                      </div>
                    ` : ""}

                    <div class="print-btn-container">
                      <button class="btn-print" onclick="window.print()">🖨️ Print This Daily Report</button>
                    </div>

                    <div style="margin-top: 60px; border-top: 1px solid #cbd5e1; padding-top: 10px; font-size: 11px; text-align: center; color: #94a3b8;">
                      This document is an official daily operational log generated by Telgo Power Projects. All values, timestamps, and geolocation tags are cryptographically validated.
                    </div>
                  </body>
                  </html>
                `);
                printWindow.document.close();
              };

              return (
                <div className="glass fade-in" style={{ padding: "24px 20px", border: "1px solid var(--border)", borderRadius: 24, textAlign: "left", background: "var(--surface)" }}>
                  {/* Title Bar with controls */}
                  <div style={{ display: "flex", flexWrap: "wrap", justifyContent: "space-between", alignItems: "center", borderBottom: "1px solid var(--border)", paddingBottom: 16, marginBottom: 20, gap: 12 }}>
                    <div>
                      <span style={{ fontSize: 9, fontWeight: 900, color: "#10b981", letterSpacing: "0.15em", textTransform: "uppercase" }}>Selected Staged Update</span>
                      <h3 style={{ fontSize: 18, fontWeight: 900, color: "var(--text)", margin: "2px 0 0", letterSpacing: "-0.5px" }}>{selectedReport.supervisorName}</h3>
                      <span style={{ fontSize: 10, color: "var(--dim)", fontFamily: "monospace" }}>Date: {selectedReport.reportDate} | Submitted: {new Date(selectedReport.createdAt).toLocaleTimeString("en-IN")}</span>
                    </div>

                    <div style={{ display: "flex", flexWrap: "wrap", alignItems: "center", gap: 10 }}>
                      <button
                        onClick={handleExportJSON}
                        style={{
                          background: "var(--surface)",
                          border: "1px solid var(--border)",
                          borderRadius: 10,
                          color: "var(--muted)",
                          fontSize: 12,
                          fontWeight: 750,
                          padding: "8px 14px",
                          cursor: "pointer",
                          display: "flex",
                          alignItems: "center",
                          gap: 6,
                          fontFamily: "Outfit, sans-serif",
                          transition: "all 0.2s ease"
                        }}
                      >
                        📥 Export JSON
                      </button>

                      <button
                        onClick={handlePrintPDF}
                        style={{
                          background: "rgba(124, 58, 237, 0.08)",
                          border: "1px solid rgba(124, 58, 237, 0.2)",
                          borderRadius: 10,
                          color: "#c4b5fd",
                          fontSize: 12,
                          fontWeight: 750,
                          padding: "8px 14px",
                          cursor: "pointer",
                          display: "flex",
                          alignItems: "center",
                          gap: 6,
                          fontFamily: "Outfit, sans-serif",
                          transition: "all 0.2s ease"
                        }}
                      >
                        🖨️ Print Report PDF
                      </button>

                      {selectedReport.status === "approved" ? (
                        <div style={{
                          background: "rgba(22, 163, 74, 0.08)",
                          border: "1px solid rgba(22, 163, 74, 0.25)",
                          borderRadius: 10,
                          color: "#16a34a",
                          fontSize: 12,
                          fontWeight: 800,
                          padding: "8px 18px",
                          display: "flex",
                          alignItems: "center",
                          gap: 6,
                          fontFamily: "Outfit, sans-serif"
                        }}>
                          🔒 Approved & Locked in Ledger
                        </div>
                      ) : (
                        <div style={{ display: "flex", flexWrap: "wrap", alignItems: "center", gap: 10 }}>
                          {isAdminEditMode ? (
                            <>
                              <button
                                onClick={handleSaveReportEdits}
                                disabled={savingReportEdits}
                                style={{
                                  background: "linear-gradient(135deg, #0284c7 0%, #0369a1 100%)",
                                  border: "none",
                                  borderRadius: 10,
                                  color: "#ffffff",
                                  fontSize: 12,
                                  fontWeight: 800,
                                  padding: "8px 14px",
                                  cursor: "pointer",
                                  display: "flex",
                                  alignItems: "center",
                                  gap: 6,
                                  fontFamily: "Outfit, sans-serif"
                                }}
                              >
                                {savingReportEdits ? "Saving..." : "💾 Save Changes"}
                              </button>
                              <button
                                onClick={() => setIsAdminEditMode(false)}
                                style={{
                                  background: "var(--surface)",
                                  border: "1px solid var(--border)",
                                  borderRadius: 10,
                                  color: "var(--muted)",
                                  fontSize: 12,
                                  fontWeight: 750,
                                  padding: "8px 14px",
                                  cursor: "pointer",
                                  display: "flex",
                                  alignItems: "center",
                                  gap: 6,
                                  fontFamily: "Outfit, sans-serif"
                                }}
                              >
                                ❌ Cancel
                              </button>
                            </>
                          ) : (
                            <>
                              <button
                                onClick={() => setIsAdminEditMode(true)}
                                style={{
                                  background: "rgba(6, 182, 212, 0.08)",
                                  border: "1px solid rgba(6, 182, 212, 0.2)",
                                  borderRadius: 10,
                                  color: "#06b6d4",
                                  fontSize: 12,
                                  fontWeight: 750,
                                  padding: "8px 14px",
                                  cursor: "pointer",
                                  display: "flex",
                                  alignItems: "center",
                                  gap: 6,
                                  fontFamily: "Outfit, sans-serif"
                                }}
                              >
                                ✏️ Edit Parameters
                              </button>
                              <button
                                onClick={() => setIsFlagRequestOpen(!isFlagRequestOpen)}
                                style={{
                                  background: selectedReport.status === "clarification" ? "rgba(220, 38, 38, 0.08)" : "rgba(245, 158, 11, 0.08)",
                                  border: selectedReport.status === "clarification" ? "1px solid rgba(220, 38, 38, 0.2)" : "1px solid rgba(245, 158, 11, 0.2)",
                                  borderRadius: 10,
                                  color: selectedReport.status === "clarification" ? "#dc2626" : "#f59e0b",
                                  fontSize: 12,
                                  fontWeight: 750,
                                  padding: "8px 14px",
                                  cursor: "pointer",
                                  display: "flex",
                                  alignItems: "center",
                                  gap: 6,
                                  fontFamily: "Outfit, sans-serif"
                                }}
                              >
                                {selectedReport.status === "clarification" ? "💬 Flagged: Open Chat" : "❓ Ask Supervisor"}
                              </button>
                            </>
                          )}
                          <button
                            onClick={() => handleApproveDailyReport(selectedReport.id)}
                            disabled={approvingReportId === selectedReport.id || isAdminEditMode}
                            style={{
                              background: "linear-gradient(135deg, #10b981 0%, #059669 100%)",
                              border: "none",
                              borderRadius: 10,
                              color: "#ffffff",
                              fontSize: 12,
                              fontWeight: 800,
                              padding: "8px 18px",
                              cursor: (approvingReportId === selectedReport.id || isAdminEditMode) ? "not-allowed" : "pointer",
                              display: "flex",
                              alignItems: "center",
                              gap: 6,
                              boxShadow: "0 4px 14px rgba(16, 185, 129, 0.25)",
                              fontFamily: "Outfit, sans-serif",
                              transition: "all 0.2s ease",
                              opacity: isAdminEditMode ? 0.5 : 1
                            }}
                          >
                            {approvingReportId === selectedReport.id ? "Locking..." : "Approve & Lock"}
                          </button>
                        </div>
                      )}
                    </div>
                  </div>

                  <div style={{ display: "grid", gridTemplateColumns: "1fr", gap: 20 }}>
                    {/* Collapsible Clarification Hub Chat Box */}
                    {isFlagRequestOpen && (
                      <div className="glass" style={{ border: "1px solid rgba(245, 158, 11, 0.3)", background: "linear-gradient(135deg, rgba(254, 243, 199, 0.15) 0%, rgba(254, 243, 199, 0.05) 100%)", borderRadius: 20, padding: 18, marginBottom: 12, textAlign: "left" }}>
                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
                          <span style={{ fontSize: 10, fontWeight: 900, color: "#d97706", textTransform: "uppercase", letterSpacing: "0.15em", display: "flex", alignItems: "center", gap: 6 }}>
                            <span className="dot-pulse" style={{ background: "#d97706", width: 6, height: 6 }} /> Clarification Chat Hub
                          </span>
                          <span style={{ fontSize: 9, background: "#fef3c7", color: "#d97706", border: "1px solid rgba(217,119,6,0.2)", borderRadius: 4, padding: "1px 4px", fontWeight: 800 }}>Staged Status: {selectedReport.status}</span>
                        </div>

                        {/* Thread messages list */}
                        <div style={{ background: "var(--bg)", border: "1px solid var(--border)", borderRadius: 12, padding: 12, minHeight: 120, maxHeight: 200, overflowY: "auto", display: "flex", flexDirection: "column", gap: 10, marginBottom: 12 }}>
                          {loadingClarificationMessages ? (
                            <div style={{ textAlign: "center", color: "var(--dim)", fontSize: 11, padding: "20px 0" }}>Loading discussion logs...</div>
                          ) : clarificationMessages.length === 0 ? (
                            <div style={{ textAlign: "center", color: "var(--muted)", fontSize: 11, padding: "30px 10px", fontStyle: "italic" }}>No questions or clarification requests logged yet. Ask the supervisor below to open a ticket.</div>
                          ) : (
                            clarificationMessages.map((msg) => {
                              const isAdmin = msg.sender_role === "admin";
                              return (
                                <div key={msg.id} style={{ display: "flex", flexDirection: "column", alignSelf: isAdmin ? "flex-end" : "flex-start", maxWidth: "80%", textAlign: "left" }}>
                                  <div style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 9, color: "var(--dim)", marginBottom: 2, padding: "0 4px" }}>
                                    <strong>{msg.sender_name}</strong> ({msg.sender_role})
                                    {msg.item_type && msg.item_type !== "general" && (
                                      <span style={{ background: "var(--surface)", border: "1px solid var(--border)", borderRadius: 3, padding: "0 3px", color: "var(--muted)" }}>🏷️ {msg.item_type}</span>
                                    )}
                                  </div>
                                  <div style={{ background: isAdmin ? "rgba(6, 182, 212, 0.1)" : "var(--surface)", border: isAdmin ? "1px solid rgba(6, 182, 212, 0.2)" : "1px solid var(--border)", borderRadius: 10, padding: "8px 12px", fontSize: 11, color: "var(--text)" }}>
                                    {msg.message}
                                  </div>
                                  <span style={{ fontSize: 8, color: "var(--muted)", display: "block", marginTop: 2, alignSelf: "flex-end", padding: "0 4px" }}>{new Date(msg.created_at).toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" })}</span>
                                </div>
                              );
                            })
                          )}
                        </div>

                        {/* Sending query form */}
                        <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
                          <div style={{ flex: 1, minWidth: 150 }}>
                            <select
                              value={flaggedItemType}
                              onChange={(e) => setFlaggedItemType(e.target.value)}
                              style={{ width: "100%", height: 34, background: "var(--bg)", border: "1px solid var(--border)", borderRadius: 8, padding: "0 6px", color: "var(--muted)", fontSize: 11, outline: "none", marginBottom: 6, cursor: "pointer" }}
                            >
                              <option value="general">💼 General Query</option>
                              <option value="fuel_expenses">⛽ Fuel Expenses / Bills</option>
                              <option value="travel_expenses">🚗 Travel / Logistics</option>
                              <option value="room_rent">🏠 Room Rent / Receipt</option>
                              <option value="tool_rent">🔧 Tool Rentals</option>
                              <option value="other_expenses">💡 Miscellaneous Expenses</option>
                              <option value="wip_progress">🏗️ Physical WIP Progress / Photos</option>
                            </select>
                            <input
                              type="text"
                              value={newClarificationMessage}
                              onChange={(e) => setNewClarificationMessage(e.target.value)}
                              placeholder="Type concern/question for supervisor..."
                              style={{ width: "100%", height: 34, background: "var(--bg)", border: "1px solid var(--border)", borderRadius: 8, padding: "0 10px", color: "var(--text)", fontSize: 11, outline: "none" }}
                            />
                          </div>
                          <button
                            onClick={handleSendClarificationMessage}
                            style={{ background: "linear-gradient(135deg, #f59e0b 0%, #d97706 100%)", color: "#ffffff", border: "none", borderRadius: 8, padding: "0 16px", height: 74, fontSize: 11, fontWeight: 800, textTransform: "uppercase", cursor: "pointer", fontFamily: "Outfit, sans-serif" }}
                          >
                            Send concern
                          </button>
                        </div>
                      </div>
                    )}

                    {/* SECTION 1: LABOUR & WAGES BREAKDOWN */}
                    <div style={{ background: "var(--surface)", border: "1px solid var(--border)", borderRadius: 16, padding: 16 }}>
                      <span style={{ fontSize: 10, fontWeight: 900, color: "#10b981", textTransform: "uppercase", letterSpacing: "0.08em", display: "block", marginBottom: 12 }}>Step A: Crew Labour & Wages</span>
                      
                      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: 14, marginBottom: 14 }}>
                        <div style={{ background: "var(--surface)", padding: 12, borderRadius: 12, border: "1px solid var(--border)" }}>
                          <span style={{ fontSize: 9, color: "var(--dim)", textTransform: "uppercase", fontWeight: 700 }}>Standard Crew Roster</span>
                          {isAdminEditMode ? (
                            <input
                              type="number"
                              value={editReportLaborCount}
                              onChange={(e) => setEditReportLaborCount(Math.max(0, parseInt(e.target.value) || 0))}
                              style={{ width: "100%", height: 32, background: "var(--bg)", border: "1px solid var(--border)", borderRadius: 6, padding: "0 8px", color: "var(--text)", fontSize: 12, outline: "none", marginTop: 4 }}
                            />
                          ) : (
                            <p style={{ fontSize: 13, fontWeight: 800, color: "var(--text)", margin: "2px 0 0" }}>
                              {selectedReport.laborCount} Labours
                            </p>
                          )}
                          <span style={{ fontSize: 9, color: "var(--muted)" }}>₹{workerRate} base wage per worker</span>
                        </div>

                        <div style={{ background: "var(--surface)", padding: 12, borderRadius: 12, border: "1px solid var(--border)" }}>
                          <span style={{ fontSize: 9, color: "var(--dim)", textTransform: "uppercase", fontWeight: 700 }}>Overtime Hours Log</span>
                          {isAdminEditMode ? (
                            <input
                              type="number"
                              value={editReportOtHours}
                              onChange={(e) => setEditReportOtHours(Math.max(0, parseInt(e.target.value) || 0))}
                              style={{ width: "100%", height: 32, background: "var(--bg)", border: "1px solid var(--border)", borderRadius: 6, padding: "0 8px", color: "var(--text)", fontSize: 12, outline: "none", marginTop: 4 }}
                            />
                          ) : (
                            <p style={{ fontSize: 13, fontWeight: 800, color: "var(--text)", margin: "2px 0 0" }}>
                              {selectedReport.otHours} Hours OT
                            </p>
                          )}
                          <span style={{ fontSize: 9, color: "var(--muted)" }}>Supervisor active: {rich.includeSupervisor ? "Yes" : "No"}</span>
                        </div>

                        <div style={{ background: "var(--surface)", padding: 12, borderRadius: 12, border: "1px solid var(--border)" }}>
                          <span style={{ fontSize: 9, color: "var(--dim)", textTransform: "uppercase", fontWeight: 700 }}>Calculated Wages Log</span>
                          <p style={{ fontSize: 15, fontWeight: 900, color: "#10b981", margin: "2px 0 0" }}>
                            ₹{isAdminEditMode ? calculatedLiveWages : selectedReport.calculatedWages}
                          </p>
                          <span style={{ fontSize: 9, color: "var(--muted)" }}>Standard wages + OT totals</span>
                        </div>
                      </div>

                      {rich.laborWagesNarration && (
                        <div style={{ fontSize: 11, background: "var(--surface)", border: "1px solid var(--border)", padding: "8px 12px", borderRadius: 10, color: "var(--muted)", marginBottom: 10 }}>
                          <span style={{ fontWeight: 800, color: "#10b981", marginRight: 6 }}>Labour Wages Note:</span>
                          {rich.laborWagesNarration}
                        </div>
                      )}

                      {rich.supervisorNarration && (
                        <div style={{ fontSize: 11, background: "var(--surface)", border: "1px solid var(--border)", padding: "8px 12px", borderRadius: 10, color: "var(--muted)", marginBottom: 12 }}>
                          <span style={{ fontWeight: 800, color: "#10b981", marginRight: 6 }}>Supervisor Note:</span>
                          {rich.supervisorNarration}
                        </div>
                      )}

                      {/* Overtime breakdowns lists */}
                      <span style={{ fontSize: 9, fontWeight: 900, color: "var(--dim)", textTransform: "uppercase", display: "block", marginBottom: 6 }}>Overtime Worker Segments</span>
                      {otList.length === 0 ? (
                        <p style={{ fontSize: 11, color: "var(--muted)", fontStyle: "italic", margin: 0 }}>No overtime worker records registered for this date.</p>
                      ) : (
                        <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                          {otList.map((o: any, idx: number) => (
                            <div key={idx} style={{ display: "flex", flexDirection: "column", background: "rgba(0,0,0,0.1)", border: "1px solid var(--surface)", borderRadius: 10, padding: 10 }}>
                              <div style={{ display: "flex", justifyContent: "space-between", fontSize: 11, fontWeight: 700 }}>
                                <span style={{ color: "var(--text)" }}>⚡ Group #{idx+1}: {o.workerCount} workers x {o.hours} hrs</span>
                                <span style={{ color: "#10b981" }}>₹{Number(o.workerCount) * Number(o.hours) * Number(o.rate)} <span style={{ color: "var(--muted)", fontWeight: 500 }}>(@ ₹{o.rate}/hr)</span></span>
                              </div>
                              {o.narration && (
                                <p style={{ margin: "4px 0 0", fontSize: 10, color: "var(--dim)", fontStyle: "italic" }}>Note: {o.narration}</p>
                              )}
                            </div>
                          ))}
                        </div>
                      )}
                    </div>

                    {/* SECTION 2: LOGISTICS, RENTAL & IMPREST EXPENSES LIST */}
                    <div style={{ background: "var(--surface)", border: "1px solid var(--border)", borderRadius: 16, padding: 16 }}>
                      <span style={{ fontSize: 10, fontWeight: 900, color: "var(--cyan)", textTransform: "uppercase", letterSpacing: "0.08em", display: "block", marginBottom: 12 }}>Step A.2: Logistics & Rental Receipts</span>
                      
                      {isAdminEditMode ? (
                        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                          <div>
                            <label style={{ fontSize: 10, color: "var(--dim)", fontWeight: 700, textTransform: "uppercase" }}>Fuel Expenses (₹)</label>
                            <input
                              type="number"
                              value={editReportFuelExpenses}
                              onChange={(e) => setEditReportFuelExpenses(Math.max(0, parseFloat(e.target.value) || 0))}
                              style={{ width: "100%", height: 34, background: "var(--bg)", border: "1px solid var(--border)", borderRadius: 8, padding: "0 8px", color: "var(--text)", fontSize: 12, outline: "none", marginTop: 4 }}
                            />
                          </div>
                          <div>
                            <label style={{ fontSize: 10, color: "var(--dim)", fontWeight: 700, textTransform: "uppercase" }}>Travel Expenses (₹)</label>
                            <input
                              type="number"
                              value={editReportTravelExpenses}
                              onChange={(e) => setEditReportTravelExpenses(Math.max(0, parseFloat(e.target.value) || 0))}
                              style={{ width: "100%", height: 34, background: "var(--bg)", border: "1px solid var(--border)", borderRadius: 8, padding: "0 8px", color: "var(--text)", fontSize: 12, outline: "none", marginTop: 4 }}
                            />
                          </div>
                          <div>
                            <label style={{ fontSize: 10, color: "var(--dim)", fontWeight: 700, textTransform: "uppercase" }}>Room Rent (₹)</label>
                            <input
                              type="number"
                              value={editReportRoomRent}
                              onChange={(e) => setEditReportRoomRent(Math.max(0, parseFloat(e.target.value) || 0))}
                              style={{ width: "100%", height: 34, background: "var(--bg)", border: "1px solid var(--border)", borderRadius: 8, padding: "0 8px", color: "var(--text)", fontSize: 12, outline: "none", marginTop: 4 }}
                            />
                          </div>
                          <div>
                            <label style={{ fontSize: 10, color: "var(--dim)", fontWeight: 700, textTransform: "uppercase" }}>Tool Rent (₹)</label>
                            <input
                              type="number"
                              value={editReportToolRent}
                              onChange={(e) => setEditReportToolRent(Math.max(0, parseFloat(e.target.value) || 0))}
                              style={{ width: "100%", height: 34, background: "var(--bg)", border: "1px solid var(--border)", borderRadius: 8, padding: "0 8px", color: "var(--text)", fontSize: 12, outline: "none", marginTop: 4 }}
                            />
                          </div>
                        </div>
                      ) : (
                        <div style={{ display: "grid", gridTemplateColumns: "1fr", gap: 8 }}>
                        {/* Render lists dynamically */}
                        {[
                          ...fuelList,
                          ...travelList,
                          ...roomList,
                          ...toolList,
                          ...otherList
                        ].length === 0 ? (
                          <p style={{ fontSize: 11, color: "var(--muted)", fontStyle: "italic", margin: 0 }}>No rental or logistics receipt transactions submitted.</p>
                        ) : (
                          [
                            ...fuelList.map((item: any, i: number) => ({ cat: "⛽ Fuel", name: `Fuel Log #${i+1}`, amount: item.amount, narration: item.narration, img: item.billImage })),
                            ...travelList.map((item: any, i: number) => ({ cat: "🚗 Transit", name: `Travel Log #${i+1}`, amount: item.amount, narration: item.narration, img: item.billImage })),
                            ...roomList.map((item: any, i: number) => ({ cat: "🏠 Accommodation", name: `Lodging Log #${i+1}`, amount: item.amount, narration: item.narration, img: item.billImage })),
                            ...toolList.map((item: any, i: number) => ({ cat: "🔧 Tool Rental", name: item.toolName || `Tool #${i+1}`, amount: item.amount, narration: item.narration, img: item.billImage })),
                            ...otherList.map((item: any, i: number) => ({ cat: "💡 Miscellaneous", name: item.expenseName || `Misc #${i+1}`, amount: item.amount, narration: item.narration, img: item.billImage }))
                          ].map((item: any, idx: number) => (
                            <div key={idx} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", background: "var(--surface)", border: "1px solid var(--surface)", borderRadius: 12, padding: "10px 14px", gap: 12 }}>
                              <div style={{ display: "flex", alignItems: "center", gap: 10, flex: 1, minWidth: 0 }}>
                                {item.img ? (
                                  <div 
                                    onClick={() => setAdminActiveImagePreview(item.img)}
                                    style={{ width: 44, height: 44, borderRadius: 8, background: "var(--surface)", border: "1px solid var(--border)", overflow: "hidden", display: "flex", alignItems: "center", justifyContent: "center", cursor: "zoom-in", flexShrink: 0 }}
                                  >
                                    <img src={item.img} alt="Receipt thumbnail" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                                  </div>
                                ) : (
                                  <div style={{ width: 44, height: 44, borderRadius: 8, background: "var(--surface)", border: "1px solid var(--border)", display: "flex", alignItems: "center", justifyContent: "center", color: "var(--muted)", fontSize: 14, flexShrink: 0 }}>
                                    🚫
                                  </div>
                                )}
                                <div style={{ minWidth: 0 }}>
                                  <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                                    <span style={{ fontSize: 10, color: "var(--dim)", fontWeight: 700, textTransform: "uppercase" }}>{item.cat}</span>
                                    <span style={{ fontSize: 11, color: "var(--muted)", fontWeight: 800 }}>({item.name})</span>
                                  </div>
                                  <p style={{ margin: "2px 0 0", fontSize: 11, color: "var(--dim)", fontStyle: "italic", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                                    {item.narration || "No narration details added."}
                                  </p>
                                </div>
                              </div>
                              <span style={{ fontSize: 13, fontWeight: 800, color: "var(--cyan)", flexShrink: 0 }}>₹{item.amount}</span>
                            </div>
                          ))
                        )}
                      </div>
                    )}
                  </div>

                    {/* SECTION 3: PHYSICAL WORK-IN-PROGRESS (WIP) METRICS */}
                    <div style={{ background: "var(--surface)", border: "1px solid var(--border)", borderRadius: 16, padding: 16 }}>
                      <span style={{ fontSize: 10, fontWeight: 900, color: "#d97706", textTransform: "uppercase", letterSpacing: "0.08em", display: "block", marginBottom: 12 }}>Step B: Work-in-Progress Lengths & Progress Photos</span>
                      
                      {isAdminEditMode ? (
                        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                          <div>
                            <label style={{ fontSize: 10, color: "var(--dim)", fontWeight: 700, textTransform: "uppercase" }}>Site Clearance Trenching (m)</label>
                            <input
                              type="number"
                              value={editReportExcavationLength}
                              onChange={(e) => setEditReportExcavationLength(Math.max(0, parseFloat(e.target.value) || 0))}
                              style={{ width: "100%", height: 34, background: "var(--bg)", border: "1px solid var(--border)", borderRadius: 8, padding: "0 8px", color: "var(--text)", fontSize: 12, outline: "none", marginTop: 4 }}
                            />
                          </div>
                          <div>
                            <label style={{ fontSize: 10, color: "var(--dim)", fontWeight: 700, textTransform: "uppercase" }}>Horizontal Direction Drilling (m)</label>
                            <input
                              type="number"
                              value={editReportHddLength}
                              onChange={(e) => setEditReportHddLength(Math.max(0, parseFloat(e.target.value) || 0))}
                              style={{ width: "100%", height: 34, background: "var(--bg)", border: "1px solid var(--border)", borderRadius: 8, padding: "0 8px", color: "var(--text)", fontSize: 12, outline: "none", marginTop: 4 }}
                            />
                          </div>
                          <div>
                            <label style={{ fontSize: 10, color: "var(--dim)", fontWeight: 700, textTransform: "uppercase" }}>Cable Laying (m)</label>
                            <input
                              type="number"
                              value={editReportCableLayingLength}
                              onChange={(e) => setEditReportCableLayingLength(Math.max(0, parseFloat(e.target.value) || 0))}
                              style={{ width: "100%", height: 34, background: "var(--bg)", border: "1px solid var(--border)", borderRadius: 8, padding: "0 8px", color: "var(--text)", fontSize: 12, outline: "none", marginTop: 4 }}
                            />
                          </div>
                          <div>
                            <label style={{ fontSize: 10, color: "var(--dim)", fontWeight: 700, textTransform: "uppercase" }}>Cable Mounting (m)</label>
                            <input
                              type="number"
                              value={editReportCableMoundingLength}
                              onChange={(e) => setEditReportCableMoundingLength(Math.max(0, parseFloat(e.target.value) || 0))}
                              style={{ width: "100%", height: 34, background: "var(--bg)", border: "1px solid var(--border)", borderRadius: 8, padding: "0 8px", color: "var(--text)", fontSize: 12, outline: "none", marginTop: 4 }}
                            />
                          </div>
                          <div>
                            <label style={{ fontSize: 10, color: "var(--dim)", fontWeight: 700, textTransform: "uppercase" }}>Cable Joining (Qty)</label>
                            <input
                              type="number"
                              value={editReportJoiningLinksCompleted}
                              onChange={(e) => setEditReportJoiningLinksCompleted(Math.max(0, parseInt(e.target.value) || 0))}
                              style={{ width: "100%", height: 34, background: "var(--bg)", border: "1px solid var(--border)", borderRadius: 8, padding: "0 8px", color: "var(--text)", fontSize: 12, outline: "none", marginTop: 4 }}
                            />
                          </div>
                          <div>
                            <label style={{ fontSize: 10, color: "var(--dim)", fontWeight: 700, textTransform: "uppercase" }}>RMU Transformer Foundations (Qty)</label>
                            <input
                              type="number"
                              value={editReportRmuFoundationStatus}
                              onChange={(e) => setEditReportRmuFoundationStatus(Math.max(0, parseInt(e.target.value) || 0))}
                              style={{ width: "100%", height: 34, background: "var(--bg)", border: "1px solid var(--border)", borderRadius: 8, padding: "0 8px", color: "var(--text)", fontSize: 12, outline: "none", marginTop: 4 }}
                            />
                          </div>
                          <div>
                            <label style={{ fontSize: 10, color: "var(--dim)", fontWeight: 700, textTransform: "uppercase" }}>Outdoor / Indoor Terminations (Qty)</label>
                            <input
                              type="number"
                              value={editReportTerminationEndpoints}
                              onChange={(e) => setEditReportTerminationEndpoints(Math.max(0, parseInt(e.target.value) || 0))}
                              style={{ width: "100%", height: 34, background: "var(--bg)", border: "1px solid var(--border)", borderRadius: 8, padding: "0 8px", color: "var(--text)", fontSize: 12, outline: "none", marginTop: 4 }}
                            />
                          </div>
                        </div>
                      ) : (
                        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                        {[
                          { key: "trenching", name: "Site Clearance Trenching", val: `${selectedReport.excavationLength} meters` },
                          { key: "hdd", name: "Horizontal Direction Drilling", val: `${selectedReport.hddLength} meters` },
                          { key: "cableLaying", name: "Cable Laying", val: `${selectedReport.cableLayingLength} meters` },
                          { key: "cableMounding", name: "Cable Mounting", val: `${selectedReport.cableMoundingLength} meters` },
                          { key: "joining", name: "Cable Joining", val: `${selectedReport.joiningLinksCompleted} links` },
                          { key: "rmu", name: "RMU Transformer Foundations", val: `${selectedReport.rmuFoundationStatus} bases` },
                          { key: "terminations", name: "Outdoor / Indoor Terminations", val: `${selectedReport.terminationEndpoints} points` }
                        ].map((m: any) => {
                          const log = wip[m.key] || {};
                          if (m.key === "hdd") {
                            const metadata = selectedReport.hddMetadata || {};
                            const logsList = selectedReport.hddDrillingLogs || [];
                            const rodLenVal = metadata.hddRodLengthM || 3.0;

                            return (
                              <div key={m.key} style={{ display: "flex", flexDirection: "column", background: "var(--surface)", border: "1px solid var(--border)", borderRadius: 16, padding: "14px 16px", gap: 12 }}>
                                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                                  <span style={{ fontSize: 11, color: "var(--muted)", fontWeight: 800 }}>🕳️ HDD Drilling Inspection Report</span>
                                  <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                                    <button
                                      type="button"
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        window.open(`/app/print-hdd?reportId=${selectedReport.id}`, '_blank');
                                      }}
                                      style={{
                                        fontSize: 9,
                                        fontWeight: 750,
                                        color: "#ffffff",
                                        background: "linear-gradient(135deg, #0284c7 0%, #0369a1 100%)",
                                        border: "none",
                                        borderRadius: 6,
                                        padding: "4px 8px",
                                        cursor: "pointer",
                                        boxShadow: "0 2px 6px rgba(2, 132, 199, 0.2)",
                                        fontFamily: "Outfit, sans-serif"
                                      }}
                                    >
                                      🖨️ Export Paper Log Sheet
                                    </button>
                                    <span style={{ fontSize: 12, fontWeight: 900, color: "#d97706" }}>{selectedReport.hddLength} meters</span>
                                  </div>
                                </div>

                                {/* Metadata Info Grid */}
                                <div style={{ background: "var(--bg)", border: "1px solid var(--border)", borderRadius: 10, padding: 10, display: "grid", gridTemplateColumns: "1fr 1fr", gap: 6, fontSize: 11 }}>
                                  <div>👤 <b>Operator:</b> {metadata.hddOperatorName || "--"}</div>
                                  <div>🚜 <b>Machine:</b> {metadata.hddMachineName || "--"}</div>
                                  <div>🏢 <b>Vendor:</b> {metadata.hddVendorName || "--"}</div>
                                  <div>🔍 <b>Tracker:</b> {metadata.hddTrackerName || "--"}</div>
                                  <div>🌈 <b>Duct Specs:</b> {metadata.hddDuctsInfo || "--"}</div>
                                  <div>📏 <b>Rod Length:</b> {rodLenVal} m</div>
                                </div>

                                {/* Bore Path Graph Canvas */}
                                <div style={{ background: "#ffffff", border: "1px solid var(--border)", borderRadius: 12, padding: 8, display: "flex", flexDirection: "column", gap: 4 }}>
                                  <span style={{ fontSize: 9, fontWeight: 800, color: "var(--cyan)", textTransform: "uppercase" }}>📈 Bore Path Profile Graph (Auto-plotted)</span>
                                  <div style={{ width: "100%", overflow: "hidden", display: "flex", justifyContent: "center" }}>
                                    <canvas id="adminHddBoreCanvas" width="550" height="240" style={{ width: "100%", maxWidth: "550px", height: "auto", border: "1px solid #f1f5f9" }} />
                                  </div>
                                </div>

                                {/* Rod Log Details Dropdown/Table */}
                                <div style={{ background: "var(--bg)", border: "1px solid var(--border)", borderRadius: 10, padding: 10 }}>
                                  <span style={{ fontSize: 9, fontWeight: 800, color: "var(--muted)", textTransform: "uppercase", display: "block", marginBottom: 6 }}>Logged Rod Logs ({logsList.length})</span>
                                  {logsList.length === 0 ? (
                                    <span style={{ fontSize: 11, color: "var(--dim)", fontStyle: "italic" }}>No rod logs registered.</span>
                                  ) : (
                                    <div style={{ display: "flex", flexDirection: "column", gap: 6, maxHeight: 180, overflowY: "auto" }}>
                                      {logsList.map((log: any, idx: number) => (
                                        <div key={idx} style={{ background: "var(--surface)", border: "1px solid var(--border)", borderRadius: 8, padding: 8, display: "grid", gridTemplateColumns: "1.2fr 1fr 1fr 1.2fr", gap: 6, fontSize: 10, alignItems: "center" }}>
                                          <div><b>Rod #{log.rodNo}</b> ({((idx + 1) * rodLenVal).toFixed(1)}m)</div>
                                          <div>📈 Pitch: <b>{log.pitch}%</b></div>
                                          <div>🕳️ Depth: <b>{log.depth}m</b></div>
                                          <div>🪨 {log.strata} {log.crossing ? `• ⚠️ ${log.crossing}` : ""}</div>
                                        </div>
                                      ))}
                                    </div>
                                  )}
                                </div>
                              </div>
                            );
                          }

                          return (
                            <div key={m.key} style={{ display: "flex", flexDirection: "column", background: "var(--surface)", border: "1px solid var(--border)", borderRadius: 16, padding: "12px 16px", gap: 10 }}>
                              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12 }}>
                                <div style={{ display: "flex", alignItems: "center", gap: 10, flex: 1, minWidth: 0 }}>
                                  {log.photo ? (
                                    <div 
                                      onClick={() => setAdminActiveImagePreview(log.photo)}
                                      style={{ width: 44, height: 44, borderRadius: 8, background: "var(--surface)", border: "1px solid var(--border)", overflow: "hidden", display: "flex", alignItems: "center", justifyContent: "center", cursor: "zoom-in", flexShrink: 0 }}
                                    >
                                      <img src={log.photo} alt="Progress log thumbnail" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                                    </div>
                                  ) : (
                                    <div style={{ width: 44, height: 44, borderRadius: 8, background: "var(--surface)", border: "1px solid var(--border)", display: "flex", alignItems: "center", justifyContent: "center", color: "var(--muted)", fontSize: 13, flexShrink: 0 }}>
                                      📷
                                    </div>
                                  )}
                                  <div style={{ minWidth: 0 }}>
                                    <span style={{ fontSize: 11, color: "var(--muted)", fontWeight: 800 }}>{m.name}</span>
                                    <p style={{ margin: "2px 0 0", fontSize: 10, color: "var(--dim)", fontStyle: "italic", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                                      {log.narration || "No narration details added."}
                                    </p>
                                  </div>
                                </div>
                                <div style={{ textAlign: "right", flexShrink: 0 }}>
                                  <span style={{ fontSize: 12, fontWeight: 800, color: "#d97706", display: "block" }}>{m.val}</span>
                                  {m.key === "terminations" && selectedReport.terminationGpsLat && (
                                    <span style={{ fontSize: 8, color: "var(--dim)", fontFamily: "monospace" }}>
                                      🎯 [{selectedReport.terminationGpsLat.toFixed(4)}, {selectedReport.terminationGpsLng.toFixed(4)}]
                                    </span>
                                  )}
                                  {(m.key === "trenching" || m.key === "cableLaying") && log.startLat && (
                                    <div style={{ display: "flex", flexDirection: "column", gap: 2, alignItems: "flex-end", marginTop: 2 }}>
                                      <span style={{ fontSize: 8, color: "var(--dim)", fontFamily: "monospace" }}>
                                        🏁 Start: [{Number(log.startLat).toFixed(4)}, {Number(log.startLng).toFixed(4)}]
                                      </span>
                                      <span style={{ fontSize: 8, color: "var(--dim)", fontFamily: "monospace" }}>
                                        🎯 End: [{Number(log.endLat).toFixed(4)}, {Number(log.endLng).toFixed(4)}]
                                      </span>
                                    </div>
                                  )}
                                </div>
                              </div>

                              {/* Map segment preview */}
                              {(m.key === "trenching" || m.key === "cableLaying") && log.startLat && log.endLat && (
                                <div style={{ border: "1px solid var(--border)", borderRadius: 12, overflow: "hidden", height: 160, width: "100%", background: "#f1f5f9" }}>
                                  <iframe
                                    title={`${m.name} Route Map`}
                                    style={{ width: "100%", height: "100%", border: "none" }}
                                    srcDoc={`
                                      <!DOCTYPE html>
                                      <html>
                                      <head>
                                        <link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css" />
                                        <script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"></script>
                                        <style>
                                          body, html, #map { margin: 0; padding: 0; width: 100%; height: 100%; }
                                        </style>
                                      </head>
                                      <body>
                                        <div id="map"></div>
                                        <script>
                                          const start = [${log.startLat}, ${log.startLng}];
                                          const end = [${log.endLat}, ${log.endLng}];
                                          const map = L.map('map', { zoomControl: false, dragging: true }).setView(start, 15);
                                          L.tileLayer('https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png', { maxZoom: 19 }).addTo(map);
                                          
                                          // Green start, red end
                                          L.circleMarker(start, { color: '#16a34a', radius: 5, fillOpacity: 0.9 }).addTo(map);
                                          L.circleMarker(end, { color: '#dc2626', radius: 5, fillOpacity: 0.9 }).addTo(map);
                                          
                                          const pathCoords = ${JSON.stringify(log.path || [])};
                                          if (pathCoords && pathCoords.length >= 2) {
                                            L.polyline(pathCoords, { color: '${m.key === "trenching" ? "#f97316" : "#06b6d4"}', weight: 4.5, opacity: 0.95 }).addTo(map);
                                            try { map.fitBounds(pathCoords, { padding: [10, 10] }); } catch(e){}
                                          } else {
                                            L.polyline([start, end], { color: '${m.key === "trenching" ? "#f97316" : "#06b6d4"}', weight: 4, dashArray: '5, 5' }).addTo(map);
                                            try { map.fitBounds([start, end], { padding: [10, 10] }); } catch(e){}
                                          }
                                        </script>
                                      </body>
                                      </html>
                                    `}
                                  />
                                </div>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>

                    {/* SECTION 4: CLEARANCE LIFECYCLES */}
                    <div style={{ background: "var(--surface)", border: "1px solid var(--border)", borderRadius: 16, padding: 16 }}>
                      <span style={{ fontSize: 10, fontWeight: 900, color: "#c084fc", textTransform: "uppercase", letterSpacing: "0.08em", display: "block", marginBottom: 12 }}>Step C: Statutory Clearances Documents</span>
                      
                      <div style={{ display: "grid", gridTemplateColumns: "1fr", gap: 8 }}>
                        {Object.keys(clearances).length === 0 ? (
                          <p style={{ fontSize: 11, color: "var(--muted)", fontStyle: "italic", margin: 0 }}>No statutory clearances stages submitted.</p>
                        ) : (
                          Object.keys(clearances).map((agency) => {
                            const info = clearances[agency] || {};
                            return (
                              <div key={agency} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", background: "var(--surface)", border: "1px solid var(--surface)", borderRadius: 12, padding: "10px 14px", gap: 12 }}>
                                <div style={{ display: "flex", alignItems: "center", gap: 10, flex: 1, minWidth: 0 }}>
                                  {info.receipt ? (
                                    <div 
                                      onClick={() => setAdminActiveImagePreview(info.receipt)}
                                      style={{ width: 44, height: 44, borderRadius: 8, background: "var(--surface)", border: "1px solid var(--border)", overflow: "hidden", display: "flex", alignItems: "center", justifyContent: "center", cursor: "zoom-in", flexShrink: 0 }}
                                    >
                                      <img src={info.receipt} alt="Clearance receipt thumbnail" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                                    </div>
                                  ) : (
                                    <div style={{ width: 44, height: 44, borderRadius: 8, background: "var(--surface)", border: "1px solid var(--border)", display: "flex", alignItems: "center", justifyContent: "center", color: "var(--muted)", fontSize: 13, flexShrink: 0 }}>
                                      📄
                                    </div>
                                  )}
                                  <div style={{ minWidth: 0 }}>
                                    <span style={{ fontSize: 11, color: "var(--muted)", fontWeight: 800 }}>{agency} Authority Permission</span>
                                    <p style={{ margin: "2px 0 0", fontSize: 10, color: "var(--dim)" }}>
                                      Status: <strong style={{ color: (info.status === "Permission Granted" || info.status === "Permission Gathered") ? "#10b981" : (info.status === "Demand Note Issued" || info.status === "Demand Issued") ? "#fbbf24" : "#f87171" }}>{info.status}</strong>
                                    </p>
                                  </div>
                                </div>
                                <span style={{ fontSize: 10, color: "var(--dim)", fontWeight: 700 }}>STAGE COMPLETED</span>
                              </div>
                            );
                          })
                        )}
                      </div>
                    </div>

                    {/* SECTION 5: PLANNING REQUESTS, ROADBLOCKS & IMPREST REQUEST */}
                    <div style={{ background: "var(--surface)", border: "1px solid var(--border)", borderRadius: 16, padding: 16 }}>
                      <span style={{ fontSize: 10, fontWeight: 900, color: "#dc2626", textTransform: "uppercase", letterSpacing: "0.08em", display: "block", marginBottom: 12 }}>Step D: Planning, Hurdles & Cash Requests</span>
                      
                      <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                        {/* Daily Work Report */}
                        <div style={{ background: "rgba(2, 132, 199, 0.05)", border: "1px solid rgba(2, 132, 199, 0.15)", borderRadius: 12, padding: 12 }}>
                          <span style={{ fontSize: 9, color: "#0284c7", fontWeight: 800, textTransform: "uppercase", display: "block", marginBottom: 4 }}>📝 Daily Work Report</span>
                          <p style={{ margin: 0, fontSize: 11, color: "var(--muted)", lineHeight: 1.5, whiteSpace: "pre-wrap" }}>
                            {reqs.dailyWorkReport || "No daily work report logged."}
                          </p>
                        </div>

                        {/* Next day plans */}
                        <div style={{ background: "var(--surface)", border: "1px solid var(--surface)", borderRadius: 12, padding: 12 }}>
                          <span style={{ fontSize: 9, color: "#10b981", fontWeight: 800, textTransform: "uppercase", display: "block", marginBottom: 4 }}>📝 Next-Day Operational Plans</span>
                          <p style={{ margin: 0, fontSize: 11, color: "var(--muted)", lineHeight: 1.5 }}>
                            {reqs.plans || "No planning requests logged."}
                          </p>
                        </div>

                        {/* Site problems / roadblocks */}
                        <div style={{ background: "rgba(220, 38, 38, 0.08)", border: "1px solid rgba(220, 38, 38, 0.2)", borderRadius: 12, padding: 12 }}>
                          <span style={{ fontSize: 9, color: "#dc2626", fontWeight: 800, textTransform: "uppercase", display: "block", marginBottom: 4 }}>⚠️ Site Roadblocks / Impediments</span>
                          <p style={{ margin: 0, fontSize: 11, color: "#dc2626", lineHeight: 1.5, fontWeight: 600 }}>
                            {reqs.problems || "No site obstacles logged."}
                          </p>
                        </div>

                        {/* Urgent concerns */}
                        <div style={{ background: "var(--surface)", border: "1px solid var(--surface)", borderRadius: 12, padding: 12 }}>
                          <span style={{ fontSize: 9, color: "#d97706", fontWeight: 800, textTransform: "uppercase", display: "block", marginBottom: 4 }}>🚨 Direct Administrative Concerns</span>
                          <p style={{ margin: 0, fontSize: 11, color: "var(--muted)", lineHeight: 1.5 }}>
                            {reqs.adminConcerns || "No administrative issues logged."}
                          </p>
                        </div>

                        {/* Finance Refills */}
                        <div style={{ background: "rgba(16, 185, 129, 0.03)", border: "1px solid rgba(16, 185, 129, 0.12)", borderRadius: 12, padding: 12, display: "flex", flexWrap: "wrap", alignItems: "center", justifyContent: "space-between", gap: 12 }}>
                          <div style={{ minWidth: 200 }}>
                            <span style={{ fontSize: 9, color: "#15803d", fontWeight: 800, textTransform: "uppercase", display: "block", marginBottom: 4 }}>💳 Imprest Refill & Cash Requests</span>
                            <p style={{ margin: 0, fontSize: 11, color: "var(--muted)", lineHeight: 1.5 }}>
                              {reqs.financeAmount ? `Refill Amount: ₹${reqs.financeAmount}` : "No finance imprest requests submitted."}
                            </p>
                            {reqs.financeNarration && (
                              <p style={{ margin: "2px 0 0", fontSize: 10, color: "var(--dim)", fontStyle: "italic" }}>
                                Details: {reqs.financeNarration}
                              </p>
                            )}
                          </div>
                          {reqs.financeReceipt && (
                            <button
                              onClick={() => setAdminActiveImagePreview(reqs.financeReceipt)}
                              style={{
                                background: "rgba(16, 185, 129, 0.1)",
                                border: "1px solid rgba(16, 185, 129, 0.25)",
                                borderRadius: 8,
                                color: "#15803d",
                                fontSize: 10,
                                fontWeight: 800,
                                padding: "6px 12px",
                                cursor: "pointer",
                                fontFamily: "Outfit, sans-serif"
                              }}
                            >
                              📎 View Imprest receipt
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })()}
          </div>
        </div>
      )}

      {/* VIEW 7: MASTER LEDGER HUB */}
      {activeView === "ledger" && (
        <div className="fade-in" style={{ paddingBottom: 60 }}>
          {/* Header */}
          <div style={{ padding: "20px 16px 14px", paddingTop: "calc(env(safe-area-inset-top, 0px) + 16px)", borderBottom: "1px solid var(--border)", background: "rgba(255,255,255,0.85)", backdropFilter: "blur(10px)", position: "sticky", top: 0, zIndex: 10 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
              <button 
                onClick={() => { setActiveView("hub"); }}
                className="back-btn"
                style={{ width: 38, height: 38, borderRadius: 10, border: "1px solid var(--border)", background: "var(--surface)", display: "flex", alignItems: "center", justifyContent: "center", color: "var(--text)", cursor: "pointer" }}
              >
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="19" y1="12" x2="5" y2="12"/><polyline points="12 19 5 12 12 5"/></svg>
              </button>
              <div>
                <p style={{ fontSize: 10, fontWeight: 800, color: "#f59e0b", letterSpacing: "0.1em", textTransform: "uppercase", margin: 0 }}>Consolidated Timeline</p>
                <h1 style={{ fontSize: 20, fontWeight: 800, color: "var(--text)", margin: "2px 0 0", letterSpacing: "-0.5px" }}>Master Project Ledger</h1>
              </div>
            </div>
          </div>

          <div style={{ padding: "16px", display: "flex", flexDirection: "column", gap: 16 }}>
            {/* Select Corridor Dropdown */}
            <div className="glass" style={{ padding: 18, border: "1px solid var(--border)", borderRadius: 20 }}>
              <label style={{ display: "block", fontSize: 11, fontWeight: 700, color: "var(--dim)", marginBottom: 6, textTransform: "uppercase", textAlign: "left" }}>Select Project Corridor</label>
              <select
                value={selectedLedgerProject}
                onChange={(e) => {
                  setSelectedLedgerProject(e.target.value);
                  fetchMasterLedger(e.target.value);
                }}
                style={{ width: "100%", height: 40, background: "var(--bg)", border: "1px solid var(--border)", borderRadius: 10, padding: "0 10px", color: "var(--muted)", fontSize: 13, outline: "none", cursor: "pointer" }}
              >
                <option value="">-- Choose Project Corridor --</option>
                {projectsList.map(p => (
                  <option key={p.id} value={p.id}>{p.name} ({p.code})</option>
                ))}
              </select>
            </div>

            {/* Ledger Table grid */}
            <div className="glass" style={{ padding: 20, border: "1px solid var(--border)", borderRadius: 20 }}>
              <h2 style={{ fontSize: 11, fontWeight: 800, textTransform: "uppercase", letterSpacing: "0.08em", color: "var(--dim)", margin: "0 0 16px", textAlign: "left" }}>Aggregated Ledger Sheet</h2>

              {loadingLedger ? (
                <div style={{ textAlign: "center", padding: "40px 0", color: "var(--dim)" }}>
                  <div className="spinner" style={{ margin: "0 auto 12px", borderColor: "#f59e0b", borderTopColor: "transparent" }} />
                  Loading Consolidated Ledger Timeline...
                </div>
              ) : !selectedLedgerProject ? (
                <p style={{ fontSize: 12, color: "var(--dim)", margin: 0 }}>Please select a project corridor from the dropdown above to display the aggregated daily ledger list.</p>
              ) : masterLedgerList.length === 0 ? (
                <div style={{ background: "var(--surface)", border: "1px solid var(--border)", borderRadius: 16, padding: "32px 20px", textAlign: "center" }}>
                  <span style={{ fontSize: 24, display: "block", marginBottom: 8 }}>📊</span>
                  <p style={{ fontSize: 13, color: "var(--dim)", margin: 0 }}>No consolidated daily ledger aggregates found for this project corridor corridor yet.</p>
                </div>
              ) : (
                <div style={{ overflowX: "auto" }}>
                  <table style={{ width: "100%", borderCollapse: "collapse", textAlign: "left", fontSize: 12, minWidth: 600 }}>
                    <thead>
                      <tr style={{ borderBottom: "1px solid var(--border)", color: "var(--dim)", textTransform: "uppercase", fontSize: 10, fontWeight: 800 }}>
                        <th style={{ padding: "10px 8px" }}>Date</th>
                        <th style={{ padding: "10px 8px" }}>Reports</th>
                        <th style={{ padding: "10px 8px" }}>Total Wages</th>
                        <th style={{ padding: "10px 8px" }}>Trenching (m)</th>
                        <th style={{ padding: "10px 8px" }}>HDD (m)</th>
                        <th style={{ padding: "10px 8px" }}>Laying/Mound (m)</th>
                        <th style={{ padding: "10px 8px" }}>Terminations</th>
                        <th style={{ padding: "10px 8px" }}>Last Update</th>
                      </tr>
                    </thead>
                    <tbody>
                      {masterLedgerList.map((row) => (
                        <tr key={row.id} style={{ borderBottom: "1px solid var(--border)", color: "var(--muted)" }}>
                          <td style={{ padding: "12px 8px", fontWeight: 700 }}>{row.ledgerDate}</td>
                          <td style={{ padding: "12px 8px" }}>
                            <span style={{ fontSize: 10, background: "rgba(245,158,11,0.1)", color: "#d97706", border: "1px solid rgba(217, 119, 6, 0.2)", borderRadius: 4, padding: "2px 6px", fontWeight: 800 }}>
                              {row.approvedReportsCount} reports
                            </span>
                          </td>
                          <td style={{ padding: "12px 8px", fontFamily: "monospace", color: "#10b981", fontWeight: 750 }}>₹{row.totalWages}</td>
                          <td style={{ padding: "12px 8px", fontFamily: "monospace", color: "var(--muted)" }}>{row.totalExcavation}m</td>
                          <td style={{ padding: "12px 8px", fontFamily: "monospace", color: "#d97706", fontWeight: 750 }}>{row.totalHdd}m</td>
                          <td style={{ padding: "12px 8px", fontFamily: "monospace" }}>{row.totalCableLaying}m / {row.totalCableMounding}m</td>
                          <td style={{ padding: "12px 8px", fontFamily: "monospace", color: "var(--cyan)" }}>{row.totalTerminations}</td>
                          <td style={{ padding: "12px 8px", fontSize: 10, color: "var(--dim)" }}>{new Date(row.updatedAt).toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" })}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* OPERATIONAL FINANCIAL CATEGORIES REGISTRIES */}
      {activeView === "expense_fuel" && renderFinancialExpenseView("fuel")}
      {activeView === "expense_travel" && renderFinancialExpenseView("travel")}
      {activeView === "expense_room" && renderFinancialExpenseView("room")}
      {activeView === "expense_tool" && renderFinancialExpenseView("tool")}
      {activeView === "expense_other" && renderFinancialExpenseView("other")}

      {/* SITE PROGRESS REGISTRY */}
      {activeView === "progress_analytics" && renderProgressAnalyticsView()}

      {/* ADMINISTRATIVE PROJECT EDITING MODAL */}
      {editingProjectItem && (() => {
        // Dynamic banner aesthetics based on active drawing tool selection
        const getBannerStyle = () => {
          switch (activePinMode) {
            case "start": return { border: "1px solid rgba(34, 197, 94, 0.3)", background: "rgba(22, 163, 74, 0.08)", color: "#15803d" };
            case "end": return { border: "1px solid rgba(239, 68, 68, 0.3)", background: "rgba(220, 38, 38, 0.08)", color: "#dc2626" };
            case "middle": return { border: "1px solid rgba(217, 119, 6, 0.3)", background: "rgba(217, 119, 6, 0.08)", color: "#fbbf24" };
            case "road_segment": return { border: "1px solid rgba(139, 92, 246, 0.3)", background: "rgba(139, 92, 246, 0.08)", color: "#8b5cf6" };
            case "hdd":
            case "hdd_segment": return { border: "1px solid rgba(251, 191, 36, 0.3)", background: "rgba(217, 119, 6, 0.08)", color: "#fcd34d" };
            case "trench":
            case "trench_segment": return { border: "1px solid rgba(249, 115, 22, 0.3)", background: "rgba(249, 115, 22, 0.08)", color: "#ff9d5c" };
            case "termination": return { border: "1px solid rgba(37, 99, 235, 0.3)", background: "rgba(37, 99, 235, 0.08)", color: "#2563eb" };
            case "utility": return { border: "1px solid rgba(168, 85, 247, 0.3)", background: "rgba(124, 58, 237, 0.08)", color: "#c084fc" };
            default: return { border: "1px solid var(--border)", background: "var(--surface)", color: "var(--dim)" };
          }
        };

        const getBannerText = () => {
          switch (activePinMode) {
            case "start": return "🟢 Pin Start: Click any location on the map to set the Start Junction. You can also drag the green marker directly.";
            case "end": return "🔴 Pin End: Click any location on the map to set the End Junction. You can also drag the red marker directly.";
            case "middle": return "🟡 Pin Middle: Click any location on the map to add an intermediate connection point (Junction). Whichever route the person is drawing on, the line will strictly follow it through these points in sequence.";
            case "road_segment": return "🛣️ Road Changes Segment: Click start point and end point on map to mark road change segment. Its distance adds to project length!";
            case "hdd_segment": return "🟡 HDD Crossing Segment: Click start point and end point on map to clearly mark a horizontal directional drilling crossing segment.";
            case "trench_segment": return "🟠 Trenching Segment Planning: Click start point and end point on map to mark planned trenching segments.";
            case "hdd": return "🟡 HDD Drilling: Click on map to add yellow HDD points at locations requiring horizontal directional drilling.";
            case "termination": return "🔵 Grid Termination: Click on the map to place blue square termination boxes at substation interfaces.";
            case "trench": return "🟠 Trench Line: Click sequential locations on the map to draw the dashed trenching line path.";
            case "utility": return "🟣 Utility Link: Click sequential locations on the map to draw the custom purple utility cable routing path.";
            default: return "";
          }
        };

        return (
          <div style={{ position: "fixed", inset: 0, background: "rgba(15, 23, 42, 0.35)", backdropFilter: "blur(8px)", display: "flex", alignItems: "center", justifyContent: "center", padding: 20, zIndex: 1100, animation: "fadeIn 0.2s ease" }}>
            <div className="glass glow-cyan" style={{ width: "100%", maxWidth: "1000px", maxHeight: "95vh", overflowY: "auto", padding: "28px 24px", background: "linear-gradient(135deg, #ffffff 0%, #f8fafc 100%)", borderRadius: 24, border: "1px solid var(--border)", boxShadow: "0 8px 32px rgba(15, 23, 42, 0.06)", color: "var(--text)" }}>
              
              {/* Modal Header */}
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 20, borderBottom: "1px solid var(--border)", paddingBottom: 14 }}>
                <div>
                  <h3 style={{ fontSize: 20, fontWeight: 900, letterSpacing: "-0.5px", margin: 0, background: "linear-gradient(90deg, #c4b5fd, #06b6d4)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>Corridor GIS Editor</h3>
                  <p style={{ fontSize: 11, color: "var(--dim)", margin: "2px 0 0", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.05em" }}>Operational Map & Project Parameters</p>
                </div>
                <button onClick={() => setEditingProjectItem(null)} style={{ background: "var(--border)", border: "1px solid var(--border)", width: 32, height: 32, borderRadius: "50%", color: "var(--dim)", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}>
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
                </button>
              </div>

              <div className="editor-container">
                
                {/* LEFT COLUMN: INTERACTIVE GIS MAP, GEOLOCATION SEARCH, TOOLBAR */}
                <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    <span style={{ fontSize: 11, fontWeight: 800, color: "var(--dim)", textTransform: "uppercase", letterSpacing: "0.03em" }}>Interactive GIS Tools</span>
                    <span style={{ fontSize: 10, color: "#d97706", background: "rgba(217, 119, 6, 0.08)", border: "1px solid rgba(217, 119, 6, 0.2)", borderRadius: 6, padding: "2px 6px", fontWeight: 700 }}>
                      Live Drag & Placement Mode
                    </span>
                  </div>

                  {/* OSM Nominatim Search Widget */}
                  <form onSubmit={handleSearchMap} style={{ display: "flex", gap: 10 }}>
                    <div style={{ position: "relative", flex: 1 }}>
                      <span style={{ position: "absolute", left: 12, top: "50%", transform: "translateY(-50%)", fontSize: 13 }}>🔍</span>
                      <input
                        type="text"
                        placeholder="Search Kerala locations (e.g. Kakkanad, Munnar, Cherthala)..."
                        value={searchQueryMap}
                        onChange={(e) => setSearchQueryMap(e.target.value)}
                        style={{ width: "100%", height: 38, background: "var(--surface)", border: "1px solid var(--border)", borderRadius: 10, padding: "0 12px 0 34px", color: "var(--text)", fontSize: 12, outline: "none", fontFamily: "Outfit, sans-serif" }}
                      />
                    </div>
                    <button
                      type="submit"
                      disabled={searchingMap}
                      style={{ minWidth: 90, background: "rgba(14, 165, 233, 0.08)", border: "1px solid rgba(14, 165, 233, 0.3)", borderRadius: 10, color: "#0284c7", fontSize: 12, fontWeight: 700, cursor: "pointer", fontFamily: "Outfit, sans-serif" }}
                    >
                      {searchingMap ? "Searching..." : "Center Map"}
                    </button>
                  </form>

                  {/* Active-Tool Guidance Banner */}
                  <div style={{
                    padding: "10px 14px",
                    borderRadius: 12,
                    fontSize: 11,
                    fontWeight: 700,
                    lineHeight: 1.5,
                    display: "flex",
                    alignItems: "center",
                    gap: 8,
                    transition: "all 0.2s ease",
                    ...getBannerStyle()
                  }}>
                    <span>{getBannerText()}</span>
                  </div>

                  {/* Grid of operational drawing tools */}
                  <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 8 }}>
                    <button
                      type="button"
                      onClick={() => setActivePinMode("start")}
                      className="tool-btn"
                      style={{
                        borderColor: activePinMode === "start" ? "#22c55e" : "var(--border)",
                        background: activePinMode === "start" ? "rgba(34,197,94,0.12)" : "var(--surface)",
                        color: activePinMode === "start" ? "#4ade80" : "#94a3b8"
                      }}
                    >
                      🟢 Pin Start
                    </button>
                    <button
                      type="button"
                      onClick={() => setActivePinMode("middle")}
                      className="tool-btn"
                      style={{
                        borderColor: activePinMode === "middle" ? "#d97706" : "var(--border)",
                        background: activePinMode === "middle" ? "rgba(217,119,6,0.12)" : "var(--surface)",
                        color: activePinMode === "middle" ? "#fbbf24" : "#94a3b8"
                      }}
                    >
                      🟡 Pin Middle
                    </button>
                    <button
                      type="button"
                      onClick={() => setActivePinMode("end")}
                      className="tool-btn"
                      style={{
                        borderColor: activePinMode === "end" ? "#ef4444" : "var(--border)",
                        background: activePinMode === "end" ? "rgba(239,68,68,0.12)" : "var(--surface)",
                        color: activePinMode === "end" ? "#f87171" : "#94a3b8"
                      }}
                    >
                      🔴 Pin End
                    </button>
                  </div>

                  {/* Large Interactive Iframe Map */}
                  <div className="glass" style={{ padding: 0, border: "1px solid var(--border)", borderRadius: 20, overflow: "hidden", background: "var(--bg)" }}>
                    <div style={{ position: "relative", height: "350px", width: "100%" }}>
                      <iframe
                        key={editingProjectItem.id}
                        id="gis-editor-iframe"
                        title="Interactive GIS Corridor Editor"
                        style={{ width: "100%", height: "100%", border: "none" }}
                        srcDoc={`
                          <!DOCTYPE html>
                          <html>
                          <head>
                            <link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css" />
                            <script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"></script>
                            <style>
                              html, body, #map { margin: 0; padding: 0; width: 100%; height: 100%; background: #f8fafc; cursor: crosshair; }
                              .leaflet-control-attribution { display: none !important; }
                              .leaflet-container { background: #f8fafc !important; }
                              .leaflet-bar a { background-color: #ffffff !important; color: #334155 !important; border-color: #e2e8f0 !important; }
                              .leaflet-bar a:hover { background-color: #f1f5f9 !important; }
                              
                              .start-marker {
                                background: #22c55e;
                                border: 2.5px solid #ffffff;
                                border-radius: 50%;
                                box-shadow: 0 0 12px rgba(34, 197, 94, 0.7);
                              }
                              .end-marker {
                                background: #ef4444;
                                border: 2.5px solid #ffffff;
                                border-radius: 50%;
                                box-shadow: 0 0 12px rgba(239, 68, 68, 0.7);
                              }
                            </style>
                          </head>
                          <body>
                            <div id="map"></div>
                            <script>
                              const startLat = parseFloat("${editingProjectItem.startCoords[0]}");
                              const startLng = parseFloat("${editingProjectItem.startCoords[1]}");
                              const endLat = parseFloat("${editingProjectItem.endCoords[0]}");
                              const endLng = parseFloat("${editingProjectItem.endCoords[1]}");
                              let middlePoints = ${JSON.stringify(projMiddlePoints)};

                              const hasStart = !isNaN(startLat) && !isNaN(startLng);
                              const hasEnd = !isNaN(endLat) && !isNaN(endLng);

                              let center = [10.0055, 76.3082];
                              if (hasStart) center = [startLat, startLng];
                              else if (hasEnd) center = [endLat, endLng];

                              const map = L.map('map').setView(center, 14);
                              
                              const streetMap = L.tileLayer('https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png', {
                                maxZoom: 20
                              });
                              const satelliteMap = L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}', {
                                maxZoom: 19
                              });
                              streetMap.addTo(map);
                              const baseMaps = {
                                "Street View": streetMap,
                                "Satellite View": satelliteMap
                              };
                              L.control.layers(baseMaps, null, { position: 'bottomleft' }).addTo(map);

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

                              // Render intermediate connection points
                              const middleIcon = L.divIcon({
                                className: 'middle-marker',
                                html: "<div style='background-color:#fbbf24;width:10px;height:10px;border:1.5px solid white;border-radius:50%;box-shadow:0 0 8px rgba(251,191,36,0.8)'></div>",
                                iconSize: [10, 10],
                                iconAnchor: [5, 5]
                              });
                              
                              let middleMarkers = [];
                              function redrawMiddleMarkers() {
                                middleMarkers.forEach(function(m) { map.removeLayer(m); });
                                middleMarkers = [];
                                middlePoints.forEach(function(pt, idx) {
                                  const m = L.marker([pt[0], pt[1]], { icon: middleIcon, draggable: true })
                                   .addTo(map)
                                   .bindTooltip("<b>Junction " + (idx + 1) + "</b>", { permanent: true, direction: "top", className: "junction-tooltip" });
                                  
                                  m.on('dragend', function() {
                                    const pos = m.getLatLng();
                                    window.parent.postMessage({
                                      type: 'MIDDLE_POINT_DRAG',
                                      index: idx,
                                      lat: pos.lat,
                                      lng: pos.lng
                                    }, '*');
                                  });
                                  middleMarkers.push(m);
                                });
                              }
                              redrawMiddleMarkers();

                              let startMarker = null;
                              let endMarker = null;
                              let utilityPolyline = null;
                              let currentEditLayer = 'corridor';

                              // Plot Start Coordinates
                              if (hasStart) {
                                startMarker = L.marker([startLat, startLng], { icon: startIcon, draggable: true }).addTo(map).bindPopup("<b>Start Position</b><br/>Drag to reposition.");
                                startMarker.on('dragend', function() {
                                  const position = startMarker.getLatLng();
                                  window.parent.postMessage({ type: 'MARKER_DRAG', target: 'start', lat: position.lat, lng: position.lng }, '*');
                                });
                              }

                              // Plot End Coordinates
                              if (hasEnd) {
                                endMarker = L.marker([endLat, endLng], { icon: endIcon, draggable: true }).addTo(map).bindPopup("<b>End Position</b><br/>Drag to reposition.");
                                endMarker.on('dragend', function() {
                                  const position = endMarker.getLatLng();
                                  window.parent.postMessage({ type: 'MARKER_DRAG', target: 'end', lat: position.lat, lng: position.lng }, '*');
                                });
                              }

                              function calculateHaversineDistance(lat1, lon1, lat2, lon2) {
                                const R = 6371; // Earth's radius in km
                                const dLat = (lat2 - lat1) * Math.PI / 180;
                                const dLon = (lon2 - lon1) * Math.PI / 180;
                                const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
                                          Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * 
                                          Math.sin(dLon/2) * Math.sin(dLon/2);
                                const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
                                return R * c;
                              }

                              let lastRoutedStart = null;
                              let lastRoutedEnd = null;

                               function fetchOSRMRoute(sLat, sLng, eLat, eLng) {
                                const startKey = sLat + "," + sLng;
                                const endKey = eLat + "," + eLng;
                                const middleKey = JSON.stringify(middlePoints);
                                const routeKey = startKey + ";" + middleKey + ";" + endKey;
                                if (window.lastRouteKey === routeKey) {
                                  return;
                                }
                                window.lastRouteKey = routeKey;

                                let queryPoints = sLng + "," + sLat;
                                if (middlePoints && middlePoints.length > 0) {
                                  queryPoints += ";" + middlePoints.map(function(pt) { return pt[1] + "," + pt[0]; }).join(";");
                                }
                                queryPoints += ";" + eLng + "," + eLat;

                                let polylineColor = '#a855f7';
                                let isDash = false;
                                if (currentEditLayer === "cable") {
                                  polylineColor = '#06b6d4';
                                } else if (currentEditLayer === "hdd") {
                                  polylineColor = '#eab308';
                                  isDash = true;
                                } else if (currentEditLayer === "trench") {
                                  polylineColor = '#f97316';
                                }

                                const url = "https://router.project-osrm.org/route/v1/driving/" + queryPoints + "?overview=full&geometries=geojson";
                                fetch(url)
                                  .then(function(r) { return r.json(); })
                                  .then(function(data) {
                                    if (data.routes && data.routes.length > 0) {
                                      const route = data.routes[0];
                                      const distanceKm = (route.distance / 1000).toFixed(2) + " km";
                                      const coords = route.geometry.coordinates.map(function(c) { return [c[1], c[0]]; });
                                      
                                      if (utilityPolyline) {
                                        map.removeLayer(utilityPolyline);
                                      }
                                      utilityPolyline = L.polyline(coords, { 
                                        color: polylineColor, 
                                        weight: 4.5, 
                                        opacity: 0.95, 
                                        lineJoin: "round",
                                        dashArray: isDash ? '5, 5' : null
                                      }).addTo(map);

                                      window.parent.postMessage({
                                        type: "ROUTE_CALCULATED",
                                        distance: distanceKm,
                                        utilityPath: coords
                                      }, "*");
                                    } else {
                                      throw new Error("No route found");
                                    }
                                  })
                                  .catch(function(err) {
                                    console.error("OSRM failed, using Haversine straight line:", err);
                                    const distanceVal = calculateHaversineDistance(sLat, sLng, eLat, eLng);
                                    const distanceKm = distanceVal.toFixed(2) + " km";
                                    const coords = [[sLat, sLng]];
                                    middlePoints.forEach(function(pt) { coords.push([pt[0], pt[1]]); });
                                    coords.push([eLat, eLng]);

                                    if (utilityPolyline) {
                                      map.removeLayer(utilityPolyline);
                                    }
                                    utilityPolyline = L.polyline(coords, { 
                                      color: polylineColor, 
                                      weight: 4.5, 
                                      opacity: 0.8, 
                                      lineJoin: "round",
                                      dashArray: isDash ? '5, 5' : null
                                    }).addTo(map);

                                    window.parent.postMessage({
                                      type: "ROUTE_CALCULATED",
                                      distance: distanceKm,
                                      utilityPath: coords
                                    }, "*");
                                  });
                              }

                              // Plot initial path
                              if (hasStart && hasEnd) {
                                fetchOSRMRoute(startLat, startLng, endLat, endLng);
                              } else {
                                const customUtilityPath = ${JSON.stringify(editingProjectItem.utilityPath ?? [])};
                                if (customUtilityPath && customUtilityPath.length >= 2) {
                                  utilityPolyline = L.polyline(customUtilityPath, { color: '#a855f7', weight: 4.5, opacity: 0.95, lineJoin: 'round' }).addTo(map);
                                }
                              }

                              // Message handler for updates and geocoding zooms
                              window.addEventListener('message', function(e) {
                                if (!e.data) return;
                                
                                if (e.data.type === 'UPDATE_MARKERS') {
                                  const { startLat, startLng, endLat, endLng, utilityPath, gisEditLayer } = e.data;
                                  
                                  if (gisEditLayer) {
                                    currentEditLayer = gisEditLayer;
                                  }
                                  if (e.data.middlePoints) {
                                    middlePoints = e.data.middlePoints;
                                    redrawMiddleMarkers();
                                  }
                                  
                                  // 1. Start marker
                                  if (startLat && startLng) {
                                    const newLatLng = new L.LatLng(startLat, startLng);
                                    if (startMarker) {
                                      startMarker.setLatLng(newLatLng);
                                    } else {
                                      startMarker = L.marker(newLatLng, { icon: startIcon, draggable: true }).addTo(map).bindPopup("<b>Start Position</b><br/>Drag to reposition.");
                                      startMarker.on('dragend', function() {
                                        const position = startMarker.getLatLng();
                                        window.parent.postMessage({ type: 'MARKER_DRAG', target: 'start', lat: position.lat, lng: position.lng }, '*');
                                      });
                                    }
                                  } else if (startMarker) {
                                    map.removeLayer(startMarker);
                                    startMarker = null;
                                  }

                                  // 2. End marker
                                  if (endLat && endLng) {
                                    const newLatLng = new L.LatLng(endLat, endLng);
                                    if (endMarker) {
                                      endMarker.setLatLng(newLatLng);
                                    } else {
                                      endMarker = L.marker(newLatLng, { icon: endIcon, draggable: true }).addTo(map).bindPopup("<b>End Position</b><br/>Drag to reposition.");
                                      endMarker.on('dragend', function() {
                                        const position = endMarker.getLatLng();
                                        window.parent.postMessage({ type: 'MARKER_DRAG', target: 'end', lat: position.lat, lng: position.lng }, '*');
                                      });
                                    }
                                  } else if (endMarker) {
                                    map.removeLayer(endMarker);
                                    endMarker = null;
                                  }

                                  // 3. Routing update
                                  if (startLat && startLng && endLat && endLng) {
                                    // Reset cache key to force redraw
                                    window.lastRouteKey = null;
                                    fetchOSRMRoute(startLat, startLng, endLat, endLng);
                                  } else {
                                    if (utilityPolyline) {
                                      map.removeLayer(utilityPolyline);
                                      utilityPolyline = null;
                                    }
                                    if (utilityPath && utilityPath.length >= 2) {
                                      let polylineColor = '#a855f7';
                                      let isDash = false;
                                      if (currentEditLayer === "cable") {
                                        polylineColor = '#06b6d4';
                                      } else if (currentEditLayer === "hdd") {
                                        polylineColor = '#eab308';
                                        isDash = true;
                                      } else if (currentEditLayer === "trench") {
                                        polylineColor = '#f97316';
                                      }
                                      utilityPolyline = L.polyline(utilityPath, { 
                                        color: polylineColor, 
                                        weight: 4.5, 
                                        opacity: 0.95, 
                                        lineJoin: 'round',
                                        dashArray: isDash ? '5, 5' : null
                                      }).addTo(map);
                                    }
                                  }

                                } else if (e.data.type === 'FLY_TO') {
                                  const { lat, lng } = e.data;
                                  map.setView([lat, lng], 15, { animate: true });
                                  const tempCircle = L.circle([lat, lng], { color: "var(--cyan)", fillColor: '#06b6d4', fillOpacity: 0.15, radius: 150 }).addTo(map);
                                  setTimeout(() => { map.removeLayer(tempCircle); }, 3000);
                                }
                              });

                              // Auto zoom
                              const bounds = [];
                              if (hasStart) bounds.push([startLat, startLng]);
                              if (hasEnd) bounds.push([endLat, endLng]);
                               const customUtilityPath = ${JSON.stringify(editingProjectItem.utilityPath ?? [])};
                              if (customUtilityPath && customUtilityPath.length > 0) customUtilityPath.forEach(pt => bounds.push(pt));
                              
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

                  {/* Drawing Actions & Clear/Undo buttons */}
                  <div style={{ display: "flex", gap: 10 }}>
                    <button
                      type="button"
                      onClick={() => {
                        setProjStartLat("");
                        setProjStartLng("");
                        setProjEndLat("");
                        setProjEndLng("");
                        setUtilityPath([]);
                        setProjDistance("0.00 km");
                        showToast("🧹 Start/End Pins and Corridor path cleared!");
                      }}
                      style={{ width: "100%", background: "rgba(220, 38, 38, 0.08)", border: "1px solid rgba(220, 38, 38, 0.2)", borderRadius: 10, padding: "8px 12px", fontSize: 12, fontWeight: 700, color: "#dc2626", cursor: "pointer", fontFamily: "Outfit, sans-serif" }}
                    >
                      Clear Start/End Pins & Corridor Path
                    </button>
                  </div>

                  {/* Upgraded "How-To GIS Guide" instructional widget */}
                  <div className="glass" style={{ padding: "16px", borderRadius: 16, border: "1px solid var(--border)", background: "var(--surface)", marginTop: 4 }}>
                    <h4 style={{ fontSize: 12, fontWeight: 800, color: "#a78bfa", textTransform: "uppercase", letterSpacing: "0.05em", margin: "0 0 10px", display: "flex", alignItems: "center", gap: 6 }}>
                      <span>📖 Interactive Map Quick Guide</span>
                    </h4>
                    <div style={{ display: "flex", flexDirection: "column", gap: 10, fontSize: 11, color: "var(--dim)", lineHeight: 1.5 }}>
                      <div>
                        <strong style={{ color: "var(--text)", display: "block", marginBottom: 2 }}>📍 Drag & Change Locations:</strong>
                        Grab the <span style={{ color: "#15803d" }}>Green Start Pin</span> or <span style={{ color: "#dc2626" }}>Red End Pin</span> directly on the map with your hand/mouse and drag to change coordinates. Input fields sync automatically!
                      </div>
                      <div>
                        <strong style={{ color: "var(--text)", display: "block", marginBottom: 2 }}>⚡ Place HDD & Terminations:</strong>
                        Select <b>HDD PIN</b> or <b>GRID TERM</b> above, then click anywhere on the map to add yellow dots or blue squares.
                      </div>
                      <div>
                        <strong style={{ color: "var(--text)", display: "block", marginBottom: 2 }}>🛣️ Draw Trenching & Utility Paths:</strong>
                        Select <b>TRENCH LINE</b> or <b>UTILITY LINK</b>, and click step-by-step on the map. They will join together into beautiful, professional lines.
                      </div>
                      <div>
                        <strong style={{ color: "var(--text)", display: "block", marginBottom: 2 }}>⏪ Undo & Clear (Delete Lines):</strong>
                        Use <b>Undo Last Point</b> buttons to erase the last clicked point on a line. Use the red <b>Clear</b> buttons to delete whole paths/pins instantly.
                      </div>
                    </div>
                  </div>
                </div>

                {/* RIGHT COLUMN: PARAMETERS EDITOR FORM */}
                <form onSubmit={handleUpdateProject} style={{ display: "flex", flexDirection: "column", gap: 14 }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    <span style={{ fontSize: 11, fontWeight: 800, color: "var(--dim)", textTransform: "uppercase", letterSpacing: "0.03em" }}>Project parameters</span>
                    <span style={{ fontSize: 10, fontWeight: 700, color: "var(--cyan)", textTransform: "uppercase" }}>Edit Layer: {gisEditLayer}</span>
                  </div>

                  {/* Layer switching tabs */}
                  <div style={{ display: "flex", gap: 6, borderBottom: "1px solid var(--border)", paddingBottom: 8, overflowX: "auto" }}>
                    {[
                      { id: "corridor", label: "Corridor Route" },
                      { id: "cable", label: "Cable Progress" },
                      { id: "hdd", label: "HDD Progress" },
                      { id: "trench", label: "Trench Progress" }
                    ].map(tab => (
                      <button
                        key={tab.id}
                        type="button"
                        onClick={() => setGisEditLayer(tab.id as any)}
                        style={{
                          fontSize: 10,
                          fontWeight: 750,
                          padding: "6px 10px",
                          borderRadius: 8,
                          border: "1px solid",
                          borderColor: gisEditLayer === tab.id ? "var(--cyan)" : "var(--border)",
                          background: gisEditLayer === tab.id ? "rgba(14, 165, 233, 0.08)" : "transparent",
                          color: gisEditLayer === tab.id ? "var(--cyan)" : "var(--dim)",
                          cursor: "pointer",
                          whiteSpace: "nowrap"
                        }}
                      >
                        {tab.label}
                      </button>
                    ))}
                  </div>

                  {gisEditLayer === "corridor" && (
                    <>
                      {/* Project Name */}
                      <div>
                        <label style={{ display: "block", fontSize: 11, fontWeight: 700, color: "var(--dim)", marginBottom: 6, textTransform: "uppercase", letterSpacing: "0.03em" }}>Project Name</label>
                        <input
                          type="text"
                          value={projName}
                          onChange={(e) => setProjName(e.target.value)}
                          required
                          style={{ width: "100%", height: 40, background: "var(--surface)", border: "1px solid var(--border)", borderRadius: 12, padding: "0 14px", color: "var(--text)", fontSize: 13, fontFamily: "Outfit, sans-serif", outline: "none" }}
                        />
                      </div>

                      {/* Code & District */}
                      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                        <div>
                          <label style={{ display: "block", fontSize: 11, fontWeight: 700, color: "var(--dim)", marginBottom: 6, textTransform: "uppercase", letterSpacing: "0.03em" }}>Corridor ID</label>
                          <input
                            type="text"
                            value={projCode}
                            onChange={(e) => setProjCode(e.target.value)}
                            required
                            style={{ width: "100%", height: 40, background: "var(--surface)", border: "1px solid var(--border)", borderRadius: 12, padding: "0 14px", color: "var(--text)", fontSize: 13, fontFamily: "monospace", outline: "none" }}
                          />
                        </div>
                        <div>
                          <label style={{ display: "block", fontSize: 11, fontWeight: 700, color: "var(--dim)", marginBottom: 6, textTransform: "uppercase", letterSpacing: "0.03em" }}>District</label>
                          <input
                            type="text"
                            value={projDistrict}
                            onChange={(e) => setProjDistrict(e.target.value)}
                            required
                            style={{ width: "100%", height: 40, background: "var(--surface)", border: "1px solid var(--border)", borderRadius: 12, padding: "0 14px", color: "var(--text)", fontSize: 13, fontFamily: "Outfit, sans-serif", outline: "none" }}
                          />
                        </div>
                      </div>

                      {/* Distance calculation display */}
                      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                        <div>
                          <label style={{ display: "block", fontSize: 11, fontWeight: 700, color: "var(--dim)", marginBottom: 6, textTransform: "uppercase", letterSpacing: "0.03em" }}>Calculated Corridor Distance</label>
                          <input
                            type="text"
                            value={projDistance}
                            readOnly
                            style={{ width: "100%", height: 40, background: "#f8fafc", border: "1px solid rgba(14, 165, 233, 0.2)", borderRadius: 12, padding: "0 14px", color: "var(--cyan)", fontSize: 14, fontWeight: 800, fontFamily: "monospace", outline: "none" }}
                          />
                        </div>
                        <div>
                          <label style={{ display: "block", fontSize: 11, fontWeight: 700, color: "var(--dim)", marginBottom: 6, textTransform: "uppercase", letterSpacing: "0.03em" }}>Manually Enter Corridor Distance</label>
                          <input
                            type="text"
                            placeholder="e.g. 5.40 km"
                            value={projManualDistance}
                            onChange={(e) => setProjManualDistance(e.target.value)}
                            style={{ width: "100%", height: 40, background: "var(--surface)", border: "1px solid var(--border)", borderRadius: 12, padding: "0 14px", color: "var(--text)", fontSize: 13, fontFamily: "Outfit, sans-serif", outline: "none" }}
                          />
                        </div>
                      </div>

                      {/* Connection Points List */}
                      <div style={{ borderTop: "1px solid var(--border)", paddingTop: 10 }}>
                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                          <span style={{ fontSize: 11, fontWeight: 800, color: "var(--cyan)", textTransform: "uppercase" }}>Connection Points</span>
                          <button
                            type="button"
                            onClick={() => {
                              const lastPt = projMiddlePoints[projMiddlePoints.length - 1] || [parseFloat(projStartLat) || 9.95, parseFloat(projStartLng) || 76.35];
                              setProjMiddlePoints([...projMiddlePoints, [lastPt[0] + 0.001, lastPt[1] + 0.001]]);
                            }}
                            style={{ fontSize: 9, fontWeight: 750, color: "#0ea5e9", background: "rgba(14, 165, 233, 0.08)", border: "1px solid rgba(14, 165, 233, 0.2)", borderRadius: 6, padding: "2px 6px", cursor: "pointer" }}
                          >
                            ➕ Add Connection Point
                          </button>
                        </div>
                        <div style={{ display: "flex", flexDirection: "column", gap: 6, marginTop: 6, maxHeight: 110, overflowY: "auto" }}>
                          {projMiddlePoints.length === 0 ? (
                            <span style={{ fontSize: 10, color: "var(--dim)", fontStyle: "italic" }}>No intermediate connection points added.</span>
                          ) : (
                            projMiddlePoints.map((pt, idx) => (
                              <div key={idx} style={{ display: "grid", gridTemplateColumns: "1.1fr 1.1fr 0.4fr", gap: 6, alignItems: "center" }}>
                                <input
                                  type="number"
                                  step="any"
                                  placeholder="Latitude"
                                  value={pt[0]}
                                  onChange={(e) => {
                                    const val = parseFloat(e.target.value) || 0;
                                    setProjMiddlePoints(projMiddlePoints.map((x, i) => i === idx ? [val, pt[1]] : x));
                                  }}
                                  style={{ height: 28, background: "var(--surface)", border: "1px solid var(--border)", borderRadius: 6, padding: "0 6px", color: "var(--text)", fontSize: 11, fontFamily: "monospace" }}
                                />
                                <input
                                  type="number"
                                  step="any"
                                  placeholder="Longitude"
                                  value={pt[1]}
                                  onChange={(e) => {
                                    const val = parseFloat(e.target.value) || 0;
                                    setProjMiddlePoints(projMiddlePoints.map((x, i) => i === idx ? [pt[0], val] : x));
                                  }}
                                  style={{ height: 28, background: "var(--surface)", border: "1px solid var(--border)", borderRadius: 6, padding: "0 6px", color: "var(--text)", fontSize: 11, fontFamily: "monospace" }}
                                />
                                <button
                                  type="button"
                                  onClick={() => {
                                    setProjMiddlePoints(projMiddlePoints.filter((_, i) => i !== idx));
                                  }}
                                  style={{ height: 28, background: "rgba(239, 68, 68, 0.08)", border: "1px solid rgba(239, 68, 68, 0.2)", borderRadius: 6, color: "#dc2626", cursor: "pointer", fontSize: 10, fontWeight: 700 }}
                                >
                                  Del
                                </button>
                              </div>
                            ))
                          )}
                        </div>
                      </div>

                      {/* Description */}
                      <div>
                        <label style={{ display: "block", fontSize: 11, fontWeight: 700, color: "var(--dim)", marginBottom: 6, textTransform: "uppercase", letterSpacing: "0.03em" }}>Description</label>
                        <textarea
                          value={projDesc}
                          onChange={(e) => setProjDesc(e.target.value)}
                          required
                          rows={2}
                          style={{ width: "100%", background: "var(--surface)", border: "1px solid var(--border)", borderRadius: 12, padding: "10px 14px", color: "var(--text)", fontSize: 13, fontFamily: "Outfit, sans-serif", outline: "none", resize: "none" }}
                        />
                      </div>

                      {/* Start Location Parameters */}
                      <div style={{ borderTop: "1px solid var(--border)", paddingTop: 10 }}>
                        <span style={{ fontSize: 11, fontWeight: 800, color: "#15803d", textTransform: "uppercase" }}>Start Position Parameters</span>
                        <div style={{ marginTop: 6 }}>
                          <label style={{ display: "block", fontSize: 10, color: "var(--dim)", marginBottom: 4, fontWeight: 700 }}>Junction/Station Label</label>
                          <input
                            type="text"
                            value={projStartLabel}
                            onChange={(e) => setProjStartLabel(e.target.value)}
                            required
                            style={{ width: "100%", height: 36, background: "var(--surface)", border: "1px solid var(--border)", borderRadius: 10, padding: "0 12px", color: "var(--text)", fontSize: 12, outline: "none" }}
                          />
                        </div>
                        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginTop: 6 }}>
                          <div>
                            <label style={{ display: "block", fontSize: 10, color: "var(--dim)", marginBottom: 4, fontWeight: 700 }}>Latitude</label>
                            <input
                              type="text"
                              value={projStartLat}
                              onChange={(e) => setProjStartLat(e.target.value)}
                              required
                              style={{ width: "100%", height: 36, background: "var(--surface)", border: "1px solid var(--border)", borderRadius: 10, padding: "0 12px", color: "var(--text)", fontSize: 12, fontFamily: "monospace", outline: "none" }}
                            />
                          </div>
                          <div>
                            <label style={{ display: "block", fontSize: 10, color: "var(--dim)", marginBottom: 4, fontWeight: 700 }}>Longitude</label>
                            <input
                              type="text"
                              value={projStartLng}
                              onChange={(e) => setProjStartLng(e.target.value)}
                              required
                              style={{ width: "100%", height: 36, background: "var(--surface)", border: "1px solid var(--border)", borderRadius: 10, padding: "0 12px", color: "var(--text)", fontSize: 12, fontFamily: "monospace", outline: "none" }}
                            />
                          </div>
                        </div>
                      </div>

                      {/* End Location Parameters */}
                      <div style={{ borderTop: "1px solid var(--border)", paddingTop: 10 }}>
                        <span style={{ fontSize: 11, fontWeight: 800, color: "#dc2626", textTransform: "uppercase" }}>End Position Parameters</span>
                        <div style={{ marginTop: 6 }}>
                          <label style={{ display: "block", fontSize: 10, color: "var(--dim)", marginBottom: 4, fontWeight: 700 }}>Junction/Station Label</label>
                          <input
                            type="text"
                            value={projEndLabel}
                            onChange={(e) => setProjEndLabel(e.target.value)}
                            required
                            style={{ width: "100%", height: 36, background: "var(--surface)", border: "1px solid var(--border)", borderRadius: 10, padding: "0 12px", color: "var(--text)", fontSize: 12, outline: "none" }}
                          />
                        </div>
                        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginTop: 6 }}>
                          <div>
                            <label style={{ display: "block", fontSize: 10, color: "var(--dim)", marginBottom: 4, fontWeight: 700 }}>Latitude</label>
                            <input
                              type="text"
                              value={projEndLat}
                              onChange={(e) => setProjEndLat(e.target.value)}
                              required
                              style={{ width: "100%", height: 36, background: "var(--surface)", border: "1px solid var(--border)", borderRadius: 10, padding: "0 12px", color: "var(--text)", fontSize: 12, fontFamily: "monospace", outline: "none" }}
                            />
                          </div>
                          <div>
                            <label style={{ display: "block", fontSize: 10, color: "var(--dim)", marginBottom: 4, fontWeight: 700 }}>Longitude</label>
                            <input
                              type="text"
                              value={projEndLng}
                              onChange={(e) => setProjEndLng(e.target.value)}
                              required
                              style={{ width: "100%", height: 36, background: "var(--surface)", border: "1px solid var(--border)", borderRadius: 10, padding: "0 12px", color: "var(--text)", fontSize: 12, fontFamily: "monospace", outline: "none" }}
                            />
                          </div>
                        </div>
                      </div>

                      {/* HDD Drilling Default Parameter Settings */}
                      <div style={{ borderTop: "1px solid var(--border)", paddingTop: 10 }}>
                        <span style={{ fontSize: 11, fontWeight: 800, color: "#eab308", textTransform: "uppercase" }}>🕳️ HDD Machine & Sheet Defaults</span>
                        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginTop: 6 }}>
                          <div>
                            <label style={{ display: "block", fontSize: 10, color: "var(--dim)", marginBottom: 4, fontWeight: 700 }}>Default Machine Name/Model</label>
                            <input
                              type="text"
                              value={projHddDefaultMachineName}
                              onChange={(e) => setProjHddDefaultMachineName(e.target.value)}
                              placeholder="e.g. HDD-150 / Ditch Witch"
                              style={{ width: "100%", height: 36, background: "var(--surface)", border: "1px solid var(--border)", borderRadius: 10, padding: "0 12px", color: "var(--text)", fontSize: 12, outline: "none" }}
                            />
                          </div>
                          <div>
                            <label style={{ display: "block", fontSize: 10, color: "var(--dim)", marginBottom: 4, fontWeight: 700 }}>Default Vendor Name</label>
                            <input
                              type="text"
                              value={projHddDefaultVendorName}
                              onChange={(e) => setProjHddDefaultVendorName(e.target.value)}
                              placeholder="e.g. Safe Bore Logistics"
                              style={{ width: "100%", height: 36, background: "var(--surface)", border: "1px solid var(--border)", borderRadius: 10, padding: "0 12px", color: "var(--text)", fontSize: 12, outline: "none" }}
                            />
                          </div>
                          <div>
                            <label style={{ display: "block", fontSize: 10, color: "var(--dim)", marginBottom: 4, fontWeight: 700 }}>Default Tracker / Surveyor</label>
                            <input
                              type="text"
                              value={projHddDefaultTrackerName}
                              onChange={(e) => setProjHddDefaultTrackerName(e.target.value)}
                              placeholder="e.g. Arun Kumar"
                              style={{ width: "100%", height: 36, background: "var(--surface)", border: "1px solid var(--border)", borderRadius: 10, padding: "0 12px", color: "var(--text)", fontSize: 12, outline: "none" }}
                            />
                          </div>
                          <div>
                            <label style={{ display: "block", fontSize: 10, color: "var(--dim)", marginBottom: 4, fontWeight: 700 }}>Default Operator Name</label>
                            <input
                              type="text"
                              value={projHddDefaultOperatorName}
                              onChange={(e) => setProjHddDefaultOperatorName(e.target.value)}
                              placeholder="e.g. Rajesh K."
                              style={{ width: "100%", height: 36, background: "var(--surface)", border: "1px solid var(--border)", borderRadius: 10, padding: "0 12px", color: "var(--text)", fontSize: 12, outline: "none" }}
                            />
                          </div>
                          <div>
                            <label style={{ display: "block", fontSize: 10, color: "var(--dim)", marginBottom: 4, fontWeight: 700 }}>No. of Ducts & Color Specs</label>
                            <input
                              type="text"
                              value={projHddDefaultDuctsInfo}
                              onChange={(e) => setProjHddDefaultDuctsInfo(e.target.value)}
                              placeholder="e.g. 4 ducts (Black/Orange)"
                              style={{ width: "100%", height: 36, background: "var(--surface)", border: "1px solid var(--border)", borderRadius: 10, padding: "0 12px", color: "var(--text)", fontSize: 12, outline: "none" }}
                            />
                          </div>
                          <div>
                            <label style={{ display: "block", fontSize: 10, color: "var(--dim)", marginBottom: 4, fontWeight: 700 }}>Standard Single Rod Length (m)</label>
                            <input
                              type="number"
                              step="0.1"
                              value={projHddDefaultRodLengthM}
                              onChange={(e) => setProjHddDefaultRodLengthM(e.target.value)}
                              placeholder="3.0"
                              style={{ width: "100%", height: 36, background: "var(--surface)", border: "1px solid var(--border)", borderRadius: 10, padding: "0 12px", color: "var(--text)", fontSize: 12, outline: "none" }}
                            />
                          </div>
                        </div>
                      </div>
                    </>
                  )}

                  {gisEditLayer === "cable" && (
                    <>
                      {/* Description */}
                      <div>
                        <label style={{ display: "block", fontSize: 11, fontWeight: 700, color: "var(--dim)", marginBottom: 6, textTransform: "uppercase", letterSpacing: "0.03em" }}>Cable Laying Description</label>
                        <textarea
                          placeholder="Log notes about cable laying progress along this corridor..."
                          value={cableDesc}
                          onChange={(e) => setCableDesc(e.target.value)}
                          rows={2}
                          style={{ width: "100%", background: "var(--surface)", border: "1px solid var(--border)", borderRadius: 12, padding: "10px 14px", color: "var(--text)", fontSize: 13, fontFamily: "Outfit, sans-serif", outline: "none", resize: "none" }}
                        />
                      </div>

                      {/* Coordinates */}
                      <div style={{ borderTop: "1px solid var(--border)", paddingTop: 10 }}>
                        <span style={{ fontSize: 11, fontWeight: 800, color: "var(--cyan)", textTransform: "uppercase" }}>Cable Laying Coordinates</span>
                        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginTop: 8 }}>
                          <div>
                            <label style={{ display: "block", fontSize: 10, color: "var(--dim)", marginBottom: 4, fontWeight: 700 }}>Start Latitude</label>
                            <input
                              type="text"
                              placeholder="e.g. 9.9538"
                              value={cableStartLat}
                              onChange={(e) => setCableStartLat(e.target.value)}
                              style={{ width: "100%", height: 36, background: "var(--surface)", border: "1px solid var(--border)", borderRadius: 10, padding: "0 12px", color: "var(--text)", fontSize: 12, fontFamily: "monospace", outline: "none" }}
                            />
                          </div>
                          <div>
                            <label style={{ display: "block", fontSize: 10, color: "var(--dim)", marginBottom: 4, fontWeight: 700 }}>Start Longitude</label>
                            <input
                              type="text"
                              placeholder="e.g. 76.3428"
                              value={cableStartLng}
                              onChange={(e) => setCableStartLng(e.target.value)}
                              style={{ width: "100%", height: 36, background: "var(--surface)", border: "1px solid var(--border)", borderRadius: 10, padding: "0 12px", color: "var(--text)", fontSize: 12, fontFamily: "monospace", outline: "none" }}
                            />
                          </div>
                        </div>
                        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginTop: 8 }}>
                          <div>
                            <label style={{ display: "block", fontSize: 10, color: "var(--dim)", marginBottom: 4, fontWeight: 700 }}>End Latitude</label>
                            <input
                              type="text"
                              placeholder="e.g. 9.9588"
                              value={cableEndLat}
                              onChange={(e) => setCableEndLat(e.target.value)}
                              style={{ width: "100%", height: 36, background: "var(--surface)", border: "1px solid var(--border)", borderRadius: 10, padding: "0 12px", color: "var(--text)", fontSize: 12, fontFamily: "monospace", outline: "none" }}
                            />
                          </div>
                          <div>
                            <label style={{ display: "block", fontSize: 10, color: "var(--dim)", marginBottom: 4, fontWeight: 700 }}>End Longitude</label>
                            <input
                              type="text"
                              placeholder="e.g. 76.3458"
                              value={cableEndLng}
                              onChange={(e) => setCableEndLng(e.target.value)}
                              style={{ width: "100%", height: 36, background: "var(--surface)", border: "1px solid var(--border)", borderRadius: 10, padding: "0 12px", color: "var(--text)", fontSize: 12, fontFamily: "monospace", outline: "none" }}
                            />
                          </div>
                        </div>
                      </div>

                      {/* Cable Connection Points */}
                      <div style={{ borderTop: "1px solid var(--border)", paddingTop: 10 }}>
                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                          <span style={{ fontSize: 11, fontWeight: 800, color: "var(--cyan)", textTransform: "uppercase" }}>Cable Connection Points</span>
                          <button
                            type="button"
                            onClick={() => {
                              const lastPt = cableMiddlePoints[cableMiddlePoints.length - 1] || [parseFloat(cableStartLat) || 9.95, parseFloat(cableStartLng) || 76.35];
                              setCableMiddlePoints([...cableMiddlePoints, [lastPt[0] + 0.001, lastPt[1] + 0.001]]);
                            }}
                            style={{ fontSize: 9, fontWeight: 750, color: "#0ea5e9", background: "rgba(14, 165, 233, 0.08)", border: "1px solid rgba(14, 165, 233, 0.2)", borderRadius: 6, padding: "2px 6px", cursor: "pointer" }}
                          >
                            ➕ Add Connection Point
                          </button>
                        </div>
                        <div style={{ display: "flex", flexDirection: "column", gap: 6, marginTop: 6, maxHeight: 110, overflowY: "auto" }}>
                          {cableMiddlePoints.length === 0 ? (
                            <span style={{ fontSize: 10, color: "var(--dim)", fontStyle: "italic" }}>No intermediate connection points added.</span>
                          ) : (
                            cableMiddlePoints.map((pt, idx) => (
                              <div key={idx} style={{ display: "grid", gridTemplateColumns: "1.1fr 1.1fr 0.4fr", gap: 6, alignItems: "center" }}>
                                <input
                                  type="number"
                                  step="any"
                                  placeholder="Latitude"
                                  value={pt[0]}
                                  onChange={(e) => {
                                    const val = parseFloat(e.target.value) || 0;
                                    setCableMiddlePoints(cableMiddlePoints.map((x, i) => i === idx ? [val, pt[1]] : x));
                                  }}
                                  style={{ height: 28, background: "var(--surface)", border: "1px solid var(--border)", borderRadius: 6, padding: "0 6px", color: "var(--text)", fontSize: 11, fontFamily: "monospace" }}
                                />
                                <input
                                  type="number"
                                  step="any"
                                  placeholder="Longitude"
                                  value={pt[1]}
                                  onChange={(e) => {
                                    const val = parseFloat(e.target.value) || 0;
                                    setCableMiddlePoints(cableMiddlePoints.map((x, i) => i === idx ? [pt[0], val] : x));
                                  }}
                                  style={{ height: 28, background: "var(--surface)", border: "1px solid var(--border)", borderRadius: 6, padding: "0 6px", color: "var(--text)", fontSize: 11, fontFamily: "monospace" }}
                                />
                                <button
                                  type="button"
                                  onClick={() => {
                                    setCableMiddlePoints(cableMiddlePoints.filter((_, i) => i !== idx));
                                  }}
                                  style={{ height: 28, background: "rgba(239, 68, 68, 0.08)", border: "1px solid rgba(239, 68, 68, 0.2)", borderRadius: 6, color: "#dc2626", cursor: "pointer", fontSize: 10, fontWeight: 700 }}
                                >
                                  Del
                                </button>
                              </div>
                            ))
                          )}
                        </div>
                      </div>
                    </>
                  )}

                  {gisEditLayer === "hdd" && (
                    <>
                      {/* Description */}
                      <div>
                        <label style={{ display: "block", fontSize: 11, fontWeight: 700, color: "var(--dim)", marginBottom: 6, textTransform: "uppercase", letterSpacing: "0.03em" }}>HDD Drilling Description</label>
                        <textarea
                          placeholder="Log notes about HDD crossing progress along this corridor..."
                          value={hddDesc}
                          onChange={(e) => setHddDesc(e.target.value)}
                          rows={2}
                          style={{ width: "100%", background: "var(--surface)", border: "1px solid var(--border)", borderRadius: 12, padding: "10px 14px", color: "var(--text)", fontSize: 13, fontFamily: "Outfit, sans-serif", outline: "none", resize: "none" }}
                        />
                      </div>

                      {/* Coordinates */}
                      <div style={{ borderTop: "1px solid var(--border)", paddingTop: 10 }}>
                        <span style={{ fontSize: 11, fontWeight: 800, color: "var(--cyan)", textTransform: "uppercase" }}>HDD Drilling Coordinates</span>
                        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginTop: 8 }}>
                          <div>
                            <label style={{ display: "block", fontSize: 10, color: "var(--dim)", marginBottom: 4, fontWeight: 700 }}>Start Latitude</label>
                            <input
                              type="text"
                              placeholder="e.g. 9.9538"
                              value={hddStartLat}
                              onChange={(e) => setHddStartLat(e.target.value)}
                              style={{ width: "100%", height: 36, background: "var(--surface)", border: "1px solid var(--border)", borderRadius: 10, padding: "0 12px", color: "var(--text)", fontSize: 12, fontFamily: "monospace", outline: "none" }}
                            />
                          </div>
                          <div>
                            <label style={{ display: "block", fontSize: 10, color: "var(--dim)", marginBottom: 4, fontWeight: 700 }}>Start Longitude</label>
                            <input
                              type="text"
                              placeholder="e.g. 76.3428"
                              value={hddStartLng}
                              onChange={(e) => setHddStartLng(e.target.value)}
                              style={{ width: "100%", height: 36, background: "var(--surface)", border: "1px solid var(--border)", borderRadius: 10, padding: "0 12px", color: "var(--text)", fontSize: 12, fontFamily: "monospace", outline: "none" }}
                            />
                          </div>
                        </div>
                        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginTop: 8 }}>
                          <div>
                            <label style={{ display: "block", fontSize: 10, color: "var(--dim)", marginBottom: 4, fontWeight: 700 }}>End Latitude</label>
                            <input
                              type="text"
                              placeholder="e.g. 9.9588"
                              value={hddEndLat}
                              onChange={(e) => setHddEndLat(e.target.value)}
                              style={{ width: "100%", height: 36, background: "var(--surface)", border: "1px solid var(--border)", borderRadius: 10, padding: "0 12px", color: "var(--text)", fontSize: 12, fontFamily: "monospace", outline: "none" }}
                            />
                          </div>
                          <div>
                            <label style={{ display: "block", fontSize: 10, color: "var(--dim)", marginBottom: 4, fontWeight: 700 }}>End Longitude</label>
                            <input
                              type="text"
                              placeholder="e.g. 76.3458"
                              value={hddEndLng}
                              onChange={(e) => setHddEndLng(e.target.value)}
                              style={{ width: "100%", height: 36, background: "var(--surface)", border: "1px solid var(--border)", borderRadius: 10, padding: "0 12px", color: "var(--text)", fontSize: 12, fontFamily: "monospace", outline: "none" }}
                            />
                          </div>
                        </div>
                      </div>

                      {/* HDD Connection Points */}
                      <div style={{ borderTop: "1px solid var(--border)", paddingTop: 10 }}>
                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                          <span style={{ fontSize: 11, fontWeight: 800, color: "var(--cyan)", textTransform: "uppercase" }}>HDD Connection Points</span>
                          <button
                            type="button"
                            onClick={() => {
                              const lastPt = hddMiddlePoints[hddMiddlePoints.length - 1] || [parseFloat(hddStartLat) || 9.95, parseFloat(hddStartLng) || 76.35];
                              setHddMiddlePoints([...hddMiddlePoints, [lastPt[0] + 0.001, lastPt[1] + 0.001]]);
                            }}
                            style={{ fontSize: 9, fontWeight: 750, color: "#0ea5e9", background: "rgba(14, 165, 233, 0.08)", border: "1px solid rgba(14, 165, 233, 0.2)", borderRadius: 6, padding: "2px 6px", cursor: "pointer" }}
                          >
                            ➕ Add Connection Point
                          </button>
                        </div>
                        <div style={{ display: "flex", flexDirection: "column", gap: 6, marginTop: 6, maxHeight: 110, overflowY: "auto" }}>
                          {hddMiddlePoints.length === 0 ? (
                            <span style={{ fontSize: 10, color: "var(--dim)", fontStyle: "italic" }}>No intermediate connection points added.</span>
                          ) : (
                            hddMiddlePoints.map((pt, idx) => (
                              <div key={idx} style={{ display: "grid", gridTemplateColumns: "1.1fr 1.1fr 0.4fr", gap: 6, alignItems: "center" }}>
                                <input
                                  type="number"
                                  step="any"
                                  placeholder="Latitude"
                                  value={pt[0]}
                                  onChange={(e) => {
                                    const val = parseFloat(e.target.value) || 0;
                                    setHddMiddlePoints(hddMiddlePoints.map((x, i) => i === idx ? [val, pt[1]] : x));
                                  }}
                                  style={{ height: 28, background: "var(--surface)", border: "1px solid var(--border)", borderRadius: 6, padding: "0 6px", color: "var(--text)", fontSize: 11, fontFamily: "monospace" }}
                                />
                                <input
                                  type="number"
                                  step="any"
                                  placeholder="Longitude"
                                  value={pt[1]}
                                  onChange={(e) => {
                                    const val = parseFloat(e.target.value) || 0;
                                    setHddMiddlePoints(hddMiddlePoints.map((x, i) => i === idx ? [pt[0], val] : x));
                                  }}
                                  style={{ height: 28, background: "var(--surface)", border: "1px solid var(--border)", borderRadius: 6, padding: "0 6px", color: "var(--text)", fontSize: 11, fontFamily: "monospace" }}
                                />
                                <button
                                  type="button"
                                  onClick={() => {
                                    setHddMiddlePoints(hddMiddlePoints.filter((_, i) => i !== idx));
                                  }}
                                  style={{ height: 28, background: "rgba(239, 68, 68, 0.08)", border: "1px solid rgba(239, 68, 68, 0.2)", borderRadius: 6, color: "#dc2626", cursor: "pointer", fontSize: 10, fontWeight: 700 }}
                                >
                                  Del
                                </button>
                              </div>
                            ))
                          )}
                        </div>
                      </div>
                    </>
                  )}

                  {gisEditLayer === "trench" && (
                    <>
                      {/* Description */}
                      <div>
                        <label style={{ display: "block", fontSize: 11, fontWeight: 700, color: "var(--dim)", marginBottom: 6, textTransform: "uppercase", letterSpacing: "0.03em" }}>Open Trench Description</label>
                        <textarea
                          placeholder="Log notes about open trenching progress along this corridor..."
                          value={trenchDesc}
                          onChange={(e) => setTrenchDesc(e.target.value)}
                          rows={2}
                          style={{ width: "100%", background: "var(--surface)", border: "1px solid var(--border)", borderRadius: 12, padding: "10px 14px", color: "var(--text)", fontSize: 13, fontFamily: "Outfit, sans-serif", outline: "none", resize: "none" }}
                        />
                      </div>

                      {/* Coordinates */}
                      <div style={{ borderTop: "1px solid var(--border)", paddingTop: 10 }}>
                        <span style={{ fontSize: 11, fontWeight: 800, color: "var(--cyan)", textTransform: "uppercase" }}>Open Trench Coordinates</span>
                        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginTop: 8 }}>
                          <div>
                            <label style={{ display: "block", fontSize: 10, color: "var(--dim)", marginBottom: 4, fontWeight: 700 }}>Start Latitude</label>
                            <input
                              type="text"
                              placeholder="e.g. 9.9538"
                              value={trenchStartLat}
                              onChange={(e) => setTrenchStartLat(e.target.value)}
                              style={{ width: "100%", height: 36, background: "var(--surface)", border: "1px solid var(--border)", borderRadius: 10, padding: "0 12px", color: "var(--text)", fontSize: 12, fontFamily: "monospace", outline: "none" }}
                            />
                          </div>
                          <div>
                            <label style={{ display: "block", fontSize: 10, color: "var(--dim)", marginBottom: 4, fontWeight: 700 }}>Start Longitude</label>
                            <input
                              type="text"
                              placeholder="e.g. 76.3428"
                              value={trenchStartLng}
                              onChange={(e) => setTrenchStartLng(e.target.value)}
                              style={{ width: "100%", height: 36, background: "var(--surface)", border: "1px solid var(--border)", borderRadius: 10, padding: "0 12px", color: "var(--text)", fontSize: 12, fontFamily: "monospace", outline: "none" }}
                            />
                          </div>
                        </div>
                        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginTop: 8 }}>
                          <div>
                            <label style={{ display: "block", fontSize: 10, color: "var(--dim)", marginBottom: 4, fontWeight: 700 }}>End Latitude</label>
                            <input
                              type="text"
                              placeholder="e.g. 9.9588"
                              value={trenchEndLat}
                              onChange={(e) => setTrenchEndLat(e.target.value)}
                              style={{ width: "100%", height: 36, background: "var(--surface)", border: "1px solid var(--border)", borderRadius: 10, padding: "0 12px", color: "var(--text)", fontSize: 12, fontFamily: "monospace", outline: "none" }}
                            />
                          </div>
                          <div>
                            <label style={{ display: "block", fontSize: 10, color: "var(--dim)", marginBottom: 4, fontWeight: 700 }}>End Longitude</label>
                            <input
                              type="text"
                              placeholder="e.g. 76.3458"
                              value={trenchEndLng}
                              onChange={(e) => setTrenchEndLng(e.target.value)}
                              style={{ width: "100%", height: 36, background: "var(--surface)", border: "1px solid var(--border)", borderRadius: 10, padding: "0 12px", color: "var(--text)", fontSize: 12, fontFamily: "monospace", outline: "none" }}
                            />
                          </div>
                        </div>
                      </div>

                      {/* Trench Connection Points */}
                      <div style={{ borderTop: "1px solid var(--border)", paddingTop: 10 }}>
                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                          <span style={{ fontSize: 11, fontWeight: 800, color: "var(--cyan)", textTransform: "uppercase" }}>Trench Connection Points</span>
                          <button
                            type="button"
                            onClick={() => {
                              const lastPt = trenchMiddlePoints[trenchMiddlePoints.length - 1] || [parseFloat(trenchStartLat) || 9.95, parseFloat(trenchStartLng) || 76.35];
                              setTrenchMiddlePoints([...trenchMiddlePoints, [lastPt[0] + 0.001, lastPt[1] + 0.001]]);
                            }}
                            style={{ fontSize: 9, fontWeight: 750, color: "#0ea5e9", background: "rgba(14, 165, 233, 0.08)", border: "1px solid rgba(14, 165, 233, 0.2)", borderRadius: 6, padding: "2px 6px", cursor: "pointer" }}
                          >
                            ➕ Add Connection Point
                          </button>
                        </div>
                        <div style={{ display: "flex", flexDirection: "column", gap: 6, marginTop: 6, maxHeight: 110, overflowY: "auto" }}>
                          {trenchMiddlePoints.length === 0 ? (
                            <span style={{ fontSize: 10, color: "var(--dim)", fontStyle: "italic" }}>No intermediate connection points added.</span>
                          ) : (
                            trenchMiddlePoints.map((pt, idx) => (
                              <div key={idx} style={{ display: "grid", gridTemplateColumns: "1.1fr 1.1fr 0.4fr", gap: 6, alignItems: "center" }}>
                                <input
                                  type="number"
                                  step="any"
                                  placeholder="Latitude"
                                  value={pt[0]}
                                  onChange={(e) => {
                                    const val = parseFloat(e.target.value) || 0;
                                    setTrenchMiddlePoints(trenchMiddlePoints.map((x, i) => i === idx ? [val, pt[1]] : x));
                                  }}
                                  style={{ height: 28, background: "var(--surface)", border: "1px solid var(--border)", borderRadius: 6, padding: "0 6px", color: "var(--text)", fontSize: 11, fontFamily: "monospace" }}
                                />
                                <input
                                  type="number"
                                  step="any"
                                  placeholder="Longitude"
                                  value={pt[1]}
                                  onChange={(e) => {
                                    const val = parseFloat(e.target.value) || 0;
                                    setTrenchMiddlePoints(trenchMiddlePoints.map((x, i) => i === idx ? [pt[0], val] : x));
                                  }}
                                  style={{ height: 28, background: "var(--surface)", border: "1px solid var(--border)", borderRadius: 6, padding: "0 6px", color: "var(--text)", fontSize: 11, fontFamily: "monospace" }}
                                />
                                <button
                                  type="button"
                                  onClick={() => {
                                    setTrenchMiddlePoints(trenchMiddlePoints.filter((_, i) => i !== idx));
                                  }}
                                  style={{ height: 28, background: "rgba(239, 68, 68, 0.08)", border: "1px solid rgba(239, 68, 68, 0.2)", borderRadius: 6, color: "#dc2626", cursor: "pointer", fontSize: 10, fontWeight: 700 }}
                                >
                                  Del
                                </button>
                              </div>
                            ))
                          )}
                        </div>
                      </div>
                    </>
                  )}

                  {/* Submit Action Buttons */}
                  <div style={{ display: "flex", gap: 12, borderTop: "1px solid var(--border)", paddingTop: 14, marginTop: 6 }}>
                    <button
                      type="button"
                      onClick={() => setEditingProjectItem(null)}
                      style={{ flex: 0.8, minHeight: 44, background: "var(--surface)", border: "1px solid var(--border)", borderRadius: 12, color: "var(--dim)", fontSize: 13, fontWeight: 750, cursor: "pointer", fontFamily: "Outfit, sans-serif" }}
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      style={{ flex: 1.2, minHeight: 44, background: "linear-gradient(135deg, #06b6d4 0%, #7c3aed 100%)", border: "none", borderRadius: 12, color: "var(--text)", fontSize: 13, fontWeight: 800, cursor: "pointer", display: "flex", alignItems: "center", justifyItems: "center", justifyContent: "center", gap: 6, boxShadow: "0 4px 15px rgba(6, 182, 212, 0.25)" }}
                    >
                      ✓ Save Project & GIS
                    </button>
                  </div>
                </form>

              </div>
            </div>
          </div>
        );
      })()}

      {/* Credentials Modal */}
      {approvedCreds && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(15, 23, 42, 0.35)", backdropFilter: "blur(8px)", display: "flex", alignItems: "center", justifyContent: "center", padding: 20, zIndex: 1000, animation: "fadeIn 0.2s ease" }}>
          <div className="glass glow-cyan" style={{ width: "100%", maxWidth: 400, padding: 30, background: "linear-gradient(135deg, #ffffff 0%, #f8fafc 100%)", borderRadius: 24, textAlign: "center", border: "1px solid rgba(14, 165, 233, 0.3)" }}>
            <div style={{ width: 56, height: 56, borderRadius: "50%", background: "rgba(14, 165, 233, 0.08)", border: "1px solid rgba(14, 165, 233, 0.3)", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 16px" }}>
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#06b6d4" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
            </div>
            <h3 style={{ fontSize: 20, fontWeight: 800, color: "var(--text)", marginBottom: 8 }}>Credentials Active!</h3>
            <p style={{ fontSize: 13, color: "var(--dim)", marginBottom: 20, lineHeight: 1.5 }}>
              Account is active. The credentials have been sent via email from <strong style={{ color: "var(--cyan)" }}>ajipaul96@gmail.com</strong>! You can also copy them below:
            </p>
            
            <div style={{ background: "#ffffff", border: "1px solid var(--border)", borderRadius: 16, padding: 18, marginBottom: 24, textAlign: "left", display: "flex", flexDirection: "column", gap: 12 }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <div>
                  <span style={{ fontSize: 10, fontWeight: 700, color: "var(--dim)", textTransform: "uppercase", letterSpacing: "0.08em" }}>Login Email</span>
                  <p style={{ fontSize: 14, fontFamily: "monospace", color: "var(--text)", margin: "2px 0 0" }}>{approvedCreds.email}</p>
                </div>
                <button onClick={() => { navigator.clipboard.writeText(approvedCreds.email); showToast("📋 Email copied!"); }} style={{ background: "rgba(6,182,212,0.1)", border: "1px solid rgba(14, 165, 233, 0.2)", borderRadius: 8, padding: "4px 8px", fontSize: 11, fontWeight: 600, color: "var(--cyan)", cursor: "pointer", fontFamily: "Outfit, sans-serif" }}>Copy</button>
              </div>
              <div style={{ height: 1, background: "var(--surface)" }} />
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <div>
                  <span style={{ fontSize: 10, fontWeight: 700, color: "var(--dim)", textTransform: "uppercase", letterSpacing: "0.08em" }}>Password</span>
                  <p style={{ fontSize: 16, fontFamily: "monospace", fontWeight: 800, color: "#a78bfa", margin: "2px 0 0", letterSpacing: "1px" }}>{approvedCreds.password}</p>
                </div>
                <button onClick={() => { navigator.clipboard.writeText(approvedCreds.password); showToast("📋 Password copied!"); }} style={{ background: "rgba(167,139,250,0.1)", border: "1px solid rgba(124, 58, 237, 0.2)", borderRadius: 8, padding: "4px 8px", fontSize: 11, fontWeight: 600, color: "#a78bfa", cursor: "pointer", fontFamily: "Outfit, sans-serif" }}>Copy</button>
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

      {/* ADMINISTRATIVE CREATE USER MODAL */}
      {isCreateModalOpen && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(15, 23, 42, 0.35)", backdropFilter: "blur(8px)", display: "flex", alignItems: "center", justifyContent: "center", padding: 20, zIndex: 1100, animation: "fadeIn 0.2s ease" }}>
          <div className="glass" style={{ width: "100%", maxWidth: 420, padding: "28px 24px", background: "linear-gradient(135deg, #ffffff 0%, #f8fafc 100%)", borderRadius: 24, border: "1px solid var(--border)", boxShadow: "0 24px 64px rgba(0, 0, 0, 0.7)", color: "var(--text)" }}>
            
            {/* Modal Header */}
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 20 }}>
              <h3 style={{ fontSize: 18, fontWeight: 900, letterSpacing: "-0.02em", margin: 0 }}>Add New Member</h3>
              <button onClick={() => setIsCreateModalOpen(false)} style={{ background: "var(--border)", border: "1px solid var(--border)", width: 32, height: 32, borderRadius: "50%", color: "var(--dim)", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}>
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
              </button>
            </div>

            <form onSubmit={handleCreateUser} style={{ display: "flex", flexDirection: "column", gap: 14 }}>
              {/* Name field */}
              <div>
                <label style={{ display: "block", fontSize: 11, fontWeight: 700, color: "var(--dim)", marginBottom: 6, textTransform: "uppercase", letterSpacing: "0.03em" }}>Display Name</label>
                <input
                  type="text"
                  placeholder="e.g. John Doe"
                  value={createName}
                  onChange={(e) => setCreateName(e.target.value)}
                  required
                  style={{ width: "100%", height: 44, background: "var(--surface)", border: "1px solid var(--border)", borderRadius: 12, padding: "0 14px", color: "var(--text)", fontSize: 14, fontFamily: "Outfit, sans-serif", outline: "none" }}
                />
              </div>

              {/* Email field */}
              <div>
                <label style={{ display: "block", fontSize: 11, fontWeight: 700, color: "var(--dim)", marginBottom: 6, textTransform: "uppercase", letterSpacing: "0.03em" }}>Email Address</label>
                <input
                  type="email"
                  placeholder="e.g. john@telgo.com"
                  value={createEmail}
                  onChange={(e) => setCreateEmail(e.target.value)}
                  required
                  style={{ width: "100%", height: 44, background: "var(--surface)", border: "1px solid var(--border)", borderRadius: 12, padding: "0 14px", color: "var(--text)", fontSize: 14, fontFamily: "monospace", outline: "none" }}
                />
              </div>

              {/* Password field */}
              <div>
                <label style={{ display: "block", fontSize: 11, fontWeight: 700, color: "var(--dim)", marginBottom: 6, textTransform: "uppercase", letterSpacing: "0.03em" }}>Password</label>
                <input
                  type="password"
                  placeholder="Min 6 characters"
                  value={createPassword}
                  onChange={(e) => setCreatePassword(e.target.value)}
                  required
                  minLength={6}
                  style={{ width: "100%", height: 44, background: "var(--surface)", border: "1px solid var(--border)", borderRadius: 12, padding: "0 14px", color: "var(--text)", fontSize: 14, outline: "none" }}
                />
              </div>

              {/* Role selector field */}
              <div>
                <label style={{ display: "block", fontSize: 11, fontWeight: 700, color: "var(--dim)", marginBottom: 6, textTransform: "uppercase", letterSpacing: "0.03em" }}>Security & Operations Role</label>
                <select
                  value={createRole}
                  onChange={(e) => setCreateRole(e.target.value)}
                  style={{ width: "100%", height: 44, background: "var(--bg)", border: "1px solid var(--border)", borderRadius: 12, padding: "0 14px", color: "var(--text)", fontSize: 14, outline: "none", cursor: "pointer", fontFamily: "Outfit, sans-serif" }}
                >
                  <option value="supervisor">Supervisor (Field Engineer)</option>
                  <option value="client">Client (KSEB / Board Member)</option>
                  <option value="finance">Finance Team Member</option>
                  <option value="admin">Administrator</option>
                </select>
              </div>

              {/* Action Buttons Row */}
              <div style={{ display: "flex", flexDirection: "column", gap: 10, marginTop: 14 }}>
                <button
                  type="submit"
                  disabled={isCreatingUser}
                  style={{ width: "100%", minHeight: 44, background: "linear-gradient(135deg, #06b6d4 0%, #7c3aed 100%)", border: "none", borderRadius: 12, color: "var(--text)", fontSize: 14, fontWeight: 750, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: 6, boxShadow: "0 4px 15px rgba(6, 182, 212, 0.2)" }}
                >
                  {isCreatingUser ? <div className="spinner" style={{ width: 14, height: 14 }} /> : "✓ Create Member Profile"}
                </button>
              </div>

            </form>
          </div>
        </div>
      )}

      {/* ADMINISTRATIVE USER MANAGEMENT MODAL */}
      {selectedUser && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(15, 23, 42, 0.35)", backdropFilter: "blur(8px)", display: "flex", alignItems: "center", justifyContent: "center", padding: 20, zIndex: 1100, animation: "fadeIn 0.2s ease" }}>
          <div className="glass" style={{ width: "100%", maxWidth: 420, padding: "28px 24px", background: "linear-gradient(135deg, #ffffff 0%, #f8fafc 100%)", borderRadius: 24, border: "1px solid var(--border)", boxShadow: "0 24px 64px rgba(0, 0, 0, 0.7)", color: "var(--text)" }}>
            
            {/* Modal Header */}
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 20 }}>
              <h3 style={{ fontSize: 18, fontWeight: 900, letterSpacing: "-0.02em", margin: 0 }}>Manage Crew Profile</h3>
              <button onClick={() => setSelectedUser(null)} style={{ background: "var(--border)", border: "1px solid var(--border)", width: 32, height: 32, borderRadius: "50%", color: "var(--dim)", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}>
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
                color: "var(--text)",
                fontSize: 24,
                fontWeight: 800,
                border: "2px solid var(--border)",
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
                <label style={{ display: "block", fontSize: 11, fontWeight: 700, color: "var(--dim)", marginBottom: 6, textTransform: "uppercase", letterSpacing: "0.03em" }}>Display Name</label>
                <input
                  type="text"
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  required
                  style={{ width: "100%", height: 44, background: "var(--surface)", border: "1px solid var(--border)", borderRadius: 12, padding: "0 14px", color: "var(--text)", fontSize: 14, fontFamily: "Outfit, sans-serif", outline: "none" }}
                />
              </div>

              {/* Email field */}
              <div>
                <label style={{ display: "block", fontSize: 11, fontWeight: 700, color: "var(--dim)", marginBottom: 6, textTransform: "uppercase", letterSpacing: "0.03em" }}>Email Address</label>
                <input
                  type="email"
                  value={editEmail}
                  onChange={(e) => setEditEmail(e.target.value)}
                  required
                  style={{ width: "100%", height: 44, background: "var(--surface)", border: "1px solid var(--border)", borderRadius: 12, padding: "0 14px", color: "var(--text)", fontSize: 14, fontFamily: "monospace", outline: "none" }}
                />
              </div>

              {/* Role selector field */}
              <div>
                <label style={{ display: "block", fontSize: 11, fontWeight: 700, color: "var(--dim)", marginBottom: 6, textTransform: "uppercase", letterSpacing: "0.03em" }}>Security & Operations Role</label>
                <select
                  value={editRole}
                  onChange={(e) => setEditRole(e.target.value)}
                  style={{ width: "100%", height: 44, background: "var(--bg)", border: "1px solid var(--border)", borderRadius: 12, padding: "0 14px", color: "var(--text)", fontSize: 14, outline: "none", cursor: "pointer", fontFamily: "Outfit, sans-serif" }}
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
                  <span style={{ fontSize: 10, color: "var(--muted)", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.05em" }}>Operational ID</span>
                  <p style={{ margin: "2px 0 0", fontSize: 13, fontWeight: 700, fontFamily: "monospace", color: "var(--dim)" }}>{(selectedUser as any).login_id}</p>
                </div>
                <div>
                  <span style={{ fontSize: 10, color: "var(--muted)", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.05em" }}>Status</span>
                  <p style={{ margin: "2px 0 0", fontSize: 13, fontWeight: 800, color: editStatus === "blocked" ? "#f87171" : "#4ade80", textTransform: "uppercase" }}>{editStatus}</p>
                </div>
              </div>

              {/* Action Buttons Row */}
              <div style={{ display: "flex", flexDirection: "column", gap: 10, marginTop: 14 }}>
                <button
                  type="submit"
                  disabled={savingUser}
                  style={{ width: "100%", minHeight: 44, background: "linear-gradient(135deg, #06b6d4 0%, #7c3aed 100%)", border: "none", borderRadius: 12, color: "var(--text)", fontSize: 14, fontWeight: 750, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: 6, boxShadow: "0 4px 15px rgba(6, 182, 212, 0.2)" }}
                >
                  {savingUser ? <div className="spinner" style={{ width: 14, height: 14 }} /> : "✓ Apply & Save Changes"}
                </button>

                <div style={{ display: "flex", gap: 10 }}>
                  {/* Resend credentials button */}
                  <button
                    type="button"
                    onClick={() => { resendCredentials(selectedUser.id); setSelectedUser(null); }}
                    style={{ flex: 1, minHeight: 40, background: "rgba(14, 165, 233, 0.08)", border: "1px solid rgba(14, 165, 233, 0.2)", borderRadius: 10, color: "var(--cyan)", fontSize: 13, fontWeight: 700, cursor: "pointer" }}
                  >
                    🔑 Resend Mail
                  </button>

                  {/* Terminate Access Button */}
                  <button
                    type="button"
                    onClick={handleTerminateUser}
                    style={{ flex: 1, minHeight: 40, background: "rgba(220, 38, 38, 0.08)", border: "1px solid rgba(239, 68, 68, 0.2)", borderRadius: 10, color: "#dc2626", fontSize: 13, fontWeight: 700, cursor: "pointer" }}
                  >
                    🚫 Terminate
                  </button>
                </div>
              </div>

            </form>
          </div>
        </div>
      )}

      {/* FULL-SCREEN IMAGE PREVIEW OVERLAY */}
      {adminActiveImagePreview && (
        <div 
          onClick={() => setAdminActiveImagePreview(null)}
          style={{
            position: "fixed",
            inset: 0,
            background: "var(--surface)",
            backdropFilter: "blur(12px)",
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            padding: 24,
            zIndex: 12000,
            cursor: "zoom-out",
            animation: "fadeIn 0.2s ease"
          }}
        >
          <div style={{ position: "absolute", top: 20, right: 20, display: "flex", gap: 12 }}>
            <button
              onClick={(e) => {
                e.stopPropagation();
                const link = document.createElement("a");
                link.href = adminActiveImagePreview;
                link.download = `telgo_receipt_${Date.now()}.png`;
                document.body.appendChild(link);
                link.click();
                document.body.removeChild(link);
              }}
              style={{
                background: "var(--surface)",
                border: "1px solid var(--border)",
                borderRadius: 10,
                color: "var(--text)",
                fontSize: 12,
                fontWeight: 750,
                padding: "8px 16px",
                cursor: "pointer",
                fontFamily: "Outfit, sans-serif"
              }}
            >
              📥 Download Receipt
            </button>
            <button 
              onClick={() => setAdminActiveImagePreview(null)}
              style={{
                width: 38,
                height: 38,
                borderRadius: "50%",
                background: "var(--surface)",
                border: "1px solid var(--border)",
                color: "var(--text)",
                fontSize: 18,
                fontWeight: "bold",
                cursor: "pointer",
                display: "flex",
                alignItems: "center",
                justifyContent: "center"
              }}
            >
              ✕
            </button>
          </div>
          <div style={{ maxWidth: "90%", maxHeight: "80%", display: "flex", alignItems: "center", justifyContent: "center", border: "1px solid var(--border)", borderRadius: 16, overflow: "hidden", background: "var(--bg)", boxShadow: "0 24px 70px rgba(0,0,0,0.8)" }}>
            <img 
              src={adminActiveImagePreview} 
              alt="High resolution receipt / attachment preview" 
              style={{ maxWidth: "100%", maxHeight: "80vh", objectFit: "contain" }}
              onClick={(e) => e.stopPropagation()}
            />
          </div>
          <p style={{ color: "var(--dim)", fontSize: 13, marginTop: 16, fontWeight: 500, letterSpacing: "0.03em" }}>Click anywhere outside to exit full-screen view</p>
        </div>
      )}

      {/* Toast */}
      {toast && (
        <div style={{ position: "fixed", bottom: 24, left: 16, right: 16, background: "#1e293b", border: "1px solid var(--border)", borderRadius: 14, padding: "14px 18px", fontSize: 14, fontWeight: 600, color: "var(--text)", zIndex: 10000, textAlign: "center", boxShadow: "0 8px 32px rgba(0,0,0,0.5)", animation: "fadeIn 0.3s ease" }}>
          {toast}
        </div>
      )}
    </div>
  );
}


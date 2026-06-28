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

  const [isSiteStorageOpen, setIsSiteStorageOpen] = useState(false);
  const [selectedStorageProjectId, setSelectedStorageProjectId] = useState("");
  const [storageDate, setStorageDate] = useState(new Date().toISOString().slice(0, 10));
  const [storageMaterialName, setStorageMaterialName] = useState("Cable");
  const [customMaterialName, setCustomMaterialName] = useState("");
  const [storagePhoto, setStoragePhoto] = useState("");
  const [storageQuantity, setStorageQuantity] = useState("");
  const [storageLocation, setStorageLocation] = useState("");
  const [storageNotes, setStorageNotes] = useState("");
  const [savingMaterial, setSavingMaterial] = useState(false);

  useEffect(() => {
    if (projectsList.length > 0 && !selectedStorageProjectId) {
      setSelectedStorageProjectId(projectsList[0].id);
    }
  }, [projectsList, selectedStorageProjectId]);

  // Supervisor Clarification Inbox States
  const [isClarificationInboxOpen, setIsClarificationInboxOpen] = useState(false);
  const [mySubmittedReports, setMySubmittedReports] = useState<any[]>([]);
  const [loadingMyReports, setLoadingMyReports] = useState(false);
  const [selectedClarificationReport, setSelectedClarificationReport] = useState<any | null>(null);
  
  // Chatting States
  const [supervisorChatMessages, setSupervisorChatMessages] = useState<any[]>([]);
  const [loadingSupervisorChat, setLoadingSupervisorChat] = useState(false);
  const [newSupervisorMessage, setNewSupervisorMessage] = useState("");

  // Correction Draft States
  const [correctiveWipTrenching, setCorrectiveWipTrenching] = useState("");
  const [correctiveWipHdd, setCorrectiveWipHdd] = useState("");
  const [correctiveFuelExpenses, setCorrectiveFuelExpenses] = useState("");
  const [correctiveTravelExpenses, setCorrectiveTravelExpenses] = useState("");
  const [correctiveRoomRent, setCorrectiveRoomRent] = useState("");
  const [correctiveToolRent, setCorrectiveToolRent] = useState("");
  const [correctiveRoomReceipt, setCorrectiveRoomReceipt] = useState("");
  const [correctiveToolReceipt, setCorrectiveToolReceipt] = useState("");
  const [resolvingClarification, setResolvingClarification] = useState(false);
  const [activeExpenseCategory, setActiveExpenseCategory] = useState<string>("fuel");
  const [activeWipMetric, setActiveWipMetric] = useState<string>("trenching");
  const [activeClearanceCategory, setActiveClearanceCategory] = useState<string>("pwd");
  const [activeRequestCategory, setActiveRequestCategory] = useState<string>("daily_work");

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
  const [reportStep, setReportStep] = useState(1); // 1: Select/Labor, 2: WIP Progress, 3: Clearances, 4: Requests, 5: Review
  const [reportProjectId, setReportProjectId] = useState("");
  const [reportDate, setReportDate] = useState("");
  
  // Step A: Labor & Expenses
  const [laborCount, setLaborCount] = useState<number | "">(0);
  const [workerWageRate, setWorkerWageRate] = useState<number | "">(900);
  const [includeSupervisor, setIncludeSupervisor] = useState(false);
  const [supervisorWageRate, setSupervisorWageRate] = useState<number | "">(1200);
  const [supervisorNarration, setSupervisorNarration] = useState("");
  const [laborWagesNarration, setLaborWagesNarration] = useState("");

  // Overtime workers array
  const [otWorkers, setOtWorkers] = useState<any[]>([]);

  // Expenses lists (Multi-entry)
  const [fuelExpensesList, setFuelExpensesList] = useState<any[]>([]);
  const [travelExpensesList, setTravelExpensesList] = useState<any[]>([]);
  const [roomRentList, setRoomRentList] = useState<any[]>([]);
  const [toolRentList, setToolRentList] = useState<any[]>([]);
  const [otherExpensesList, setOtherExpensesList] = useState<any[]>([]);

  // Step B: WIP progress (Value + Narration + Photo for each)
  const [wipTrenchingValue, setWipTrenchingValue] = useState("");
  const [wipTrenchingNarration, setWipTrenchingNarration] = useState("");
  const [wipTrenchingPhoto, setWipTrenchingPhoto] = useState("");
  const [trenchingStartLat, setTrenchingStartLat] = useState("");
  const [trenchingStartLng, setTrenchingStartLng] = useState("");
  const [trenchingEndLat, setTrenchingEndLat] = useState("");
  const [trenchingEndLng, setTrenchingEndLng] = useState("");

  const [wipHddValue, setWipHddValue] = useState("");
  const [wipHddNarration, setWipHddNarration] = useState("");
  const [wipHddPhoto, setWipHddPhoto] = useState("");

  const [wipCableLayingValue, setWipCableLayingValue] = useState("");
  const [wipCableLayingNarration, setWipCableLayingNarration] = useState("");
  const [wipCableLayingPhoto, setWipCableLayingPhoto] = useState("");
  const [cableLayingStartLat, setCableLayingStartLat] = useState("");
  const [cableLayingStartLng, setCableLayingStartLng] = useState("");
  const [cableLayingEndLat, setCableLayingEndLat] = useState("");
  const [cableLayingEndLng, setCableLayingEndLng] = useState("");

  const [wipCableMoundingValue, setWipCableMoundingValue] = useState("");
  const [wipCableMoundingNarration, setWipCableMoundingNarration] = useState("");
  const [wipCableMoundingPhoto, setWipCableMoundingPhoto] = useState("");

  const [wipJoiningValue, setWipJoiningValue] = useState("");
  const [wipJoiningNarration, setWipJoiningNarration] = useState("");
  const [wipJoiningPhoto, setWipJoiningPhoto] = useState("");

  const [wipRmuValue, setWipRmuValue] = useState("");
  const [wipRmuNarration, setWipRmuNarration] = useState("");
  const [wipRmuPhoto, setWipRmuPhoto] = useState("");

  const [wipTerminationsValue, setWipTerminationsValue] = useState("");
  const [wipTerminationsNarration, setWipTerminationsNarration] = useState("");
  const [wipTerminationsPhoto, setWipTerminationsPhoto] = useState("");

  const [terminationGpsLat, setTerminationGpsLat] = useState("");
  const [terminationGpsLng, setTerminationGpsLng] = useState("");
  const [startGpsLat, setStartGpsLat] = useState("");
  const [startGpsLng, setStartGpsLng] = useState("");

  // Step C: Clearances
  const [pwdClearance, setPwdClearance] = useState("None");
  const [pwdReceipt, setPwdReceipt] = useState("");
  const [ksebClearance, setKsebClearance] = useState("None");
  const [ksebReceipt, setKsebReceipt] = useState("");
  const [nhClearance, setNhClearance] = useState("None");
  const [nhReceipt, setNhReceipt] = useState("");
  const [panchayatClearance, setPanchayatClearance] = useState("None");
  const [panchayatReceipt, setPanchayatReceipt] = useState("");

  // Step D: Operational Requests & Notes (Problems, plans, finance, etc.)
  const [reqDailyWorkReport, setReqDailyWorkReport] = useState("");
  const [reqProblems, setReqProblems] = useState("");
  const [reqPlans, setReqPlans] = useState("");
  const [reqFinanceAmount, setReqFinanceAmount] = useState("");
  const [reqFinanceNarration, setReqFinanceNarration] = useState("");
  const [reqFinanceReceipt, setReqFinanceReceipt] = useState("");
  const [reqAdminConcerns, setReqAdminConcerns] = useState("");

  const [submittingReport, setSubmittingReport] = useState(false);

  // HDD Rod-by-Rod dynamic logs and configurations
  const [hddDrillingLogs, setHddDrillingLogs] = useState<any[]>([]);
  const [hddMachineName, setHddMachineName] = useState("");
  const [hddVendorName, setHddVendorName] = useState("");
  const [hddTrackerName, setHddTrackerName] = useState("");
  const [hddOperatorName, setHddOperatorName] = useState("");
  const [hddDuctsInfo, setHddDuctsInfo] = useState("");
  const [hddRodLengthM, setHddRodLengthM] = useState(3.0);

  const [trenchingRoutePath, setTrenchingRoutePath] = useState<[number, number][] | null>(null);
  const [cableLayingRoutePath, setCableLayingRoutePath] = useState<[number, number][] | null>(null);

  // Listen for pin drops from Trenching & Cable Laying pinpoint maps
  useEffect(() => {
    const handleMapMessage = (event: MessageEvent) => {
      const data = event.data;
      if (!data || typeof data !== "object") return;

      if (data.source === "trenching-pinpoint") {
        if (data.type === "start") {
          setTrenchingStartLat(String(data.lat));
          setTrenchingStartLng(String(data.lng));
        } else if (data.type === "end") {
          setTrenchingEndLat(String(data.lat));
          setTrenchingEndLng(String(data.lng));
        } else if (data.type === "route_path") {
          setTrenchingRoutePath(data.path);
        }
      } else if (data.source === "cable-laying-pinpoint") {
        if (data.type === "start") {
          setCableLayingStartLat(String(data.lat));
          setCableLayingStartLng(String(data.lng));
        } else if (data.type === "end") {
          setCableLayingEndLat(String(data.lat));
          setCableLayingEndLng(String(data.lng));
        } else if (data.type === "route_path") {
          setCableLayingRoutePath(data.path);
        }
      }
    };

    window.addEventListener("message", handleMapMessage);
    return () => window.removeEventListener("message", handleMapMessage);
  }, []);

  // Auto-calculate HDD total length progress based on rod logs count and rod length
  useEffect(() => {
    if (activeWipMetric === "hdd") {
      const totalLen = hddDrillingLogs.length * hddRodLengthM;
      setWipHddValue(totalLen > 0 ? totalLen.toFixed(1) : "");
    }
  }, [hddDrillingLogs, hddRodLengthM, activeWipMetric]);

  // Dynamically draw the bore path grid graph on HTML5 Canvas
  useEffect(() => {
    const canvas = document.getElementById("hddBoreCanvas") as HTMLCanvasElement;
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

    if (!hddDrillingLogs || hddDrillingLogs.length === 0) {
      ctx.fillStyle = "#94a3b8";
      ctx.font = "italic 11px Outfit, sans-serif";
      ctx.textAlign = "center";
      ctx.fillText("No rod logs entered. Start adding logs to plot the graph.", width / 2 + 10, height / 2 + 10);
      ctx.textAlign = "left";
      return;
    }

    // Process logs to get coordinates
    const points = hddDrillingLogs.map((log, index) => {
      const dist = (index + 1) * hddRodLengthM;
      const depth = Number(log.depth || 0);
      return { dist, depth, strata: log.strata, crossing: log.crossing, rodNo: index + 1 };
    });

    const maxDist = Math.max(50, ...points.map(p => p.dist));
    const maxDepth = Math.max(6, ...points.map(p => p.depth));

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

  }, [hddDrillingLogs, hddRodLengthM, reportStep, activeWipMetric]);

  // Dynamic cropper states
  const [cropperImage, setCropperImage] = useState<string | null>(null);
  const [cropperActive, setCropperActive] = useState(false);
  const [cropperCallback, setCropperCallback] = useState<((base64: string) => void) | null>(null);
  const [cropZoom, setCropZoom] = useState(1);
  const [cropPanX, setCropPanX] = useState(0);
  const [cropPanY, setCropPanY] = useState(0);
  const [isDraggingCrop, setIsDraggingCrop] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });

  // Unified File & Document Upload Processor (Supports Camera, Images, PDFs)
  const processUploadedFile = (file: File, callback: (base64: string) => void) => {
    if (!file) return;
    
    if (file.type === "application/pdf") {
      const reader = new FileReader();
      reader.onload = (e) => {
        const base64 = String(e.target?.result || "");
        callback(base64);
        showToast("📄 PDF document attached successfully!");
      };
      reader.readAsDataURL(file);
    } else if (file.type.startsWith("image/")) {
      const reader = new FileReader();
      reader.onload = (e) => {
        const base64 = String(e.target?.result || "");
        setCropperImage(base64);
        setCropperActive(true);
        setCropZoom(1);
        setCropPanX(0);
        setCropPanY(0);
        setCropperCallback(() => callback);
      };
      reader.readAsDataURL(file);
    } else {
      const reader = new FileReader();
      reader.onload = (e) => {
        callback(String(e.target?.result || ""));
        showToast("📎 Attachment synchronized!");
      };
      reader.readAsDataURL(file);
    }
  };

  // Keyboard blur helper
  const handleSaveAndBlur = (sectionName: string) => {
    if (document.activeElement instanceof HTMLElement) {
      document.activeElement.blur();
    }
    showToast(`✓ ${sectionName} saved to local draft!`);
  };

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

  // Draw cropper canvas
  useEffect(() => {
    if (!cropperActive || !cropperImage) return;
    const canvas = document.getElementById("crop-canvas") as HTMLCanvasElement | null;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const img = new Image();
    img.onload = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      ctx.fillStyle = "#f8fafc";
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      const scale = Math.min(canvas.width / img.width, canvas.height / img.height) * cropZoom;
      const dw = img.width * scale;
      const dh = img.height * scale;
      const dx = (canvas.width - dw) / 2 + cropPanX;
      const dy = (canvas.height - dh) / 2 + cropPanY;

      ctx.drawImage(img, dx, dy, dw, dh);

      // Crop box (Square 200px)
      const size = 200;
      const ox = (canvas.width - size) / 2;
      const oy = (canvas.height - size) / 2;
      
      // Draw gridlines in crop box (Rule of Thirds)
      ctx.strokeStyle = "rgba(6, 182, 212, 0.4)";
      ctx.lineWidth = 1;
      ctx.strokeRect(ox, oy, size, size);
      ctx.strokeRect(ox + size/3, oy, size/3, size);
      ctx.strokeRect(ox, oy + size/3, size, size/3);

      // Highlight boundary
      ctx.strokeStyle = "#06b6d4";
      ctx.lineWidth = 2.5;
      ctx.strokeRect(ox, oy, size, size);

      // Shadow overlay around crop box
      ctx.fillStyle = "rgba(15, 23, 42, 0.55)";
      ctx.fillRect(0, 0, canvas.width, oy);
      ctx.fillRect(0, oy + size, canvas.width, canvas.height - (oy + size));
      ctx.fillRect(0, oy, ox, size);
      ctx.fillRect(ox + size, oy, canvas.width - (ox + size), size);
    };
    img.src = cropperImage;
  }, [cropperActive, cropperImage, cropZoom, cropPanX, cropPanY]);

  const performCropAndAttach = () => {
    if (!cropperImage || !cropperCallback) return;
    const canvas = document.getElementById("crop-canvas") as HTMLCanvasElement | null;
    if (!canvas) return;

    const img = new Image();
    img.onload = () => {
      const outputCanvas = document.createElement("canvas");
      const outSize = 400; // High resolution crop output
      outputCanvas.width = outSize;
      outputCanvas.height = outSize;
      const oCtx = outputCanvas.getContext("2d");
      if (!oCtx) return;

      const scale = Math.min(canvas.width / img.width, canvas.height / img.height) * cropZoom;
      const dw = img.width * scale;
      const dh = img.height * scale;
      const dx = (canvas.width - dw) / 2 + cropPanX;
      const dy = (canvas.height - dh) / 2 + cropPanY;

      const boxSize = 200;
      const boxX = (canvas.width - boxSize) / 2;
      const boxY = (canvas.height - boxSize) / 2;

      const sourceX = (boxX - dx) / scale;
      const sourceY = (boxY - dy) / scale;
      const sourceW = boxSize / scale;
      const sourceH = boxSize / scale;

      oCtx.drawImage(img, sourceX, sourceY, sourceW, sourceH, 0, 0, outSize, outSize);
      
      const croppedBase64 = outputCanvas.toDataURL("image/jpeg", 0.75);
      cropperCallback(croppedBase64);
      setCropperActive(false);
      setCropperImage(null);
      showToast("✂️ Photo conformed and cropped successfully!");
    };
    img.src = cropperImage;
  };

  const handleSkipCrop = () => {
    if (!cropperImage || !cropperCallback) return;
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
        const compressed = canvas.toDataURL("image/jpeg", 0.7);
        cropperCallback(compressed);
      } else {
        cropperCallback(cropperImage);
      }
      setCropperActive(false);
      setCropperImage(null);
      showToast("📎 Attached original uncropped photo.");
    };
    img.src = cropperImage;
  };

  // Calculated Wages & OT totals
  const totalOtHours = otWorkers.reduce((sum: number, w: any) => sum + Number(w.hours || 0), 0);
  const totalOtWages = otWorkers.reduce((sum: number, w: any) => sum + (Number(w.workerCount || 0) * Number(w.rate || 0) * Number(w.hours || 0)), 0);
  const crewWages = Number(laborCount || 0) * Number(workerWageRate || 0);
  const supervisorWages = includeSupervisor ? Number(supervisorWageRate || 0) : 0;
  const calculatedWages = crewWages + supervisorWages + totalOtWages;

  const totalFuel = fuelExpensesList.reduce((sum: number, item: any) => sum + Number(item.amount || 0), 0);
  const totalTravel = travelExpensesList.reduce((sum: number, item: any) => sum + Number(item.amount || 0), 0);
  const totalRoomRent = roomRentList.reduce((sum: number, item: any) => sum + Number(item.amount || 0), 0);
  const totalToolRent = toolRentList.reduce((sum: number, item: any) => sum + Number(item.amount || 0), 0);
  const totalOtherRent = otherExpensesList.reduce((sum: number, item: any) => sum + Number(item.amount || 0), 0);

  // Find all active drafts in localStorage
  const getActiveDrafts = () => {
    const drafts: { project: any; data: any }[] = [];
    projectsList.forEach((p) => {
      const saved = localStorage.getItem(`telgo_draft_report_${p.id}`);
      if (saved) {
        try {
          const parsed = JSON.parse(saved);
          if (
            parsed.reportDate ||
            parsed.laborCount > 0 ||
            parsed.includeSupervisor ||
            parsed.otWorkers?.length > 0 ||
            parsed.fuelExpensesList?.length > 0 ||
            parsed.travelExpensesList?.length > 0 ||
            parsed.roomRentList?.length > 0 ||
            parsed.toolRentList?.length > 0 ||
            parsed.otherExpensesList?.length > 0 ||
            parsed.wipTrenchingValue ||
            parsed.wipHddValue ||
            parsed.wipCableLayingValue ||
            parsed.wipCableMoundingValue ||
            parsed.wipJoiningValue ||
            parsed.wipRmuValue ||
            parsed.wipTerminationsValue
          ) {
            drafts.push({ project: p, data: parsed });
          }
        } catch {}
      }
    });
    return drafts;
  };

  const submitReportForProject = async (projId: string, d: any) => {
    setSubmittingReport(true);

    const rDate = d.reportDate || new Date().toISOString().split("T")[0];
    const reportTime = new Date(rDate).getTime();
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const minDate = new Date(today);
    minDate.setDate(minDate.getDate() - 3);
    const maxDate = new Date(today);
    maxDate.setDate(maxDate.getDate() + 1);
    if (reportTime < minDate.getTime() || reportTime >= maxDate.getTime()) {
      showToast(`❌ Submission blocked: Operation date must be within the last 3 days.`);
      setSubmittingReport(false);
      return false;
    }

    const wipProgressList = {
      trenching: { 
        value: Number(d.wipTrenchingValue || 0), 
        narration: d.wipTrenchingNarration || "", 
        photo: d.wipTrenchingPhoto || "",
        startLat: (d.trenchingStartLat && d.trenchingStartLat !== "") ? Number(d.trenchingStartLat) : null,
        startLng: (d.trenchingStartLng && d.trenchingStartLng !== "") ? Number(d.trenchingStartLng) : null,
        endLat: (d.trenchingEndLat && d.trenchingEndLat !== "") ? Number(d.trenchingEndLat) : null,
        endLng: (d.trenchingEndLng && d.trenchingEndLng !== "") ? Number(d.trenchingEndLng) : null,
        path: d.trenchingRoutePath || null
      },
      hdd: { value: Number(d.wipHddValue || 0), narration: d.wipHddNarration || "", photo: d.wipHddPhoto || "" },
      cableLaying: { 
        value: Number(d.wipCableLayingValue || 0), 
        narration: d.wipCableLayingNarration || "", 
        photo: d.wipCableLayingPhoto || "",
        startLat: (d.cableLayingStartLat && d.cableLayingStartLat !== "") ? Number(d.cableLayingStartLat) : null,
        startLng: (d.cableLayingStartLng && d.cableLayingStartLng !== "") ? Number(d.cableLayingStartLng) : null,
        endLat: (d.cableLayingEndLat && d.cableLayingEndLat !== "") ? Number(d.cableLayingEndLat) : null,
        endLng: (d.cableLayingEndLng && d.cableLayingEndLng !== "") ? Number(d.cableLayingEndLng) : null,
        path: d.cableLayingRoutePath || null
      },
      cableMounding: { value: Number(d.wipCableMoundingValue || 0), narration: d.wipCableMoundingNarration || "", photo: d.wipCableMoundingPhoto || "" },
      joining: { value: Number(d.wipJoiningValue || 0), narration: d.wipJoiningNarration || "", photo: d.wipJoiningPhoto || "" },
      rmu: { value: Number(d.wipRmuValue || 0), narration: d.wipRmuNarration || "", photo: d.wipRmuPhoto || "" },
      terminations: { value: Number(d.wipTerminationsValue || 0), narration: d.wipTerminationsNarration || "", photo: d.wipTerminationsPhoto || "" }
    };

    const requestsAndNotes = {
      dailyWorkReport: d.reqDailyWorkReport || "",
      problems: d.reqProblems || "",
      plans: d.reqPlans || "",
      financeAmount: d.reqFinanceAmount || "",
      financeNarration: d.reqFinanceNarration || "",
      financeReceipt: d.reqFinanceReceipt || "",
      adminConcerns: d.reqAdminConcerns || ""
    };

    const payload = {
      reportDate: rDate,
      projectId: projId,
      laborCount: Number(d.laborCount || 0),
      workerWageRate: Number(d.workerWageRate ?? 900),
      includeSupervisor: !!d.includeSupervisor,
      supervisorWageRate: Number(d.supervisorWageRate ?? 1200),
      supervisorNarration: d.supervisorNarration || "",
      laborWagesNarration: d.laborWagesNarration || "",
      otWorkers: d.otWorkers || [],
      fuelExpensesList: d.fuelExpensesList || [],
      travelExpensesList: d.travelExpensesList || [],
      roomRentList: d.roomRentList || [],
      toolRentList: d.toolRentList || [],
      otherExpensesList: d.otherExpensesList || [],
      wipProgressList,
      requestsAndNotes,
      terminationEndpoints: Number(d.wipTerminationsValue || 0),
      terminationGpsLat: (d.trenchingEndLat && d.trenchingEndLat !== "") ? Number(d.trenchingEndLat) : ((d.cableLayingEndLat && d.cableLayingEndLat !== "") ? Number(d.cableLayingEndLat) : (d.terminationGpsLat ? Number(d.terminationGpsLat) : undefined)),
      terminationGpsLng: (d.trenchingEndLng && d.trenchingEndLng !== "") ? Number(d.trenchingEndLng) : ((d.cableLayingEndLng && d.cableLayingEndLng !== "") ? Number(d.cableLayingEndLng) : (d.terminationGpsLng ? Number(d.terminationGpsLng) : undefined)),
      startGpsLat: (d.trenchingStartLat && d.trenchingStartLat !== "") ? Number(d.trenchingStartLat) : ((d.cableLayingStartLat && d.cableLayingStartLat !== "") ? Number(d.cableLayingStartLat) : (d.startGpsLat ? Number(d.startGpsLat) : undefined)),
      startGpsLng: (d.trenchingStartLng && d.trenchingStartLng !== "") ? Number(d.trenchingStartLng) : ((d.cableLayingStartLng && d.cableLayingStartLng !== "") ? Number(d.cableLayingStartLng) : (d.startGpsLng ? Number(d.startGpsLng) : undefined)),
      clearances: {
        PWD: { status: d.pwdClearance || "None", receipt: d.pwdReceipt || "" },
        KSEB: { status: d.ksebClearance || "None", receipt: d.ksebReceipt || "" },
        NH: { status: d.nhClearance || "None", receipt: d.nhReceipt || "" },
        Panchayat: { status: d.panchayatClearance || "None", receipt: d.panchayatReceipt || "" }
      },
      hddDrillingLogs: d.hddDrillingLogs || [],
      hddMetadata: d.hddMetadata || {}
    };

    try {
      const res = await fetch("/api/mobile/daily-reports", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });
      const data = await res.json();
      if (res.ok && data.ok) {
        showToast(`🚀 Report for ${projId} submitted successfully!`);
        localStorage.removeItem(`telgo_draft_report_${projId}`);
        if (reportProjectId === projId) {
          // Clear current states if it was active
          setLaborCount(0);
          setWorkerWageRate(900);
          setIncludeSupervisor(false);
          setSupervisorWageRate(1200);
          setSupervisorNarration("");
          setLaborWagesNarration("");
          setOtWorkers([]);
          setFuelExpensesList([]);
          setTravelExpensesList([]);
          setRoomRentList([]);
          setToolRentList([]);
          setOtherExpensesList([]);
          setWipTrenchingValue("");
          setWipTrenchingNarration("");
          setWipTrenchingPhoto("");
          setWipHddValue("");
          setWipHddNarration("");
          setWipHddPhoto("");
          setWipCableLayingValue("");
          setWipCableLayingNarration("");
          setWipCableLayingPhoto("");
          setWipCableMoundingValue("");
          setWipCableMoundingNarration("");
          setWipCableMoundingPhoto("");
          setWipJoiningValue("");
          setWipJoiningNarration("");
          setWipJoiningPhoto("");
          setWipRmuValue("");
          setWipRmuNarration("");
          setWipRmuPhoto("");
          setWipTerminationsValue("");
          setWipTerminationsNarration("");
          setWipTerminationsPhoto("");
          setTerminationGpsLat("");
          setTerminationGpsLng("");
          setStartGpsLat("");
          setStartGpsLng("");
          setPwdClearance("None");
          setPwdReceipt("");
          setKsebClearance("None");
          setKsebReceipt("");
          setNhClearance("None");
          setNhReceipt("");
          setPanchayatClearance("None");
          setPanchayatReceipt("");
          setReqDailyWorkReport("");
          setReqProblems("");
          setReqPlans("");
          setReqFinanceAmount("");
          setReqFinanceNarration("");
          setReqFinanceReceipt("");
          setReqAdminConcerns("");
        }
        return true;
      } else {
        showToast(`❌ Submission error: ${data.message || "Unknown error."}`);
        return false;
      }
    } catch (err) {
      showToast("📡 Connection issue. Draft cached locally in offline queue.");
      const localQueue = localStorage.getItem("telgo_offline_submissions");
      const parsedQueue = localQueue ? JSON.parse(localQueue) : [];
      parsedQueue.push(payload);
      localStorage.setItem("telgo_offline_submissions", JSON.stringify(parsedQueue));
      localStorage.removeItem(`telgo_draft_report_${projId}`);
      return true;
    } finally {
      setSubmittingReport(false);
    }
  };

  const submitAllActiveDrafts = async () => {
    const drafts = getActiveDrafts();
    if (drafts.length === 0) {
      showToast("ℹ️ No active drafts to submit.");
      return;
    }
    let successCount = 0;
    for (const d of drafts) {
      const ok = await submitReportForProject(d.project.id, d.data);
      if (ok) successCount++;
    }
    showToast(`✓ Completed ${successCount} report submissions!`);
    setIsDailyReportOpen(false);
  };

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
      .catch(err => console.error("Error loading projects on supervisor:", err));
  }, [isProjectsOpen, isDailyReportOpen, isSiteStorageOpen]);

  // Load draft from localStorage when reportProjectId is selected
  useEffect(() => {
    if (!reportProjectId) return;
    const saved = localStorage.getItem(`telgo_draft_report_${reportProjectId}`);
    if (saved) {
      try {
        const d = JSON.parse(saved);
        setReportDate(d.reportDate || "");
        setLaborCount(Number(d.laborCount || 0));
        setWorkerWageRate(Number(d.workerWageRate ?? 900));
        setIncludeSupervisor(!!d.includeSupervisor);
        setSupervisorWageRate(Number(d.supervisorWageRate ?? 1200));
        setSupervisorNarration(d.supervisorNarration || "");
        setLaborWagesNarration(d.laborWagesNarration || "");
        setOtWorkers(d.otWorkers || []);
        setFuelExpensesList(d.fuelExpensesList || []);
        setTravelExpensesList(d.travelExpensesList || []);
        setRoomRentList(d.roomRentList || []);
        setToolRentList(d.toolRentList || []);
        setOtherExpensesList(d.otherExpensesList || []);
        
        setWipTrenchingValue(d.wipTrenchingValue || "");
        setWipTrenchingNarration(d.wipTrenchingNarration || "");
        setWipTrenchingPhoto(d.wipTrenchingPhoto || "");
        setTrenchingStartLat(d.trenchingStartLat || "");
        setTrenchingStartLng(d.trenchingStartLng || "");
        setTrenchingEndLat(d.trenchingEndLat || "");
        setTrenchingEndLng(d.trenchingEndLng || "");
        setTrenchingRoutePath(d.trenchingRoutePath || null);
        
        setWipHddValue(d.wipHddValue || "");
        setWipHddNarration(d.wipHddNarration || "");
        setWipHddPhoto(d.wipHddPhoto || "");
        
        setWipCableLayingValue(d.wipCableLayingValue || "");
        setWipCableLayingNarration(d.wipCableLayingNarration || "");
        setWipCableLayingPhoto(d.wipCableLayingPhoto || "");
        setCableLayingStartLat(d.cableLayingStartLat || "");
        setCableLayingStartLng(d.cableLayingStartLng || "");
        setCableLayingEndLat(d.cableLayingEndLat || "");
        setCableLayingEndLng(d.cableLayingEndLng || "");
        setCableLayingRoutePath(d.cableLayingRoutePath || null);
        
        setWipCableMoundingValue(d.wipCableMoundingValue || "");
        setWipCableMoundingNarration(d.wipCableMoundingNarration || "");
        setWipCableMoundingPhoto(d.wipCableMoundingPhoto || "");
        
        setWipJoiningValue(d.wipJoiningValue || "");
        setWipJoiningNarration(d.wipJoiningNarration || "");
        setWipJoiningPhoto(d.wipJoiningPhoto || "");
        
        setWipRmuValue(d.wipRmuValue || "");
        setWipRmuNarration(d.wipRmuNarration || "");
        setWipRmuPhoto(d.wipRmuPhoto || "");
        
        setWipTerminationsValue(d.wipTerminationsValue || "");
        setWipTerminationsNarration(d.wipTerminationsNarration || "");
        setWipTerminationsPhoto(d.wipTerminationsPhoto || "");
        
        setTerminationGpsLat(d.terminationGpsLat || "");
        setTerminationGpsLng(d.terminationGpsLng || "");
        setStartGpsLat(d.startGpsLat || "");
        setStartGpsLng(d.startGpsLng || "");
        
        setPwdClearance(d.pwdClearance || "None");
        setPwdReceipt(d.pwdReceipt || "");
        setKsebClearance(d.ksebClearance || "None");
        setKsebReceipt(d.ksebReceipt || "");
        setNhClearance(d.nhClearance || "None");
        setNhReceipt(d.nhReceipt || "");
        setPanchayatClearance(d.panchayatClearance || "None");
        setPanchayatReceipt(d.panchayatReceipt || "");

        setReqDailyWorkReport(d.reqDailyWorkReport || "");
        setReqProblems(d.reqProblems || "");
        setReqPlans(d.reqPlans || "");
        setReqFinanceAmount(d.reqFinanceAmount || "");
        setReqFinanceNarration(d.reqFinanceNarration || "");
        setReqFinanceReceipt(d.reqFinanceReceipt || "");
        setReqAdminConcerns(d.reqAdminConcerns || "");

        setHddDrillingLogs(d.hddDrillingLogs || []);
        setHddMachineName(d.hddMachineName || "");
        setHddVendorName(d.hddVendorName || "");
        setHddTrackerName(d.hddTrackerName || "");
        setHddOperatorName(d.hddOperatorName || "");
        setHddDuctsInfo(d.hddDuctsInfo || "");
        setHddRodLengthM(Number(d.hddRodLengthM || 3.0));
      } catch (e) {
        console.error("Error parsing report draft:", e);
      }
    } else {
      setReportDate("");
      setLaborCount(0);
      setWorkerWageRate(900);
      setIncludeSupervisor(false);
      setSupervisorWageRate(1200);
      setSupervisorNarration("");
      setLaborWagesNarration("");
      setOtWorkers([]);
      setFuelExpensesList([]);
      setTravelExpensesList([]);
      setRoomRentList([]);
      setToolRentList([]);
      setOtherExpensesList([]);
      
      setWipTrenchingValue("");
      setWipTrenchingNarration("");
      setWipTrenchingPhoto("");
      setTrenchingStartLat("");
      setTrenchingStartLng("");
      setTrenchingEndLat("");
      setTrenchingEndLng("");
      setTrenchingRoutePath(null);
      
      setWipHddValue("");
      setWipHddNarration("");
      setWipHddPhoto("");
      
      setWipCableLayingValue("");
      setWipCableLayingNarration("");
      setWipCableLayingPhoto("");
      setCableLayingStartLat("");
      setCableLayingStartLng("");
      setCableLayingEndLat("");
      setCableLayingEndLng("");
      setCableLayingRoutePath(null);
      
      setWipCableMoundingValue("");
      setWipCableMoundingNarration("");
      setWipCableMoundingPhoto("");
      
      setWipJoiningValue("");
      setWipJoiningNarration("");
      setWipJoiningPhoto("");
      
      setWipRmuValue("");
      setWipRmuNarration("");
      setWipRmuPhoto("");
      
      setWipTerminationsValue("");
      setWipTerminationsNarration("");
      setWipTerminationsPhoto("");
      
      setTerminationGpsLat("");
      setTerminationGpsLng("");
      setStartGpsLat("");
      setStartGpsLng("");
      
      setPwdClearance("None");
      setPwdReceipt("");
      setKsebClearance("None");
      setKsebReceipt("");
      setNhClearance("None");
      setNhReceipt("");
      setPanchayatClearance("None");
      setPanchayatReceipt("");

      setReqDailyWorkReport("");
      setReqProblems("");
      setReqPlans("");
      setReqFinanceAmount("");
      setReqFinanceNarration("");
      setReqFinanceReceipt("");
      setReqAdminConcerns("");

      const proj = projectsList.find(p => p.id === reportProjectId);
      setHddDrillingLogs([]);
      setHddMachineName(proj?.hddDefaultMachineName || "");
      setHddVendorName(proj?.hddDefaultVendorName || "");
      setHddTrackerName(proj?.hddDefaultTrackerName || "");
      setHddOperatorName(proj?.hddDefaultOperatorName || "");
      setHddDuctsInfo(proj?.hddDefaultDuctsInfo || "");
      setHddRodLengthM(Number(proj?.hddDefaultRodLengthM || 3.0));
    }
  }, [reportProjectId, projectsList]);

  useEffect(() => {
    if (!reportProjectId) return;
    const draft = {
      reportDate,
      laborCount,
      workerWageRate,
      includeSupervisor,
      supervisorWageRate,
      supervisorNarration,
      laborWagesNarration,
      otWorkers,
      fuelExpensesList,
      travelExpensesList,
      roomRentList,
      toolRentList,
      otherExpensesList,
      wipTrenchingValue,
      wipTrenchingNarration,
      wipTrenchingPhoto,
      trenchingStartLat,
      trenchingStartLng,
      trenchingEndLat,
      trenchingEndLng,
      trenchingRoutePath,
      wipHddValue,
      wipHddNarration,
      wipHddPhoto,
      wipCableLayingValue,
      wipCableLayingNarration,
      wipCableLayingPhoto,
      cableLayingStartLat,
      cableLayingStartLng,
      cableLayingEndLat,
      cableLayingEndLng,
      cableLayingRoutePath,
      wipCableMoundingValue,
      wipCableMoundingNarration,
      wipCableMoundingPhoto,
      wipJoiningValue,
      wipJoiningNarration,
      wipJoiningPhoto,
      wipRmuValue,
      wipRmuNarration,
      wipRmuPhoto,
      wipTerminationsValue,
      wipTerminationsNarration,
      wipTerminationsPhoto,
      terminationGpsLat,
      terminationGpsLng,
      startGpsLat,
      startGpsLng,
      pwdClearance,
      pwdReceipt,
      ksebClearance,
      ksebReceipt,
      nhClearance,
      nhReceipt,
      panchayatClearance,
      panchayatReceipt,
      reqDailyWorkReport,
      reqProblems,
      reqPlans,
      reqFinanceAmount,
      reqFinanceNarration,
      reqFinanceReceipt,
      reqAdminConcerns,
      hddDrillingLogs,
      hddMachineName,
      hddVendorName,
      hddTrackerName,
      hddOperatorName,
      hddDuctsInfo,
      hddRodLengthM
    };
    localStorage.setItem(`telgo_draft_report_${reportProjectId}`, JSON.stringify(draft));
  }, [
    reportProjectId,
    reportDate,
    laborCount,
    workerWageRate,
    includeSupervisor,
    supervisorWageRate,
    supervisorNarration,
    laborWagesNarration,
    otWorkers,
    fuelExpensesList,
    travelExpensesList,
    roomRentList,
    toolRentList,
    otherExpensesList,
    wipTrenchingValue, wipTrenchingNarration, wipTrenchingPhoto,
    trenchingStartLat, trenchingStartLng, trenchingEndLat, trenchingEndLng, trenchingRoutePath,
    wipHddValue, wipHddNarration, wipHddPhoto,
    wipCableLayingValue, wipCableLayingNarration, wipCableLayingPhoto,
    cableLayingStartLat, cableLayingStartLng, cableLayingEndLat, cableLayingEndLng, cableLayingRoutePath,
    wipCableMoundingValue, wipCableMoundingNarration, wipCableMoundingPhoto,
    wipJoiningValue, wipJoiningNarration, wipJoiningPhoto,
    wipRmuValue, wipRmuNarration, wipRmuPhoto,
    wipTerminationsValue, wipTerminationsNarration, wipTerminationsPhoto,
    terminationGpsLat,
    terminationGpsLng,
    startGpsLat,
    startGpsLng,
    pwdClearance,
    pwdReceipt,
    ksebClearance,
    ksebReceipt,
    nhClearance,
    nhReceipt,
    panchayatClearance,
    panchayatReceipt,
    reqDailyWorkReport,
    reqProblems,
    reqPlans,
    reqFinanceAmount,
    reqFinanceNarration,
    reqFinanceReceipt,
    reqAdminConcerns,
    hddDrillingLogs,
    hddMachineName,
    hddVendorName,
    hddTrackerName,
    hddOperatorName,
    hddDuctsInfo,
    hddRodLengthM
  ]);

  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour >= 5 && hour < 12) return "Good Morning";
    if (hour >= 12 && hour < 17) return "Good Afternoon";
    return "Good Evening";
  };

  const handleAddRawMaterial = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedStorageProjectId) {
      showToast("Please select a project.");
      return;
    }
    const finalMaterialName = storageMaterialName === "Other Items" ? customMaterialName : storageMaterialName;
    if (!finalMaterialName.trim()) {
      showToast("Please specify the material name.");
      return;
    }

    setSavingMaterial(true);

    const matchedProject = projectsList.find(p => p.id === selectedStorageProjectId);
    const existingMaterials = matchedProject?.storageMaterials || [];

    const newMaterialItem = {
      id: `mat-${Date.now()}`,
      date: storageDate,
      materialName: finalMaterialName.trim(),
      quantityMeters: storageQuantity.trim(),
      location: storageLocation.trim(),
      photoUrl: storagePhoto,
      notes: storageNotes.trim(),
      createdAt: new Date().toISOString()
    };

    const updatedMaterials = [newMaterialItem, ...existingMaterials];

    try {
      const res = await fetch(`/api/mobile/projects/${selectedStorageProjectId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          storageMaterials: updatedMaterials
        })
      });
      const data = await res.json();
      if (res.ok && data.ok) {
        showToast("Material logged successfully");
        setStorageQuantity("");
        setStorageLocation("");
        setStorageNotes("");
        setStoragePhoto("");
        setCustomMaterialName("");
        
        // Reload projects
        fetch("/api/mobile/projects")
          .then(r => r.json())
          .then(d => {
            if (d.ok && d.projects && d.projects.length > 0) {
              setProjectsList(d.projects);
              localStorage.setItem("telgo_custom_projects", JSON.stringify(d.projects));
            }
          });
      } else {
        showToast(`Error: ${data.message || "Failed to log material."}`);
      }
    } catch {
      showToast("Connection error. Failed to log material.");
    } finally {
      setSavingMaterial(false);
    }
  };

  function showToast(msg: string) {
    setToast(msg);
    setTimeout(() => setToast(""), 3500);
  }

  const fetchMyReports = async () => {
    if (!user) return;
    setLoadingMyReports(true);
    try {
      const res = await fetch(`/api/mobile/daily-reports?supervisorId=${user.userId}`);
      const data = await res.json();
      if (res.ok && data.ok) {
        setMySubmittedReports(data.reports ?? []);
      }
    } catch (err) {
      console.error("Failed to load supervisor reports:", err);
    } finally {
      setLoadingMyReports(false);
    }
  };

  useEffect(() => {
    if (user) {
      fetchMyReports();
      const interval = setInterval(fetchMyReports, 10000);
      return () => clearInterval(interval);
    }
  }, [user]);

  const fetchSupervisorChat = async (reportId: string) => {
    if (!reportId) return;
    setLoadingSupervisorChat(true);
    try {
      const res = await fetch(`/api/mobile/daily-reports/comments?reportId=${reportId}`);
      const data = await res.json();
      if (res.ok && data.ok) {
        setSupervisorChatMessages(data.comments ?? []);
      }
    } catch (err) {
      console.error("Failed to load chat:", err);
    } finally {
      setLoadingSupervisorChat(false);
    }
  };

  useEffect(() => {
    if (selectedClarificationReport && selectedClarificationReport.id) {
      fetchSupervisorChat(selectedClarificationReport.id);
      
      // Seed corrective input fields
      setCorrectiveWipTrenching(selectedClarificationReport.excavationLength || 0);
      setCorrectiveWipHdd(selectedClarificationReport.hddLength || 0);
      setCorrectiveFuelExpenses(selectedClarificationReport.fuelExpenses || 0);
      setCorrectiveTravelExpenses(selectedClarificationReport.travelExpenses || 0);
      setCorrectiveRoomRent(selectedClarificationReport.roomRent || 0);
      setCorrectiveToolRent(selectedClarificationReport.toolRent || 0);
      setCorrectiveRoomReceipt(selectedClarificationReport.roomRentReceipt || "");
      setCorrectiveToolReceipt(selectedClarificationReport.toolRentReceipt || "");
    }
  }, [selectedClarificationReport]);

  const handleSendSupervisorChatMessage = async () => {
    if (!newSupervisorMessage.trim() || !selectedClarificationReport) return;
    try {
      const res = await fetch("/api/mobile/daily-reports/comments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          reportId: selectedClarificationReport.id,
          message: newSupervisorMessage
        })
      });
      const data = await res.json();
      if (res.ok && data.ok) {
        setNewSupervisorMessage("");
        showToast("💬 Message sent to admin!");
        fetchSupervisorChat(selectedClarificationReport.id);
        fetchMyReports();
      } else {
        showToast(`❌ Message failed: ${data.message}`);
      }
    } catch (err) {
      showToast("❌ Network error. Message failed.");
    }
  };

  const handleResolveClarification = async () => {
    if (!selectedClarificationReport) return;
    setResolvingClarification(true);
    try {
      const rich = selectedClarificationReport.stockAvailable?.richDetails || {};
      const workerRate = selectedClarificationReport.workerWageRate ?? rich.workerWageRate ?? 900;
      const supervisorRate = selectedClarificationReport.supervisorWageRate ?? rich.supervisorWageRate ?? 1200;
      const crewLabor = selectedClarificationReport.laborCount - (rich.includeSupervisor ? 1 : 0);
      const crewWages = (crewLabor * workerRate) + (rich.includeSupervisor ? supervisorRate : 0);
      
      const otList = rich.otWorkers || [];
      let totalOtWages = 0;
      if (otList.length > 0) {
        otList.forEach((w: any) => {
          totalOtWages += Math.round(Number(w.hours || 0) * Number(w.rate || 0) * Number(w.workerCount || 1));
        });
      }
      const calculatedWages = crewWages + totalOtWages;

      const updates = {
        excavationLength: Number(correctiveWipTrenching),
        hddLength: Number(correctiveWipHdd),
        fuelExpenses: Number(correctiveFuelExpenses),
        travelExpenses: Number(correctiveTravelExpenses),
        roomRent: Number(correctiveRoomRent),
        toolRent: Number(correctiveToolRent),
        roomRentReceipt: correctiveRoomReceipt,
        toolRentReceipt: correctiveToolReceipt,
        calculatedWages: calculatedWages,
        status: "pending"
      };

      const updateRes = await fetch("/api/mobile/admin/update-report", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          reportId: selectedClarificationReport.id,
          updates
        })
      });
      const updateData = await updateRes.json();

      if (!updateRes.ok || !updateData.ok) {
        showToast(`❌ Update failed: ${updateData.message}`);
        setResolvingClarification(false);
        return;
      }

      await fetch("/api/mobile/daily-reports/comments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          reportId: selectedClarificationReport.id,
          message: "⚠️ Corrective details and missing files uploaded. Staging updated back for admin review."
        })
      });

      showToast("🚀 Staged changes conformed & submitted back to admin!");
      setSelectedClarificationReport(null);
      setIsClarificationInboxOpen(false);
      fetchMyReports();
    } catch (err) {
      showToast("❌ Connection error. Update failed.");
    } finally {
      setResolvingClarification(false);
    }
  };

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
    let intervalId: any;

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

      // Fail-safe: force update telemetry every 20 minutes
      const forceUpdateTelemetry = () => {
        navigator.geolocation.getCurrentPosition(
          (pos) => updateBackgroundLocation(pos),
          () => {},
          { enableHighAccuracy: true, timeout: 15000, maximumAge: 0 }
        );
      };
      intervalId = setInterval(forceUpdateTelemetry, 1200000);
    }

    return () => {
      if (watchId && navigator.geolocation) {
        navigator.geolocation.clearWatch(watchId);
      }
      if (intervalId) {
        clearInterval(intervalId);
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
          showToast(isReRegister ? "Location coordinates updated & re-registered" : "Mark attendance completed");
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
    <div style={{ minHeight: "100dvh", display: "flex", flexDirection: "column", background: "var(--bg)", color: "var(--text)" }}>
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
          background: var(--surface) !important;
        }
        @media (min-width: 768px) {
          .daily-report-modal {
            max-width: 840px !important;
            height: 90dvh !important;
            max-height: 850px !important;
          }
          .wizard-two-column {
            display: grid;
            grid-template-columns: 1.1fr 0.9fr;
            gap: 20px;
            align-items: start;
          }
        }
      `}</style>
      {/* Immersive Header */}
      <ProfileHeaderWidget 
        user={user} 
        onOpenSettings={() => setIsSettingsOpen(true)} 
        dashboardTitle="Telgo Operations" 
      />

      <main style={{ flex: 1, padding: "24px 20px", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: isProjectsOpen ? "flex-start" : "center" }}>
        
        {isProjectsOpen ? (
          /* READ-ONLY PROJECTS DIRECTORY SUB-VIEW */
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
                <p style={{ fontSize: 9, fontWeight: 800, color: "var(--cyan)", letterSpacing: "0.1em", textTransform: "uppercase", margin: 0 }}>Telgo Power Corridors</p>
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
                      background: isSelected ? "rgba(14, 165, 233, 0.08)" : "var(--surface)",
                      border: isSelected ? "1px solid rgba(14, 165, 233, 0.3)" : "1px solid var(--border)",
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
                      <span style={{ fontSize: 9, fontWeight: 800, color: "#0284c7", background: "rgba(6, 182, 212, 0.12)", border: "1px solid rgba(14, 165, 233, 0.2)", borderRadius: 6, padding: "2px 6px", textTransform: "uppercase", fontFamily: "monospace", flexShrink: 0 }}>
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

                            // Primary Route (Purple utilityPath if present, else Teal line)
                            const customUtility = ${JSON.stringify(selectedProjectItem.utilityPath ?? [])};
                            if (customUtility && customUtility.length >= 2) {
                              L.polyline(customUtility, { color: '#a855f7', weight: 4, opacity: 0.95, lineJoin: 'round' }).addTo(map);
                            } else {
                              L.polyline([start, end], { color: "var(--cyan)", weight: 4, opacity: 0.8, lineJoin: 'round' }).addTo(map);
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
                    <p style={{ margin: "2px 0 0", fontSize: 11, fontWeight: 750, color: "#dc2626" }}>{selectedProjectItem.endLabel}</p>
                    <span style={{ fontSize: 9, fontFamily: "monospace", color: "var(--dim)" }}>{selectedProjectItem.endCoords[0]}° N, {selectedProjectItem.endCoords[1]}° E</span>
                  </div>
                </div>

                {/* Site Storage / Raw Materials present in site */}
                <div style={{ marginTop: 14, border: "1px solid var(--border)", borderRadius: 14, padding: 12, background: "var(--surface)" }}>
                  <h3 style={{ fontSize: 11, fontWeight: 800, color: "var(--text)", marginBottom: 8, textTransform: "uppercase", letterSpacing: "0.05em", display: "flex", alignItems: "center", gap: 4 }}>
                    📦 Site Storage & Raw Materials
                  </h3>
                  <div style={{ display: "flex", flexDirection: "column", gap: 8, maxHeight: 150, overflowY: "auto", paddingRight: 4 }}>
                    {(!selectedProjectItem.storageMaterials || selectedProjectItem.storageMaterials.length === 0) ? (
                      <span style={{ fontSize: 11, color: "var(--dim)", textAlign: "center", display: "block", padding: "10px 0" }}>
                        No raw materials logged for this corridor yet.
                      </span>
                    ) : (
                      selectedProjectItem.storageMaterials.map((m: any) => (
                        <div key={m.id} className="glass" style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "8px 10px", border: "1px solid var(--border)", borderRadius: 10, background: "rgba(255, 255, 255, 0.4)" }}>
                          <div style={{ flex: 1, textAlign: "left" }}>
                            <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                              <strong style={{ fontSize: 11, color: "var(--text)" }}>{m.materialName || m.name}</strong>
                              <span style={{ fontSize: 9, color: "var(--dim)", fontFamily: "monospace" }}>({m.date})</span>
                            </div>
                            <p style={{ margin: "2px 0 0", fontSize: 10, color: "var(--muted)" }}>
                              Qty: {m.quantityMeters || m.quantity} | Loc: {m.location}
                            </p>
                            {m.notes && (
                              <p style={{ margin: "2px 0 0", fontSize: 10, color: "var(--dim)", fontStyle: "italic" }}>
                                "{m.notes}"
                              </p>
                            )}
                          </div>
                          {m.photoUrl && (
                            <img 
                              src={m.photoUrl} 
                              alt="Material Thumbnail" 
                              style={{ width: 34, height: 34, borderRadius: 6, objectFit: "cover", border: "1px solid var(--border)", marginLeft: 6 }} 
                            />
                          )}
                        </div>
                      ))
                    )}
                  </div>
                </div>
              </div>
            )}
          </div>
        ) : (
          /* CORE FIELD OPERATIONS CONSOLE */
          <div style={{ width: "100%", maxWidth: 420, textAlign: "center" }}>
            
            {/* Circular Initials Avatar */}
            {(() => {
              const avatar = user?.avatarUrl || "";
              const hasPhoto = avatar && avatar.startsWith("data:image/");
              return (
                <div style={{ display: "flex", flexDirection: "column", alignItems: "center", marginBottom: 24 }}>
                  <div style={{
                    width: 64,
                    height: 64,
                    borderRadius: "50%",
                    background: hasPhoto ? "none" : "linear-gradient(135deg, #0e7490, #06b6d4)",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    color: "white",
                    fontSize: 26,
                    fontWeight: 800,
                    boxShadow: "0 10px 28px rgba(6,182,212,0.2)",
                    border: "2px solid var(--border)",
                    textTransform: "uppercase",
                    overflow: "hidden"
                  }}>
                    {hasPhoto ? (
                      <img src={avatar} alt="Avatar" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                    ) : (
                      (user?.fullName || "U").charAt(0)
                    )}
                  </div>
                  <h2 style={{ fontSize: 20, fontWeight: 800, color: "var(--text)", margin: "12px 0 2px" }}>{getGreeting()}</h2>
                  <p style={{ fontSize: 13, color: "var(--dim)", margin: 0 }}>Welcome {user?.fullName}</p>
                  <p style={{ fontSize: 11, color: "var(--muted)", margin: "2px 0 0", fontFamily: "monospace" }}>{user?.loginId}</p>
                </div>
              );
            })()}

            {/* GRID OF MODULES */}
            <div className="menu-grid">
              
              {/* MODULE 1: ATTENDANCE SHIFT (Interactive) */}
              <div 
                onClick={() => setIsAttendanceOpen(true)}
                style={{
                  background: isShiftActive ? "rgba(167, 139, 250, 0.02)" : "var(--surface)",
                  border: isShiftActive ? "1px solid rgba(167, 139, 250, 0.25)" : "1px solid var(--border)",
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
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke={isShiftActive ? "var(--violet)" : "var(--cyan)"} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
                    <circle cx="12" cy="10" r="3"/>
                  </svg>
                </div>
                <div>
                  <h4 style={{ fontSize: 13, fontWeight: 800, color: "var(--text)", margin: "0 0 2px" }}>Attendance</h4>
                  <span style={{ fontSize: 9, color: isShiftActive ? "var(--violet)" : "var(--dim)", fontWeight: 700 }}>
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
                  background: "rgba(14, 165, 233, 0.08)",
                  border: "1px solid rgba(14, 165, 233, 0.2)",
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
                  <span style={{ fontSize: 9, color: "var(--cyan)", fontWeight: 700 }}>Corridors</span>
                </div>
              </div>

              {/* MODULE 3: SITE STORAGE / RAW MATERIALS (Interactive) */}
              <div 
                onClick={() => setIsSiteStorageOpen(true)}
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
                  boxShadow: "none"
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
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#06b6d4" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"/>
                    <polyline points="3.27 6.96 12 12.01 20.73 6.96"/>
                    <line x1="12" y1="22.08" x2="12" y2="12"/>
                  </svg>
                </div>
                <div>
                  <h4 style={{ fontSize: 13, fontWeight: 800, color: "var(--text)", margin: "0 0 2px" }}>Site Storage</h4>
                  <span style={{ fontSize: 9, color: "var(--cyan)", fontWeight: 800, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", maxWidth: 100, display: "block" }}>Raw Materials</span>
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
                  background: "rgba(217, 119, 6, 0.08)",
                  border: "1px solid rgba(217, 119, 6, 0.2)",
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
                  <h4 style={{ fontSize: 13, fontWeight: 800, color: "var(--text)", margin: "0 0 2px" }}>Daily Report</h4>
                  <span style={{ fontSize: 9, color: "#d97706", fontWeight: 700 }}>Site Update</span>
                </div>
              </div>

              {/* MODULE 5: PENDING APPROVALS & CHATS */}
              <div 
                onClick={() => {
                  setIsClarificationInboxOpen(true);
                  fetchMyReports();
                }}
                style={{
                  background: (mySubmittedReports.filter((r: any) => r.status === "clarification").length) > 0 ? "linear-gradient(135deg, #fff5f5 0%, #fee2e2 100%)" : "var(--surface)",
                  border: (mySubmittedReports.filter((r: any) => r.status === "clarification").length) > 0 ? "1px solid rgba(220, 38, 38, 0.3)" : "1px solid var(--border)",
                  borderRadius: 18,
                  padding: "18px 14px",
                  cursor: "pointer",
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "center",
                  textAlign: "center",
                  gap: 8,
                  position: "relative"
                }}
                className={`glass module-card ${(mySubmittedReports.filter((r: any) => r.status === "clarification").length) > 0 ? "active-glow-pending" : ""}`}
              >
                <div style={{
                  width: 44,
                  height: 44,
                  borderRadius: 12,
                  background: (mySubmittedReports.filter((r: any) => r.status === "clarification").length) > 0 ? "rgba(220, 38, 38, 0.1)" : "rgba(139, 92, 246, 0.08)",
                  border: (mySubmittedReports.filter((r: any) => r.status === "clarification").length) > 0 ? "1px solid rgba(220, 38, 38, 0.25)" : "1px solid rgba(139, 92, 246, 0.2)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  flexShrink: 0
                }}>
                  <span style={{ fontSize: 20 }}>📬</span>
                </div>
                {(mySubmittedReports.filter((r: any) => r.status === "clarification").length) > 0 && (
                  <span style={{
                    position: "absolute",
                    top: 6,
                    right: 6,
                    background: "#ef4444",
                    color: "white",
                    fontSize: 8,
                    fontWeight: 900,
                    borderRadius: "50%",
                    width: 16,
                    height: 16,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    border: "1px solid white",
                    boxShadow: "0 2px 5px rgba(239, 68, 68, 0.3)"
                  }}>
                    {mySubmittedReports.filter((r: any) => r.status === "clarification").length}
                  </span>
                )}
                <div>
                  <h4 style={{ fontSize: 13, fontWeight: 800, color: "var(--text)", margin: "0 0 2px" }}>Clarifications</h4>
                  <span style={{ fontSize: 9, color: (mySubmittedReports.filter((r: any) => r.status === "clarification").length) > 0 ? "#ef4444" : "#8b5cf6", fontWeight: 700 }}>
                    {(mySubmittedReports.filter((r: any) => r.status === "clarification").length) > 0 ? "Action Required" : "Staged Inbox"}
                  </span>
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
                color: "#dc2626",
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
            border: "1px solid var(--border)",
            borderRadius: 24,
            padding: 30,
            textAlign: "center",
            boxShadow: "0 24px 64px rgba(0,0,0,0.7)"
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
              background: isShiftActive ? "rgba(167,139,250,0.1)" : "rgba(6,182,212,0.1)",
              border: isShiftActive ? "1.5px solid rgba(167,139,250,0.35)" : "1.5px solid rgba(6,182,212,0.35)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              margin: "0 auto 16px",
              boxShadow: isShiftActive ? "0 0 20px rgba(167,139,250,0.2)" : "0 0 20px rgba(6,182,212,0.2)"
            }}>
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke={isShiftActive ? "var(--violet)" : "var(--cyan)"} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
                <circle cx="12" cy="10" r="3"/>
              </svg>
            </div>

            <h3 style={{ fontSize: 18, fontWeight: 900, color: "var(--text)", margin: "0 0 8px" }}>On-Site Duty Shift</h3>
            
            {isShiftActive ? (
              <div style={{ marginBottom: 24 }}>
                <p style={{ fontSize: 13, color: "var(--muted)", lineHeight: 1.5, margin: "0 0 16px" }}>
                  Your daily attendance was successfully marked at <strong style={{ color: "#a78bfa" }}>{checkInTime}</strong>. Silent background telemetry is running to verify operations coverage.
                </p>
                <div style={{ background: "rgba(124, 58, 237, 0.08)", border: "1px solid rgba(124, 58, 237, 0.2)", borderRadius: 12, padding: "10px 12px", display: "inline-flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
                  <div className="dot-pulse" style={{ background: "#a78bfa" }} />
                  <span style={{ fontSize: 11, color: "#a78bfa", fontWeight: 750 }}>Shift Active — completed ✓</span>
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
                  background: "linear-gradient(135deg, #06b6d4 0%, #7c3aed 100%)",
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

      {/* Dynamic Render Preview Helper */}
      {(() => {
        if (typeof window !== 'undefined') {
          (window as any).renderAttachmentPreview = (base64: string) => {
            if (!base64) return null;
            const isPdf = base64.startsWith("data:application/pdf");
            return (
              <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 6, margin: "8px 0" }}>
                {isPdf ? (
                  <div style={{ display: "flex", alignItems: "center", gap: 8, background: "#fef2f2", border: "1px solid #fca5a5", borderRadius: 8, padding: "#8px #12px", color: "#991b1b" }}>
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/></svg>
                    <span style={{ fontSize: 11, fontWeight: 800 }}>📄 Attached PDF Document</span>
                  </div>
                ) : (
                  <img src={base64} alt="Attachment Preview" style={{ maxWidth: 120, maxHeight: 90, borderRadius: 8, border: "1px solid #cbd5e1", objectFit: "contain", background: "#f8fafc", padding: 4 }} />
                )}
              </div>
            );
          };
        }
        return null;
      })()}

      {isDailyReportOpen && (
        <div style={{
          position: "fixed",
          inset: 0,
          background: "rgba(15, 23, 42, 0.65)",
          backdropFilter: "blur(10px)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          padding: "24px 12px",
          zIndex: 1000,
          fontFamily: "Outfit, sans-serif",
          overflowY: "auto"
        }}>
          <div className="glass fade-in daily-report-modal" style={{
            width: "100%",
            maxWidth: 640,
            background: "#ffffff",
            border: "1px solid #e2e8f0",
            borderRadius: 24,
            padding: "20px 24px",
            boxShadow: "0 20px 50px rgba(15, 23, 42, 0.08)",
            height: "85dvh",
            maxHeight: "780px",
            display: "flex",
            flexDirection: "column",
            gap: 12,
            color: "#0f172a"
          }}>
            {/* Modal Header */}
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", borderBottom: "1px solid #e2e8f0", paddingBottom: 10 }}>
              <div>
                <span style={{ fontSize: 9, fontWeight: 800, color: "#64748b", textTransform: "uppercase", letterSpacing: "0.12em" }}>Daily Operation Hub</span>
                <h3 style={{ fontSize: 16, fontWeight: 900, color: "#0f172a", margin: "1px 0 0", letterSpacing: "-0.5px" }}>Report</h3>
              </div>
              <button 
                onClick={() => {
                  if (confirm("Are you sure you want to dismiss the daily report wizard? Your inputs will remain saved as a local draft.")) {
                    setIsDailyReportOpen(false);
                  }
                }}
                style={{ background: "#f1f5f9", border: "1px solid #e2e8f0", width: 28, height: 28, borderRadius: "50%", color: "#475569", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}
              >
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
              </button>
            </div>

            {/* Step Progress Bar */}
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", background: "#f8fafc", border: "1px solid #e2e8f0", padding: "12px 18px", borderRadius: 16 }}>
              {[1, 2, 3, 4, 5].map((step) => (
                <div key={step} style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <div style={{
                    width: 26,
                    height: 26,
                    borderRadius: "50%",
                    background: reportStep === step ? "linear-gradient(135deg, #0284c7, #0369a1)" : reportStep > step ? "#10b981" : "#f1f5f9",
                    border: reportStep === step ? "none" : "1px solid #e2e8f0",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    fontSize: 11,
                    fontWeight: 800,
                    color: reportStep >= step ? "#ffffff" : "#64748b"
                  }}>
                    {reportStep > step ? "✓" : step}
                  </div>
                  {step < 5 && <div style={{ width: 24, height: 2, background: reportStep > step ? "#10b981" : "#e2e8f0" }} />}
                </div>
              ))}
              <span style={{ fontSize: 11, fontWeight: 800, color: "#64748b", textTransform: "uppercase" }}>
                Step {reportStep} of 5
              </span>
            </div>

            {/* Scrollable Wizard Body */}
            <div style={{ flex: 1, overflowY: "auto", paddingRight: 4, display: "flex", flexDirection: "column", gap: 16, textAlign: "left" }}>

              {/* STEP 1: LABOR, OVERTIME & EXPENSES */}
              {reportStep === 1 && (
                <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
                  <h4 style={{ fontSize: 13, fontWeight: 800, color: "#0284c7", textTransform: "uppercase", margin: 0 }}>Step 1: Crew Roster & Logistics Expenses</h4>
                  
                  <div className="wizard-two-column">
                    {/* LEFT COLUMN: CORE ROSTER & WAGES */}
                    <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
                      {/* Project Selection Dropdown */}
                      <div style={{ background: "#f8fafc", border: "1px solid #e2e8f0", padding: 14, borderRadius: 16 }}>
                        <label style={{ display: "block", fontSize: 10, fontWeight: 800, color: "#0284c7", marginBottom: 6, textTransform: "uppercase", letterSpacing: "0.05em" }}>Active Engineering Corridor</label>
                        <select
                          value={reportProjectId}
                          onChange={(e) => setReportProjectId(e.target.value)}
                          style={{ width: "100%", height: 40, background: "#ffffff", border: "1px solid #cbd5e1", borderRadius: 10, padding: "0 12px", color: "#0f172a", fontSize: 13, outline: "none", cursor: "pointer", fontWeight: 700 }}
                        >
                          {projectsList.map((p) => (
                            <option key={p.id} value={p.id}>{p.name} ({p.code})</option>
                          ))}
                        </select>
                      </div>
                      
                      {/* Date picker */}
                      <div>
                        <label style={{ display: "block", fontSize: 11, fontWeight: 700, color: "#475569", marginBottom: 6, textTransform: "uppercase" }}>Operation Date</label>
                        <input
                          type="date"
                          value={reportDate}
                          onChange={(e) => setReportDate(e.target.value)}
                          max={new Date().toISOString().split("T")[0]}
                          min={(() => {
                            const d = new Date();
                            d.setDate(d.getDate() - 3);
                            return d.toISOString().split("T")[0];
                          })()}
                          style={{ width: "100%", height: 38, background: "#ffffff", border: "1px solid #cbd5e1", borderRadius: 10, padding: "0 12px", color: "#0f172a", fontSize: 12, outline: "none", fontWeight: 700 }}
                          required
                        />
                      </div>

                      {/* Labor Wages Section */}
                      <div style={{ background: "#f8fafc", border: "1px solid #e2e8f0", padding: 18, borderRadius: 16, display: "flex", flexDirection: "column", gap: 14 }}>
                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                          <span style={{ fontSize: 11, fontWeight: 800, color: "#0284c7", textTransform: "uppercase", letterSpacing: "0.05em" }}>Field Force Crew Strength</span>
                          <button
                            type="button"
                            onClick={() => handleSaveAndBlur("Wages & Roster")}
                            style={{ fontSize: 10, fontWeight: 700, color: "#0284c7", background: "rgba(2, 132, 199, 0.06)", border: "1px solid rgba(2, 132, 199, 0.2)", borderRadius: 6, padding: "4px 8px", cursor: "pointer" }}
                          >
                            💾 Save Section
                          </button>
                        </div>
                        
                        {/* Crew count */}
                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                          <div>
                            <span style={{ fontSize: 13, fontWeight: 700, color: "#1e293b" }}>Workers Count</span>
                            <p style={{ margin: 0, fontSize: 10, color: "#64748b" }}>Number of field force personnel on-duty</p>
                          </div>
                          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                            <button type="button" onClick={() => setLaborCount(Math.max(0, Number(laborCount || 0) - 1))} style={{ width: 32, height: 32, borderRadius: 8, border: "1px solid #cbd5e1", background: "#ffffff", color: "#0f172a", cursor: "pointer", fontWeight: 900 }}>-</button>
                            <input
                              type="number"
                              value={laborCount}
                              onChange={(e) => {
                                const val = e.target.value;
                                setLaborCount(val === "" ? "" : Math.max(0, parseInt(val) || 0));
                              }}
                              style={{ width: 44, height: 32, background: "transparent", border: "none", color: "#0f172a", fontSize: 15, fontWeight: 800, textAlign: "center", outline: "none" }}
                            />
                            <button type="button" onClick={() => setLaborCount(Number(laborCount || 0) + 1)} style={{ width: 32, height: 32, borderRadius: 8, border: "1px solid #cbd5e1", background: "#ffffff", color: "#0f172a", cursor: "pointer", fontWeight: 900 }}>+</button>
                          </div>
                        </div>

                        {/* Daily wage rate input */}
                        <div style={{ display: "grid", gridTemplateColumns: "1.5fr 1fr", gap: 12, alignItems: "center", borderTop: "1px solid #e2e8f0", paddingTop: 12 }}>
                          <div>
                            <span style={{ fontSize: 12, fontWeight: 700, color: "#1e293b" }}>Daily Wages per Crew Member</span>
                            <p style={{ margin: 0, fontSize: 10, color: "#64748b" }}>Rate per worker shift (₹)</p>
                          </div>
                          <input
                            type="number"
                            value={workerWageRate}
                            onChange={(e) => {
                              const val = e.target.value;
                              setWorkerWageRate(val === "" ? "" : Math.max(0, parseInt(val) || 0));
                            }}
                            style={{ width: "100%", height: 34, background: "#ffffff", border: "1px solid #cbd5e1", borderRadius: 8, padding: "0 10px", color: "#0f172a", fontSize: 12, fontWeight: 700, outline: "none" }}
                          />
                        </div>

                        {/* Wages Narration */}
                        <div style={{ display: "flex", flexDirection: "column", gap: 6, borderTop: "1px solid #e2e8f0", paddingTop: 12 }}>
                          <span style={{ fontSize: 10, color: "#64748b", fontWeight: 800, textTransform: "uppercase" }}>General Roster/Wages Notes</span>
                          <input
                            type="text"
                            placeholder="Enter crew/shift notes here..."
                            value={laborWagesNarration}
                            onChange={(e) => setLaborWagesNarration(e.target.value)}
                            style={{ width: "100%", height: 32, background: "#ffffff", border: "1px solid #cbd5e1", borderRadius: 8, padding: "0 10px", color: "#0f172a", fontSize: 11, outline: "none" }}
                          />
                        </div>
                      </div>
                    </div>

                    {/* RIGHT COLUMN: OVERTIME ROSTER & LOGISTICS EXPENSES */}
                    <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>

                  {/* Overtime Workers Section */}
                  <div style={{ background: "#f8fafc", border: "1px solid #e2e8f0", padding: 16, borderRadius: 16, display: "flex", flexDirection: "column", gap: 12 }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                      <span style={{ fontSize: 11, fontWeight: 800, color: "#0284c7", textTransform: "uppercase", letterSpacing: "0.05em" }}>Overtime Workers</span>
                      <div style={{ display: "flex", gap: 6 }}>
                        <button
                          type="button"
                          onClick={() => handleSaveAndBlur("Overtime Roster")}
                          style={{ fontSize: 10, fontWeight: 700, color: "#64748b", background: "#ffffff", border: "1px solid #e2e8f0", borderRadius: 6, padding: "4px 8px", cursor: "pointer" }}
                        >
                          💾 Save
                        </button>
                        <button
                          type="button"
                          onClick={() => setOtWorkers([...otWorkers, { id: Math.random().toString(), workerCount: 1, rate: 150, hours: 1, narration: "" }])}
                          style={{ fontSize: 10, fontWeight: 800, color: "#ffffff", background: "linear-gradient(135deg, #0284c7 0%, #0369a1 100%)", border: "none", borderRadius: 6, padding: "4px 10px", cursor: "pointer" }}
                        >
                          ➕ Add OT Entry
                        </button>
                      </div>
                    </div>

                    {otWorkers.length === 0 ? (
                      <p style={{ margin: 0, fontSize: 11, color: "#64748b", textAlign: "center", fontStyle: "italic" }}>No active overtime entries.</p>
                    ) : (
                      <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                        {otWorkers.map((item, idx) => (
                          <div key={item.id} style={{ background: "#ffffff", border: "1px solid #e2e8f0", borderRadius: 12, padding: 12, display: "flex", flexDirection: "column", gap: 8 }}>
                            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                              <span style={{ fontSize: 11, color: "#0369a1", fontWeight: 800 }}>Group #{idx + 1}</span>
                              <button
                                type="button"
                                onClick={() => setOtWorkers(otWorkers.filter((x) => x.id !== item.id))}
                                style={{ background: "none", border: "none", color: "#dc2626", cursor: "pointer", fontSize: 11, fontWeight: 700 }}
                              >
                                Remove
                              </button>
                            </div>
                            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 8 }}>
                              <div>
                                <span style={{ fontSize: 9, color: "#64748b", fontWeight: 700 }}>Qty</span>
                                <input
                                  type="number"
                                  min="1"
                                  value={item.workerCount}
                                  onChange={(e) => {
                                    const val = e.target.value;
                                    const resolvedVal = val === "" ? "" : Math.max(1, parseInt(val) || 1);
                                    setOtWorkers(otWorkers.map((x) => x.id === item.id ? { ...x, workerCount: resolvedVal } : x));
                                  }}
                                  style={{ width: "100%", height: 32, background: "#ffffff", border: "1px solid #cbd5e1", borderRadius: 6, padding: "0 8px", color: "#0f172a", fontSize: 12, outline: "none", fontWeight: 700 }}
                                />
                              </div>
                              <div>
                                <span style={{ fontSize: 9, color: "#64748b", fontWeight: 700 }}>Rate (₹/hr)</span>
                                <input
                                  type="number"
                                  value={item.rate}
                                  onChange={(e) => {
                                    const val = e.target.value;
                                    const resolvedVal = val === "" ? "" : Math.max(0, parseInt(val) || 0);
                                    setOtWorkers(otWorkers.map((x) => x.id === item.id ? { ...x, rate: resolvedVal } : x));
                                  }}
                                  style={{ width: "100%", height: 32, background: "#ffffff", border: "1px solid #cbd5e1", borderRadius: 6, padding: "0 8px", color: "#0f172a", fontSize: 12, outline: "none", fontWeight: 700 }}
                                />
                              </div>
                              <div>
                                <span style={{ fontSize: 9, color: "#64748b", fontWeight: 700 }}>Hours</span>
                                <input
                                  type="number"
                                  value={item.hours}
                                  onChange={(e) => {
                                    const val = e.target.value;
                                    const resolvedVal = val === "" ? "" : Math.max(0, parseFloat(val) || 0);
                                    setOtWorkers(otWorkers.map((x) => x.id === item.id ? { ...x, hours: resolvedVal } : x));
                                  }}
                                  style={{ width: "100%", height: 32, background: "#ffffff", border: "1px solid #cbd5e1", borderRadius: 6, padding: "0 8px", color: "#0f172a", fontSize: 12, outline: "none", fontWeight: 700 }}
                                />
                              </div>
                            </div>
                            <input
                              type="text"
                              placeholder="OT task details..."
                              value={item.narration}
                              onChange={(e) => {
                                setOtWorkers(otWorkers.map((x) => x.id === item.id ? { ...x, narration: e.target.value } : x));
                              }}
                              style={{ width: "100%", height: 30, background: "#ffffff", border: "1px solid #cbd5e1", borderRadius: 6, padding: "0 8px", color: "#0f172a", fontSize: 11, outline: "none" }}
                            />
                            <div style={{ fontSize: 11, color: "#10b981", textAlign: "right", fontWeight: 800 }}>
                              Subtotal: ₹{Number(item.workerCount || 0) * Number(item.rate || 0) * Number(item.hours || 0)}
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Wages Live Total Panel */}
                  <div style={{ background: "#e6f4ea", border: "1px solid #a7f3d0", padding: 14, borderRadius: 16, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    <div>
                      <span style={{ fontSize: 10, color: "#15803d", fontWeight: 800, textTransform: "uppercase" }}>Total Wages Sum</span>
                      <p style={{ margin: 0, fontSize: 9, color: "#475569" }}>(Crew + Supervisor + OT)</p>
                    </div>
                    <span style={{ fontSize: 20, fontWeight: 950, color: "#15803d" }}>
                      ₹{calculatedWages}
                    </span>
                  </div>

                  {/* Category Dropdown Selector for decluttering */}
                  <div style={{ background: "#f8fafc", border: "1px solid #e2e8f0", padding: 14, borderRadius: 16 }}>
                    <label style={{ display: "block", fontSize: 10, fontWeight: 800, color: "#0284c7", marginBottom: 6, textTransform: "uppercase", letterSpacing: "0.05em" }}>Logistics & Rental Expenses Category</label>
                    <select
                      value={activeExpenseCategory}
                      onChange={(e) => setActiveExpenseCategory(e.target.value)}
                      style={{ width: "100%", height: 40, background: "#ffffff", border: "1px solid #cbd5e1", borderRadius: 10, padding: "0 12px", color: "#0f172a", fontSize: 13, outline: "none", cursor: "pointer", fontWeight: 700 }}
                    >
                      <option value="fuel">⛽ Fuel Expenses</option>
                      <option value="travel">🚗 Transit Expenses</option>
                      <option value="room">🏠 Accommodation / Room Rent</option>
                      <option value="tool">🔧 Tool Rentals</option>
                      <option value="other">💡 Miscellaneous Expenses</option>
                    </select>
                  </div>

                  {/* Dynamic Expenses Builder - Fuel */}
                  {activeExpenseCategory === "fuel" && (
                    <div style={{ background: "#f8fafc", border: "1px solid #e2e8f0", padding: 16, borderRadius: 16, display: "flex", flexDirection: "column", gap: 12 }}>
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                        <span style={{ fontSize: 11, fontWeight: 800, color: "#0284c7", textTransform: "uppercase", letterSpacing: "0.05em" }}>Fuel Expenses</span>
                        <div style={{ display: "flex", gap: 6 }}>
                          <button type="button" onClick={() => handleSaveAndBlur("Fuel Expenses")} style={{ fontSize: 10, fontWeight: 700, color: "#64748b", background: "#ffffff", border: "1px solid #e2e8f0", borderRadius: 6, padding: "4px 8px", cursor: "pointer" }}>💾 Save</button>
                          <button
                            type="button"
                            onClick={() => setFuelExpensesList([...fuelExpensesList, { id: Math.random().toString(), amount: "", narration: "", billImage: "" }])}
                            style={{ fontSize: 10, fontWeight: 800, color: "#ffffff", background: "linear-gradient(135deg, #0284c7 0%, #0369a1 100%)", border: "none", borderRadius: 6, padding: "4px 10px", cursor: "pointer" }}
                          >
                            ➕ Add Fuel Entry
                          </button>
                        </div>
                      </div>

                      {fuelExpensesList.map((item, idx) => (
                        <div key={item.id} style={{ background: "#ffffff", border: "1px solid #e2e8f0", borderRadius: 12, padding: 12, display: "flex", flexDirection: "column", gap: 8 }}>
                          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                            <span style={{ fontSize: 11, color: "#475569", fontWeight: 700 }}>Fuel #{idx + 1}</span>
                            <button
                              type="button"
                              onClick={() => setFuelExpensesList(fuelExpensesList.filter((x) => x.id !== item.id))}
                              style={{ background: "none", border: "none", color: "#dc2626", cursor: "pointer", fontSize: 11, fontWeight: 700 }}
                            >
                              Remove
                            </button>
                          </div>
                          <div style={{ display: "grid", gridTemplateColumns: "1.2fr 1fr", gap: 8 }}>
                            <input
                              type="number"
                              placeholder="Amount (₹)"
                              value={item.amount}
                              onChange={(e) => {
                                setFuelExpensesList(fuelExpensesList.map((x) => x.id === item.id ? { ...x, amount: e.target.value } : x));
                              }}
                              style={{ height: 34, background: "#ffffff", border: "1px solid #cbd5e1", borderRadius: 8, padding: "0 8px", color: "#0f172a", fontSize: 12, outline: "none", fontWeight: 700 }}
                            />
                            <label style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 6, height: 34, background: item.billImage ? "#e6f4ea" : "#ffffff", border: item.billImage ? "1px solid #10b981" : "1px dashed #cbd5e1", borderRadius: 8, color: item.billImage ? "#10b981" : "#475569", fontSize: 10, fontWeight: 700, cursor: "pointer" }}>
                              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M21.44 11.05l-9.19 9.19a6 6 0 0 1-8.49-8.49l9.19-9.19a4 4 0 0 1 5.66 5.66l-9.2 9.19a2 2 0 0 1-2.83-2.83l8.49-8.48"/></svg>
                              {item.billImage ? (item.billImage.startsWith("data:application/pdf") ? "📄 PDF ✓" : "📸 Photo ✓") : "Doc / Camera"}
                              <input
                                type="file"
                                accept="image/*,application/pdf"
                                onChange={(e) => {
                                  const file = e.target.files?.[0];
                                  if (file) {
                                    processUploadedFile(file, (base64) => {
                                      setFuelExpensesList(fuelExpensesList.map((x) => x.id === item.id ? { ...x, billImage: base64 } : x));
                                    });
                                  }
                                }}
                                style={{ display: "none" }}
                              />
                            </label>
                          </div>
                          {item.billImage && (typeof window !== 'undefined') && (window as any).renderAttachmentPreview && (window as any).renderAttachmentPreview(item.billImage)}
                          <input
                            type="text"
                            placeholder="Fuel narration/reason..."
                            value={item.narration}
                            onChange={(e) => {
                              setFuelExpensesList(fuelExpensesList.map((x) => x.id === item.id ? { ...x, narration: e.target.value } : x));
                            }}
                            style={{ width: "100%", height: 30, background: "#ffffff", border: "1px solid #cbd5e1", borderRadius: 6, padding: "0 8px", color: "#0f172a", fontSize: 11, outline: "none" }}
                          />
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Dynamic Expenses Builder - Travel */}
                  {activeExpenseCategory === "travel" && (
                    <div style={{ background: "#f8fafc", border: "1px solid #e2e8f0", padding: 16, borderRadius: 16, display: "flex", flexDirection: "column", gap: 12 }}>
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                        <span style={{ fontSize: 11, fontWeight: 800, color: "#0284c7", textTransform: "uppercase", letterSpacing: "0.05em" }}>Transit Expenses</span>
                        <div style={{ display: "flex", gap: 6 }}>
                          <button type="button" onClick={() => handleSaveAndBlur("Transit Expenses")} style={{ fontSize: 10, fontWeight: 700, color: "#64748b", background: "#ffffff", border: "1px solid #e2e8f0", borderRadius: 6, padding: "4px 8px", cursor: "pointer" }}>💾 Save</button>
                          <button
                            type="button"
                            onClick={() => setTravelExpensesList([...travelExpensesList, { id: Math.random().toString(), amount: "", narration: "", billImage: "" }])}
                            style={{ fontSize: 10, fontWeight: 800, color: "#ffffff", background: "linear-gradient(135deg, #0284c7 0%, #0369a1 100%)", border: "none", borderRadius: 6, padding: "4px 10px", cursor: "pointer" }}
                          >
                            ➕ Add Transit Entry
                          </button>
                        </div>
                      </div>

                      {travelExpensesList.map((item, idx) => (
                        <div key={item.id} style={{ background: "#ffffff", border: "1px solid #e2e8f0", borderRadius: 12, padding: 12, display: "flex", flexDirection: "column", gap: 8 }}>
                          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                            <span style={{ fontSize: 11, color: "#475569", fontWeight: 700 }}>Transit #{idx + 1}</span>
                            <button
                              type="button"
                              onClick={() => setTravelExpensesList(travelExpensesList.filter((x) => x.id !== item.id))}
                              style={{ background: "none", border: "none", color: "#dc2626", cursor: "pointer", fontSize: 11, fontWeight: 700 }}
                            >
                              Remove
                            </button>
                          </div>
                          <div style={{ display: "grid", gridTemplateColumns: "1.2fr 1fr", gap: 8 }}>
                            <input
                              type="number"
                              placeholder="Amount (₹)"
                              value={item.amount}
                              onChange={(e) => {
                                setTravelExpensesList(travelExpensesList.map((x) => x.id === item.id ? { ...x, amount: e.target.value } : x));
                              }}
                              style={{ height: 34, background: "#ffffff", border: "1px solid #cbd5e1", borderRadius: 8, padding: "0 8px", color: "#0f172a", fontSize: 12, outline: "none", fontWeight: 700 }}
                            />
                            <label style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 6, height: 34, background: item.billImage ? "#e6f4ea" : "#ffffff", border: item.billImage ? "1px solid #10b981" : "1px dashed #cbd5e1", borderRadius: 8, color: item.billImage ? "#10b981" : "#475569", fontSize: 10, fontWeight: 700, cursor: "pointer" }}>
                              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M21.44 11.05l-9.19 9.19a6 6 0 0 1-8.49-8.49l9.19-9.19a4 4 0 0 1 5.66 5.66l-9.2 9.19a2 2 0 0 1-2.83-2.83l8.49-8.48"/></svg>
                              {item.billImage ? (item.billImage.startsWith("data:application/pdf") ? "📄 PDF ✓" : "📸 Photo ✓") : "Doc / Camera"}
                              <input
                                type="file"
                                accept="image/*,application/pdf"
                                onChange={(e) => {
                                  const file = e.target.files?.[0];
                                  if (file) {
                                    processUploadedFile(file, (base64) => {
                                      setTravelExpensesList(travelExpensesList.map((x) => x.id === item.id ? { ...x, billImage: base64 } : x));
                                    });
                                  }
                                }}
                                style={{ display: "none" }}
                              />
                            </label>
                          </div>
                          {item.billImage && (typeof window !== 'undefined') && (window as any).renderAttachmentPreview && (window as any).renderAttachmentPreview(item.billImage)}
                          <input
                            type="text"
                            placeholder="Transit details..."
                            value={item.narration}
                            onChange={(e) => {
                              setTravelExpensesList(travelExpensesList.map((x) => x.id === item.id ? { ...x, narration: e.target.value } : x));
                            }}
                            style={{ width: "100%", height: 30, background: "#ffffff", border: "1px solid #cbd5e1", borderRadius: 6, padding: "0 8px", color: "#0f172a", fontSize: 11, outline: "none" }}
                          />
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Dynamic Expenses Builder - Room Rent */}
                  {activeExpenseCategory === "room" && (
                    <div style={{ background: "#f8fafc", border: "1px solid #e2e8f0", padding: 16, borderRadius: 16, display: "flex", flexDirection: "column", gap: 12 }}>
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                        <span style={{ fontSize: 11, fontWeight: 800, color: "#0284c7", textTransform: "uppercase", letterSpacing: "0.05em" }}>Accommodation / Rent</span>
                        <div style={{ display: "flex", gap: 6 }}>
                          <button type="button" onClick={() => handleSaveAndBlur("Accommodation")} style={{ fontSize: 10, fontWeight: 700, color: "#64748b", background: "#ffffff", border: "1px solid #e2e8f0", borderRadius: 6, padding: "4px 8px", cursor: "pointer" }}>💾 Save</button>
                          <button
                            type="button"
                            onClick={() => setRoomRentList([...roomRentList, { id: Math.random().toString(), amount: "", narration: "", billImage: "" }])}
                            style={{ fontSize: 10, fontWeight: 800, color: "#ffffff", background: "linear-gradient(135deg, #0284c7 0%, #0369a1 100%)", border: "none", borderRadius: 6, padding: "4px 10px", cursor: "pointer" }}
                          >
                            ➕ Add Lodging
                          </button>
                        </div>
                      </div>

                      {roomRentList.map((item, idx) => (
                        <div key={item.id} style={{ background: "#ffffff", border: "1px solid #e2e8f0", borderRadius: 12, padding: 12, display: "flex", flexDirection: "column", gap: 8 }}>
                          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                            <span style={{ fontSize: 11, color: "#475569", fontWeight: 700 }}>Lodging #{idx + 1}</span>
                            <button
                              type="button"
                              onClick={() => setRoomRentList(roomRentList.filter((x) => x.id !== item.id))}
                              style={{ background: "none", border: "none", color: "#dc2626", cursor: "pointer", fontSize: 11, fontWeight: 700 }}
                            >
                              Remove
                            </button>
                          </div>
                          <div style={{ display: "grid", gridTemplateColumns: "1.2fr 1fr", gap: 8 }}>
                            <input
                              type="number"
                              placeholder="Amount (₹)"
                              value={item.amount}
                              onChange={(e) => {
                                setRoomRentList(roomRentList.map((x) => x.id === item.id ? { ...x, amount: e.target.value } : x));
                              }}
                              style={{ height: 34, background: "#ffffff", border: "1px solid #cbd5e1", borderRadius: 8, padding: "0 8px", color: "#0f172a", fontSize: 12, outline: "none", fontWeight: 700 }}
                            />
                            <label style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 6, height: 34, background: item.billImage ? "#e6f4ea" : "#ffffff", border: item.billImage ? "1px solid #10b981" : "1px dashed #cbd5e1", borderRadius: 8, color: item.billImage ? "#10b981" : "#475569", fontSize: 10, fontWeight: 700, cursor: "pointer" }}>
                              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M21.44 11.05l-9.19 9.19a6 6 0 0 1-8.49-8.49l9.19-9.19a4 4 0 0 1 5.66 5.66l-9.2 9.19a2 2 0 0 1-2.83-2.83l8.49-8.48"/></svg>
                              {item.billImage ? (item.billImage.startsWith("data:application/pdf") ? "📄 PDF ✓" : "📸 Photo ✓") : "Doc / Camera"}
                              <input
                                type="file"
                                accept="image/*,application/pdf"
                                onChange={(e) => {
                                  const file = e.target.files?.[0];
                                  if (file) {
                                    processUploadedFile(file, (base64) => {
                                      setRoomRentList(roomRentList.map((x) => x.id === item.id ? { ...x, billImage: base64 } : x));
                                    });
                                  }
                                }}
                                style={{ display: "none" }}
                              />
                            </label>
                          </div>
                          {item.billImage && (typeof window !== 'undefined') && (window as any).renderAttachmentPreview && (window as any).renderAttachmentPreview(item.billImage)}
                          <input
                            type="text"
                            placeholder="Lodging details..."
                            value={item.narration}
                            onChange={(e) => {
                              setRoomRentList(roomRentList.map((x) => x.id === item.id ? { ...x, narration: e.target.value } : x));
                            }}
                            style={{ width: "100%", height: 30, background: "#ffffff", border: "1px solid #cbd5e1", borderRadius: 6, padding: "0 8px", color: "#0f172a", fontSize: 11, outline: "none" }}
                          />
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Dynamic Expenses Builder - Tool Rent */}
                  {activeExpenseCategory === "tool" && (
                    <div style={{ background: "#f8fafc", border: "1px solid #e2e8f0", padding: 16, borderRadius: 16, display: "flex", flexDirection: "column", gap: 12 }}>
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                        <span style={{ fontSize: 11, fontWeight: 800, color: "#0284c7", textTransform: "uppercase", letterSpacing: "0.05em" }}>Tool Rentals</span>
                        <div style={{ display: "flex", gap: 6 }}>
                          <button type="button" onClick={() => handleSaveAndBlur("Tool Rentals")} style={{ fontSize: 10, fontWeight: 700, color: "#64748b", background: "#ffffff", border: "1px solid #e2e8f0", borderRadius: 6, padding: "4px 8px", cursor: "pointer" }}>💾 Save</button>
                          <button
                            type="button"
                            onClick={() => setToolRentList([...toolRentList, { id: Math.random().toString(), toolName: "", amount: "", narration: "", billImage: "" }])}
                            style={{ fontSize: 10, fontWeight: 800, color: "#ffffff", background: "linear-gradient(135deg, #0284c7 0%, #0369a1 100%)", border: "none", borderRadius: 6, padding: "4px 10px", cursor: "pointer" }}
                          >
                            ➕ Add Tool Rent
                          </button>
                        </div>
                      </div>

                      {toolRentList.map((item, idx) => (
                        <div key={item.id} style={{ background: "#ffffff", border: "1px solid #e2e8f0", borderRadius: 12, padding: 12, display: "flex", flexDirection: "column", gap: 8 }}>
                          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                            <span style={{ fontSize: 11, color: "#475569", fontWeight: 700 }}>Tool Rent #{idx + 1}</span>
                            <button
                              type="button"
                              onClick={() => setToolRentList(toolRentList.filter((x) => x.id !== item.id))}
                              style={{ background: "none", border: "none", color: "#dc2626", cursor: "pointer", fontSize: 11, fontWeight: 700 }}
                            >
                              Remove
                            </button>
                          </div>
                          <input
                            type="text"
                            placeholder="Tool Name (e.g. Jackhammer, Generator)"
                            value={item.toolName}
                            onChange={(e) => {
                              setToolRentList(toolRentList.map((x) => x.id === item.id ? { ...x, toolName: e.target.value } : x));
                            }}
                            style={{ width: "100%", height: 32, background: "#ffffff", border: "1px solid #cbd5e1", borderRadius: 8, padding: "0 8px", color: "#0f172a", fontSize: 12, outline: "none", fontWeight: 700 }}
                          />
                          <div style={{ display: "grid", gridTemplateColumns: "1.2fr 1fr", gap: 8 }}>
                            <input
                              type="number"
                              placeholder="Price / Cost (₹)"
                              value={item.amount}
                              onChange={(e) => {
                                setToolRentList(toolRentList.map((x) => x.id === item.id ? { ...x, amount: e.target.value } : x));
                              }}
                              style={{ height: 34, background: "#ffffff", border: "1px solid #cbd5e1", borderRadius: 8, padding: "0 8px", color: "#0f172a", fontSize: 12, outline: "none", fontWeight: 700 }}
                            />
                            <label style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 6, height: 34, background: item.billImage ? "#e6f4ea" : "#ffffff", border: item.billImage ? "1px solid #10b981" : "1px dashed #cbd5e1", borderRadius: 8, color: item.billImage ? "#10b981" : "#475569", fontSize: 10, fontWeight: 700, cursor: "pointer" }}>
                              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M21.44 11.05l-9.19 9.19a6 6 0 0 1-8.49-8.49l9.19-9.19a4 4 0 0 1 5.66 5.66l-9.2 9.19a2 2 0 0 1-2.83-2.83l8.49-8.48"/></svg>
                              {item.billImage ? (item.billImage.startsWith("data:application/pdf") ? "📄 PDF ✓" : "📸 Photo ✓") : "Doc / Camera"}
                              <input
                                type="file"
                                accept="image/*,application/pdf"
                                onChange={(e) => {
                                  const file = e.target.files?.[0];
                                  if (file) {
                                    processUploadedFile(file, (base64) => {
                                      setToolRentList(toolRentList.map((x) => x.id === item.id ? { ...x, billImage: base64 } : x));
                                    });
                                  }
                                }}
                                style={{ display: "none" }}
                              />
                            </label>
                          </div>
                          {item.billImage && (typeof window !== 'undefined') && (window as any).renderAttachmentPreview && (window as any).renderAttachmentPreview(item.billImage)}
                          <input
                            type="text"
                            placeholder="Tool rent narration..."
                            value={item.narration}
                            onChange={(e) => {
                              setToolRentList(toolRentList.map((x) => x.id === item.id ? { ...x, narration: e.target.value } : x));
                            }}
                            style={{ width: "100%", height: 30, background: "#ffffff", border: "1px solid #cbd5e1", borderRadius: 6, padding: "0 8px", color: "#0f172a", fontSize: 11, outline: "none" }}
                          />
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Dynamic Expenses Builder - Other Uncategorized Expenses */}
                  {activeExpenseCategory === "other" && (
                    <div style={{ background: "#f8fafc", border: "1px solid #e2e8f0", padding: 16, borderRadius: 16, display: "flex", flexDirection: "column", gap: 12 }}>
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                        <span style={{ fontSize: 11, fontWeight: 800, color: "#d97706", textTransform: "uppercase", letterSpacing: "0.05em" }}>Miscellaneous Expenses</span>
                        <div style={{ display: "flex", gap: 6 }}>
                          <button type="button" onClick={() => handleSaveAndBlur("Misc Expenses")} style={{ fontSize: 10, fontWeight: 700, color: "#64748b", background: "#ffffff", border: "1px solid #e2e8f0", borderRadius: 6, padding: "4px 8px", cursor: "pointer" }}>💾 Save</button>
                          <button
                            type="button"
                            onClick={() => setOtherExpensesList([...otherExpensesList, { id: Math.random().toString(), name: "", amount: "", narration: "", billImage: "" }])}
                            style={{ fontSize: 10, fontWeight: 800, color: "#ffffff", background: "linear-gradient(135deg, #d97706 0%, #b45309 100%)", border: "none", borderRadius: 6, padding: "4px 10px", cursor: "pointer" }}
                          >
                            ➕ Add Misc
                          </button>
                        </div>
                      </div>

                      {otherExpensesList.map((item, idx) => (
                        <div key={item.id} style={{ background: "#ffffff", border: "1px solid #e2e8f0", borderRadius: 12, padding: 12, display: "flex", flexDirection: "column", gap: 8 }}>
                          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                            <span style={{ fontSize: 11, color: "#d97706", fontWeight: 700 }}>Misc Entry #{idx + 1}</span>
                            <button
                              type="button"
                              onClick={() => setOtherExpensesList(otherExpensesList.filter((x) => x.id !== item.id))}
                              style={{ background: "none", border: "none", color: "#dc2626", cursor: "pointer", fontSize: 11, fontWeight: 700 }}
                            >
                              Remove
                            </button>
                          </div>
                          <input
                            type="text"
                            placeholder="Expense Name (e.g. Refreshments, Stationery)"
                            value={item.name}
                            onChange={(e) => {
                              setOtherExpensesList(otherExpensesList.map((x) => x.id === item.id ? { ...x, name: e.target.value } : x));
                            }}
                            style={{ width: "100%", height: 32, background: "#ffffff", border: "1px solid #cbd5e1", borderRadius: 8, padding: "0 8px", color: "#0f172a", fontSize: 12, outline: "none", fontWeight: 700 }}
                          />
                          <div style={{ display: "grid", gridTemplateColumns: "1.2fr 1fr", gap: 8 }}>
                            <input
                              type="number"
                              placeholder="Price / Amount (₹)"
                              value={item.amount}
                              onChange={(e) => {
                                setOtherExpensesList(otherExpensesList.map((x) => x.id === item.id ? { ...x, amount: e.target.value } : x));
                              }}
                              style={{ height: 34, background: "#ffffff", border: "1px solid #cbd5e1", borderRadius: 8, padding: "0 8px", color: "#0f172a", fontSize: 12, outline: "none", fontWeight: 700 }}
                            />
                            <label style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 6, height: 34, background: item.billImage ? "#e6f4ea" : "#ffffff", border: item.billImage ? "1px solid #10b981" : "1px dashed #cbd5e1", borderRadius: 8, color: item.billImage ? "#10b981" : "#475569", fontSize: 10, fontWeight: 700, cursor: "pointer" }}>
                              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M21.44 11.05l-9.19 9.19a6 6 0 0 1-8.49-8.49l9.19-9.19a4 4 0 0 1 5.66 5.66l-9.2 9.19a2 2 0 0 1-2.83-2.83l8.49-8.48"/></svg>
                              {item.billImage ? (item.billImage.startsWith("data:application/pdf") ? "📄 PDF ✓" : "📸 Photo ✓") : "Doc / Camera"}
                              <input
                                type="file"
                                accept="image/*,application/pdf"
                                onChange={(e) => {
                                  const file = e.target.files?.[0];
                                  if (file) {
                                    processUploadedFile(file, (base64) => {
                                      setOtherExpensesList(otherExpensesList.map((x) => x.id === item.id ? { ...x, billImage: base64 } : x));
                                    });
                                  }
                                }}
                                style={{ display: "none" }}
                              />
                            </label>
                          </div>
                          {item.billImage && (typeof window !== 'undefined') && (window as any).renderAttachmentPreview && (window as any).renderAttachmentPreview(item.billImage)}
                          <input
                            type="text"
                            placeholder="Miscellaneous notes..."
                            value={item.narration}
                            onChange={(e) => {
                              setOtherExpensesList(otherExpensesList.map((x) => x.id === item.id ? { ...x, narration: e.target.value } : x));
                            }}
                            style={{ width: "100%", height: 30, background: "#ffffff", border: "1px solid #cbd5e1", borderRadius: 6, padding: "0 8px", color: "#0f172a", fontSize: 11, outline: "none" }}
                          />
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Expenses Live Total */}
                  <div style={{ background: "rgba(2, 132, 199, 0.06)", border: "1px solid rgba(2, 132, 199, 0.15)", padding: 14, borderRadius: 16, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    <div>
                      <span style={{ fontSize: 10, color: "#0284c7", fontWeight: 800, textTransform: "uppercase" }}>Total Logistics Expenses</span>
                      <p style={{ margin: 0, fontSize: 9, color: "#475569" }}>(Fuel+Transit+Lodging+Tools+Misc)</p>
                    </div>
                    <span style={{ fontSize: 20, fontWeight: 950, color: "#0284c7" }}>
                      ₹{totalFuel + totalTravel + totalRoomRent + totalToolRent + totalOtherRent}
                    </span>
                  </div>
                    </div> {/* End of RIGHT COLUMN */}
                  </div> {/* End of wizard-two-column */}
                </div>
              )}

              {/* STEP 2: WIP PROGRESS (TRENCHING & METRICS) */}
              {reportStep === 2 && (
                <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    <h4 style={{ fontSize: 13, fontWeight: 800, color: "#0284c7", textTransform: "uppercase", margin: 0 }}>Step 2: SDD & WIP Progress Metrics</h4>
                    <button
                      type="button"
                      onClick={() => handleSaveAndBlur("WIP Progress Metrics")}
                      style={{ fontSize: 10, fontWeight: 750, color: "#0284c7", background: "rgba(2, 132, 199, 0.06)", border: "1px solid rgba(2, 132, 199, 0.2)", borderRadius: 6, padding: "4px 8px", cursor: "pointer" }}
                    >
                      💾 Save WIP Section
                    </button>
                  </div>

                  {/* Category Dropdown Selector for WIP Progress */}
                  <div style={{ background: "#f8fafc", border: "1px solid #e2e8f0", padding: 14, borderRadius: 16 }}>
                    <label style={{ display: "block", fontSize: 10, fontWeight: 800, color: "#0284c7", marginBottom: 6, textTransform: "uppercase", letterSpacing: "0.05em" }}>Select WIP Metric to Input</label>
                    <select
                      value={activeWipMetric}
                      onChange={(e) => setActiveWipMetric(e.target.value)}
                      style={{ width: "100%", height: 40, background: "#ffffff", border: "1px solid #cbd5e1", borderRadius: 10, padding: "0 12px", color: "#0f172a", fontSize: 13, outline: "none", cursor: "pointer", fontWeight: 700 }}
                    >
                      <option value="trenching">🚜 SDD (Trenching) (m)</option>
                      <option value="hdd">🕳️ SDD (HDD) (m)</option>
                      <option value="cable_laying">🔌 Cable Laying (m)</option>
                      <option value="cable_mounding">🪨 Cable Mounting (m)</option>
                      <option value="jointing">🪵 Cable Joining</option>
                      <option value="rmu">🧱 RMU Transformer Foundations</option>
                      <option value="terminations">⚡ Outdoor / Indoor Terminations</option>
                    </select>
                  </div>

                  {/* Dynamic Metrics List */}
                  {[
                    { key: "trenching", label: "SDD (Trenching) (m)", val: wipTrenchingValue, setVal: setWipTrenchingValue, narr: wipTrenchingNarration, setNarr: setWipTrenchingNarration, pic: wipTrenchingPhoto, setPic: setWipTrenchingPhoto },
                    { key: "hdd", label: "SDD (HDD) (m)", val: wipHddValue, setVal: setWipHddValue, narr: wipHddNarration, setNarr: setWipHddNarration, pic: wipHddPhoto, setPic: setWipHddPhoto },
                    { key: "cable_laying", label: "Cable Laying (m)", val: wipCableLayingValue, setVal: setWipCableLayingValue, narr: wipCableLayingNarration, setNarr: setWipCableLayingNarration, pic: wipCableLayingPhoto, setPic: setWipCableLayingPhoto },
                    { key: "cable_mounding", label: "Cable Mounting (m)", val: wipCableMoundingValue, setVal: setWipCableMoundingValue, narr: wipCableMoundingNarration, setNarr: setWipCableMoundingNarration, pic: wipCableMoundingPhoto, setPic: setWipCableMoundingPhoto },
                    { key: "jointing", label: "Cable Joining", val: wipJoiningValue, setVal: setWipJoiningValue, narr: wipJoiningNarration, setNarr: setWipJoiningNarration, pic: wipJoiningPhoto, setPic: setWipJoiningPhoto },
                    { key: "rmu", label: "RMU Transformer Foundations", val: wipRmuValue, setVal: setWipRmuValue, narr: wipRmuNarration, setNarr: setWipRmuNarration, pic: wipRmuPhoto, setPic: setWipRmuPhoto },
                    { key: "terminations", label: "Outdoor / Indoor Terminations", val: wipTerminationsValue, setVal: setWipTerminationsValue, narr: wipTerminationsNarration, setNarr: setWipTerminationsNarration, pic: wipTerminationsPhoto, setPic: setWipTerminationsPhoto }
                  ]
                  .filter((m) => m.key === activeWipMetric)
                  .map((m, idx) => {
                    if (m.key === "hdd") {
                      return (
                        <div key={idx} style={{ background: "#f8fafc", border: "1px solid #e2e8f0", padding: 14, borderRadius: 16, display: "flex", flexDirection: "column", gap: 12 }}>
                          <span style={{ fontSize: 12, fontWeight: 800, color: "#334155", textTransform: "uppercase" }}>🕳️ HDD Drilling Inspection Report Data</span>

                          {/* HDD Metadata Grid */}
                          <div style={{ background: "#ffffff", border: "1px solid #e2e8f0", padding: 12, borderRadius: 12, display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
                            <div>
                              <label style={{ display: "block", fontSize: 9, fontWeight: 800, color: "#475569", marginBottom: 2 }}>MACHINE NO / NAME</label>
                              <input
                                type="text"
                                value={hddMachineName}
                                onChange={(e) => setHddMachineName(e.target.value)}
                                style={{ width: "100%", height: 32, background: "#ffffff", border: "1px solid #cbd5e1", borderRadius: 8, padding: "0 8px", color: "#0f172a", fontSize: 11, outline: "none", fontWeight: 700 }}
                              />
                            </div>
                            <div>
                              <label style={{ display: "block", fontSize: 9, fontWeight: 800, color: "#475569", marginBottom: 2 }}>VENDOR / CONTRACTOR</label>
                              <input
                                type="text"
                                value={hddVendorName}
                                onChange={(e) => setHddVendorName(e.target.value)}
                                style={{ width: "100%", height: 32, background: "#ffffff", border: "1px solid #cbd5e1", borderRadius: 8, padding: "0 8px", color: "#0f172a", fontSize: 11, outline: "none", fontWeight: 700 }}
                              />
                            </div>
                            <div>
                              <label style={{ display: "block", fontSize: 9, fontWeight: 800, color: "#475569", marginBottom: 2 }}>TRACKER / SURVEYOR</label>
                              <input
                                type="text"
                                value={hddTrackerName}
                                onChange={(e) => setHddTrackerName(e.target.value)}
                                style={{ width: "100%", height: 32, background: "#ffffff", border: "1px solid #cbd5e1", borderRadius: 8, padding: "0 8px", color: "#0f172a", fontSize: 11, outline: "none", fontWeight: 700 }}
                              />
                            </div>
                            <div>
                              <label style={{ display: "block", fontSize: 9, fontWeight: 800, color: "#475569", marginBottom: 2 }}>OPERATOR NAME</label>
                              <input
                                type="text"
                                value={hddOperatorName}
                                onChange={(e) => setHddOperatorName(e.target.value)}
                                style={{ width: "100%", height: 32, background: "#ffffff", border: "1px solid #cbd5e1", borderRadius: 8, padding: "0 8px", color: "#0f172a", fontSize: 11, outline: "none", fontWeight: 700 }}
                              />
                            </div>
                            <div>
                              <label style={{ display: "block", fontSize: 9, fontWeight: 800, color: "#475569", marginBottom: 2 }}>NO OF DUCT / COLOR</label>
                              <input
                                type="text"
                                value={hddDuctsInfo}
                                onChange={(e) => setHddDuctsInfo(e.target.value)}
                                style={{ width: "100%", height: 32, background: "#ffffff", border: "1px solid #cbd5e1", borderRadius: 8, padding: "0 8px", color: "#0f172a", fontSize: 11, outline: "none", fontWeight: 700 }}
                              />
                            </div>
                            <div>
                              <label style={{ display: "block", fontSize: 9, fontWeight: 800, color: "#475569", marginBottom: 2 }}>SINGLE ROD LENGTH (M)</label>
                              <input
                                type="number"
                                step="0.1"
                                value={hddRodLengthM}
                                onChange={(e) => setHddRodLengthM(Math.max(0.1, parseFloat(e.target.value) || 3.0))}
                                style={{ width: "100%", height: 32, background: "#ffffff", border: "1px solid #cbd5e1", borderRadius: 8, padding: "0 8px", color: "#0f172a", fontSize: 11, outline: "none", fontWeight: 700 }}
                              />
                            </div>
                          </div>

                          {/* Dynamic Graph Canvas */}
                          <div style={{ background: "#ffffff", border: "1px solid #cbd5e1", borderRadius: 12, padding: 10, display: "flex", flexDirection: "column", gap: 6 }}>
                            <span style={{ fontSize: 10, fontWeight: 800, color: "#0284c7", textTransform: "uppercase" }}>📈 Bore Path Profile Graph (Auto-plotted)</span>
                            <div style={{ width: "100%", overflow: "hidden", display: "flex", justifyContent: "center" }}>
                              <canvas id="hddBoreCanvas" width="550" height="240" style={{ width: "100%", maxWidth: "550px", height: "auto", border: "1px solid #f1f5f9", background: "#ffffff" }} />
                            </div>
                          </div>

                          {/* Total Length summary */}
                          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", background: "rgba(2, 132, 199, 0.06)", border: "1px solid rgba(2, 132, 199, 0.15)", padding: 12, borderRadius: 12 }}>
                            <div>
                              <span style={{ fontSize: 10, color: "#0284c7", fontWeight: 800, textTransform: "uppercase" }}>Total Drilling Completed</span>
                              <p style={{ margin: 0, fontSize: 9, color: "#475569" }}>(Calculated automatically as Rods count × Rod Length)</p>
                            </div>
                            <span style={{ fontSize: 18, fontWeight: 950, color: "#0284c7" }}>
                              {Number((hddDrillingLogs.length * hddRodLengthM).toFixed(1))} meters
                            </span>
                          </div>

                          {/* Rod Logs Dynamic List */}
                          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                              <span style={{ fontSize: 11, fontWeight: 800, color: "#64748b", textTransform: "uppercase", letterSpacing: "0.05em" }}>Logged Rod Segments ({hddDrillingLogs.length})</span>
                              <button
                                type="button"
                                onClick={() => {
                                  const nextRodNo = hddDrillingLogs.length + 1;
                                  setHddDrillingLogs([...hddDrillingLogs, { id: Math.random().toString(), rodNo: nextRodNo, pitch: "", depth: "", strata: "Clay", crossing: "" }]);
                                }}
                                style={{ fontSize: 9, fontWeight: 800, color: "#ffffff", background: "linear-gradient(135deg, #0284c7 0%, #0369a1 100%)", border: "none", borderRadius: 6, padding: "5px 10px", cursor: "pointer" }}
                              >
                                ➕ Add Rod #{hddDrillingLogs.length + 1} Log
                              </button>
                            </div>

                            {hddDrillingLogs.length === 0 ? (
                              <div style={{ padding: 16, background: "#ffffff", border: "1px dashed #cbd5e1", borderRadius: 12, textAlign: "center", color: "#64748b", fontSize: 11, fontStyle: "italic" }}>
                                No rod logs added yet. Click above to log the first segment.
                              </div>
                            ) : (
                              <div style={{ display: "flex", flexDirection: "column", gap: 8, maxHeight: 350, overflowY: "auto", paddingRight: 4 }}>
                                {hddDrillingLogs.map((log, index) => (
                                  <div key={log.id} style={{ background: "#ffffff", border: "1px solid #cbd5e1", borderRadius: 12, padding: 10, display: "flex", flexDirection: "column", gap: 6 }}>
                                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", borderBottom: "1px solid #f1f5f9", paddingBottom: 4 }}>
                                      <span style={{ fontSize: 10, fontWeight: 800, color: "#0f172a" }}>
                                        🚧 Rod #{index + 1} <span style={{ color: "#64748b", fontWeight: 500 }}>(Distance: {((index + 1) * hddRodLengthM).toFixed(1)}m)</span>
                                      </span>
                                      <button
                                        type="button"
                                        onClick={() => {
                                          const filtered = hddDrillingLogs.filter(x => x.id !== log.id);
                                          const reindexed = filtered.map((x, i) => ({ ...x, rodNo: i + 1 }));
                                          setHddDrillingLogs(reindexed);
                                        }}
                                        style={{ background: "none", border: "none", color: "#dc2626", cursor: "pointer", fontSize: 9, fontWeight: 800 }}
                                      >
                                        Delete
                                      </button>
                                    </div>
                                    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
                                      <div>
                                        <label style={{ display: "block", fontSize: 8, fontWeight: 700, color: "#64748b", marginBottom: 2 }}>PITCH (%)</label>
                                        <input
                                          type="number"
                                          placeholder="e.g. -8"
                                          value={log.pitch}
                                          onChange={(e) => {
                                            const updated = hddDrillingLogs.map(x => x.id === log.id ? { ...x, pitch: e.target.value } : x);
                                            setHddDrillingLogs(updated);
                                          }}
                                          style={{ width: "100%", height: 28, background: "#ffffff", border: "1px solid #cbd5e1", borderRadius: 6, padding: "0 6px", color: "#0f172a", fontSize: 11, outline: "none", fontWeight: 700 }}
                                        />
                                      </div>
                                      <div>
                                        <label style={{ display: "block", fontSize: 8, fontWeight: 700, color: "#64748b", marginBottom: 2 }}>DEPTH (M)</label>
                                        <input
                                          type="number"
                                          step="0.01"
                                          placeholder="e.g. 1.8"
                                          value={log.depth}
                                          onChange={(e) => {
                                            const updated = hddDrillingLogs.map(x => x.id === log.id ? { ...x, depth: e.target.value } : x);
                                            setHddDrillingLogs(updated);
                                          }}
                                          style={{ width: "100%", height: 28, background: "#ffffff", border: "1px solid #cbd5e1", borderRadius: 6, padding: "0 6px", color: "#0f172a", fontSize: 11, outline: "none", fontWeight: 700 }}
                                        />
                                      </div>
                                      <div>
                                        <label style={{ display: "block", fontSize: 8, fontWeight: 700, color: "#64748b", marginBottom: 2 }}>SOIL / STRATA</label>
                                        <select
                                          value={log.strata}
                                          onChange={(e) => {
                                            const updated = hddDrillingLogs.map(x => x.id === log.id ? { ...x, strata: e.target.value } : x);
                                            setHddDrillingLogs(updated);
                                          }}
                                          style={{ width: "100%", height: 28, background: "#ffffff", border: "1px solid #cbd5e1", borderRadius: 6, padding: "0 6px", color: "#0f172a", fontSize: 11, outline: "none", cursor: "pointer", fontWeight: 700 }}
                                        >
                                          <option value="Clay">Soft Clay</option>
                                          <option value="Sand">Silty Sand</option>
                                          <option value="Soft Rock">Soft Rock</option>
                                          <option value="Hard Rock">Hard Rock</option>
                                          <option value="Water">Wet Soil / Water</option>
                                          <option value="Other">Other</option>
                                        </select>
                                      </div>
                                      <div>
                                        <label style={{ display: "block", fontSize: 8, fontWeight: 700, color: "#64748b", marginBottom: 2 }}>CROSSING UTILITY / NOTE</label>
                                        <input
                                          type="text"
                                          placeholder="e.g. Water pipe"
                                          value={log.crossing}
                                          onChange={(e) => {
                                            const updated = hddDrillingLogs.map(x => x.id === log.id ? { ...x, crossing: e.target.value } : x);
                                            setHddDrillingLogs(updated);
                                          }}
                                          style={{ width: "100%", height: 28, background: "#ffffff", border: "1px solid #cbd5e1", borderRadius: 6, padding: "0 6px", color: "#0f172a", fontSize: 11, outline: "none" }}
                                        />
                                      </div>
                                    </div>
                                  </div>
                                ))}
                              </div>
                            )}
                          </div>
                        </div>
                      );
                    }

                    return (
                      <div key={idx} style={{ background: "#f8fafc", border: "1px solid #e2e8f0", padding: 14, borderRadius: 16, display: "flex", flexDirection: "column", gap: 8 }}>
                        <span style={{ fontSize: 12, fontWeight: 800, color: "#334155", textTransform: "uppercase" }}>{m.label}</span>
                      
                      <div style={{ display: "grid", gridTemplateColumns: "1.2fr 1fr", gap: 8 }}>
                        <input
                          type="number"
                          placeholder="0.00"
                          value={m.val}
                          onChange={(e) => m.setVal(e.target.value)}
                          style={{ height: 34, background: "#ffffff", border: "1px solid #cbd5e1", borderRadius: 8, padding: "0 8px", color: "#0f172a", fontSize: 12, outline: "none", fontWeight: 700 }}
                        />
                        <label style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 6, height: 34, background: m.pic ? "#e6f4ea" : "#ffffff", border: m.pic ? "1px solid #10b981" : "1px dashed #cbd5e1", borderRadius: 8, color: m.pic ? "#10b981" : "#475569", fontSize: 10, fontWeight: 700, cursor: "pointer" }}>
                          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"/><circle cx="12" cy="13" r="4"/></svg>
                          {m.pic ? (m.pic.startsWith("data:application/pdf") ? "📄 PDF ✓" : "📸 Photo ✓") : "Doc / Camera"}
                          <input
                            type="file"
                            accept="image/*,application/pdf"
                            onChange={(e) => {
                              const file = e.target.files?.[0];
                              if (file) {
                                processUploadedFile(file, (base64) => {
                                  m.setPic(base64);
                                });
                              }
                            }}
                            style={{ display: "none" }}
                          />
                        </label>
                      </div>

                      {m.pic && (typeof window !== 'undefined') && (window as any).renderAttachmentPreview && (window as any).renderAttachmentPreview(m.pic)}
                      <input
                        type="text"
                        placeholder="Progress narration details..."
                        value={m.narr}
                        onChange={(e) => m.setNarr(e.target.value)}
                        style={{ width: "100%", height: 30, background: "#ffffff", border: "1px solid #cbd5e1", borderRadius: 6, padding: "0 8px", color: "#0f172a", fontSize: 11, outline: "none" }}
                      />

                      {/* Dual Map Pinpointing */}
                      {(m.key === "trenching" || m.key === "cable_laying") && selectedProjectItem && (
                        <div style={{ marginTop: 10, display: "flex", flexDirection: "column", gap: 10 }}>
                          <span style={{ fontSize: 10, fontWeight: 800, color: "#0284c7", textTransform: "uppercase" }}>
                            🗺️ Progress Mapping (Click map to set Start/End, drag pins to adjust)
                          </span>
                          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
                            
                            {/* Left Map: Reference Corridor */}
                            <div style={{ border: "1px solid #cbd5e1", borderRadius: 12, overflow: "hidden", height: 200, background: "#f1f5f9" }}>
                              <div style={{ padding: 4, background: "#f8fafc", borderBottom: "1px solid #cbd5e1", fontSize: 9, fontWeight: 700, color: "#475569" }}>
                                📋 Project Corridor Reference
                              </div>
                              <iframe
                                title="Reference Corridor Map"
                                style={{ width: "100%", height: 176, border: "none" }}
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
                                      const map = L.map('map', { zoomControl: false, dragging: true }).setView([${selectedProjectItem.startCoords[0]}, ${selectedProjectItem.startCoords[1]}], 14);
                                      L.tileLayer('https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png', { maxZoom: 19 }).addTo(map);
                                      
                                      // Plot planned path
                                      const start = [${selectedProjectItem.startCoords[0]}, ${selectedProjectItem.startCoords[1]}];
                                      const end = [${selectedProjectItem.endCoords[0]}, ${selectedProjectItem.endCoords[1]}];
                                      const middlePoints = ${JSON.stringify(selectedProjectItem.middlePoints || [])};
                                      const path = [start, ...middlePoints, end];
                                      
                                      const customUtility = ${JSON.stringify(selectedProjectItem.utilityPath ?? [])};
                                      if (customUtility && customUtility.length >= 2) {
                                        L.polyline(customUtility, { color: '#a855f7', weight: 4, opacity: 0.95, lineJoin: 'round' }).addTo(map);
                                      } else {
                                        L.polyline(path, { color: '#a855f7', weight: 4, opacity: 0.95 }).addTo(map);
                                      }

                                      L.circleMarker(start, { color: '#16a34a', radius: 6, fillOpacity: 0.9 }).addTo(map);
                                      L.circleMarker(end, { color: '#dc2626', radius: 6, fillOpacity: 0.9 }).addTo(map);
                                      
                                      middlePoints.forEach(function(pt, idx) {
                                        L.circleMarker(pt, { color: '#fbbf24', radius: 5, fillOpacity: 0.9 }).addTo(map);
                                      });
                                      
                                      try {
                                        if (customUtility && customUtility.length > 0) {
                                          map.fitBounds(customUtility);
                                        } else {
                                          map.fitBounds(path);
                                        }
                                      } catch(e) {}
                                    </script>
                                  </body>
                                  </html>
                                `}
                              />
                            </div>

                            {/* Right Map: Interactive Pinpoint */}
                            <div style={{ border: "1px solid #cbd5e1", borderRadius: 12, overflow: "hidden", height: 200, background: "#f1f5f9" }}>
                              <div style={{ padding: 4, background: "#f8fafc", borderBottom: "1px solid #cbd5e1", fontSize: 9, fontWeight: 700, color: "#475569" }}>
                                📍 Today's Work Segment
                              </div>
                              <iframe
                                title="Interactive Progress Map"
                                style={{ width: "100%", height: 176, border: "none" }}
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
                                      const projStart = [${selectedProjectItem.startCoords[0]}, ${selectedProjectItem.startCoords[1]}];
                                      
                                      // Get active coords (null initially if not marked)
                                      let startLat = ${m.key === "trenching" ? (trenchingStartLat ? Number(trenchingStartLat) : "null") : (cableLayingStartLat ? Number(cableLayingStartLat) : "null")};
                                      let startLng = ${m.key === "trenching" ? (trenchingStartLng ? Number(trenchingStartLng) : "null") : (cableLayingStartLng ? Number(cableLayingStartLng) : "null")};
                                      let endLat = ${m.key === "trenching" ? (trenchingEndLat ? Number(trenchingEndLat) : "null") : (cableLayingEndLat ? Number(cableLayingEndLat) : "null")};
                                      let endLng = ${m.key === "trenching" ? (trenchingEndLng ? Number(trenchingEndLng) : "null") : (cableLayingEndLng ? Number(cableLayingEndLng) : "null")};
                                      
                                      const centerLat = startLat || projStart[0];
                                      const centerLng = startLng || projStart[1];

                                      const map = L.map('map', { zoomControl: false }).setView([centerLat, centerLng], 15);
                                      L.tileLayer('https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png', { maxZoom: 19 }).addTo(map);

                                      // Green marker for Start
                                      const startIcon = L.divIcon({
                                        className: 'custom-div-icon',
                                        html: "<div style='background-color:#16a34a;width:12px;height:12px;border:2px solid white;border-radius:50%;box-shadow:0 2px 5px rgba(0,0,0,0.3)'></div>",
                                        iconSize: [12, 12],
                                        iconAnchor: [6, 6]
                                      });

                                      // Red marker for End
                                      const endIcon = L.divIcon({
                                        className: 'custom-div-icon',
                                        html: "<div style='background-color:#dc2626;width:12px;height:12px;border:2px solid white;border-radius:50%;box-shadow:0 2px 5px rgba(0,0,0,0.3)'></div>",
                                        iconSize: [12, 12],
                                        iconAnchor: [6, 6]
                                      });

                                      let startMarker = null;
                                      let endMarker = null;
                                      let routedLine = null;

                                      if (startLat && startLng) {
                                        startMarker = L.marker([startLat, startLng], { icon: startIcon, draggable: true }).addTo(map);
                                        startMarker.on('dragend', updateRoute);
                                      }
                                      if (endLat && endLng) {
                                        endMarker = L.marker([endLat, endLng], { icon: endIcon, draggable: true }).addTo(map);
                                        endMarker.on('dragend', updateRoute);
                                      }

                                      if (startMarker && endMarker) {
                                        updateRoute();
                                      }

                                      function updateRoute() {
                                        if (!startMarker || !endMarker) return;
                                        const s = startMarker.getLatLng();
                                        const e = endMarker.getLatLng();
                                        
                                        // 1. Post back to parent React view
                                        window.parent.postMessage({
                                          source: '${m.key === "trenching" ? "trenching-pinpoint" : "cable-laying-pinpoint"}',
                                          type: 'start',
                                          lat: s.lat,
                                          lng: s.lng
                                        }, '*');
                                        window.parent.postMessage({
                                          source: '${m.key === "trenching" ? "trenching-pinpoint" : "cable-laying-pinpoint"}',
                                          type: 'end',
                                          lat: e.lat,
                                          lng: e.lng
                                        }, '*');

                                        // 2. Fetch OSRM route to follow the road
                                        const url = "https://router.project-osrm.org/route/v1/driving/" + s.lng + "," + s.lat + ";" + e.lng + "," + e.lat + "?overview=full&geometries=geojson";
                                        fetch(url)
                                          .then(function(r) { return r.json(); })
                                          .then(function(data) {
                                            if (data.routes && data.routes.length > 0) {
                                              const coords = data.routes[0].geometry.coordinates.map(function(c) { return [c[1], c[0]]; });
                                              if (routedLine) {
                                                map.removeLayer(routedLine);
                                              }
                                              routedLine = L.polyline(coords, { color: '#0284c7', weight: 4, opacity: 0.9 }).addTo(map);
                                              
                                              window.parent.postMessage({
                                                source: '${m.key === "trenching" ? "trenching-pinpoint" : "cable-laying-pinpoint"}',
                                                type: 'route_path',
                                                path: coords
                                              }, '*');
                                            } else {
                                              throw new Error("No route");
                                            }
                                          })
                                          .catch(function(err) {
                                            if (routedLine) {
                                              map.removeLayer(routedLine);
                                            }
                                            routedLine = L.polyline([s, e], { color: '#0284c7', weight: 4, dashArray: '5, 5' }).addTo(map);
                                          });
                                      }

                                      map.on('click', function(e) {
                                        const lat = e.latlng.lat;
                                        const lng = e.latlng.lng;
                                        
                                        if (!startMarker) {
                                          startMarker = L.marker([lat, lng], { icon: startIcon, draggable: true }).addTo(map);
                                          startMarker.on('dragend', updateRoute);
                                          
                                          window.parent.postMessage({
                                            source: '${m.key === "trenching" ? "trenching-pinpoint" : "cable-laying-pinpoint"}',
                                            type: 'start',
                                            lat: lat,
                                            lng: lng
                                          }, '*');
                                        } else if (!endMarker) {
                                          endMarker = L.marker([lat, lng], { icon: endIcon, draggable: true }).addTo(map);
                                          endMarker.on('dragend', updateRoute);
                                          updateRoute();
                                        } else {
                                          // Reset and start over
                                          map.removeLayer(startMarker);
                                          map.removeLayer(endMarker);
                                          if (routedLine) map.removeLayer(routedLine);
                                          
                                          startMarker = L.marker([lat, lng], { icon: startIcon, draggable: true }).addTo(map);
                                          startMarker.on('dragend', updateRoute);
                                          endMarker = null;
                                          routedLine = null;
                                          
                                          window.parent.postMessage({
                                            source: '${m.key === "trenching" ? "trenching-pinpoint" : "cable-laying-pinpoint"}',
                                            type: 'start',
                                            lat: lat,
                                            lng: lng
                                          }, '*');
                                        }
                                      });

                                      try {
                                        if (startMarker && endMarker) {
                                          map.fitBounds([startMarker.getLatLng(), endMarker.getLatLng()], { padding: [20, 20] });
                                        } else {
                                          map.fitBounds([projStart]);
                                        }
                                      } catch(err) {}
                                    </script>
                                  </body>
                                  </html>
                                `}
                              />
                            </div>
                          </div>
                          
                          {/* Coordinates Text Inputs */}
                          <div style={{ display: "grid", gridTemplateColumns: "1fr", gap: 10, fontSize: 10, background: "#ffffff", padding: 10, border: "1px solid #cbd5e1", borderRadius: 10, textAlign: "center" }}>
                            {((m.key === "trenching" && trenchingStartLat) || (m.key === "cable_laying" && cableLayingStartLat)) ? (
                              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
                                <div>
                                  <strong style={{ color: "#16a34a", display: "block" }}>Start Position</strong>
                                  <span style={{ fontFamily: "monospace", fontSize: 11, fontWeight: 700 }}>
                                    {m.key === "trenching" 
                                      ? `${Number(trenchingStartLat).toFixed(6)}, ${Number(trenchingStartLng).toFixed(6)}` 
                                      : `${Number(cableLayingStartLat).toFixed(6)}, ${Number(cableLayingStartLng).toFixed(6)}`
                                    }
                                  </span>
                                </div>
                                <div>
                                  <strong style={{ color: "#dc2626", display: "block" }}>End Position</strong>
                                  <span style={{ fontFamily: "monospace", fontSize: 11, fontWeight: 700 }}>
                                    {m.key === "trenching" && trenchingEndLat
                                      ? `${Number(trenchingEndLat).toFixed(6)}, ${Number(trenchingEndLng).toFixed(6)}`
                                      : (m.key === "cable_laying" && cableLayingEndLat 
                                        ? `${Number(cableLayingEndLat).toFixed(6)}, ${Number(cableLayingEndLng).toFixed(6)}`
                                        : "Not set")
                                    }
                                  </span>
                                </div>
                              </div>
                            ) : (
                              <span style={{ color: "#64748b", fontStyle: "italic", fontSize: 11 }}>
                                📍 Map is currently empty. Click on the map to pinpoint Start and End points.
                              </span>
                            )}
                          </div>
                        </div>
                      )}
                    </div>
                  }})
                </div>
              )}

              {/* STEP 3: STATUTORY CLEARANCES */}
              {reportStep === 3 && (
                <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    <h4 style={{ fontSize: 13, fontWeight: 800, color: "#0284c7", textTransform: "uppercase", margin: 0 }}>Step 3: Site Clearance Registry</h4>
                    <button
                      type="button"
                      onClick={() => handleSaveAndBlur("Clearance Documents")}
                      style={{ fontSize: 10, fontWeight: 750, color: "#0284c7", background: "rgba(2, 132, 199, 0.06)", border: "1px solid rgba(2, 132, 199, 0.2)", borderRadius: 6, padding: "4px 8px", cursor: "pointer" }}
                    >
                      💾 Save Registry
                    </button>
                  </div>
                  
                  {/* Category Dropdown Selector for Clearance Registry */}
                  <div style={{ background: "#f8fafc", border: "1px solid #e2e8f0", padding: 14, borderRadius: 16 }}>
                    <label style={{ display: "block", fontSize: 10, fontWeight: 800, color: "#0284c7", marginBottom: 6, textTransform: "uppercase", letterSpacing: "0.05em" }}>Select Clearance Agency</label>
                    <select
                      value={activeClearanceCategory}
                      onChange={(e) => setActiveClearanceCategory(e.target.value)}
                      style={{ width: "100%", height: 40, background: "#ffffff", border: "1px solid #cbd5e1", borderRadius: 10, padding: "0 12px", color: "#0f172a", fontSize: 13, outline: "none", cursor: "pointer", fontWeight: 700 }}
                    >
                      <option value="pwd">🛣️ PWD Statutory Permission</option>
                      <option value="kseb">⚡ KSEB Statutory Permissions</option>
                      <option value="nh">🛣️ National Highway Statutory Permission</option>
                      <option value="panchayat">🏡 Panchayat / Municipality Permission</option>
                    </select>
                  </div>

                  {/* PWD */}
                  {activeClearanceCategory === "pwd" && (
                    <div style={{ background: "#f8fafc", border: "1px solid #e2e8f0", padding: 14, borderRadius: 16, display: "flex", flexDirection: "column", gap: 8 }}>
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                        <span style={{ fontSize: 13, fontWeight: 800, color: "#334155" }}>PWD Statutory Permission Status</span>
                        <span style={{ fontSize: 10, fontWeight: 800, color: (pwdClearance === "Permission Granted" || pwdClearance === "Permission Gathered") ? "#10b981" : (pwdClearance === "Demand Note Issued" || pwdClearance === "Demand Issued") ? "#d97706" : "#64748b" }}>{pwdClearance}</span>
                      </div>
                      <div style={{ display: "grid", gridTemplateColumns: "1.2fr 1fr", gap: 8 }}>
                        <select
                          value={pwdClearance}
                          onChange={(e) => setPwdClearance(e.target.value)}
                          style={{ height: 36, background: "#ffffff", border: "1px solid #cbd5e1", borderRadius: 8, padding: "0 8px", color: "#0f172a", fontSize: 12, cursor: "pointer", outline: "none", fontWeight: 700 }}
                        >
                          <option value="None">None / Initiated</option>
                          <option value="Demand Note Issued">Demand Note Issued</option>
                          <option value="Permission Granted">Permission Granted</option>
                        </select>
                        <label style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 6, height: 36, background: pwdReceipt ? "#e6f4ea" : "#ffffff", border: pwdReceipt ? "1px solid #10b981" : "1px dashed #cbd5e1", borderRadius: 8, color: pwdReceipt ? "#10b981" : "#475569", fontSize: 10, fontWeight: 700, cursor: "pointer" }}>
                          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M21.44 11.05l-9.19 9.19a6 6 0 0 1-8.49-8.49l9.19-9.19a4 4 0 0 1 5.66 5.66l-9.2 9.19a2 2 0 0 1-2.83-2.83l8.49-8.48"/></svg>
                          {pwdReceipt ? (pwdReceipt.startsWith("data:application/pdf") ? "📄 PDF ✓" : "📸 Photo ✓") : "Doc / Camera"}
                          <input
                            type="file"
                            accept="image/*,application/pdf"
                            onChange={(e) => {
                              const file = e.target.files?.[0];
                              if (file) {
                                processUploadedFile(file, (base64) => {
                                  setPwdReceipt(base64);
                                });
                              }
                            }}
                            style={{ display: "none" }}
                          />
                        </label>
                      </div>
                      {pwdReceipt && (typeof window !== 'undefined') && (window as any).renderAttachmentPreview && (window as any).renderAttachmentPreview(pwdReceipt)}
                    </div>
                  )}

                  {/* KSEB */}
                  {activeClearanceCategory === "kseb" && (
                    <div style={{ background: "#f8fafc", border: "1px solid #e2e8f0", padding: 14, borderRadius: 16, display: "flex", flexDirection: "column", gap: 8 }}>
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                        <span style={{ fontSize: 13, fontWeight: 800, color: "#334155" }}>KSEB Statutory Permissions Status</span>
                        <span style={{ fontSize: 10, fontWeight: 800, color: (ksebClearance === "Permission Granted" || ksebClearance === "Permission Gathered") ? "#10b981" : (ksebClearance === "Demand Note Issued" || ksebClearance === "Demand Issued") ? "#d97706" : "#64748b" }}>{ksebClearance}</span>
                      </div>
                      <div style={{ display: "grid", gridTemplateColumns: "1.2fr 1fr", gap: 8 }}>
                        <select
                          value={ksebClearance}
                          onChange={(e) => setKsebClearance(e.target.value)}
                          style={{ height: 36, background: "#ffffff", border: "1px solid #cbd5e1", borderRadius: 8, padding: "0 8px", color: "#0f172a", fontSize: 12, cursor: "pointer", outline: "none", fontWeight: 700 }}
                        >
                          <option value="None">None / Initiated</option>
                          <option value="Demand Note Issued">Demand Note Issued</option>
                          <option value="Permission Granted">Permission Granted</option>
                        </select>
                        <label style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 6, height: 36, background: ksebReceipt ? "#e6f4ea" : "#ffffff", border: ksebReceipt ? "1px solid #10b981" : "1px dashed #cbd5e1", borderRadius: 8, color: ksebReceipt ? "#10b981" : "#475569", fontSize: 10, fontWeight: 700, cursor: "pointer" }}>
                          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M21.44 11.05l-9.19 9.19a6 6 0 0 1-8.49-8.49l9.19-9.19a4 4 0 0 1 5.66 5.66l-9.2 9.19a2 2 0 0 1-2.83-2.83l8.49-8.48"/></svg>
                          {ksebReceipt ? (ksebReceipt.startsWith("data:application/pdf") ? "📄 PDF ✓" : "📸 Photo ✓") : "Doc / Camera"}
                          <input
                            type="file"
                            accept="image/*,application/pdf"
                            onChange={(e) => {
                              const file = e.target.files?.[0];
                              if (file) {
                                processUploadedFile(file, (base64) => {
                                  setKsebReceipt(base64);
                                });
                              }
                            }}
                            style={{ display: "none" }}
                          />
                        </label>
                      </div>
                      {ksebReceipt && (typeof window !== 'undefined') && (window as any).renderAttachmentPreview && (window as any).renderAttachmentPreview(ksebReceipt)}
                    </div>
                  )}

                  {/* NH */}
                  {activeClearanceCategory === "nh" && (
                    <div style={{ background: "#f8fafc", border: "1px solid #e2e8f0", padding: 14, borderRadius: 16, display: "flex", flexDirection: "column", gap: 8 }}>
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                        <span style={{ fontSize: 13, fontWeight: 800, color: "#334155" }}>National Highway Statutory Permission Status</span>
                        <span style={{ fontSize: 10, fontWeight: 800, color: (nhClearance === "Permission Granted" || nhClearance === "Permission Gathered") ? "#10b981" : (nhClearance === "Demand Note Issued" || nhClearance === "Demand Issued") ? "#d97706" : "#64748b" }}>{nhClearance}</span>
                      </div>
                      <div style={{ display: "grid", gridTemplateColumns: "1.2fr 1fr", gap: 8 }}>
                        <select
                          value={nhClearance}
                          onChange={(e) => setNhClearance(e.target.value)}
                          style={{ height: 36, background: "#ffffff", border: "1px solid #cbd5e1", borderRadius: 8, padding: "0 8px", color: "#0f172a", fontSize: 12, cursor: "pointer", outline: "none", fontWeight: 700 }}
                        >
                          <option value="None">None / Initiated</option>
                          <option value="Demand Note Issued">Demand Note Issued</option>
                          <option value="Permission Granted">Permission Granted</option>
                        </select>
                        <label style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 6, height: 36, background: nhReceipt ? "#e6f4ea" : "#ffffff", border: nhReceipt ? "1px solid #10b981" : "1px dashed #cbd5e1", borderRadius: 8, color: nhReceipt ? "#10b981" : "#475569", fontSize: 10, fontWeight: 700, cursor: "pointer" }}>
                          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M21.44 11.05l-9.19 9.19a6 6 0 0 1-8.49-8.49l9.19-9.19a4 4 0 0 1 5.66 5.66l-9.2 9.19a2 2 0 0 1-2.83-2.83l8.49-8.48"/></svg>
                          {nhReceipt ? (nhReceipt.startsWith("data:application/pdf") ? "📄 PDF ✓" : "📸 Photo ✓") : "Doc / Camera"}
                          <input
                            type="file"
                            accept="image/*,application/pdf"
                            onChange={(e) => {
                              const file = e.target.files?.[0];
                              if (file) {
                                processUploadedFile(file, (base64) => {
                                  setNhReceipt(base64);
                                });
                              }
                            }}
                            style={{ display: "none" }}
                          />
                        </label>
                      </div>
                      {nhReceipt && (typeof window !== 'undefined') && (window as any).renderAttachmentPreview && (window as any).renderAttachmentPreview(nhReceipt)}
                    </div>
                  )}

                  {/* Panchayat */}
                  {activeClearanceCategory === "panchayat" && (
                    <div style={{ background: "#f8fafc", border: "1px solid #e2e8f0", padding: 14, borderRadius: 16, display: "flex", flexDirection: "column", gap: 8 }}>
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                        <span style={{ fontSize: 13, fontWeight: 800, color: "#334155" }}>Panchayat / Municipality Permission Status</span>
                        <span style={{ fontSize: 10, fontWeight: 800, color: (panchayatClearance === "Permission Granted" || panchayatClearance === "Permission Gathered") ? "#10b981" : (panchayatClearance === "Demand Note Issued" || panchayatClearance === "Demand Issued") ? "#d97706" : "#64748b" }}>{panchayatClearance}</span>
                      </div>
                      <div style={{ display: "grid", gridTemplateColumns: "1.2fr 1fr", gap: 8 }}>
                        <select
                          value={panchayatClearance}
                          onChange={(e) => setPanchayatClearance(e.target.value)}
                          style={{ height: 36, background: "#ffffff", border: "1px solid #cbd5e1", borderRadius: 8, padding: "0 8px", color: "#0f172a", fontSize: 12, cursor: "pointer", outline: "none", fontWeight: 700 }}
                        >
                          <option value="None">None / Initiated</option>
                          <option value="Demand Note Issued">Demand Note Issued</option>
                          <option value="Permission Granted">Permission Granted</option>
                        </select>
                        <label style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 6, height: 36, background: panchayatReceipt ? "#e6f4ea" : "#ffffff", border: panchayatReceipt ? "1px solid #10b981" : "1px dashed #cbd5e1", borderRadius: 8, color: panchayatReceipt ? "#10b981" : "#475569", fontSize: 10, fontWeight: 700, cursor: "pointer" }}>
                          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M21.44 11.05l-9.19 9.19a6 6 0 0 1-8.49-8.49l9.19-9.19a4 4 0 0 1 5.66 5.66l-9.2 9.19a2 2 0 0 1-2.83-2.83l8.49-8.48"/></svg>
                          {panchayatReceipt ? (panchayatReceipt.startsWith("data:application/pdf") ? "📄 PDF ✓" : "📸 Photo ✓") : "Doc / Camera"}
                          <input
                            type="file"
                            accept="image/*,application/pdf"
                            onChange={(e) => {
                              const file = e.target.files?.[0];
                              if (file) {
                                processUploadedFile(file, (base64) => {
                                  setPanchayatReceipt(base64);
                                });
                              }
                            }}
                            style={{ display: "none" }}
                          />
                        </label>
                      </div>
                      {panchayatReceipt && (typeof window !== 'undefined') && (window as any).renderAttachmentPreview && (window as any).renderAttachmentPreview(panchayatReceipt)}
                    </div>
                  )}
                </div>
              )}

              {/* STEP 4: PLANNING & REQUESTS */}
              {reportStep === 4 && (
                <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    <h4 style={{ fontSize: 13, fontWeight: 800, color: "#0284c7", textTransform: "uppercase", margin: 0 }}>Step 4: Operational Requests & Notes</h4>
                    <button
                      type="button"
                      onClick={() => handleSaveAndBlur("Requests & Notes")}
                      style={{ fontSize: 10, fontWeight: 750, color: "#0284c7", background: "rgba(2, 132, 199, 0.06)", border: "1px solid rgba(2, 132, 199, 0.2)", borderRadius: 6, padding: "4px 8px", cursor: "pointer" }}
                    >
                      💾 Save Notes
                    </button>
                  </div>
                  
                  {/* Category Dropdown Selector for Operational Notes */}
                  <div style={{ background: "#f8fafc", border: "1px solid #e2e8f0", padding: 14, borderRadius: 16 }}>
                    <label style={{ display: "block", fontSize: 10, fontWeight: 800, color: "#0284c7", marginBottom: 6, textTransform: "uppercase", letterSpacing: "0.05em" }}>Select Request / Note Type</label>
                    <select
                      value={activeRequestCategory}
                      onChange={(e) => setActiveRequestCategory(e.target.value)}
                      style={{ width: "100%", height: 40, background: "#ffffff", border: "1px solid #cbd5e1", borderRadius: 10, padding: "0 12px", color: "#0f172a", fontSize: 13, outline: "none", cursor: "pointer", fontWeight: 700 }}
                    >
                      <option value="daily_work">📝 Daily Work Report</option>
                      <option value="roadblocks">🚧 Operational Roadblocks</option>
                      <option value="targets">🎯 Engineering Target for Tomorrow</option>
                      <option value="finance">💵 Urgent Imprest Refill Request</option>
                      <option value="admin">💡 Administrative Support Concerns</option>
                    </select>
                  </div>
                  
                  {/* Daily Work Report */}
                  {activeRequestCategory === "daily_work" && (
                    <div>
                      <label style={{ display: "block", fontSize: 11, fontWeight: 700, color: "#475569", marginBottom: 6, textTransform: "uppercase" }}>Daily Work Report</label>
                      <textarea
                        placeholder="Provide details on today's progress, tasks completed, work done, or reasons if work did not happen..."
                        value={reqDailyWorkReport}
                        onChange={(e) => setReqDailyWorkReport(e.target.value)}
                        style={{ width: "100%", height: 80, background: "#ffffff", border: "1px solid #cbd5e1", borderRadius: 10, padding: 10, color: "#0f172a", fontSize: 12, outline: "none", resize: "none" }}
                      />
                    </div>
                  )}
                  
                  {/* Problems encountered */}
                  {activeRequestCategory === "roadblocks" && (
                    <div>
                      <label style={{ display: "block", fontSize: 11, fontWeight: 700, color: "#475569", marginBottom: 6, textTransform: "uppercase" }}>Operational Roadblocks Encountered</label>
                      <textarea
                        placeholder="List any delays, utility clashing, traffic constraints, public disputes, or equipment breakdowns..."
                        value={reqProblems}
                        onChange={(e) => setReqProblems(e.target.value)}
                        style={{ width: "100%", height: 80, background: "#ffffff", border: "1px solid #cbd5e1", borderRadius: 10, padding: 10, color: "#0f172a", fontSize: 12, outline: "none", resize: "none" }}
                      />
                    </div>
                  )}

                  {/* Plans for tomorrow */}
                  {activeRequestCategory === "targets" && (
                    <div>
                      <label style={{ display: "block", fontSize: 11, fontWeight: 700, color: "#475569", marginBottom: 6, textTransform: "uppercase" }}>Engineering Target for Tomorrow</label>
                      <textarea
                        placeholder="Detail expected trenching meters, planned HDD points, or corridor clearance stages for tomorrow..."
                        value={reqPlans}
                        onChange={(e) => setReqPlans(e.target.value)}
                        style={{ width: "100%", height: 80, background: "#ffffff", border: "1px solid #cbd5e1", borderRadius: 10, padding: 10, color: "#0f172a", fontSize: 12, outline: "none", resize: "none" }}
                      />
                    </div>
                  )}

                  {/* Urgent Finance request */}
                  {activeRequestCategory === "finance" && (
                    <div style={{ background: "#f8fafc", border: "1px solid #e2e8f0", padding: 16, borderRadius: 16, display: "flex", flexDirection: "column", gap: 10 }}>
                      <span style={{ fontSize: 11, fontWeight: 800, color: "#0284c7", textTransform: "uppercase", letterSpacing: "0.05em" }}>💵 Urgent Imprest Refill request</span>
                      
                      <div style={{ display: "grid", gridTemplateColumns: "1.2fr 1fr", gap: 8 }}>
                        <input
                          type="number"
                          placeholder="Request Amount (₹)"
                          value={reqFinanceAmount}
                          onChange={(e) => setReqFinanceAmount(e.target.value)}
                          style={{ height: 36, background: "#ffffff", border: "1px solid #cbd5e1", borderRadius: 8, padding: "0 8px", color: "#0f172a", fontSize: 12, outline: "none", fontWeight: 700 }}
                        />
                        <label style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 6, height: 36, background: reqFinanceReceipt ? "#e6f4ea" : "#ffffff", border: reqFinanceReceipt ? "1px solid #10b981" : "1px dashed #cbd5e1", borderRadius: 8, color: reqFinanceReceipt ? "#10b981" : "#475569", fontSize: 10, fontWeight: 700, cursor: "pointer" }}>
                          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M21.44 11.05l-9.19 9.19a6 6 0 0 1-8.49-8.49l9.19-9.19a4 4 0 0 1 5.66 5.66l-9.2 9.19a2 2 0 0 1-2.83-2.83l8.49-8.48"/></svg>
                          {reqFinanceReceipt ? (reqFinanceReceipt.startsWith("data:application/pdf") ? "📄 PDF ✓" : "📸 Photo ✓") : "Doc / Camera"}
                          <input
                            type="file"
                            accept="image/*,application/pdf"
                            onChange={(e) => {
                              const file = e.target.files?.[0];
                              if (file) {
                                processUploadedFile(file, (base64) => {
                                  setReqFinanceReceipt(base64);
                                });
                              }
                            }}
                            style={{ display: "none" }}
                          />
                        </label>
                      </div>

                      {reqFinanceReceipt && (typeof window !== 'undefined') && (window as any).renderAttachmentPreview && (window as any).renderAttachmentPreview(reqFinanceReceipt)}

                      <input
                        type="text"
                        placeholder="Imprest refill justification..."
                        value={reqFinanceNarration}
                        onChange={(e) => setReqFinanceNarration(e.target.value)}
                        style={{ width: "100%", height: 32, background: "#ffffff", border: "1px solid #cbd5e1", borderRadius: 8, padding: "0 10px", color: "#0f172a", fontSize: 11, outline: "none" }}
                      />
                    </div>
                  )}

                  {/* General concerns / Admin notes */}
                  {activeRequestCategory === "admin" && (
                    <div>
                      <label style={{ display: "block", fontSize: 11, fontWeight: 700, color: "#475569", marginBottom: 6, textTransform: "uppercase" }}>Administrative Support & Coordination Concerns</label>
                      <textarea
                        placeholder="Enter safety alerts, structural needs, or specific administrative tasks required for corporate intervention..."
                        value={reqAdminConcerns}
                        onChange={(e) => setReqAdminConcerns(e.target.value)}
                        style={{ width: "100%", height: 80, background: "#ffffff", border: "1px solid #cbd5e1", borderRadius: 10, padding: 10, color: "#0f172a", fontSize: 12, outline: "none", resize: "none" }}
                      />
                    </div>
                  )}
                </div>
              )}

              {/* STEP 5: REVIEW MULTI-PROJECT DRAFTS & SUBMIT */}
              {reportStep === 5 && (
                <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
                  <h4 style={{ fontSize: 13, fontWeight: 800, color: "#0284c7", textTransform: "uppercase", margin: 0 }}>Step 5: Review & Submit Staged Drafts</h4>

                  {/* Active Drafts list */}
                  <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                    <span style={{ fontSize: 11, fontWeight: 800, color: "#64748b", textTransform: "uppercase", letterSpacing: "0.05em" }}>Consolidated Active Drafts</span>
                    
                    {(() => {
                      const drafts = getActiveDrafts();
                      if (drafts.length === 0) {
                        return (
                          <div className="glass" style={{ padding: 24, textAlign: "center", border: "1px solid #e2e8f0", borderRadius: 16, background: "#f8fafc" }}>
                            <p style={{ margin: 0, fontSize: 13, color: "#475569" }}>No active project drafts found.</p>
                            <p style={{ margin: "4px 0 0", fontSize: 11, color: "#64748b" }}>Go back to Step 1 to enter roster and WIP operational progress details.</p>
                          </div>
                        );
                      }
                      
                      return drafts.map((d) => {
                        const wRate = d.data.workerWageRate ?? 900;
                        const sRate = d.data.supervisorWageRate ?? 1200;
                        const wagesSum = Number(d.data.laborCount || 0) * wRate +
                          (d.data.includeSupervisor ? sRate : 0) +
                          (d.data.otWorkers || []).reduce((sum: number, w: any) => sum + (Number(w.workerCount || 0) * Number(w.rate || 0) * Number(w.hours || 0)), 0);
                        
                        const expSum = (d.data.fuelExpensesList || []).reduce((sum: number, x: any) => sum + Number(x.amount || 0), 0) +
                          (d.data.travelExpensesList || []).reduce((sum: number, x: any) => sum + Number(x.amount || 0), 0) +
                          (d.data.roomRentList || []).reduce((sum: number, x: any) => sum + Number(x.amount || 0), 0) +
                          (d.data.toolRentList || []).reduce((sum: number, x: any) => sum + Number(x.amount || 0), 0) +
                          (d.data.otherExpensesList || []).reduce((sum: number, x: any) => sum + Number(x.amount || 0), 0);

                        return (
                          <div key={d.project.id} className="glass" style={{ padding: 16, border: "1px solid #e2e8f0", borderRadius: 16, background: "#f8fafc", display: "flex", flexDirection: "column", gap: 10 }}>
                            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 10 }}>
                              <div>
                                <h5 style={{ fontSize: 14, fontWeight: 900, color: "#0f172a", margin: 0 }}>{d.project.name}</h5>
                                <span style={{ fontSize: 10, fontFamily: "monospace", color: "#64748b" }}>ID: {d.project.id} | Date: {d.data.reportDate || "Today"}</span>
                              </div>
                              <span style={{ fontSize: 9, fontWeight: 800, color: "#0369a1", background: "#e0f2fe", border: "1px solid #bae6fd", borderRadius: 6, padding: "2px 6px" }}>
                                DRAFT
                              </span>
                            </div>

                            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, background: "#ffffff", border: "1px solid #e2e8f0", padding: 10, borderRadius: 12, fontSize: 12 }}>
                              <div>
                                <span style={{ color: "#64748b", fontSize: 10, textTransform: "uppercase" }}>Calculated Wages:</span>
                                <span style={{ display: "block", color: "#15803d", fontWeight: 800 }}>₹{wagesSum}</span>
                              </div>
                              <div>
                                <span style={{ color: "#64748b", fontSize: 10, textTransform: "uppercase" }}>Total Expenses:</span>
                                <span style={{ display: "block", color: "#0284c7", fontWeight: 800 }}>₹{expSum}</span>
                              </div>
                              <div style={{ gridColumn: "span 2", borderTop: "1px solid #e2e8f0", paddingTop: 6, marginTop: 4 }}>
                                <span style={{ color: "#64748b", fontSize: 10, textTransform: "uppercase" }}>WIP Metrics Registered:</span>
                                <span style={{ display: "block", color: "#0f172a", fontWeight: 700, fontSize: 11, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                                  {[
                                    d.data.wipTrenchingValue ? `${d.data.wipTrenchingValue}m Trench` : "",
                                    d.data.wipHddValue ? `${d.data.wipHddValue}m Boring` : "",
                                    d.data.wipCableLayingValue ? `${d.data.wipCableLayingValue}m Cable` : "",
                                    d.data.wipTerminationsValue ? `${d.data.wipTerminationsValue} Term` : ""
                                  ].filter(Boolean).join(" | ") || "None"}
                                </span>
                              </div>
                            </div>

                            <div style={{ display: "flex", gap: 8, marginTop: 4 }}>
                              <button
                                type="button"
                                onClick={() => {
                                  setReportProjectId(d.project.id);
                                  setReportStep(1);
                                }}
                                style={{ flex: 1, height: 34, background: "#ffffff", border: "1px solid #cbd5e1", borderRadius: 8, color: "#475569", fontSize: 12, fontWeight: 750, cursor: "pointer" }}
                              >
                                Edit Draft
                              </button>
                              <button
                                type="button"
                                onClick={() => submitReportForProject(d.project.id, d.data)}
                                style={{ flex: 1.5, height: 34, background: "linear-gradient(135deg, #10b981 0%, #059669 100%)", border: "none", borderRadius: 8, color: "#ffffff", fontSize: 12, fontWeight: 800, cursor: "pointer", boxShadow: "0 2px 8px rgba(16, 185, 129, 0.15)" }}
                              >
                                Submit Staged Draft
                              </button>
                            </div>
                          </div>
                        );
                      });
                    })()}
                  </div>

                  <p style={{ margin: "4px 0 0", fontSize: 11, color: "#d97706", textAlign: "center", lineHeight: 1.4 }}>
                    ⚠️ Verify all active parameters. Once submitted, daily operational logs are locked for ledger consolidation.
                  </p>
                </div>
              )}

            </div>

            {/* Modal Footer Controls */}
            <div style={{ display: "flex", gap: 10, borderTop: "1px solid #e2e8f0", paddingTop: 16 }}>
              {reportStep > 1 && (
                <button
                  type="button"
                  onClick={() => setReportStep(reportStep - 1)}
                  style={{ flex: 0.8, height: 44, background: "#ffffff", border: "1px solid #cbd5e1", borderRadius: 12, color: "#475569", fontSize: 13, fontWeight: 750, cursor: "pointer" }}
                >
                  Back
                </button>
              )}
              
              {reportStep < 5 ? (
                <button
                  type="button"
                  onClick={() => {
                    if (reportStep === 1) {
                      if (!reportDate) {
                        showToast("❌ Please select a report date.");
                        return;
                      }
                      if (!reportProjectId) {
                        showToast("❌ Please select an active corridor.");
                        return;
                      }
                    }
                    setReportStep(reportStep + 1);
                  }}
                  style={{ flex: 1.2, height: 44, background: "linear-gradient(135deg, #0284c7 0%, #0369a1 100%)", border: "none", borderRadius: 12, color: "#ffffff", fontSize: 13, fontWeight: 800, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: 6, boxShadow: "0 4px 14px rgba(2, 132, 199, 0.2)" }}
                >
                  Continue ➔
                </button>
              ) : (
                <button
                  type="button"
                  onClick={submitAllActiveDrafts}
                  disabled={submittingReport || getActiveDrafts().length === 0}
                  style={{ flex: 1.2, height: 44, background: "linear-gradient(135deg, #10b981 0%, #059669 100%)", border: "none", borderRadius: 12, color: "#ffffff", fontSize: 13, fontWeight: 800, cursor: submittingReport || getActiveDrafts().length === 0 ? "not-allowed" : "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: 6, boxShadow: "0 4px 14px rgba(16, 185, 129, 0.25)" }}
                >
                  {submittingReport ? (
                    <>
                      <div className="spinner" style={{ width: 14, height: 14 }} />
                      Consolidating...
                    </>
                  ) : (
                    <>🚀 Submit All Active Drafts</>
                  )}
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Canvas Image Cropper Modal Overlay */}
      {cropperActive && cropperImage && (
        <div style={{
          position: "fixed",
          inset: 0,
          background: "rgba(15, 23, 42, 0.75)",
          backdropFilter: "blur(8px)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          padding: 16,
          zIndex: 20000,
          fontFamily: "Outfit, sans-serif"
        }}>
          <div className="glass fade-in" style={{
            width: "100%",
            maxWidth: 440,
            background: "#ffffff",
            border: "1px solid #e2e8f0",
            borderRadius: 24,
            padding: "26px 20px",
            textAlign: "center",
            boxShadow: "0 20px 50px rgba(15, 23, 42, 0.15)",
            color: "#0f172a"
          }}>
            <h3 style={{ fontSize: 16, fontWeight: 900, color: "#0f172a", margin: "0 0 4px" }}>✂️ Conform & Crop Document</h3>
            <p style={{ fontSize: 12, color: "#475569", margin: "0 0 16px" }}>Drag to pan. Use slider to zoom before confirming.</p>
            
            {/* Canvas Wrap */}
            <div style={{
              position: "relative",
              width: 300,
              height: 300,
              margin: "0 auto 16px",
              border: "1px solid #cbd5e1",
              borderRadius: 16,
              overflow: "hidden",
              background: "#f8fafc",
              cursor: isDraggingCrop ? "grabbing" : "grab",
              touchAction: "none"
            }}
              onMouseDown={(e) => {
                setIsDraggingCrop(true);
                setDragStart({ x: e.clientX - cropPanX, y: e.clientY - cropPanY });
              }}
              onMouseMove={(e) => {
                if (!isDraggingCrop) return;
                setCropPanX(e.clientX - dragStart.x);
                setCropPanY(e.clientY - dragStart.y);
              }}
              onMouseUp={() => setIsDraggingCrop(false)}
              onMouseLeave={() => setIsDraggingCrop(false)}
              onTouchStart={(e) => {
                if (e.touches[0]) {
                  setIsDraggingCrop(true);
                  setDragStart({ x: e.touches[0].clientX - cropPanX, y: e.touches[0].clientY - cropPanY });
                }
              }}
              onTouchMove={(e) => {
                if (!isDraggingCrop) return;
                if (e.touches[0]) {
                  setCropPanX(e.touches[0].clientX - dragStart.x);
                  setCropPanY(e.touches[0].clientY - dragStart.y);
                }
              }}
              onTouchEnd={() => setIsDraggingCrop(false)}
            >
              <canvas id="crop-canvas" width="300" height="300" style={{ display: "block" }} />
            </div>

            {/* Zoom Slider */}
            <div style={{ display: "flex", alignItems: "center", gap: 10, margin: "0 auto 20px", maxWidth: 300 }}>
              <span style={{ fontSize: 14 }}>🔍</span>
              <input
                type="range"
                min="1"
                max="3"
                step="0.05"
                value={cropZoom}
                onChange={(e) => setCropZoom(parseFloat(e.target.value))}
                style={{ flex: 1, accentColor: "#0284c7", height: 6, borderRadius: 3 }}
              />
              <span style={{ fontSize: 11, fontWeight: 700, fontFamily: "monospace", minWidth: 32 }}>{cropZoom.toFixed(2)}x</span>
            </div>

            {/* Action buttons */}
            <div style={{ display: "flex", gap: 8 }}>
              <button
                onClick={handleSkipCrop}
                style={{
                  flex: 1,
                  height: 38,
                  background: "#f1f5f9",
                  border: "1px solid #cbd5e1",
                  borderRadius: 10,
                  color: "#475569",
                  fontSize: 12,
                  fontWeight: 750,
                  cursor: "pointer"
                }}
              >
                Skip Crop
              </button>
              <button
                onClick={performCropAndAttach}
                style={{
                  flex: 1.5,
                  height: 38,
                  background: "linear-gradient(135deg, #0284c7 0%, #0369a1 100%)",
                  border: "none",
                  borderRadius: 10,
                  color: "#ffffff",
                  fontSize: 12,
                  fontWeight: 800,
                  cursor: "pointer",
                  boxShadow: "0 4px 12px rgba(2, 132, 199, 0.2)"
                }}
              >
                Confirm Crop
              </button>
            </div>
          </div>
        </div>
      )}
      {/* Supervisor Clarifications Inbox Modal */}
      {/* Site Storage overlay Modal */}
      {isSiteStorageOpen && (
        <div style={{
          position: "fixed",
          inset: 0,
          background: "rgba(15, 23, 42, 0.3)",
          backdropFilter: "blur(12px)",
          display: "flex",
          justifyContent: "center",
          alignItems: "flex-start",
          overflowY: "auto",
          padding: "40px 20px",
          zIndex: 9999,
          fontFamily: "Outfit, sans-serif"
        }}>
          <div className="glass fade-in" style={{
            width: "100%",
            maxWidth: 480,
            margin: "auto",
            background: "linear-gradient(135deg, #ffffff 0%, #f8fafc 100%)",
            border: "1px solid var(--border)",
            borderRadius: 24,
            padding: "28px 24px",
            boxShadow: "0 8px 32px rgba(15, 23, 42, 0.06)",
            color: "var(--text)"
          }}>
            {/* Header */}
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 20 }}>
              <div>
                <p style={{ fontSize: 9, fontWeight: 800, color: "var(--cyan)", letterSpacing: "0.1em", textTransform: "uppercase", margin: 0 }}>Telgo Logistics</p>
                <h3 style={{ fontSize: 18, fontWeight: 900, letterSpacing: "-0.02em", margin: "2px 0 0" }}>Site Storage & Materials</h3>
              </div>
              <button onClick={() => setIsSiteStorageOpen(false)} style={{
                background: "var(--surface)",
                border: "1px solid var(--border)",
                width: 32,
                height: 32,
                borderRadius: "50%",
                color: "var(--muted)",
                cursor: "pointer",
                display: "flex",
                alignItems: "center",
                justifyContent: "center"
              }}>
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
              </button>
            </div>

            {/* Project Selector */}
            <div style={{ marginBottom: 18 }}>
              <label style={{ display: "block", fontSize: 12, fontWeight: 700, color: "var(--muted)", marginBottom: 8, textTransform: "uppercase", letterSpacing: "0.03em" }}>Select Project Corridor</label>
              <select
                value={selectedStorageProjectId}
                onChange={(e) => setSelectedStorageProjectId(e.target.value)}
                style={{
                  width: "100%",
                  height: 46,
                  background: "var(--surface)",
                  border: "1px solid var(--border)",
                  borderRadius: 12,
                  padding: "0 14px",
                  color: "var(--text)",
                  fontSize: 14,
                  outline: "none",
                  fontFamily: "Outfit, sans-serif",
                  boxSizing: "border-box"
                }}
              >
                {projectsList.map(p => (
                  <option key={p.id} value={p.id}>{p.name} ({p.location})</option>
                ))}
              </select>
            </div>

            {/* Add Material Form */}
            <form onSubmit={handleAddRawMaterial} style={{ display: "flex", flexDirection: "column", gap: 16, borderBottom: "1px solid var(--border)", paddingBottom: 24, marginBottom: 24 }}>
              <h4 style={{ fontSize: 14, fontWeight: 800, margin: "4px 0 0", color: "var(--cyan)", textTransform: "uppercase", letterSpacing: "0.05em" }}>Add Unloaded Material</h4>
              
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                {/* Date */}
                <div>
                  <label style={{ display: "block", fontSize: 11, fontWeight: 700, color: "var(--muted)", marginBottom: 6, textTransform: "uppercase" }}>Unload Date</label>
                  <input
                    type="date"
                    value={storageDate}
                    onChange={(e) => setStorageDate(e.target.value)}
                    required
                    style={{
                      width: "100%",
                      height: 42,
                      background: "var(--surface)",
                      border: "1px solid var(--border)",
                      borderRadius: 10,
                      padding: "0 10px",
                      color: "var(--text)",
                      fontSize: 13,
                      fontFamily: "Outfit, sans-serif",
                      boxSizing: "border-box"
                    }}
                  />
                </div>

                {/* Material Dropdown */}
                <div>
                  <label style={{ display: "block", fontSize: 11, fontWeight: 700, color: "var(--muted)", marginBottom: 6, textTransform: "uppercase" }}>Material Type</label>
                  <select
                    value={storageMaterialName}
                    onChange={(e) => setStorageMaterialName(e.target.value)}
                    style={{
                      width: "100%",
                      height: 42,
                      background: "var(--surface)",
                      border: "1px solid var(--border)",
                      borderRadius: 10,
                      padding: "0 10px",
                      color: "var(--text)",
                      fontSize: 13,
                      fontFamily: "Outfit, sans-serif",
                      boxSizing: "border-box"
                    }}
                  >
                    <option value="Cable">Cable raw material</option>
                    <option value="Conduit">Conduit raw material</option>
                    <option value="Transformer/RMU">Transformer / RMU</option>
                    <option value="Other Items">Add Other Items...</option>
                  </select>
                </div>
              </div>

              {/* Custom Material Input */}
              {storageMaterialName === "Other Items" && (
                <div>
                  <label style={{ display: "block", fontSize: 11, fontWeight: 700, color: "var(--muted)", marginBottom: 6, textTransform: "uppercase" }}>Specify Material Name</label>
                  <input
                    type="text"
                    value={customMaterialName}
                    onChange={(e) => setCustomMaterialName(e.target.value)}
                    placeholder="E.g., Steel ducting, Concrete slabs"
                    required
                    style={{
                      width: "100%",
                      height: 42,
                      background: "var(--surface)",
                      border: "1px solid var(--border)",
                      borderRadius: 10,
                      padding: "0 12px",
                      color: "var(--text)",
                      fontSize: 13,
                      outline: "none",
                      fontFamily: "Outfit, sans-serif",
                      boxSizing: "border-box"
                    }}
                  />
                </div>
              )}

              {/* Photo Upload */}
              <div>
                <label style={{ display: "block", fontSize: 11, fontWeight: 700, color: "var(--muted)", marginBottom: 8, textTransform: "uppercase" }}>Upload Photo</label>
                <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                  <label htmlFor="material-photo-file" style={{
                    width: 46,
                    height: 46,
                    borderRadius: 12,
                    background: "var(--surface)",
                    border: "1px solid var(--border)",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    cursor: "pointer",
                    color: "var(--cyan)"
                  }}>
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"/>
                      <circle cx="12" cy="13" r="4"/>
                    </svg>
                  </label>
                  <input 
                    type="file" 
                    id="material-photo-file" 
                    accept="image/*" 
                    style={{ display: "none" }}
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (!file) return;
                      const reader = new FileReader();
                      reader.onload = (event) => {
                        const img = new Image();
                        img.onload = () => {
                          const canvas = document.createElement("canvas");
                          const ctx = canvas.getContext("2d");
                          if (!ctx) return;
                          const maxDim = 512;
                          let w = img.width;
                          let h = img.height;
                          if (w > maxDim || h > maxDim) {
                            if (w > h) {
                              h = Math.round((h * maxDim) / w);
                              w = maxDim;
                            } else {
                              w = Math.round((w * maxDim) / h);
                              h = maxDim;
                            }
                          }
                          canvas.width = w;
                          canvas.height = h;
                          ctx.drawImage(img, 0, 0, w, h);
                          setStoragePhoto(canvas.toDataURL("image/jpeg", 0.75));
                        };
                        img.src = event.target?.result as string;
                      };
                      reader.readAsDataURL(file);
                    }}
                  />
                  {storagePhoto ? (
                    <div style={{ position: "relative" }}>
                      <img 
                        src={storagePhoto} 
                        alt="Material Preview" 
                        style={{ width: 46, height: 46, borderRadius: 12, objectFit: "cover", border: "1px solid var(--border)" }} 
                      />
                      <button 
                        type="button"
                        onClick={() => setStoragePhoto("")}
                        style={{
                          position: "absolute",
                          top: -6,
                          right: -6,
                          background: "#dc2626",
                          color: "white",
                          border: "none",
                          borderRadius: "50%",
                          width: 16,
                          height: 16,
                          fontSize: 10,
                          cursor: "pointer",
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center"
                        }}
                      >
                        ×
                      </button>
                    </div>
                  ) : (
                    <span style={{ fontSize: 12, color: "var(--dim)" }}>No photo uploaded</span>
                  )}
                </div>
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                {/* Quantity */}
                <div>
                  <label style={{ display: "block", fontSize: 11, fontWeight: 700, color: "var(--muted)", marginBottom: 6, textTransform: "uppercase" }}>Meters Unloaded</label>
                  <input
                    type="text"
                    value={storageQuantity}
                    onChange={(e) => setStorageQuantity(e.target.value)}
                    placeholder="E.g. 150m, 2 reels"
                    required
                    style={{
                      width: "100%",
                      height: 42,
                      background: "var(--surface)",
                      border: "1px solid var(--border)",
                      borderRadius: 10,
                      padding: "0 12px",
                      color: "var(--text)",
                      fontSize: 13,
                      outline: "none",
                      fontFamily: "Outfit, sans-serif",
                      boxSizing: "border-box"
                    }}
                  />
                </div>

                {/* Location */}
                <div>
                  <label style={{ display: "block", fontSize: 11, fontWeight: 700, color: "var(--muted)", marginBottom: 6, textTransform: "uppercase" }}>Unload Location</label>
                  <input
                    type="text"
                    value={storageLocation}
                    onChange={(e) => setStorageLocation(e.target.value)}
                    placeholder="E.g. Ch. 1+200, Palarivattom"
                    required
                    style={{
                      width: "100%",
                      height: 42,
                      background: "var(--surface)",
                      border: "1px solid var(--border)",
                      borderRadius: 10,
                      padding: "0 12px",
                      color: "var(--text)",
                      fontSize: 13,
                      outline: "none",
                      fontFamily: "Outfit, sans-serif",
                      boxSizing: "border-box"
                    }}
                  />
                </div>
              </div>

              {/* Notes */}
              <div>
                <label style={{ display: "block", fontSize: 11, fontWeight: 700, color: "var(--muted)", marginBottom: 6, textTransform: "uppercase" }}>Operational Notes</label>
                <textarea
                  value={storageNotes}
                  onChange={(e) => setStorageNotes(e.target.value)}
                  placeholder="Enter details on damage, drum numbers, or comments..."
                  rows={2}
                  style={{
                    width: "100%",
                    background: "var(--surface)",
                    border: "1px solid var(--border)",
                    borderRadius: 10,
                    padding: "10px 12px",
                    color: "var(--text)",
                    fontSize: 13,
                    outline: "none",
                    fontFamily: "Outfit, sans-serif",
                    boxSizing: "border-box",
                    resize: "none"
                  }}
                />
              </div>

              {/* Submit */}
              <button
                type="submit"
                disabled={savingMaterial}
                style={{
                  minHeight: 44,
                  background: "linear-gradient(135deg, #06b6d4 0%, #7c3aed 100%)",
                  border: "none",
                  borderRadius: 10,
                  color: "white",
                  fontSize: 13,
                  fontWeight: 700,
                  cursor: savingMaterial ? "not-allowed" : "pointer",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: 8,
                  boxShadow: "0 4px 12px rgba(6, 182, 212, 0.15)",
                  marginTop: 4
                }}
              >
                {savingMaterial ? <div className="spinner" style={{ width: 16, height: 16 }} /> : "Log Raw Material"}
              </button>
            </form>

            {/* List - See all raw materials present in site */}
            <div>
              <h4 style={{ fontSize: 14, fontWeight: 800, color: "var(--text)", marginBottom: 12, textTransform: "uppercase", letterSpacing: "0.05em" }}>See all raw materials present in site</h4>
              <div style={{ display: "flex", flexDirection: "column", gap: 10, maxHeight: 250, overflowY: "auto", paddingRight: 4 }}>
                {(() => {
                  const matchedProject = projectsList.find(p => p.id === selectedStorageProjectId);
                  const materials = matchedProject?.storageMaterials || [];
                  if (materials.length === 0) {
                    return (
                      <div style={{ textAlign: "center", padding: "20px 0", color: "var(--dim)", fontSize: 12 }}>
                        No raw materials logged for this project corridor yet.
                      </div>
                    );
                  }
                  return materials.map((m: any) => (
                    <div key={m.id} className="glass" style={{ border: "1px solid var(--border)", borderRadius: 12, padding: 12, background: "rgba(255, 255, 255, 0.4)" }}>
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 6 }}>
                        <span style={{ fontSize: 13, fontWeight: 800, color: "var(--text)" }}>{m.materialName}</span>
                        <span style={{ fontSize: 10, color: "var(--dim)", fontFamily: "monospace" }}>{m.date}</span>
                      </div>
                      
                      <div style={{ display: "grid", gridTemplateColumns: m.photoUrl ? "1fr 50px" : "1fr", gap: 10, alignItems: "center" }}>
                        <div>
                          <p style={{ margin: 0, fontSize: 11, color: "var(--muted)" }}>
                            <strong>Qty:</strong> {m.quantityMeters} | <strong>Loc:</strong> {m.location}
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
                            style={{ width: 44, height: 44, borderRadius: 8, objectFit: "cover", border: "1px solid var(--border)" }} 
                          />
                        )}
                      </div>
                    </div>
                  ));
                })()}
              </div>
            </div>

          </div>
        </div>
      )}

      {isClarificationInboxOpen && (
        <div style={{ position: "fixed", top: 0, left: 0, right: 0, bottom: 0, background: "rgba(15, 23, 42, 0.75)", backdropFilter: "blur(8px)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 9999, padding: 16 }}>
          <div className="glass fade-in" style={{ width: "100%", maxWidth: 540, background: "var(--surface)", border: "1px solid var(--border)", borderRadius: 24, padding: "20px", display: "flex", flexDirection: "column", maxHeight: "90vh", overflow: "hidden", textAlign: "left" }}>
            
            {/* Header */}
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", borderBottom: "1px solid var(--border)", paddingBottom: 14, marginBottom: 16 }}>
              <div>
                <span style={{ fontSize: 9, fontWeight: 900, color: "#8b5cf6", letterSpacing: "0.15em", textTransform: "uppercase" }}>Administrative Inbox</span>
                <h3 style={{ fontSize: 18, fontWeight: 900, color: "var(--text)", margin: "2px 0 0", letterSpacing: "-0.5px" }}>Report Clarifications</h3>
              </div>
              <button 
                onClick={() => { setIsClarificationInboxOpen(false); setSelectedClarificationReport(null); }}
                style={{ width: 32, height: 32, borderRadius: "50%", background: "var(--bg)", border: "1px solid var(--border)", color: "var(--text)", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", outline: "none" }}
              >
                ✕
              </button>
            </div>

            {/* Content area */}
            <div style={{ flex: 1, overflowY: "auto", display: "flex", flexDirection: "column", gap: 14, paddingRight: 4 }}>
              
              {!selectedClarificationReport ? (
                // 1. Inbox Listing
                <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                  <p style={{ fontSize: 12, color: "var(--dim)", margin: "0 0 4px" }}>Click on any flagged daily report below to review Admin concerns and upload fixes.</p>
                  {loadingMyReports ? (
                    <div style={{ textAlign: "center", padding: "30px 0", color: "var(--dim)", fontSize: 12 }}>Syncing with server logs...</div>
                  ) : mySubmittedReports.length === 0 ? (
                    <div style={{ textAlign: "center", padding: "40px 10px", background: "var(--bg)", borderRadius: 16, border: "1px solid var(--border)" }}>
                      <span style={{ fontSize: 24, display: "block", marginBottom: 6 }}>📬</span>
                      <p style={{ fontSize: 12, color: "var(--muted)", margin: 0 }}>You haven't submitted any daily reports recently.</p>
                    </div>
                  ) : (
                    mySubmittedReports.map((r: any) => {
                      const isFlagged = r.status === "clarification";
                      return (
                        <div
                          key={r.id}
                          onClick={() => setSelectedClarificationReport(r)}
                          style={{
                            padding: 14,
                            borderRadius: 16,
                            background: isFlagged ? "rgba(239, 68, 68, 0.05)" : "var(--bg)",
                            border: isFlagged ? "1px solid rgba(239, 68, 68, 0.25)" : "1px solid var(--border)",
                            cursor: "pointer",
                            display: "flex",
                            justifyContent: "space-between",
                            alignItems: "center"
                          }}
                        >
                          <div>
                            <span style={{ fontSize: 10, color: "var(--dim)", fontWeight: 700 }}>Date: {r.reportDate}</span>
                            <h4 style={{ fontSize: 13, fontWeight: 800, color: "var(--text)", margin: "2px 0 0" }}>Project ID: {r.projectId}</h4>
                            <div style={{ marginTop: 4 }}>
                              {isFlagged ? (
                                <span style={{ fontSize: 9, background: "#fecdd3", color: "#b91c1c", border: "1px solid #fda4af", borderRadius: 4, padding: "1px 5px", fontWeight: 800 }}>⚠️ Clarification Needed</span>
                              ) : r.status === "approved" ? (
                                <span style={{ fontSize: 9, background: "#dcfce7", color: "#15803d", border: "1px solid #bbf7d0", borderRadius: 4, padding: "1px 5px", fontWeight: 800 }}>✓ Approved & Locked</span>
                              ) : (
                                <span style={{ fontSize: 9, background: "#f1f5f9", color: "#475569", border: "1px solid #e2e8f0", borderRadius: 4, padding: "1px 5px", fontWeight: 800 }}>⏳ Pending Admin</span>
                              )}
                            </div>
                          </div>
                          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                            {r.hddLength > 0 && (
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  window.open(`/app/print-hdd?reportId=${r.id}`, '_blank');
                                }}
                                style={{
                                    fontSize: 9,
                                    fontWeight: 750,
                                    color: "#8b5cf6",
                                    background: "rgba(139, 92, 246, 0.08)",
                                    border: "1px solid rgba(139, 92, 246, 0.2)",
                                    borderRadius: 8,
                                    padding: "4px 8px",
                                    cursor: "pointer",
                                    fontFamily: "Outfit, sans-serif"
                                }}
                              >
                                🖨️ Log Sheet
                              </button>
                            )}
                            <span style={{ fontSize: 18, color: "var(--muted)" }}>→</span>
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>
              ) : (
                // 2. Chat and Corrections Details view
                <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
                  <button 
                    onClick={() => setSelectedClarificationReport(null)}
                    style={{ alignSelf: "flex-start", background: "none", border: "none", color: "#8b5cf6", fontSize: 11, fontWeight: 800, cursor: "pointer", padding: 0 }}
                  >
                    ← Back to inbox listing
                  </button>

                  <div style={{ background: "var(--bg)", border: "1px solid var(--border)", borderRadius: 16, padding: 12 }}>
                    <h4 style={{ fontSize: 13, fontWeight: 800, color: "var(--text)", margin: 0 }}>Report Date: {selectedClarificationReport.reportDate}</h4>
                    <span style={{ fontSize: 10, color: "var(--dim)" }}>Corridor ID: {selectedClarificationReport.projectId}</span>
                  </div>

                  {/* Chat logs box */}
                  <span style={{ fontSize: 10, fontWeight: 900, color: "#8b5cf6", textTransform: "uppercase", letterSpacing: "0.08em", display: "block" }}>Admin Clarification Thread</span>
                  <div style={{ background: "var(--bg)", border: "1px solid var(--border)", borderRadius: 16, padding: 12, minHeight: 120, maxHeight: 180, overflowY: "auto", display: "flex", flexDirection: "column", gap: 10 }}>
                    {loadingSupervisorChat ? (
                      <div style={{ textAlign: "center", color: "var(--dim)", fontSize: 11, padding: "20px 0" }}>Syncing chat thread...</div>
                    ) : supervisorChatMessages.length === 0 ? (
                      <div style={{ textAlign: "center", color: "var(--muted)", fontSize: 11, padding: "30px 10px", fontStyle: "italic" }}>No chat logs recorded. Write a message below to coordinate.</div>
                    ) : (
                      supervisorChatMessages.map((msg: any) => {
                        const isSupervisor = msg.sender_role === "supervisor";
                        return (
                          <div key={msg.id} style={{ display: "flex", flexDirection: "column", alignSelf: isSupervisor ? "flex-end" : "flex-start", maxWidth: "80%" }}>
                            <div style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 9, color: "var(--dim)", marginBottom: 2, padding: "0 4px" }}>
                              <strong>{msg.sender_name}</strong> ({msg.sender_role})
                              {msg.item_type && msg.item_type !== "general" && (
                                <span style={{ background: "var(--surface)", border: "1px solid var(--border)", borderRadius: 3, padding: "0 3px", color: "var(--muted)" }}>🏷️ {msg.item_type}</span>
                              )}
                            </div>
                            <div style={{ background: isSupervisor ? "rgba(139, 92, 246, 0.1)" : "var(--surface)", border: isSupervisor ? "1px solid rgba(139, 92, 246, 0.2)" : "1px solid var(--border)", borderRadius: 10, padding: "8px 12px", fontSize: 11, color: "var(--text)" }}>
                              {msg.message}
                            </div>
                            <span style={{ fontSize: 8, color: "var(--muted)", display: "block", marginTop: 2, alignSelf: "flex-end", padding: "0 4px" }}>{new Date(msg.created_at).toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" })}</span>
                          </div>
                        );
                      })
                    )}
                  </div>

                  {/* Chat messaging input */}
                  <div style={{ display: "flex", gap: 8 }}>
                    <input
                      type="text"
                      value={newSupervisorMessage}
                      onChange={(e) => setNewSupervisorMessage(e.target.value)}
                      placeholder="Write message to admin..."
                      style={{ flex: 1, height: 34, background: "var(--bg)", border: "1px solid var(--border)", borderRadius: 8, padding: "0 10px", color: "var(--text)", fontSize: 11, outline: "none" }}
                    />
                    <button
                      onClick={handleSendSupervisorChatMessage}
                      style={{ background: "linear-gradient(135deg, #8b5cf6 0%, #6d28d9 100%)", color: "#ffffff", border: "none", borderRadius: 8, padding: "0 14px", height: 34, fontSize: 11, fontWeight: 800, cursor: "pointer", fontFamily: "Outfit, sans-serif" }}
                    >
                      Send Message
                    </button>
                  </div>

                  {/* Flagged corrections form */}
                  {selectedClarificationReport.status === "clarification" && (
                    <div style={{ background: "rgba(220, 38, 38, 0.03)", border: "1px solid rgba(220, 38, 38, 0.15)", borderRadius: 20, padding: 14, display: "flex", flexDirection: "column", gap: 10 }}>
                      <span style={{ fontSize: 10, fontWeight: 900, color: "#ef4444", textTransform: "uppercase", letterSpacing: "0.08em", display: "block" }}>⚙️ Upload Correction Patch</span>
                      
                      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
                        <div>
                          <label style={{ fontSize: 9, color: "var(--dim)", fontWeight: 700 }}>Trenching WIP (m)</label>
                          <input
                            type="number"
                            value={correctiveWipTrenching}
                            onChange={(e) => setCorrectiveWipTrenching(e.target.value)}
                            style={{ width: "100%", height: 32, background: "var(--bg)", border: "1px solid var(--border)", borderRadius: 6, padding: "0 8px", color: "var(--text)", fontSize: 11, outline: "none" }}
                          />
                        </div>
                        <div>
                          <label style={{ fontSize: 9, color: "var(--dim)", fontWeight: 700 }}>HDD Boring WIP (m)</label>
                          <input
                            type="number"
                            value={correctiveWipHdd}
                            onChange={(e) => setCorrectiveWipHdd(e.target.value)}
                            style={{ width: "100%", height: 32, background: "var(--bg)", border: "1px solid var(--border)", borderRadius: 6, padding: "0 8px", color: "var(--text)", fontSize: 11, outline: "none" }}
                          />
                        </div>
                        <div>
                          <label style={{ fontSize: 9, color: "var(--dim)", fontWeight: 700 }}>Fuel Expenses (₹)</label>
                          <input
                            type="number"
                            value={correctiveFuelExpenses}
                            onChange={(e) => setCorrectiveFuelExpenses(e.target.value)}
                            style={{ width: "100%", height: 32, background: "var(--bg)", border: "1px solid var(--border)", borderRadius: 6, padding: "0 8px", color: "var(--text)", fontSize: 11, outline: "none" }}
                          />
                        </div>
                        <div>
                          <label style={{ fontSize: 9, color: "var(--dim)", fontWeight: 700 }}>Travel/Transit (₹)</label>
                          <input
                            type="number"
                            value={correctiveTravelExpenses}
                            onChange={(e) => setCorrectiveTravelExpenses(e.target.value)}
                            style={{ width: "100%", height: 32, background: "var(--bg)", border: "1px solid var(--border)", borderRadius: 6, padding: "0 8px", color: "var(--text)", fontSize: 11, outline: "none" }}
                          />
                        </div>
                        <div>
                          <label style={{ fontSize: 9, color: "var(--dim)", fontWeight: 700 }}>Room Rent Stay (₹)</label>
                          <input
                            type="number"
                            value={correctiveRoomRent}
                            onChange={(e) => setCorrectiveRoomRent(e.target.value)}
                            style={{ width: "100%", height: 32, background: "var(--bg)", border: "1px solid var(--border)", borderRadius: 6, padding: "0 8px", color: "var(--text)", fontSize: 11, outline: "none" }}
                          />
                        </div>
                        <div>
                          <label style={{ fontSize: 9, color: "var(--dim)", fontWeight: 700 }}>Tool Rents (₹)</label>
                          <input
                            type="number"
                            value={correctiveToolRent}
                            onChange={(e) => setCorrectiveToolRent(e.target.value)}
                            style={{ width: "100%", height: 32, background: "var(--bg)", border: "1px solid var(--border)", borderRadius: 6, padding: "0 8px", color: "var(--text)", fontSize: 11, outline: "none" }}
                          />
                        </div>
                      </div>

                      {/* File uploads for missing files */}
                      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, marginTop: 4 }}>
                        <div>
                          <label style={{ display: "block", fontSize: 9, color: "var(--dim)", fontWeight: 700, marginBottom: 4 }}>Accommodation receipt</label>
                          <input 
                            type="file" 
                            accept="image/*,application/pdf"
                            onChange={(e) => {
                              if (e.target.files?.[0]) {
                                processUploadedFile(e.target.files[0], setCorrectiveRoomReceipt);
                              }
                            }}
                            style={{ fontSize: 10, width: "100%" }}
                          />
                          {correctiveRoomReceipt && <span style={{ fontSize: 8, color: "#10b981", fontWeight: 700 }}>✓ Attached</span>}
                        </div>
                        <div>
                          <label style={{ display: "block", fontSize: 9, color: "var(--dim)", fontWeight: 700, marginBottom: 4 }}>Tool rental receipt</label>
                          <input 
                            type="file" 
                            accept="image/*,application/pdf"
                            onChange={(e) => {
                              if (e.target.files?.[0]) {
                                processUploadedFile(e.target.files[0], setCorrectiveToolReceipt);
                              }
                            }}
                            style={{ fontSize: 10, width: "100%" }}
                          />
                          {correctiveToolReceipt && <span style={{ fontSize: 8, color: "#10b981", fontWeight: 700 }}>✓ Attached</span>}
                        </div>
                      </div>

                      <button
                        onClick={handleResolveClarification}
                        disabled={resolvingClarification}
                        style={{ width: "100%", height: 38, background: "linear-gradient(135deg, #ef4444 0%, #dc2626 100%)", color: "#ffffff", border: "none", borderRadius: 10, fontSize: 12, fontWeight: 800, cursor: "pointer", fontFamily: "Outfit, sans-serif", marginTop: 8 }}
                      >
                        {resolvingClarification ? "Uploading updates..." : "🚀 Submit Corrections to Admin"}
                      </button>
                    </div>
                  )}

                </div>
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
        <div style={{ position: "fixed", bottom: 24, left: 16, right: 16, background: "#1e293b", border: "1px solid var(--border)", borderRadius: 14, padding: "14px 18px", fontSize: 13, fontWeight: 600, color: "var(--text)", zIndex: 10000, textAlign: "center", boxShadow: "0 8px 32px rgba(0,0,0,0.5)", animation: "fadeIn 0.3s ease" }}>
          {toast}
        </div>
      )}
    </div>
  );
}

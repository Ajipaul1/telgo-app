"use client";

import Image from "next/image";
import { useEffect, useMemo, useRef, useState, type ReactNode, type RefObject } from "react";
import {
  Bell,
  CalendarCheck,
  CalendarDays,
  ChartNoAxesColumnIncreasing,
  Check,
  CheckCircle2,
  ChevronDown,
  ChevronLeft,
  CircleCheck,
  Clock3,
  CloudUpload,
  ClipboardCheck,
  Download,
  FileText,
  Folder,
  FolderOpen,
  Fuel,
  HardHat,
  Headphones,
  Home,
  IndianRupee,
  ListChecks,
  MapPin,
  Megaphone,
  Paperclip,
  MessageCircle,
  NotebookPen,
  Package,
  PieChart,
  Plus,
  ReceiptIndianRupee,
  Search,
  Settings,
  Shield,
  ShieldCheck,
  Smartphone,
  Sparkles,
  SquarePen,
  SendHorizontal,
  TriangleAlert,
  Truck,
  Trash2,
  User,
  UserCheck,
  Users,
  UsersRound,
  WalletCards,
  Wrench,
  X
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { LiveMap, type LiveMapTrackedPoint } from "@/components/live-map";
import {
  accessDirectorySeed,
  clientAccessSeed,
  engineerTaskSeed,
  leaveRequestSeed,
  pendingApprovalSeed,
  pwdDocumentSeed,
  workerRosterSeed,
  yesterdayReportSeed,
  type AccessDirectoryEntry,
  type ClientAccessEntry,
  type EngineerTaskItem,
  type LeaveRequestItem,
  type PendingApprovalRequest,
  type PwdDocumentItem,
  type WorkerRosterItem,
  type YesterdayReportItem
} from "@/lib/mobile-seed";
import { supabase } from "@/lib/supabase/client";
import { projects } from "@/lib/demo-data";
import {
  formatMeters,
  getGoogleMapsDirectionsUrl,
  getProgressMeters,
  getRemainingMeters
} from "@/lib/project-corridor";
import type { Project } from "@/lib/types";
import { cn } from "@/lib/utils";

type MvpView = "request" | "otp" | "pin" | "signin" | "dashboard" | "module" | "chat" | "profile";
type OtpReturnView = "request" | "signin";
type AccessRole = "engineer" | "supervisor" | "finance" | "client" | "admin";
type AppUser = {
  id: string;
  email: string;
  loginId: string;
  name: string;
  role: string;
  createdAt: string;
  avatarUrl?: string | null;
};

type Tone = "blue" | "green" | "purple" | "orange" | "red" | "slate";

type ModuleItem = {
  title: string;
  subtitle: string;
  icon: LucideIcon;
  tone: Tone;
};

type RoleDashboardAction = {
  title: string;
  detail: string;
  moduleTitle: string;
};

type RoleFeatureItem = {
  title: string;
  detail: string;
};

type RoleDashboardSection = {
  title: string;
  detail: string;
  items: RoleFeatureItem[];
};

type RoleDashboardDefinition = {
  intro: string;
  focusTitle: string;
  focusDetail: string;
  quickActions: RoleDashboardAction[];
  sections: RoleDashboardSection[];
  statusTitle: string;
  statusBody: string;
};

type ChatMention = {
  userId: string;
  name: string;
  loginId: string;
};

type ChatMember = {
  id: string;
  name: string;
  email: string | null;
  role: string;
  loginId: string;
};

type ChatMessage = {
  id: string;
  body: string;
  createdAt: string;
  sender: {
    name: string;
    email: string | null;
    role: string;
    loginId: string;
    userId: string;
  };
  mentions: ChatMention[];
  isDeleted: boolean;
  deletedAt: string | null;
  deletedByName: string | null;
  images: Array<{
    path: string;
    url: string | null;
    fileName: string;
    width: number | null;
    height: number | null;
    sizeBytes: number | null;
    mimeType: string | null;
  }>;
};

type MobileNotificationItem = {
  id: string;
  title: string;
  body: string | null;
  type: string;
  isRead: boolean;
  createdAt: string;
  metadata: Record<string, unknown>;
};

type MobileAttendanceRecord = {
  id: string;
  mobileUserId: string;
  userName: string;
  userLoginId: string;
  userRole: string;
  projectId: string;
  projectName: string;
  checkInAt: string;
  latitude: number;
  longitude: number;
  gpsAccuracyM: number | null;
  distanceFromSiteM: number;
  withinGeofence: boolean;
  status: string;
};

type MobileTrackingSnapshot = {
  project: Project;
  locations: LiveMapTrackedPoint[];
  attendance: MobileAttendanceRecord[];
  canViewAll: boolean;
};

type ChatDraftImage = {
  id: string;
  file: File;
  previewUrl: string;
  sizeLabel: string;
};

type ProjectEditorState = {
  mode: "create" | "edit";
  id?: string;
  name: string;
  code: string;
  location: string;
  status: Project["status"];
  totalLengthKm: string;
  completedKm: string;
};

const SESSION_KEY = "telgo-mobile-session";
const DEVICE_ACCOUNT_KEY = "telgo-mobile-account";
const APK_DOWNLOAD_PATH = "/downloads/telgo-hub.apk";
const accessRoles: { value: AccessRole; label: string; description: string }[] = [
  { value: "engineer", label: "Engineer", description: "Site updates and reports" },
  { value: "supervisor", label: "Supervisor", description: "Team and site review" },
  { value: "finance", label: "Finance", description: "Approvals and payments" },
  { value: "client", label: "Client", description: "Project visibility" },
  { value: "admin", label: "Admin", description: "Operations control" }
];

const toneStyles: Record<Tone, { icon: string; box: string; text: string }> = {
  blue: {
    icon: "text-[#115cff]",
    box: "bg-blue-50",
    text: "text-[#115cff]"
  },
  green: {
    icon: "text-[#14b866]",
    box: "bg-emerald-50",
    text: "text-[#14b866]"
  },
  purple: {
    icon: "text-[#8b35ff]",
    box: "bg-violet-50",
    text: "text-[#8b35ff]"
  },
  orange: {
    icon: "text-[#ff8a00]",
    box: "bg-orange-50",
    text: "text-[#ff8a00]"
  },
  red: {
    icon: "text-[#ff3d57]",
    box: "bg-rose-50",
    text: "text-[#ff3d57]"
  },
  slate: {
    icon: "text-slate-500",
    box: "bg-slate-100",
    text: "text-slate-600"
  }
};

const roleDashboardModuleTitleByRole: Record<AccessRole, string> = {
  admin: "Admin Dashboard",
  supervisor: "Supervisor Dashboard",
  engineer: "Engineer Dashboard",
  finance: "Finance Dashboard",
  client: "Client Dashboard"
};

const modules: ModuleItem[] = [
  { title: "Projects", subtitle: "All work packages", icon: Folder, tone: "blue" },
  { title: "Live Tracking", subtitle: "Live workforce map", icon: MapPin, tone: "green" },
  { title: "Company Access", subtitle: "Approved users & controls", icon: UsersRound, tone: "purple" },
  { title: "Pending Approval", subtitle: "Approval and access queue", icon: CircleCheck, tone: "orange" },
  { title: "Yesterday Reports", subtitle: "Latest submitted reports", icon: ClipboardCheck, tone: "blue" },
  { title: "Admin Dashboard", subtitle: "Operations control center", icon: Shield, tone: "red" },
  { title: "Supervisor Dashboard", subtitle: "Site leadership view", icon: ShieldCheck, tone: "orange" },
  { title: "Engineer Dashboard", subtitle: "Field execution workspace", icon: HardHat, tone: "purple" },
  { title: "Finance Dashboard", subtitle: "Finance workspace", icon: IndianRupee, tone: "green" },
  { title: "Client Dashboard", subtitle: "Client access and sharing", icon: Users, tone: "orange" },
  { title: "Mark Attendance", subtitle: "Live GPS check-in", icon: UserCheck, tone: "green" },
  { title: "Monthly Attendance", subtitle: "Calendar and leave", icon: CalendarDays, tone: "blue" },
  { title: "Leave Requests", subtitle: "Apply and review leave", icon: CalendarCheck, tone: "green" },
  { title: "Assigned Tasks", subtitle: "Today's assigned work", icon: ListChecks, tone: "purple" },
  { title: "Current Engineers", subtitle: "Live engineering staff", icon: Users, tone: "blue" },
  { title: "Worker Register", subtitle: "All project workers", icon: UsersRound, tone: "slate" },
  { title: "PWD Permission Reports", subtitle: "Permission and client files", icon: FileText, tone: "orange" },
  { title: "Update Project", subtitle: "Progress and status update", icon: ChartNoAxesColumnIncreasing, tone: "purple" },
  { title: "Upload Report", subtitle: "Photo and site report", icon: CloudUpload, tone: "green" },
  { title: "Live Chat", subtitle: "Team communication", icon: MessageCircle, tone: "blue" }
];

const roleModuleTitles: Record<AccessRole, string[]> = {
  admin: [
    "Admin Dashboard",
    "Projects",
    "Live Tracking",
    "Company Access",
    "Pending Approval",
    "Yesterday Reports",
    "Supervisor Dashboard",
    "Engineer Dashboard",
    "Client Dashboard",
    "Finance Dashboard",
    "Current Engineers",
    "Worker Register",
    "PWD Permission Reports",
    "Live Chat"
  ],
  supervisor: [
    "Supervisor Dashboard",
    "Live Tracking",
    "Projects",
    "Current Engineers",
    "Yesterday Reports",
    "Mark Attendance",
    "Monthly Attendance",
    "Leave Requests",
    "Assigned Tasks",
    "Upload Report",
    "PWD Permission Reports",
    "Live Chat"
  ],
  engineer: [
    "Engineer Dashboard",
    "Mark Attendance",
    "Monthly Attendance",
    "Leave Requests",
    "Assigned Tasks",
    "Projects",
    "Update Project",
    "Upload Report",
    "Live Chat",
    "PWD Permission Reports"
  ],
  finance: [
    "Finance Dashboard",
    "Projects",
    "Yesterday Reports",
    "Live Chat",
    "PWD Permission Reports"
  ],
  client: [
    "Client Dashboard",
    "Projects",
    "Live Chat",
    "PWD Permission Reports"
  ]
};

const roleDashboardContent: Record<AccessRole, RoleDashboardDefinition> = {
  admin: {
    intro: "You are signed in to the full operations command center.",
    focusTitle: "Admin operations dashboard",
    focusDetail:
      "Control all projects, project access, live field locations, pending approvals, yesterday reports, client sharing, and workforce actions from one mobile workspace.",
    quickActions: [
      { title: "Open all projects", detail: "Add, edit, and track every work package.", moduleTitle: "Projects" },
      { title: "See live field map", detail: "Open the live tracking map with logged people.", moduleTitle: "Live Tracking" },
      { title: "Review approval queue", detail: "Approve access, leave, and report requests.", moduleTitle: "Pending Approval" },
      { title: "Manage company access", detail: "Reset PINs, remove access, and control roles.", moduleTitle: "Company Access" }
    ],
    sections: [
      {
        title: "Project control",
        detail: "The admin dashboard should make every live and blocked project visible in one glance.",
        items: [
          { title: "All project map", detail: "Show all corridor works together with status chips." },
          { title: "Project editor", detail: "Add new projects, update lengths, and revise progress." },
          { title: "Blocked works", detail: "Surface PWD and permission hold items clearly." },
          { title: "Live field updates", detail: "Connect yesterday reports and live attendance to each project." }
        ]
      },
      {
        title: "People and access",
        detail: "Admin should control every approved device account from one place.",
        items: [
          { title: "Company access directory", detail: "See role, email, PIN status, and active access." },
          { title: "Pending approval queue", detail: "Approve or reject new access and workflow requests." },
          { title: "Client access mapping", detail: "Assign clients only to their own project data." },
          { title: "Worker register", detail: "View all engineers and workers with project assignment." }
        ]
      },
      {
        title: "Control room outputs",
        detail: "Notifications, reports, and documents should feel like a real operations center.",
        items: [
          { title: "Yesterday reports", detail: "Review the latest field reports and status uploads." },
          { title: "Notification control", detail: "Receive app and top-bar alerts from live workflows." },
          { title: "PWD file desk", detail: "Upload and download permission and client files." },
          { title: "Live chat oversight", detail: "Keep current team chat and moderation controls active." }
        ]
      }
    ],
    statusTitle: "Admin workspace is ready for a project-by-project control room.",
    statusBody:
      "This redesign keeps the current login, chat, notifications, map, and attendance pipelines intact while moving the UI toward a real client handover."
  },
  supervisor: {
    intro: "You are signed in to the site supervision workspace.",
    focusTitle: "Supervisor site control",
    focusDetail:
      "Supervisor view should focus on live teams, attendance, leave, reports, and field blockers without exposing the full admin control room.",
    quickActions: [
      { title: "Open live map", detail: "See current engineer attendance marks.", moduleTitle: "Live Tracking" },
      { title: "Review reports", detail: "Check yesterday and current report submissions.", moduleTitle: "Yesterday Reports" },
      { title: "Handle leave", detail: "Review leave requests from the field.", moduleTitle: "Leave Requests" },
      { title: "Follow tasks", detail: "Track today's site assignments.", moduleTitle: "Assigned Tasks" }
    ],
    sections: [
      {
        title: "Field discipline",
        detail: "Attendance, leave, and report discipline should sit at the center of the supervisor view.",
        items: [
          { title: "Attendance watch", detail: "See who marked in and from where." },
          { title: "Leave queue", detail: "Approve or reject site leave requests." },
          { title: "Report follow-up", detail: "Push engineers for missing daily submissions." },
          { title: "Chat coordination", detail: "Use live chat for same-day site communication." }
        ]
      },
      {
        title: "Project visibility",
        detail: "Supervisor should see every project that matters to the field team.",
        items: [
          { title: "Assigned corridor tracking", detail: "Monitor completion against the assigned project route." },
          { title: "Permission blockers", detail: "Surface PWD or road opening issues quickly." },
          { title: "Worker status", detail: "Check which engineers are live, offline, or on leave." },
          { title: "Photo upload status", detail: "Verify site photos and progress evidence." }
        ]
      },
      {
        title: "Supervisor notes",
        detail: "This area is ready for the next stage of supervisor workflow design.",
        items: [
          { title: "Expense capture", detail: "Supervisor expenditure flow can be added next." },
          { title: "Inspection controls", detail: "Site inspection and quality closure can sit here." },
          { title: "Shift snapshots", detail: "Daily team and corridor summaries can be added later." },
          { title: "Escalation notes", detail: "Supervisor-specific remarks and escalations can land here." }
        ]
      }
    ],
    statusTitle: "Supervisor dashboard is ready for the next workflow layer.",
    statusBody:
      "The live map, reports, leave requests, and site coordination pieces are now aligned for supervisor-first design."
  },
  engineer: {
    intro: "You are signed in to the engineer field workspace.",
    focusTitle: "Engineer daily execution dashboard",
    focusDetail:
      "This dashboard should keep the engineer focused on the assigned project, attendance, today's tasks, leave, updates, uploads, and live chat.",
    quickActions: [
      { title: "Mark attendance", detail: "Take the live location attendance mark.", moduleTitle: "Mark Attendance" },
      { title: "Open today's tasks", detail: "See assignments pushed from admin.", moduleTitle: "Assigned Tasks" },
      { title: "Open attendance calendar", detail: "Review this month's work and leave days.", moduleTitle: "Monthly Attendance" },
      { title: "Upload report", detail: "Push progress photos and live site updates.", moduleTitle: "Upload Report" }
    ],
    sections: [
      {
        title: "Assigned work",
        detail: "The assigned project should always stay at the top of the engineer dashboard.",
        items: [
          { title: "Assigned project heading", detail: "Show the project selected from admin assignment." },
          { title: "Today's tasks", detail: "List tasks pushed by admin or supervisor." },
          { title: "Project update", detail: "Push percentage, text update, and field status." },
          { title: "Live chat", detail: "Keep the project team channel available." }
        ]
      },
      {
        title: "Attendance and leave",
        detail: "Attendance and leave must feel immediate and location aware.",
        items: [
          { title: "Mark attendance", detail: "Capture live GPS only when the engineer taps the button." },
          { title: "Monthly attendance", detail: "Show worked days, approved leave, and pending leave." },
          { title: "Leave request", detail: "Send a leave request from the calendar itself." },
          { title: "Admin visibility", detail: "Each attendance mark should appear in admin live tracking." }
        ]
      },
      {
        title: "Profile and documents",
        detail: "Engineer profile and project document actions should stay inside the mobile shell.",
        items: [
          { title: "Profile photo and name", detail: "Allow the engineer to upload a profile photo and edit display name." },
          { title: "PWD reports", detail: "Upload project documents and client-facing files." },
          { title: "Photo compression", detail: "Keep mobile uploads light and fast." },
          { title: "Premium mobile UI", detail: "Make the APK feel like a polished field app, not a demo." }
        ]
      }
    ],
    statusTitle: "Engineer dashboard is ready for assigned-project execution.",
    statusBody:
      "The attendance, chat, notifications, project, and upload pipelines remain active while the UI shifts to a real engineer-first mobile flow."
  },
  finance: {
    intro: "You are signed in to the finance workspace.",
    focusTitle: "Finance dashboard placeholder",
    focusDetail:
      "Finance modules will be integrated later, but the dashboard entry remains in place so the overall role architecture stays complete.",
    quickActions: [
      { title: "Open finance space", detail: "Finance role shell is reserved for later buildout.", moduleTitle: "Finance Dashboard" },
      { title: "Open projects", detail: "Review project list and status context.", moduleTitle: "Projects" },
      { title: "Open reports", detail: "Read the latest field report summaries.", moduleTitle: "Yesterday Reports" },
      { title: "Open documents", detail: "Review available PWD and client files.", moduleTitle: "PWD Permission Reports" }
    ],
    sections: [
      {
        title: "Reserved finance controls",
        detail: "Finance controls are intentionally light in this phase.",
        items: [
          { title: "Expense workflow", detail: "Expense submission and approval can be added next." },
          { title: "Invoice control", detail: "Client billing panels can live in this role later." },
          { title: "Payroll linkage", detail: "Attendance-to-payroll connection can be added later." },
          { title: "Audit exports", detail: "Documented finance exports can slot into this dashboard." }
        ]
      },
      {
        title: "Project context",
        detail: "Finance can already follow the project and report structure while role logic is staged.",
        items: [
          { title: "Projects", detail: "See current works and their status labels." },
          { title: "Yesterday reports", detail: "Read latest site notes from the field." },
          { title: "Permission files", detail: "Open supporting documents when needed." },
          { title: "Live chat", detail: "Stay on the common communication channel." }
        ]
      },
      {
        title: "Next stage",
        detail: "This role remains intentionally minimal for the current phase.",
        items: [
          { title: "No blind access", detail: "Finance role will still stay isolated from unrelated client data." },
          { title: "Fast mobile shell", detail: "Keep the APK structure aligned before finance rollout." },
          { title: "Future integrations", detail: "Expense, payroll, and approvals will follow later." },
          { title: "Preserved pipelines", detail: "Chat, auth, and notifications remain usable in the meantime." }
        ]
      }
    ],
    statusTitle: "Finance dashboard is staged for later integration.",
    statusBody:
      "The role entry remains visible now so the mobile app structure stays complete while finance-specific workflows are added later."
  },
  client: {
    intro: "You are signed in to the client visibility workspace.",
    focusTitle: "Client project portal",
    focusDetail:
      "Client view should show only the assigned project, its map, reports, shared documents, and controlled communication without leaking company-wide data.",
    quickActions: [
      { title: "Open assigned project", detail: "See the client's mapped project view.", moduleTitle: "Projects" },
      { title: "Open client access", detail: "Review which clients are approved or not assigned.", moduleTitle: "Client Dashboard" },
      { title: "Open documents", detail: "Download permission and client files.", moduleTitle: "PWD Permission Reports" },
      { title: "Open chat", detail: "Use the controlled project chat channel.", moduleTitle: "Live Chat" }
    ],
    sections: [
      {
        title: "Client privacy",
        detail: "Only the assigned project should be visible to a client account.",
        items: [
          { title: "Assigned project only", detail: "No cross-project data should leak into the client portal." },
          { title: "Project map", detail: "Show the assigned corridor and progress visually." },
          { title: "Shared documents", detail: "Allow document download at any time." },
          { title: "Completion feedback", detail: "Add a feedback stage when the project is completed." }
        ]
      },
      {
        title: "Client controls",
        detail: "Client access should stay easy to manage from the admin side.",
        items: [
          { title: "Approved clients", detail: "See client names already mapped to projects." },
          { title: "Not assigned clients", detail: "Assign unlinked clients to a project from admin." },
          { title: "Remove access", detail: "Admin can revoke client visibility when needed." },
          { title: "Live chat link", detail: "Keep client communication in the controlled project thread." }
        ]
      },
      {
        title: "Portal direction",
        detail: "The full client visual system can be refined later, but the structure must already be isolated and premium.",
        items: [
          { title: "Modern project view", detail: "The portal should feel clean, minimal, and premium." },
          { title: "Fast document access", detail: "Project packages should download cleanly on mobile." },
          { title: "Clear status updates", detail: "Progress, blockers, and milestone notes should stay visible." },
          { title: "No data leakage", detail: "Client isolation remains a hard rule in the design." }
        ]
      }
    ],
    statusTitle: "Client dashboard is aligned for privacy-first project sharing.",
    statusBody:
      "The client portal remains intentionally narrower than the admin and engineer views so only project-specific information is shown."
  }
};

const projectStatusOptions: Project["status"][] = [
  "Active",
  "Completed",
  "Delayed",
  "On Track",
  "At Risk"
];

function makeProjectEditor(project?: Project): ProjectEditorState {
  return {
    mode: project ? "edit" : "create",
    id: project?.id,
    name: project?.name ?? "",
    code: project?.code ?? "",
    location: project?.location ?? "",
    status: project?.status ?? "Active",
    totalLengthKm: String(project?.totalLengthKm ?? ""),
    completedKm: String(project?.completedKm ?? "")
  };
}

export function TelgoMvpApp() {
  const [view, setView] = useState<MvpView>("signin");
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [requestedRole, setRequestedRole] = useState<AccessRole>("engineer");
  const [loginId, setLoginId] = useState("");
  const [otpCode, setOtpCode] = useState("");
  const [pin, setPin] = useState("");
  const [confirmPin, setConfirmPin] = useState("");
  const [signinPin, setSigninPin] = useState("");
  const [pendingUser, setPendingUser] = useState<AppUser | null>(null);
  const [savedAccount, setSavedAccount] = useState<AppUser | null>(null);
  const [otpReturnView, setOtpReturnView] = useState<OtpReturnView>("request");
  const [notice, setNotice] = useState("");
  const [loading, setLoading] = useState(false);
  const [user, setUser] = useState<AppUser | null>(null);
  const [projectPortfolio, setProjectPortfolio] = useState<Project[]>(projects);
  const [accessDirectory, setAccessDirectory] = useState<AccessDirectoryEntry[]>(accessDirectorySeed);
  const [pendingApprovals, setPendingApprovals] =
    useState<PendingApprovalRequest[]>(pendingApprovalSeed);
  const [yesterdayReports, setYesterdayReports] =
    useState<YesterdayReportItem[]>(yesterdayReportSeed);
  const [clientAccess, setClientAccess] = useState<ClientAccessEntry[]>(clientAccessSeed);
  const [engineerTasks, setEngineerTasks] = useState<EngineerTaskItem[]>(engineerTaskSeed);
  const [leaveRequests, setLeaveRequests] = useState<LeaveRequestItem[]>(leaveRequestSeed);
  const [workerRoster, setWorkerRoster] = useState<WorkerRosterItem[]>(workerRosterSeed);
  const [pwdDocuments, setPwdDocuments] = useState<PwdDocumentItem[]>(pwdDocumentSeed);
  const [projectEditor, setProjectEditor] = useState<ProjectEditorState | null>(null);
  const [profileAvatarUrl, setProfileAvatarUrl] = useState<string | null>(null);
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [chatMembers, setChatMembers] = useState<ChatMember[]>([]);
  const [chatComposer, setChatComposer] = useState("");
  const [chatDraftImages, setChatDraftImages] = useState<ChatDraftImage[]>([]);
  const [chatLoading, setChatLoading] = useState(false);
  const [chatError, setChatError] = useState("");
  const [notifications, setNotifications] = useState<MobileNotificationItem[]>([]);
  const [notificationsLoading, setNotificationsLoading] = useState(false);
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const [trackingSnapshot, setTrackingSnapshot] = useState<MobileTrackingSnapshot | null>(null);
  const [trackingLoading, setTrackingLoading] = useState(false);
  const [trackingError, setTrackingError] = useState("");
  const [attendanceSubmitting, setAttendanceSubmitting] = useState(false);
  const [activeModule, setActiveModule] = useState<ModuleItem | null>(null);
  const [search, setSearch] = useState("");
  const [clock, setClock] = useState<Date | null>(null);
  const chatEndRef = useRef<HTMLDivElement | null>(null);
  const currentRole = resolveAccessRole(user?.role ?? requestedRole);
  const currentAccessEntry = useMemo(
    () =>
      accessDirectory.find((entry) =>
        normalizeEmail(entry.email) === normalizeEmail(user?.email ?? "")
      ) ?? null,
    [accessDirectory, user?.email]
  );
  const assignedProjectId = currentAccessEntry?.assignedProjectIds[0] ?? null;
  const primaryProject =
    projectPortfolio.find((project) => project.id === assignedProjectId) ??
    trackingSnapshot?.project ??
    projectPortfolio[0];
  const currentTasks = useMemo(
    () =>
      engineerTasks.filter(
        (task) => normalizeEmail(task.assigneeEmail) === normalizeEmail(user?.email ?? "")
      ),
    [engineerTasks, user?.email]
  );
  const currentLeaveRequests = useMemo(
    () =>
      leaveRequests.filter(
        (request) => normalizeEmail(request.email) === normalizeEmail(user?.email ?? "")
      ),
    [leaveRequests, user?.email]
  );
  const currentClientEntry = useMemo(
    () =>
      clientAccess.find((entry) => normalizeEmail(entry.email) === normalizeEmail(user?.email ?? "")) ??
      null,
    [clientAccess, user?.email]
  );

  useEffect(() => {
    setProfileAvatarUrl(user?.avatarUrl ?? savedAccount?.avatarUrl ?? null);
  }, [savedAccount?.avatarUrl, user?.avatarUrl]);

  const filteredModules = useMemo(() => {
    const allowedTitles = new Set(roleModuleTitles[currentRole]);
    const query = search.trim().toLowerCase();
    return modules.filter((item) => {
      if (!allowedTitles.has(item.title)) return false;
      if (!query) return true;
      return `${item.title} ${item.subtitle}`.toLowerCase().includes(query);
    });
  }, [currentRole, search]);

  const unreadNotifications = useMemo(
    () => notifications.filter((item) => !item.isRead).length,
    [notifications]
  );

  const mentionMatches = useMemo(() => {
    const match = chatComposer.match(/(?:^|\s)@([A-Za-z0-9._-]*)$/);
    if (!match) return [];

    const query = String(match[1] ?? "").trim().toLowerCase();
    return chatMembers
      .filter((member) => member.id !== user?.id)
      .filter((member) => {
        if (!query) return true;
        return (
          member.loginId.toLowerCase().includes(query) ||
          member.name.toLowerCase().includes(query) ||
          (member.email ?? "").toLowerCase().includes(query)
        );
      })
      .slice(0, 6);
  }, [chatComposer, chatMembers, user?.id]);

  useEffect(() => {
    let alive = true;
    setClock(new Date());
    const timer = window.setInterval(() => setClock(new Date()), 30_000);

    async function resumePendingOtpSession() {
      try {
        const cachedSession = localStorage.getItem(SESSION_KEY);
        if (cachedSession) {
          const parsed = JSON.parse(cachedSession) as AppUser;
          if (!alive) return;
          setSavedAccount(parsed);
          setUser(parsed);
          setView("dashboard");
          return;
        }
      } catch {
        localStorage.removeItem(SESSION_KEY);
      }

      try {
        const cachedAccount = localStorage.getItem(DEVICE_ACCOUNT_KEY);
        if (cachedAccount) {
          const parsed = JSON.parse(cachedAccount) as AppUser;
          if (!alive) return;
          setSavedAccount(parsed);
          setLoginId(parsed.loginId);
        }
      } catch {
        localStorage.removeItem(DEVICE_ACCOUNT_KEY);
      }

      const {
        data: { session }
      } = await supabase.auth.getSession();
      const accessToken = session?.access_token ?? "";
      if (!alive || !accessToken) return;

      const result = await postMobileAccess(
        "/api/mobile/verify-otp",
        {},
        { headers: { Authorization: `Bearer ${accessToken}` } }
      );

      if (!alive || !result.ok || !result.user) return;

      const verifiedUser = toAppUser(result.user, "");
      setPendingUser(verifiedUser);
      setEmail(verifiedUser.email);
      setLoginId(verifiedUser.loginId);
      setNotice("Email verified. Create or reset your 4-digit PIN.");
      setView("pin");
    }

    void resumePendingOtpSession();

    return () => {
      alive = false;
      window.clearInterval(timer);
    };
  }, []);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ block: "end" });
  }, [chatMessages, view]);

  useEffect(() => {
    if (view !== "chat" || !user) return;

    let cancelled = false;

    async function refreshChat(showLoader = false) {
      if (showLoader) setChatLoading(true);
      const result = await fetch("/api/mobile/chat", {
        method: "GET",
        credentials: "include"
      }).catch((error: unknown) => ({ error }));

      if (cancelled) return;
      if ("error" in result) {
        setChatLoading(false);
        setChatError(getErrorMessage(result.error));
        return;
      }

      const data = (await result.json().catch(() => null)) as
        | {
            ok?: boolean;
            message?: string;
            messages?: ChatMessage[];
            members?: ChatMember[];
          }
        | null;

      if (!result.ok || !data?.ok || !Array.isArray(data.messages)) {
        setChatLoading(false);
        setChatError(data?.message ?? "Chat could not be loaded.");
        return;
      }

      setChatMessages(data.messages);
      setChatMembers(Array.isArray(data.members) ? data.members : []);
      setChatError("");
      setChatLoading(false);
    }

    void refreshChat(true);
    const interval = window.setInterval(() => {
      void refreshChat(false);
    }, 3000);

    return () => {
      cancelled = true;
      window.clearInterval(interval);
    };
  }, [user, view]);

  useEffect(() => {
    if (!user) return;

    let cancelled = false;

    async function refreshNotifications(showLoader = false) {
      if (showLoader) setNotificationsLoading(true);
      const response = await fetch("/api/mobile/notifications", {
        method: "GET",
        credentials: "include"
      }).catch((error: unknown) => ({ error }));

      if (cancelled) return;
      if ("error" in response) {
        setNotificationsLoading(false);
        return;
      }

      const data = (await response.json().catch(() => null)) as
        | {
            ok?: boolean;
            notifications?: MobileNotificationItem[];
          }
        | null;

      if (!response.ok || !data?.ok || !Array.isArray(data.notifications)) {
        setNotificationsLoading(false);
        return;
      }

      setNotifications(data.notifications);
      setNotificationsLoading(false);
    }

    void refreshNotifications(true);
    const interval = window.setInterval(() => {
      void refreshNotifications(false);
    }, 10_000);

    return () => {
      cancelled = true;
      window.clearInterval(interval);
    };
  }, [user]);

  useEffect(() => {
    if (!user) {
      setTrackingSnapshot(null);
      setTrackingError("");
      return;
    }

    let cancelled = false;

    async function refreshTracking(showLoader = false) {
      if (showLoader) setTrackingLoading(true);
      const response = await fetch("/api/mobile/live-map", {
        method: "GET",
        credentials: "include"
      }).catch((error: unknown) => ({ error }));

      if (cancelled) return;
      if ("error" in response) {
        setTrackingLoading(false);
        setTrackingError(getErrorMessage(response.error));
        return;
      }

      const data = (await response.json().catch(() => null)) as
        | {
            ok?: boolean;
            message?: string;
            project?: Project;
            locations?: LiveMapTrackedPoint[];
            attendance?: MobileAttendanceRecord[];
            canViewAll?: boolean;
          }
        | null;

      if (!response.ok || !data?.ok || !data.project) {
        setTrackingLoading(false);
        setTrackingError(data?.message ?? "Live map tracking could not be loaded.");
        return;
      }

      setTrackingSnapshot({
        project: data.project,
        locations: Array.isArray(data.locations) ? data.locations : [],
        attendance: Array.isArray(data.attendance) ? data.attendance : [],
        canViewAll: Boolean(data.canViewAll)
      });
      setTrackingError("");
      setTrackingLoading(false);
    }

    void refreshTracking(true);
    const interval = window.setInterval(() => {
      void refreshTracking(false);
    }, 15_000);

    return () => {
      cancelled = true;
      window.clearInterval(interval);
    };
  }, [user]);

  async function markAllNotificationsRead() {
    if (!notifications.some((item) => !item.isRead)) return;

    const response = await fetch("/api/mobile/notifications", {
      method: "PATCH",
      credentials: "include"
    }).catch(() => null);

    if (!response?.ok) return;
    setNotifications((current) =>
      current.map((item) => ({
        ...item,
        isRead: true
      }))
    );
  }

  async function toggleNotifications() {
    setNotificationsOpen((current) => !current);
    if (!notificationsOpen && unreadNotifications > 0) {
      await markAllNotificationsRead();
    }
  }

  async function requestEmailAccess() {
    const normalizedEmail = normalizeEmail(email);
    if (fullName.trim().length < 2 || !normalizedEmail) {
      setNotice("Enter your name and a valid email address.");
      return;
    }
    setLoading(true);
    setNotice("Preparing approved access...");

    const response = await fetch("/api/mobile/request-access", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        fullName: fullName.trim(),
        email: normalizedEmail,
        role: requestedRole
      })
    }).catch((error: unknown) => ({ error }));

    if ("error" in response) {
      setLoading(false);
      setNotice(`Request failed: ${getErrorMessage(response.error)}`);
      return;
    }

    const data = (await response.json().catch(() => null)) as
      | { ok?: boolean; loginId?: string; message?: string }
      | null;
    if (!response.ok || !data?.ok || !data.loginId) {
      setLoading(false);
      setNotice(data?.message ?? "Access request could not be completed.");
      return;
    }

    setEmail(normalizedEmail);
    setLoginId(data.loginId);
    setOtpCode("");
    setPin("");
    setConfirmPin("");
    setOtpReturnView("request");
    setView("otp");
    const otpResult = await sendEmailOtp(normalizedEmail);
    const telgoIdLine = `Your Telgo ID is ${data.loginId}.`;
    if (!otpResult.ok) {
      setLoading(false);
      setNotice(
        `${data.message ?? "Access approved."} ${telgoIdLine} ${otpResult.message ?? "Email OTP could not be sent."}`
      );
      return;
    }

    setLoading(false);
    setNotice(`Access approved. ${telgoIdLine} Check ${normalizedEmail} for the latest OTP code.`);
  }

  async function sendOtpAgain() {
    const normalizedEmail = normalizeEmail(email);
    if (!normalizedEmail) {
      setNotice("Enter a valid email address first.");
      return;
    }

    setLoading(true);
    const result = await sendEmailOtp(normalizedEmail);
    setLoading(false);
    if (!result.ok) {
      setNotice(result.message ?? "OTP could not be sent.");
      return;
    }

    setNotice(`OTP sent to ${normalizedEmail}. Enter the newest code from the email.`);
  }

  async function verifyOtpCode() {
    const normalizedEmail = normalizeEmail(email);
    const normalizedOtp = otpCode.trim().replace(/\s+/g, "");
    if (!normalizedEmail || normalizedOtp.length < 6) {
      setNotice("Enter the email address and the OTP from your email.");
      return;
    }

    setLoading(true);
    setNotice("Verifying email OTP...");
    const { data, error } = await supabase.auth.verifyOtp({
      email: normalizedEmail,
      token: normalizedOtp,
      type: "email"
    });

    if (error || !data.session?.access_token) {
      setLoading(false);
      setNotice(`Verification failed: ${error?.message ?? "The OTP is not valid."}`);
      return;
    }

    const result = await postMobileAccess(
      "/api/mobile/verify-otp",
      {},
      { headers: { Authorization: `Bearer ${data.session.access_token}` } }
    );
    const remoteUser = result.user;
    const signedInUser = remoteUser ? toAppUser(remoteUser, "") : null;

    setLoading(false);
    if (!result.ok) {
      setNotice(`Verification failed: ${result.message ?? "Server rejected the email session."}`);
      return;
    }
    if (!signedInUser) {
      setNotice("No approved Telgo access was found for this email.");
      return;
    }

    setPendingUser(signedInUser);
    setEmail(signedInUser.email);
    setLoginId(signedInUser.loginId);
    setOtpCode("");
    setNotice("Email verified. Create or reset your 4-digit PIN.");
    setView("pin");
  }

  async function createPin() {
    if (!pendingUser) {
      setNotice("Verify your email OTP first.");
      setView("otp");
      return;
    }
    if (!/^\d{4}$/.test(pin) || pin !== confirmPin) {
      setNotice("Create and confirm a matching 4-digit PIN.");
      return;
    }

    const {
      data: { session }
    } = await supabase.auth.getSession();
    const accessToken = session?.access_token ?? "";
    if (!accessToken) {
      setNotice("Email verification expired. Request a fresh OTP.");
      setView("otp");
      return;
    }

    setLoading(true);
    setNotice("Saving secure PIN...");
    const pinHash = await hashSecret(pendingUser.loginId, pin);
    const result = await postMobileAccess(
      "/api/mobile/set-pin",
      {
        userId: pendingUser.id,
        pinHash
      },
      { headers: { Authorization: `Bearer ${accessToken}` } }
    );

    if (!result.ok) {
      setLoading(false);
      setNotice(`PIN could not be saved: ${result.message ?? "Server rejected the PIN."}`);
      return;
    }

    const remoteUser = result.user;
    const activatedUser = remoteUser ? toAppUser(remoteUser, pendingUser.loginId) : pendingUser;
    saveSession(activatedUser);
    saveDeviceAccount(activatedUser);
    setSavedAccount(activatedUser);
    await supabase.auth.signOut();
    setUser(activatedUser);
    setPendingUser(null);
    setPin("");
    setConfirmPin("");
    setOtpCode("");
    setLoading(false);
    setNotice("PIN created successfully.");
    setView("dashboard");
  }

  async function signIn() {
    const identifier = (savedAccount?.loginId ?? loginId).trim();
    const normalizedEmail = normalizeEmail(identifier);
    const normalizedLoginId = normalizedEmail ? "" : normalizeLoginId(identifier);
    if ((!normalizedEmail && !normalizedLoginId) || !/^\d{4}$/.test(signinPin)) {
      setNotice(savedAccount ? "Enter your 4-digit PIN." : "Enter your Telgo ID or email and 4-digit PIN.");
      return;
    }
    setLoading(true);
    setNotice("Signing in...");
    const result = await postMobileAccess(
      "/api/mobile/sign-in",
      normalizedEmail
        ? {
            identifier: normalizedEmail,
            pin: signinPin
          }
        : {
            identifier: normalizedLoginId,
            pinHash: await hashSecret(normalizedLoginId, signinPin)
          }
    );

    const remoteUser = result.user;
    const signedInUser = remoteUser
      ? {
          ...toAppUser(remoteUser, normalizedLoginId),
          avatarUrl:
            toAppUser(remoteUser, normalizedLoginId).avatarUrl ??
            savedAccount?.avatarUrl ??
            null
        }
      : null;

    setLoading(false);
    if (!result.ok) {
      setNotice(`Sign in failed: ${result.message ?? "Server rejected the login."}`);
      return;
    }
    if (!signedInUser) {
      setNotice("Telgo ID or PIN is incorrect, inactive, or blocked.");
      return;
    }

    saveSession(signedInUser);
    saveDeviceAccount(signedInUser);
    setSavedAccount(signedInUser);
    setUser(signedInUser);
    setNotice("");
    setSigninPin("");
    setView("dashboard");
  }

  function updateCurrentProfile(nextName: string, nextAvatarUrl: string | null) {
    if (!user) return;

    const trimmedName = nextName.trim() || user.name;
    const updatedUser: AppUser = {
      ...user,
      name: trimmedName,
      avatarUrl: nextAvatarUrl ?? user.avatarUrl ?? null
    };

    setUser(updatedUser);
    setSavedAccount(updatedUser);
    setProfileAvatarUrl(updatedUser.avatarUrl ?? null);
    saveSession(updatedUser);
    saveDeviceAccount(updatedUser);

    setAccessDirectory((current) =>
      current.map((entry) =>
        normalizeEmail(entry.email) === normalizeEmail(updatedUser.email)
          ? { ...entry, name: trimmedName }
          : entry
      )
    );
    setClientAccess((current) =>
      current.map((entry) =>
        normalizeEmail(entry.email) === normalizeEmail(updatedUser.email)
          ? { ...entry, clientName: trimmedName }
          : entry
      )
    );
    setWorkerRoster((current) =>
      current.map((entry) => (entry.name === user.name ? { ...entry, name: trimmedName } : entry))
    );
  }

  async function markAttendanceNow() {
    if (!user) {
      setNotice("Sign in again before marking attendance.");
      return;
    }

    setAttendanceSubmitting(true);
    setNotice("Requesting live location for attendance...");

    try {
      const position = await getLiveDevicePosition();
      const response = await fetch("/api/mobile/attendance", {
        method: "POST",
        credentials: "include",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          latitude: position.lat,
          longitude: position.lng,
          gpsAccuracyM: position.accuracy,
          projectId: primaryProject.id
        })
      }).catch((error: unknown) => ({ error }));

      if ("error" in response) {
        throw response.error;
      }

      const data = (await response.json().catch(() => null)) as
        | {
            ok?: boolean;
            message?: string;
            attendance?: MobileAttendanceRecord;
            location?: LiveMapTrackedPoint;
          }
        | null;

      if (!response.ok || !data?.ok || !data.attendance) {
        throw new Error(data?.message ?? "Attendance could not be saved.");
      }

      setTrackingSnapshot((current) => {
        const baseProject = current?.project ?? primaryProject;
        const nextAttendance = [
          data.attendance!,
          ...(current?.attendance ?? []).filter((item) => item.id !== data.attendance!.id)
        ].slice(0, 20);
        const nextLocations = data.location
          ? [
              data.location,
              ...(current?.locations ?? []).filter(
                (item) => item.mobileUserId !== data.location!.mobileUserId
              )
            ].slice(0, 24)
          : current?.locations ?? [];

        return {
          project: baseProject,
          attendance: nextAttendance,
          locations: nextLocations,
          canViewAll:
            current?.canViewAll ?? (currentRole === "admin" || currentRole === "supervisor")
        };
      });

      setTrackingError("");
      setNotice(
        data.attendance.withinGeofence
          ? `Attendance marked at ${data.attendance.distanceFromSiteM} m from the corridor start. Admin live map is updated.`
          : `Attendance saved ${data.attendance.distanceFromSiteM} m from the corridor start. The mark is outside the geofence.`
      );
    } catch (error) {
      setNotice(`Attendance could not be marked: ${getErrorMessage(error)}`);
    } finally {
      setAttendanceSubmitting(false);
    }
  }

  function openModule(item: ModuleItem) {
    if (item.title === "Live Chat") {
      setActiveModule(null);
      setChatError("");
      setView("chat");
      window.scrollTo({ top: 0, behavior: "smooth" });
      return;
    }
    setActiveModule(item);
    setView("module");
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function openModuleByTitle(title: string) {
    const target = getModuleByTitle(title);
    if (!target) return;
    openModule(target);
  }

  function signOut() {
    void fetch("/api/mobile/sign-out", {
      method: "POST",
      credentials: "include"
    });
    localStorage.removeItem(SESSION_KEY);
    void supabase.auth.signOut();
    clearChatDrafts(chatDraftImages);
    setNotice("");
    setUser(null);
    setPendingUser(null);
    setActiveModule(null);
    setChatMessages([]);
    setChatMembers([]);
    setChatComposer("");
    setChatDraftImages([]);
    setChatError("");
    setNotifications([]);
    setNotificationsOpen(false);
    setTrackingSnapshot(null);
    setTrackingError("");
    setSigninPin("");
    setLoginId(savedAccount?.loginId ?? "");
    setView("signin");
  }

  function forgetSavedAccount() {
    void fetch("/api/mobile/sign-out", {
      method: "POST",
      credentials: "include"
    });
    localStorage.removeItem(DEVICE_ACCOUNT_KEY);
    localStorage.removeItem(SESSION_KEY);
    void supabase.auth.signOut();
    clearChatDrafts(chatDraftImages);
    setSavedAccount(null);
    setUser(null);
    setPendingUser(null);
    setActiveModule(null);
    setChatMessages([]);
    setChatMembers([]);
    setChatComposer("");
    setChatDraftImages([]);
    setChatError("");
    setNotifications([]);
    setNotificationsOpen(false);
    setTrackingSnapshot(null);
    setTrackingError("");
    setLoginId("");
    setSigninPin("");
    setNotice("");
    setView("signin");
  }

  async function sendEmailOtp(targetEmail: string) {
    await supabase.auth.signOut();
    const { error } = await supabase.auth.signInWithOtp({
      email: targetEmail,
      options: {
        shouldCreateUser: false
      }
    });

    return {
      ok: !error,
      message: error ? getErrorMessage(error) : ""
    };
  }

  async function chooseChatImages(fileList: FileList | null) {
    if (!fileList?.length) return;

    const files = Array.from(fileList).slice(0, 4 - chatDraftImages.length);
    const nextDrafts = await Promise.all(
      files.map(async (file) => {
        const compressed = await compressChatImage(file);
        return {
          id: crypto.randomUUID(),
          file: compressed,
          previewUrl: URL.createObjectURL(compressed),
          sizeLabel: formatBytes(compressed.size)
        } satisfies ChatDraftImage;
      })
    );

    setChatDraftImages((current) => [...current, ...nextDrafts]);
  }

  function removeChatDraft(id: string) {
    setChatDraftImages((current) => {
      const target = current.find((item) => item.id === id);
      if (target) URL.revokeObjectURL(target.previewUrl);
      return current.filter((item) => item.id !== id);
    });
  }

  function insertMention(member: ChatMember) {
    setChatComposer((current) => {
      if (/(?:^|\s)@([A-Za-z0-9._-]*)$/.test(current)) {
        return current.replace(/(?:^|\s)@([A-Za-z0-9._-]*)$/, (match) => {
          const prefix = match.startsWith(" ") ? " " : "";
          return `${prefix}@${member.loginId} `;
        });
      }

      const spacer = current.trim().length ? " " : "";
      return `${current}${spacer}@${member.loginId} `;
    });
  }

  async function deleteChatMessage(messageId: string) {
    const target = chatMessages.find((item) => item.id === messageId);
    if (!target || target.isDeleted) return;

    const messageOwner = target.sender.name || "this user";
    const confirmationLabel =
      user?.role === "admin" && target.sender.userId !== user.id
        ? `Delete ${messageOwner}'s message for everyone?`
        : "Delete this message for everyone?";

    if (!window.confirm(confirmationLabel)) return;

    const response = await fetch(`/api/mobile/chat/${messageId}`, {
      method: "DELETE",
      credentials: "include"
    }).catch((error: unknown) => ({ error }));

    if ("error" in response) {
      setChatError(getErrorMessage(response.error));
      return;
    }

    const data = (await response.json().catch(() => null)) as
      | { ok?: boolean; message?: string; chatMessage?: ChatMessage }
      | null;

    if (!response.ok || !data?.ok || !data.chatMessage) {
      setChatError(data?.message ?? "Message could not be deleted.");
      return;
    }

    setChatMessages((current) =>
      current.map((item) => (item.id === messageId ? data.chatMessage ?? item : item))
    );
  }

  async function sendChatMessage() {
    if (!chatComposer.trim() && chatDraftImages.length === 0) {
      setChatError("Type a message or attach at least one photo.");
      return;
    }

    setChatLoading(true);
    setChatError("");
    const formData = new FormData();
    formData.append("body", chatComposer);
    chatDraftImages.forEach((image) => {
      formData.append("images", image.file, image.file.name);
    });

    const response = await fetch("/api/mobile/chat", {
      method: "POST",
      credentials: "include",
      body: formData
    }).catch((error: unknown) => ({ error }));

    if ("error" in response) {
      setChatLoading(false);
      setChatError(getErrorMessage(response.error));
      return;
    }

    const data = (await response.json().catch(() => null)) as
      | { ok?: boolean; message?: string; chatMessage?: ChatMessage }
      | null;

    if (!response.ok || !data?.ok || !data.chatMessage) {
      setChatLoading(false);
      setChatError(data?.message ?? "Message could not be sent.");
      return;
    }

    const createdMessage = data.chatMessage;
    clearChatDrafts(chatDraftImages);
    setChatDraftImages([]);
    setChatComposer("");
    setChatMessages((current) => [...current, createdMessage]);
    setChatLoading(false);
  }

  if (view === "dashboard") {
    return (
      <AppFrame
        user={user}
        active="Home"
        onSignOut={signOut}
        onHome={() => setView("dashboard")}
        onChat={() => setView("chat")}
        onModule={() => openModuleByTitle("Projects")}
        onProfile={() => setView("profile")}
        notifications={notifications}
        notificationsLoading={notificationsLoading}
        notificationsOpen={notificationsOpen}
        unreadNotifications={unreadNotifications}
        onToggleNotifications={() => {
          void toggleNotifications();
        }}
        onMarkAllNotificationsRead={() => {
          void markAllNotificationsRead();
        }}
        onOpenNotification={(notification) => {
          setNotificationsOpen(false);
          if (notification.type === "chat" || Boolean(notification.metadata.chatTitle)) {
            setChatError("");
            setView("chat");
          }
        }}
      >
        <DashboardView
          role={currentRole}
          clock={clock}
          user={user}
          project={primaryProject}
          projectPortfolio={projectPortfolio}
          latestLocation={trackingSnapshot?.locations[0] ?? null}
          trackingSnapshot={trackingSnapshot}
          trackingLoading={trackingLoading}
          accessDirectory={accessDirectory}
          pendingApprovals={pendingApprovals}
          yesterdayReports={yesterdayReports}
          currentTasks={currentTasks}
          currentLeaveRequests={currentLeaveRequests}
          clientAccess={clientAccess}
          modules={filteredModules}
          search={search}
          notifications={notifications}
          unreadNotifications={unreadNotifications}
          onSearch={setSearch}
          onModule={openModule}
          onModuleByTitle={openModuleByTitle}
          onOpenChat={() => setView("chat")}
          onOpenProfile={() => setView("profile")}
        />
      </AppFrame>
    );
  }

  if (view === "module" && activeModule) {
    const dashboardRole = getDashboardRoleByModuleTitle(activeModule.title);
    return (
      <AppFrame
        user={user}
        active={activeModule.title}
        onSignOut={signOut}
        onHome={() => setView("dashboard")}
        onBack={() => setView("dashboard")}
        onChat={() => setView("chat")}
        onModule={() => openModuleByTitle("Projects")}
        onProfile={() => setView("profile")}
        notifications={notifications}
        notificationsLoading={notificationsLoading}
        notificationsOpen={notificationsOpen}
        unreadNotifications={unreadNotifications}
        onToggleNotifications={() => {
          void toggleNotifications();
        }}
        onMarkAllNotificationsRead={() => {
          void markAllNotificationsRead();
        }}
        onOpenNotification={(notification) => {
          setNotificationsOpen(false);
          if (notification.type === "chat" || Boolean(notification.metadata.chatTitle)) {
            setChatError("");
            setView("chat");
          }
        }}
      >
        {dashboardRole ? (
          <RoleWorkspaceView
            role={dashboardRole}
            onBack={() => setView("dashboard")}
            onOpenModule={openModuleByTitle}
          />
        ) : (
          <ModuleView
            module={activeModule}
            currentUser={user}
            primaryProject={primaryProject}
            projectPortfolio={projectPortfolio}
            onProjectPortfolioChange={setProjectPortfolio}
            accessDirectory={accessDirectory}
            onAccessDirectoryChange={setAccessDirectory}
            pendingApprovals={pendingApprovals}
            onPendingApprovalsChange={setPendingApprovals}
            yesterdayReports={yesterdayReports}
            clientAccess={clientAccess}
            onClientAccessChange={setClientAccess}
            engineerTasks={engineerTasks}
            onEngineerTasksChange={setEngineerTasks}
            leaveRequests={leaveRequests}
            onLeaveRequestsChange={setLeaveRequests}
            workerRoster={workerRoster}
            onWorkerRosterChange={setWorkerRoster}
            pwdDocuments={pwdDocuments}
            onPwdDocumentsChange={setPwdDocuments}
            projectEditor={projectEditor}
            onProjectEditorChange={setProjectEditor}
            trackingSnapshot={trackingSnapshot}
            trackingLoading={trackingLoading}
            trackingError={trackingError}
            attendanceSubmitting={attendanceSubmitting}
            onMarkAttendance={() => {
              void markAttendanceNow();
            }}
            onOpenProfile={() => setView("profile")}
            onOpenChat={() => setView("chat")}
            onOpenModuleByTitle={openModuleByTitle}
            onBack={() => setView("dashboard")}
          />
        )}
      </AppFrame>
    );
  }

  if (view === "chat") {
    return (
      <AppFrame
        user={user}
        active="Chat"
        onSignOut={signOut}
        onHome={() => setView("dashboard")}
        onBack={() => setView("dashboard")}
        onChat={() => setView("chat")}
        onModule={() => openModuleByTitle("Projects")}
        onProfile={() => setView("profile")}
        notifications={notifications}
        notificationsLoading={notificationsLoading}
        notificationsOpen={notificationsOpen}
        unreadNotifications={unreadNotifications}
        onToggleNotifications={() => {
          void toggleNotifications();
        }}
        onMarkAllNotificationsRead={() => {
          void markAllNotificationsRead();
        }}
        onOpenNotification={(notification) => {
          setNotificationsOpen(false);
          if (notification.type === "chat" || Boolean(notification.metadata.chatTitle)) {
            setChatError("");
            setView("chat");
          }
        }}
      >
        <ChatView
          currentUser={user}
          messages={chatMessages}
          members={chatMembers}
          mentionMatches={mentionMatches}
          composer={chatComposer}
          draftImages={chatDraftImages}
          loading={chatLoading}
          error={chatError}
          chatEndRef={chatEndRef}
          onComposer={setChatComposer}
          onInsertMention={insertMention}
          onPickImages={chooseChatImages}
          onRemoveDraft={removeChatDraft}
          onDeleteMessage={deleteChatMessage}
          onSend={sendChatMessage}
        />
      </AppFrame>
    );
  }

  if (view === "profile") {
    return (
      <AppFrame
        user={user}
        active="Profile"
        onSignOut={signOut}
        onHome={() => setView("dashboard")}
        onBack={() => setView("dashboard")}
        onChat={() => setView("chat")}
        onModule={() => openModuleByTitle("Projects")}
        onProfile={() => setView("profile")}
        notifications={notifications}
        notificationsLoading={notificationsLoading}
        notificationsOpen={notificationsOpen}
        unreadNotifications={unreadNotifications}
        onToggleNotifications={() => {
          void toggleNotifications();
        }}
        onMarkAllNotificationsRead={() => {
          void markAllNotificationsRead();
        }}
        onOpenNotification={(notification) => {
          setNotificationsOpen(false);
          if (notification.type === "chat" || Boolean(notification.metadata.chatTitle)) {
            setChatError("");
            setView("chat");
          }
        }}
      >
        <ProfileView
          currentUser={user}
          currentAccessEntry={currentAccessEntry}
          currentClientEntry={currentClientEntry}
          projectPortfolio={projectPortfolio}
          avatarUrl={profileAvatarUrl ?? user?.avatarUrl ?? null}
          onAvatarUrlChange={setProfileAvatarUrl}
          onSaveProfile={updateCurrentProfile}
          onBack={() => setView("dashboard")}
        />
      </AppFrame>
    );
  }

  return (
    <main className="min-h-dvh bg-[#f8fbff] px-4 py-5 text-[#07122f] sm:px-6">
      <div className="mx-auto flex min-h-[calc(100dvh-2.5rem)] max-w-[1100px] flex-col items-center justify-center gap-8 lg:grid lg:grid-cols-[1fr_430px]">
        <AuthIntro />
        <section className="w-full max-w-[430px] rounded-[28px] border border-slate-200 bg-white px-5 pb-7 pt-4 shadow-[0_24px_80px_rgba(15,35,80,0.14)] sm:px-7">
          <StatusBar dark />
          {view === "request" ? (
            <AccessRequestStep
              fullName={fullName}
              email={email}
              role={requestedRole}
              roles={accessRoles}
              onFullName={setFullName}
              onEmail={setEmail}
              onRole={setRequestedRole}
              loading={loading}
              notice={notice}
              onRequest={requestEmailAccess}
              onSignin={() => {
                setNotice("");
                setView("signin");
              }}
            />
          ) : null}
          {view === "otp" ? (
            <OtpStep
              email={email}
              loginId={loginId}
              otpCode={otpCode}
              loading={loading}
              notice={notice}
              onEmail={setEmail}
              onOtpCode={setOtpCode}
              onSendOtp={sendOtpAgain}
              onVerifyOtp={verifyOtpCode}
              onBack={() => setView(otpReturnView)}
            />
          ) : null}
          {view === "pin" ? (
            <PinStep
              loginId={pendingUser?.loginId ?? loginId}
              pin={pin}
              confirmPin={confirmPin}
              loading={loading}
              notice={notice}
              onPin={setPin}
              onConfirmPin={setConfirmPin}
              onCreate={createPin}
              onBack={() => setView("otp")}
            />
          ) : null}
          {view === "signin" ? (
            <SigninStep
              savedAccount={savedAccount}
              loginId={loginId}
              pin={signinPin}
              loading={loading}
              notice={notice}
              onLoginId={setLoginId}
              onPin={setSigninPin}
              onSignin={signIn}
              onForgetSavedAccount={forgetSavedAccount}
              onRequest={() => {
                setNotice("");
                setView("request");
              }}
              onOtp={() => {
                const resetEmail = savedAccount?.email ?? normalizeEmail(loginId);
                if (resetEmail) setEmail(resetEmail);
                setOtpReturnView("signin");
                setNotice("");
                setView("otp");
              }}
            />
          ) : null}
        </section>
        <AndroidDownloadCard />
      </div>
    </main>
  );
}

function AuthIntro() {
  return (
    <section className="hidden max-w-[520px] lg:block">
      <p className="text-sm font-semibold uppercase tracking-[0.18em] text-[#115cff]">
        Telgo Power Projects
      </p>
      <h1 className="mt-4 text-5xl font-bold leading-[1.05] tracking-normal text-[#07122f]">
        Mobile-first operations for every project team.
      </h1>
      <p className="mt-5 max-w-[460px] text-lg leading-8 text-slate-600">
        Company access is approved by email first, then a one-time email verification unlocks PIN setup.
      </p>
      <div className="mt-8 grid grid-cols-3 gap-3">
        {["Email OTP", "Role approval", "PIN login"].map((item) => (
          <div key={item} className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
            <Check className="mb-3 h-5 w-5 text-[#14b866]" />
            <p className="text-sm font-semibold text-slate-800">{item}</p>
          </div>
        ))}
      </div>
    </section>
  );
}

function AccessRequestStep({
  fullName,
  email,
  role,
  roles,
  onFullName,
  onEmail,
  onRole,
  loading,
  notice,
  onRequest,
  onSignin
}: {
  fullName: string;
  email: string;
  role: AccessRole;
  roles: { value: AccessRole; label: string; description: string }[];
  onFullName: (value: string) => void;
  onEmail: (value: string) => void;
  onRole: (value: AccessRole) => void;
  loading: boolean;
  notice: string;
  onRequest: () => void;
  onSignin: () => void;
}) {
  return (
    <div className="pt-7">
      <BrandMark />
      <div className="mt-9 text-center">
        <h1 className="text-2xl font-bold tracking-normal">Request Company Access</h1>
        <p className="mt-2 text-sm text-slate-500">Approved users receive an email OTP</p>
      </div>

      <div className="mt-8 space-y-4">
        <label className="block">
          <span className="mb-2 block text-sm font-semibold text-slate-700">Full Name</span>
          <input
            value={fullName}
            onChange={(event) => onFullName(event.target.value)}
            placeholder="Enter your full name"
            className="min-h-14 w-full rounded-xl border border-slate-200 px-4 text-sm outline-none placeholder:text-slate-400 focus:border-[#115cff] focus:ring-4 focus:ring-blue-50"
          />
        </label>
        <label className="block">
          <span className="mb-2 block text-sm font-semibold text-slate-700">Email Address</span>
          <input
            value={email}
            onChange={(event) => onEmail(event.target.value)}
            type="email"
            placeholder="name@company.com"
            className="min-h-14 w-full rounded-xl border border-slate-200 px-4 text-sm outline-none placeholder:text-slate-400 focus:border-[#115cff] focus:ring-4 focus:ring-blue-50"
          />
        </label>
        <div>
          <span className="mb-2 block text-sm font-semibold text-slate-700">Access Role</span>
          <div className="grid grid-cols-2 gap-2">
            {roles.map((item) => (
              <button
                key={item.value}
                type="button"
                onClick={() => onRole(item.value)}
                className={cn(
                  "min-h-[76px] rounded-xl border px-3 py-2 text-left transition",
                  role === item.value
                    ? "border-[#115cff] bg-blue-50 text-[#07122f] ring-4 ring-blue-50"
                    : "border-slate-200 bg-white text-slate-600"
                )}
              >
                <span className="block text-sm font-bold">{item.label}</span>
                <span className="mt-1 block text-xs leading-4 text-slate-500">{item.description}</span>
              </button>
            ))}
          </div>
        </div>
      </div>

      <PrimaryButton disabled={loading} onClick={onRequest} className="mt-6">
        {loading ? "Preparing Access..." : "Approve & Send OTP"}
      </PrimaryButton>
      <p className="mt-5 text-center text-xs leading-5 text-slate-500">
        A Telgo ID is created automatically, then the verified email owner sets the 4-digit PIN.
      </p>
      {notice ? <Notice>{notice}</Notice> : null}
      <p className="mt-6 text-center text-sm text-slate-500">
        <button type="button" onClick={onSignin} className="font-semibold text-[#115cff]">
          Already have a Telgo ID? Sign in
        </button>
      </p>
    </div>
  );
}

function OtpStep({
  email,
  loginId,
  otpCode,
  loading,
  notice,
  onEmail,
  onOtpCode,
  onSendOtp,
  onVerifyOtp,
  onBack
}: {
  email: string;
  loginId: string;
  otpCode: string;
  loading: boolean;
  notice: string;
  onEmail: (value: string) => void;
  onOtpCode: (value: string) => void;
  onSendOtp: () => void;
  onVerifyOtp: () => void;
  onBack: () => void;
}) {
  return (
    <div className="pt-5">
      <button type="button" onClick={onBack} className="grid h-10 w-10 place-items-center rounded-full text-slate-600">
        <ChevronLeft className="h-5 w-5" />
      </button>
      <div className="mt-10 text-center">
        <h1 className="text-2xl font-bold tracking-normal">Verify Email Access</h1>
        <p className="mt-3 text-sm leading-6 text-slate-500">
          Request a one-time code from email, then verify it here to unlock PIN setup.
        </p>
      </div>
      <div className="mt-8 space-y-4">
        <label className="block">
          <span className="mb-2 block text-sm font-semibold text-slate-700">Email Address</span>
          <input
            value={email}
            onChange={(event) => onEmail(event.target.value)}
            type="email"
            placeholder="name@company.com"
            className="min-h-14 w-full rounded-xl border border-slate-200 px-4 text-sm outline-none placeholder:text-slate-400 focus:border-[#115cff] focus:ring-4 focus:ring-blue-50"
          />
        </label>
        {loginId ? (
          <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-center">
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">Telgo ID</p>
            <p className="mt-1 text-base font-bold tracking-[0.08em] text-[#07122f]">{loginId}</p>
          </div>
        ) : null}
        <label className="block">
          <span className="mb-2 block text-sm font-semibold text-slate-700">Email OTP</span>
          <input
            value={otpCode}
            onChange={(event) => onOtpCode(event.target.value.replace(/\s+/g, "").slice(0, 32))}
            inputMode="text"
            autoCapitalize="off"
            autoCorrect="off"
            spellCheck={false}
            placeholder="Code from email"
            className="min-h-14 w-full rounded-xl border border-slate-200 px-4 text-center text-lg font-bold tracking-[0.24em] outline-none placeholder:tracking-normal placeholder:text-slate-400 focus:border-[#115cff] focus:ring-4 focus:ring-blue-50"
          />
        </label>
      </div>
      <div className="mt-7 grid gap-3">
        <PrimaryButton disabled={loading} onClick={onVerifyOtp}>
          {loading ? "Verifying..." : "Verify & Create PIN"}
        </PrimaryButton>
        <button
          type="button"
          disabled={loading}
          onClick={onSendOtp}
          className="min-h-12 rounded-xl border border-slate-200 px-4 text-sm font-semibold text-slate-700 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {loading ? "Please wait..." : "Send New OTP"}
        </button>
      </div>
      <p className="mt-4 text-center text-xs leading-5 text-slate-500">
        Use the newest code from the latest email. Requesting a new OTP invalidates the previous one.
      </p>
      {notice ? <Notice>{notice}</Notice> : null}
    </div>
  );
}

function PinStep({
  loginId,
  pin,
  confirmPin,
  loading,
  notice,
  onPin,
  onConfirmPin,
  onCreate,
  onBack
}: {
  loginId: string;
  pin: string;
  confirmPin: string;
  loading: boolean;
  notice: string;
  onPin: (value: string) => void;
  onConfirmPin: (value: string) => void;
  onCreate: () => void;
  onBack: () => void;
}) {
  return (
    <div className="pt-5">
      <button type="button" onClick={onBack} className="grid h-10 w-10 place-items-center rounded-full text-slate-600">
        <ChevronLeft className="h-5 w-5" />
      </button>
      <div className="mt-8 text-center">
        <h1 className="text-2xl font-bold tracking-normal">Create PIN</h1>
        <p className="mt-3 text-sm text-slate-500">Set one 4-digit PIN for {loginId || "this Telgo ID"}</p>
      </div>
      <div className="mt-8 space-y-4">
        <PinInput label="4-digit PIN" value={pin} onChange={onPin} />
        <PinInput label="Confirm PIN" value={confirmPin} onChange={onConfirmPin} />
      </div>
      <PrimaryButton disabled={loading} onClick={onCreate} className="mt-7">
        {loading ? "Saving..." : "Save PIN & Open Dashboard"}
      </PrimaryButton>
      {notice ? <Notice>{notice}</Notice> : null}
    </div>
  );
}

function SigninStep({
  savedAccount,
  loginId,
  pin,
  loading,
  notice,
  onLoginId,
  onPin,
  onSignin,
  onForgetSavedAccount,
  onRequest,
  onOtp
}: {
  savedAccount: AppUser | null;
  loginId: string;
  pin: string;
  loading: boolean;
  notice: string;
  onLoginId: (value: string) => void;
  onPin: (value: string) => void;
  onSignin: () => void;
  onForgetSavedAccount: () => void;
  onRequest: () => void;
  onOtp: () => void;
}) {
  return (
    <div className="pt-7">
      <BrandMark />
      <div className="mt-9 text-center">
        <h1 className="text-2xl font-bold tracking-normal">Welcome Back</h1>
        <p className="mt-2 text-sm text-slate-500">
          {savedAccount
            ? `Enter the 4-digit PIN for ${savedAccount.name} on this device`
            : "Sign in with your Telgo ID or approved email address and PIN"}
        </p>
      </div>
      {savedAccount ? (
        <div className="mt-8 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-4 text-center">
          <p className="text-sm font-semibold text-[#07122f]">{savedAccount.name}</p>
          <p className="mt-1 text-xs text-slate-500">{savedAccount.email}</p>
        </div>
      ) : (
        <label className="mt-8 block">
          <span className="mb-2 block text-sm font-semibold text-slate-700">Telgo ID or Email</span>
          <input
            value={loginId}
            onChange={(event) => {
              const value = event.target.value.trim();
              onLoginId(value.includes("@") ? value.toLowerCase() : value.toUpperCase());
            }}
            placeholder="TLG-12345678 or name@company.com"
            className="min-h-14 w-full rounded-xl border border-slate-200 px-4 text-center text-base font-bold tracking-[0.08em] outline-none placeholder:font-medium placeholder:tracking-normal placeholder:text-slate-400 focus:border-[#115cff] focus:ring-4 focus:ring-blue-50"
          />
        </label>
      )}
      <div className="mt-4">
        <PinInput label="4-digit PIN" value={pin} onChange={onPin} />
      </div>
      <button type="button" onClick={onOtp} className="mt-4 text-sm font-semibold text-[#115cff]">
        Forgot PIN?
      </button>
      <PrimaryButton disabled={loading} onClick={onSignin} className="mt-6">
        {loading ? "Signing In..." : "Sign In"}
      </PrimaryButton>
      {notice ? <Notice>{notice}</Notice> : null}
      <div className="mt-6 grid gap-2 text-center text-sm text-slate-500">
        {savedAccount ? (
          <button type="button" onClick={onForgetSavedAccount} className="font-semibold text-[#115cff]">
            Use another account
          </button>
        ) : null}
        <button type="button" onClick={onOtp} className="font-semibold text-[#115cff]">
          Use email OTP / reset PIN
        </button>
        <button type="button" onClick={onRequest} className="font-semibold text-[#115cff]">
          Request company access
        </button>
      </div>
    </div>
  );
}

function AndroidDownloadCard() {
  return (
    <section
      id="download-android"
      className="w-full max-w-[430px] rounded-[24px] border border-blue-100 bg-white px-5 py-5 shadow-[0_16px_54px_rgba(15,35,80,0.10)] sm:px-6 lg:col-start-2"
    >
      <div className="flex items-start gap-3">
        <span className="grid h-12 w-12 shrink-0 place-items-center rounded-2xl bg-blue-50 text-[#115cff]">
          <Smartphone className="h-6 w-6" />
        </span>
        <div>
          <h2 className="text-base font-bold text-[#07122f]">Install Telgo Hub on Android</h2>
          <p className="mt-1 text-sm leading-6 text-slate-500">
            Download the company APK, install it on the approved Android device, then sign in with
            your Telgo ID or approved email address and PIN.
          </p>
        </div>
      </div>
      <a
        href={APK_DOWNLOAD_PATH}
        download
        className="mt-4 flex min-h-12 w-full items-center justify-center gap-2 rounded-xl bg-[#07122f] px-4 text-sm font-bold text-white"
        aria-label="Download Android App"
      >
        <Download className="h-5 w-5" />
        Download Android App
      </a>
      <p className="mt-3 flex items-center gap-2 text-xs font-semibold text-slate-500">
        <LockKeyholeIcon />
        Company asset. Login remains blocked until access is approved.
      </p>
    </section>
  );
}

function LockKeyholeIcon() {
  return <ShieldCheck className="h-4 w-4 shrink-0 text-[#14b866]" />;
}

function DashboardView({
  role,
  clock,
  user,
  project,
  projectPortfolio,
  latestLocation,
  trackingSnapshot,
  trackingLoading,
  accessDirectory,
  pendingApprovals,
  yesterdayReports,
  currentTasks,
  currentLeaveRequests,
  clientAccess,
  modules: visibleModules,
  search,
  notifications,
  unreadNotifications,
  onSearch,
  onModule,
  onModuleByTitle,
  onOpenChat,
  onOpenProfile
}: {
  role: AccessRole;
  clock: Date | null;
  user: AppUser | null;
  project: Project;
  projectPortfolio: Project[];
  latestLocation: LiveMapTrackedPoint | null;
  trackingSnapshot: MobileTrackingSnapshot | null;
  trackingLoading: boolean;
  accessDirectory: AccessDirectoryEntry[];
  pendingApprovals: PendingApprovalRequest[];
  yesterdayReports: YesterdayReportItem[];
  currentTasks: EngineerTaskItem[];
  currentLeaveRequests: LeaveRequestItem[];
  clientAccess: ClientAccessEntry[];
  modules: ModuleItem[];
  search: string;
  notifications: MobileNotificationItem[];
  unreadNotifications: number;
  onSearch: (value: string) => void;
  onModule: (item: ModuleItem) => void;
  onModuleByTitle: (title: string) => void;
  onOpenChat: () => void;
  onOpenProfile: () => void;
}) {
  const userName = user?.name ?? "Team";
  const roleLabel = formatRoleLabel(role);
  const roleConfig = roleDashboardContent[role];
  const primaryProject = project;
  const dateLabel =
    clock?.toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" }) ??
    "23 May 2025";
  const timeLabel =
    clock?.toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" }) ?? "09:41 AM";
  const dashboardNotifications =
    notifications.length > 0
      ? notifications
      : [
          {
            id: "seed-live-report-reminder",
            title:
              role === "admin"
                ? "Today's live report follow-up is pending"
                : "Submit today's live field report",
            body:
              role === "admin"
                ? `${primaryProject.name} still needs the next live progress update after the first ${formatMeters(getProgressMeters(primaryProject))} completion mark.`
                : `Record the next corridor update for ${primaryProject.name} before the end of shift.`,
            type: "system",
            isRead: false,
            createdAt: clock?.toISOString() ?? "2026-05-15T13:30:00.000Z",
            metadata: { seeded: true, moduleTitle: "Upload Report" }
          } satisfies MobileNotificationItem
        ];
  const dashboardUnread = notifications.length > 0 ? unreadNotifications : 1;
  const summaryCards = [
    {
      label: "Access Status",
      value: "Approved",
      detail: "This device is ready for secure sign-in.",
      icon: ShieldCheck,
      tone: "green" as const
    },
    {
      label: "Current Role",
      value: roleLabel,
      detail: "Role is assigned from the approved access request.",
      icon: UserCheck,
      tone: "blue" as const
    },
    {
      label: "Login Method",
      value: "PIN Ready",
      detail: "Use the 4-digit PIN on this device or reset it by email.",
      icon: Smartphone,
      tone: "purple" as const
    },
    {
      label: "Approved Email",
      value: user?.email ?? "Not available",
      detail: "This email receives OTP codes for PIN reset and device recovery.",
      icon: MessageCircle,
      tone: "orange" as const
    }
  ];

  return (
    <>
      <section className="grid gap-5 border-t border-slate-100 px-4 pb-4 pt-8 sm:px-6 md:grid-cols-[1fr_auto] md:items-start">
        <div>
          <h1 className="text-3xl font-bold tracking-normal text-[#07122f] sm:text-4xl">
            Good Morning, {userName}
          </h1>
          <p className="mt-3 text-base text-slate-500">
            Signed in as {userName}. {roleConfig.intro}
          </p>
        </div>
        <div className="grid min-w-[210px] gap-3 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
          <div className="flex items-center gap-3 text-base font-semibold text-[#07122f]">
            <CalendarDays className="h-5 w-5 text-slate-600" />
            {dateLabel}
          </div>
          <div className="flex items-center gap-3 text-base font-semibold text-[#07122f]">
            <Clock3 className="h-5 w-5 text-slate-600" />
            {timeLabel}
          </div>
        </div>
      </section>

      <section className="grid grid-cols-2 gap-3 px-4 sm:px-6 lg:grid-cols-4">
        {summaryCards.map((item) => (
          <SummaryCard key={item.label} {...item} />
        ))}
      </section>

      <RoleHomeSection
        role={role}
        user={user}
        primaryProject={primaryProject}
        projectPortfolio={projectPortfolio}
        latestLocation={latestLocation}
        trackingSnapshot={trackingSnapshot}
        trackingLoading={trackingLoading}
        accessDirectory={accessDirectory}
        pendingApprovals={pendingApprovals}
        yesterdayReports={yesterdayReports}
        currentTasks={currentTasks}
        currentLeaveRequests={currentLeaveRequests}
        clientAccess={clientAccess}
        onOpenModule={onModuleByTitle}
        onOpenProfile={onOpenProfile}
        onOpenChat={onOpenChat}
      />

      <section className="px-4 pt-5 sm:px-6">
        <div className="rounded-[24px] border border-slate-200 bg-white p-5 shadow-sm">
          <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[#115cff]">
                Dashboard notifications
              </p>
              <h2 className="mt-2 text-2xl font-bold tracking-normal text-[#07122f]">
                {dashboardUnread > 0
                  ? `${dashboardUnread} unread update${dashboardUnread === 1 ? "" : "s"}`
                  : "No unread notifications"}
              </h2>
              <p className="mt-2 text-sm leading-6 text-slate-500">
                Chat mentions, admin actions, leave outcomes, and live workflow alerts will appear here for this approved device account.
              </p>
            </div>
            <button
              type="button"
              onClick={onOpenChat}
              className="inline-flex min-h-11 items-center justify-center rounded-full border border-blue-100 bg-blue-50 px-4 text-sm font-semibold text-[#115cff]"
            >
              Open team chat
            </button>
          </div>

          <div className="mt-5 space-y-3">
            {dashboardNotifications.slice(0, 4).map((notification) => (
              <article
                key={notification.id}
                className={cn(
                  "rounded-2xl border px-4 py-4",
                  notification.isRead ? "border-slate-200 bg-slate-50" : "border-blue-100 bg-blue-50"
                )}
              >
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-sm font-bold text-[#07122f]">{notification.title}</p>
                    {notification.body ? (
                      <p className="mt-2 text-sm leading-6 text-slate-500">{notification.body}</p>
                    ) : null}
                  </div>
                  <span className="shrink-0 text-xs font-semibold text-slate-400">
                    {formatNotificationTime(notification.createdAt)}
                  </span>
                </div>
              </article>
            ))}

            {notifications.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50 px-4 py-5">
                <p className="text-sm font-semibold text-[#07122f]">Live workflow reminders are seeded for now.</p>
                <p className="mt-2 text-sm leading-6 text-slate-500">
                  Current chat mentions already work. Attendance, report, approval, and leave notifications will replace this reminder automatically as those flows become live.
                </p>
              </div>
            ) : null}
          </div>
        </div>
      </section>

      <RoleOverviewPanel role={role} onOpenModule={onModuleByTitle} />

      <section className="px-4 pt-8 sm:px-6">
        <div className="mb-5 grid gap-4 sm:grid-cols-[1fr_340px] sm:items-center">
          <h2 className="text-2xl font-bold tracking-normal text-[#07122f]">Workspace Modules</h2>
          <label className="relative block">
            <Search className="pointer-events-none absolute right-4 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-400" />
            <input
              value={search}
              onChange={(event) => onSearch(event.target.value)}
              placeholder="Search modules..."
              className="min-h-12 w-full rounded-full border border-transparent bg-slate-100 px-5 pr-12 text-sm outline-none placeholder:text-slate-500 focus:border-[#115cff] focus:bg-white focus:ring-4 focus:ring-blue-50"
            />
          </label>
        </div>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 xl:grid-cols-5">
          {visibleModules.map((item) => (
            <ModuleCard key={item.title} item={item} onClick={() => onModule(item)} />
          ))}
        </div>
      </section>

      <section className="mx-4 mt-5 rounded-[20px] bg-white px-3 pb-5 sm:mx-6 sm:px-4">
        <SectionTitle title={`${roleLabel} Workspace Status`} />
        <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50 px-4 py-5">
          <p className="text-sm font-semibold text-[#07122f]">{roleConfig.statusTitle}</p>
          <p className="mt-2 text-sm leading-6 text-slate-500">
            {roleConfig.statusBody}
          </p>
        </div>
      </section>
    </>
  );
}

function RoleHomeSection({
  role,
  user,
  primaryProject,
  projectPortfolio,
  latestLocation,
  trackingSnapshot,
  trackingLoading,
  accessDirectory,
  pendingApprovals,
  yesterdayReports,
  currentTasks,
  currentLeaveRequests,
  clientAccess,
  onOpenModule,
  onOpenProfile,
  onOpenChat
}: {
  role: AccessRole;
  user: AppUser | null;
  primaryProject: Project;
  projectPortfolio: Project[];
  latestLocation: LiveMapTrackedPoint | null;
  trackingSnapshot: MobileTrackingSnapshot | null;
  trackingLoading: boolean;
  accessDirectory: AccessDirectoryEntry[];
  pendingApprovals: PendingApprovalRequest[];
  yesterdayReports: YesterdayReportItem[];
  currentTasks: EngineerTaskItem[];
  currentLeaveRequests: LeaveRequestItem[];
  clientAccess: ClientAccessEntry[];
  onOpenModule: (title: string) => void;
  onOpenProfile: () => void;
  onOpenChat: () => void;
}) {
  if (role === "admin") {
    return (
      <section className="px-4 pt-5 sm:px-6">
        <div className="rounded-[24px] border border-slate-200 bg-white p-5 shadow-sm">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[#115cff]">
                Admin project control map
              </p>
              <h2 className="mt-2 text-2xl font-bold tracking-normal text-[#07122f]">
                All live and blocked Kerala works
              </h2>
              <p className="mt-2 max-w-[720px] text-sm leading-6 text-slate-500">
                View every seeded work on one premium map, then jump into project control, live tracking, access control, approvals, reports, and client sharing.
              </p>
            </div>
            <div className="flex flex-wrap gap-3">
              <button
                type="button"
                onClick={() => onOpenModule("Projects")}
                className="inline-flex min-h-11 items-center justify-center rounded-full border border-blue-100 bg-blue-50 px-4 text-sm font-semibold text-[#115cff]"
              >
                Open Projects
              </button>
              <button
                type="button"
                onClick={() => onOpenModule("Live Tracking")}
                className="inline-flex min-h-11 items-center justify-center rounded-full border border-slate-200 bg-white px-4 text-sm font-semibold text-slate-700"
              >
                Open Live Tracking
              </button>
            </div>
          </div>

          <div className="mt-6 overflow-hidden rounded-[24px] border border-slate-200">
            <LiveMap
              satellite
              trackedPoints={trackingSnapshot?.locations ?? []}
              projectsData={projectPortfolio}
              className="h-[420px] rounded-none border-0"
            />
          </div>

          <div className="mt-5 grid gap-3 md:grid-cols-4">
            <MiniMetric
              label="Projects"
              value={String(projectPortfolio.length)}
              detail="Admin overview on one live map"
            />
            <MiniMetric
              label="Pending approvals"
              value={String(pendingApprovals.filter((item) => item.status === "pending").length)}
              detail="Access, leave, and report requests"
            />
            <MiniMetric
              label="Approved users"
              value={String(accessDirectory.filter((entry) => entry.accessStatus === "active").length)}
              detail="Company people with app access"
            />
            <MiniMetric
              label="Yesterday reports"
              value={String(yesterdayReports.length)}
              detail="Latest synced field updates"
            />
          </div>

          <div className="mt-5 grid gap-3 lg:grid-cols-2">
            {projectPortfolio.map((item) => (
              <button
                key={item.id}
                type="button"
                onClick={() => onOpenModule("Projects")}
                className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-4 text-left transition hover:border-blue-200 hover:bg-white"
              >
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-sm font-bold text-[#07122f]">{item.name}</p>
                    <p className="mt-1 text-sm text-slate-500">{item.location}</p>
                  </div>
                  <span className={statusChipClass(item.status)}>{item.status}</span>
                </div>
                <div className="mt-3 grid grid-cols-3 gap-3 text-sm text-slate-600">
                  <div>
                    <p className="text-xs uppercase tracking-[0.1em] text-slate-400">Length</p>
                    <p className="mt-1 font-semibold text-[#07122f]">{item.totalLengthKm} km</p>
                  </div>
                  <div>
                    <p className="text-xs uppercase tracking-[0.1em] text-slate-400">Completed</p>
                    <p className="mt-1 font-semibold text-[#07122f]">{item.completedKm} km</p>
                  </div>
                  <div>
                    <p className="text-xs uppercase tracking-[0.1em] text-slate-400">Client</p>
                    <p className="mt-1 font-semibold text-[#07122f]">{item.client}</p>
                  </div>
                </div>
              </button>
            ))}
          </div>
        </div>
      </section>
    );
  }

  if (role === "engineer") {
    const nextLeave = currentLeaveRequests[0] ?? null;
    return (
      <section className="px-4 pt-5 sm:px-6">
        <div className="rounded-[24px] border border-slate-200 bg-white p-5 shadow-sm">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[#115cff]">
                Assigned project
              </p>
              <h2 className="mt-2 text-2xl font-bold tracking-normal text-[#07122f]">
                {primaryProject.name}
              </h2>
              <p className="mt-2 max-w-[720px] text-sm leading-6 text-slate-500">
                Your daily field dashboard is centered on this assigned project. Attendance, tasks, leave, uploads, and live chat stay connected to this work.
              </p>
            </div>
            <div className="flex flex-wrap gap-3">
              <button
                type="button"
                onClick={onOpenProfile}
                className="inline-flex min-h-11 items-center justify-center rounded-full border border-slate-200 bg-white px-4 text-sm font-semibold text-slate-700"
              >
                Open profile
              </button>
              <button
                type="button"
                onClick={onOpenChat}
                className="inline-flex min-h-11 items-center justify-center rounded-full border border-blue-100 bg-blue-50 px-4 text-sm font-semibold text-[#115cff]"
              >
                Open chat
              </button>
            </div>
          </div>

          <div className="mt-6 overflow-hidden rounded-[24px] border border-slate-200">
            <LiveMap
              compact
              satellite
              focusProjectId={primaryProject.id}
              trackedPoints={trackingSnapshot?.locations ?? []}
              projectsData={projectPortfolio}
              className="h-[340px] rounded-none border-0"
            />
          </div>

          <div className="mt-5 grid gap-3 md:grid-cols-4">
            <MiniMetric
              label="Today's tasks"
              value={String(currentTasks.length)}
              detail={currentTasks[0]?.title ?? "No tasks assigned yet"}
            />
            <MiniMetric
              label="Monthly attendance"
              value={trackingLoading ? "..." : String((trackingSnapshot?.attendance ?? []).length)}
              detail="Recent mobile attendance marks"
            />
            <MiniMetric
              label="Next leave"
              value={nextLeave ? nextLeave.status : "No leave"}
              detail={nextLeave ? `${nextLeave.startDate} to ${nextLeave.endDate}` : "No active leave request"}
            />
            <MiniMetric
              label="Latest live mark"
              value={latestLocation ? `${latestLocation.distanceFromSiteM} m` : "Not marked"}
              detail={latestLocation ? "Distance from corridor start" : "Use Mark Attendance"}
            />
          </div>
        </div>
      </section>
    );
  }

  if (role === "client") {
    const assignedClient =
      clientAccess.find((entry) => normalizeEmail(entry.email) === normalizeEmail(user?.email ?? "")) ??
      clientAccess.find((entry) => entry.accessStatus === "approved") ??
      null;
    return (
      <section className="px-4 pt-5 sm:px-6">
        <div className="rounded-[24px] border border-slate-200 bg-white p-5 shadow-sm">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[#115cff]">
                Client project portal
              </p>
              <h2 className="mt-2 text-2xl font-bold tracking-normal text-[#07122f]">
                {assignedClient?.projectName ?? primaryProject.name}
              </h2>
              <p className="mt-2 max-w-[720px] text-sm leading-6 text-slate-500">
                This portal is limited to the assigned project only. No other company or client data should be visible here.
              </p>
            </div>
            <button
              type="button"
              onClick={() => onOpenModule("PWD Permission Reports")}
              className="inline-flex min-h-11 items-center justify-center rounded-full border border-blue-100 bg-blue-50 px-4 text-sm font-semibold text-[#115cff]"
            >
              Open shared documents
            </button>
          </div>

          <div className="mt-6 overflow-hidden rounded-[24px] border border-slate-200">
            <LiveMap
              compact
              satellite
              focusProjectId={primaryProject.id}
              trackedPoints={trackingSnapshot?.locations ?? []}
              projectsData={projectPortfolio}
              className="h-[340px] rounded-none border-0"
            />
          </div>

          <div className="mt-5 grid gap-3 md:grid-cols-3">
            <MiniMetric
              label="Project status"
              value={primaryProject.status}
              detail={`${primaryProject.completedKm} km completed of ${primaryProject.totalLengthKm} km`}
            />
            <MiniMetric
              label="Client access"
              value={assignedClient?.accessStatus === "approved" ? "Approved" : "Not assigned"}
              detail={assignedClient?.email ?? "Awaiting client assignment"}
            />
            <MiniMetric
              label="Live chat"
              value="Available"
              detail="Project-specific communication only"
            />
          </div>
        </div>
      </section>
    );
  }

  return (
    <section className="px-4 pt-5 sm:px-6">
      <div className="rounded-[24px] border border-slate-200 bg-white p-5 shadow-sm">
        <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[#115cff]">
              Active project focus
            </p>
            <h2 className="mt-2 text-2xl font-bold tracking-normal text-[#07122f]">
              {primaryProject.name}
            </h2>
            <p className="mt-2 text-sm leading-6 text-slate-500">
              {primaryProject.location}
            </p>
            {latestLocation ? (
              <p className="mt-3 text-sm font-medium text-[#115cff]">
                Latest field mark: {latestLocation.userName} @{latestLocation.userLoginId} - {latestLocation.distanceFromSiteM} m from site start
              </p>
            ) : null}
          </div>
          <button
            type="button"
            onClick={() => onOpenModule("Projects")}
            className="inline-flex min-h-11 items-center justify-center rounded-full border border-blue-100 bg-blue-50 px-4 text-sm font-semibold text-[#115cff]"
          >
            Open project details
          </button>
        </div>

        <div className="mt-5 grid gap-3 md:grid-cols-4">
          <MiniMetric
            label="Completed"
            value={formatMeters(getProgressMeters(primaryProject))}
            detail={`${primaryProject.progress}% overall progress`}
          />
          <MiniMetric
            label="Remaining"
            value={formatMeters(getRemainingMeters(primaryProject))}
            detail="Balance work on corridor"
          />
          <MiniMetric
            label="Approvals"
            value={String(pendingApprovals.filter((item) => item.status === "pending").length)}
            detail="Pending actions in queue"
          />
          <MiniMetric
            label="Yesterday reports"
            value={String(yesterdayReports.length)}
            detail="Latest synced field reports"
          />
        </div>
      </div>
    </section>
  );
}

function AppFrame({
  user,
  active,
  children,
  onSignOut,
  onHome,
  onBack,
  onChat,
  onModule,
  onProfile,
  notifications,
  notificationsLoading,
  notificationsOpen,
  unreadNotifications,
  onToggleNotifications,
  onMarkAllNotificationsRead,
  onOpenNotification
}: {
  user: AppUser | null;
  active: string;
  children: ReactNode;
  onSignOut: () => void;
  onHome: () => void;
  onBack?: () => void;
  onChat: () => void;
  onModule: () => void;
  onProfile: () => void;
  notifications: MobileNotificationItem[];
  notificationsLoading: boolean;
  notificationsOpen: boolean;
  unreadNotifications: number;
  onToggleNotifications: () => void;
  onMarkAllNotificationsRead: () => void;
  onOpenNotification: (notification: MobileNotificationItem) => void;
}) {
  return (
    <main className="min-h-dvh bg-[#f8fbff] text-[#07122f]">
      <div className="mx-auto min-h-dvh w-full max-w-[980px] bg-white pb-28 shadow-[0_0_80px_rgba(15,35,80,0.06)]">
        <StatusBar dark />
        <header className="sticky top-0 z-30 flex items-center justify-between gap-3 border-b border-slate-100 bg-white/92 px-4 py-5 backdrop-blur sm:px-6">
          <div className="flex min-w-0 items-center gap-4">
            <button
              type="button"
              onClick={onBack ?? onHome}
              aria-label={onBack ? "Go back" : "Go to dashboard"}
              className="grid h-10 w-10 shrink-0 place-items-center rounded-xl text-[#07122f]"
            >
              {onBack ? <ChevronLeft className="h-6 w-6" /> : <Home className="h-6 w-6" />}
            </button>
            <BrandMark compact />
          </div>
          <div className="relative flex items-center gap-3">
            <button
              type="button"
              onClick={onToggleNotifications}
              className="relative grid h-11 w-11 place-items-center rounded-xl text-[#07122f]"
              aria-label="Open notifications"
            >
              <Bell className="h-6 w-6" />
              {unreadNotifications > 0 ? (
                <span className="absolute right-1 top-1 min-w-5 rounded-full bg-[#ff3d57] px-1.5 py-0.5 text-center text-[10px] font-bold leading-none text-white">
                  {unreadNotifications > 9 ? "9+" : unreadNotifications}
                </span>
              ) : null}
            </button>
            <button
              type="button"
              onClick={onSignOut}
              className="inline-flex min-h-10 items-center rounded-full border border-slate-200 px-3 py-2 text-xs font-semibold text-slate-600"
              aria-label="Sign out"
            >
              Sign Out
            </button>
            <button
              type="button"
              onClick={onProfile}
              className="flex items-center gap-2"
              aria-label="Open profile"
            >
              <div className="grid h-12 w-12 place-items-center overflow-hidden rounded-full bg-gradient-to-br from-orange-100 to-emerald-100 text-[#07122f]">
                {user?.avatarUrl ? (
                  <Image
                    src={user.avatarUrl}
                    alt={user.name}
                    width={48}
                    height={48}
                    className="h-12 w-12 object-cover"
                  />
                ) : (
                  <HardHat className="h-7 w-7" />
                )}
              </div>
              <ChevronDown className="h-4 w-4 text-slate-500" />
            </button>

            {notificationsOpen ? (
              <div className="absolute right-0 top-[calc(100%+0.75rem)] z-40 w-[340px] max-w-[calc(100vw-2rem)] rounded-[24px] border border-slate-200 bg-white p-4 shadow-[0_24px_80px_rgba(15,35,80,0.16)]">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <p className="text-sm font-bold text-[#07122f]">Notifications</p>
                    <p className="mt-1 text-xs text-slate-500">
                      Mentions, chat moderation, and workflow updates.
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={onMarkAllNotificationsRead}
                    className="text-xs font-semibold text-[#115cff]"
                  >
                    Mark all read
                  </button>
                </div>

                <div className="mt-4 max-h-[360px] space-y-3 overflow-y-auto pr-1">
                  {notificationsLoading && notifications.length === 0 ? (
                    <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-5 text-sm text-slate-500">
                      Loading notifications...
                    </div>
                  ) : null}

                  {!notificationsLoading && notifications.length === 0 ? (
                    <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50 px-4 py-5 text-sm text-slate-500">
                      No notifications yet.
                    </div>
                  ) : null}

                  {notifications.map((notification) => (
                    <button
                      key={notification.id}
                      type="button"
                      onClick={() => onOpenNotification(notification)}
                      className={cn(
                        "w-full rounded-2xl border px-4 py-4 text-left transition",
                        notification.isRead
                          ? "border-slate-200 bg-slate-50"
                          : "border-blue-100 bg-blue-50"
                      )}
                    >
                      <div className="flex items-start justify-between gap-3">
                        <p className="text-sm font-bold text-[#07122f]">{notification.title}</p>
                        <span className="shrink-0 text-[11px] font-semibold text-slate-400">
                          {formatNotificationTime(notification.createdAt)}
                        </span>
                      </div>
                      {notification.body ? (
                        <p className="mt-2 text-sm leading-6 text-slate-500">{notification.body}</p>
                      ) : null}
                    </button>
                  ))}
                </div>
              </div>
            ) : null}
          </div>
        </header>
        {children}
        <BottomNav
          active={active}
          onHome={onHome}
          onModule={onModule}
          onChat={onChat}
          onProfile={onProfile}
          userName={user?.name ?? "Ajith"}
        />
      </div>
    </main>
  );
}

function ChatView({
  currentUser,
  messages,
  members,
  mentionMatches,
  composer,
  draftImages,
  loading,
  error,
  chatEndRef,
  onComposer,
  onInsertMention,
  onPickImages,
  onRemoveDraft,
  onDeleteMessage,
  onSend
}: {
  currentUser: AppUser | null;
  messages: ChatMessage[];
  members: ChatMember[];
  mentionMatches: ChatMember[];
  composer: string;
  draftImages: ChatDraftImage[];
  loading: boolean;
  error: string;
  chatEndRef: RefObject<HTMLDivElement | null>;
  onComposer: (value: string) => void;
  onInsertMention: (member: ChatMember) => void;
  onPickImages: (files: FileList | null) => Promise<void>;
  onRemoveDraft: (id: string) => void;
  onDeleteMessage: (messageId: string) => Promise<void>;
  onSend: () => Promise<void>;
}) {
  return (
    <section className="flex min-h-[calc(100dvh-9rem)] flex-col px-4 pb-6 pt-6 sm:px-6">
      <div className="rounded-[24px] border border-slate-200 bg-white p-4 shadow-sm">
        <div className="flex items-center justify-between gap-3">
          <div>
            <h1 className="text-2xl font-bold tracking-normal text-[#07122f]">Telgo Team Chat</h1>
            <p className="mt-1 text-sm text-slate-500">
              Live team messaging for approved mobile users. Type <span className="font-semibold text-[#07122f]">@</span> to tag a teammate and send a dashboard notification.
            </p>
          </div>
          <div className="text-right">
            <span className="rounded-full bg-emerald-50 px-3 py-1 text-xs font-semibold text-[#14b866]">
              Live
            </span>
            <p className="mt-2 text-xs font-medium text-slate-500">{members.length} approved users</p>
          </div>
        </div>
      </div>

      <div className="mt-4 flex-1 overflow-hidden rounded-[24px] border border-slate-200 bg-white shadow-sm">
        <div className="h-full overflow-y-auto px-4 py-4 sm:px-5">
          {messages.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50 px-4 py-5 text-center">
              <p className="text-sm font-semibold text-[#07122f]">No messages yet.</p>
              <p className="mt-2 text-sm leading-6 text-slate-500">
                Start the first conversation here. All approved users will see the same live team chat.
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {messages.map((message) => {
                const mine = currentUser?.id === message.sender.userId;
                const canDelete = currentUser?.role === "admin" || mine;
                const trimmedBody = message.body.trim();
                const mentionedCurrentUser = message.mentions.some(
                  (mention) => mention.userId === currentUser?.id
                );
                return (
                  <div
                    key={message.id}
                    className={cn("flex", mine ? "justify-end" : "justify-start")}
                  >
                    <div
                      className={cn(
                        "max-w-[85%] rounded-[22px] px-4 py-3 shadow-sm",
                        mine
                          ? "bg-[#115cff] text-white"
                          : "border border-slate-200 bg-slate-50 text-[#07122f]"
                      )}
                    >
                      <div className="mb-2 flex items-start justify-between gap-3">
                        <div className="flex flex-wrap items-center gap-2">
                          <p className={cn("text-sm font-semibold", mine ? "text-white" : "text-[#07122f]")}>
                            {message.sender.name}
                          </p>
                          <span className={cn("text-xs", mine ? "text-blue-100" : "text-slate-400")}>
                            {formatRoleLabel(message.sender.role)}
                          </span>
                          {mentionedCurrentUser ? (
                            <span
                              className={cn(
                                "rounded-full px-2 py-1 text-[11px] font-semibold",
                                mine ? "bg-white/15 text-white" : "bg-blue-100 text-[#115cff]"
                              )}
                            >
                              Mentioned you
                            </span>
                          ) : null}
                        </div>
                        {canDelete && !message.isDeleted ? (
                          <button
                            type="button"
                            onClick={() => {
                              void onDeleteMessage(message.id);
                            }}
                            className={cn(
                              "text-[11px] font-semibold",
                              mine ? "text-blue-100" : "text-[#115cff]"
                            )}
                          >
                            Delete
                          </button>
                        ) : null}
                      </div>
                      {message.isDeleted ? (
                        <div className={cn("rounded-2xl px-3 py-3 text-sm", mine ? "bg-white/10 text-white" : "bg-slate-100 text-slate-500")}>
                          <p className="font-semibold">
                            {message.deletedByName ? `Message removed by ${message.deletedByName}.` : "Message deleted."}
                          </p>
                          <p className={cn("mt-1 text-xs", mine ? "text-blue-100" : "text-slate-400")}>
                            This chat entry was cleared for everyone.
                          </p>
                        </div>
                      ) : null}
                      {!message.isDeleted && trimmedBody ? (
                        <div className={cn("text-sm leading-6", mine ? "text-white" : "text-slate-700")}>
                          {renderChatBody(trimmedBody, message.mentions, mine)}
                        </div>
                      ) : null}
                      {!message.isDeleted && message.images.length ? (
                        <div className="mt-3 grid grid-cols-2 gap-2">
                          {message.images.map((image) => (
                            <a
                              key={image.path}
                              href={image.url ?? "#"}
                              target="_blank"
                              rel="noreferrer"
                              className="block overflow-hidden rounded-2xl border border-black/5 bg-white/10"
                            >
                              {image.url ? (
                                <div className="relative h-32 w-full">
                                  <Image
                                    src={image.url}
                                    alt={image.fileName}
                                    fill
                                    className="object-cover"
                                  />
                                </div>
                              ) : (
                                <div className="grid h-32 place-items-center text-xs text-slate-500">
                                  Uploading image...
                                </div>
                              )}
                            </a>
                          ))}
                        </div>
                      ) : null}
                      <p className={cn("mt-2 text-right text-[11px]", mine ? "text-blue-100" : "text-slate-400")}>
                        {formatChatTime(message.createdAt)}
                      </p>
                    </div>
                  </div>
                );
              })}
              <div ref={chatEndRef} />
            </div>
          )}
        </div>
      </div>

      {draftImages.length ? (
        <div className="mt-4 flex gap-3 overflow-x-auto rounded-[24px] border border-slate-200 bg-white p-3 shadow-sm">
          {draftImages.map((image) => (
            <div key={image.id} className="relative w-[110px] shrink-0">
              <div className="relative h-[110px] overflow-hidden rounded-2xl border border-slate-200">
                <Image src={image.previewUrl} alt={image.file.name} fill className="object-cover" />
              </div>
              <button
                type="button"
                onClick={() => onRemoveDraft(image.id)}
                className="absolute right-2 top-2 grid h-7 w-7 place-items-center rounded-full bg-white/90 text-slate-700 shadow-sm"
                aria-label="Remove photo"
              >
                <X className="h-4 w-4" />
              </button>
              <p className="mt-2 truncate text-xs font-medium text-slate-600">{image.sizeLabel}</p>
            </div>
          ))}
        </div>
      ) : null}

      <form
        onSubmit={(event) => {
          event.preventDefault();
          void onSend();
        }}
        className="mt-4 rounded-[24px] border border-slate-200 bg-white p-3 shadow-sm"
      >
        {mentionMatches.length ? (
          <div className="mb-3 rounded-2xl border border-slate-200 bg-slate-50 p-2">
            <p className="px-2 pb-2 text-xs font-semibold uppercase tracking-[0.12em] text-slate-500">
              Tag teammate
            </p>
            <div className="space-y-1">
              {mentionMatches.map((member) => (
                <button
                  key={member.id}
                  type="button"
                  onClick={() => onInsertMention(member)}
                  className="flex w-full items-center justify-between rounded-xl px-3 py-2 text-left transition hover:bg-white"
                >
                  <div>
                    <p className="text-sm font-semibold text-[#07122f]">{member.name}</p>
                    <p className="text-xs text-slate-500">
                      @{member.loginId} - {formatRoleLabel(member.role)}
                    </p>
                  </div>
                  {member.email ? (
                    <span className="text-[11px] font-medium text-slate-400">{member.email}</span>
                  ) : null}
                </button>
              ))}
            </div>
          </div>
        ) : null}
        <div className="flex items-end gap-3">
          <label className="grid h-12 w-12 shrink-0 cursor-pointer place-items-center rounded-2xl border border-slate-200 text-slate-600">
            <Paperclip className="h-5 w-5" />
            <input
              type="file"
              accept="image/*"
              multiple
              className="sr-only"
              onChange={(event) => {
                void onPickImages(event.target.files);
                event.currentTarget.value = "";
              }}
            />
          </label>
          <textarea
            value={composer}
            onChange={(event) => onComposer(event.target.value)}
            placeholder="Type a message"
            rows={1}
            className="min-h-12 flex-1 resize-none rounded-2xl border border-slate-200 px-4 py-3 text-sm outline-none placeholder:text-slate-400 focus:border-[#115cff] focus:ring-4 focus:ring-blue-50"
          />
          <button
            type="submit"
            disabled={loading}
            className="grid h-12 w-12 shrink-0 place-items-center rounded-2xl bg-[#115cff] text-white shadow-[0_12px_28px_rgba(17,92,255,0.22)] disabled:cursor-not-allowed disabled:opacity-60"
            aria-label="Send message"
          >
            <SendHorizontal className="h-5 w-5" />
          </button>
        </div>
        {error ? (
          <p className="mt-3 text-sm font-medium text-[#ff3d57]">{error}</p>
        ) : (
          <p className="mt-3 text-xs leading-5 text-slate-500">
            Photos are compressed before upload. Tag a teammate with @TelgoID to push a dashboard notification.
          </p>
        )}
      </form>
    </section>
  );
}

function ProfileView({
  currentUser,
  currentAccessEntry,
  currentClientEntry,
  projectPortfolio,
  avatarUrl,
  onAvatarUrlChange,
  onSaveProfile,
  onBack
}: {
  currentUser: AppUser | null;
  currentAccessEntry: AccessDirectoryEntry | null;
  currentClientEntry: ClientAccessEntry | null;
  projectPortfolio: Project[];
  avatarUrl: string | null;
  onAvatarUrlChange: (value: string | null) => void;
  onSaveProfile: (name: string, avatarUrl: string | null) => void;
  onBack: () => void;
}) {
  const [displayName, setDisplayName] = useState(currentUser?.name ?? "");
  const [status, setStatus] = useState("");
  const assignedProjectNames = (currentAccessEntry?.assignedProjectIds ?? [])
    .map((projectId) => projectPortfolio.find((item) => item.id === projectId)?.name ?? projectId)
    .filter(Boolean);

  useEffect(() => {
    setDisplayName(currentUser?.name ?? "");
  }, [currentUser?.name]);

  async function uploadAvatar(fileList: FileList | null) {
    const file = fileList?.[0];
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      setStatus("Choose an image file for the profile photo.");
      return;
    }

    const dataUrl = await readFileAsDataUrl(file);
    onAvatarUrlChange(dataUrl);
    setStatus("Profile photo selected. Save profile to apply it.");
  }

  function saveProfile() {
    if (!currentUser) return;
    onSaveProfile(displayName, avatarUrl);
    setStatus("Profile updated on this device.");
  }

  return (
    <section className="px-4 pb-10 pt-7 sm:px-6">
      <BackToDashboard onBack={onBack} />
      <div className="rounded-[24px] border border-slate-200 bg-white p-6 shadow-sm">
        <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[#115cff]">
              Profile
            </p>
            <h1 className="mt-2 text-3xl font-bold tracking-normal text-[#07122f]">
              Personal mobile profile
            </h1>
            <p className="mt-3 max-w-[720px] text-sm leading-7 text-slate-500">
              Update the name and photo used on this device. Assigned role, approved email, and access controls stay protected under the current company approval flow.
            </p>
          </div>
          <label className="inline-flex min-h-11 cursor-pointer items-center justify-center rounded-full border border-blue-100 bg-blue-50 px-4 text-sm font-semibold text-[#115cff]">
            Upload photo
            <input
              type="file"
              accept="image/*"
              className="hidden"
              onChange={(event) => {
                void uploadAvatar(event.target.files);
                event.currentTarget.value = "";
              }}
            />
          </label>
        </div>

        <div className="mt-6 grid gap-5 lg:grid-cols-[220px_1fr]">
          <div className="rounded-[24px] border border-slate-200 bg-slate-50 p-5 text-center">
            <div className="mx-auto grid h-28 w-28 place-items-center overflow-hidden rounded-full bg-gradient-to-br from-orange-100 via-white to-emerald-100">
              {avatarUrl ? (
                <Image
                  src={avatarUrl}
                  alt={currentUser?.name ?? "Profile"}
                  width={112}
                  height={112}
                  className="h-28 w-28 object-cover"
                />
              ) : (
                <HardHat className="h-12 w-12 text-[#07122f]" />
              )}
            </div>
            <p className="mt-4 text-base font-bold text-[#07122f]">{currentUser?.name ?? "Telgo User"}</p>
            <p className="mt-1 text-sm text-slate-500">{formatRoleLabel(currentUser?.role ?? "engineer")}</p>
          </div>

          <div className="space-y-4">
            <label className="block">
              <span className="mb-2 block text-sm font-semibold text-slate-700">Display Name</span>
              <input
                value={displayName}
                onChange={(event) => setDisplayName(event.target.value)}
                placeholder="Enter display name"
                className="min-h-14 w-full rounded-xl border border-slate-200 px-4 text-sm outline-none placeholder:text-slate-400 focus:border-[#115cff] focus:ring-4 focus:ring-blue-50"
              />
            </label>

            <div className="grid gap-3 md:grid-cols-2">
              <MiniMetric
                label="Approved Email"
                value={currentUser?.email ?? "Not available"}
                detail="OTP recovery and protected login email"
              />
              <MiniMetric
                label="Telgo ID"
                value={currentUser?.loginId ?? "Not available"}
                detail="Internal secure mobile identifier"
              />
              <MiniMetric
                label="Assigned Role"
                value={formatRoleLabel(currentUser?.role ?? "engineer")}
                detail={currentAccessEntry?.designation ?? "Approved mobile role"}
              />
              <MiniMetric
                label="Assigned Projects"
                value={assignedProjectNames.length ? String(assignedProjectNames.length) : "0"}
                detail={
                  assignedProjectNames[0] ??
                  currentClientEntry?.projectName ??
                  "No project mapped yet"
                }
              />
            </div>

            <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-4">
              <p className="text-sm font-semibold text-[#07122f]">Current assignment summary</p>
              <p className="mt-2 text-sm leading-6 text-slate-500">
                {assignedProjectNames.length
                  ? assignedProjectNames.join(", ")
                  : currentClientEntry?.projectName ?? "No assigned project yet."}
              </p>
            </div>

            <div className="flex flex-wrap gap-3">
              <button
                type="button"
                onClick={saveProfile}
                className="inline-flex min-h-11 items-center justify-center rounded-full bg-[#115cff] px-5 text-sm font-semibold text-white shadow-[0_12px_28px_rgba(17,92,255,0.22)]"
              >
                Save profile
              </button>
              <button
                type="button"
                onClick={() => {
                  setDisplayName(currentUser?.name ?? "");
                  onAvatarUrlChange(currentUser?.avatarUrl ?? null);
                  setStatus("Profile changes were reset.");
                }}
                className="inline-flex min-h-11 items-center justify-center rounded-full border border-slate-200 bg-white px-5 text-sm font-semibold text-slate-700"
              >
                Reset changes
              </button>
            </div>

            {status ? <Notice>{status}</Notice> : null}
          </div>
        </div>
      </div>
    </section>
  );
}

function RoleOverviewPanel({
  role,
  onOpenModule
}: {
  role: AccessRole;
  onOpenModule: (title: string) => void;
}) {
  const config = roleDashboardContent[role];
  const roleLabel = formatRoleLabel(role);
  const dashboardTitle = roleDashboardModuleTitleByRole[role];

  return (
    <section className="px-4 pt-6 sm:px-6">
      <div className="rounded-[24px] border border-slate-200 bg-white p-5 shadow-sm">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div className="max-w-[620px]">
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[#115cff]">
              {roleLabel} Dashboard
            </p>
            <h2 className="mt-2 text-2xl font-bold tracking-normal text-[#07122f]">
              {config.focusTitle}
            </h2>
            <p className="mt-3 text-sm leading-6 text-slate-500">{config.focusDetail}</p>
          </div>
          <button
            type="button"
            onClick={() => onOpenModule(dashboardTitle)}
            className="inline-flex min-h-11 items-center justify-center rounded-full border border-blue-100 bg-blue-50 px-4 text-sm font-semibold text-[#115cff]"
          >
            Open {dashboardTitle}
          </button>
        </div>

        <div className="mt-5 grid gap-3 md:grid-cols-2 xl:grid-cols-4">
          {config.quickActions.map((action) => (
            <button
              key={action.title}
              type="button"
              onClick={() => onOpenModule(action.moduleTitle)}
              className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-4 text-left transition hover:border-blue-200 hover:bg-white"
            >
              <p className="text-sm font-bold text-[#07122f]">{action.title}</p>
              <p className="mt-2 text-sm leading-6 text-slate-500">{action.detail}</p>
            </button>
          ))}
        </div>

        <div className="mt-5 grid gap-3 lg:grid-cols-3">
          {config.sections.map((section) => (
            <RoleSectionCard key={section.title} section={section} compact />
          ))}
        </div>
      </div>
    </section>
  );
}

function RoleWorkspaceView({
  role,
  onBack,
  onOpenModule
}: {
  role: AccessRole;
  onBack: () => void;
  onOpenModule: (title: string) => void;
}) {
  const config = roleDashboardContent[role];
  const roleLabel = formatRoleLabel(role);

  return (
    <section className="px-4 pb-10 pt-7 sm:px-6">
      <button
        type="button"
        onClick={onBack}
        className="mb-6 inline-flex h-11 items-center gap-2 rounded-full border border-slate-200 px-4 text-sm font-semibold text-slate-700"
      >
        <ChevronLeft className="h-4 w-4" />
        Dashboard
      </button>

      <div className="rounded-[24px] border border-slate-200 bg-white p-6 shadow-sm">
        <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[#115cff]">
          {roleLabel} Workspace
        </p>
        <h1 className="mt-2 text-3xl font-bold tracking-normal text-[#07122f]">
          {config.focusTitle}
        </h1>
        <p className="mt-3 max-w-[760px] text-sm leading-7 text-slate-500">
          {config.focusDetail}
        </p>

        <div className="mt-6 grid gap-3 md:grid-cols-2 xl:grid-cols-4">
          {config.quickActions.map((action) => (
            <button
              key={action.title}
              type="button"
              onClick={() => onOpenModule(action.moduleTitle)}
              className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-4 text-left transition hover:border-blue-200 hover:bg-white"
            >
              <p className="text-sm font-bold text-[#07122f]">{action.title}</p>
              <p className="mt-2 text-sm leading-6 text-slate-500">{action.detail}</p>
            </button>
          ))}
        </div>

        <div className="mt-8 grid gap-4 xl:grid-cols-3">
          {config.sections.map((section) => (
            <RoleSectionCard key={section.title} section={section} />
          ))}
        </div>

        <div className="mt-8 rounded-2xl border border-dashed border-slate-200 bg-slate-50 px-4 py-5">
          <p className="text-sm font-semibold text-[#07122f]">{config.statusTitle}</p>
          <p className="mt-2 text-sm leading-6 text-slate-500">{config.statusBody}</p>
        </div>
      </div>
    </section>
  );
}

function RoleSectionCard({
  section,
  compact = false
}: {
  section: RoleDashboardSection;
  compact?: boolean;
}) {
  return (
    <article className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-4">
      <h3 className="text-base font-bold text-[#07122f]">{section.title}</h3>
      <p className="mt-2 text-sm leading-6 text-slate-500">{section.detail}</p>
      <div className="mt-4 space-y-3">
        {section.items.map((item) => (
          <div key={item.title} className="rounded-xl border border-white bg-white px-3 py-3">
            <p className="text-sm font-semibold text-[#07122f]">{item.title}</p>
            <p className="mt-1 text-sm leading-6 text-slate-500">
              {compact ? item.detail : item.detail}
            </p>
          </div>
        ))}
      </div>
    </article>
  );
}

function ModuleView({
  module,
  currentUser,
  primaryProject,
  projectPortfolio,
  onProjectPortfolioChange,
  accessDirectory,
  onAccessDirectoryChange,
  pendingApprovals,
  onPendingApprovalsChange,
  yesterdayReports,
  clientAccess,
  onClientAccessChange,
  engineerTasks,
  onEngineerTasksChange,
  leaveRequests,
  onLeaveRequestsChange,
  workerRoster,
  onWorkerRosterChange,
  pwdDocuments,
  onPwdDocumentsChange,
  projectEditor,
  onProjectEditorChange,
  trackingSnapshot,
  trackingLoading,
  trackingError,
  attendanceSubmitting,
  onMarkAttendance,
  onOpenProfile,
  onOpenChat,
  onOpenModuleByTitle,
  onBack
}: {
  module: ModuleItem;
  currentUser: AppUser | null;
  primaryProject: Project;
  projectPortfolio: Project[];
  onProjectPortfolioChange: (updater: Project[] | ((current: Project[]) => Project[])) => void;
  accessDirectory: AccessDirectoryEntry[];
  onAccessDirectoryChange: (
    updater: AccessDirectoryEntry[] | ((current: AccessDirectoryEntry[]) => AccessDirectoryEntry[])
  ) => void;
  pendingApprovals: PendingApprovalRequest[];
  onPendingApprovalsChange: (
    updater:
      | PendingApprovalRequest[]
      | ((current: PendingApprovalRequest[]) => PendingApprovalRequest[])
  ) => void;
  yesterdayReports: YesterdayReportItem[];
  clientAccess: ClientAccessEntry[];
  onClientAccessChange: (
    updater: ClientAccessEntry[] | ((current: ClientAccessEntry[]) => ClientAccessEntry[])
  ) => void;
  engineerTasks: EngineerTaskItem[];
  onEngineerTasksChange: (
    updater: EngineerTaskItem[] | ((current: EngineerTaskItem[]) => EngineerTaskItem[])
  ) => void;
  leaveRequests: LeaveRequestItem[];
  onLeaveRequestsChange: (
    updater: LeaveRequestItem[] | ((current: LeaveRequestItem[]) => LeaveRequestItem[])
  ) => void;
  workerRoster: WorkerRosterItem[];
  onWorkerRosterChange: (
    updater: WorkerRosterItem[] | ((current: WorkerRosterItem[]) => WorkerRosterItem[])
  ) => void;
  pwdDocuments: PwdDocumentItem[];
  onPwdDocumentsChange: (
    updater: PwdDocumentItem[] | ((current: PwdDocumentItem[]) => PwdDocumentItem[])
  ) => void;
  projectEditor: ProjectEditorState | null;
  onProjectEditorChange: (
    updater: ProjectEditorState | null | ((current: ProjectEditorState | null) => ProjectEditorState | null)
  ) => void;
  trackingSnapshot: MobileTrackingSnapshot | null;
  trackingLoading: boolean;
  trackingError: string;
  attendanceSubmitting: boolean;
  onMarkAttendance: () => void;
  onOpenProfile: () => void;
  onOpenChat: () => void;
  onOpenModuleByTitle: (title: string) => void;
  onBack: () => void;
}) {
  if (module.title === "Mark Attendance") {
    return (
      <AttendanceModuleView
        currentUser={currentUser}
        primaryProject={primaryProject}
        projectPortfolio={projectPortfolio}
        trackingSnapshot={trackingSnapshot}
        trackingLoading={trackingLoading}
        trackingError={trackingError}
        attendanceSubmitting={attendanceSubmitting}
        onMarkAttendance={onMarkAttendance}
        onBack={onBack}
      />
    );
  }

  if (module.title === "Live Tracking") {
    return (
      <LiveTrackingModuleView
        currentUser={currentUser}
        primaryProject={primaryProject}
        projectPortfolio={projectPortfolio}
        trackingSnapshot={trackingSnapshot}
        trackingLoading={trackingLoading}
        trackingError={trackingError}
        onBack={onBack}
      />
    );
  }

  if (module.title === "Projects" || module.title === "Update Project") {
    return (
      <ProjectDetailsModuleView
        currentUser={currentUser}
        primaryProject={primaryProject}
        projectPortfolio={projectPortfolio}
        projectEditor={projectEditor}
        onProjectEditorChange={onProjectEditorChange}
        onProjectPortfolioChange={onProjectPortfolioChange}
        trackingSnapshot={trackingSnapshot}
        trackingLoading={trackingLoading}
        trackingError={trackingError}
        onBack={onBack}
      />
    );
  }

  if (module.title === "Admin Dashboard") {
    return (
      <AdminDashboardModuleView
        projectPortfolio={projectPortfolio}
        trackingSnapshot={trackingSnapshot}
        pendingApprovals={pendingApprovals}
        yesterdayReports={yesterdayReports}
        accessDirectory={accessDirectory}
        onOpenModule={onOpenModuleByTitle}
        onBack={onBack}
      />
    );
  }

  if (module.title === "Company Access") {
    return (
      <CompanyAccessModuleView
        accessDirectory={accessDirectory}
        projectPortfolio={projectPortfolio}
        onAccessDirectoryChange={onAccessDirectoryChange}
        onBack={onBack}
      />
    );
  }

  if (module.title === "Pending Approval") {
    return (
      <PendingApprovalModuleView
        pendingApprovals={pendingApprovals}
        onPendingApprovalsChange={onPendingApprovalsChange}
        onBack={onBack}
      />
    );
  }

  if (module.title === "Yesterday Reports") {
    return <YesterdayReportsModuleView reports={yesterdayReports} onBack={onBack} />;
  }

  if (module.title === "Engineer Dashboard") {
    return (
      <EngineerDashboardModuleView
        currentUser={currentUser}
        primaryProject={primaryProject}
        currentTasks={engineerTasks.filter(
          (task) => normalizeEmail(task.assigneeEmail) === normalizeEmail(currentUser?.email ?? "")
        )}
        leaveRequests={leaveRequests.filter(
          (request) => normalizeEmail(request.email) === normalizeEmail(currentUser?.email ?? "")
        )}
        trackingSnapshot={trackingSnapshot}
        onOpenModule={onOpenModuleByTitle}
        onOpenProfile={onOpenProfile}
        onOpenChat={onOpenChat}
        onBack={onBack}
      />
    );
  }

  if (module.title === "Supervisor Dashboard") {
    return (
      <SupervisorDashboardModuleView
        currentUser={currentUser}
        primaryProject={primaryProject}
        trackingSnapshot={trackingSnapshot}
        pendingApprovals={pendingApprovals}
        yesterdayReports={yesterdayReports}
        leaveRequests={leaveRequests}
        engineerTasks={engineerTasks}
        onOpenModule={onOpenModuleByTitle}
        onBack={onBack}
      />
    );
  }

  if (module.title === "Client Dashboard") {
    return (
      <ClientDashboardModuleView
        currentUser={currentUser}
        primaryProject={primaryProject}
        clientAccess={clientAccess}
        onClientAccessChange={onClientAccessChange}
        projectPortfolio={projectPortfolio}
        pwdDocuments={pwdDocuments}
        onBack={onBack}
      />
    );
  }

  if (module.title === "Finance Dashboard") {
    return (
      <FinanceDashboardModuleView
        projectPortfolio={projectPortfolio}
        yesterdayReports={yesterdayReports}
        pwdDocuments={pwdDocuments}
        onOpenModule={onOpenModuleByTitle}
        onBack={onBack}
      />
    );
  }

  if (module.title === "Current Engineers") {
    return (
      <CurrentEngineersModuleView
        projectPortfolio={projectPortfolio}
        trackingSnapshot={trackingSnapshot}
        accessDirectory={accessDirectory}
        onBack={onBack}
      />
    );
  }

  if (module.title === "Worker Register") {
    return (
      <WorkerRegisterModuleView
        workerRoster={workerRoster}
        onWorkerRosterChange={onWorkerRosterChange}
        onBack={onBack}
      />
    );
  }

  if (module.title === "PWD Permission Reports") {
    return (
      <PwdPermissionReportsModuleView
        currentUser={currentUser}
        primaryProject={primaryProject}
        projectPortfolio={projectPortfolio}
        pwdDocuments={pwdDocuments}
        onPwdDocumentsChange={onPwdDocumentsChange}
        onBack={onBack}
      />
    );
  }

  if (module.title === "Monthly Attendance") {
    return (
      <MonthlyAttendanceModuleView
        currentUser={currentUser}
        trackingSnapshot={trackingSnapshot}
        leaveRequests={leaveRequests}
        onLeaveRequestsChange={onLeaveRequestsChange}
        onBack={onBack}
      />
    );
  }

  if (module.title === "Leave Requests") {
    return (
      <LeaveRequestModuleView
        currentUser={currentUser}
        leaveRequests={leaveRequests}
        onLeaveRequestsChange={onLeaveRequestsChange}
        onBack={onBack}
      />
    );
  }

  if (module.title === "Assigned Tasks") {
    return (
      <AssignedTasksModuleView
        currentUser={currentUser}
        projectPortfolio={projectPortfolio}
        engineerTasks={engineerTasks}
        onEngineerTasksChange={onEngineerTasksChange}
        onBack={onBack}
      />
    );
  }

  const IconComponent = module.icon;
  return (
    <section className="px-4 pb-10 pt-7 sm:px-6">
      <button
        type="button"
        onClick={onBack}
        className="mb-6 inline-flex h-11 items-center gap-2 rounded-full border border-slate-200 px-4 text-sm font-semibold text-slate-700"
      >
        <ChevronLeft className="h-4 w-4" />
        Dashboard
      </button>
      <div className="rounded-[24px] border border-slate-200 bg-white p-6 shadow-sm">
        <span className={cn("mb-5 grid h-16 w-16 place-items-center rounded-2xl", toneStyles[module.tone].box)}>
          <IconComponent className={cn("h-8 w-8", toneStyles[module.tone].icon)} />
        </span>
        <h1 className="text-3xl font-bold tracking-normal text-[#07122f]">{module.title}</h1>
        <p className="mt-2 text-slate-500">{module.subtitle}</p>
        <div className="mt-8 rounded-2xl border border-dashed border-slate-200 bg-slate-50 px-4 py-5">
          <p className="text-sm font-semibold text-[#07122f]">No live records in this module yet.</p>
          <p className="mt-2 text-sm leading-6 text-slate-500">
            Placeholder actions and demo records have been removed. Connect this module to your real
            project workflows before handing the app to the client.
          </p>
        </div>
      </div>
    </section>
  );
}

function AttendanceModuleView({
  currentUser,
  primaryProject,
  projectPortfolio,
  trackingSnapshot,
  trackingLoading,
  trackingError,
  attendanceSubmitting,
  onMarkAttendance,
  onBack
}: {
  currentUser: AppUser | null;
  primaryProject: Project;
  projectPortfolio: Project[];
  trackingSnapshot: MobileTrackingSnapshot | null;
  trackingLoading: boolean;
  trackingError: string;
  attendanceSubmitting: boolean;
  onMarkAttendance: () => void;
  onBack: () => void;
}) {
  const project = primaryProject;
  const corridor = project.corridor;
  const lastAttendance =
    trackingSnapshot?.attendance.find((item) => item.mobileUserId === currentUser?.id) ?? null;
  const canMark = currentUser?.role !== "client" && currentUser?.role !== "finance";

  return (
    <section className="px-4 pb-10 pt-7 sm:px-6">
      <BackToDashboard onBack={onBack} />
      <div className="rounded-[24px] border border-slate-200 bg-white p-6 shadow-sm">
        <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[#115cff]">
          GPS Attendance
        </p>
        <h1 className="mt-2 text-3xl font-bold tracking-normal text-[#07122f]">
          Mark attendance with live location
        </h1>
        <p className="mt-3 text-sm leading-7 text-slate-500">
          Location is requested only when you tap the attendance button. No continuous tracking
          runs after logout. The saved mark will appear on the admin live map for this corridor.
        </p>

        <div className="mt-6 overflow-hidden rounded-[24px] border border-slate-200">
          <LiveMap
            compact
            satellite
            focusProjectId={project.id}
            trackedPoints={trackingSnapshot?.locations ?? []}
            projectsData={projectPortfolio}
            className="h-[360px] rounded-none border-0"
          />
        </div>

        <div className="mt-5 grid gap-3 md:grid-cols-4">
          <MiniMetric
            label="Project"
            value={project.code}
            detail={corridor ? `${corridor.startLabel} to ${corridor.endLabel}` : project.name}
          />
          <MiniMetric
            label="Geofence"
            value={corridor ? formatMeters(corridor.geofenceMeters) : "120 m"}
            detail="Measured from the corridor start"
          />
          <MiniMetric
            label="Last Mark"
            value={lastAttendance ? formatNotificationTime(lastAttendance.checkInAt) : "Not marked"}
            detail={lastAttendance ? `${lastAttendance.distanceFromSiteM} m from site start` : "No attendance saved yet"}
          />
          <MiniMetric
            label="Role"
            value={formatRoleLabel(currentUser?.role ?? "engineer")}
            detail="Attendance is saved against this mobile account"
          />
        </div>

        {trackingError ? (
          <div className="mt-5 rounded-2xl border border-rose-100 bg-rose-50 px-4 py-4 text-sm text-rose-600">
            {trackingError}
          </div>
        ) : null}

        <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:items-center">
          <button
            type="button"
            onClick={onMarkAttendance}
            disabled={!canMark || attendanceSubmitting}
            className="inline-flex min-h-14 items-center justify-center rounded-2xl bg-[#115cff] px-6 text-sm font-semibold text-white shadow-[0_12px_28px_rgba(17,92,255,0.22)] disabled:cursor-not-allowed disabled:opacity-60"
          >
            {attendanceSubmitting ? "Capturing live location..." : "Mark Attendance Now"}
          </button>
          <p className="text-sm leading-6 text-slate-500">
            {canMark
              ? "Use this on site from the engineer device to create a real location mark."
              : "This role can review attendance but cannot create a field location mark."}
          </p>
        </div>

        <div className="mt-6 rounded-2xl border border-dashed border-slate-200 bg-slate-50 px-4 py-5">
          <p className="text-sm font-semibold text-[#07122f]">
            {trackingLoading ? "Loading live attendance history..." : "Recent attendance marks"}
          </p>
          <div className="mt-4 space-y-3">
            {(trackingSnapshot?.attendance ?? []).slice(0, 6).map((item) => (
              <div key={item.id} className="rounded-2xl border border-white bg-white px-4 py-4">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-sm font-semibold text-[#07122f]">
                      {item.userName} @{item.userLoginId}
                    </p>
                    <p className="mt-1 text-sm text-slate-500">
                      {item.projectName} · {item.distanceFromSiteM} m from site start
                    </p>
                  </div>
                  <span
                    className={cn(
                      "rounded-full px-3 py-1 text-xs font-semibold",
                      item.withinGeofence
                        ? "bg-emerald-50 text-[#14b866]"
                        : "bg-amber-50 text-[#ff8a00]"
                    )}
                  >
                    {item.withinGeofence ? "Within geofence" : "Outside geofence"}
                  </span>
                </div>
              </div>
            ))}

            {!trackingLoading && !(trackingSnapshot?.attendance.length ?? 0) ? (
              <p className="text-sm text-slate-500">
                No attendance marks yet. Use the engineer role and tap the attendance button once on site.
              </p>
            ) : null}
          </div>
        </div>
      </div>
    </section>
  );
}

function LiveTrackingModuleView({
  currentUser,
  primaryProject,
  projectPortfolio,
  trackingSnapshot,
  trackingLoading,
  trackingError,
  onBack
}: {
  currentUser: AppUser | null;
  primaryProject: Project;
  projectPortfolio: Project[];
  trackingSnapshot: MobileTrackingSnapshot | null;
  trackingLoading: boolean;
  trackingError: string;
  onBack: () => void;
}) {
  const project = primaryProject;
  const allLocations = trackingSnapshot?.locations ?? [];
  const [selectedUserId, setSelectedUserId] = useState<string>("all");
  const trackedPeople = Array.from(
    new Map(allLocations.map((item) => [item.mobileUserId, item])).values()
  );
  const locations =
    selectedUserId === "all"
      ? allLocations
      : allLocations.filter((location) => location.mobileUserId === selectedUserId);
  const selectedPerson =
    selectedUserId === "all"
      ? null
      : trackedPeople.find((item) => item.mobileUserId === selectedUserId) ?? null;

  return (
    <section className="px-4 pb-10 pt-7 sm:px-6">
      <BackToDashboard onBack={onBack} />
      <div className="rounded-[24px] border border-slate-200 bg-white p-6 shadow-sm">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[#115cff]">
              Live Tracking
            </p>
            <h1 className="mt-2 text-3xl font-bold tracking-normal text-[#07122f]">
              {selectedPerson ? `${selectedPerson.userName} live tracking` : "Real engineer location map"}
            </h1>
            <p className="mt-3 max-w-[760px] text-sm leading-7 text-slate-500">
              Engineer attendance marks are shown here against the mapped work corridors. Admin and supervisor roles can see all recent marks, then isolate one logged person at a time from the live user strip below.
            </p>
          </div>
          <a
            href={getGoogleMapsDirectionsUrl(project)}
            target="_blank"
            rel="noreferrer"
            className="inline-flex min-h-11 items-center justify-center rounded-full border border-blue-100 bg-blue-50 px-4 text-sm font-semibold text-[#115cff]"
          >
            Open route in Google Maps
          </a>
        </div>

        <div className="mt-6 overflow-hidden rounded-[24px] border border-slate-200">
          <LiveMap
            satellite
            focusProjectId={project.id}
            trackedPoints={locations}
            projectsData={projectPortfolio}
            className="h-[520px] rounded-none border-0"
          />
        </div>

        {trackingSnapshot?.canViewAll ? (
          <div className="mt-5">
            <p className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">
              Logged people
            </p>
            <div className="mt-3 flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() => setSelectedUserId("all")}
                className={cn(
                  actionChipClass("blue"),
                  selectedUserId === "all" ? "ring-4 ring-blue-50" : ""
                )}
              >
                All logged people
              </button>
              {trackedPeople.map((person) => (
                <button
                  key={person.mobileUserId}
                  type="button"
                  onClick={() => setSelectedUserId(person.mobileUserId)}
                  className={cn(
                    actionChipClass("green"),
                    selectedUserId === person.mobileUserId ? "ring-4 ring-emerald-50" : ""
                  )}
                >
                  {person.userName}
                </button>
              ))}
            </div>
          </div>
        ) : null}

        {trackingError ? (
          <div className="mt-5 rounded-2xl border border-rose-100 bg-rose-50 px-4 py-4 text-sm text-rose-600">
            {trackingError}
          </div>
        ) : null}

        <div className="mt-5 grid gap-3 md:grid-cols-4">
          <MiniMetric
            label="Mode"
            value={selectedPerson ? "Single person" : trackingSnapshot?.canViewAll ? "All crew" : "My device"}
            detail={trackingSnapshot?.canViewAll ? "Admin / supervisor visibility" : "Engineer self-view"}
          />
          <MiniMetric
            label="Tracked points"
            value={String(locations.length)}
            detail="Latest saved marks on this corridor"
          />
          <MiniMetric
            label="Logged people"
            value={String(trackedPeople.length)}
            detail={selectedPerson ? `${selectedPerson.userName} isolated` : "Selectable below the map"}
          />
          <MiniMetric
            label="Viewer"
            value={formatRoleLabel(currentUser?.role ?? "engineer")}
            detail="Signed-in mobile account role"
          />
        </div>

        <div className="mt-6 rounded-2xl border border-dashed border-slate-200 bg-slate-50 px-4 py-5">
          <p className="text-sm font-semibold text-[#07122f]">
            {trackingLoading ? "Refreshing engineer markers..." : "Latest engineer marks"}
          </p>
          <div className="mt-4 space-y-3">
            {locations.map((location) => (
              <div key={location.id} className="rounded-2xl border border-white bg-white px-4 py-4">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-sm font-semibold text-[#07122f]">
                      {location.userName} @{location.userLoginId}
                    </p>
                    <p className="mt-1 text-sm text-slate-500">
                      {location.projectName} · {location.distanceFromSiteM} m from site start
                    </p>
                    <p className="mt-1 text-xs text-slate-400">
                      {new Date(location.recordedAt).toLocaleString("en-IN")}
                    </p>
                  </div>
                  <span
                    className={cn(
                      "rounded-full px-3 py-1 text-xs font-semibold",
                      location.withinGeofence
                        ? "bg-emerald-50 text-[#14b866]"
                        : "bg-amber-50 text-[#ff8a00]"
                    )}
                  >
                    {location.withinGeofence ? "Within geofence" : "Outside geofence"}
                  </span>
                </div>
              </div>
            ))}
            {!trackingLoading && locations.length === 0 ? (
              <p className="text-sm text-slate-500">
                No live engineer marks yet. Log into an engineer account and use Mark Attendance on site.
              </p>
            ) : null}
          </div>
        </div>
      </div>
    </section>
  );
}

function ProjectDetailsModuleView({
  currentUser,
  primaryProject,
  projectPortfolio,
  trackingSnapshot,
  trackingLoading,
  trackingError,
  projectEditor,
  onProjectEditorChange,
  onProjectPortfolioChange,
  onBack
}: {
  currentUser: AppUser | null;
  primaryProject: Project;
  projectPortfolio: Project[];
  trackingSnapshot: MobileTrackingSnapshot | null;
  trackingLoading: boolean;
  trackingError: string;
  projectEditor: ProjectEditorState | null;
  onProjectEditorChange: (
    updater: ProjectEditorState | null | ((current: ProjectEditorState | null) => ProjectEditorState | null)
  ) => void;
  onProjectPortfolioChange: (updater: Project[] | ((current: Project[]) => Project[])) => void;
  onBack: () => void;
}) {
  const canManageProjects = currentUser?.role === "admin";
  const [selectedProjectId, setSelectedProjectId] = useState(primaryProject.id);
  const project =
    projectPortfolio.find((item) => item.id === selectedProjectId) ??
    projectPortfolio[0] ??
    primaryProject;
  const corridor = project.corridor;
  const projectLocations =
    trackingSnapshot?.locations.filter((location) => location.projectId === project.id) ?? [];

  function openCreateProject() {
    onProjectEditorChange(makeProjectEditor());
  }

  function openEditProject(item: Project) {
    setSelectedProjectId(item.id);
    onProjectEditorChange(makeProjectEditor(item));
  }

  function removeProject(projectId: string) {
    onProjectPortfolioChange((current) => current.filter((item) => item.id !== projectId));
    onProjectEditorChange((current) => (current?.id === projectId ? null : current));
    if (selectedProjectId === projectId) {
      const nextFocus =
        projectPortfolio.find((item) => item.id !== projectId)?.id ?? primaryProject.id;
      setSelectedProjectId(nextFocus);
    }
  }

  function saveProject() {
    if (!projectEditor) return;

    const totalLengthKm = Math.max(0, Number(projectEditor.totalLengthKm || 0));
    const completedKm = Math.max(0, Number(projectEditor.completedKm || 0));
    const progress =
      totalLengthKm > 0 ? Math.min(100, Math.round((completedKm / totalLengthKm) * 100)) : 0;
    const existingProject = projectPortfolio.find((item) => item.id === projectEditor.id) ?? null;
    const projectSlug = `${projectEditor.code || projectEditor.name || "project"}`
      .trim()
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "");
    const nextProjectId =
      existingProject?.id ??
      (projectSlug ? projectSlug : crypto.randomUUID());

    onProjectPortfolioChange((current) => {
      const anchorBase = existingProject?.coordinates ?? [
        primaryProject.coordinates[0] + (current.length + 1) * 0.018,
        primaryProject.coordinates[1] + (current.length + 1) * 0.01
      ];

      const nextProject: Project = {
        id: nextProjectId,
        code: projectEditor.code.trim() || `TLGO-PRJ-${Date.now().toString().slice(-6)}`,
        name: projectEditor.name.trim() || "Untitled Project",
        type: existingProject?.type ?? "Utility Corridor",
        location: projectEditor.location.trim() || "Kerala",
        client: existingProject?.client ?? "Client not assigned",
        image: existingProject?.image ?? primaryProject.image,
        status: projectEditor.status,
        progress,
        budget: existingProject?.budget ?? 0,
        spent: existingProject?.spent ?? 0,
        totalLengthKm,
        completedKm,
        startDate: existingProject?.startDate ?? new Date().toLocaleDateString("en-GB"),
        endDate: existingProject?.endDate ?? "To be scheduled",
        manager: existingProject?.manager ?? (currentUser?.name ?? "Admin"),
        siteInCharge: existingProject?.siteInCharge ?? (currentUser?.name ?? "Site In Charge"),
        coordinates: anchorBase as [number, number],
        accent: existingProject?.accent ?? "blue",
        corridor: existingProject?.corridor
          ? {
              ...existingProject.corridor,
              totalMeters: Math.round(totalLengthKm * 1000),
              completedMeters: Math.round(completedKm * 1000),
              progressUpdates: [
                {
                  id: `${existingProject.id}-manual-update`,
                  label: "Project record updated",
                  detail: `${completedKm} km completed and status set to ${projectEditor.status}.`,
                  recordedAt: new Date().toLocaleString("en-IN"),
                  metersCompleted: Math.round(completedKm * 1000)
                },
                ...existingProject.corridor.progressUpdates.slice(0, 2)
              ]
            }
          : {
              startLabel: `${projectEditor.location.trim() || "Route"} start`,
              endLabel: `${projectEditor.location.trim() || "Route"} end`,
              startCoordinates: [anchorBase[0] - 0.008, anchorBase[1] - 0.004],
              endCoordinates: [anchorBase[0] + 0.008, anchorBase[1] + 0.004],
              totalMeters: Math.round(totalLengthKm * 1000),
              completedMeters: Math.round(completedKm * 1000),
              geofenceMeters: 150,
              progressUpdates: [
                {
                  id: `${projectEditor.code || "project"}-seed-update`,
                  label: "Initial project entry",
                  detail: `${completedKm} km recorded under ${projectEditor.status} status.`,
                  recordedAt: new Date().toLocaleString("en-IN"),
                  metersCompleted: Math.round(completedKm * 1000)
                }
              ]
            }
      };

      if (existingProject) {
        return current.map((item) => (item.id === nextProject.id ? nextProject : item));
      }

      return [nextProject, ...current];
    });

    setSelectedProjectId(nextProjectId);
    onProjectEditorChange(null);
  }

  return (
    <section className="px-4 pb-10 pt-7 sm:px-6">
      <BackToDashboard onBack={onBack} />
      <div className="rounded-[24px] border border-slate-200 bg-white p-6 shadow-sm">
        <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[#115cff]">
          Projects
        </p>
        <div className="mt-2 flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-normal text-[#07122f]">
              All live work packages
            </h1>
            <p className="mt-3 max-w-[760px] text-sm leading-7 text-slate-500">
              See every seeded project, open the live corridor map, add or edit work packages, and
              keep progress, permission blockers, and client-facing status in one controlled view.
            </p>
          </div>
          <div className="flex flex-wrap gap-3">
            {canManageProjects ? (
              <button
                type="button"
                onClick={openCreateProject}
                className="inline-flex min-h-11 items-center justify-center rounded-full bg-[#115cff] px-5 text-sm font-semibold text-white shadow-[0_12px_28px_rgba(17,92,255,0.22)]"
              >
                Add project
              </button>
            ) : null}
            <a
              href={getGoogleMapsDirectionsUrl(project)}
              target="_blank"
              rel="noreferrer"
              className="inline-flex min-h-11 items-center justify-center rounded-full border border-blue-100 bg-blue-50 px-4 text-sm font-semibold text-[#115cff]"
            >
              Open route in Google Maps
            </a>
          </div>
        </div>

        <div className="mt-5 grid gap-3 md:grid-cols-4">
          <MiniMetric
            label="Projects"
            value={String(projectPortfolio.length)}
            detail="Live seeded work packages"
          />
          <MiniMetric
            label="Completed"
            value={String(projectPortfolio.filter((item) => item.status === "Completed").length)}
            detail="Projects closed out"
          />
          <MiniMetric
            label="Permission holds"
            value={String(projectPortfolio.filter((item) => item.status === "Delayed").length)}
            detail="PWD or approval blockers"
          />
          <MiniMetric
            label="Tracked crew"
            value={String(projectLocations.length)}
            detail={trackingLoading ? "Refreshing live marks" : "Recent marks on selected project"}
          />
        </div>

        <div className="mt-6 overflow-hidden rounded-[24px] border border-slate-200">
          <LiveMap
            satellite
            compact
            focusProjectId={project.id}
            trackedPoints={projectLocations}
            projectsData={projectPortfolio}
            className="h-[420px] rounded-none border-0"
          />
        </div>

        {trackingError ? (
          <div className="mt-5 rounded-2xl border border-rose-100 bg-rose-50 px-4 py-4 text-sm text-rose-600">
            {trackingError}
          </div>
        ) : null}

        <div className="mt-6 rounded-2xl border border-dashed border-slate-200 bg-slate-50 px-4 py-5">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
            <div>
              <p className="text-sm font-semibold text-[#07122f]">
                {trackingLoading ? "Refreshing selected project..." : "Selected project focus"}
              </p>
              <p className="mt-2 text-sm leading-6 text-slate-500">
                {project.type} - {project.location} - {project.client}
              </p>
              <p className="mt-2 text-sm leading-6 text-slate-500">
                {corridor?.progressUpdates[0]?.detail ??
                  "Project progress updates will appear here as engineers submit live field work."}
              </p>
            </div>
            <span className={statusChipClass(project.status)}>{project.status}</span>
          </div>
          <div className="mt-4 grid gap-3 md:grid-cols-4">
            <MiniMetric
              label="Completed"
              value={formatMeters(getProgressMeters(project))}
              detail={`${project.progress}% corridor completion`}
            />
            <MiniMetric
              label="Remaining"
              value={formatMeters(getRemainingMeters(project))}
              detail="Balance corridor still open"
            />
            <MiniMetric
              label="Geofence"
              value={corridor ? formatMeters(corridor.geofenceMeters) : "120 m"}
              detail="Attendance check radius"
            />
            <MiniMetric label="Project code" value={project.code} detail={project.manager} />
          </div>
        </div>

        {canManageProjects && projectEditor ? (
          <div className="mt-6 rounded-[24px] border border-slate-200 bg-slate-50 p-5">
            <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[#115cff]">
                  {projectEditor.mode === "create" ? "New project" : "Edit project"}
                </p>
                <h2 className="mt-2 text-2xl font-bold tracking-normal text-[#07122f]">
                  {projectEditor.mode === "create"
                    ? "Add a new live work package"
                    : `Update ${projectEditor.name || "project"}`}
                </h2>
              </div>
              <button
                type="button"
                onClick={() => onProjectEditorChange(null)}
                className="inline-flex min-h-11 items-center justify-center rounded-full border border-slate-200 bg-white px-4 text-sm font-semibold text-slate-700"
              >
                Cancel
              </button>
            </div>

            <div className="mt-5 grid gap-4 md:grid-cols-2">
              <label className="block">
                <span className="mb-2 block text-sm font-semibold text-slate-700">Project name</span>
                <input
                  value={projectEditor.name}
                  onChange={(event) =>
                    onProjectEditorChange((current) =>
                      current ? { ...current, name: event.target.value } : current
                    )
                  }
                  className="min-h-14 w-full rounded-xl border border-slate-200 px-4 text-sm outline-none focus:border-[#115cff] focus:ring-4 focus:ring-blue-50"
                />
              </label>
              <label className="block">
                <span className="mb-2 block text-sm font-semibold text-slate-700">Project code</span>
                <input
                  value={projectEditor.code}
                  onChange={(event) =>
                    onProjectEditorChange((current) =>
                      current ? { ...current, code: event.target.value } : current
                    )
                  }
                  className="min-h-14 w-full rounded-xl border border-slate-200 px-4 text-sm outline-none focus:border-[#115cff] focus:ring-4 focus:ring-blue-50"
                />
              </label>
              <label className="block">
                <span className="mb-2 block text-sm font-semibold text-slate-700">Location</span>
                <input
                  value={projectEditor.location}
                  onChange={(event) =>
                    onProjectEditorChange((current) =>
                      current ? { ...current, location: event.target.value } : current
                    )
                  }
                  className="min-h-14 w-full rounded-xl border border-slate-200 px-4 text-sm outline-none focus:border-[#115cff] focus:ring-4 focus:ring-blue-50"
                />
              </label>
              <label className="block">
                <span className="mb-2 block text-sm font-semibold text-slate-700">Status</span>
                <select
                  value={projectEditor.status}
                  onChange={(event) =>
                    onProjectEditorChange((current) =>
                      current
                        ? { ...current, status: event.target.value as ProjectEditorState["status"] }
                        : current
                    )
                  }
                  className="min-h-14 w-full rounded-xl border border-slate-200 px-4 text-sm outline-none focus:border-[#115cff] focus:ring-4 focus:ring-blue-50"
                >
                  {projectStatusOptions.map((status) => (
                    <option key={status} value={status}>
                      {status}
                    </option>
                  ))}
                </select>
              </label>
              <label className="block">
                <span className="mb-2 block text-sm font-semibold text-slate-700">Total length (km)</span>
                <input
                  value={projectEditor.totalLengthKm}
                  onChange={(event) =>
                    onProjectEditorChange((current) =>
                      current ? { ...current, totalLengthKm: event.target.value } : current
                    )
                  }
                  inputMode="decimal"
                  className="min-h-14 w-full rounded-xl border border-slate-200 px-4 text-sm outline-none focus:border-[#115cff] focus:ring-4 focus:ring-blue-50"
                />
              </label>
              <label className="block">
                <span className="mb-2 block text-sm font-semibold text-slate-700">Completed (km)</span>
                <input
                  value={projectEditor.completedKm}
                  onChange={(event) =>
                    onProjectEditorChange((current) =>
                      current ? { ...current, completedKm: event.target.value } : current
                    )
                  }
                  inputMode="decimal"
                  className="min-h-14 w-full rounded-xl border border-slate-200 px-4 text-sm outline-none focus:border-[#115cff] focus:ring-4 focus:ring-blue-50"
                />
              </label>
            </div>

            <div className="mt-5 flex flex-wrap gap-3">
              <button
                type="button"
                onClick={saveProject}
                className="inline-flex min-h-11 items-center justify-center rounded-full bg-[#115cff] px-5 text-sm font-semibold text-white shadow-[0_12px_28px_rgba(17,92,255,0.22)]"
              >
                Save project
              </button>
              <button
                type="button"
                onClick={() => onProjectEditorChange(null)}
                className="inline-flex min-h-11 items-center justify-center rounded-full border border-slate-200 bg-white px-5 text-sm font-semibold text-slate-700"
              >
                Close editor
              </button>
            </div>
          </div>
        ) : null}

        <div className="mt-6 space-y-4">
          {projectPortfolio.map((item) => {
            const itemCorridor = item.corridor;
            const isSelected = item.id === project.id;
            return (
              <article
                key={item.id}
                className={cn(
                  "rounded-[24px] border px-5 py-5 transition",
                  isSelected ? "border-blue-200 bg-blue-50/40" : "border-slate-200 bg-white"
                )}
              >
                <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                  <div className="max-w-[760px]">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="text-base font-bold text-[#07122f]">{item.name}</p>
                      <span className={statusChipClass(item.status)}>{item.status}</span>
                    </div>
                    <p className="mt-2 text-sm leading-6 text-slate-500">
                      {item.location} - {item.client}
                    </p>
                    <p className="mt-2 text-sm leading-6 text-slate-500">
                      {itemCorridor?.progressUpdates[0]?.detail ?? "No progress note yet."}
                    </p>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <button
                      type="button"
                      onClick={() => setSelectedProjectId(item.id)}
                      className={actionChipClass("blue")}
                    >
                      {isSelected ? "Focused on map" : "Show on map"}
                    </button>
                    {canManageProjects ? (
                      <>
                        <button
                          type="button"
                          onClick={() => openEditProject(item)}
                          className={actionChipClass("green")}
                        >
                          Edit project
                        </button>
                        <button
                          type="button"
                          onClick={() => removeProject(item.id)}
                          className={actionChipClass("red")}
                        >
                          Remove
                        </button>
                      </>
                    ) : null}
                  </div>
                </div>
                <div className="mt-4 grid gap-3 md:grid-cols-4">
                  <MiniMetric
                    label="Length"
                    value={`${item.totalLengthKm.toFixed(1)} km`}
                    detail={item.code}
                  />
                  <MiniMetric
                    label="Completed"
                    value={`${item.completedKm.toFixed(1)} km`}
                    detail={`${item.progress}% progress`}
                  />
                  <MiniMetric
                    label="Manager"
                    value={item.manager}
                    detail={item.siteInCharge}
                  />
                  <MiniMetric
                    label="Geofence"
                    value={itemCorridor ? formatMeters(itemCorridor.geofenceMeters) : "150 m"}
                    detail={itemCorridor?.endLabel ?? "Route end pending"}
                  />
                </div>
              </article>
            );
          })}
        </div>
      </div>
    </section>
  );
}

function AdminDashboardModuleView({
  projectPortfolio,
  trackingSnapshot,
  pendingApprovals,
  yesterdayReports,
  accessDirectory,
  onOpenModule,
  onBack
}: {
  projectPortfolio: Project[];
  trackingSnapshot: MobileTrackingSnapshot | null;
  pendingApprovals: PendingApprovalRequest[];
  yesterdayReports: YesterdayReportItem[];
  accessDirectory: AccessDirectoryEntry[];
  onOpenModule: (title: string) => void;
  onBack: () => void;
}) {
  return (
    <section className="px-4 pb-10 pt-7 sm:px-6">
      <BackToDashboard onBack={onBack} />
      <div className="rounded-[24px] border border-slate-200 bg-white p-6 shadow-sm">
        <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[#115cff]">
          Admin Dashboard
        </p>
        <h1 className="mt-2 text-3xl font-bold tracking-normal text-[#07122f]">
          Premium operations control room
        </h1>
        <p className="mt-3 text-sm leading-7 text-slate-500">
          This admin layer keeps all projects, approvals, live field presence, access control,
          and client visibility inside one mobile-first command center.
        </p>

        <div className="mt-6 overflow-hidden rounded-[24px] border border-slate-200">
          <LiveMap
            satellite
            trackedPoints={trackingSnapshot?.locations ?? []}
            projectsData={projectPortfolio}
            className="h-[520px] rounded-none border-0"
          />
        </div>

        <div className="mt-5 grid gap-3 md:grid-cols-4">
          <MiniMetric label="Projects" value={String(projectPortfolio.length)} detail="Seeded live portfolio" />
          <MiniMetric
            label="Active access"
            value={String(accessDirectory.filter((entry) => entry.accessStatus === "active").length)}
            detail="Approved mobile users"
          />
          <MiniMetric
            label="Pending approvals"
            value={String(pendingApprovals.filter((item) => item.status === "pending").length)}
            detail="Access, leave, and report queue"
          />
          <MiniMetric
            label="Yesterday reports"
            value={String(yesterdayReports.length)}
            detail="Latest field submissions"
          />
        </div>

        <div className="mt-6 grid gap-3 md:grid-cols-2 xl:grid-cols-5">
          {[
            {
              title: "Projects",
              detail: "See status, add work packages, and edit corridor progress.",
              moduleTitle: "Projects"
            },
            {
              title: "Live Tracking",
              detail: "Open the common map and isolate one logged person.",
              moduleTitle: "Live Tracking"
            },
            {
              title: "Company Access",
              detail: "Control email, role, PIN reset, and access removal.",
              moduleTitle: "Company Access"
            },
            {
              title: "Pending Approval",
              detail: "Approve or reject access, leave, and report requests.",
              moduleTitle: "Pending Approval"
            },
            {
              title: "Yesterday Reports",
              detail: "Review the last submitted field reports quickly.",
              moduleTitle: "Yesterday Reports"
            }
          ].map((action) => (
            <button
              key={action.title}
              type="button"
              onClick={() => onOpenModule(action.moduleTitle)}
              className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-4 text-left transition hover:border-blue-200 hover:bg-white"
            >
              <p className="text-sm font-bold text-[#07122f]">{action.title}</p>
              <p className="mt-2 text-sm leading-6 text-slate-500">{action.detail}</p>
            </button>
          ))}
        </div>

        <div className="mt-6 grid gap-4 xl:grid-cols-[1.2fr_0.8fr]">
          <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-5">
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="text-sm font-semibold text-[#07122f]">All project status</p>
                <p className="mt-1 text-sm text-slate-500">
                  The admin overview keeps every corridor and its current work condition visible.
                </p>
              </div>
              <button
                type="button"
                onClick={() => onOpenModule("Projects")}
                className="inline-flex min-h-10 items-center justify-center rounded-full border border-blue-100 bg-blue-50 px-4 text-sm font-semibold text-[#115cff]"
              >
                Open projects
              </button>
            </div>
            <div className="mt-4 space-y-3">
              {projectPortfolio.map((project) => (
                <div key={project.id} className="rounded-2xl border border-white bg-white px-4 py-4">
                  <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
                    <div>
                      <div className="flex flex-wrap items-center gap-2">
                        <p className="text-sm font-bold text-[#07122f]">{project.name}</p>
                        <span className={statusChipClass(project.status)}>{project.status}</span>
                      </div>
                      <p className="mt-1 text-sm text-slate-500">
                        {project.location} - {project.completedKm.toFixed(1)} km / {project.totalLengthKm.toFixed(1)} km
                      </p>
                    </div>
                    <p className="text-sm font-semibold text-[#115cff]">{project.progress}% complete</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-5">
            <p className="text-sm font-semibold text-[#07122f]">Logged people now</p>
            <p className="mt-1 text-sm text-slate-500">
              Selecting live tracking opens the common map, then you can isolate one person.
            </p>
            <div className="mt-4 space-y-3">
              {(trackingSnapshot?.locations ?? []).slice(0, 6).map((location) => (
                <div key={location.id} className="rounded-2xl border border-white bg-white px-4 py-4">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="text-sm font-bold text-[#07122f]">{location.userName}</p>
                      <p className="mt-1 text-sm text-slate-500">
                        {location.projectName} - {location.distanceFromSiteM} m from site start
                      </p>
                    </div>
                    <span
                      className={cn(
                        "rounded-full px-3 py-1 text-xs font-semibold",
                        location.withinGeofence
                          ? "bg-emerald-50 text-[#14b866]"
                          : "bg-amber-50 text-[#ff8a00]"
                      )}
                    >
                      {location.withinGeofence ? "Live" : "Outside"}
                    </span>
                  </div>
                </div>
              ))}
              {(trackingSnapshot?.locations.length ?? 0) === 0 ? (
                <div className="rounded-2xl border border-dashed border-slate-200 bg-white px-4 py-5">
                  <p className="text-sm font-semibold text-[#07122f]">No live attendance marks yet</p>
                  <p className="mt-2 text-sm leading-6 text-slate-500">
                    Once an engineer marks attendance from the field, the point will appear here and on the common map.
                  </p>
                </div>
              ) : null}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

function CompanyAccessModuleView({
  accessDirectory,
  projectPortfolio,
  onAccessDirectoryChange,
  onBack
}: {
  accessDirectory: AccessDirectoryEntry[];
  projectPortfolio: Project[];
  onAccessDirectoryChange: (
    updater: AccessDirectoryEntry[] | ((current: AccessDirectoryEntry[]) => AccessDirectoryEntry[])
  ) => void;
  onBack: () => void;
}) {
  const [assignmentDrafts, setAssignmentDrafts] = useState<Record<string, string>>({});

  function cycleRole(id: string) {
    const roles: AccessRole[] = ["admin", "supervisor", "engineer", "client", "finance"];
    onAccessDirectoryChange((current) =>
      current.map((entry) => {
        if (entry.id !== id) return entry;
        const nextRole = roles[(roles.indexOf(resolveAccessRole(entry.role)) + 1) % roles.length];
        return { ...entry, role: nextRole };
      })
    );
  }

  function resetPin(id: string) {
    onAccessDirectoryChange((current) =>
      current.map((entry) => (entry.id === id ? { ...entry, pinStatus: "reset_required" } : entry))
    );
  }

  function removeAccess(id: string) {
    onAccessDirectoryChange((current) =>
      current.map((entry) =>
        entry.id === id ? { ...entry, accessStatus: "blocked", pinStatus: "removed" } : entry
      )
    );
  }

  function assignProject(id: string) {
    const selectedProjectId = assignmentDrafts[id];
    if (!selectedProjectId) return;
    onAccessDirectoryChange((current) =>
      current.map((entry) =>
        entry.id === id ? { ...entry, assignedProjectIds: [selectedProjectId] } : entry
      )
    );
  }

  return (
    <section className="px-4 pb-10 pt-7 sm:px-6">
      <BackToDashboard onBack={onBack} />
      <div className="rounded-[24px] border border-slate-200 bg-white p-6 shadow-sm">
        <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[#115cff]">Company Access</p>
        <h1 className="mt-2 text-3xl font-bold tracking-normal text-[#07122f]">
          Approved users and access control
        </h1>
        <div className="mt-6 space-y-4">
          {accessDirectory.map((entry) => (
            <div key={entry.id} className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-4">
              <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                <div>
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="text-sm font-bold text-[#07122f]">{entry.name}</p>
                    <span className={statusChipClass(entry.accessStatus === "active" ? "Active" : "Delayed")}>
                      {entry.accessStatus}
                    </span>
                  </div>
                  <p className="mt-1 text-sm text-slate-500">
                    {entry.designation} - {entry.email}
                  </p>
                  <p className="mt-1 text-sm text-slate-500">
                    {entry.phone} - PIN {entry.pinStatus.replace("_", " ")} - Last seen {entry.lastSeen}
                  </p>
                  <p className="mt-1 text-sm text-slate-500">
                    Assigned project:{" "}
                    {entry.assignedProjectIds
                      .map(
                        (projectId) =>
                          projectPortfolio.find((item) => item.id === projectId)?.name ?? projectId
                      )
                      .join(", ") || "No project assigned"}
                  </p>
                </div>
                <div className="flex max-w-[420px] flex-wrap gap-2">
                  <button type="button" onClick={() => cycleRole(entry.id)} className={actionChipClass("blue")}>
                    Change role
                  </button>
                  <button type="button" onClick={() => resetPin(entry.id)} className={actionChipClass("orange")}>
                    Reset PIN
                  </button>
                  <button type="button" onClick={() => removeAccess(entry.id)} className={actionChipClass("red")}>
                    Remove access
                  </button>
                  <select
                    value={assignmentDrafts[entry.id] ?? entry.assignedProjectIds[0] ?? ""}
                    onChange={(event) =>
                      setAssignmentDrafts((current) => ({
                        ...current,
                        [entry.id]: event.target.value
                      }))
                    }
                    className="min-h-11 rounded-full border border-slate-200 bg-white px-4 text-sm font-semibold text-slate-700 outline-none focus:border-[#115cff]"
                  >
                    <option value="">Select project</option>
                    {projectPortfolio.map((project) => (
                      <option key={project.id} value={project.id}>
                        {project.name}
                      </option>
                    ))}
                  </select>
                  <button
                    type="button"
                    onClick={() => assignProject(entry.id)}
                    className={actionChipClass("green")}
                  >
                    Assign project
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

function SupervisorDashboardModuleView({
  currentUser,
  primaryProject,
  trackingSnapshot,
  pendingApprovals,
  yesterdayReports,
  leaveRequests,
  engineerTasks,
  onOpenModule,
  onBack
}: {
  currentUser: AppUser | null;
  primaryProject: Project;
  trackingSnapshot: MobileTrackingSnapshot | null;
  pendingApprovals: PendingApprovalRequest[];
  yesterdayReports: YesterdayReportItem[];
  leaveRequests: LeaveRequestItem[];
  engineerTasks: EngineerTaskItem[];
  onOpenModule: (title: string) => void;
  onBack: () => void;
}) {
  const liveCount = new Set((trackingSnapshot?.locations ?? []).map((entry) => entry.mobileUserId)).size;
  const pendingLeaveCount = leaveRequests.filter((entry) => entry.status === "pending").length;
  const pendingReportCount = yesterdayReports.filter((entry) => entry.status === "pending_review").length;

  return (
    <section className="px-4 pb-10 pt-7 sm:px-6">
      <BackToDashboard onBack={onBack} />
      <div className="rounded-[24px] border border-slate-200 bg-white p-6 shadow-sm">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[#115cff]">Supervisor Dashboard</p>
            <h1 className="mt-2 text-3xl font-bold tracking-normal text-[#07122f]">Site supervision control board</h1>
            <p className="mt-3 max-w-[760px] text-sm leading-7 text-slate-500">
              Control field attendance, live engineers, leave requests, daily reports, and site blockers without exposing the full admin access layer.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <button type="button" onClick={() => onOpenModule("Live Tracking")} className={actionChipClass("blue")}>
              Open live map
            </button>
            <button type="button" onClick={() => onOpenModule("Yesterday Reports")} className={actionChipClass("green")}>
              Open reports
            </button>
          </div>
        </div>

        <div className="mt-5 grid gap-3 md:grid-cols-4">
          <MiniMetric label="Assigned project" value={primaryProject.code} detail={primaryProject.name} />
          <MiniMetric label="Live engineers" value={String(liveCount)} detail="Attendance-based live count" />
          <MiniMetric label="Pending leave" value={String(pendingLeaveCount)} detail="Awaiting supervisor review" />
          <MiniMetric label="Pending reports" value={String(pendingReportCount)} detail="Field uploads waiting check" />
        </div>

        <div className="mt-6 grid gap-4 xl:grid-cols-[1.15fr_0.85fr]">
          <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-5">
            <p className="text-sm font-semibold text-[#07122f]">Supervisor quick board</p>
            <div className="mt-4 space-y-3">
              {[
                {
                  title: "Live Tracking",
                  detail: "See all logged people and isolate one engineer on the common map."
                },
                {
                  title: "Monthly Attendance",
                  detail: "Review attendance marks and leave history for the field team."
                },
                {
                  title: "Leave Requests",
                  detail: "Approve or reject new leave requests from engineers."
                },
                {
                  title: "Assigned Tasks",
                  detail: "Follow the tasks that admin pushed for today's execution."
                }
              ].map((item) => (
                <button
                  key={item.title}
                  type="button"
                  onClick={() => onOpenModule(item.title)}
                  className="w-full rounded-2xl border border-white bg-white px-4 py-4 text-left transition hover:border-blue-200"
                >
                  <p className="text-sm font-bold text-[#07122f]">{item.title}</p>
                  <p className="mt-2 text-sm leading-6 text-slate-500">{item.detail}</p>
                </button>
              ))}
            </div>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-5">
            <p className="text-sm font-semibold text-[#07122f]">Supervisor workflow snapshot</p>
            <div className="mt-4 space-y-3">
              <div className="rounded-2xl border border-white bg-white px-4 py-4">
                <p className="text-sm font-bold text-[#07122f]">Current viewer</p>
                <p className="mt-2 text-sm text-slate-500">{currentUser?.name ?? "Supervisor"} - {primaryProject.location}</p>
              </div>
              <div className="rounded-2xl border border-white bg-white px-4 py-4">
                <p className="text-sm font-bold text-[#07122f]">Approvals waiting</p>
                <p className="mt-2 text-sm text-slate-500">
                  {pendingApprovals.filter((entry) => entry.status === "pending").length} requests are still waiting in the shared queue.
                </p>
              </div>
              <div className="rounded-2xl border border-white bg-white px-4 py-4">
                <p className="text-sm font-bold text-[#07122f]">Task follow-up</p>
                <p className="mt-2 text-sm text-slate-500">
                  {engineerTasks.length} seeded tasks are available to supervise today.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

function PendingApprovalModuleView({
  pendingApprovals,
  onPendingApprovalsChange,
  onBack
}: {
  pendingApprovals: PendingApprovalRequest[];
  onPendingApprovalsChange: (
    updater:
      | PendingApprovalRequest[]
      | ((current: PendingApprovalRequest[]) => PendingApprovalRequest[])
  ) => void;
  onBack: () => void;
}) {
  function updateApproval(id: string, status: PendingApprovalRequest["status"]) {
    onPendingApprovalsChange((current) =>
      current.map((item) => (item.id === id ? { ...item, status } : item))
    );
  }

  return (
    <section className="px-4 pb-10 pt-7 sm:px-6">
      <BackToDashboard onBack={onBack} />
      <div className="rounded-[24px] border border-slate-200 bg-white p-6 shadow-sm">
        <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[#115cff]">Pending Approval</p>
        <h1 className="mt-2 text-3xl font-bold tracking-normal text-[#07122f]">Approval queue</h1>
        <div className="mt-6 space-y-4">
          {pendingApprovals.map((item) => (
            <div key={item.id} className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-4">
              <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                <div>
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="text-sm font-bold text-[#07122f]">{item.requesterName}</p>
                    <span className={statusChipClass(item.status === "pending" ? "Delayed" : item.status === "approved" ? "Completed" : "At Risk")}>
                      {item.status}
                    </span>
                  </div>
                  <p className="mt-1 text-sm text-slate-500">
                    {item.requestedRole} - {item.projectName} - {item.submittedAt}
                  </p>
                  <p className="mt-2 text-sm leading-6 text-slate-500">{item.reason}</p>
                </div>
                {item.status === "pending" ? (
                  <div className="flex flex-wrap gap-2">
                    <button type="button" onClick={() => updateApproval(item.id, "approved")} className={actionChipClass("green")}>
                      Approve
                    </button>
                    <button type="button" onClick={() => updateApproval(item.id, "rejected")} className={actionChipClass("red")}>
                      Reject
                    </button>
                  </div>
                ) : null}
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

function YesterdayReportsModuleView({
  reports,
  onBack
}: {
  reports: YesterdayReportItem[];
  onBack: () => void;
}) {
  return (
    <section className="px-4 pb-10 pt-7 sm:px-6">
      <BackToDashboard onBack={onBack} />
      <div className="rounded-[24px] border border-slate-200 bg-white p-6 shadow-sm">
        <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[#115cff]">Yesterday Reports</p>
        <h1 className="mt-2 text-3xl font-bold tracking-normal text-[#07122f]">Yesterday's field submissions</h1>
        <div className="mt-6 space-y-4">
          {reports.map((report) => (
            <div key={report.id} className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-4">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-sm font-bold text-[#07122f]">{report.projectName}</p>
                  <p className="mt-1 text-sm text-slate-500">
                    {report.submittedBy} - {report.role} - {report.submittedAt}
                  </p>
                </div>
                <span className={statusChipClass(report.status === "approved" ? "Completed" : report.status === "synced" ? "On Track" : "Delayed")}>
                  {report.status}
                </span>
              </div>
              <p className="mt-3 text-sm leading-6 text-slate-600">{report.summary}</p>
              <div className="mt-3 grid grid-cols-2 gap-3 text-sm text-slate-500 md:grid-cols-4">
                <div>Progress: {report.progressText}</div>
                <div>Images: {report.imageCount}</div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

function EngineerDashboardModuleView({
  currentUser,
  primaryProject,
  currentTasks,
  leaveRequests,
  trackingSnapshot,
  onOpenModule,
  onOpenProfile,
  onOpenChat,
  onBack
}: {
  currentUser: AppUser | null;
  primaryProject: Project;
  currentTasks: EngineerTaskItem[];
  leaveRequests: LeaveRequestItem[];
  trackingSnapshot: MobileTrackingSnapshot | null;
  onOpenModule: (title: string) => void;
  onOpenProfile: () => void;
  onOpenChat: () => void;
  onBack: () => void;
}) {
  return (
    <section className="px-4 pb-10 pt-7 sm:px-6">
      <BackToDashboard onBack={onBack} />
      <div className="rounded-[24px] border border-slate-200 bg-white p-6 shadow-sm">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[#115cff]">Engineer Dashboard</p>
            <h1 className="mt-2 text-3xl font-bold tracking-normal text-[#07122f]">{primaryProject.name}</h1>
            <p className="mt-2 text-sm leading-6 text-slate-500">
              Assigned project heading for {currentUser?.name ?? "Engineer"} with attendance, tasks, live reports, and chat tied to the same corridor.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <button type="button" onClick={onOpenProfile} className={actionChipClass("blue")}>
              Edit profile
            </button>
            <button type="button" onClick={onOpenChat} className={actionChipClass("green")}>
              Open chat
            </button>
          </div>
        </div>

        <div className="mt-5 grid gap-3 md:grid-cols-4">
          <MiniMetric label="Assigned project" value={primaryProject.code} detail={primaryProject.location} />
          <MiniMetric label="Today's tasks" value={String(currentTasks.length)} detail={currentTasks[0]?.title ?? "No tasks assigned"} />
          <MiniMetric label="Leave requests" value={String(leaveRequests.length)} detail={leaveRequests[0]?.status ?? "No leave requests"} />
          <MiniMetric label="Attendance marks" value={String(trackingSnapshot?.attendance.length ?? 0)} detail="Recent live attendance entries" />
        </div>

        <div className="mt-6 grid gap-3 md:grid-cols-2 xl:grid-cols-4">
          {[
            { title: "Mark Attendance", detail: "Capture live GPS attendance on site." },
            { title: "Monthly Attendance", detail: "Review worked days and approved leave." },
            { title: "Assigned Tasks", detail: "See the tasks pushed for today." },
            { title: "Leave Requests", detail: "Request and track leave from mobile." }
          ].map((item) => (
            <button
              key={item.title}
              type="button"
              onClick={() => onOpenModule(item.title)}
              className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-4 text-left transition hover:border-blue-200 hover:bg-white"
            >
              <p className="text-sm font-bold text-[#07122f]">{item.title}</p>
              <p className="mt-2 text-sm leading-6 text-slate-500">{item.detail}</p>
            </button>
          ))}
        </div>

        <div className="mt-6 grid gap-4 xl:grid-cols-[1.1fr_0.9fr]">
          <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-5">
            <p className="text-sm font-semibold text-[#07122f]">Today's assigned tasks</p>
            <div className="mt-4 space-y-3">
              {currentTasks.length > 0 ? (
                currentTasks.map((task) => (
                  <div key={task.id} className="rounded-2xl border border-white bg-white px-4 py-4">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="text-sm font-bold text-[#07122f]">{task.title}</p>
                        <p className="mt-2 text-sm leading-6 text-slate-500">{task.detail}</p>
                        <p className="mt-2 text-xs font-semibold uppercase tracking-[0.12em] text-slate-400">
                          {task.dueLabel}
                        </p>
                      </div>
                      <span className={statusChipClass(task.priority === "high" ? "At Risk" : task.priority === "medium" ? "On Track" : "Completed")}>
                        {task.priority}
                      </span>
                    </div>
                  </div>
                ))
              ) : (
                <div className="rounded-2xl border border-dashed border-slate-200 bg-white px-4 py-5">
                  <p className="text-sm font-semibold text-[#07122f]">No tasks assigned today</p>
                  <p className="mt-2 text-sm leading-6 text-slate-500">
                    Tasks pushed from admin or supervisor will appear here automatically.
                  </p>
                </div>
              )}
            </div>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-5">
            <p className="text-sm font-semibold text-[#07122f]">Engineer action strip</p>
            <div className="mt-4 space-y-3">
              <button type="button" onClick={onOpenProfile} className="w-full rounded-2xl border border-white bg-white px-4 py-4 text-left transition hover:border-blue-200">
                <p className="text-sm font-bold text-[#07122f]">Profile and photo</p>
                <p className="mt-2 text-sm leading-6 text-slate-500">Update display name and upload the mobile profile image.</p>
              </button>
              <button type="button" onClick={onOpenChat} className="w-full rounded-2xl border border-white bg-white px-4 py-4 text-left transition hover:border-blue-200">
                <p className="text-sm font-bold text-[#07122f]">Live chat</p>
                <p className="mt-2 text-sm leading-6 text-slate-500">Open the current project chat with mentions and image upload.</p>
              </button>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

function FinanceDashboardModuleView({
  projectPortfolio,
  yesterdayReports,
  pwdDocuments,
  onOpenModule,
  onBack
}: {
  projectPortfolio: Project[];
  yesterdayReports: YesterdayReportItem[];
  pwdDocuments: PwdDocumentItem[];
  onOpenModule: (title: string) => void;
  onBack: () => void;
}) {
  return (
    <section className="px-4 pb-10 pt-7 sm:px-6">
      <BackToDashboard onBack={onBack} />
      <div className="rounded-[24px] border border-slate-200 bg-white p-6 shadow-sm">
        <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[#115cff]">Finance Dashboard</p>
        <h1 className="mt-2 text-3xl font-bold tracking-normal text-[#07122f]">Finance workspace shell</h1>
        <p className="mt-3 max-w-[760px] text-sm leading-7 text-slate-500">
          Finance-specific workflows are reserved for the next phase, but the role shell, project context, and document access are already aligned with the live app structure.
        </p>

        <div className="mt-5 grid gap-3 md:grid-cols-3">
          <MiniMetric label="Projects" value={String(projectPortfolio.length)} detail="Visible live projects" />
          <MiniMetric label="Yesterday reports" value={String(yesterdayReports.length)} detail="Field reports available to review" />
          <MiniMetric label="Documents" value={String(pwdDocuments.length)} detail="Shared permission and client files" />
        </div>

        <div className="mt-6 grid gap-4 md:grid-cols-3">
          {[
            { title: "Projects", detail: "Open project status and corridor progress." },
            { title: "Yesterday Reports", detail: "Read the latest uploaded field reports." },
            { title: "PWD Permission Reports", detail: "Open shared files and supporting documents." }
          ].map((item) => (
            <button
              key={item.title}
              type="button"
              onClick={() => onOpenModule(item.title)}
              className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-4 text-left transition hover:border-blue-200 hover:bg-white"
            >
              <p className="text-sm font-bold text-[#07122f]">{item.title}</p>
              <p className="mt-2 text-sm leading-6 text-slate-500">{item.detail}</p>
            </button>
          ))}
        </div>

        <div className="mt-6 rounded-2xl border border-dashed border-slate-200 bg-slate-50 px-4 py-5">
          <p className="text-sm font-semibold text-[#07122f]">Next finance buildout</p>
          <p className="mt-2 text-sm leading-6 text-slate-500">
            Expense, payroll, invoice, and approval controls are intentionally held for the next phase so the admin, engineer, client, and live tracking foundations stay stable first.
          </p>
        </div>
      </div>
    </section>
  );
}

function ClientDashboardModuleView({
  currentUser,
  primaryProject,
  clientAccess,
  onClientAccessChange,
  projectPortfolio,
  pwdDocuments,
  onBack
}: {
  currentUser: AppUser | null;
  primaryProject: Project;
  clientAccess: ClientAccessEntry[];
  onClientAccessChange: (
    updater: ClientAccessEntry[] | ((current: ClientAccessEntry[]) => ClientAccessEntry[])
  ) => void;
  projectPortfolio: Project[];
  pwdDocuments: PwdDocumentItem[];
  onBack: () => void;
}) {
  function assignClient(id: string, projectId: string) {
    const project = projectPortfolio.find((item) => item.id === projectId) ?? null;
    onClientAccessChange((current) =>
      current.map((entry) =>
        entry.id === id
          ? {
              ...entry,
              accessStatus: "approved",
              projectId,
              projectName: project?.name ?? null,
              lastShare: "Shared just now"
            }
          : entry
      )
    );
  }

  function removeClient(id: string) {
    onClientAccessChange((current) =>
      current.map((entry) =>
        entry.id === id
          ? { ...entry, accessStatus: "not_assigned", projectId: null, projectName: null }
          : entry
      )
    );
  }

  const approvedDocs = pwdDocuments.filter(
    (item) => item.projectId === primaryProject.id || item.category === "Client Document"
  );
  const [assignmentDrafts, setAssignmentDrafts] = useState<Record<string, string>>({});

  return (
    <section className="px-4 pb-10 pt-7 sm:px-6">
      <BackToDashboard onBack={onBack} />
      <div className="rounded-[24px] border border-slate-200 bg-white p-6 shadow-sm">
        <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[#115cff]">Client Dashboard</p>
        <h1 className="mt-2 text-3xl font-bold tracking-normal text-[#07122f]">Client access and project privacy</h1>
        <p className="mt-3 text-sm leading-7 text-slate-500">
          Client accounts should only see their assigned project, the related map, and the files shared with them. No cross-project leakage is allowed.
        </p>

        <div className="mt-5 grid gap-3 md:grid-cols-3">
          <MiniMetric label="Assigned project" value={primaryProject.name} detail={primaryProject.location} />
          <MiniMetric label="Approved clients" value={String(clientAccess.filter((item) => item.accessStatus === "approved").length)} detail="Currently mapped client users" />
          <MiniMetric label="Shared files" value={String(approvedDocs.length)} detail="Documents visible to clients" />
        </div>

        <div className="mt-6 space-y-4">
          {clientAccess.map((entry) => (
            <div key={entry.id} className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-4">
              <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                <div>
                  <p className="text-sm font-bold text-[#07122f]">{entry.clientName}</p>
                  <p className="mt-1 text-sm text-slate-500">{entry.email}</p>
                  <p className="mt-1 text-sm text-slate-500">
                    {entry.projectName ?? "No project assigned yet"} - Last share: {entry.lastShare}
                  </p>
                </div>
                <div className="flex flex-wrap gap-2">
                  {entry.accessStatus === "not_assigned" ? (
                    <>
                      <select
                        value={assignmentDrafts[entry.id] ?? ""}
                        onChange={(event) =>
                          setAssignmentDrafts((current) => ({
                            ...current,
                            [entry.id]: event.target.value
                          }))
                        }
                        className="min-h-11 rounded-full border border-slate-200 bg-white px-4 text-sm font-semibold text-slate-700 outline-none focus:border-[#115cff]"
                      >
                        <option value="">Select project</option>
                        {projectPortfolio.map((project) => (
                          <option key={project.id} value={project.id}>
                            {project.name}
                          </option>
                        ))}
                      </select>
                      <button
                        type="button"
                        onClick={() =>
                          assignClient(entry.id, assignmentDrafts[entry.id] || primaryProject.id)
                        }
                        className={actionChipClass("green")}
                      >
                        Assign project
                      </button>
                    </>
                  ) : (
                    <button type="button" onClick={() => removeClient(entry.id)} className={actionChipClass("red")}>
                      Remove access
                    </button>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

function CurrentEngineersModuleView({
  projectPortfolio,
  trackingSnapshot,
  accessDirectory,
  onBack
}: {
  projectPortfolio: Project[];
  trackingSnapshot: MobileTrackingSnapshot | null;
  accessDirectory: AccessDirectoryEntry[];
  onBack: () => void;
}) {
  const liveNames = new Set((trackingSnapshot?.locations ?? []).map((item) => item.userName));
  const engineersOnly = accessDirectory.filter((entry) => entry.role === "engineer" || entry.role === "supervisor");

  return (
    <section className="px-4 pb-10 pt-7 sm:px-6">
      <BackToDashboard onBack={onBack} />
      <div className="rounded-[24px] border border-slate-200 bg-white p-6 shadow-sm">
        <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[#115cff]">Current Engineers</p>
        <h1 className="mt-2 text-3xl font-bold tracking-normal text-[#07122f]">Live engineering staff</h1>
        <div className="mt-5 grid gap-3 md:grid-cols-3">
          <MiniMetric label="Live now" value={String(liveNames.size)} detail="Attendance-based live count" />
          <MiniMetric label="Engineering users" value={String(engineersOnly.length)} detail="Engineer and supervisor accounts" />
          <MiniMetric label="Projects" value={String(projectPortfolio.length)} detail="Visible project corridors" />
        </div>
        <div className="mt-6 space-y-3">
          {engineersOnly.map((entry) => (
            <div key={entry.id} className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-4">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-sm font-bold text-[#07122f]">{entry.name}</p>
                  <p className="mt-1 text-sm text-slate-500">{entry.designation} - {entry.phone}</p>
                </div>
                <span className={statusChipClass(liveNames.has(entry.name) ? "On Track" : "Delayed")}>
                  {liveNames.has(entry.name) ? "live" : "not live"}
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

function WorkerRegisterModuleView({
  workerRoster,
  onWorkerRosterChange,
  onBack
}: {
  workerRoster: WorkerRosterItem[];
  onWorkerRosterChange: (
    updater: WorkerRosterItem[] | ((current: WorkerRosterItem[]) => WorkerRosterItem[])
  ) => void;
  onBack: () => void;
}) {
  function removeWorker(id: string) {
    onWorkerRosterChange((current) => current.filter((entry) => entry.id !== id));
  }

  return (
    <section className="px-4 pb-10 pt-7 sm:px-6">
      <BackToDashboard onBack={onBack} />
      <div className="rounded-[24px] border border-slate-200 bg-white p-6 shadow-sm">
        <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[#115cff]">Worker Register</p>
        <h1 className="mt-2 text-3xl font-bold tracking-normal text-[#07122f]">All specified workers</h1>
        <div className="mt-6 space-y-4">
          {workerRoster.map((worker) => (
            <div key={worker.id} className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-4">
              <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                <div>
                  <p className="text-sm font-bold text-[#07122f]">{worker.name}</p>
                  <p className="mt-1 text-sm text-slate-500">{worker.designation} - {worker.phone}</p>
                  <p className="mt-1 text-sm text-slate-500">{worker.projectName}</p>
                </div>
                <div className="flex flex-wrap gap-2">
                  <span className={statusChipClass(worker.workerStatus === "live" ? "On Track" : worker.workerStatus === "leave" ? "At Risk" : "Delayed")}>
                    {worker.workerStatus}
                  </span>
                  <button type="button" onClick={() => removeWorker(worker.id)} className={actionChipClass("red")}>
                    Remove worker
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

function PwdPermissionReportsModuleView({
  currentUser,
  primaryProject,
  projectPortfolio,
  pwdDocuments,
  onPwdDocumentsChange,
  onBack
}: {
  currentUser: AppUser | null;
  primaryProject: Project;
  projectPortfolio: Project[];
  pwdDocuments: PwdDocumentItem[];
  onPwdDocumentsChange: (
    updater: PwdDocumentItem[] | ((current: PwdDocumentItem[]) => PwdDocumentItem[])
  ) => void;
  onBack: () => void;
}) {
  async function uploadDocument(files: FileList | null) {
    const file = files?.[0];
    if (!file) return;
    const targetProject =
      projectPortfolio.find((item) => item.id === primaryProject.id) ?? primaryProject;
    onPwdDocumentsChange((current) => [
      {
        id: crypto.randomUUID(),
        title: file.name,
        projectId: targetProject.id,
        projectName: targetProject.name,
        uploadedBy: currentUser?.name ?? "Telgo User",
        uploadedAt: "Uploaded just now",
        fileType: file.name.split(".").pop()?.toUpperCase() ?? "FILE",
        category: "PWD Permission"
      },
      ...current
    ]);
  }

  return (
    <section className="px-4 pb-10 pt-7 sm:px-6">
      <BackToDashboard onBack={onBack} />
      <div className="rounded-[24px] border border-slate-200 bg-white p-6 shadow-sm">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[#115cff]">PWD Permission Reports</p>
            <h1 className="mt-2 text-3xl font-bold tracking-normal text-[#07122f]">Permission and client document desk</h1>
          </div>
          <label className="inline-flex min-h-11 cursor-pointer items-center justify-center rounded-full border border-blue-100 bg-blue-50 px-4 text-sm font-semibold text-[#115cff]">
            Upload document
            <input type="file" className="hidden" onChange={(event) => void uploadDocument(event.target.files)} />
          </label>
        </div>
        <div className="mt-6 space-y-4">
          {pwdDocuments.map((document) => (
            <div key={document.id} className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-4">
              <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                <div>
                  <p className="text-sm font-bold text-[#07122f]">{document.title}</p>
                  <p className="mt-1 text-sm text-slate-500">
                    {document.projectName} - {document.category} - {document.fileType}
                  </p>
                  <p className="mt-1 text-sm text-slate-500">
                    Uploaded by {document.uploadedBy} - {document.uploadedAt}
                  </p>
                </div>
                <button type="button" className={actionChipClass("blue")}>
                  Download
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

function MonthlyAttendanceModuleView({
  currentUser,
  trackingSnapshot,
  leaveRequests,
  onLeaveRequestsChange,
  onBack
}: {
  currentUser: AppUser | null;
  trackingSnapshot: MobileTrackingSnapshot | null;
  leaveRequests: LeaveRequestItem[];
  onLeaveRequestsChange: (
    updater: LeaveRequestItem[] | ((current: LeaveRequestItem[]) => LeaveRequestItem[])
  ) => void;
  onBack: () => void;
}) {
  function requestLeave() {
    if (!currentUser?.email) return;
    onLeaveRequestsChange((current) => [
      {
        id: crypto.randomUUID(),
        employeeName: currentUser.name,
        email: currentUser.email,
        startDate: "18 May 2026",
        endDate: "18 May 2026",
        reason: "Requested from mobile calendar",
        status: "pending"
      },
      ...current
    ]);
  }

  const myLeaves = leaveRequests.filter(
    (entry) => normalizeEmail(entry.email) === normalizeEmail(currentUser?.email ?? "")
  );

  return (
    <section className="px-4 pb-10 pt-7 sm:px-6">
      <BackToDashboard onBack={onBack} />
      <div className="rounded-[24px] border border-slate-200 bg-white p-6 shadow-sm">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[#115cff]">Monthly Attendance</p>
            <h1 className="mt-2 text-3xl font-bold tracking-normal text-[#07122f]">Attendance and leave calendar</h1>
          </div>
          <button type="button" onClick={requestLeave} className={actionChipClass("green")}>
            Request leave
          </button>
        </div>
        <div className="mt-5 grid grid-cols-7 gap-2">
          {Array.from({ length: 31 }, (_, index) => index + 1).map((day) => {
            const marked = (trackingSnapshot?.attendance.length ?? 0) > 0 && day <= Math.min(5, trackingSnapshot?.attendance.length ?? 0);
            const approvedLeave = myLeaves.some((leave) => leave.status === "approved" && day >= 19 && day <= 20);
            return (
              <div
                key={day}
                className={cn(
                  "rounded-2xl border px-2 py-3 text-center text-sm font-semibold",
                  approvedLeave
                    ? "border-amber-200 bg-amber-50 text-[#ff8a00]"
                    : marked
                      ? "border-emerald-200 bg-emerald-50 text-[#14b866]"
                      : "border-slate-200 bg-slate-50 text-slate-500"
                )}
              >
                {day}
              </div>
            );
          })}
        </div>
        <div className="mt-6 space-y-3">
          {myLeaves.map((leave) => (
            <div key={leave.id} className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-4">
              <p className="text-sm font-bold text-[#07122f]">{leave.startDate} to {leave.endDate}</p>
              <p className="mt-1 text-sm text-slate-500">{leave.reason}</p>
              <p className="mt-1 text-sm font-semibold text-[#115cff]">{leave.status}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

function LeaveRequestModuleView({
  currentUser,
  leaveRequests,
  onLeaveRequestsChange,
  onBack
}: {
  currentUser: AppUser | null;
  leaveRequests: LeaveRequestItem[];
  onLeaveRequestsChange: (
    updater: LeaveRequestItem[] | ((current: LeaveRequestItem[]) => LeaveRequestItem[])
  ) => void;
  onBack: () => void;
}) {
  function requestLeave() {
    if (!currentUser?.email) return;
    onLeaveRequestsChange((current) => [
      {
        id: crypto.randomUUID(),
        employeeName: currentUser.name,
        email: currentUser.email,
        startDate: "22 May 2026",
        endDate: "23 May 2026",
        reason: "New mobile leave request",
        status: "pending"
      },
      ...current
    ]);
  }

  return (
    <section className="px-4 pb-10 pt-7 sm:px-6">
      <BackToDashboard onBack={onBack} />
      <div className="rounded-[24px] border border-slate-200 bg-white p-6 shadow-sm">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[#115cff]">Leave Requests</p>
            <h1 className="mt-2 text-3xl font-bold tracking-normal text-[#07122f]">Request and track leave</h1>
          </div>
          <button type="button" onClick={requestLeave} className={actionChipClass("green")}>
            Add leave request
          </button>
        </div>
        <div className="mt-6 space-y-4">
          {leaveRequests
            .filter((item) => normalizeEmail(item.email) === normalizeEmail(currentUser?.email ?? ""))
            .map((leave) => (
              <div key={leave.id} className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-4">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-sm font-bold text-[#07122f]">{leave.startDate} to {leave.endDate}</p>
                    <p className="mt-1 text-sm text-slate-500">{leave.reason}</p>
                  </div>
                  <span className={statusChipClass(leave.status === "approved" ? "Completed" : leave.status === "pending" ? "Delayed" : "At Risk")}>
                    {leave.status}
                  </span>
                </div>
              </div>
            ))}
        </div>
      </div>
    </section>
  );
}

function AssignedTasksModuleView({
  currentUser,
  projectPortfolio,
  engineerTasks,
  onEngineerTasksChange,
  onBack
}: {
  currentUser: AppUser | null;
  projectPortfolio: Project[];
  engineerTasks: EngineerTaskItem[];
  onEngineerTasksChange: (
    updater: EngineerTaskItem[] | ((current: EngineerTaskItem[]) => EngineerTaskItem[])
  ) => void;
  onBack: () => void;
}) {
  const visibleTasks =
    currentUser?.role === "admin"
      ? engineerTasks
      : engineerTasks.filter(
          (task) => normalizeEmail(task.assigneeEmail) === normalizeEmail(currentUser?.email ?? "")
        );

  function updateTask(id: string, status: EngineerTaskItem["status"]) {
    onEngineerTasksChange((current) =>
      current.map((task) => (task.id === id ? { ...task, status } : task))
    );
  }

  return (
    <section className="px-4 pb-10 pt-7 sm:px-6">
      <BackToDashboard onBack={onBack} />
      <div className="rounded-[24px] border border-slate-200 bg-white p-6 shadow-sm">
        <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[#115cff]">Assigned Tasks</p>
        <h1 className="mt-2 text-3xl font-bold tracking-normal text-[#07122f]">Today's assigned work</h1>
        <div className="mt-6 space-y-4">
          {visibleTasks.map((task) => {
            const projectName =
              projectPortfolio.find((item) => item.id === task.projectId)?.name ?? task.projectId;
            return (
              <div key={task.id} className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-4">
                <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="text-sm font-bold text-[#07122f]">{task.title}</p>
                      <span className={priorityChipClass(task.priority)}>{task.priority}</span>
                    </div>
                    <p className="mt-1 text-sm text-slate-500">{projectName} - {task.dueLabel}</p>
                    <p className="mt-2 text-sm leading-6 text-slate-500">{task.detail}</p>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <button type="button" onClick={() => updateTask(task.id, "done")} className={actionChipClass("green")}>
                      Mark done
                    </button>
                    <button type="button" onClick={() => updateTask(task.id, "blocked")} className={actionChipClass("orange")}>
                      Mark blocked
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}

function BackToDashboard({ onBack }: { onBack: () => void }) {
  return (
    <button
      type="button"
      onClick={onBack}
      className="mb-6 inline-flex h-11 items-center gap-2 rounded-full border border-slate-200 px-4 text-sm font-semibold text-slate-700"
    >
      <ChevronLeft className="h-4 w-4" />
      Dashboard
    </button>
  );
}

function SummaryCard({
  label,
  value,
  detail,
  icon: IconComponent,
  tone
}: {
  label: string;
  value: string;
  detail: string;
  icon: LucideIcon;
  tone: Tone;
}) {
  return (
    <article className="min-h-[146px] rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
      <div className="flex items-start gap-3">
        <span className={cn("grid h-11 w-11 shrink-0 place-items-center rounded-xl", toneStyles[tone].box)}>
          <IconComponent className={cn("h-5 w-5", toneStyles[tone].icon)} />
        </span>
        <p className="pt-2 text-sm font-bold leading-5 text-[#07122f]">{label}</p>
      </div>
      <p className="mt-4 text-lg font-bold tracking-normal text-[#07122f] sm:text-xl">{value}</p>
      <p className="mt-2 text-sm leading-5 text-slate-500">{detail}</p>
    </article>
  );
}

function MiniMetric({
  label,
  value,
  detail
}: {
  label: string;
  value: string;
  detail: string;
}) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-4">
      <p className="text-xs font-semibold uppercase tracking-[0.12em] text-slate-500">{label}</p>
      <p className="mt-3 text-lg font-bold tracking-normal text-[#07122f]">{value}</p>
      <p className="mt-2 text-sm leading-5 text-slate-500">{detail}</p>
    </div>
  );
}

function statusChipClass(status: string) {
  const normalized = status.trim().toLowerCase();
  if (normalized.includes("complete") || normalized.includes("approved") || normalized.includes("active")) {
    return "rounded-full bg-emerald-50 px-3 py-1 text-xs font-semibold text-[#14b866]";
  }
  if (normalized.includes("risk") || normalized.includes("reject") || normalized.includes("blocked")) {
    return "rounded-full bg-rose-50 px-3 py-1 text-xs font-semibold text-[#ff3d57]";
  }
  if (normalized.includes("track") || normalized.includes("ready") || normalized.includes("live")) {
    return "rounded-full bg-blue-50 px-3 py-1 text-xs font-semibold text-[#115cff]";
  }
  return "rounded-full bg-amber-50 px-3 py-1 text-xs font-semibold text-[#ff8a00]";
}

function actionChipClass(tone: "blue" | "green" | "orange" | "red") {
  const palette: Record<"blue" | "green" | "orange" | "red", string> = {
    blue: "border-blue-100 bg-blue-50 text-[#115cff]",
    green: "border-emerald-100 bg-emerald-50 text-[#14b866]",
    orange: "border-amber-100 bg-amber-50 text-[#ff8a00]",
    red: "border-rose-100 bg-rose-50 text-[#ff3d57]"
  };

  return cn(
    "inline-flex min-h-10 items-center justify-center rounded-full border px-4 text-sm font-semibold transition hover:opacity-90",
    palette[tone]
  );
}

function priorityChipClass(priority: EngineerTaskItem["priority"]) {
  if (priority === "high") return "rounded-full bg-rose-50 px-3 py-1 text-xs font-semibold uppercase text-[#ff3d57]";
  if (priority === "medium") return "rounded-full bg-amber-50 px-3 py-1 text-xs font-semibold uppercase text-[#ff8a00]";
  return "rounded-full bg-blue-50 px-3 py-1 text-xs font-semibold uppercase text-[#115cff]";
}

function ModuleCard({ item, onClick }: { item: ModuleItem; onClick: () => void }) {
  const IconComponent = item.icon;
  return (
    <button
      type="button"
      onClick={onClick}
      className="min-h-[132px] rounded-2xl border border-slate-200 bg-white p-4 text-left shadow-sm transition hover:-translate-y-0.5 hover:border-blue-200 hover:shadow-md focus:outline-none focus:ring-4 focus:ring-blue-50"
    >
      <span className={cn("grid h-12 w-12 place-items-center rounded-xl", toneStyles[item.tone].box)}>
        <IconComponent className={cn("h-6 w-6", toneStyles[item.tone].icon)} />
      </span>
      <h3 className="mt-4 text-sm font-bold leading-5 text-[#07122f]">{item.title}</h3>
      <p className="mt-1 text-sm leading-5 text-slate-500">{item.subtitle}</p>
    </button>
  );
}

function SectionTitle({ title }: { title: string }) {
  return (
    <div className="mb-4 flex items-center justify-between gap-3">
      <h2 className="text-lg font-bold tracking-normal text-[#07122f]">{title}</h2>
    </div>
  );
}

function BottomNav({
  active,
  onHome,
  onModule,
  onChat,
  onProfile,
  userName
}: {
  active: string;
  onHome: () => void;
  onModule: () => void;
  onChat: () => void;
  onProfile: () => void;
  userName: string;
}) {
  const items = [
    { label: "Home", icon: Home, action: onHome },
    { label: "Projects", icon: Folder, action: onModule },
    { label: "Add", icon: Plus, action: () => undefined },
    { label: "Chat", icon: MessageCircle, action: onChat },
    { label: "Profile", icon: User, action: onProfile }
  ];

  return (
    <nav className="fixed inset-x-0 bottom-0 z-40 mx-auto max-w-[980px] rounded-t-[28px] border border-slate-100 bg-white/95 px-4 pb-[max(1rem,env(safe-area-inset-bottom))] pt-3 shadow-[0_-16px_50px_rgba(15,35,80,0.12)] backdrop-blur">
      <div className="grid grid-cols-5 items-end">
        {items.map((item) => {
          const IconComponent = item.icon;
          const selected = active === item.label || (item.label === "Home" && active === "Home");
          const center = item.label === "Add";
          return (
            <button
              key={item.label}
              type="button"
              onClick={item.action}
              aria-label={item.label === "Profile" ? `${userName} profile` : item.label}
              className={cn(
                "flex min-h-[62px] flex-col items-center justify-center gap-1 text-sm font-medium",
                selected ? "text-[#115cff]" : "text-slate-500"
              )}
            >
              <span
                className={cn(
                  "grid place-items-center",
                  center
                    ? "h-16 w-16 -translate-y-5 rounded-full border-[6px] border-white bg-[#115cff] text-white shadow-[0_14px_30px_rgba(17,92,255,0.35)]"
                    : "h-8 w-8"
                )}
              >
                <IconComponent className={cn(center ? "h-8 w-8" : "h-7 w-7")} />
              </span>
              <span className={cn(center && "-mt-4 text-transparent")}>{item.label}</span>
            </button>
          );
        })}
      </div>
    </nav>
  );
}

function StatusBar({ dark = false }: { dark?: boolean }) {
  return (
    <div className={cn("flex h-8 items-center justify-between px-2 text-sm font-bold", dark ? "text-black" : "text-white")}>
      <span>9:41</span>
      <div className="flex items-center gap-1.5">
        <span className="h-3 w-4 rounded-[2px] border-2 border-current" />
        <span className="h-3 w-4 rounded-sm bg-current" />
      </div>
    </div>
  );
}

function BrandMark({ compact = false }: { compact?: boolean }) {
  return (
    <div className="flex items-center justify-center">
      <Image
        src="/assets/telgo-logo-cropped.png"
        width={compact ? 190 : 270}
        height={compact ? 56 : 82}
        alt="Telgo Power Projects"
        className={cn("h-auto max-w-full object-contain", compact ? "w-[190px]" : "w-[270px]")}
        priority
      />
    </div>
  );
}

function PrimaryButton({
  children,
  onClick,
  disabled,
  className
}: {
  children: ReactNode;
  onClick: () => void;
  disabled?: boolean;
  className?: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={cn(
        "flex min-h-14 w-full items-center justify-center rounded-xl bg-[#115cff] px-5 text-sm font-bold text-white shadow-[0_12px_28px_rgba(17,92,255,0.28)] transition disabled:cursor-not-allowed disabled:opacity-60",
        className
      )}
    >
      {children}
    </button>
  );
}

function PinInput({
  label,
  value,
  onChange
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
}) {
  return (
    <label className="block">
      <span className="mb-2 block text-sm font-semibold text-slate-700">{label}</span>
      <input
        value={value}
        onChange={(event) => onChange(event.target.value.replace(/\D/g, "").slice(0, 4))}
        inputMode="numeric"
        type="password"
        maxLength={4}
        placeholder="••••"
        className="min-h-14 w-full rounded-xl border border-slate-200 px-4 text-center text-xl font-bold tracking-[0.5em] outline-none placeholder:tracking-normal placeholder:text-slate-300 focus:border-[#115cff] focus:ring-4 focus:ring-blue-50"
      />
    </label>
  );
}

function Notice({ children }: { children: ReactNode }) {
  return (
    <p className="mt-4 rounded-xl border border-blue-100 bg-blue-50 px-4 py-3 text-center text-sm font-medium text-[#115cff]">
      {children}
    </p>
  );
}

function normalizeEmail(value: string) {
  const email = value.trim().toLowerCase();
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) ? email : "";
}

function normalizeLoginId(value: string) {
  return value.trim().toUpperCase().replace(/\s+/g, "");
}

async function hashSecret(identifier: string, secret: string) {
  const input = `${normalizeLoginId(identifier)}:${secret}`;
  if (!globalThis.crypto?.subtle) return btoa(input);
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(input));
  return Array.from(new Uint8Array(digest))
    .map((byte) => byte.toString(16).padStart(2, "0"))
    .join("");
}

async function compressChatImage(file: File) {
  if (!file.type.startsWith("image/")) return file;

  try {
    const image = await loadImageElement(file);
    const maxDimension = 1600;
    const scale = Math.min(1, maxDimension / Math.max(image.width, image.height));
    const width = Math.max(1, Math.round(image.width * scale));
    const height = Math.max(1, Math.round(image.height * scale));
    const canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;

    const context = canvas.getContext("2d");
    if (!context) return file;

    context.fillStyle = "#ffffff";
    context.fillRect(0, 0, width, height);
    context.drawImage(image, 0, 0, width, height);

    const outputType = file.type === "image/webp" ? "image/webp" : "image/jpeg";
    const compressedBlob = await new Promise<Blob | null>((resolve) => {
      canvas.toBlob(resolve, outputType, 0.82);
    });

    if (!compressedBlob || compressedBlob.size >= file.size) return file;

    return new File([compressedBlob], replaceFileExtension(file.name, outputType), {
      type: outputType,
      lastModified: Date.now()
    });
  } catch {
    return file;
  }
}

async function loadImageElement(file: File) {
  const objectUrl = URL.createObjectURL(file);

  try {
    return await new Promise<HTMLImageElement>((resolve, reject) => {
      const image = new window.Image();
      image.onload = () => resolve(image);
      image.onerror = () => reject(new Error("Image could not be loaded."));
      image.src = objectUrl;
    });
  } finally {
    URL.revokeObjectURL(objectUrl);
  }
}

function replaceFileExtension(fileName: string, mimeType: string) {
  const extension = mimeType === "image/webp" ? ".webp" : ".jpg";
  const baseName = fileName.replace(/\.[^.]+$/, "");
  return `${baseName || "chat-photo"}${extension}`;
}

async function readFileAsDataUrl(file: File) {
  return await new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result ?? ""));
    reader.onerror = () => reject(new Error("Image could not be processed."));
    reader.readAsDataURL(file);
  });
}

function formatBytes(value: number) {
  if (!Number.isFinite(value) || value <= 0) return "0 KB";
  if (value < 1024 * 1024) return `${Math.max(1, Math.round(value / 1024))} KB`;
  return `${(value / (1024 * 1024)).toFixed(1)} MB`;
}

function clearChatDrafts(drafts: ChatDraftImage[]) {
  drafts.forEach((draft) => {
    URL.revokeObjectURL(draft.previewUrl);
  });
}

function formatChatTime(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  return date.toLocaleTimeString("en-IN", {
    hour: "2-digit",
    minute: "2-digit"
  });
}

function formatNotificationTime(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  return date.toLocaleString("en-IN", {
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit"
  });
}

function renderChatBody(body: string, mentions: ChatMention[], mine: boolean) {
  const mentionMap = new Map(mentions.map((mention) => [mention.loginId.toUpperCase(), mention]));
  const parts = body.split(/(@[A-Za-z0-9._-]+)/g);

  return parts.map((part, index) => {
    if (!part.startsWith("@")) {
      return <span key={`${part}-${index}`}>{part}</span>;
    }

    const token = part.slice(1).toUpperCase();
    const mention = mentionMap.get(token);
    if (!mention) {
      return <span key={`${part}-${index}`}>{part}</span>;
    }

    return (
      <span
        key={`${part}-${index}`}
        className={cn(
          "rounded-full px-2 py-1 text-[13px] font-semibold",
          mine ? "bg-white/15 text-white" : "bg-blue-100 text-[#115cff]"
        )}
      >
        @{mention.loginId}
      </span>
    );
  });
}

function getLiveDevicePosition() {
  if (!("geolocation" in navigator)) {
    return Promise.reject(new Error("Live location is not available on this device."));
  }

  return new Promise<{ lat: number; lng: number; accuracy: number | null }>((resolve, reject) => {
    navigator.geolocation.getCurrentPosition(
      (position) =>
        resolve({
          lat: position.coords.latitude,
          lng: position.coords.longitude,
          accuracy: Number.isFinite(position.coords.accuracy) ? position.coords.accuracy : null
        }),
      (error) => reject(new Error(error.message || "Location permission was denied.")),
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
    );
  });
}

function saveSession(user: AppUser) {
  localStorage.setItem(SESSION_KEY, JSON.stringify(user));
}

function saveDeviceAccount(user: AppUser) {
  localStorage.setItem(DEVICE_ACCOUNT_KEY, JSON.stringify(user));
}

function toAppUser(remoteUser: unknown, fallbackLoginId: string): AppUser {
  const row = (remoteUser ?? {}) as Record<string, unknown>;
  const loginId = normalizeLoginId(String(row.login_id ?? row.loginId ?? fallbackLoginId));
  return {
    id: String(row.id ?? `mobile-${loginId}`),
    email: String(row.email ?? ""),
    loginId,
    name: String(row.full_name ?? row.name ?? "Telgo Mobile User"),
    role: String(row.role ?? "employee"),
    createdAt: String(row.created_at ?? new Date().toISOString())
  };
}

function getErrorMessage(error: unknown) {
  if (error instanceof Error) return error.message;
  if (typeof error === "object" && error && "message" in error) {
    return String((error as { message?: unknown }).message ?? "Server rejected the request.");
  }
  return "Server rejected the request.";
}

function formatRoleLabel(value: string) {
  return value
    .split(/[\s_-]+/)
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

function resolveAccessRole(value: string): AccessRole {
  const normalized = String(value).trim().toLowerCase();
  if (normalized === "admin") return "admin";
  if (normalized === "supervisor") return "supervisor";
  if (normalized === "finance") return "finance";
  if (normalized === "client") return "client";
  return "engineer";
}

function getModuleByTitle(title: string) {
  return modules.find((item) => item.title === title) ?? null;
}

function getDashboardRoleByModuleTitle(title: string): AccessRole | null {
  const entry = Object.entries(roleDashboardModuleTitleByRole).find(([, value]) => value === title);
  return entry ? (entry[0] as AccessRole) : null;
}

async function postMobileAccess(
  path: string,
  payload: Record<string, unknown>,
  options?: { headers?: Record<string, string> }
) {
  try {
    const response = await fetch(path, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...(options?.headers ?? {})
      },
      body: JSON.stringify(payload)
    });
    const data = (await response.json().catch(() => null)) as
      | { ok?: boolean; message?: string; user?: unknown }
      | null;
    return {
      ok: response.ok && data?.ok === true,
      message: data?.message,
      user: data?.user
    };
  } catch (error) {
    return {
      ok: false,
      message: getErrorMessage(error),
      user: null
    };
  }
}

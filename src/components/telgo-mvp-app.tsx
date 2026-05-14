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
  SendHorizontal,
  TriangleAlert,
  Truck,
  User,
  UserCheck,
  Users,
  UsersRound,
  WalletCards,
  Wrench,
  X
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { supabase } from "@/lib/supabase/client";
import { cn } from "@/lib/utils";

type MvpView = "request" | "otp" | "pin" | "signin" | "dashboard" | "module" | "chat";
type OtpReturnView = "request" | "signin";
type AccessRole = "engineer" | "supervisor" | "finance" | "client" | "admin";
type AppUser = {
  id: string;
  email: string;
  loginId: string;
  name: string;
  role: string;
  createdAt: string;
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

type ChatDraftImage = {
  id: string;
  file: File;
  previewUrl: string;
  sizeLabel: string;
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
  { title: "Mark Attendance", subtitle: "Daily check-in", icon: UserCheck, tone: "green" },
  { title: "Live Tracking", subtitle: "Workers & Assets", icon: MapPin, tone: "blue" },
  { title: "Projects", subtitle: "All Projects", icon: Folder, tone: "blue" },
  { title: "Update Project", subtitle: "Progress update", icon: ChartNoAxesColumnIncreasing, tone: "purple" },
  { title: "Upload Report", subtitle: "Daily / site report", icon: CloudUpload, tone: "green" },
  { title: "Live Chat", subtitle: "Team communication", icon: MessageCircle, tone: "blue" },
  { title: "Admin Dashboard", subtitle: "System overview", icon: Shield, tone: "red" },
  { title: "Supervisor Dashboard", subtitle: "Team & site control", icon: ClipboardCheck, tone: "orange" },
  { title: "Engineer Dashboard", subtitle: "Engineer workspace", icon: HardHat, tone: "purple" },
  { title: "Finance Dashboard", subtitle: "Finance overview", icon: IndianRupee, tone: "green" },
  { title: "Client Dashboard", subtitle: "Client view & updates", icon: UsersRound, tone: "orange" },
  { title: "All Workers", subtitle: "Worker directory", icon: Users, tone: "blue" },
  { title: "Leave Management", subtitle: "Apply & approve", icon: CalendarCheck, tone: "green" },
  { title: "Payroll Management", subtitle: "Salaries & payroll", icon: WalletCards, tone: "orange" },
  { title: "Expense Management", subtitle: "Track expenses", icon: ReceiptIndianRupee, tone: "blue" },
  { title: "Invoices", subtitle: "Create & manage", icon: FileText, tone: "purple" },
  { title: "Materials Request", subtitle: "Request materials", icon: Package, tone: "orange" },
  { title: "Equipment", subtitle: "Tools & machinery", icon: Wrench, tone: "blue" },
  { title: "Vehicle Tracking", subtitle: "All vehicles live", icon: Truck, tone: "green" },
  { title: "Fuel Management", subtitle: "Fuel logs & usage", icon: Fuel, tone: "red" },
  { title: "Maintenance", subtitle: "Maintenance logs", icon: Settings, tone: "blue" },
  { title: "Safety Reports", subtitle: "Safety & compliance", icon: ShieldCheck, tone: "green" },
  { title: "Document Center", subtitle: "Files & documents", icon: FolderOpen, tone: "purple" },
  { title: "Calendar", subtitle: "Events & schedule", icon: CalendarDays, tone: "red" },
  { title: "Announcements", subtitle: "Company updates", icon: Megaphone, tone: "orange" },
  { title: "Approvals", subtitle: "Requests & approvals", icon: CircleCheck, tone: "green" },
  { title: "Task Management", subtitle: "Create & assign tasks", icon: ListChecks, tone: "purple" },
  { title: "Timesheet", subtitle: "Work hour tracking", icon: Clock3, tone: "green" },
  { title: "Site Inspection", subtitle: "Inspection & audit", icon: ClipboardCheck, tone: "blue" },
  { title: "Quality Control", subtitle: "Quality check", icon: CheckCircle2, tone: "purple" },
  { title: "Daily Diary", subtitle: "Daily site diary", icon: NotebookPen, tone: "orange" },
  { title: "Reports & Analytics", subtitle: "Business insights", icon: PieChart, tone: "blue" },
  { title: "Alerts", subtitle: "System alerts", icon: TriangleAlert, tone: "red" },
  { title: "Settings", subtitle: "App settings", icon: Settings, tone: "slate" },
  { title: "Support", subtitle: "Help & support", icon: Headphones, tone: "blue" },
  { title: "AI Assistant", subtitle: "Smart help", icon: Sparkles, tone: "purple" }
];

const commonModuleTitles = [
  "Projects",
  "Live Chat",
  "Document Center",
  "Calendar",
  "Announcements",
  "Support",
  "AI Assistant"
];

const roleModuleTitles: Record<AccessRole, string[]> = {
  admin: modules.map((item) => item.title),
  supervisor: [
    "Supervisor Dashboard",
    "Mark Attendance",
    "Live Tracking",
    ...commonModuleTitles,
    "Update Project",
    "Upload Report",
    "All Workers",
    "Leave Management",
    "Materials Request",
    "Equipment",
    "Vehicle Tracking",
    "Safety Reports",
    "Approvals",
    "Task Management",
    "Timesheet",
    "Site Inspection",
    "Quality Control",
    "Daily Diary",
    "Reports & Analytics",
    "Alerts"
  ],
  engineer: [
    "Engineer Dashboard",
    "Mark Attendance",
    ...commonModuleTitles,
    "Update Project",
    "Upload Report",
    "Materials Request",
    "Equipment",
    "Task Management",
    "Timesheet",
    "Site Inspection",
    "Quality Control",
    "Daily Diary",
    "Alerts"
  ],
  finance: [
    "Finance Dashboard",
    ...commonModuleTitles,
    "Expense Management",
    "Invoices",
    "Payroll Management",
    "Approvals",
    "Reports & Analytics",
    "Fuel Management"
  ],
  client: [
    "Client Dashboard",
    "Projects",
    "Live Chat",
    "Document Center",
    "Calendar",
    "Announcements",
    "Approvals",
    "Reports & Analytics",
    "Support"
  ]
};

const roleDashboardContent: Record<AccessRole, RoleDashboardDefinition> = {
  admin: {
    intro: "You are signed in to the full operations command center.",
    focusTitle: "Operations command center",
    focusDetail: "Use this workspace to control sites, approvals, reporting, finance, and team-wide actions.",
    quickActions: [
      { title: "Review approvals", detail: "Clear pending requests and escalations.", moduleTitle: "Approvals" },
      { title: "Track live sites", detail: "Watch workers, assets, and movement.", moduleTitle: "Live Tracking" },
      { title: "View analytics", detail: "Open company-wide insights and exports.", moduleTitle: "Reports & Analytics" },
      { title: "Send update", detail: "Publish notices to every active team.", moduleTitle: "Announcements" }
    ],
    sections: [
      {
        title: "Operations control",
        detail: "Admin should be able to manage the entire delivery engine from one place.",
        items: [
          { title: "Project assignment", detail: "Assign sites, users, and delivery owners." },
          { title: "Critical alert desk", detail: "Review unresolved field and safety escalations." },
          { title: "Company attendance view", detail: "See all check-ins, late entries, and corrections." },
          { title: "Multi-site monitoring", detail: "Switch between sites, teams, and vehicles instantly." }
        ]
      },
      {
        title: "Commercial control",
        detail: "Finance and commercial controls should remain visible to admin without a second login.",
        items: [
          { title: "Expense approvals", detail: "Approve or reject submitted claims." },
          { title: "Invoice oversight", detail: "Track billing status, dues, and milestone invoices." },
          { title: "Payroll readiness", detail: "Monitor salary processing and attendance dependencies." },
          { title: "Fuel and asset cost watch", detail: "Review recurring operational spend." }
        ]
      },
      {
        title: "Governance and reporting",
        detail: "Admin dashboard should become the final audit and reporting surface.",
        items: [
          { title: "Audit trail", detail: "See who changed what and when." },
          { title: "Data export", detail: "Export attendance, project, and finance summaries." },
          { title: "Company policy center", detail: "Push SOPs, circulars, and updated rules." },
          { title: "Client readiness view", detail: "Preview what external clients can see." }
        ]
      }
    ],
    statusTitle: "Admin workspace is ready for full-company oversight.",
    statusBody: "Live metrics will replace these planning cards once the project, attendance, approvals, and finance modules are connected to real data."
  },
  supervisor: {
    intro: "You are signed in to the team and site supervision workspace.",
    focusTitle: "Site and team supervision",
    focusDetail: "Use this dashboard to coordinate field teams, approve requests, and keep projects moving safely.",
    quickActions: [
      { title: "Check live team", detail: "Open worker and asset movement first.", moduleTitle: "Live Tracking" },
      { title: "Approve requests", detail: "Clear leave, material, and field approvals.", moduleTitle: "Approvals" },
      { title: "Review safety", detail: "Handle inspections, incidents, and closures.", moduleTitle: "Safety Reports" },
      { title: "Assign today's work", detail: "Update tasks and responsibilities.", moduleTitle: "Task Management" }
    ],
    sections: [
      {
        title: "Team oversight",
        detail: "Supervisor should manage people, attendance, and daily discipline.",
        items: [
          { title: "Attendance review", detail: "Check who is marked in, absent, or late." },
          { title: "Leave approval", detail: "Approve field leave requests quickly." },
          { title: "Worker assignment", detail: "Move teams between sites or shifts." },
          { title: "Daily communication", detail: "Broadcast updates through team chat and announcements." }
        ]
      },
      {
        title: "Project delivery",
        detail: "Supervisor should validate daily execution before admin review.",
        items: [
          { title: "Report review", detail: "Check field updates and uploaded site reports." },
          { title: "Progress validation", detail: "Compare planned vs completed work." },
          { title: "Material follow-up", detail: "Track requests, approvals, and dispatch." },
          { title: "Delay escalation", detail: "Raise blockers before they affect the client." }
        ]
      },
      {
        title: "Safety and quality",
        detail: "Site control must include inspections and closure follow-up.",
        items: [
          { title: "Inspection queue", detail: "Review pending inspections and audit notes." },
          { title: "Safety issue tracker", detail: "Resolve observations with closure evidence." },
          { title: "Vehicle coordination", detail: "Watch deliveries, fuel, and movement." },
          { title: "Quality check register", detail: "Track QC failures and corrections." }
        ]
      }
    ],
    statusTitle: "Supervisor dashboard is ready for live site control.",
    statusBody: "Once attendance, tasks, materials, and inspection flows go live, this screen will become the day-to-day control panel for each site lead."
  },
  engineer: {
    intro: "You are signed in to the field execution workspace.",
    focusTitle: "Engineer field workspace",
    focusDetail: "This dashboard should keep the engineer focused on daily execution, reporting, and issue escalation.",
    quickActions: [
      { title: "Mark attendance", detail: "Start the day with site check-in.", moduleTitle: "Mark Attendance" },
      { title: "Update project", detail: "Submit progress against today's work.", moduleTitle: "Update Project" },
      { title: "Upload report", detail: "Send photo and text reports from site.", moduleTitle: "Upload Report" },
      { title: "Open diary", detail: "Log the day's work and observations.", moduleTitle: "Daily Diary" }
    ],
    sections: [
      {
        title: "Daily field work",
        detail: "Engineer dashboard should keep the daily work cycle simple and fast.",
        items: [
          { title: "Attendance and shift log", detail: "Mark in, mark out, and review this month's attendance." },
          { title: "Assigned tasks", detail: "See today's tasks, blockers, and priorities." },
          { title: "Project progress update", detail: "Post site progress with photos and notes." },
          { title: "Timesheet entry", detail: "Submit work hours and activity allocation." }
        ]
      },
      {
        title: "Execution tools",
        detail: "Engineer should be able to request what is needed without leaving the workflow.",
        items: [
          { title: "Materials request", detail: "Raise requests directly from site." },
          { title: "Equipment access", detail: "Check assigned tools and issue needs." },
          { title: "Document access", detail: "Open approved drawings and documents." },
          { title: "Live team chat", detail: "Coordinate instantly with site teams." }
        ]
      },
      {
        title: "Quality and safety",
        detail: "Engineer should report issues early and close them with evidence.",
        items: [
          { title: "Site inspection checklist", detail: "Complete checklist-based inspections." },
          { title: "Quality observation log", detail: "Record snags and corrective actions." },
          { title: "Safety report", detail: "Raise hazards with attached photos." },
          { title: "Daily diary summary", detail: "Capture work done, risks, and next steps." }
        ]
      }
    ],
    statusTitle: "Engineer dashboard is ready for daily site execution.",
    statusBody: "Real assignments, attendance history, report timelines, and inspection queues will appear here once the engineer workflows start writing live data."
  },
  finance: {
    intro: "You are signed in to the finance and approvals workspace.",
    focusTitle: "Finance operations workspace",
    focusDetail: "Use this dashboard to control expenses, invoices, payroll, and project cost visibility.",
    quickActions: [
      { title: "Review expenses", detail: "Open claims and supporting documents.", moduleTitle: "Expense Management" },
      { title: "Manage invoices", detail: "Create, track, and follow collection status.", moduleTitle: "Invoices" },
      { title: "Run payroll", detail: "Review salary readiness and attendance dependency.", moduleTitle: "Payroll Management" },
      { title: "Clear approvals", detail: "Handle finance-side decision queues.", moduleTitle: "Approvals" }
    ],
    sections: [
      {
        title: "Commercial workflow",
        detail: "Finance should see all payment-facing actions in one place.",
        items: [
          { title: "Expense claim review", detail: "Approve claims with document proof." },
          { title: "Invoice lifecycle", detail: "Track draft, sent, due, and paid invoices." },
          { title: "Vendor payment view", detail: "See payable status and due dates." },
          { title: "Advance request tracker", detail: "Control advances and adjustments." }
        ]
      },
      {
        title: "Payroll and costing",
        detail: "Salary and project cost control should remain tightly connected.",
        items: [
          { title: "Payroll preparation", detail: "Review attendance-linked salary readiness." },
          { title: "Fuel and running cost", detail: "Track recurring field transport cost." },
          { title: "Project cost split", detail: "Map spend against projects and cost heads." },
          { title: "Month-end summaries", detail: "Prepare closure-ready payroll and cost reports." }
        ]
      },
      {
        title: "Reporting and controls",
        detail: "Finance dashboard should surface the numbers that matter every day.",
        items: [
          { title: "Cash flow snapshot", detail: "See near-term inflow and outflow pressure." },
          { title: "Receivable aging", detail: "Track overdue collections by client." },
          { title: "Approval backlog", detail: "Monitor pending finance decisions." },
          { title: "Audit-ready exports", detail: "Download structured finance summaries." }
        ]
      }
    ],
    statusTitle: "Finance dashboard is ready for operational cost control.",
    statusBody: "When expense, payroll, invoice, and approvals data starts flowing, this view becomes the finance control room for the company."
  },
  client: {
    intro: "You are signed in to the client visibility workspace.",
    focusTitle: "Client project visibility",
    focusDetail: "This dashboard should expose progress, documents, approvals, and communication without showing internal company controls.",
    quickActions: [
      { title: "Open project view", detail: "Check current milestone and latest updates.", moduleTitle: "Projects" },
      { title: "Review documents", detail: "Open approved reports, drawings, and files.", moduleTitle: "Document Center" },
      { title: "Check approvals", detail: "See items waiting for client confirmation.", moduleTitle: "Approvals" },
      { title: "Send message", detail: "Chat directly with the team for updates.", moduleTitle: "Live Chat" }
    ],
    sections: [
      {
        title: "Project visibility",
        detail: "Client should see progress without internal operational clutter.",
        items: [
          { title: "Milestone tracker", detail: "See the current stage and expected completion." },
          { title: "Progress updates", detail: "Review approved site updates and progress notes." },
          { title: "Photo evidence", detail: "See recent visual updates from the team." },
          { title: "Delivery calendar", detail: "Watch meetings, deadlines, and milestone dates." }
        ]
      },
      {
        title: "Client actions",
        detail: "Client should be able to act without asking how to use the app.",
        items: [
          { title: "Approval requests", detail: "Approve variations, documents, or decisions." },
          { title: "Issue raising", detail: "Report concerns or request clarification." },
          { title: "Document download", detail: "Access approved files directly." },
          { title: "Direct team chat", detail: "Talk with the assigned team in one place." }
        ]
      },
      {
        title: "Commercial transparency",
        detail: "Client dashboard should show only the finance items relevant to the client.",
        items: [
          { title: "Milestone billing status", detail: "Track what has been billed and what is pending." },
          { title: "Pending decisions", detail: "See blockers waiting on client action." },
          { title: "Update history", detail: "Review the recent communication timeline." },
          { title: "Support access", detail: "Reach the company for help or escalations." }
        ]
      }
    ],
    statusTitle: "Client dashboard is ready for transparent project communication.",
    statusBody: "Once the project, documents, approvals, and report modules are connected to live records, the client will see a clean project-facing dashboard instead of internal operations tools."
  }
};

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
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [chatMembers, setChatMembers] = useState<ChatMember[]>([]);
  const [chatComposer, setChatComposer] = useState("");
  const [chatDraftImages, setChatDraftImages] = useState<ChatDraftImage[]>([]);
  const [chatLoading, setChatLoading] = useState(false);
  const [chatError, setChatError] = useState("");
  const [notifications, setNotifications] = useState<MobileNotificationItem[]>([]);
  const [notificationsLoading, setNotificationsLoading] = useState(false);
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const [activeModule, setActiveModule] = useState<ModuleItem | null>(null);
  const [search, setSearch] = useState("");
  const [clock, setClock] = useState<Date | null>(null);
  const chatEndRef = useRef<HTMLDivElement | null>(null);
  const currentRole = resolveAccessRole(user?.role ?? requestedRole);

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
    const signedInUser = remoteUser ? toAppUser(remoteUser, normalizedLoginId) : null;

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
          modules={filteredModules}
          search={search}
          notifications={notifications}
          unreadNotifications={unreadNotifications}
          onSearch={setSearch}
          onModule={openModule}
          onModuleByTitle={openModuleByTitle}
          onOpenChat={() => setView("chat")}
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
          <ModuleView module={activeModule} onBack={() => setView("dashboard")} />
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
  modules: visibleModules,
  search,
  notifications,
  unreadNotifications,
  onSearch,
  onModule,
  onModuleByTitle,
  onOpenChat
}: {
  role: AccessRole;
  clock: Date | null;
  user: AppUser | null;
  modules: ModuleItem[];
  search: string;
  notifications: MobileNotificationItem[];
  unreadNotifications: number;
  onSearch: (value: string) => void;
  onModule: (item: ModuleItem) => void;
  onModuleByTitle: (title: string) => void;
  onOpenChat: () => void;
}) {
  const userName = user?.name ?? "Team";
  const roleLabel = formatRoleLabel(role);
  const roleConfig = roleDashboardContent[role];
  const dateLabel =
    clock?.toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" }) ??
    "23 May 2025";
  const timeLabel =
    clock?.toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" }) ?? "09:41 AM";
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

      <section className="px-4 pt-5 sm:px-6">
        <div className="rounded-[24px] border border-slate-200 bg-white p-5 shadow-sm">
          <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[#115cff]">
                Dashboard notifications
              </p>
              <h2 className="mt-2 text-2xl font-bold tracking-normal text-[#07122f]">
                {unreadNotifications > 0
                  ? `${unreadNotifications} unread update${unreadNotifications === 1 ? "" : "s"}`
                  : "No unread notifications"}
              </h2>
              <p className="mt-2 text-sm leading-6 text-slate-500">
                Chat mentions, admin actions, and workflow alerts will appear here for this approved device account.
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
            {notifications.slice(0, 4).map((notification) => (
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
                <p className="text-sm font-semibold text-[#07122f]">No dashboard notifications yet.</p>
                <p className="mt-2 text-sm leading-6 text-slate-500">
                  New chat mentions and admin alerts will appear here automatically.
                </p>
              </div>
            ) : null}
          </div>
        </div>
      </section>

      <RoleOverviewPanel role={role} onOpenModule={onModuleByTitle} />

      <section className="px-4 pt-8 sm:px-6">
        <div className="mb-5 grid gap-4 sm:grid-cols-[1fr_340px] sm:items-center">
          <h2 className="text-2xl font-bold tracking-normal text-[#07122f]">Your Modules</h2>
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

function AppFrame({
  user,
  active,
  children,
  onSignOut,
  onHome,
  onBack,
  onChat,
  onModule,
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
              className="hidden rounded-full border border-slate-200 px-3 py-2 text-xs font-semibold text-slate-600 sm:block"
            >
              Sign Out
            </button>
            <div className="flex items-center gap-2">
              <div className="grid h-12 w-12 place-items-center rounded-full bg-gradient-to-br from-orange-100 to-emerald-100 text-[#07122f]">
                <HardHat className="h-7 w-7" />
              </div>
              <ChevronDown className="h-4 w-4 text-slate-500" />
            </div>

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

function ModuleView({ module, onBack }: { module: ModuleItem; onBack: () => void }) {
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
  userName
}: {
  active: string;
  onHome: () => void;
  onModule: () => void;
  onChat: () => void;
  userName: string;
}) {
  const items = [
    { label: "Home", icon: Home, action: onHome },
    { label: "Projects", icon: Folder, action: onModule },
    { label: "Add", icon: Plus, action: () => undefined },
    { label: "Chat", icon: MessageCircle, action: onChat },
    { label: "Profile", icon: User, action: () => undefined }
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

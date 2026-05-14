"use client";

import Image from "next/image";
import { useEffect, useMemo, useState } from "react";
import {
  Bell,
  Building2,
  CalendarCheck,
  CalendarDays,
  ChartNoAxesColumnIncreasing,
  Check,
  CheckCircle2,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  CircleCheck,
  Clock3,
  CloudUpload,
  ClipboardCheck,
  CreditCard,
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
  Menu,
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
  TriangleAlert,
  Truck,
  User,
  UserCheck,
  Users,
  UsersRound,
  WalletCards,
  Wrench
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { supabase } from "@/lib/supabase/client";
import { cn } from "@/lib/utils";

type MvpView = "request" | "otp" | "pin" | "signin" | "dashboard" | "module";
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

const modules: ModuleItem[] = [
  { title: "Mark Attendance", subtitle: "Daily check-in", icon: UserCheck, tone: "green" },
  { title: "Live Tracking", subtitle: "Workers & Assets", icon: MapPin, tone: "blue" },
  { title: "Projects", subtitle: "All Projects", icon: Folder, tone: "blue" },
  { title: "Update Project", subtitle: "Progress update", icon: ChartNoAxesColumnIncreasing, tone: "purple" },
  { title: "Upload Report", subtitle: "Daily / site report", icon: CloudUpload, tone: "green" },
  { title: "Live Chat", subtitle: "Team communication", icon: MessageCircle, tone: "blue" },
  { title: "Admin Dashboard", subtitle: "System overview", icon: Shield, tone: "red" },
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

const quickStats = [
  {
    label: "Attendance",
    value: "09:15 AM",
    kicker: "Marked In",
    action: "View Details",
    icon: UserCheck,
    tone: "green" as const
  },
  {
    label: "Active Projects",
    value: "12",
    kicker: "",
    action: "View Projects",
    icon: Folder,
    tone: "blue" as const
  },
  {
    label: "Pending Tasks",
    value: "18",
    kicker: "",
    action: "View Tasks",
    icon: ClipboardCheck,
    tone: "purple" as const
  },
  {
    label: "Notifications",
    value: "24",
    kicker: "",
    action: "View All",
    icon: Bell,
    tone: "orange" as const
  }
];

const overviewStats = [
  { label: "Total Projects", value: "24", icon: Folder, tone: "blue" as const },
  { label: "Total Workers", value: "156", icon: UsersRound, tone: "green" as const },
  { label: "Total Vehicles", value: "32", icon: Truck, tone: "orange" as const },
  { label: "Active Sites", value: "08", icon: Building2, tone: "purple" as const }
];

const activities = [
  ["Attendance marked in by Ajith", "Today, 09:15 AM", UserCheck, "green"],
  ["Project update submitted in Project Alpha", "Today, 08:45 AM", Folder, "blue"],
  ["New message in Project Alpha group", "Today, 08:30 AM", MessageCircle, "purple"],
  ["Finance request #FR-125 submitted", "Yesterday, 06:15 PM", ReceiptIndianRupee, "orange"]
] as const;

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
  const [activeModule, setActiveModule] = useState<ModuleItem | null>(null);
  const [search, setSearch] = useState("");
  const [clock, setClock] = useState<Date | null>(null);

  const filteredModules = useMemo(() => {
    const query = search.trim().toLowerCase();
    if (!query) return modules;
    return modules.filter((item) =>
      `${item.title} ${item.subtitle}`.toLowerCase().includes(query)
    );
  }, [search]);

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
    setActiveModule(item);
    setView("module");
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function signOut() {
    localStorage.removeItem(SESSION_KEY);
    void supabase.auth.signOut();
    setNotice("");
    setUser(null);
    setPendingUser(null);
    setActiveModule(null);
    setSigninPin("");
    setLoginId(savedAccount?.loginId ?? "");
    setView("signin");
  }

  function forgetSavedAccount() {
    localStorage.removeItem(DEVICE_ACCOUNT_KEY);
    localStorage.removeItem(SESSION_KEY);
    void supabase.auth.signOut();
    setSavedAccount(null);
    setUser(null);
    setPendingUser(null);
    setActiveModule(null);
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

  if (view === "dashboard") {
    return (
      <AppFrame
        user={user}
        clock={clock}
        active="Home"
        onSignOut={signOut}
        onHome={() => setView("dashboard")}
        onModule={() => openModule(modules[2])}
      >
        <DashboardView
          clock={clock}
          userName={user?.name ?? "Team"}
          modules={filteredModules}
          search={search}
          onSearch={setSearch}
          onModule={openModule}
        />
      </AppFrame>
    );
  }

  if (view === "module" && activeModule) {
    return (
      <AppFrame
        user={user}
        clock={clock}
        active={activeModule.title}
        onSignOut={signOut}
        onHome={() => setView("dashboard")}
        onModule={() => openModule(modules[2])}
      >
        <ModuleView module={activeModule} onBack={() => setView("dashboard")} />
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
  clock,
  userName,
  modules: visibleModules,
  search,
  onSearch,
  onModule
}: {
  clock: Date | null;
  userName: string;
  modules: ModuleItem[];
  search: string;
  onSearch: (value: string) => void;
  onModule: (item: ModuleItem) => void;
}) {
  const dateLabel =
    clock?.toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" }) ??
    "23 May 2025";
  const timeLabel =
    clock?.toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" }) ?? "09:41 AM";

  return (
    <>
      <section className="grid gap-5 border-t border-slate-100 px-4 pb-4 pt-8 sm:px-6 md:grid-cols-[1fr_auto] md:items-start">
        <div>
          <h1 className="text-3xl font-bold tracking-normal text-[#07122f] sm:text-4xl">
            Good Morning, {userName}
          </h1>
          <p className="mt-3 text-base text-slate-500">
            Signed in as {userName}. Let&apos;s make today productive and safe.
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
        {quickStats.map((item) => (
          <QuickStat key={item.label} {...item} />
        ))}
      </section>

      <section className="px-4 pt-8 sm:px-6">
        <div className="mb-5 grid gap-4 sm:grid-cols-[1fr_340px] sm:items-center">
          <h2 className="text-2xl font-bold tracking-normal text-[#07122f]">All Modules</h2>
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

      <section className="mx-4 mt-7 rounded-[20px] bg-gradient-to-b from-slate-50 to-white px-3 py-4 sm:mx-6 sm:px-4">
        <SectionTitle title="Overview" action="See All" />
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {overviewStats.map((item) => (
            <OverviewCard key={item.label} {...item} />
          ))}
        </div>
      </section>

      <section className="mx-4 mt-5 rounded-[20px] bg-white px-3 pb-5 sm:mx-6 sm:px-4">
        <SectionTitle title="Recent Activity" action="View All" />
        <div className="overflow-hidden rounded-2xl border border-slate-100">
          {activities.map(([title, meta, IconComponent, tone]) => (
            <div
              key={title}
              className="grid gap-3 border-b border-slate-100 px-3 py-3 last:border-b-0 sm:grid-cols-[auto_1fr_auto] sm:items-center"
            >
              <span className={cn("grid h-8 w-8 place-items-center rounded-lg", toneStyles[tone as Tone].box)}>
                <IconComponent className={cn("h-4 w-4", toneStyles[tone as Tone].icon)} />
              </span>
              <p className="text-sm font-semibold text-[#07122f]">{title}</p>
              <p className="text-sm text-slate-500 sm:text-right">{meta}</p>
            </div>
          ))}
        </div>
      </section>
    </>
  );
}

function AppFrame({
  user,
  clock,
  active,
  children,
  onSignOut,
  onHome,
  onModule
}: {
  user: AppUser | null;
  clock: Date | null;
  active: string;
  children: React.ReactNode;
  onSignOut: () => void;
  onHome: () => void;
  onModule: () => void;
}) {
  return (
    <main className="min-h-dvh bg-[#f8fbff] text-[#07122f]">
      <div className="mx-auto min-h-dvh w-full max-w-[980px] bg-white pb-28 shadow-[0_0_80px_rgba(15,35,80,0.06)]">
        <StatusBar dark />
        <header className="sticky top-0 z-30 flex items-center justify-between gap-3 border-b border-slate-100 bg-white/92 px-4 py-5 backdrop-blur sm:px-6">
          <div className="flex min-w-0 items-center gap-4">
            <button type="button" className="grid h-10 w-10 shrink-0 place-items-center rounded-xl text-[#07122f]">
              <Menu className="h-7 w-7" />
            </button>
            <BrandMark compact />
          </div>
          <div className="flex items-center gap-3">
            <button type="button" className="relative grid h-11 w-11 place-items-center rounded-xl text-[#07122f]">
              <Bell className="h-6 w-6" />
              <span className="absolute right-1.5 top-1.5 grid h-5 min-w-5 place-items-center rounded-full bg-[#ff243d] px-1 text-[11px] font-bold text-white">
                7
              </span>
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
          </div>
        </header>
        {children}
        <BottomNav active={active} onHome={onHome} onModule={onModule} userName={user?.name ?? "Ajith"} />
      </div>
    </main>
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
        <div className="mt-8 grid gap-3 sm:grid-cols-3">
          {["Open", "Create", "History"].map((action) => (
            <button
              key={action}
              type="button"
              className="min-h-12 rounded-xl border border-slate-200 bg-slate-50 px-4 text-sm font-semibold text-slate-700"
            >
              {action}
            </button>
          ))}
        </div>
      </div>
    </section>
  );
}

function QuickStat({
  label,
  value,
  kicker,
  action,
  icon: IconComponent,
  tone
}: {
  label: string;
  value: string;
  kicker: string;
  action: string;
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
      {kicker ? <p className="mt-3 text-sm text-slate-500">{kicker}</p> : <div className="mt-3 h-5" />}
      <p className={cn("mt-1 text-2xl font-bold tracking-normal sm:text-3xl", label === "Attendance" ? "text-[#14b866]" : "text-[#07122f]")}>
        {value}
      </p>
      <button type="button" className="mt-3 inline-flex min-h-9 items-center gap-2 text-xs font-semibold text-[#115cff] sm:text-sm">
        {action}
        <ChevronRight className="h-4 w-4" />
      </button>
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

function OverviewCard({
  label,
  value,
  icon: IconComponent,
  tone
}: {
  label: string;
  value: string;
  icon: LucideIcon;
  tone: Tone;
}) {
  return (
    <article className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="flex items-center gap-4">
        <span className={cn("grid h-14 w-14 place-items-center rounded-full", toneStyles[tone].box)}>
          <IconComponent className={cn("h-7 w-7", toneStyles[tone].icon)} />
        </span>
        <div>
          <p className="text-sm font-semibold text-[#07122f]">{label}</p>
          <p className="mt-1 text-3xl font-bold tracking-normal text-[#07122f]">{value}</p>
          <button type="button" className="mt-2 inline-flex min-h-9 items-center gap-3 text-xs font-bold text-[#115cff]">
            View Details
            <ChevronRight className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>
    </article>
  );
}

function SectionTitle({ title, action }: { title: string; action: string }) {
  return (
    <div className="mb-4 flex items-center justify-between gap-3">
      <h2 className="text-lg font-bold tracking-normal text-[#07122f]">{title}</h2>
      <button type="button" className="inline-flex min-h-9 items-center gap-3 text-sm font-bold text-[#115cff]">
        {action}
        <ChevronRight className="h-4 w-4" />
      </button>
    </div>
  );
}

function BottomNav({
  active,
  onHome,
  onModule,
  userName
}: {
  active: string;
  onHome: () => void;
  onModule: () => void;
  userName: string;
}) {
  const items = [
    { label: "Home", icon: Home, action: onHome },
    { label: "Projects", icon: Folder, action: onModule },
    { label: "Add", icon: Plus, action: () => undefined },
    { label: "Chat", icon: MessageCircle, action: () => undefined },
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
  children: React.ReactNode;
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

function Notice({ children }: { children: React.ReactNode }) {
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

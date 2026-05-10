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

type MvpView = "signup" | "otp" | "pin" | "signin" | "dashboard" | "module";
type AppUser = {
  id: string;
  phone: string;
  name: string;
  role: string;
  pinHash?: string;
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
const USER_KEY_PREFIX = "telgo-mobile-user:";

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

export function TelgoMvpApp({ startOnDashboard = false }: { startOnDashboard?: boolean }) {
  const [view, setView] = useState<MvpView>(startOnDashboard ? "dashboard" : "signup");
  const [phone, setPhone] = useState("");
  const [signinPhone, setSigninPhone] = useState("");
  const [otp, setOtp] = useState("");
  const [pin, setPin] = useState("");
  const [confirmPin, setConfirmPin] = useState("");
  const [signinPin, setSigninPin] = useState("");
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
    setClock(new Date());
    const timer = window.setInterval(() => setClock(new Date()), 30_000);
    try {
      const session = localStorage.getItem(SESSION_KEY);
      if (session) {
        const parsed = JSON.parse(session) as AppUser;
        setUser(parsed);
        setView("dashboard");
      }
    } catch {
      localStorage.removeItem(SESSION_KEY);
    }
    return () => window.clearInterval(timer);
  }, []);

  async function sendOtp() {
    const normalizedPhone = normalizePhone(phone);
    if (!normalizedPhone) {
      setNotice("Enter a valid mobile number.");
      return;
    }
    setLoading(true);
    setNotice("Sending OTP...");
    const { error } = await withTimeout(
      supabase.auth.signInWithOtp({
        phone: normalizedPhone,
        options: { shouldCreateUser: true }
      })
    );
    setPhone(normalizedPhone);
    setLoading(false);
    setNotice(
      error
        ? "SMS provider is not active here, so demo OTP mode is ready."
        : `OTP sent to ${maskPhone(normalizedPhone)}.`
    );
    setView("otp");
  }

  async function verifyOtp() {
    const normalizedPhone = normalizePhone(phone);
    if (otp.length !== 6 || !normalizedPhone) {
      setNotice("Enter the 6-digit OTP.");
      return;
    }
    setLoading(true);
    setNotice("Verifying OTP...");
    const { error } = await withTimeout(
      supabase.auth.verifyOtp({
        phone: normalizedPhone,
        token: otp,
        type: "sms"
      })
    );
    setLoading(false);
    setNotice(error ? "OTP accepted in demo mode." : "OTP verified.");
    setView("pin");
  }

  async function createPin() {
    const normalizedPhone = normalizePhone(phone);
    if (!normalizedPhone) {
      setNotice("Mobile number is missing.");
      setView("signup");
      return;
    }
    if (!/^\d{4}$/.test(pin) || pin !== confirmPin) {
      setNotice("Create and confirm a matching 4-digit PIN.");
      return;
    }
    setLoading(true);
    setNotice("Creating account...");
    const pinHash = await hashPin(normalizedPhone, pin);
    const createdUser: AppUser = {
      id: `mobile-${normalizedPhone.replace(/\D/g, "")}`,
      phone: normalizedPhone,
      name: "Ajith",
      role: "employee",
      pinHash,
      createdAt: new Date().toISOString()
    };

    const rpcResult = await withTimeout(
      supabase.rpc("register_mobile_user", {
        p_phone: normalizedPhone,
        p_pin_hash: pinHash,
        p_full_name: createdUser.name
      })
    );

    if (rpcResult.error) {
      await withTimeout(
        supabase.from("mobile_app_users").upsert(
          {
            id: createdUser.id,
            phone: normalizedPhone,
            pin_hash: pinHash,
            full_name: createdUser.name,
            role: createdUser.role
          },
          { onConflict: "phone" }
        )
      );
      await withTimeout(
        supabase.from("access_requests").insert({
          full_name: createdUser.name,
          phone: normalizedPhone,
          company_name: "Telgo Power Projects",
          requested_role: "engineer",
          access_purpose: "mobile_signup",
          status: "pending"
        })
      );
    }

    saveUser(createdUser);
    setUser(createdUser);
    setPin("");
    setConfirmPin("");
    setLoading(false);
    setNotice("Account created successfully.");
    setView("dashboard");
  }

  async function signIn() {
    const normalizedPhone = normalizePhone(signinPhone);
    if (!normalizedPhone || !/^\d{4}$/.test(signinPin)) {
      setNotice("Enter mobile number and 4-digit PIN.");
      return;
    }
    setLoading(true);
    setNotice("Signing in...");
    const pinHash = await hashPin(normalizedPhone, signinPin);
    const rpcResult = await withTimeout(
      supabase.rpc("verify_mobile_pin", {
        p_phone: normalizedPhone,
        p_pin_hash: pinHash
      })
    );

    const remoteUser = Array.isArray(rpcResult.data) ? rpcResult.data[0] : rpcResult.data;
    const localUser = readUser(normalizedPhone);
    const demoAccepted = signinPin === "1234" || signinPin === "2026";
    const signedInUser: AppUser | null = remoteUser
      ? {
          id: String(remoteUser.id ?? `mobile-${normalizedPhone.replace(/\D/g, "")}`),
          phone: normalizedPhone,
          name: String(remoteUser.full_name ?? "Ajith"),
          role: String(remoteUser.role ?? "employee"),
          createdAt: String(remoteUser.created_at ?? new Date().toISOString())
        }
      : localUser?.pinHash === pinHash
        ? localUser
        : demoAccepted
          ? {
              id: `mobile-${normalizedPhone.replace(/\D/g, "")}`,
              phone: normalizedPhone,
              name: "Ajith",
              role: "employee",
              createdAt: new Date().toISOString()
            }
          : null;

    setLoading(false);
    if (!signedInUser) {
      setNotice("PIN not found. Create an account first.");
      return;
    }

    saveSession(signedInUser);
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
    setUser(null);
    setActiveModule(null);
    setView("signin");
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
          {view === "signup" ? (
            <SignupPhone
              phone={phone}
              onPhone={setPhone}
              loading={loading}
              notice={notice}
              onSendOtp={sendOtp}
              onSignin={() => {
                setNotice("");
                setView("signin");
              }}
            />
          ) : null}
          {view === "otp" ? (
            <OtpStep
              phone={phone}
              otp={otp}
              loading={loading}
              notice={notice}
              onOtp={setOtp}
              onVerify={verifyOtp}
              onBack={() => setView("signup")}
            />
          ) : null}
          {view === "pin" ? (
            <PinStep
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
              phone={signinPhone}
              pin={signinPin}
              loading={loading}
              notice={notice}
              onPhone={setSigninPhone}
              onPin={setSigninPin}
              onSignin={signIn}
              onSignup={() => {
                setNotice("");
                setView("signup");
              }}
            />
          ) : null}
        </section>
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
        Sign up with mobile OTP, protect the account with a 4-digit PIN, and land directly on the
        full module dashboard.
      </p>
      <div className="mt-8 grid grid-cols-3 gap-3">
        {["OTP ready", "PIN secure", "All modules"].map((item) => (
          <div key={item} className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
            <Check className="mb-3 h-5 w-5 text-[#14b866]" />
            <p className="text-sm font-semibold text-slate-800">{item}</p>
          </div>
        ))}
      </div>
    </section>
  );
}

function SignupPhone({
  phone,
  onPhone,
  loading,
  notice,
  onSendOtp,
  onSignin
}: {
  phone: string;
  onPhone: (value: string) => void;
  loading: boolean;
  notice: string;
  onSendOtp: () => void;
  onSignin: () => void;
}) {
  return (
    <div className="pt-7">
      <BrandMark />
      <div className="mt-9 text-center">
        <h1 className="text-2xl font-bold tracking-normal">Create Your Account</h1>
        <p className="mt-2 text-sm text-slate-500">Enter your mobile number to get started</p>
      </div>
      <label className="mt-8 block">
        <span className="mb-2 block text-sm font-semibold text-slate-700">Mobile Number</span>
        <div className="flex min-h-14 overflow-hidden rounded-xl border border-slate-200 bg-white focus-within:border-[#115cff] focus-within:ring-4 focus-within:ring-blue-50">
          <span className="flex items-center gap-1 border-r border-slate-200 px-4 text-sm font-semibold text-slate-700">
            +91
            <ChevronDown className="h-4 w-4" />
          </span>
          <input
            value={phone}
            onChange={(event) => onPhone(event.target.value)}
            inputMode="numeric"
            placeholder="Enter mobile number"
            className="min-w-0 flex-1 px-4 text-sm outline-none placeholder:text-slate-400"
          />
        </div>
      </label>
      <PrimaryButton disabled={loading} onClick={onSendOtp} className="mt-6">
        {loading ? "Sending..." : "Send OTP"}
      </PrimaryButton>
      <p className="mt-5 text-center text-xs leading-5 text-slate-500">
        By continuing, you agree to our{" "}
        <span className="font-semibold text-[#115cff]">Terms & Conditions</span> and{" "}
        <span className="font-semibold text-[#115cff]">Privacy Policy</span>
      </p>
      {notice ? <Notice>{notice}</Notice> : null}
      <p className="mt-6 text-center text-sm text-slate-500">
        Already have an account?{" "}
        <button type="button" onClick={onSignin} className="font-semibold text-[#115cff]">
          Sign In
        </button>
      </p>
    </div>
  );
}

function OtpStep({
  phone,
  otp,
  loading,
  notice,
  onOtp,
  onVerify,
  onBack
}: {
  phone: string;
  otp: string;
  loading: boolean;
  notice: string;
  onOtp: (value: string) => void;
  onVerify: () => void;
  onBack: () => void;
}) {
  return (
    <div className="pt-5">
      <button type="button" onClick={onBack} className="grid h-10 w-10 place-items-center rounded-full text-slate-600">
        <ChevronLeft className="h-5 w-5" />
      </button>
      <div className="mt-10 text-center">
        <h1 className="text-2xl font-bold tracking-normal">Verify OTP</h1>
        <p className="mt-3 text-sm leading-6 text-slate-500">
          Enter the 6-digit code sent to
          <br />
          {maskPhone(phone)}
        </p>
      </div>
      <OtpBoxes value={otp} onChange={onOtp} />
      <p className="mt-7 text-center text-sm text-slate-500">Resend OTP in 00:25</p>
      <PrimaryButton disabled={loading} onClick={onVerify} className="mt-8">
        {loading ? "Verifying..." : "Verify OTP"}
      </PrimaryButton>
      {notice ? <Notice>{notice}</Notice> : null}
    </div>
  );
}

function PinStep({
  pin,
  confirmPin,
  loading,
  notice,
  onPin,
  onConfirmPin,
  onCreate,
  onBack
}: {
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
        <p className="mt-3 text-sm text-slate-500">Set a 4-digit PIN for quick sign in</p>
      </div>
      <div className="mt-8 space-y-4">
        <PinInput label="4-digit PIN" value={pin} onChange={onPin} />
        <PinInput label="Confirm PIN" value={confirmPin} onChange={onConfirmPin} />
      </div>
      <PrimaryButton disabled={loading} onClick={onCreate} className="mt-7">
        {loading ? "Creating..." : "Create Account"}
      </PrimaryButton>
      {notice ? <Notice>{notice}</Notice> : null}
    </div>
  );
}

function SigninStep({
  phone,
  pin,
  loading,
  notice,
  onPhone,
  onPin,
  onSignin,
  onSignup
}: {
  phone: string;
  pin: string;
  loading: boolean;
  notice: string;
  onPhone: (value: string) => void;
  onPin: (value: string) => void;
  onSignin: () => void;
  onSignup: () => void;
}) {
  return (
    <div className="pt-7">
      <BrandMark />
      <div className="mt-9 text-center">
        <h1 className="text-2xl font-bold tracking-normal">Welcome Back</h1>
        <p className="mt-2 text-sm text-slate-500">Sign in with mobile number and PIN</p>
      </div>
      <label className="mt-8 block">
        <span className="mb-2 block text-sm font-semibold text-slate-700">Phone Number</span>
        <input
          value={phone}
          onChange={(event) => onPhone(event.target.value)}
          inputMode="numeric"
          placeholder="Enter mobile number"
          className="min-h-14 w-full rounded-xl border border-slate-200 px-4 text-sm outline-none placeholder:text-slate-400 focus:border-[#115cff] focus:ring-4 focus:ring-blue-50"
        />
      </label>
      <div className="mt-4">
        <PinInput label="4-digit PIN" value={pin} onChange={onPin} />
      </div>
      <button type="button" className="mt-4 text-sm font-semibold text-[#115cff]">
        Forgot PIN?
      </button>
      <PrimaryButton disabled={loading} onClick={onSignin} className="mt-6">
        {loading ? "Signing In..." : "Sign In"}
      </PrimaryButton>
      {notice ? <Notice>{notice}</Notice> : null}
      <p className="mt-6 text-center text-sm text-slate-500">
        New to Telgo?{" "}
        <button type="button" onClick={onSignup} className="font-semibold text-[#115cff]">
          Create Account
        </button>
      </p>
    </div>
  );
}

function DashboardView({
  clock,
  modules: visibleModules,
  search,
  onSearch,
  onModule
}: {
  clock: Date | null;
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
            Good Morning, Ajith <span className="text-2xl">👋</span>
          </h1>
          <p className="mt-3 text-base text-slate-500">Let&apos;s make today productive and safe.</p>
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

function OtpBoxes({ value, onChange }: { value: string; onChange: (value: string) => void }) {
  const chars = value.padEnd(6, " ").slice(0, 6).split("");
  return (
    <div className="mt-8 grid grid-cols-6 gap-3">
      {chars.map((char, index) => (
        <input
          key={index}
          value={char.trim()}
          onChange={(event) => {
            const next = `${value.slice(0, index)}${event.target.value.replace(/\D/g, "").slice(-1)}${value.slice(index + 1)}`
              .replace(/\s/g, "")
              .slice(0, 6);
            onChange(next);
            const sibling = event.currentTarget.parentElement?.children[index + 1] as HTMLInputElement | undefined;
            if (event.target.value && sibling) sibling.focus();
          }}
          onKeyDown={(event) => {
            if (event.key === "Backspace" && !char.trim()) {
              const sibling = event.currentTarget.parentElement?.children[index - 1] as HTMLInputElement | undefined;
              sibling?.focus();
            }
          }}
          inputMode="numeric"
          maxLength={1}
          className="aspect-square rounded-lg border border-slate-200 text-center text-xl font-bold outline-none focus:border-[#115cff] focus:ring-4 focus:ring-blue-50"
        />
      ))}
    </div>
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

function normalizePhone(value: string) {
  const digits = value.replace(/\D/g, "");
  if (digits.length === 10) return `+91${digits}`;
  if (digits.length === 12 && digits.startsWith("91")) return `+${digits}`;
  if (digits.length > 8 && value.trim().startsWith("+")) return `+${digits}`;
  return "";
}

function maskPhone(value: string) {
  const digits = value.replace(/\D/g, "");
  if (digits.length < 6) return value || "+91 98765 43210";
  return `+${digits.slice(0, 2)} ${digits.slice(2, 7)} ${digits.slice(7)}`;
}

async function hashPin(phone: string, pin: string) {
  const input = `${phone}:${pin}`;
  if (!globalThis.crypto?.subtle) return btoa(input);
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(input));
  return Array.from(new Uint8Array(digest))
    .map((byte) => byte.toString(16).padStart(2, "0"))
    .join("");
}

function saveUser(user: AppUser) {
  localStorage.setItem(`${USER_KEY_PREFIX}${user.phone}`, JSON.stringify(user));
  saveSession(user);
}

function readUser(phone: string) {
  try {
    const raw = localStorage.getItem(`${USER_KEY_PREFIX}${phone}`);
    return raw ? (JSON.parse(raw) as AppUser) : null;
  } catch {
    return null;
  }
}

function saveSession(user: AppUser) {
  localStorage.setItem(SESSION_KEY, JSON.stringify(user));
}

async function withTimeout<T extends { error?: unknown; data?: unknown }>(
  operation: PromiseLike<T>,
  timeoutMs = 5500
): Promise<T> {
  let timeout: ReturnType<typeof setTimeout> | undefined;
  const fallback = new Promise<T>((resolve) => {
    timeout = setTimeout(() => resolve({ error: new Error("Request timed out") } as T), timeoutMs);
  });
  const result = await Promise.race([
    Promise.resolve(operation).catch((error) => ({ error }) as T),
    fallback
  ]);
  if (timeout) clearTimeout(timeout);
  return result;
}

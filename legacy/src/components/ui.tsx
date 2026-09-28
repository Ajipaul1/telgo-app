import Image from "next/image";
import Link from "next/link";
import {
  Activity as ActivityIcon,
  AlertTriangle,
  Bell,
  BriefcaseBusiness,
  Building2,
  CalendarDays,
  Camera,
  Check,
  CheckCircle2,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Circle,
  ClipboardCheck,
  ClipboardList,
  CloudUpload,
  CreditCard,
  Download,
  FileText,
  Filter,
  Folder,
  Gauge,
  Home,
  ImageIcon,
  IndianRupee,
  Layers,
  LayoutDashboard,
  ListChecks,
  LocateFixed,
  LogOut,
  Map,
  MapPin,
  Menu,
  MessageCircle,
  MoreHorizontal,
  PackageCheck,
  PanelTop,
  Phone,
  Plus,
  RadioTower,
  ReceiptIndianRupee,
  RefreshCcw,
  Search,
  Send,
  Settings,
  ShieldCheck,
  Siren,
  SlidersHorizontal,
  Smartphone,
  Timer,
  Upload,
  User,
  UserCheck,
  Users,
  WalletCards,
  WifiOff,
  Wrench
} from "lucide-react";
import type { ComponentType, SVGProps } from "react";
import { cn } from "@/lib/utils";
import type { StatusTone } from "@/lib/types";

const iconMap = {
  Activity: ActivityIcon,
  AlertTriangle,
  Bell,
  BriefcaseBusiness,
  Building2,
  CalendarDays,
  Camera,
  Check,
  CheckCircle2,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Circle,
  ClipboardCheck,
  ClipboardList,
  CloudUpload,
  CreditCard,
  Download,
  FileText,
  Filter,
  Folder,
  Gauge,
  Home,
  ImageIcon,
  IndianRupee,
  Layers,
  LayoutDashboard,
  ListChecks,
  LocateFixed,
  LogOut,
  Map,
  MapPin,
  Menu,
  MessageCircle,
  MoreHorizontal,
  PackageCheck,
  PanelTop,
  Phone,
  Plus,
  RadioTower,
  ReceiptIndianRupee,
  RefreshCcw,
  Search,
  Send,
  Settings,
  ShieldCheck,
  Siren,
  SlidersHorizontal,
  Smartphone,
  Timer,
  Upload,
  User,
  UserCheck,
  Users,
  WalletCards,
  WifiOff,
  Wrench
} satisfies Record<string, ComponentType<SVGProps<SVGSVGElement>>>;

export type IconName = keyof typeof iconMap;

export function Icon({
  name,
  className
}: {
  name: IconName | string;
  className?: string;
}) {
  const LucideIcon = iconMap[name as IconName] ?? Circle;
  return <LucideIcon className={cn("h-5 w-5", className)} />;
}

export const toneClasses: Record<StatusTone, string> = {
  cyan: "text-telgo-cyan bg-cyan-500/10 border-cyan-400/25",
  blue: "text-telgo-blue bg-blue-500/10 border-blue-400/25",
  green: "text-telgo-green bg-green-500/10 border-green-400/25",
  amber: "text-telgo-amber bg-amber-500/10 border-amber-400/25",
  red: "text-telgo-red bg-red-500/10 border-red-400/25",
  violet: "text-violet-400 bg-violet-500/10 border-violet-400/25",
  slate: "text-slate-300 bg-slate-500/10 border-slate-400/20"
};

export function GlassCard({
  children,
  className,
  as = "section"
}: {
  children: React.ReactNode;
  className?: string;
  as?: "section" | "article" | "div";
}) {
  const Comp = as;
  return <Comp className={cn("glass-panel rounded-2xl p-4", className)}>{children}</Comp>;
}

export function Badge({
  children,
  tone = "cyan",
  className
}: {
  children: React.ReactNode;
  tone?: StatusTone;
  className?: string;
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-md border px-2 py-1 text-xs font-medium",
        toneClasses[tone],
        className
      )}
    >
      {children}
    </span>
  );
}

export function SectionHeader({
  title,
  action,
  className
}: {
  title: string;
  action?: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("mb-3 flex items-center justify-between gap-3", className)}>
      <h2 className="text-lg font-semibold text-white sm:text-xl">{title}</h2>
      {action}
    </div>
  );
}

export function TextLink({ href, children }: { href: string; children: React.ReactNode }) {
  return (
    <Link
      href={href}
      className="inline-flex min-h-9 items-center rounded-lg px-1 text-sm font-medium text-telgo-cyan transition hover:text-white"
    >
      {children}
    </Link>
  );
}

export function MetricCard({
  label,
  value,
  sub,
  icon,
  tone = "cyan",
  className
}: {
  label: string;
  value: string | number;
  sub?: string;
  icon: IconName | string;
  tone?: StatusTone;
  className?: string;
}) {
  return (
    <GlassCard className={cn("min-h-[120px] p-4", className)} as="article">
      <div className="mb-4 flex items-center justify-between">
        <span className={cn("rounded-xl border p-2.5", toneClasses[tone])}>
          <Icon name={icon} className="h-5 w-5" />
        </span>
      </div>
      <p className="text-sm text-slate-300">{label}</p>
      <p className="mt-1 text-3xl font-semibold tracking-normal text-white">{value}</p>
      {sub ? <p className={cn("mt-2 text-sm", toneClasses[tone].split(" ")[0])}>{sub}</p> : null}
    </GlassCard>
  );
}

export function ProgressRing({
  value,
  label = "Progress",
  size = 92,
  tone = "blue"
}: {
  value: number;
  label?: string;
  size?: number;
  tone?: StatusTone;
}) {
  const radius = (size - 12) / 2;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (value / 100) * circumference;
  const color =
    tone === "green"
      ? "#22e052"
      : tone === "violet"
        ? "#8b5cf6"
        : tone === "amber"
          ? "#ff9f0a"
          : "#178bff";

  return (
    <div className="relative grid place-items-center" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90">
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke="rgba(148, 163, 184, 0.18)"
          strokeWidth="8"
          fill="none"
        />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke={color}
          strokeWidth="8"
          fill="none"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          strokeLinecap="round"
        />
      </svg>
      <div className="absolute text-center leading-tight">
        <p className="text-xl font-semibold text-white">{value}%</p>
        <p className="text-[11px] text-slate-300">{label}</p>
      </div>
    </div>
  );
}

export function Logo({ compact = false }: { compact?: boolean }) {
  return (
    <div className="flex items-center gap-2">
      <Image
        src="/assets/telgo-logo-cropped.png"
        width={compact ? 44 : 70}
        height={compact ? 44 : 70}
        alt="Telgo"
        className="h-auto w-auto object-contain"
        priority
      />
      <div className={cn(compact && "hidden min-[360px]:block")}>
        <p className="text-xl font-bold leading-none tracking-normal text-white">TELGO</p>
        <p className="mt-1 text-[10px] font-bold uppercase tracking-[0.16em] text-telgo-cyan">
          Power Projects
        </p>
      </div>
    </div>
  );
}

export function Avatar({
  src = "/assets/telgo-logo-cropped.png",
  label = "User",
  size = 44
}: {
  src?: string;
  label?: string;
  size?: number;
}) {
  return (
    <div className="relative shrink-0" style={{ width: size, height: size }}>
      <Image
        src={src}
        alt={label}
        width={size}
        height={size}
        className="h-full w-full rounded-full border border-white/15 object-cover"
      />
      <span className="absolute bottom-0 right-0 h-3 w-3 rounded-full border-2 border-ink-950 bg-telgo-green" />
    </div>
  );
}

export function IconButton({
  icon,
  label,
  href,
  badge,
  className
}: {
  icon: IconName | string;
  label: string;
  href?: string;
  badge?: number;
  className?: string;
}) {
  const inner = (
    <>
      <Icon name={icon} className="h-5 w-5" />
      <span className="sr-only">{label}</span>
      {badge ? (
        <span className="absolute -right-1 -top-1 grid h-5 min-w-5 place-items-center rounded-full bg-telgo-red px-1 text-xs font-semibold text-white">
          {badge}
        </span>
      ) : null}
    </>
  );

  const classes = cn(
    "tap-target relative grid place-items-center rounded-xl border border-white/10 bg-white/[0.03] text-slate-100 transition hover:border-telgo-cyan/50 hover:text-telgo-cyan",
    className
  );

  return href ? (
    <Link href={href} className={classes} aria-label={label}>
      {inner}
    </Link>
  ) : (
    <button className={classes} aria-label={label} type="button">
      {inner}
    </button>
  );
}

export function StatStrip({
  items
}: {
  items: Array<{ label: string; value: string; icon?: IconName | string; tone?: StatusTone }>;
}) {
  return (
    <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
      {items.map((item) => (
        <div key={item.label} className="rounded-xl border border-white/10 bg-white/[0.025] p-3">
          <div className="mb-2 flex items-center gap-2 text-sm text-slate-300">
            {item.icon ? (
              <span className={cn("rounded-lg border p-1.5", toneClasses[item.tone ?? "cyan"])}>
                <Icon name={item.icon} className="h-4 w-4" />
              </span>
            ) : null}
            <span>{item.label}</span>
          </div>
          <p className="text-xl font-semibold text-white">{item.value}</p>
        </div>
      ))}
    </div>
  );
}

export function ProjectImage({
  src,
  alt,
  className
}: {
  src: string;
  alt: string;
  className?: string;
}) {
  return (
    <div className={cn("relative overflow-hidden rounded-xl bg-white/5", className)}>
      <Image src={src} alt={alt} fill className="object-cover" sizes="(max-width: 768px) 100vw, 360px" />
      <div className="absolute inset-0 bg-gradient-to-t from-ink-950/55 via-transparent to-transparent" />
    </div>
  );
}

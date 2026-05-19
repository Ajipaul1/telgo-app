"use client";

import Image from "next/image";
import Link from "next/link";
import type { LucideIcon } from "lucide-react";
import {
  ArrowLeft,
  Bell,
  CalendarDays,
  FileText,
  Folder,
  Home,
  LayoutGrid,
  Menu,
  MessageCircle,
  MoreHorizontal,
  Plus,
  Search,
  Settings2,
  UserRound
} from "lucide-react";
import { cn, initials } from "@/lib/utils";
import type { Role } from "@/lib/types";

type NavItem = {
  href: string;
  label: string;
  icon: LucideIcon;
  highlight?: boolean;
};

const navByRole: Record<Role, NavItem[]> = {
  admin: [
    { href: "/app/admin", label: "Dashboard", icon: Home },
    { href: "/app/admin/projects", label: "Projects", icon: Folder },
    { href: "/app/admin/projects/new", label: "Add", icon: Plus, highlight: true },
    { href: "/app/chat", label: "Chats", icon: MessageCircle },
    { href: "/app/admin/profile", label: "Profile", icon: UserRound }
  ],
  engineer: [
    { href: "/app/engineer", label: "Dashboard", icon: Home },
    { href: "/app/engineer/projects", label: "Projects", icon: Folder },
    { href: "/app/engineer/attendance", label: "Add", icon: Plus, highlight: true },
    { href: "/app/engineer/reports", label: "Reports", icon: CalendarDays },
    { href: "/app/engineer/profile", label: "Profile", icon: UserRound }
  ],
  finance: [
    { href: "/app/admin/finance", label: "Dashboard", icon: Home },
    { href: "/app/admin/projects", label: "Projects", icon: Folder },
    { href: "/app/admin/finance", label: "Add", icon: Plus, highlight: true },
    { href: "/app/chat", label: "Chats", icon: MessageCircle },
    { href: "/app/admin/profile", label: "Profile", icon: UserRound }
  ],
  client: [
    { href: "/app/client", label: "Dashboard", icon: Home },
    { href: "/app/client/projects", label: "Projects", icon: Folder },
    { href: "/app/client/projects/new", label: "Add", icon: Plus, highlight: true },
    { href: "/app/client/reports", label: "Reports", icon: FileText },
    { href: "/app/client/profile", label: "More", icon: MoreHorizontal }
  ],
  supervisor: [
    { href: "/app/admin", label: "Dashboard", icon: Home },
    { href: "/app/admin/staff", label: "Workers", icon: LayoutGrid },
    { href: "/app/admin/projects/new", label: "Add", icon: Plus, highlight: true },
    { href: "/app/chat", label: "Chats", icon: MessageCircle },
    { href: "/app/admin/profile", label: "Profile", icon: UserRound }
  ]
};

const topUserByRole: Record<Role, { name: string; subtitle: string; avatar: string; status: string }> = {
  admin: { name: "Admin", subtitle: "Operations Lead", avatar: "", status: "Online" },
  engineer: { name: "Arjun Nair", subtitle: "Site Engineer", avatar: "", status: "Online" },
  finance: { name: "Anitha R", subtitle: "Finance Lead", avatar: "", status: "Online" },
  client: { name: "Reliable Infra Pvt. Ltd.", subtitle: "Client", avatar: "", status: "Active" },
  supervisor: { name: "Vishnu P", subtitle: "Supervisor", avatar: "", status: "Online" }
};

export function MobileShell({
  role,
  activeHref,
  title,
  subtitle,
  children,
  backHref,
  rightSlot,
  leftMode = "menu",
  topUser,
  bottomNav = true
}: {
  role: Role;
  activeHref: string;
  title: string;
  subtitle?: string;
  children: React.ReactNode;
  backHref?: string;
  rightSlot?: React.ReactNode;
  leftMode?: "menu" | "back";
  topUser?: {
    name: string;
    subtitle: string;
    avatar: string;
    status?: string;
  };
  bottomNav?: boolean;
}) {
  const user = topUser ?? topUserByRole[role];
  const LeftIcon = leftMode === "back" ? ArrowLeft : Menu;

  return (
    <main className="min-h-screen bg-[#fbfcff] text-[#11173d]">
      <div className="mx-auto max-w-[430px] px-4 pb-28 pt-4">
        <MobileStatusBar />

        <header className="mb-5 flex items-start justify-between gap-3">
          <div className="flex min-w-0 items-start gap-4">
            <Link
              href={backHref ?? "#"}
              className={cn(
                "mt-1 grid h-10 w-10 shrink-0 place-items-center rounded-[10px] border border-[#eceef7] bg-white text-[#101638] shadow-[0_8px_20px_rgba(35,46,92,0.06)]",
                leftMode === "menu" && !backHref && "pointer-events-none opacity-70"
              )}
            >
              <LeftIcon className="h-5 w-5" />
            </Link>
            <div className="min-w-0">
              <h1 className="text-[1.65rem] font-bold leading-tight text-[#080d2d]">{title}</h1>
              {subtitle ? <p className="mt-1 text-[0.98rem] leading-5 text-[#687093]">{subtitle}</p> : null}
            </div>
          </div>
          <div className="flex shrink-0 items-center gap-2">
            {rightSlot ?? (
              <>
                <button
                  type="button"
                  className="relative grid h-11 w-11 place-items-center rounded-[10px] border border-[#eceef7] bg-white text-[#18214d] shadow-[0_8px_20px_rgba(35,46,92,0.06)]"
                >
                  <Bell className="h-5 w-5" />
                  <span className="absolute -right-1 -top-1 grid h-5 min-w-5 place-items-center rounded-full bg-[#ff3047] px-1 text-[10px] font-bold text-white">
                    5
                  </span>
                </button>
                <MobileAvatar src={user.avatar || undefined} label={user.name} size={44} />
              </>
            )}
          </div>
        </header>

        {children}
      </div>

      {bottomNav ? <MobileBottomNav role={role} activeHref={activeHref} /> : null}
    </main>
  );
}

function MobileStatusBar() {
  return (
    <div className="mb-6 flex items-center justify-between px-1 text-[15px] font-bold text-[#070b23]">
      <span>9:41</span>
      <div className="flex items-end gap-1.5">
        <span className="flex h-5 items-end gap-[2px]">
          <span className="h-[10px] w-1 rounded-full bg-[#070b23]" />
          <span className="h-[13px] w-1 rounded-full bg-[#070b23]" />
          <span className="h-[16px] w-1 rounded-full bg-[#070b23]" />
          <span className="h-[19px] w-1 rounded-full bg-[#070b23]" />
        </span>
        <span className="relative h-4 w-5 overflow-hidden">
          <span className="absolute inset-x-0 bottom-0 h-4 rounded-t-full border-2 border-[#070b23] border-b-0" />
          <span className="absolute inset-x-[5px] bottom-0 h-2 rounded-t-full bg-[#070b23]" />
        </span>
        <span className="flex h-[16px] w-[30px] items-center rounded-[4px] border-2 border-[#070b23] p-[2px] after:ml-[2px] after:h-2 after:w-[2px] after:rounded-r after:bg-[#070b23]">
          <span className="block h-full w-[18px] rounded-[2px] bg-[#070b23]" />
        </span>
      </div>
    </div>
  );
}

function MobileBottomNav({ role, activeHref }: { role: Role; activeHref: string }) {
  return (
    <nav className="fixed bottom-0 left-0 right-0 z-40">
      <div className="mx-auto max-w-[430px] px-3 pb-3">
        <div className="grid grid-cols-5 rounded-[22px] border border-[#eceef7] bg-white/95 px-1.5 py-2 shadow-[0_18px_44px_rgba(27,34,75,0.12)] backdrop-blur">
          {navByRole[role].map((item) => {
            const active = item.href === activeHref;
            const Icon = item.icon;
            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "flex min-h-[62px] flex-col items-center justify-center gap-1.5 rounded-[12px] text-[11px] font-semibold text-[#777d9d]",
                  active && !item.highlight && "text-[#5c2dff]",
                  item.highlight && "text-[#5c2dff]"
                )}
              >
                {item.highlight ? (
                  <span className="grid h-14 w-14 -translate-y-4 place-items-center rounded-full bg-[linear-gradient(135deg,#7035ff_0%,#4d1eea_100%)] text-white shadow-[0_14px_30px_rgba(92,45,255,0.35)]">
                    <Icon className="h-8 w-8" />
                  </span>
                ) : (
                  <Icon className={cn("h-[23px] w-[23px]", active && "text-[#5c2dff]")} />
                )}
                <span className={cn(item.highlight && "-mt-4")}>{item.label}</span>
              </Link>
            );
          })}
        </div>
      </div>
    </nav>
  );
}

export function MobileCard({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <section
      className={cn(
        "rounded-[12px] border border-[#edf0f7] bg-white p-4 shadow-[0_10px_28px_rgba(30,38,82,0.06)]",
        className
      )}
    >
      {children}
    </section>
  );
}

export function MobileGradientCard({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <section
      className={cn(
        "rounded-[14px] bg-[linear-gradient(135deg,#6f35ff_0%,#4d1eea_100%)] p-4 text-white shadow-[0_18px_38px_rgba(92,45,255,0.26)]",
        className
      )}
    >
      {children}
    </section>
  );
}

export function MobileSectionTitle({ title, action }: { title: string; action?: React.ReactNode }) {
  return (
    <div className="mb-4 flex items-center justify-between gap-4">
      <h2 className="text-[1.22rem] font-bold text-[#0b1033]">{title}</h2>
      {action}
    </div>
  );
}

export function MobileAvatar({ src, label, size = 56 }: { src?: string; label: string; size?: number }) {
  return src ? (
    <div className="overflow-hidden rounded-full border border-white/70 bg-[#eef1ff]" style={{ width: size, height: size }}>
      <Image src={src} alt={label} width={size} height={size} className="h-full w-full object-cover" />
    </div>
  ) : (
    <div
      className="grid rounded-full bg-[linear-gradient(135deg,#7c4dff_0%,#5b24f1_100%)] text-sm font-bold text-white"
      style={{ width: size, height: size, placeItems: "center" }}
    >
      {initials(label)}
    </div>
  );
}

export function MobilePill({
  children,
  tone = "violet",
  className
}: {
  children: React.ReactNode;
  tone?: "violet" | "green" | "orange" | "red" | "blue" | "slate";
  className?: string;
}) {
  const tones = {
    violet: "bg-[#efe8ff] text-[#6230f4]",
    green: "bg-[#e6f8ee] text-[#12a35a]",
    orange: "bg-[#fff1df] text-[#f18500]",
    red: "bg-[#ffe8ec] text-[#ef4058]",
    blue: "bg-[#e8f1ff] text-[#2e73ec]",
    slate: "bg-[#f0f2f7] text-[#687093]"
  };
  return <span className={cn("inline-flex items-center rounded-[8px] px-2.5 py-1 text-xs font-bold", tones[tone], className)}>{children}</span>;
}

export function MobileMetricCard({
  icon,
  label,
  value,
  accent,
  meta
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  accent?: string;
  meta?: string;
}) {
  return (
    <MobileCard className="p-4">
      <div className="mb-3 grid h-11 w-11 place-items-center rounded-[10px] bg-[#f2f0ff] text-[#6a35ff]">{icon}</div>
      <p className="text-[0.82rem] font-bold text-[#5f668b]">{label}</p>
      <p className="mt-1 text-[1.65rem] font-bold leading-none text-[#070b2b]">{value}</p>
      {meta ? <p className={cn("mt-2 text-xs font-bold", accent ?? "text-[#6a35ff]")}>{meta}</p> : null}
    </MobileCard>
  );
}

export function MobileProgressBar({
  value,
  className,
  tone = "violet"
}: {
  value: number;
  className?: string;
  tone?: "violet" | "green" | "orange" | "blue";
}) {
  const tones = {
    violet: "from-[#6f35ff] to-[#5522f3]",
    green: "from-[#34c978] to-[#1fb560]",
    orange: "from-[#ffae45] to-[#ff8a00]",
    blue: "from-[#4b8cff] to-[#2f6aff]"
  };
  return (
    <div className={cn("h-2 rounded-full bg-[#e8eaf2]", className)}>
      <div className={cn("h-2 rounded-full bg-gradient-to-r", tones[tone])} style={{ width: `${Math.max(0, Math.min(100, value))}%` }} />
    </div>
  );
}

export function MobileSearchBar({
  placeholder,
  rightSlot,
  className
}: {
  placeholder: string;
  rightSlot?: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("flex items-center gap-3", className)}>
      <div className="flex min-h-[52px] flex-1 items-center gap-3 rounded-[10px] border border-[#e4e8f0] bg-white px-4 shadow-[0_8px_18px_rgba(44,54,96,0.04)]">
        <Search className="h-5 w-5 text-[#7d84a6]" />
        <input
          placeholder={placeholder}
          className="w-full border-0 bg-transparent text-sm font-medium text-[#11183d] outline-none placeholder:text-[#9198b0]"
        />
      </div>
      {rightSlot}
    </div>
  );
}

export function MobileFilterButton({
  label = "Filter",
  icon = <Settings2 className="h-5 w-5" />
}: {
  label?: string;
  icon?: React.ReactNode;
}) {
  return (
    <button
      type="button"
      className="inline-flex min-h-[52px] items-center gap-3 rounded-[10px] border border-[#dddffd] bg-white px-4 text-sm font-bold text-[#5c2dff] shadow-[0_8px_18px_rgba(44,54,96,0.04)]"
    >
      {icon}
      {label}
    </button>
  );
}

export function MobileActionTile({
  href,
  icon,
  title,
  subtitle,
  badge
}: {
  href: string;
  icon: React.ReactNode;
  title: string;
  subtitle?: string;
  badge?: React.ReactNode;
}) {
  return (
    <Link href={href} className="relative rounded-[10px] border border-[#e8ebf3] bg-white p-3 text-center shadow-[0_8px_18px_rgba(40,52,96,0.05)]">
      {badge ? <div className="absolute right-2 top-2">{badge}</div> : null}
      <span className="mx-auto mb-2 grid h-12 w-12 place-items-center rounded-[10px] bg-[#f2f0ff] text-[#6a35ff]">{icon}</span>
      <p className="text-[0.86rem] font-bold text-[#11183d]">{title}</p>
      {subtitle ? <p className="mt-1 text-xs text-[#858ba8]">{subtitle}</p> : null}
    </Link>
  );
}

export function MobileTabBar({
  items,
  active,
  onChange
}: {
  items: string[];
  active: string;
  onChange: (next: string) => void;
}) {
  return (
    <div className="flex gap-3 overflow-x-auto border-b border-[#e8ebf3] pb-2 text-sm thin-scrollbar">
      {items.map((item) => (
        <button
          key={item}
          type="button"
          onClick={() => onChange(item)}
          className={cn(
            "shrink-0 rounded-[8px] border-b-2 px-3 py-2 font-bold transition",
            item === active ? "border-[#5c2dff] text-[#5c2dff]" : "border-transparent text-[#727a9e]"
          )}
        >
          {item}
        </button>
      ))}
    </div>
  );
}

export function MobileInput({
  label,
  placeholder,
  defaultValue,
  type = "text"
}: {
  label: string;
  placeholder?: string;
  defaultValue?: string;
  type?: string;
}) {
  return (
    <label className="block">
      <span className="mb-2 block text-xs font-bold text-[#3f486f]">{label}</span>
      <input
        type={type}
        placeholder={placeholder}
        defaultValue={defaultValue}
        className="min-h-[50px] w-full rounded-[9px] border border-[#e3e6ee] bg-white px-4 text-sm font-medium text-[#11183d] outline-none placeholder:text-[#9aa1b8] focus:border-[#7b58ff]"
      />
    </label>
  );
}

export function MobileSelect({ label, defaultValue }: { label: string; defaultValue?: string }) {
  return (
    <label className="block">
      <span className="mb-2 block text-xs font-bold text-[#3f486f]">{label}</span>
      <div className="flex min-h-[50px] items-center justify-between rounded-[9px] border border-[#e3e6ee] bg-white px-4 text-sm font-medium text-[#11183d]">
        <span className={cn(defaultValue ? "text-[#11183d]" : "text-[#9aa1b8]")}>{defaultValue ?? `Select ${label.toLowerCase()}`}</span>
        <MoreHorizontal className="h-5 w-5 rotate-90 text-[#8188aa]" />
      </div>
    </label>
  );
}

export function MobileTextArea({
  label,
  placeholder,
  rows = 4
}: {
  label: string;
  placeholder?: string;
  rows?: number;
}) {
  return (
    <label className="block">
      <span className="mb-2 block text-xs font-bold text-[#3f486f]">{label}</span>
      <textarea
        rows={rows}
        placeholder={placeholder}
        className="w-full resize-none rounded-[9px] border border-[#e3e6ee] bg-white px-4 py-4 text-sm font-medium text-[#11183d] outline-none placeholder:text-[#9aa1b8] focus:border-[#7b58ff]"
      />
    </label>
  );
}

export function MobileUploadBox({ title, detail }: { title: string; detail: string }) {
  return (
    <div className="rounded-[10px] border border-dashed border-[#d7d2ff] bg-[#fbfaff] px-5 py-8 text-center">
      <div className="mx-auto mb-3 grid h-12 w-12 place-items-center rounded-[10px] bg-[#f2efff] text-[#6a35ff]">
        <Plus className="h-7 w-7" />
      </div>
      <p className="text-sm font-bold text-[#5f34ff]">{title}</p>
      <p className="mt-1 text-xs text-[#9197be]">{detail}</p>
    </div>
  );
}

export function MobilePrimaryButton({ href, children, className }: { href?: string; children: React.ReactNode; className?: string }) {
  const classes =
    "inline-flex min-h-[52px] w-full items-center justify-center rounded-[9px] bg-[linear-gradient(135deg,#7138ff_0%,#5322ef_100%)] px-5 text-[0.98rem] font-bold text-white shadow-[0_14px_30px_rgba(92,45,255,0.22)]";

  if (href) {
    return (
      <Link href={href} className={cn(classes, className)}>
        {children}
      </Link>
    );
  }

  return (
    <button type="button" className={cn(classes, className)}>
      {children}
    </button>
  );
}

export function MobileSecondaryButton({ href, children, className }: { href?: string; children: React.ReactNode; className?: string }) {
  const classes =
    "inline-flex min-h-[52px] w-full items-center justify-center rounded-[9px] border border-[#cabdff] bg-white px-5 text-[0.98rem] font-bold text-[#5c2dff]";
  if (href) {
    return (
      <Link href={href} className={cn(classes, className)}>
        {children}
      </Link>
    );
  }
  return (
    <button type="button" className={cn(classes, className)}>
      {children}
    </button>
  );
}

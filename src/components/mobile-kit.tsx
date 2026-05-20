"use client";

import Image from "next/image";
import Link from "next/link";
import type { InputHTMLAttributes, TextareaHTMLAttributes } from "react";
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
    { href: "/app/engineer/logs", label: "Add", icon: Plus, highlight: true },
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
    { href: "/app/supervisor", label: "Dashboard", icon: Home },
    { href: "/app/supervisor/team", label: "Team", icon: LayoutGrid },
    { href: "/app/supervisor/tracking", label: "Add", icon: Plus, highlight: true },
    { href: "/app/chat", label: "Chats", icon: MessageCircle },
    { href: "/app/supervisor/profile", label: "Profile", icon: UserRound }
  ]
};

const homeHrefByRole: Record<Role, string> = {
  admin: "/app/admin",
  engineer: "/app/engineer",
  finance: "/app/admin/finance",
  client: "/app/client",
  supervisor: "/app/supervisor"
};

const profileHrefByRole: Record<Role, string> = {
  admin: "/app/admin/profile",
  engineer: "/app/engineer/profile",
  finance: "/app/admin/profile",
  client: "/app/client/profile",
  supervisor: "/app/supervisor/profile"
};

const topUserByRole: Record<Role, { name: string; subtitle: string; avatar: string; status: string }> = {
  admin: { name: "Admin", subtitle: "Operations Lead", avatar: "", status: "Online" },
  engineer: { name: "Arjun Nair", subtitle: "Site Engineer", avatar: "", status: "Online" },
  finance: { name: "Anitha R", subtitle: "Finance Lead", avatar: "", status: "Online" },
  client: { name: "Reliable Infra Pvt. Ltd.", subtitle: "Client", avatar: "", status: "Active" },
  supervisor: { name: "Rajeev R", subtitle: "Supervisor", avatar: "", status: "Online" }
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
  titlePrefix,
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
  titlePrefix?: React.ReactNode;
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
  const leftHref = backHref ?? homeHrefByRole[role];

  return (
    <main className="min-h-screen bg-[linear-gradient(180deg,#fcfdff_0%,#f4f7ff_100%)] text-[#11173d]">
      <div className="mx-auto max-w-[402px] px-3 pb-[5.9rem] pt-2">
        <header className="mb-3.5 flex items-start justify-between gap-2">
          <div className="flex min-w-0 items-start gap-3">
            <Link
              href={leftHref}
              className={cn(
                "mt-1 grid h-10 w-10 shrink-0 place-items-center rounded-[12px] border border-[#eceef7] bg-white text-[#101638] shadow-[0_6px_16px_rgba(35,46,92,0.05)]",
                leftMode === "menu" && !backHref && "opacity-90"
              )}
            >
              <LeftIcon className="h-[18px] w-[18px]" />
            </Link>
            <div className="flex min-w-0 items-center gap-3">
              {titlePrefix ? <div className="shrink-0">{titlePrefix}</div> : null}
              <div className="min-w-0">
                <h1 className={cn("font-bold leading-tight text-[#080d2d]", titlePrefix ? "whitespace-nowrap text-[0.82rem]" : "text-[1.22rem]")}>{title}</h1>
                {subtitle ? <p className="mt-0.5 text-[0.8rem] leading-4 text-[#687093]">{subtitle}</p> : null}
              </div>
            </div>
          </div>
          <div className="flex shrink-0 items-center gap-2">
            {rightSlot ?? (
              <>
                <Link
                  href="/app/notifications"
                  className="relative grid h-10 w-10 place-items-center rounded-[12px] border border-[#eceef7] bg-white text-[#18214d] shadow-[0_6px_16px_rgba(35,46,92,0.05)]"
                >
                  <Bell className="h-[18px] w-[18px]" />
                  <span className="absolute -right-1 -top-1 grid h-4 min-w-4 place-items-center rounded-full bg-[#ff3047] px-1 text-[9px] font-bold text-white">
                    5
                  </span>
                </Link>
                <Link href={profileHrefByRole[role]}>
                  <MobileAvatar src={user.avatar || undefined} label={user.name} size={40} />
                </Link>
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

function MobileBottomNav({ role, activeHref }: { role: Role; activeHref: string }) {
  return (
    <nav className="fixed bottom-0 left-0 right-0 z-40">
      <div className="mx-auto max-w-[402px] px-2.5 pb-[calc(0.55rem+env(safe-area-inset-bottom))]">
        <div className="rounded-[22px] border border-[#eceef7] bg-white/96 px-1 py-1.5 shadow-[0_14px_30px_rgba(27,34,75,0.1)] backdrop-blur">
          <div className="grid grid-cols-5">
          {navByRole[role].map((item) => {
            const active = item.href === activeHref;
            const Icon = item.icon;
            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "flex min-h-[54px] flex-col items-center justify-center gap-1 rounded-[12px] text-[10px] font-semibold text-[#777d9d]",
                  active && !item.highlight && "text-[#5c2dff]",
                  item.highlight && "text-[#5c2dff]"
                )}
              >
                {item.highlight ? (
                  <span className="grid h-12 w-12 -translate-y-3 place-items-center rounded-full bg-[linear-gradient(135deg,#7035ff_0%,#4d1eea_100%)] text-white shadow-[0_12px_24px_rgba(92,45,255,0.3)]">
                    <Icon className="h-6.5 w-6.5" />
                  </span>
                ) : (
                  <Icon className={cn("h-[19px] w-[19px]", active && "text-[#5c2dff]")} />
                )}
                <span className={cn(item.highlight && "-mt-3")}>{item.label}</span>
              </Link>
            );
          })}
          </div>
          <div className="mx-auto mt-1.5 h-1.5 w-20 rounded-full bg-[#101638]" />
        </div>
      </div>
    </nav>
  );
}

export function MobileCard({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <section
      className={cn(
        "rounded-[18px] border border-[#edf0f7] bg-white p-3 shadow-[0_8px_22px_rgba(30,38,82,0.055)]",
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
        "rounded-[20px] bg-[linear-gradient(135deg,#6f35ff_0%,#4d1eea_100%)] p-3 text-white shadow-[0_14px_30px_rgba(92,45,255,0.22)]",
        className
      )}
    >
      {children}
    </section>
  );
}

export function MobileSectionTitle({ title, action }: { title: string; action?: React.ReactNode }) {
  return (
    <div className="mb-2.5 flex items-center justify-between gap-4">
      <h2 className="text-[1rem] font-bold text-[#0b1033]">{title}</h2>
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
  return <span className={cn("inline-flex items-center rounded-[7px] px-2 py-0.5 text-[11px] font-bold", tones[tone], className)}>{children}</span>;
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
    <MobileCard className="p-3.5">
      <div className="mb-2 grid h-9 w-9 place-items-center rounded-[11px] bg-[#f2f0ff] text-[#6a35ff]">{icon}</div>
      <p className="text-[0.76rem] font-bold leading-tight text-[#5f668b]">{label}</p>
      <p className="mt-1 text-[1.3rem] font-bold leading-none text-[#070b2b]">{value}</p>
      {meta ? <p className={cn("mt-1 text-[10px] font-bold", accent ?? "text-[#6a35ff]")}>{meta}</p> : null}
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
    <div className={cn("flex items-center gap-2.5", className)}>
      <div className="flex min-h-[44px] flex-1 items-center gap-3 rounded-[12px] border border-[#e4e8f0] bg-white px-3.5 shadow-[0_6px_16px_rgba(44,54,96,0.04)]">
        <Search className="h-[18px] w-[18px] text-[#7d84a6]" />
        <input
          placeholder={placeholder}
          className="w-full border-0 bg-transparent text-[13px] font-medium text-[#11183d] outline-none placeholder:text-[#9198b0]"
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
      className="inline-flex min-h-[44px] items-center gap-2.5 rounded-[12px] border border-[#dddffd] bg-white px-3.5 text-[13px] font-bold text-[#5c2dff] shadow-[0_6px_16px_rgba(44,54,96,0.04)]"
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
    <Link href={href} className="relative min-h-[64px] rounded-[14px] border border-[#e8ebf3] bg-white px-2 py-2.5 text-center shadow-[0_6px_16px_rgba(40,52,96,0.045)]">
      {badge ? <div className="absolute right-2 top-2">{badge}</div> : null}
      <span className="mx-auto mb-1.5 grid h-8 w-8 place-items-center rounded-[10px] bg-[#f2f0ff] text-[#6a35ff]">{icon}</span>
      <p className="text-[10.5px] font-bold leading-tight text-[#11183d]">{title}</p>
      {subtitle ? <p className="mt-0.5 text-[9.5px] leading-tight text-[#858ba8]">{subtitle}</p> : null}
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
    <div className="flex gap-2 overflow-x-auto border-b border-[#e8ebf3] pb-1.5 text-[13px] thin-scrollbar">
      {items.map((item) => (
        <button
          key={item}
          type="button"
          onClick={() => onChange(item)}
          className={cn(
            "shrink-0 rounded-[8px] border-b-2 px-2.5 py-1.5 font-bold transition",
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
  type = "text",
  ...props
}: {
  label: string;
  placeholder?: string;
  defaultValue?: string;
  type?: string;
} & Omit<InputHTMLAttributes<HTMLInputElement>, "type">) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-[11px] font-bold text-[#3f486f]">{label}</span>
      <input
        type={type}
        placeholder={placeholder}
        defaultValue={defaultValue}
        {...props}
        className="min-h-[44px] w-full rounded-[12px] border border-[#e3e6ee] bg-white px-3.5 text-[13px] font-medium text-[#11183d] outline-none placeholder:text-[#9aa1b8] focus:border-[#7b58ff]"
      />
    </label>
  );
}

export function MobileSelect({
  label,
  defaultValue,
  onClick
}: {
  label: string;
  defaultValue?: string;
  onClick?: () => void;
}) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-[11px] font-bold text-[#3f486f]">{label}</span>
      <button
        type="button"
        onClick={onClick}
        className="flex min-h-[44px] w-full items-center justify-between rounded-[12px] border border-[#e3e6ee] bg-white px-3.5 text-left text-[13px] font-medium text-[#11183d]"
      >
        <span className={cn(defaultValue ? "text-[#11183d]" : "text-[#9aa1b8]")}>{defaultValue ?? `Select ${label.toLowerCase()}`}</span>
        <MoreHorizontal className="h-[18px] w-[18px] rotate-90 text-[#8188aa]" />
      </button>
    </label>
  );
}

export function MobileTextArea({
  label,
  placeholder,
  rows = 4,
  ...props
}: {
  label: string;
  placeholder?: string;
  rows?: number;
} & TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-[11px] font-bold text-[#3f486f]">{label}</span>
      <textarea
        rows={rows}
        placeholder={placeholder}
        {...props}
        className="w-full resize-none rounded-[12px] border border-[#e3e6ee] bg-white px-3.5 py-3 text-[13px] font-medium text-[#11183d] outline-none placeholder:text-[#9aa1b8] focus:border-[#7b58ff]"
      />
    </label>
  );
}

export function MobileUploadBox({ title, detail }: { title: string; detail: string }) {
  return (
    <div className="rounded-[14px] border border-dashed border-[#d7d2ff] bg-[#fbfaff] px-4 py-5 text-center">
      <div className="mx-auto mb-2.5 grid h-10 w-10 place-items-center rounded-[10px] bg-[#f2efff] text-[#6a35ff]">
        <Plus className="h-6 w-6" />
      </div>
      <p className="text-[13px] font-bold text-[#5f34ff]">{title}</p>
      <p className="mt-1 text-[11px] text-[#9197be]">{detail}</p>
    </div>
  );
}

export function MobilePrimaryButton({ href, children, className }: { href?: string; children: React.ReactNode; className?: string }) {
  const classes =
    "inline-flex min-h-[46px] w-full items-center justify-center rounded-[12px] bg-[linear-gradient(135deg,#7138ff_0%,#5322ef_100%)] px-4 text-[0.94rem] font-bold text-white shadow-[0_12px_24px_rgba(92,45,255,0.2)]";

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
    "inline-flex min-h-[44px] w-full items-center justify-center rounded-[12px] border border-[#cabdff] bg-white px-4 text-[0.92rem] font-bold text-[#5c2dff]";
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

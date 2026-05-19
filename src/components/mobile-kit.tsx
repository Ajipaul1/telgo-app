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
  admin: {
    name: "Admin",
    subtitle: "Operations Lead",
    avatar: "/assets/telgo-logo-cropped.png",
    status: "Online"
  },
  engineer: {
    name: "Arjun Nair",
    subtitle: "Site Engineer",
    avatar: "/assets/telgo-logo-cropped.png",
    status: "Online"
  },
  finance: {
    name: "Anitha R",
    subtitle: "Finance Lead",
    avatar: "/assets/telgo-logo-cropped.png",
    status: "Online"
  },
  client: {
    name: "Reliable Infra Pvt. Ltd.",
    subtitle: "Client",
    avatar: "/assets/telgo-logo-cropped.png",
    status: "Active"
  },
  supervisor: {
    name: "Vishnu P",
    subtitle: "Supervisor",
    avatar: "/assets/telgo-logo-cropped.png",
    status: "Online"
  }
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
  const navItems = navByRole[role];
  const user = topUser ?? topUserByRole[role];
  const LeftIcon = leftMode === "back" ? ArrowLeft : Menu;

  return (
    <main className="min-h-screen bg-[#f4f6ff] text-[#18214d]">
      <div className="mx-auto max-w-[430px] px-4 pb-28 pt-5">
        <div className="mb-5 flex items-center justify-between text-[15px] font-semibold text-[#121b44]">
          <span>9:41</span>
          <div className="flex items-center gap-2">
            <span className="grid h-5 w-4 place-items-end">
              <span className="h-3 w-1 rounded-full bg-[#121b44]" />
              <span className="-mt-3 ml-1 h-4 w-1 rounded-full bg-[#121b44]" />
              <span className="-mt-4 ml-2 h-5 w-1 rounded-full bg-[#121b44]" />
            </span>
            <span className="text-sm tracking-tight">◜◝</span>
            <span className="h-5 w-9 rounded-md border-2 border-[#121b44] p-[2px]">
              <span className="block h-full w-5 rounded-sm bg-[#121b44]" />
            </span>
          </div>
        </div>

        <header className="mb-6 flex items-start justify-between gap-4">
          <div className="flex min-w-0 items-start gap-4">
            <Link
              href={backHref ?? "#"}
              className={cn(
                "mt-1 grid h-11 w-11 shrink-0 place-items-center rounded-2xl border border-[#e4e7fb] bg-white text-[#1a2250] shadow-[0_12px_28px_rgba(38,52,96,0.08)]",
                leftMode === "menu" && !backHref && "pointer-events-none opacity-70"
              )}
            >
              <LeftIcon className="h-5 w-5" />
            </Link>
            <div className="min-w-0">
              <h1 className="text-[2.05rem] font-semibold leading-[1.05] tracking-[-0.03em] text-[#111a48]">
                {title}
              </h1>
              {subtitle ? (
                <p className="mt-1 text-[1.03rem] leading-6 text-[#717aab]">{subtitle}</p>
              ) : null}
            </div>
          </div>
          <div className="flex shrink-0 items-center gap-2">
            {rightSlot ?? (
              <>
                <button
                  type="button"
                  className="relative grid h-12 w-12 place-items-center rounded-2xl border border-[#e4e7fb] bg-white text-[#18214d] shadow-[0_12px_28px_rgba(38,52,96,0.08)]"
                >
                  <Bell className="h-5 w-5" />
                  <span className="absolute right-1 top-1 grid h-5 min-w-5 place-items-center rounded-full bg-[#ff3b3b] px-1 text-[10px] font-semibold text-white">
                    5
                  </span>
                </button>
                <MobileAvatar src={user.avatar} label={user.name} size={48} />
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
      <div className="mx-auto max-w-[430px] px-4 pb-4">
        <div className="grid grid-cols-5 rounded-[28px] border border-[#e4e7fb] bg-white/95 px-2 py-2 shadow-[0_20px_40px_rgba(39,50,90,0.16)] backdrop-blur">
          {navByRole[role].map((item) => {
            const active = item.href === activeHref;
            const Icon = item.icon;
            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "flex min-h-[64px] flex-col items-center justify-center gap-2 rounded-2xl text-[12px] font-medium text-[#8b91bc]",
                  active && !item.highlight && "text-[#5c2dff]",
                  item.highlight && "text-[#5c2dff]"
                )}
              >
                {item.highlight ? (
                  <span className="grid h-14 w-14 place-items-center rounded-full bg-[linear-gradient(135deg,#7138ff_0%,#5321ee_100%)] text-white shadow-[0_18px_36px_rgba(92,45,255,0.28)]">
                    <Icon className="h-7 w-7" />
                  </span>
                ) : (
                  <Icon className={cn("h-6 w-6", active && "text-[#5c2dff]")} />
                )}
                <span>{item.label}</span>
              </Link>
            );
          })}
        </div>
      </div>
    </nav>
  );
}

export function MobileCard({
  children,
  className
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <section
      className={cn(
        "rounded-[28px] border border-[#e6e9fb] bg-white p-5 shadow-[0_14px_34px_rgba(44,54,96,0.08)]",
        className
      )}
    >
      {children}
    </section>
  );
}

export function MobileGradientCard({
  children,
  className
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <section
      className={cn(
        "rounded-[28px] bg-[linear-gradient(135deg,#7138ff_0%,#5223f2_100%)] p-5 text-white shadow-[0_22px_42px_rgba(92,45,255,0.26)]",
        className
      )}
    >
      {children}
    </section>
  );
}

export function MobileSectionTitle({
  title,
  action
}: {
  title: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="mb-4 flex items-center justify-between gap-4">
      <h2 className="text-[1.55rem] font-semibold tracking-[-0.03em] text-[#121b44]">{title}</h2>
      {action}
    </div>
  );
}

export function MobileAvatar({
  src,
  label,
  size = 56
}: {
  src?: string;
  label: string;
  size?: number;
}) {
  return src ? (
    <div
      className="overflow-hidden rounded-full border border-white/60 bg-[#eef1ff]"
      style={{ width: size, height: size }}
    >
      <Image src={src} alt={label} width={size} height={size} className="h-full w-full object-cover" />
    </div>
  ) : (
    <div
      className="grid rounded-full bg-[linear-gradient(135deg,#7c4dff_0%,#5b24f1_100%)] text-sm font-semibold text-white"
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
    violet: "bg-[#efe8ff] text-[#6a35ff]",
    green: "bg-[#e8f9ef] text-[#18aa5d]",
    orange: "bg-[#fff2e3] text-[#ff8a00]",
    red: "bg-[#ffe9ea] text-[#ff4f63]",
    blue: "bg-[#e9f2ff] text-[#337dff]",
    slate: "bg-[#f0f2fb] text-[#6f79a9]"
  };
  return (
    <span className={cn("inline-flex items-center rounded-full px-3 py-1.5 text-sm font-semibold", tones[tone], className)}>
      {children}
    </span>
  );
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
      <div className="mb-4 grid h-12 w-12 place-items-center rounded-2xl bg-[#f2f4ff] text-[#6a35ff]">
        {icon}
      </div>
      <p className="text-[0.95rem] font-medium text-[#7b83ae]">{label}</p>
      <p className="mt-1 text-[2rem] font-semibold leading-none tracking-[-0.04em] text-[#121b44]">
        {value}
      </p>
      {meta ? <p className={cn("mt-2 text-sm font-semibold", accent ?? "text-[#6a35ff]")}>{meta}</p> : null}
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
    <div className={cn("h-3 rounded-full bg-[#ebeef8]", className)}>
      <div
        className={cn("h-3 rounded-full bg-gradient-to-r", tones[tone])}
        style={{ width: `${Math.max(0, Math.min(100, value))}%` }}
      />
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
      <div className="flex min-h-[58px] flex-1 items-center gap-3 rounded-[22px] border border-[#e4e8fb] bg-white px-4 shadow-[0_10px_22px_rgba(44,54,96,0.05)]">
        <Search className="h-5 w-5 text-[#7d84b0]" />
        <input
          placeholder={placeholder}
          className="w-full border-0 bg-transparent text-[1rem] text-[#18214d] outline-none placeholder:text-[#9198be]"
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
      className="inline-flex min-h-[58px] items-center gap-3 rounded-[22px] border border-[#dddffd] bg-white px-5 text-[1rem] font-semibold text-[#5c2dff] shadow-[0_10px_22px_rgba(44,54,96,0.05)]"
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
    <Link
      href={href}
      className="relative rounded-[22px] border border-[#e5e8fb] bg-white p-4 text-center shadow-[0_10px_24px_rgba(40,52,96,0.06)]"
    >
      {badge ? <div className="absolute right-3 top-3">{badge}</div> : null}
      <span className="mx-auto mb-3 grid h-14 w-14 place-items-center rounded-2xl bg-[#f2f3ff] text-[#6a35ff]">
        {icon}
      </span>
      <p className="text-[1.02rem] font-semibold text-[#16204c]">{title}</p>
      {subtitle ? <p className="mt-1 text-sm text-[#8b92ba]">{subtitle}</p> : null}
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
    <div className="flex gap-4 overflow-x-auto border-b border-[#e8ebfb] pb-2 text-[1rem] thin-scrollbar">
      {items.map((item) => (
        <button
          key={item}
          type="button"
          onClick={() => onChange(item)}
          className={cn(
            "shrink-0 border-b-4 pb-3 font-semibold transition",
            item === active
              ? "border-[#5c2dff] text-[#5c2dff]"
              : "border-transparent text-[#727aa9]"
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
      <span className="mb-2 block text-sm font-semibold text-[#5c648d]">{label}</span>
      <input
        type={type}
        placeholder={placeholder}
        defaultValue={defaultValue}
        className="min-h-[56px] w-full rounded-[18px] border border-[#e3e6f9] bg-white px-4 text-[#18214d] outline-none placeholder:text-[#9aa1c5] focus:border-[#7b58ff]"
      />
    </label>
  );
}

export function MobileSelect({
  label,
  defaultValue
}: {
  label: string;
  defaultValue?: string;
}) {
  return (
    <label className="block">
      <span className="mb-2 block text-sm font-semibold text-[#5c648d]">{label}</span>
      <div className="flex min-h-[56px] items-center justify-between rounded-[18px] border border-[#e3e6f9] bg-white px-4 text-[#18214d]">
        <span className={cn(defaultValue ? "text-[#18214d]" : "text-[#9aa1c5]")}>
          {defaultValue ?? `Select ${label.toLowerCase()}`}
        </span>
        <MoreHorizontal className="h-5 w-5 rotate-90 text-[#8188b3]" />
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
      <span className="mb-2 block text-sm font-semibold text-[#5c648d]">{label}</span>
      <textarea
        rows={rows}
        placeholder={placeholder}
        className="w-full resize-none rounded-[18px] border border-[#e3e6f9] bg-white px-4 py-4 text-[#18214d] outline-none placeholder:text-[#9aa1c5] focus:border-[#7b58ff]"
      />
    </label>
  );
}

export function MobileUploadBox({
  title,
  detail
}: {
  title: string;
  detail: string;
}) {
  return (
    <div className="rounded-[22px] border border-dashed border-[#d9d7ff] bg-[#fbfaff] px-5 py-8 text-center">
      <div className="mx-auto mb-4 grid h-14 w-14 place-items-center rounded-2xl bg-[#f2efff] text-[#6a35ff]">
        <Plus className="h-7 w-7" />
      </div>
      <p className="text-[1rem] font-semibold text-[#5f34ff]">{title}</p>
      <p className="mt-1 text-sm text-[#9197be]">{detail}</p>
    </div>
  );
}

export function MobilePrimaryButton({
  href,
  children,
  className
}: {
  href?: string;
  children: React.ReactNode;
  className?: string;
}) {
  const classes =
    "inline-flex min-h-[58px] w-full items-center justify-center rounded-[20px] bg-[linear-gradient(135deg,#7138ff_0%,#5322ef_100%)] px-5 text-[1.05rem] font-semibold text-white shadow-[0_18px_36px_rgba(92,45,255,0.26)]";

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

export function MobileSecondaryButton({
  href,
  children,
  className
}: {
  href?: string;
  children: React.ReactNode;
  className?: string;
}) {
  const classes =
    "inline-flex min-h-[58px] w-full items-center justify-center rounded-[20px] border border-[#cabdff] bg-white px-5 text-[1.05rem] font-semibold text-[#5c2dff]";
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

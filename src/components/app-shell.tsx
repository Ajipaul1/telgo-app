"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { motion } from "framer-motion";
import { useShallow } from "zustand/react/shallow";
import {
  Avatar,
  Badge,
  GlassCard,
  Icon,
  IconButton,
  Logo,
  type IconName
} from "@/components/ui";
import { cn } from "@/lib/utils";
import type { Role } from "@/lib/types";
import { getCurrentUser, useOpsStore } from "@/store/ops-store";

type NavItem = {
  label: string;
  href: string;
  icon: IconName | string;
  badge?: number;
};

const navByRole: Record<Role, NavItem[]> = {
  admin: [
    { label: "Dashboard", href: "/app/admin", icon: "LayoutDashboard" },
    { label: "Map", href: "/app/admin/map", icon: "MapPin" },
    { label: "Approvals", href: "/app/admin/approvals", icon: "ClipboardCheck" },
    { label: "Projects", href: "/app/admin/projects", icon: "Building2" },
    { label: "Alerts", href: "/app/admin/alerts", icon: "Bell", badge: 7 },
    { label: "More", href: "/app/admin/finance", icon: "MoreHorizontal" }
  ],
  finance: [
    { label: "Dashboard", href: "/app/admin/finance", icon: "LayoutDashboard" },
    { label: "Approvals", href: "/app/admin/approvals", icon: "ClipboardCheck" },
    { label: "Finance", href: "/app/admin/finance", icon: "IndianRupee" },
    { label: "Projects", href: "/app/admin/projects", icon: "Building2" },
    { label: "Chat", href: "/app/chat", icon: "MessageCircle", badge: 6 }
  ],
  supervisor: [
    { label: "Dashboard", href: "/app/admin", icon: "LayoutDashboard" },
    { label: "Map", href: "/app/admin/map", icon: "MapPin" },
    { label: "Staff", href: "/app/admin/staff", icon: "Users" },
    { label: "Approvals", href: "/app/admin/approvals", icon: "ClipboardCheck" },
    { label: "Alerts", href: "/app/admin/alerts", icon: "Bell", badge: 6 }
  ],
  engineer: [
    { label: "Home", href: "/app/engineer", icon: "Home" },
    { label: "Attendance", href: "/app/engineer/attendance", icon: "MapPin" },
    { label: "Quick Add", href: "/app/engineer/logs", icon: "Plus" },
    { label: "Reports", href: "/app/engineer/shift-report", icon: "ClipboardList" },
    { label: "More", href: "/app/engineer/offline-sync", icon: "MoreHorizontal" }
  ],
  client: [
    { label: "Portal", href: "/app/client", icon: "Home" },
    { label: "Projects", href: "/app/client/projects", icon: "Building2" },
    { label: "Photos", href: "/app/client/photos", icon: "ImageIcon" },
    { label: "Chat", href: "/app/chat", icon: "MessageCircle" },
    { label: "Review", href: "/app/client/review", icon: "MoreHorizontal" }
  ]
};

export function AppShell({
  role = "engineer",
  activeHref,
  title,
  subtitle,
  children,
  backHref,
  rightAction,
  className
}: {
  role?: Role;
  activeHref: string;
  title: string;
  subtitle?: string;
  children: React.ReactNode;
  backHref?: string;
  rightAction?: React.ReactNode;
  className?: string;
}) {
  const pathname = usePathname();
  const state = useOpsStore(useShallow((store) => ({
    users: store.users,
    currentUserId: store.currentUserId,
    notifications: store.notifications,
    shiftReports: store.shiftReports,
    signOut: store.signOut
  })));
  const currentUser = getCurrentUser(state);
  const effectiveRole = currentUser.role ?? role;
  const nav = navByRole[effectiveRole];
  const unread = state.notifications.filter(
    (item) => !item.read && (item.targetRole === effectiveRole || item.targetRole === "all")
  ).length;
  const today = new Date().toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric"
  });
  const hasShiftReportToday = state.shiftReports.some(
    (report) => report.userId === currentUser.id && report.createdAt.includes(today)
  );
  const allowed = isPathAllowed(pathname ?? activeHref, effectiveRole);

  function handleSignOut() {
    if (effectiveRole === "engineer" && !hasShiftReportToday) {
      window.location.href = "/app/engineer/shift-report?required=1";
      return;
    }
    state.signOut();
    window.location.href = "/";
  }

  return (
    <div className="safe-screen bg-industrial-radial text-white">
      <div className="mx-auto flex min-h-screen w-full max-w-[980px] flex-col px-4 pb-24 pt-3 sm:px-6 lg:px-8">
        <StatusBar />
        <header className="sticky top-0 z-30 -mx-4 mb-5 border-b border-transparent bg-ink-950/72 px-4 pb-3 pt-2 backdrop-blur-xl sm:-mx-6 sm:px-6 lg:-mx-8 lg:px-8">
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <IconButton icon={backHref ? "ChevronLeft" : "Menu"} label="Navigation" href={backHref} />
              <Logo compact />
            </div>
            <div className="flex items-center gap-2">
              {rightAction}
              <IconButton icon="Search" label="Search" className="hidden min-[390px]:grid" />
              <IconButton icon="Bell" label="Notifications" badge={unread || undefined} />
              <button
                type="button"
                onClick={handleSignOut}
                className="tap-target relative grid place-items-center rounded-xl border border-white/10 bg-white/[0.03] text-slate-100 transition hover:border-telgo-cyan/50 hover:text-telgo-cyan"
                aria-label="Sign out"
              >
                <Icon name="LogOut" className="h-5 w-5" />
              </button>
              <Avatar label={currentUser.fullName} />
            </div>
          </div>
        </header>

        <motion.main
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.28, ease: "easeOut" }}
          className={cn("flex-1 space-y-4", className)}
        >
          <div className="mb-5 flex items-end justify-between gap-3">
            <div>
              <h1 className="text-2xl font-semibold tracking-normal text-white sm:text-3xl">
                {title}
              </h1>
              {subtitle ? <p className="mt-1 text-base text-slate-300">{subtitle}</p> : null}
            </div>
          </div>
          {allowed ? children : <AccessRestricted role={effectiveRole} />}
        </motion.main>

        <BottomNav items={nav} activeHref={activeHref} />
      </div>
    </div>
  );
}

function StatusBar() {
  return (
    <div className="mb-1 flex h-8 items-center justify-between px-2 text-sm font-semibold text-white">
      <span>9:41</span>
      <div className="flex items-center gap-1.5 text-white">
        <span className="h-3 w-4 rounded-sm border border-white/70">
          <span className="block h-full w-3 rounded-sm bg-white" />
        </span>
        <Icon name="Activity" className="h-4 w-4" />
      </div>
    </div>
  );
}

function BottomNav({ items, activeHref }: { items: NavItem[]; activeHref: string }) {
  return (
    <nav className="fixed inset-x-0 bottom-0 z-40 mx-auto w-full max-w-[980px] px-4 pb-3 sm:px-6 lg:px-8">
      <div className="glass-panel grid grid-cols-5 overflow-hidden rounded-2xl p-1.5">
        {items.slice(0, 5).map((item, index) => {
          const active = activeHref === item.href;
          const isCenter = item.label === "Quick Add" || index === 2;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "relative flex min-h-[66px] flex-col items-center justify-center gap-1 rounded-xl text-xs text-slate-300 transition",
                active && "bg-telgo-blue/10 text-telgo-cyan",
                isCenter && "text-white"
              )}
            >
              <span
                className={cn(
                  "relative grid place-items-center",
                  isCenter &&
                    "h-12 w-12 rounded-full bg-gradient-to-br from-telgo-cyan to-telgo-violet shadow-glow"
                )}
              >
                <Icon name={item.icon} className={cn(isCenter ? "h-7 w-7" : "h-6 w-6")} />
                {item.badge ? (
                  <span className="absolute -right-2 -top-2 grid h-5 min-w-5 place-items-center rounded-full bg-telgo-red px-1 text-[11px] font-bold text-white">
                    {item.badge}
                  </span>
                ) : null}
              </span>
              <span className="max-w-[64px] truncate text-[11px] leading-none">{item.label}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}

function isPathAllowed(path: string, role: Role) {
  if (path === "/app" || path === "/app/chat") return true;
  if (role === "admin") return path.startsWith("/app/admin") || path.startsWith("/app/client");
  if (role === "finance") {
    return ["/app/admin/finance", "/app/admin/approvals", "/app/admin/projects", "/app/admin/alerts"].some(
      (prefix) => path.startsWith(prefix)
    );
  }
  if (role === "supervisor") {
    return ["/app/admin", "/app/admin/map", "/app/admin/staff", "/app/admin/approvals", "/app/admin/alerts", "/app/admin/projects"].some(
      (prefix) => path.startsWith(prefix)
    );
  }
  if (role === "client") return path.startsWith("/app/client");
  return path.startsWith("/app/engineer");
}

function AccessRestricted({ role }: { role: Role }) {
  return (
    <GlassCard className="p-5">
      <div className="flex items-start gap-3">
        <span className="grid h-12 w-12 shrink-0 place-items-center rounded-xl border border-red-400/30 bg-red-500/10 text-telgo-red">
          <Icon name="ShieldCheck" />
        </span>
        <div>
          <div className="mb-2 flex flex-wrap items-center gap-2">
            <h2 className="text-xl font-semibold">Access Restricted</h2>
            <Badge tone="red">{role}</Badge>
          </div>
          <p className="text-slate-300">
            This workspace is outside the signed-in role permissions. Use the bottom navigation for
            allowed pages, or sign in with an admin account for operations access.
          </p>
        </div>
      </div>
    </GlassCard>
  );
}

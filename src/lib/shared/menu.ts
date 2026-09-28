// The menu (RULES.md section 2): plain-word groups, the same order everywhere, icons only here.
// The owner's structure for the admin (28 Sep 2026): Home · Team · Projects · Inventory · Reports ·
// File manager · You · System.
import type { Role } from "./roles";

export type MenuItem = { href: string; label: string; icon: string; count?: string };
export type MenuGroup = { group: string | null; items: MenuItem[] };

const HOME: MenuGroup = { group: null, items: [{ href: "/app", label: "Home", icon: "home" }] };
const YOU: MenuGroup = {
  group: "You",
  items: [
    { href: "/app/notifications", label: "Notifications", icon: "bell", count: "notifications" },
    { href: "/app/chat", label: "Chat", icon: "chat", count: "chats" },
    { href: "/app/profile", label: "Profile", icon: "user" },
  ],
};
const EXPENSES: MenuItem[] = [
  { href: "/app/reports/wages", label: "Wages", icon: "rupee" },
  { href: "/app/reports/fuel", label: "Fuel", icon: "fuel" },
  { href: "/app/reports/travel", label: "Travel", icon: "car" },
  { href: "/app/reports/room", label: "Room rent", icon: "bed" },
  { href: "/app/reports/tools", label: "Tool rent", icon: "tool" },
  { href: "/app/reports/other", label: "Other expenses", icon: "receipt" },
  { href: "/app/reports/progress", label: "Site progress", icon: "trend" },
];

export const MENU: Record<Role, MenuGroup[]> = {
  admin: [
    HOME,
    {
      group: "Team",
      items: [
        { href: "/app/team/employees", label: "Employees", icon: "users" },
        { href: "/app/team/requests", label: "Access requests", icon: "userPlus", count: "requests" },
        { href: "/app/team/live", label: "Live location", icon: "map" },
        { href: "/app/team/attendance", label: "Attendance", icon: "clock" },
      ],
    },
    {
      group: "Projects",
      items: [
        { href: "/app/projects", label: "All projects", icon: "folder" },
        { href: "/app/projects/edit", label: "Edit projects", icon: "edit" },
      ],
    },
    {
      group: "Inventory",
      items: [
        { href: "/app/inventory/sites", label: "Site inventory", icon: "boxes" },
        { href: "/app/inventory", label: "Saved items", icon: "list" },
        { href: "/app/inventory/approvals", label: "Approvals", icon: "check", count: "approvals" },
        { href: "/app/inventory/add", label: "Add to inventory", icon: "plus" },
      ],
    },
    {
      group: "Reports",
      items: [
        { href: "/app/reports/review", label: "To review", icon: "inbox", count: "review" },
        { href: "/app/reports/fix", label: "Asked to fix", icon: "alert", count: "fix" },
        { href: "/app/reports/saved", label: "Saved reports", icon: "archive" },
        { href: "/app/reports/totals", label: "Totals", icon: "chart" },
        ...EXPENSES,
      ],
    },
    { group: "Files", items: [{ href: "/app/files", label: "File manager", icon: "folderOpen" }] },
    YOU,
    {
      group: "System",
      items: [
        { href: "/app/system/sign-ins", label: "Sign-ins", icon: "key" },
        { href: "/app/system/changes", label: "Change log", icon: "history" },
        { href: "/app/system/problems", label: "Problems", icon: "alert" },
      ],
    },
  ],
  supervisor: [
    HOME,
    {
      group: "Attendance",
      items: [
        { href: "/app/attendance", label: "Sign in / out", icon: "clock" },
        { href: "/app/attendance/history", label: "My attendance", icon: "calendar" },
      ],
    },
    {
      group: "Daily report",
      items: [
        { href: "/app/report/new", label: "Send daily report", icon: "send" },
        { href: "/app/my-reports", label: "My reports", icon: "list", count: "fix" },
      ],
    },
    {
      group: "Inventory",
      items: [
        { href: "/app/inventory/add", label: "Add to inventory", icon: "plus" },
        { href: "/app/inventory", label: "Saved items", icon: "list" },
        { href: "/app/inventory/sites", label: "Site inventory", icon: "boxes" },
      ],
    },
    { group: "Projects", items: [{ href: "/app/projects", label: "All projects", icon: "folder" }] },
    YOU,
  ],
  engineer: [],
  finance: [
    HOME,
    {
      group: "Attendance",
      items: [
        { href: "/app/attendance", label: "Sign in / out", icon: "clock" },
        { href: "/app/attendance/history", label: "My attendance", icon: "calendar" },
      ],
    },
    {
      group: "Reports",
      items: [
        { href: "/app/reports/saved", label: "Saved reports", icon: "archive" },
        { href: "/app/reports/totals", label: "Totals", icon: "chart" },
        ...EXPENSES,
      ],
    },
    {
      group: "Inventory",
      items: [
        { href: "/app/inventory/sites", label: "Site inventory", icon: "boxes" },
        { href: "/app/inventory", label: "Saved items", icon: "list" },
      ],
    },
    { group: "Projects", items: [{ href: "/app/projects", label: "All projects", icon: "folder" }] },
    YOU,
  ],
  client: [
    HOME,
    {
      group: "Progress",
      items: [
        { href: "/app/projects", label: "Projects", icon: "folder" },
        { href: "/app/progress", label: "Approved work", icon: "check" },
      ],
    },
    YOU,
  ],
};
MENU.engineer = MENU.supervisor;

// the title of the screen at a path (the longest matching menu address)
export function menuTitle(role: Role, path: string) {
  let best: MenuItem | null = null;
  for (const g of MENU[role]) for (const i of g.items) if ((path === i.href || path.startsWith(i.href + "/")) && (!best || i.href.length > best.href.length)) best = i;
  return best;
}

// Dates, times and numbers, always in India time and Indian number style.
const TZ = "Asia/Kolkata";

// "2026-09-28" for a moment, in India
export const istDate = (d: Date | string | number = new Date()) =>
  new Date(d).toLocaleDateString("en-CA", { timeZone: TZ });

export const istToday = () => istDate(new Date());

export function addDays(isoDay: string, n: number) {
  const d = new Date(isoDay + "T00:00:00Z");
  d.setUTCDate(d.getUTCDate() + n);
  return d.toISOString().slice(0, 10);
}

export const fmtDay = (isoDay: string | null | undefined) => {
  if (!isoDay) return "—";
  const d = new Date(isoDay.length === 10 ? isoDay + "T00:00:00+05:30" : isoDay);
  return d.toLocaleDateString("en-IN", { timeZone: TZ, weekday: "short", day: "numeric", month: "short" });
};

export const fmtDayLong = (isoDay: string | null | undefined) => {
  if (!isoDay) return "—";
  const d = new Date(isoDay.length === 10 ? isoDay + "T00:00:00+05:30" : isoDay);
  return d.toLocaleDateString("en-IN", { timeZone: TZ, weekday: "long", day: "numeric", month: "long", year: "numeric" });
};

export const fmtTime = (iso: string | null | undefined) =>
  iso ? new Date(iso).toLocaleTimeString("en-IN", { timeZone: TZ, hour: "numeric", minute: "2-digit" }) : "—";

export const fmtDateTime = (iso: string | null | undefined) =>
  iso ? new Date(iso).toLocaleString("en-IN", { timeZone: TZ, day: "numeric", month: "short", hour: "numeric", minute: "2-digit" }) : "—";

// "Today 9:05 am", "Yesterday 6:10 pm", "Tue 24 Sep, 8:00 am"
export function fmtWhen(iso: string | null | undefined) {
  if (!iso) return "—";
  const day = istDate(iso);
  const today = istToday();
  if (day === today) return `Today ${fmtTime(iso)}`;
  if (day === addDays(today, -1)) return `Yesterday ${fmtTime(iso)}`;
  return `${fmtDay(day)}, ${fmtTime(iso)}`;
}

export function ago(iso: string | null | undefined, now = Date.now()) {
  if (!iso) return "never";
  const s = Math.max(0, Math.round((now - Date.parse(iso)) / 1000));
  if (s < 60) return "just now";
  const m = Math.round(s / 60);
  if (m < 60) return `${m} min ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h} h ${m % 60} min ago`;
  const d = Math.floor(h / 24);
  return d === 1 ? "yesterday" : `${d} days ago`;
}

export function duration(fromIso: string, toIso: string | null | undefined, now = Date.now()) {
  const ms = (toIso ? Date.parse(toIso) : now) - Date.parse(fromIso);
  if (!(ms > 0)) return "0 min";
  const m = Math.round(ms / 60000);
  const h = Math.floor(m / 60);
  return h ? `${h} h ${m % 60} min` : `${m} min`;
}

const inr = new Intl.NumberFormat("en-IN", { maximumFractionDigits: 2 });
export const money = (n: number | null | undefined) => (n === null || n === undefined || Number.isNaN(Number(n)) ? "—" : "₹" + inr.format(Number(n)));
export const numIN = (n: number | null | undefined, digits = 2) =>
  n === null || n === undefined || Number.isNaN(Number(n)) ? "—" : new Intl.NumberFormat("en-IN", { maximumFractionDigits: digits }).format(Number(n));

export function metres(m: number | null | undefined) {
  if (m === null || m === undefined || Number.isNaN(Number(m))) return "—";
  const v = Number(m);
  return v >= 1000 ? `${numIN(v / 1000, 2)} km` : `${numIN(v, 1)} m`;
}

export function distanceWords(m: number | null | undefined) {
  if (m === null || m === undefined) return "distance not known";
  if (m < 1000) return `${Math.round(m)} m`;
  return `${numIN(m / 1000, 1)} km`;
}

export const initials = (name: string | null | undefined) =>
  String(name || "?").trim().split(/\s+/).slice(0, 2).map((w) => w[0]).join("").toUpperCase() || "?";

export const firstName = (name: string | null | undefined) => String(name || "").trim().split(/\s+/)[0] || "";

export function greeting(now = new Date()) {
  const h = Number(now.toLocaleString("en-IN", { timeZone: TZ, hour: "numeric", hour12: false }));
  return h < 12 ? "Good morning" : h < 17 ? "Good afternoon" : "Good evening";
}

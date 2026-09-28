// Every value from a phone is checked here before it reaches the database (the database checks again).
// A refusal names the field in plain words.
import "server-only";
import { AppError } from "./doctor";

const bad = (msg: string): never => {
  throw new AppError(400, "INVALID", msg);
};

type StrOpts = { label: string; min?: number; max?: number; required?: boolean; pattern?: RegExp; patternMsg?: string };
export function str(v: unknown, o: StrOpts): string {
  const s = v === null || v === undefined ? "" : String(v).replace(/\u0000/g, "").trim();
  if (!s) {
    if (o.required) bad(`${o.label}: this is needed.`);
    return "";
  }
  if (o.min && s.length < o.min) bad(`${o.label}: at least ${o.min} characters.`);
  if (s.length > (o.max ?? 2000)) bad(`${o.label}: at most ${o.max ?? 2000} characters.`);
  if (o.pattern && !o.pattern.test(s)) bad(o.patternMsg ?? `${o.label}: that doesn't look right.`);
  return s;
}
export const optStr = (v: unknown, o: Omit<StrOpts, "required">) => str(v, o) || null;

type NumOpts = { label: string; min?: number; max?: number; int?: boolean; required?: boolean };
export function num(v: unknown, o: NumOpts): number {
  if (v === null || v === undefined || v === "") {
    if (o.required) bad(`${o.label}: enter a number.`);
    return 0;
  }
  const n = typeof v === "number" ? v : Number(String(v).replace(/,/g, "").trim());
  if (!Number.isFinite(n)) bad(`${o.label}: enter a number.`);
  if (o.int && !Number.isInteger(n)) bad(`${o.label}: enter a whole number.`);
  if (o.min !== undefined && n < o.min) bad(`${o.label}: can't be less than ${o.min}.`);
  if (o.max !== undefined && n > o.max) bad(`${o.label}: can't be more than ${o.max}.`);
  return Math.round(n * 100) / 100;
}
export function optNum(v: unknown, o: Omit<NumOpts, "required">): number | null {
  if (v === null || v === undefined || v === "") return null;
  return num(v, o);
}

export function oneOf<T extends string>(v: unknown, list: readonly T[], label: string): T {
  const s = String(v ?? "");
  if (!(list as readonly string[]).includes(s)) bad(`${label}: choose one of the options.`);
  return s as T;
}

export function isoDate(v: unknown, label: string): string {
  const s = String(v ?? "");
  if (!/^\d{4}-\d{2}-\d{2}$/.test(s) || Number.isNaN(Date.parse(s + "T00:00:00Z"))) bad(`${label}: choose a date.`);
  return s;
}

export function uuid(v: unknown, label = "Record"): string {
  const s = String(v ?? "");
  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(s)) bad(`${label}: not found.`);
  return s.toLowerCase();
}

export function stamp(v: unknown): string {
  const s = String(v ?? "");
  if (!s || Number.isNaN(Date.parse(s))) bad("The screen didn't say which version you edited. Reload and try again.");
  return s;
}

// a map position keeps 7 decimals (about 1 cm); num() rounds to 2, which is right for ₹ and metres
// but would move a position by up to a kilometre
function coord(v: unknown, label: string, max: number) {
  if (v === null || v === undefined || v === "") bad(`${label}: the phone didn't send its position.`);
  const n = typeof v === "number" ? v : Number(String(v).trim());
  if (!Number.isFinite(n) || n < -max || n > max) bad(`${label}: the position isn't valid.`);
  return Math.round(n * 1e7) / 1e7;
}
export const lat = (v: unknown, label = "Location") => coord(v, label, 90);
export const lng = (v: unknown, label = "Location") => coord(v, label, 180);

export const email = (v: unknown, required = true) =>
  str(v, { label: "Email", required, max: 200, pattern: /^[^\s@]+@[^\s@]+\.[^\s@]+$/, patternMsg: "Email: that doesn't look like an email address." }).toLowerCase();

export const phone = (v: unknown) =>
  optStr(v, { label: "Phone", max: 20, pattern: /^\+?[0-9 ()-]{7,20}$/, patternMsg: "Phone: use digits only, like +91 98470 12345." });

export function list<T>(v: unknown, label: string, max: number, each: (x: unknown, i: number) => T): T[] {
  if (v === null || v === undefined) return [];
  if (!Array.isArray(v)) bad(`${label}: the list is in the wrong form.`);
  const arr = v as unknown[];
  if (arr.length > max) bad(`${label}: at most ${max}.`);
  return arr.map(each);
}

export const obj = (v: unknown): Record<string, unknown> => (v && typeof v === "object" && !Array.isArray(v) ? (v as Record<string, unknown>) : {});

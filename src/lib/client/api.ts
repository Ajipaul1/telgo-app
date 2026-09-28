"use client";
// Every call from the phone to the server goes through here (the phone never talks to the database).
// ERROR DOCTOR on the phone: no signal, a timeout, a broken reply or a refusal all become plain words,
// with the server's reference number when there is one.

export class ApiError extends Error {
  code: string;
  status: number;
  ref: string | null;
  reason: string | null;
  constructor(message: string, code: string, status = 0, ref: string | null = null, reason: string | null = null) {
    super(message);
    this.code = code;
    this.status = status;
    this.ref = ref;
    this.reason = reason;
  }
}

const RESUME = "telgo_resume";
export const saveResume = (t: string | null | undefined) => {
  try { if (t) localStorage.setItem(RESUME, t); else localStorage.removeItem(RESUME); } catch { /* storage off: fine */ }
};
const readResume = () => { try { return localStorage.getItem(RESUME); } catch { return null; } };

let resuming: Promise<boolean> | null = null;
async function tryResume(): Promise<boolean> {
  const t = readResume();
  if (!t) return false;
  resuming ??= (async () => {
    try {
      const r = await fetch("/api/auth/resume", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ resume: t }), credentials: "same-origin" });
      const d = await r.json().catch(() => null);
      if (r.ok && d?.ok) { saveResume(d.resume); return true; }
      saveResume(null);
      return false;
    } catch { return false; } finally { setTimeout(() => (resuming = null), 0); }
  })();
  return resuming;
}

function goSignIn(reason: string | null) {
  if (typeof window === "undefined" || location.pathname.startsWith("/login")) return;
  const next = location.pathname + location.search;
  location.replace(`/login?why=${encodeURIComponent(reason ?? "none")}&next=${encodeURIComponent(next)}`);
}

type Opts = { method?: string; body?: unknown; form?: FormData; timeoutMs?: number; quietSignOut?: boolean };

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export async function call<T = any>(path: string, opts: Opts = {}, retried = false): Promise<T & { serverTime: string }> {
  const ctrl = new AbortController();
  const timeout = setTimeout(() => ctrl.abort(), opts.timeoutMs ?? 30000);
  let res: Response;
  try {
    res = await fetch(path, {
      method: opts.method ?? (opts.body !== undefined || opts.form ? "POST" : "GET"),
      headers: opts.form ? undefined : opts.body !== undefined ? { "Content-Type": "application/json" } : undefined,
      body: opts.form ?? (opts.body !== undefined ? JSON.stringify(opts.body) : undefined),
      credentials: "same-origin",
      cache: "no-store",
      signal: ctrl.signal,
    });
  } catch (e) {
    clearTimeout(timeout);
    if ((e as Error).name === "AbortError") throw new ApiError("The server didn't answer in time. Check your signal and try again.", "TIMEOUT");
    throw new ApiError(navigator.onLine === false ? "No internet on this phone. Check your signal and try again." : "Can't reach the server. Check your signal and try again.", "OFFLINE");
  }
  clearTimeout(timeout);
  let data: Record<string, unknown> | null = null;
  try { data = await res.json(); } catch { data = null; }
  if (!data || typeof data !== "object") {
    const msg = res.status === 413 ? "That is too much to send at once. Send photos one by one." : `The server sent an answer the app can't read (error ${res.status}). Try again.`;
    reportProblem(msg, path, `HTTP ${res.status}`);
    throw new ApiError(msg, "BAD_REPLY", res.status);
  }
  if (res.status === 401 && (data.error as { code?: string })?.code === "SIGNED_OUT") {
    if (!retried && (await tryResume())) return call<T>(path, opts, true);
    const reason = (data.error as { reason?: string })?.reason ?? null;
    if (!opts.quietSignOut) goSignIn(reason);
    throw new ApiError(String((data.error as { message?: string })?.message ?? "Sign in again."), "SIGNED_OUT", 401, null, reason);
  }
  if (!res.ok || data.ok !== true) {
    const e = (data.error ?? {}) as { message?: string; code?: string; ref?: string };
    throw new ApiError(e.message ?? `The server refused this (error ${res.status}).`, e.code ?? "ERROR", res.status, e.ref ?? null);
  }
  return data as T & { serverTime: string };
}

// the phone tells the Problems log about a failure it showed (never throws)
export function reportProblem(message: string, where: string, detail?: string) {
  try {
    fetch("/api/problems", { method: "POST", headers: { "Content-Type": "application/json" }, credentials: "same-origin", body: JSON.stringify({ message: message.slice(0, 900), where: where.slice(0, 190), detail: detail?.slice(0, 2900) }) }).catch(() => {});
  } catch { /* nothing */ }
}

// a unique reference for one send (sending twice with it saves once); older phones lack randomUUID
export const newRef = (): string => {
  const c = globalThis.crypto as Crypto;
  if (typeof c.randomUUID === "function") return c.randomUUID();
  const b = c.getRandomValues(new Uint8Array(16));
  return Array.from(b, (x: number) => x.toString(16).padStart(2, "0")).join("");
};

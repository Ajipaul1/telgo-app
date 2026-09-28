"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import { call, ApiError } from "./api";

// NO GHOST LOADING (RULES.md section 5): a screen loads, or after 12 s says it is still trying, and
// after 30 s says why it couldn't, with Try again. It refreshes itself (every `every` seconds while on
// screen, and when the app comes back), keeping what it showed if a refresh fails, and never touches a
// form (forms keep their own state).
export type Load<T> = {
  data: T | null;
  error: ApiError | null;
  loading: boolean;       // nothing shown yet
  slow: boolean;          // still nothing after 12 s
  refreshing: boolean;
  at: string | null;      // the server's time of the data shown
  reload: () => Promise<void>;
  set: (fn: (d: T | null) => T | null) => void; // put what the server confirmed into the screen
};

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function useLoad<T = any>(path: string | null, opts: { every?: number } = {}): Load<T> {
  const [data, setData] = useState<T | null>(null);
  const [error, setError] = useState<ApiError | null>(null);
  const [loading, setLoading] = useState<boolean>(!!path);
  const [slow, setSlow] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [at, setAt] = useState<string | null>(null);
  const cur = useRef(path);
  const inflight = useRef<string | null>(null); // the path whose request is out now
  cur.current = path;

  const run = useCallback(async (first: boolean) => {
    const p = cur.current;
    if (!p) return;
    // a refresh never doubles up on the same path; a NEW path always loads (an older answer is thrown away)
    if (!first && inflight.current === p) return;
    inflight.current = p;
    if (!first) setRefreshing(true);
    const slowTimer = first ? setTimeout(() => { if (cur.current === p) setSlow(true); }, 12000) : null;
    try {
      const d = await call<T>(p);
      if (cur.current !== p) return;
      setData(d);
      setAt(d.serverTime);
      setError(null);
    } catch (e) {
      if (cur.current !== p) return;
      setError(e instanceof ApiError ? e : new ApiError(String((e as Error)?.message ?? e), "ERROR"));
    } finally {
      if (slowTimer) clearTimeout(slowTimer);
      if (inflight.current === p) inflight.current = null;
      if (cur.current === p) { setLoading(false); setSlow(false); setRefreshing(false); }
    }
  }, []);

  useEffect(() => {
    setData(null); setError(null); setAt(null);
    if (!path) { setLoading(false); return; }
    setLoading(true);
    run(true);
  }, [path, run]);

  useEffect(() => {
    if (!path) return;
    const again = () => { if (document.visibilityState === "visible") run(false); };
    const id = opts.every ? setInterval(again, opts.every * 1000) : null;
    document.addEventListener("visibilitychange", again);
    window.addEventListener("telgo:refresh", again);
    window.addEventListener("online", again);
    return () => {
      if (id) clearInterval(id);
      document.removeEventListener("visibilitychange", again);
      window.removeEventListener("telgo:refresh", again);
      window.removeEventListener("online", again);
    };
  }, [path, opts.every, run]);

  return {
    data, error, loading, slow, refreshing, at,
    reload: () => run(false),
    set: (fn) => setData((d) => fn(d)),
  };
}

// a form kept on this phone until the server confirms it (never lost to a closed app or no signal)
export function useDraft<T>(key: string | null, initial: () => T) {
  const [value, setValue] = useState<T>(() => {
    if (!key || typeof window === "undefined") return initial();
    try { const s = localStorage.getItem(key); if (s) return { ...initial(), ...JSON.parse(s) } as T; } catch { /* fresh */ }
    return initial();
  });
  const first = useRef(true);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const cleared = useRef<T | null>(null); // the value that was confirmed and cleared: never saved again
  useEffect(() => {
    if (!key) return;
    if (first.current) { first.current = false; return; }
    if (cleared.current === value) return;
    timer.current = setTimeout(() => { try { localStorage.setItem(key, JSON.stringify(value)); } catch { /* full: kept in memory */ } }, 300);
    return () => { if (timer.current) clearTimeout(timer.current); };
  }, [key, value]);
  // after the server confirmed: the draft goes, and a save still waiting can't bring it back
  const clear = useCallback(() => {
    if (timer.current) clearTimeout(timer.current);
    cleared.current = value;
    if (key) try { localStorage.removeItem(key); } catch { /* nothing */ }
  }, [key, value]);
  return [value, setValue, clear] as const;
}

export function useOnline() {
  const [on, setOn] = useState(true);
  useEffect(() => {
    const f = () => setOn(navigator.onLine !== false);
    f();
    window.addEventListener("online", f); window.addEventListener("offline", f);
    return () => { window.removeEventListener("online", f); window.removeEventListener("offline", f); };
  }, []);
  return on;
}

export function useNow(everyMs = 30000) {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => { const id = setInterval(() => setNow(Date.now()), everyMs); return () => clearInterval(id); }, [everyMs]);
  return now;
}

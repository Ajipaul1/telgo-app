"use client";
// The app around every screen: top bar, the menu (button top-left or a swipe from the left edge),
// the bell, the Chat button, live notification banners, the "new version" bar, the sign-in gate for
// employees (owner's rule: the app works only while signed in at a site), and a temporary password
// that must be changed first.
import { usePathname, useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { call, saveResume } from "@/lib/client/api";
import { getPosition } from "@/lib/client/device";
import { MENU, menuTitle } from "@/lib/shared/menu";
import { ROLE_LABEL, signsIn } from "@/lib/shared/roles";
import type { Shift } from "@/lib/shared/attendance";
import { greeting } from "@/lib/shared/format";
import { Ctx, type Counts, type MeView } from "./AppContext";
import { Icon } from "./Icon";
import { Avatar, Button, TextInput, ErrorNote } from "./ui";
import { SignInCard } from "./SignInOut";

const BUILD = process.env.NEXT_PUBLIC_BUILD_ID ?? "dev";

export function Shell({ initialMe, children }: { initialMe: MeView; children: ReactNode }) {
  const path = usePathname();
  const router = useRouter();
  const [me, setMe] = useState<MeView>(initialMe);
  const [menuOpen, setMenuOpen] = useState(false);
  const [title, setTitle] = useState<string | null>(null);
  const [counts, setCounts] = useState<Counts>({});
  const [toastMsg, setToastMsg] = useState<{ text: string; bad: boolean } | null>(null);
  const [banner, setBanner] = useState<{ title: string; body: string; link: string | null } | null>(null);
  const [update, setUpdate] = useState(false);
  const [open, setOpen] = useState<Shift | null>(null);
  const [shiftKnown, setShiftKnown] = useState(!signsIn(initialMe.role));
  const lastUnread = useRef<number | null>(null);

  const toast = useCallback((text: string, bad = false) => {
    setToastMsg({ text, bad });
    window.setTimeout(() => setToastMsg((t) => (t?.text === text ? null : t)), bad ? 6000 : 3200);
  }, []);

  // counts on the menu and the bell; a new notification shows a banner
  const refreshCounts = useCallback(async () => {
    try {
      const r = await call<{ me: MeView; counts: Counts }>("/api/me");
      setCounts(r.counts);
      setMe((m) => ({ ...m, ...r.me }));
      const n = r.counts.notifications ?? 0;
      if (lastUnread.current !== null && n > lastUnread.current) {
        const list = await call<{ notifications: { title: string; body: string; link: string | null; read: boolean }[] }>("/api/notifications").catch(() => null);
        const top = list?.notifications.find((x) => !x.read);
        if (top) { setBanner({ title: top.title, body: top.body, link: top.link }); setTimeout(() => setBanner(null), 6000); }
      }
      lastUnread.current = n;
    } catch { /* the next tick tries again; screens show their own errors */ }
  }, []);

  useEffect(() => {
    refreshCounts();
    const id = setInterval(() => document.visibilityState === "visible" && refreshCounts(), 30000);
    const vis = () => document.visibilityState === "visible" && refreshCounts();
    document.addEventListener("visibilitychange", vis);
    window.addEventListener("telgo:counts", refreshCounts);
    return () => { clearInterval(id); document.removeEventListener("visibilitychange", vis); window.removeEventListener("telgo:counts", refreshCounts); };
  }, [refreshCounts]);
  useEffect(() => { refreshCounts(); setMenuOpen(false); }, [path, refreshCounts]);

  // push arriving while the app is open, and taps on a phone notification
  useEffect(() => {
    if (!("serviceWorker" in navigator)) return;
    navigator.serviceWorker.register("/sw.js").catch(() => {});
    const onMsg = (e: MessageEvent) => {
      if (e.data?.type === "telgo:push") { refreshCounts(); window.dispatchEvent(new Event("telgo:refresh")); }
      if (e.data?.type === "telgo:open" && e.data.link) router.push(e.data.link);
    };
    navigator.serviceWorker.addEventListener("message", onMsg);
    return () => navigator.serviceWorker.removeEventListener("message", onMsg);
  }, [refreshCounts, router]);

  // employees: am I signed in at a site?
  const reloadShift = useCallback(async () => {
    if (!signsIn(me.role)) return;
    try {
      const r = await call<{ open: Shift | null }>("/api/attendance/me");
      setOpen(r.open);
    } catch { /* keep what we knew; the gate shows its own error */ }
    setShiftKnown(true);
  }, [me.role]);
  useEffect(() => { reloadShift(); }, [reloadShift]);

  // while signed in and the app is open: the phone says where it is every 5 minutes (live map)
  useEffect(() => {
    if (!open) return;
    const ping = async () => {
      if (document.visibilityState !== "visible") return;
      try { const f = await getPosition({ timeoutMs: 20000, high: true }); await call("/api/attendance/ping", { body: { lat: f.lat, lng: f.lng, accuracy: f.accuracy } }); } catch { /* next time */ }
    };
    const id = setInterval(ping, 5 * 60 * 1000);
    return () => clearInterval(id);
  }, [open]);

  // new version: offered, and loaded by itself when nobody is typing
  useEffect(() => {
    const check = async () => {
      try {
        const r = await fetch("/api/version", { cache: "no-store" }).then((x) => x.json());
        if (r?.version && BUILD !== "dev" && r.version !== BUILD) setUpdate(true);
      } catch { /* offline */ }
    };
    check();
    const id = setInterval(check, 5 * 60 * 1000);
    const vis = () => document.visibilityState === "visible" && check();
    document.addEventListener("visibilitychange", vis);
    return () => { clearInterval(id); document.removeEventListener("visibilitychange", vis); };
  }, []);
  useEffect(() => {
    if (!update) return;
    const id = setInterval(() => {
      const typing = document.activeElement && ["INPUT", "TEXTAREA", "SELECT"].includes(document.activeElement.tagName);
      if (!typing && !document.querySelector("[data-vm-editing]")) location.reload();
    }, 30000);
    return () => clearInterval(id);
  }, [update]);

  // swipe from the left edge opens the menu; a swipe left closes it
  useEffect(() => {
    let x0 = 0, y0 = 0, edge = false, t0 = 0;
    const start = (e: TouchEvent) => { const t = e.touches[0]; x0 = t.clientX; y0 = t.clientY; t0 = Date.now(); edge = x0 < 28 || document.body.classList.contains("menu-open"); };
    const end = (e: TouchEvent) => {
      if (!edge) return;
      const t = e.changedTouches[0]; const dx = t.clientX - x0, dy = t.clientY - y0;
      if (Math.abs(dy) > Math.abs(dx) || Date.now() - t0 > 700) return;
      if (dx > 60) setMenuOpen(true);
      if (dx < -60) setMenuOpen(false);
    };
    document.addEventListener("touchstart", start, { passive: true });
    document.addEventListener("touchend", end, { passive: true });
    return () => { document.removeEventListener("touchstart", start); document.removeEventListener("touchend", end); };
  }, []);
  useEffect(() => { document.body.classList.toggle("menu-open", menuOpen); }, [menuOpen]);

  const signOutApp = async () => {
    let endpoint: string | undefined;
    try { const reg = await navigator.serviceWorker?.getRegistration(); endpoint = (await reg?.pushManager.getSubscription())?.endpoint; } catch { /* none */ }
    await Promise.race([call("/api/auth/sign-out", { body: { pushEndpoint: endpoint }, quietSignOut: true }).catch(() => {}), new Promise((r) => setTimeout(r, 2500))]);
    saveResume(null);
    location.replace("/login?why=signed_out");
  };

  const menu = MENU[me.role] ?? [];
  const item = menuTitle(me.role, path);
  const barTitle = title ?? item?.label ?? "Telgo";
  const ctx = useMemo(() => ({
    me, setMe, counts, refreshCounts, toast, setTitle,
    shift: { open, known: shiftKnown, set: (s: Shift | null) => { setOpen(s); setShiftKnown(true); }, reload: reloadShift },
  }), [me, counts, refreshCounts, toast, open, shiftKnown, reloadShift]);

  const gated = signsIn(me.role) && !me.mustChangePassword && shiftKnown && !open;
  const hideChat = path.startsWith("/app/chat") || gated || me.mustChangePassword;

  return (
    <Ctx.Provider value={ctx}>
      <div className="phone">
        <header className="bar">
          {!gated && !me.mustChangePassword && (
            <button className="icon-btn" aria-label="Open menu" onClick={() => setMenuOpen(true)} data-testid="menu-button">
              <Icon name="menu" />
              {Object.entries(counts).some(([k, v]) => k !== "notifications" && k !== "chats" && v > 0) && <span className="dot" style={{ minWidth: 10, height: 10, padding: 0, top: 11, right: 11 }} />}
            </button>
          )}
          <h1 data-testid="screen-title">{gated ? "Sign in" : me.mustChangePassword ? "Choose your password" : barTitle}</h1>
          {!gated && !me.mustChangePassword && (
            <a className="icon-btn" href="/app/notifications" aria-label={`Notifications${counts.notifications ? `: ${counts.notifications} new` : ""}`} data-testid="bell">
              <Icon name="bell" />
              {counts.notifications > 0 && <span className="dot">{counts.notifications > 99 ? "99+" : counts.notifications}</span>}
            </a>
          )}
        </header>

        {update && (
          <div className="update-bar" role="status">
            <span className="grow">A new version of the app is ready.</span>
            <button className="btn warn" onClick={() => location.reload()}>Load it</button>
          </div>
        )}
        <div className="scrim" onClick={() => setMenuOpen(false)} />
        <aside className="drawer" aria-label="Menu" aria-hidden={!menuOpen} data-testid="drawer">
          <div className="drawer-brand"><img src="/brand/tp-mark.png" alt="" /><div>TELGO<small>POWER PROJECTS</small></div></div>
          <div className="drawer-head">
            <Avatar name={me.fullName} userId={me.id} has={me.hasAvatar} v={me.updatedAt} />
            <div className="who"><b>{me.fullName}</b><span>{ROLE_LABEL[me.role]} · {me.loginId}</span></div>
          </div>
          <nav>
            {menu.map((g, gi) => (
              <div key={gi}>
                {g.group && <div className="nav-group">{g.group}</div>}
                {g.items.map((i) => {
                  const n = i.count ? counts[i.count] ?? 0 : 0;
                  const current = item?.href === i.href;
                  return (
                    <a key={i.href} className="nav-item" href={i.href} aria-current={current ? "page" : undefined}
                      onClick={(e) => { e.preventDefault(); setMenuOpen(false); router.push(i.href); }}>
                      <Icon name={i.icon} /><span className="nav-label">{i.label}</span>{n > 0 && <span className="nav-count">{n > 99 ? "99+" : n}</span>}
                    </a>
                  );
                })}
              </div>
            ))}
          </nav>
          <div className="drawer-foot">
            <button className="nav-item" onClick={signOutApp} data-testid="app-sign-out"><Icon name="logout" /><span className="nav-label">Sign out of the app</span></button>
          </div>
        </aside>

        {me.mustChangePassword ? <ChangeFirstPassword onDone={(m) => setMe(m)} /> : gated ? <Gate onSignOut={signOutApp} /> : !shiftKnown ? <main className="main"><div className="skeleton" /></main> : children}

        {!hideChat && (
          <a className="chat-fab" href="/app/chat" data-testid="chat-button" onClick={(e) => { e.preventDefault(); router.push("/app/chat"); }}>
            Chat{counts.chats > 0 && <span className="n">{counts.chats > 99 ? "99+" : counts.chats}</span>}
          </a>
        )}
        {banner && (
          <a className="banner" href={banner.link ?? "/app/notifications"} onClick={() => setBanner(null)} role="status">
            <div className="grow"><b>{banner.title}</b><div className="small muted">{banner.body}</div></div>
          </a>
        )}
        {toastMsg && <div className={"toast" + (toastMsg.bad ? " bad" : "")} role="status">{toastMsg.text}</div>}
      </div>
    </Ctx.Provider>
  );
}

// not signed in at a site: only this (owner's rule)
function Gate({ onSignOut }: { onSignOut: () => void }) {
  return (
    <main className="main" data-testid="gate">
      <div className="card hero pad-lg">
        <span className="eyebrow" style={{ color: "#8fe8f2" }}>{greeting()}</span>
        <h1>Sign in to start</h1>
        <p className="muted">The app works while you are signed in at your site. After 12 hours it signs you out by itself.</p>
      </div>
      <SignInCard compact />
      <button className="link-btn" onClick={onSignOut}>Sign out of the app</button>
    </main>
  );
}

// a temporary password (from the admin) is changed before anything else
function ChangeFirstPassword({ onDone }: { onDone: (m: MeView) => void }) {
  const [current, setCurrent] = useState("");
  const [next, setNext] = useState("");
  const [again, setAgain] = useState("");
  const [err, setErr] = useState<Error | null>(null);
  return (
    <main className="main" data-testid="change-first-password">
      <div className="card pad-lg">
        <h2>Choose your own password</h2>
        <p className="muted small">You signed in with a temporary password from the admin. Choose your own now: at least 8 characters.</p>
        <TextInput label="Temporary password" type="password" value={current} onChange={setCurrent} autoComplete="current-password" testId="pw-current" />
        <TextInput label="New password" type="password" value={next} onChange={setNext} autoComplete="new-password" testId="pw-new" />
        <TextInput label="New password again" type="password" value={again} onChange={setAgain} autoComplete="new-password" testId="pw-again"
          error={again && next !== again ? "The two new passwords are not the same." : null} />
        {err && <ErrorNote error={err} />}
        <Button block big testId="pw-save" busyText="Saving…" disabled={!current || next.length < 8 || next !== again} onClick={async () => {
          setErr(null);
          try {
            await call("/api/auth/change-password", { body: { current, next } });
            const r = await call<{ me: MeView }>("/api/me");
            onDone(r.me);
          } catch (e) { setErr(e as Error); }
        }}>Save my password</Button>
      </div>
    </main>
  );
}

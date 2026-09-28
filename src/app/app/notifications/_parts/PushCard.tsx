"use client";
// "Notifications on this phone": turns push on or off for this phone (RULES.md section 8).
// Every state is said in plain words, and every change is shown only from what the server said.
import { useCallback, useEffect, useState } from "react";
import { call, ApiError } from "@/lib/client/api";
import { useLoad } from "@/lib/client/hooks";
import { Button, ErrorNote, Loaded, Pill } from "@/components/ui";
import { fmtTime } from "@/lib/shared/format";

type PushState = { configured: boolean; publicKey: string | null; onHere: boolean };
type Env = { supported: boolean; ios: boolean; standalone: boolean; permission: NotificationPermission | "unsupported"; endpoint: string | null };

function urlBase64ToUint8Array(b64: string) {
  const pad = "=".repeat((4 - (b64.length % 4)) % 4);
  const raw = atob((b64 + pad).replace(/-/g, "+").replace(/_/g, "/"));
  const out = new Uint8Array(raw.length);
  for (let i = 0; i < raw.length; i++) out[i] = raw.charCodeAt(i);
  return out;
}

// the subscription this phone already has (never waits: the Shell registers the service worker)
async function currentSub(): Promise<PushSubscription | null> {
  try {
    const reg = await navigator.serviceWorker.getRegistration();
    return (await reg?.pushManager.getSubscription()) ?? null;
  } catch { return null; }
}

function readyReg(ms = 12000): Promise<ServiceWorkerRegistration> {
  return Promise.race([
    navigator.serviceWorker.ready,
    new Promise<never>((_, bad) => setTimeout(() => bad(new ApiError("The app's background helper didn't start on this phone. Close the app, open it again and try once more.", "NO_SW")), ms)),
  ]);
}

function sameKey(sub: PushSubscription, key: Uint8Array) {
  const have = sub.options?.applicationServerKey;
  if (!have) return false;
  const a = new Uint8Array(have);
  return a.length === key.length && a.every((b, i) => b === key[i]);
}

const asErr = (e: unknown) => {
  if (e instanceof ApiError) return e;
  const name = (e as { name?: string })?.name;
  if (name === "NotAllowedError") return new ApiError("Notifications are blocked for this app. Allow them in the phone's settings (steps below).", "PUSH_DENIED");
  return new ApiError(`The phone couldn't turn on notifications (${(e as Error)?.message || "no reason given"}). Try again. If it keeps failing, open the app in Chrome, not in a private (incognito) tab.`, "PUSH_PHONE");
};

function detectEnv(endpoint: string | null): Env {
  const nav = navigator as Navigator & { standalone?: boolean };
  const ios = /iPad|iPhone|iPod/.test(nav.userAgent) || (nav.platform === "MacIntel" && nav.maxTouchPoints > 1);
  const standalone = nav.standalone === true || window.matchMedia("(display-mode: standalone)").matches;
  const supported = "serviceWorker" in nav && "PushManager" in window && "Notification" in window;
  return { supported, ios, standalone, permission: "Notification" in window ? Notification.permission : "unsupported", endpoint };
}

export function PushCard() {
  const [env, setEnv] = useState<Env | null>(null);
  const [said, setSaid] = useState<string | null>(null);
  const [err, setErr] = useState<ApiError | null>(null);

  const detect = useCallback(async () => {
    const supported = typeof navigator !== "undefined" && "serviceWorker" in navigator && "PushManager" in window;
    const sub = supported ? await currentSub() : null;
    setEnv(detectEnv(sub?.endpoint ?? null));
  }, []);

  useEffect(() => {
    detect();
    // the person may have allowed notifications in the phone's settings and come back
    const vis = () => document.visibilityState === "visible" && detect();
    document.addEventListener("visibilitychange", vis);
    return () => document.removeEventListener("visibilitychange", vis);
  }, [detect]);

  const path = env ? "/api/push" + (env.endpoint ? `?endpoint=${encodeURIComponent(env.endpoint)}` : "") : null;
  const load = useLoad<PushState>(path);

  // the endpoint changed: the path changes and the state loads again; the same endpoint: put in what the server said
  const settle = (endpoint: string | null, onHere: boolean) => {
    const next = detectEnv(endpoint);
    if (endpoint !== env?.endpoint) setEnv(next);
    else { setEnv(next); load.set((d) => (d ? { ...d, onHere } : d)); }
  };

  const turnOn = async (publicKey: string) => {
    setErr(null); setSaid(null);
    try {
      let perm = Notification.permission;
      if (perm !== "granted") perm = await Notification.requestPermission();
      if (perm !== "granted") {
        setEnv(detectEnv(env?.endpoint ?? null));
        throw new ApiError(perm === "denied" ? "Notifications were blocked. Allow them in the phone's settings (steps below)." : "Notifications weren't allowed. Tap Turn on again and choose Allow.", "PUSH_DENIED");
      }
      const reg = await readyReg();
      const key = urlBase64ToUint8Array(publicKey);
      let sub = await reg.pushManager.getSubscription();
      if (sub && !sameKey(sub, key)) { await sub.unsubscribe().catch(() => false); sub = null; }
      if (!sub) sub = await reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: key });
      const r = await call<{ on: boolean; since: string }>("/api/push", { body: { action: "subscribe", subscription: sub.toJSON() } });
      setSaid(r.on ? `The server saved this phone at ${fmtTime(r.serverTime)}. Notifications are on.` : `The server answered at ${fmtTime(r.serverTime)} but didn't turn notifications on.`);
      settle(sub.endpoint, r.on);
    } catch (e) { setErr(asErr(e)); }
  };

  const test = async () => {
    setErr(null); setSaid(null);
    if (!env?.endpoint) return;
    try {
      const r = await call<{ sent: number }>("/api/push", { body: { action: "test", endpoint: env.endpoint } });
      setSaid(`The server sent the test at ${fmtTime(r.serverTime)} (to ${r.sent} ${r.sent === 1 ? "phone" : "phones"}). It should appear in a few seconds.`);
    } catch (e) { setErr(asErr(e)); }
  };

  const turnOff = async () => {
    setErr(null); setSaid(null);
    if (!env?.endpoint) return;
    try {
      const r = await call<{ on: boolean }>("/api/push", { body: { action: "unsubscribe", endpoint: env.endpoint } });
      const sub = await currentSub();
      await sub?.unsubscribe().catch(() => false);
      setSaid(`The server turned notifications off for this phone at ${fmtTime(r.serverTime)}.`);
      settle(null, r.on);
    } catch (e) { setErr(asErr(e)); }
  };

  return (
    <div className="card" data-testid="push-card">
      <h2>Notifications on this phone</h2>
      {!env ? <div className="skeleton" /> : (
        <Loaded load={load} skeleton={1}>
          {(d) => {
            const on = !!env.endpoint && d.onHere && env.permission === "granted";
            if (!d.configured) {
              return (
                <div className="notice warn" data-testid="push-not-set">
                  <b>Push isn&apos;t set up on the server yet</b>
                  <span>New notifications still show in the list below. The phone can&apos;t get them while the app is closed until the push keys are added to the server.</span>
                </div>
              );
            }
            if (env.ios && !env.standalone) {
              return (
                <div className="notice info" data-testid="push-ios-install">
                  <b>On iPhone, add Telgo to the Home Screen first</b>
                  <ol style={{ margin: 0, paddingLeft: 20, lineHeight: 1.6 }}>
                    <li>In Safari, tap Share.</li>
                    <li>Tap Add to Home Screen, then Add.</li>
                    <li>Open Telgo from the home screen and come back to this screen to turn notifications on.</li>
                  </ol>
                  <span className="small">This needs iOS 16.4 or newer.</span>
                </div>
              );
            }
            if (!env.supported) {
              return (
                <div className="notice warn" data-testid="push-unsupported">
                  <b>This browser can&apos;t get notifications</b>
                  <span>Open the app in Chrome on Android, or from the home screen on iPhone. New notifications still show in the list below.</span>
                </div>
              );
            }
            if (env.permission === "denied") {
              return (
                <div className="notice warn" data-testid="push-blocked">
                  <b>Notifications are blocked for this app</b>
                  {env.ios ? (
                    <ol style={{ margin: 0, paddingLeft: 20, lineHeight: 1.6 }}>
                      <li>Open the iPhone&apos;s Settings.</li>
                      <li>Tap Notifications, then Telgo.</li>
                      <li>Turn on Allow Notifications, then come back here.</li>
                    </ol>
                  ) : (
                    <ol style={{ margin: 0, paddingLeft: 20, lineHeight: 1.6 }}>
                      <li>Open the phone&apos;s Settings, then Apps.</li>
                      <li>Tap Telgo (or Chrome, if you use the app in Chrome), then Notifications.</li>
                      <li>Turn on Allow notifications, then come back here.</li>
                    </ol>
                  )}
                  <div><Button kind="ghost" small onClick={detect} testId="push-check-again">Check again</Button></div>
                </div>
              );
            }
            if (on) {
              return (
                <>
                  <div className="row between"><span className="small muted">New notifications also appear on this phone, even when the app is closed.</span><Pill tone="ok">On</Pill></div>
                  <div className="btn-row">
                    <Button kind="soft" small onClick={test} busyText="Sending…" testId="push-test">Send a test</Button>
                    <Button kind="ghost" small onClick={turnOff} busyText="Turning off…" testId="push-off">Turn off</Button>
                  </div>
                </>
              );
            }
            return (
              <>
                <div className="row between"><span className="small muted">Turn on to get notifications on this phone even when the app is closed.</span><Pill>Off</Pill></div>
                <Button block onClick={() => turnOn(d.publicKey ?? "")} disabled={!d.publicKey} busyText="Turning on…" testId="push-on">Turn on</Button>
              </>
            );
          }}
        </Loaded>
      )}
      {said && <div className="notice ok" role="status" data-testid="push-said"><span>{said}</span></div>}
      {err && <ErrorNote error={err} />}
    </div>
  );
}

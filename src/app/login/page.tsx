"use client";
import { Suspense, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { call, saveResume, ApiError } from "@/lib/client/api";

const WHY: Record<string, string> = {
  signed_out: "You signed out.",
  expired: "Your sign-in expired. Sign in again.",
  blocked: "Your login was blocked by the admin. Ask the Telgo office.",
  archived: "Your login was switched off by the admin. Ask the Telgo office.",
  gone: "Your login no longer exists. Ask the Telgo office.",
  idle: "You were signed out after 12 hours without using the app.",
  everywhere: "You were signed out on all phones.",
  password: "Your password was changed. Sign in with the new one.",
  reset: "The admin reset your password. Sign in with the new one.",
};

function LoginForm() {
  const q = useSearchParams();
  const [id, setId] = useState("");
  const [pw, setPw] = useState("");
  const [show, setShow] = useState(false);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<ApiError | null>(null);
  const [ios, setIos] = useState(false);
  const [installed, setInstalled] = useState(true);
  const [ready, setReady] = useState(false);
  const why = q.get("why");

  useEffect(() => {
    document.title = "Sign in · Telgo";
    setReady(true);
    // the old app kept the password itself on the phone: it is removed now, for good
    try { localStorage.removeItem("telgo_saved_password"); localStorage.removeItem("telgo_saved_email"); } catch { /* storage off */ }
    // an Android WebView that lost its cookie: trade the resume ticket for a new session, quietly,
    // unless the person signed out on purpose or was blocked
    const quiet = !["signed_out", "everywhere", "password", "reset", "blocked", "archived", "gone"].includes(why ?? "");
    let resume: string | null = null;
    try { resume = localStorage.getItem("telgo_resume"); } catch { /* none */ }
    if (quiet && resume) {
      setBusy(true);
      fetch("/api/auth/resume", { method: "POST", headers: { "Content-Type": "application/json" }, credentials: "same-origin", body: JSON.stringify({ resume }) })
        .then((r) => r.json().then((d) => ({ ok: r.ok && d?.ok, d })))
        .then(({ ok: good, d }) => {
          if (good) { saveResume(d.resume); const next = q.get("next"); location.replace(next && next.startsWith("/app") ? next : "/app"); return; }
          saveResume(null); setBusy(false);
        })
        .catch(() => setBusy(false));
    }
    setIos(/iphone|ipad|ipod/i.test(navigator.userAgent));
    setInstalled(window.matchMedia("(display-mode: standalone)").matches || (navigator as unknown as { standalone?: boolean }).standalone === true || document.referrer.startsWith("android-app://"));
  }, []);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (busy) return;
    setErr(null);
    // what is in the boxes now (also if it was typed before the page was ready)
    const fd = new FormData(e.currentTarget as HTMLFormElement);
    const idNow = String(fd.get("identifier") ?? id).trim(), pwNow = String(fd.get("password") ?? pw);
    if (!idNow || !pwNow) { setErr(new ApiError("Enter your login ID (or email) and your password.", "INVALID")); return; }
    setBusy(true);
    try {
      const r = await call<{ resume: string }>("/api/auth/sign-in", { body: { identifier: idNow, password: pwNow }, quietSignOut: true });
      saveResume(r.resume);
      const next = q.get("next");
      location.replace(next && next.startsWith("/app") ? next : "/app");
    } catch (e2) {
      setErr(e2 instanceof ApiError ? e2 : new ApiError(String(e2), "ERROR"));
      setBusy(false);
    }
  };

  return (
    <div className="phone" style={{ background: "#fff" }}>
      <main className="main" style={{ paddingTop: "calc(28px + env(safe-area-inset-top))", gap: 18 }}>
        <div className="center" style={{ padding: "8px 8px 0" }}>
          <img src="/brand/telgo-logo.png" alt="Telgo Power Projects Pvt. Ltd. Your power to choose" style={{ width: "100%", maxWidth: 360 }} />
        </div>
        {why && WHY[why] && <div className={"notice " + (["blocked", "archived", "gone"].includes(why) ? "bad" : "info")} role="status">{WHY[why]}</div>}
        {q.get("forgot") && <div className="notice info"><b>Forgot your password?</b><span>Ask the Telgo admin to reset it. You will get a new temporary password and choose your own after signing in.</span></div>}
        <form className="card pad-lg" onSubmit={submit} noValidate>
          <h1>Sign in</h1>
          <div className="field">
            <label htmlFor="login-id">Login ID or email</label>
            <input id="login-id" name="identifier" className="input" value={id} onChange={(e) => setId(e.target.value)} autoComplete="username" autoCapitalize="none" spellCheck={false} placeholder="TLG-… or you@email.com" data-testid="login-id" />
          </div>
          <div className="field">
            <label htmlFor="login-pw">Password</label>
            <div className="input-wrap">
              <input id="login-pw" name="password" className="input" type={show ? "text" : "password"} value={pw} onChange={(e) => setPw(e.target.value)} autoComplete="current-password" data-testid="login-pw" />
              <button type="button" className="in-btn" onClick={() => setShow(!show)}>{show ? "Hide" : "Show"}</button>
            </div>
          </div>
          {err && <div className="notice bad" role="alert"><span>{err.message}</span>{err.ref && <span className="ref">Reference {err.ref}</span>}</div>}
          <button className="btn big block" type="submit" disabled={busy || !ready} data-testid="login-submit">{busy ? <><span className="spinner" />Checking…</> : "Sign in"}</button>
          <div className="row between wrap">
            <a className="link-btn" href="/request-access">Ask for access</a>
            <a className="link-btn" href="/login?forgot=1">Forgot password?</a>
          </div>
        </form>
        {!installed && (
          <div className="card">
            <h3>Put the app on your phone</h3>
            {ios ? (
              <p className="small muted">On iPhone: tap Share at the bottom of Safari, then <b>Add to Home Screen</b>. Open Telgo from the home screen: it runs full screen and can show notifications (iOS 16.4 or newer).</p>
            ) : (
              <>
                <p className="small muted">On Android: open the browser&apos;s menu and tap <b>Add to Home screen</b> (or <b>Install app</b>), or install the Telgo app file.</p>
                <a className="btn soft block" href="/downloads/telgo-hub.apk" download>Download the Android app</a>
              </>
            )}
          </div>
        )}
        <p className="center tiny muted">Telgo Power Projects Pvt. Ltd.</p>
      </main>
    </div>
  );
}

export default function LoginPage() {
  return <Suspense><LoginForm /></Suspense>;
}

"use client";
import { useEffect, useState } from "react";
import { call, ApiError } from "@/lib/client/api";
import { REQUESTABLE, ROLE_LABEL, type Role } from "@/lib/shared/roles";

export default function RequestAccess() {
  const [f, setF] = useState({ fullName: "", email: "", phone: "", role: "supervisor" as Role, note: "" });
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<ApiError | null>(null);
  const [done, setDone] = useState<string | null>(null);
  const [ready, setReady] = useState(false);
  useEffect(() => { document.title = "Ask for access · Telgo"; setReady(true); }, []);
  const set = (k: keyof typeof f) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => setF({ ...f, [k]: e.target.value });

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (busy) return;
    setBusy(true); setErr(null);
    try {
      const r = await call<{ requestedAt: string; message: string }>("/api/auth/request-access", { body: f, quietSignOut: true });
      setDone(r.message);
    } catch (e2) { setErr(e2 instanceof ApiError ? e2 : new ApiError(String(e2), "ERROR")); } finally { setBusy(false); }
  };

  return (
    <div className="phone" style={{ background: "#fff" }}>
      <main className="main" style={{ paddingTop: "calc(24px + env(safe-area-inset-top))" }}>
        <div className="center"><img src="/brand/telgo-logo.png" alt="Telgo Power Projects" style={{ width: "100%", maxWidth: 320 }} /></div>
        {done ? (
          <div className="card pad-lg" data-testid="request-done">
            <h1>Request sent</h1>
            <p>{done}</p>
            <p className="muted small">When the admin approves it, you get a login ID and a temporary password (by email, or from the admin). You choose your own password the first time you sign in.</p>
            <a className="btn block" href="/login">Back to sign in</a>
          </div>
        ) : (
          <form className="card pad-lg" onSubmit={submit} noValidate>
            <h1>Ask for access</h1>
            <p className="muted small">The Telgo admin decides who can use the app.</p>
            <div className="field"><label htmlFor="ra-name">Your name</label><input id="ra-name" className="input" value={f.fullName} onChange={set("fullName")} autoComplete="name" data-testid="ra-name" /></div>
            <div className="field"><label htmlFor="ra-email">Email</label><input id="ra-email" className="input" type="email" value={f.email} onChange={set("email")} autoComplete="email" autoCapitalize="none" data-testid="ra-email" /></div>
            <div className="field"><label htmlFor="ra-phone">Phone (optional)</label><input id="ra-phone" className="input" type="tel" inputMode="tel" value={f.phone} onChange={set("phone")} autoComplete="tel" data-testid="ra-phone" /></div>
            <div className="field"><label htmlFor="ra-role">Your work</label>
              <select id="ra-role" className="input" value={f.role} onChange={set("role")} data-testid="ra-role">
                {REQUESTABLE.map((r) => <option key={r} value={r}>{ROLE_LABEL[r]}</option>)}
              </select></div>
            <div className="field"><label htmlFor="ra-note">Note for the admin (optional)</label><textarea id="ra-note" className="input" rows={2} value={f.note} onChange={set("note")} maxLength={400} /></div>
            {err && <div className="notice bad" role="alert">{err.message}</div>}
            <button className="btn big block" type="submit" disabled={busy || !ready} data-testid="ra-submit">{busy ? <><span className="spinner" />Sending…</> : "Send the request"}</button>
            <a className="link-btn" href="/login">Back to sign in</a>
          </form>
        )}
      </main>
    </div>
  );
}

"use client";
import { useState, useEffect, FormEvent } from "react";

const ROLES = ["supervisor", "client", "finance"] as const;
type Role = typeof ROLES[number];

export default function RequestAccessPage() {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [role, setRole] = useState<Role>("supervisor");
  const [state, setState] = useState<"idle"|"loading"|"done"|"error">("idle");
  const [msg, setMsg] = useState("");

  useEffect(() => {
    if (typeof window !== "undefined") {
      let meta = document.querySelector('meta[name="theme-color"]');
      if (!meta) {
        meta = document.createElement('meta');
        meta.setAttribute('name', 'theme-color');
        document.head.appendChild(meta);
      }
      meta.setAttribute('content', '#ffffff');
    }
    return () => {
      if (typeof window !== "undefined") {
        const meta = document.querySelector('meta[name="theme-color"]');
        if (meta) {
          meta.setAttribute('content', '#ffffff');
        }
      }
    };
  }, []);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!name.trim() || !email.trim()) { setState("error"); setMsg("Please fill in all fields."); return; }
    
    setState("loading"); setMsg("");
    try {
      const r = await fetch("/api/mobile/request-access", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ fullName: name.trim(), email: email.trim().toLowerCase(), role })
      });
      const d = await r.json();
      if (r.ok && d.ok) { setState("done"); return; }
      setState("error"); setMsg(d.message || "Request failed. Please try again.");
    } catch { setState("error"); setMsg("Connection error. Please try again."); }
  }

  if (state === "done") {
    return (
      <main style={{ minHeight: "100dvh", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: "24px 20px", background: "linear-gradient(160deg,#0d0621,#060912,#040d1a)" }}>
        <div className="glass fade-in" style={{ width: "100%", maxWidth: 420, padding: "40px 28px", textAlign: "center" }}>
          <div style={{ width: 64, height: 64, borderRadius: "50%", background: "rgba(34,197,94,0.15)", border: "1px solid rgba(34,197,94,0.3)", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 20px" }}>
            <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#4ade80" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
          </div>
          <h2 style={{ fontSize: 22, fontWeight: 800, marginBottom: 12, color: "#f1f5f9" }}>Request Submitted!</h2>
          <p style={{ fontSize: 14, color: "#94a3b8", lineHeight: 1.7, marginBottom: 28 }}>Your access request has been sent to the admin. Once approved, you will receive an email with your login credentials.</p>
          <div style={{ background: "rgba(245,158,11,0.08)", border: "1px solid rgba(245,158,11,0.2)", borderRadius: 12, padding: "14px", fontSize: 13, color: "#fcd34d", marginBottom: 28 }}>⏳ Status: <strong>Pending Admin Approval</strong></div>
          <a href="/login" className="btn-ghost" style={{ textDecoration: "none" }}>Back to Login</a>
        </div>
      </main>
    );
  }

  return (
    <main style={{ minHeight: "100dvh", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: "24px 20px", background: "linear-gradient(160deg,#0d0621,#060912,#040d1a)" }}>
      <div style={{ textAlign: "center", marginBottom: 28 }}>
        <h1 style={{ fontSize: 22, fontWeight: 800, color: "#f1f5f9", marginBottom: 6 }}>Request Access</h1>
        <p style={{ fontSize: 13, color: "#64748b" }}>Fill in your details. Admin will review and send you login credentials.</p>
      </div>

      <div className="glass fade-in" style={{ width: "100%", maxWidth: 420, padding: "28px" }}>
        <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          <div>
            <label style={{ display: "block", fontSize: 13, fontWeight: 600, color: "#94a3b8", marginBottom: 8 }}>Full Name</label>
            <input className="input-base" type="text" value={name} onChange={e => setName(e.target.value)} placeholder="Your full name" required autoComplete="name" />
          </div>
          <div>
            <label style={{ display: "block", fontSize: 13, fontWeight: 600, color: "#94a3b8", marginBottom: 8 }}>Email Address</label>
            <input className="input-base" type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="yourname@email.com" required autoComplete="email" />
          </div>
          <div>
            <label style={{ display: "block", fontSize: 13, fontWeight: 600, color: "#94a3b8", marginBottom: 8 }}>Role Requested</label>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 8 }}>
              {ROLES.map(r => (
                <button key={r} type="button" onClick={() => setRole(r)} style={{ padding: "10px 8px", borderRadius: 12, border: `1px solid ${role === r ? "rgba(124,58,237,0.6)" : "rgba(255,255,255,0.08)"}`, background: role === r ? "rgba(124,58,237,0.15)" : "rgba(0,0,0,0.3)", color: role === r ? "#c4b5fd" : "#64748b", fontSize: 13, fontWeight: 600, cursor: "pointer", fontFamily: "Outfit, sans-serif", textTransform: "capitalize", transition: "all 0.2s" }}>
                  {r}
                </button>
              ))}
            </div>
          </div>

          {state === "error" && (
            <div style={{ background: "rgba(239,68,68,0.1)", border: "1px solid rgba(239,68,68,0.2)", borderRadius: 12, padding: "12px", fontSize: 13, color: "#fca5a5" }}>{msg}</div>
          )}

          <button className="btn-primary" type="submit" disabled={state === "loading"}>
            {state === "loading" ? <><div className="spinner" /> {msg || "Submitting..."}</> : <>Submit Request <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="22" y1="2" x2="11" y2="13"/><polygon points="22 2 15 22 11 13 2 9 22 2"/></svg></>}
          </button>
        </form>
      </div>
      <a href="/login" style={{ marginTop: 20, fontSize: 13, color: "#475569", textDecoration: "none" }}>← Back to Login</a>
    </main>
  );
}

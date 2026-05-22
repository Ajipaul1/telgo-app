"use client";
import { useState, useEffect, FormEvent } from "react";

function checkAndRequestLocation(): Promise<"granted" | "denied"> {
  return new Promise((resolve) => {
    if (typeof navigator === "undefined" || !navigator.geolocation) {
      resolve("denied");
      return;
    }
    navigator.geolocation.getCurrentPosition(
      () => resolve("granted"),
      () => resolve("denied"),
      { enableHighAccuracy: true, timeout: 8000, maximumAge: 0 }
    );
  });
}

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPw, setShowPw] = useState(false);
  const [state, setState] = useState<"idle"|"loading"|"error"|"pending">("idle");
  const [msg, setMsg] = useState("");
  const [ready, setReady] = useState(false);
  const [isWebView, setIsWebView] = useState(false);

  // Mandatory Location Guard state for logged-in Supervisor/Finance
  const [loggedInUser, setLoggedInUser] = useState<{ id: string; email: string; fullName: string; role: string } | null>(null);
  const [locChecking, setLocChecking] = useState(false);
  const [locError, setLocError] = useState("");

  useEffect(() => {
    setReady(true);
    if (typeof window !== "undefined") {
      const queryApk = window.location.search.includes("apk=true") || window.location.search.includes("platform=apk");
      
      const ua = window.navigator.userAgent ? window.navigator.userAgent.toLowerCase() : "";
      const isUAWebView = 
        ua.includes("; wv") || 
        ua.includes("webview") || 
        (ua.includes("android") && ua.includes("version/"));
      
      const hasAndroidInterface = 
        Boolean((window as any).Android) || 
        Boolean((window as any).JSInterface) || 
        Boolean((window as any).webkit?.messageHandlers);
 
      const isStandalone = 
        window.matchMedia("(display-mode: standalone)").matches || 
        (window.navigator as any).standalone === true || 
        (typeof document !== "undefined" && document.referrer.includes("android-app://"));
      
      setIsWebView(queryApk || isUAWebView || hasAndroidInterface || isStandalone);
    }
  }, []);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!email.trim() || !password.trim()) { setState("error"); setMsg("Enter your email and password."); return; }
    setState("loading"); setMsg("");
    try {
      const r = await fetch("/api/mobile/sign-in", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ identifier: email.trim().toLowerCase(), password })
      });
      const d = await r.json();
      if (r.ok && d.ok) {
        const role = d.user?.role ?? "supervisor";
        
        if (role === "supervisor" || role === "finance") {
          // Query if permission is already granted so we can skip the manual intercept
          if (typeof navigator !== "undefined" && navigator.geolocation) {
            if (navigator.permissions && navigator.permissions.query) {
              try {
                const status = await navigator.permissions.query({ name: "geolocation" as PermissionName });
                if (status.state === "granted") {
                  window.location.href = role === "finance" ? "/app/finance" : "/app/supervisor";
                  return;
                }
              } catch (e) {
                // fall through
              }
            }
          }
          // Hold redirect and display fullscreen location verification overlay
          setLoggedInUser(d.user);
          setState("idle");
          return;
        }

        // Admins and Clients bypass location prompts and redirect immediately
        window.location.href =
          role === "admin" ? "/app/admin" :
          role === "client" ? "/app/client" :
          "/app/supervisor";
        return;
      }
      if (r.status === 403 && d.message?.includes("pending")) { setState("pending"); setMsg(d.message); return; }
      setState("error"); setMsg(d.message || "Incorrect email or password.");
    } catch { setState("error"); setMsg("Connection error. Please try again."); }
  }

  async function handleLocationPermissionCheck() {
    setLocChecking(true);
    setLocError("");
    
    const permission = await checkAndRequestLocation();
    
    if (permission === "granted") {
      const role = loggedInUser?.role ?? "supervisor";
      window.location.href = role === "finance" ? "/app/finance" : "/app/supervisor";
    } else {
      setLocChecking(false);
      setLocError("Location access was denied or timed out. To log in, please allow location permissions in your browser or device settings.");
    }
  }

  // Intercept layout if a Supervisor or Finance has logged in but needs to activate location first
  if (ready && loggedInUser) {
    return (
      <main style={{ minHeight: "100dvh", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: "24px 20px", background: "linear-gradient(160deg, #0d0621 0%, #060912 50%, #040d1a 100%)" }}>
        <div className="glass fade-in" style={{ width: "100%", maxWidth: 420, padding: "40px 32px", textAlign: "center", border: "1px solid rgba(6, 182, 212, 0.25)", boxShadow: "0 24px 64px rgba(0, 0, 0, 0.7)" }}>
          <div style={{
            width: 72,
            height: 72,
            borderRadius: "50%",
            background: loggedInUser.role === "finance" ? "rgba(250, 204, 21, 0.12)" : "rgba(6, 182, 212, 0.12)",
            border: loggedInUser.role === "finance" ? "1px solid rgba(250, 204, 21, 0.3)" : "1px solid rgba(6, 182, 212, 0.3)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            margin: "0 auto 24px",
            boxShadow: loggedInUser.role === "finance" ? "0 0 30px rgba(250, 204, 21, 0.2)" : "0 0 30px rgba(6, 182, 212, 0.2)"
          }}>
            <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke={loggedInUser.role === "finance" ? "#facc15" : "#06b6d4"} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z"/>
              <circle cx="12" cy="10" r="3"/>
            </svg>
          </div>

          <h2 style={{ fontSize: 22, fontWeight: 900, color: "#f1f5f9", marginBottom: 12, letterSpacing: "-0.02em" }}>
            Location Verification
          </h2>
          
          <p style={{ fontSize: 14, color: "#94a3b8", marginBottom: 28, lineHeight: 1.6 }}>
            Welcome back, <strong style={{ color: "#f1f5f9" }}>{loggedInUser.fullName}</strong>! As a <strong style={{ color: loggedInUser.role === "finance" ? "#fcd34d" : "#67e8f9", textTransform: "capitalize" }}>{loggedInUser.role}</strong>, you must enable location services before accessing the platform.
          </p>

          {locError && (
            <div style={{
              background: "rgba(239, 68, 68, 0.08)",
              border: "1px solid rgba(239, 68, 68, 0.2)",
              borderRadius: 12,
              padding: "12px 14px",
              fontSize: 12,
              color: "#fca5a5",
              lineHeight: 1.5,
              textAlign: "left",
              marginBottom: 20
            }}>
              ⚠️ <strong>Access Denied:</strong> {locError}
            </div>
          )}

          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            <button 
              onClick={handleLocationPermissionCheck}
              disabled={locChecking}
              className="btn-primary"
              style={{
                minHeight: 48,
                background: loggedInUser.role === "finance" 
                  ? "linear-gradient(135deg, #facc15 0%, #7c3aed 100%)" 
                  : "linear-gradient(135deg, #06b6d4 0%, #7c3aed 100%)",
                border: "none",
                color: loggedInUser.role === "finance" ? "black" : "white",
                fontWeight: 700,
                boxShadow: loggedInUser.role === "finance" ? "0 8px 24px rgba(250, 204, 21, 0.3)" : "0 8px 24px rgba(6, 182, 212, 0.3)"
              }}
            >
              {locChecking ? (
                <><div className="spinner" style={{ borderTopColor: loggedInUser.role === "finance" ? "black" : "white" }} /> Verifying Location...</>
              ) : (
                <>
                  <span>Activate Location & Log In</span>
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <polygon points="3 11 22 2 13 21 11 13 3 11"/>
                  </svg>
                </>
              )}
            </button>

            <button 
              onClick={async () => {
                await fetch("/api/mobile/sign-out", { method: "POST" });
                setLoggedInUser(null);
                setLocError("");
              }}
              className="btn-ghost"
              style={{ minHeight: 44, marginTop: 8 }}
            >
              Cancel & Sign Out
            </button>
          </div>
        </div>
      </main>
    );
  }

  return (
    <main style={{ minHeight: "100dvh", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: "24px 20px", background: "linear-gradient(160deg, #0d0621 0%, #060912 50%, #040d1a 100%)" }}>
      {/* Logo area */}
      <div className="fade-in" style={{ textAlign: "center", marginBottom: 36 }}>
        <div style={{ display: "inline-flex", alignItems: "center", justifyContent: "center", width: 64, height: 64, borderRadius: 18, background: "linear-gradient(135deg,#7c3aed,#06b6d4)", marginBottom: 16, boxShadow: "0 12px 32px rgba(124,58,237,0.4)" }}>
          <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/>
          </svg>
        </div>
        <h1 style={{ fontSize: 28, fontWeight: 900, letterSpacing: 3, background: "linear-gradient(90deg,#06b6d4,#7c3aed)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent", margin: 0 }}>TELGO HUB</h1>
        <p style={{ color: "#64748b", fontSize: 13, marginTop: 6, fontWeight: 500 }}>Enterprise Operations Platform</p>
      </div>

      {/* Card */}
      <div className="glass fade-in" style={{ width: "100%", maxWidth: 420, padding: "32px 28px", animationDelay: "0.1s" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 24 }}>
          <div className="dot-pulse" style={{ background: "#06b6d4" }} />
          <span style={{ fontSize: 11, fontWeight: 700, letterSpacing: "0.15em", textTransform: "uppercase", color: "#64748b" }}>Secure Login</span>
        </div>

        <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          {/* Email */}
          <div>
            <label style={{ display: "block", fontSize: 13, fontWeight: 600, color: "#94a3b8", marginBottom: 8 }}>Email Address</label>
            <div style={{ position: "relative" }}>
              <svg style={{ position: "absolute", left: 14, top: "50%", transform: "translateY(-50%)", color: "#475569" }} width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect width="20" height="16" x="2" y="4" rx="2"/><path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7"/></svg>
              <input className="input-base" type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="yourname@email.com" style={{ paddingLeft: 44 }} required autoComplete="email" />
            </div>
          </div>

          {/* Password */}
          <div>
            <label style={{ display: "block", fontSize: 13, fontWeight: 600, color: "#94a3b8", marginBottom: 8 }}>Password</label>
            <div style={{ position: "relative" }}>
              <svg style={{ position: "absolute", left: 14, top: "50%", transform: "translateY(-50%)", color: "#475569" }} width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect width="18" height="11" x="3" y="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>
              <input className="input-base" type={showPw ? "text" : "password"} value={password} onChange={e => setPassword(e.target.value)} placeholder="Enter your password" style={{ paddingLeft: 44, paddingRight: 44 }} required autoComplete="current-password" />
              <button type="button" onClick={() => setShowPw(!showPw)} style={{ position: "absolute", right: 14, top: "50%", transform: "translateY(-50%)", background: "none", border: "none", cursor: "pointer", color: "#475569", display: "flex" }}>
                {showPw
                  ? <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94"/><path d="M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19"/><line x1="1" y1="1" x2="23" y2="23"/></svg>
                  : <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>
                }
              </button>
            </div>
          </div>

          {/* Error */}
          {state === "error" && (
            <div style={{ background: "rgba(239,68,68,0.1)", border: "1px solid rgba(239,68,68,0.2)", borderRadius: 12, padding: "12px 14px", fontSize: 13, color: "#fca5a5", display: "flex", gap: 8, alignItems: "flex-start" }}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0, marginTop: 1 }}><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
              {msg}
            </div>
          )}
          {state === "pending" && (
            <div style={{ background: "rgba(245,158,11,0.1)", border: "1px solid rgba(245,158,11,0.2)", borderRadius: 12, padding: "12px 14px", fontSize: 13, color: "#fcd34d" }}>
              <strong style={{ display: "block", marginBottom: 4 }}>⏳ Pending Approval</strong>
              Your account is awaiting admin approval. You will receive an email once approved.
            </div>
          )}

          <button className="btn-primary" type="submit" disabled={!ready || state === "loading"}>
            {state === "loading" ? <><div className="spinner" /> Signing in...</> : <>Sign In Securely <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12h14"/><path d="m12 5 7 7-7 7"/></svg></>}
          </button>
        </form>

        <div style={{ display: "flex", alignItems: "center", gap: 12, margin: "24px 0", color: "#334155" }}>
          <div style={{ flex: 1, height: 1, background: "rgba(255,255,255,0.06)" }} />
          <span style={{ fontSize: 12, color: "#475569" }}>New to Telgo?</span>
          <div style={{ flex: 1, height: 1, background: "rgba(255,255,255,0.06)" }} />
        </div>

        <a href="/request-access" className="btn-ghost" style={{ textDecoration: "none" }}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>
          Request Access
        </a>

        {/* APK Download Area */}
        {!isWebView && (
          <>
            <div style={{ display: "flex", alignItems: "center", gap: 12, margin: "24px 0 16px", color: "#334155" }}>
              <div style={{ flex: 1, height: 1, background: "rgba(255,255,255,0.06)" }} />
              <span style={{ fontSize: 11, color: "#64748b", fontWeight: 700, letterSpacing: "0.15em", textTransform: "uppercase" }}>Native Mobile App</span>
              <div style={{ flex: 1, height: 1, background: "rgba(255,255,255,0.06)" }} />
            </div>

            <a href="/downloads/telgo-hub.apk" download="telgo-hub.apk" className="btn-primary" style={{ textDecoration: "none", background: "linear-gradient(135deg, #10b981, #06b6d4)", boxShadow: "0 8px 24px rgba(16,185,129,0.25)" }}>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
                <polyline points="7 10 12 15 17 10"/>
                <line x1="12" x2="12" y1="15" y2="3"/>
              </svg>
              Download Android APK
            </a>
          </>
        )}
      </div>

      <p style={{ marginTop: 24, fontSize: 11, color: "#475569", textAlign: "center" }}>© 2026 Telgo Power Projects. All rights reserved.</p>
    </main>
  );
}

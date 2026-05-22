"use client";
import { useState, useEffect, useCallback } from "react";

type AccessUser = {
  id: string;
  email: string;
  full_name: string;
  role: string;
  access_status: string;
  created_at: string;
};

export default function AdminDashboard() {
  const [users, setUsers] = useState<AccessUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [approving, setApproving] = useState<string | null>(null);
  const [blocking, setBlocking] = useState<string | null>(null);
  const [toast, setToast] = useState("");

  const fetchUsers = useCallback(async () => {
    try {
      const r = await fetch("/api/mobile/admin/users");
      const d = await r.json();
      if (d.ok) setUsers(d.users);
    } catch { /* silently fail */ }
    setLoading(false);
  }, []);

  useEffect(() => { fetchUsers(); }, [fetchUsers]);

  function showToast(msg: string) {
    setToast(msg);
    setTimeout(() => setToast(""), 3500);
  }

  async function approve(userId: string) {
    setApproving(userId);
    try {
      const r = await fetch("/api/mobile/approve-access", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId })
      });
      const d = await r.json();
      if (r.ok && d.ok) { showToast("✅ Approved — Login credentials emailed!"); fetchUsers(); }
      else showToast("❌ " + (d.message || "Approval failed"));
    } catch { showToast("❌ Network error"); }
    setApproving(null);
  }

  async function blockUser(userId: string) {
    setBlocking(userId);
    try {
      const r = await fetch("/api/mobile/block-access", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId })
      });
      const d = await r.json();
      if (r.ok && d.ok) { showToast("🚫 User blocked."); fetchUsers(); }
      else showToast("❌ " + (d.message || "Block failed"));
    } catch { showToast("❌ Network error"); }
    setBlocking(null);
  }

  const pending = users.filter(u => u.access_status === "pending");
  const active  = users.filter(u => u.access_status === "active");

  function roleColor(role: string) {
    const map: Record<string,string> = { supervisor: "#67e8f9", client: "#86efac", finance: "#fcd34d", admin: "#c4b5fd" };
    return map[role] ?? "#94a3b8";
  }

  return (
    <div className="page" style={{ background: "#060912" }}>
      {/* Header */}
      <div style={{ padding: "20px 16px 0", paddingTop: "env(safe-area-inset-top, 20px)" }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 4 }}>
          <div>
            <p style={{ fontSize: 11, fontWeight: 700, letterSpacing: "0.12em", textTransform: "uppercase", color: "#475569", marginBottom: 4 }}>TELGO HUB</p>
            <h1 style={{ fontSize: 24, fontWeight: 800, color: "#f1f5f9", margin: 0 }}>Admin Panel</h1>
          </div>
          <div style={{ width: 42, height: 42, borderRadius: 12, background: "linear-gradient(135deg,#7c3aed,#06b6d4)", display: "flex", alignItems: "center", justifyContent: "center" }}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>
          </div>
        </div>
      </div>

      {/* Stats strip */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, padding: "16px 16px 0" }}>
        <div className="glass" style={{ padding: "14px 16px" }}>
          <p style={{ fontSize: 11, color: "#64748b", marginBottom: 4, fontWeight: 600 }}>PENDING</p>
          <p style={{ fontSize: 28, fontWeight: 800, color: pending.length > 0 ? "#fbbf24" : "#f1f5f9" }}>{pending.length}</p>
        </div>
        <div className="glass" style={{ padding: "14px 16px" }}>
          <p style={{ fontSize: 11, color: "#64748b", marginBottom: 4, fontWeight: 600 }}>ACTIVE USERS</p>
          <p style={{ fontSize: 28, fontWeight: 800, color: "#4ade80" }}>{active.length}</p>
        </div>
      </div>

      {/* Pending approvals */}
      <div style={{ padding: "24px 16px 0" }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 12 }}>
          <p style={{ fontSize: 11, fontWeight: 700, letterSpacing: "0.12em", textTransform: "uppercase", color: "#94a3b8" }}>Pending Approvals</p>
          {pending.length > 0 && <span className="badge badge-pending">{pending.length} waiting</span>}
        </div>

        {loading ? (
          <div style={{ textAlign: "center", padding: "40px 0", color: "#475569" }}>
            <div className="spinner" style={{ margin: "0 auto 12px" }} />
            Loading...
          </div>
        ) : pending.length === 0 ? (
          <div className="glass" style={{ padding: "28px", textAlign: "center" }}>
            <div style={{ fontSize: 32, marginBottom: 8 }}>✅</div>
            <p style={{ color: "#475569", fontSize: 14 }}>No pending approvals</p>
          </div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            {pending.map(u => (
              <div key={u.id} className="approval-card fade-in">
                <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 12 }}>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <p style={{ fontWeight: 700, fontSize: 15, color: "#f1f5f9", marginBottom: 2, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{u.full_name}</p>
                    <p style={{ fontSize: 12, color: "#64748b", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{u.email}</p>
                  </div>
                  <span style={{ fontSize: 12, fontWeight: 700, color: roleColor(u.role), background: `${roleColor(u.role)}18`, border: `1px solid ${roleColor(u.role)}30`, borderRadius: 8, padding: "3px 10px", flexShrink: 0, textTransform: "capitalize" }}>{u.role}</span>
                </div>
                <div style={{ display: "flex", gap: 8 }}>
                  <button
                    onClick={() => approve(u.id)}
                    disabled={approving === u.id}
                    style={{ flex: 1, minHeight: 40, background: "linear-gradient(135deg,#16a34a,#15803d)", border: "none", borderRadius: 10, color: "white", fontSize: 14, fontWeight: 700, cursor: "pointer", fontFamily: "Outfit,sans-serif", display: "flex", alignItems: "center", justifyContent: "center", gap: 6, opacity: approving === u.id ? 0.6 : 1, transition: "opacity 0.2s" }}
                  >
                    {approving === u.id ? <><div className="spinner" style={{ width: 16, height: 16 }} /> Approving...</> : <>✓ Approve</>}
                  </button>
                  <button
                    onClick={() => blockUser(u.id)}
                    disabled={blocking === u.id}
                    style={{ minWidth: 80, minHeight: 40, background: "rgba(239,68,68,0.1)", border: "1px solid rgba(239,68,68,0.25)", borderRadius: 10, color: "#f87171", fontSize: 14, fontWeight: 700, cursor: "pointer", fontFamily: "Outfit,sans-serif", opacity: blocking === u.id ? 0.6 : 1, transition: "opacity 0.2s" }}
                  >
                    {blocking === u.id ? "..." : "Block"}
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Active users */}
      {active.length > 0 && (
        <div style={{ padding: "24px 16px 0" }}>
          <p style={{ fontSize: 11, fontWeight: 700, letterSpacing: "0.12em", textTransform: "uppercase", color: "#94a3b8", marginBottom: 12 }}>Active Users</p>
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {active.map(u => (
              <div key={u.id} className="glass" style={{ padding: "12px 14px", display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12 }}>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <p style={{ fontWeight: 600, fontSize: 14, color: "#e2e8f0", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{u.full_name}</p>
                  <p style={{ fontSize: 11, color: "#475569", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{u.email}</p>
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: 8, flexShrink: 0 }}>
                  <span style={{ fontSize: 11, fontWeight: 700, color: roleColor(u.role), textTransform: "capitalize" }}>{u.role}</span>
                  <span className="badge badge-active">Active</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Logout */}
      <div style={{ padding: "28px 16px 16px" }}>
        <button onClick={async () => { await fetch("/api/mobile/sign-out", { method: "POST" }); window.location.href = "/login"; }}
          style={{ width: "100%", minHeight: 44, background: "transparent", border: "1px solid rgba(239,68,68,0.2)", borderRadius: 12, color: "#f87171", fontSize: 14, fontWeight: 600, cursor: "pointer", fontFamily: "Outfit,sans-serif" }}>
          Sign Out
        </button>
      </div>

      {/* Toast */}
      {toast && (
        <div style={{ position: "fixed", bottom: 24, left: 16, right: 16, background: "#1e293b", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 14, padding: "14px 18px", fontSize: 14, fontWeight: 600, color: "#f1f5f9", zIndex: 100, textAlign: "center", boxShadow: "0 8px 32px rgba(0,0,0,0.5)", animation: "fadeIn 0.3s ease" }}>
          {toast}
        </div>
      )}
    </div>
  );
}

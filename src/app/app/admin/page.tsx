"use client";
import { useState, useEffect, useCallback } from "react";
import { ProfileModal, ProfileUser } from "@/components/profile-modal";

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
  const [approvedCreds, setApprovedCreds] = useState<{ email: string; password: string; loginId: string } | null>(null);
  const [resending, setResending] = useState<string | null>(null);
  
  // Navigation & Multi-View State
  const [activeView, setActiveView] = useState<"hub" | "approvals" | "map" | "settings">("hub");
  
  // Active User Search State
  const [searchQuery, setSearchQuery] = useState("");

  // Admin Self Profile State
  const [adminSelf, setAdminSelf] = useState<ProfileUser | null>(null);
  const [isAdminSettingsOpen, setIsAdminSettingsOpen] = useState(false);
  const [approvalsTab, setApprovalsTab] = useState<"pending" | "active">("pending");

  // User Administration Edit State
  const [selectedUser, setSelectedUser] = useState<AccessUser | null>(null);
  const [editName, setEditName] = useState("");
  const [editEmail, setEditEmail] = useState("");
  const [editRole, setEditRole] = useState("");
  const [editStatus, setEditStatus] = useState("");
  const [savingUser, setSavingUser] = useState(false);

  // Fetch admin self profile
  useEffect(() => {
    fetch("/api/mobile/me")
      .then(r => r.json())
      .then(d => {
        if (d.ok) setAdminSelf(d.user);
        else window.location.href = "/login";
      });
  }, []);

  const fetchUsers = useCallback(async () => {
    try {
      const r = await fetch("/api/mobile/admin/users");
      const d = await r.json();
      if (d.ok) setUsers(d.users);
    } catch { /* silently fail */ }
    setLoading(false);
  }, []);

  useEffect(() => { 
    fetchUsers(); 
  }, [fetchUsers]);

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
      if (r.ok && d.ok) { 
        showToast("✅ Access approved successfully!"); 
        if (d.password) {
          setApprovedCreds({ email: d.email, password: d.password, loginId: d.loginId });
        }
        fetchUsers(); 
      }
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

  async function resendCredentials(userId: string) {
    setResending(userId);
    try {
      const r = await fetch("/api/mobile/resend-credentials", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId })
      });
      const d = await r.json();
      if (r.ok && d.ok) {
        showToast("🔑 Credentials reset and emailed!");
        if (d.password) {
          setApprovedCreds({ email: d.email, password: d.password, loginId: d.loginId });
        }
        fetchUsers();
      } else {
        showToast("❌ " + (d.message || "Reset failed"));
      }
    } catch {
      showToast("❌ Network error");
    }
    setResending(null);
  }

  function openEditUser(u: AccessUser) {
    setSelectedUser(u);
    setEditName(u.full_name);
    setEditEmail(u.email);
    setEditRole(u.role);
    setEditStatus(u.access_status);
  }

  async function handleUpdateUser(e: React.FormEvent) {
    e.preventDefault();
    if (!selectedUser) return;
    setSavingUser(true);
    try {
      const r = await fetch("/api/mobile/admin/user/update", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userId: selectedUser.id,
          fullName: editName,
          email: editEmail,
          role: editRole,
          accessStatus: editStatus
        })
      });
      const d = await r.json();
      if (r.ok && d.ok) {
        showToast("✅ User settings updated successfully!");
        setSelectedUser(null);
        fetchUsers();
      } else {
        showToast("❌ " + (d.message || "Failed to update user."));
      }
    } catch {
      showToast("❌ Network connection error.");
    } finally {
      setSavingUser(false);
    }
  }

  async function handleTerminateUser() {
    if (!selectedUser) return;
    if (!confirm(`Are you absolutely sure you want to terminate and revoke access for ${editName}?`)) return;
    
    setSavingUser(true);
    try {
      const r = await fetch("/api/mobile/block-access", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId: selectedUser.id })
      });
      const d = await r.json();
      if (r.ok && d.ok) {
        showToast("🚫 Access terminated successfully.");
        setSelectedUser(null);
        fetchUsers();
      } else {
        showToast("❌ " + (d.message || "Failed to terminate access."));
      }
    } catch {
      showToast("❌ Network error.");
    } finally {
      setSavingUser(false);
    }
  }

  const pending = users.filter(u => u.access_status === "pending");
  const active  = users.filter(u => u.access_status === "active");

  // Search Filtered Active Users
  const filteredActive = active.filter(u => 
    u.full_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    u.email.toLowerCase().includes(searchQuery.toLowerCase())
  );

  function roleColor(role: string) {
    const map: Record<string,string> = { supervisor: "#67e8f9", client: "#86efac", finance: "#fcd34d", admin: "#c4b5fd" };
    return map[role] ?? "#94a3b8";
  }

  // Get dynamic greeting based on system time
  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return "Good morning";
    if (hour < 17) return "Good afternoon";
    return "Good evening";
  };

  return (
    <div className="page" style={{ background: "#060912", minHeight: "100vh", position: "relative", color: "#f1f5f9" }}>
      <style>{`
        .module-card {
          transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
          cursor: pointer;
          position: relative;
          overflow: hidden;
        }
        .module-card:hover {
          transform: translateY(-4px) scale(1.015);
          border-color: rgba(124, 58, 237, 0.35) !important;
          background: rgba(255, 255, 255, 0.06) !important;
          box-shadow: 0 16px 36px rgba(124, 58, 237, 0.15) !important;
        }
        .search-input {
          transition: all 0.2s ease;
        }
        .search-input:focus {
          border-color: #06b6d4 !important;
          box-shadow: 0 0 0 3px rgba(6, 182, 212, 0.2) !important;
          background: rgba(0, 0, 0, 0.6) !important;
        }
        .back-btn {
          transition: all 0.2s ease;
        }
        .back-btn:hover {
          background: rgba(255, 255, 255, 0.08) !important;
          transform: translateX(-2px);
        }
        .action-btn {
          transition: all 0.2s ease;
        }
        .action-btn:hover {
          transform: scale(1.02);
          opacity: 0.95;
        }
        .action-btn:active {
          transform: scale(0.98);
        }
        @keyframes subtleGlow {
          0%, 100% { box-shadow: 0 0 20px rgba(245, 158, 11, 0.2); }
          50% { box-shadow: 0 0 30px rgba(245, 158, 11, 0.4); }
        }
        .active-glow-pending {
          animation: subtleGlow 2s infinite ease-in-out;
        }
      `}</style>

      {/* VIEW 1: CENTRAL CONTROL HUB */}
      {activeView === "hub" && (
        <div className="fade-in" style={{ paddingBottom: 40 }}>
          {/* Header */}
          <div style={{ padding: "24px 16px 0", paddingTop: "calc(env(safe-area-inset-top, 0px) + 24px)" }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 16 }}>
              <div>
                <p style={{ fontSize: 10, fontWeight: 800, letterSpacing: "0.15em", textTransform: "uppercase", color: "#06b6d4", marginBottom: 4 }}>TELGO OPERATIONS</p>
                <h1 style={{ fontSize: 24, fontWeight: 900, color: "#f1f5f9", margin: 0, letterSpacing: "-0.5px" }}>Control Center</h1>
              </div>
              
              {/* Premium Circular Profile Photo Button */}
              <button 
                onClick={() => setIsAdminSettingsOpen(true)}
                style={{
                  background: "none",
                  border: "none",
                  cursor: "pointer",
                  display: "flex",
                  alignItems: "center",
                  outline: "none",
                  padding: 0
                }}
              >
                <div style={{
                  width: 42,
                  height: 42,
                  borderRadius: "50%",
                  background: "linear-gradient(135deg, #7c3aed, #06b6d4)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  color: "white",
                  fontSize: 16,
                  fontWeight: 800,
                  border: "1.5px solid rgba(255,255,255,0.15)",
                  boxShadow: "0 4px 15px rgba(124, 58, 237, 0.3)",
                  textTransform: "uppercase"
                }}>
                  {adminSelf ? adminSelf.fullName.charAt(0) : "A"}
                </div>
              </button>
            </div>

            {/* Greeting & Subtitle */}
            <div className="glass" style={{ padding: "18px 20px", display: "flex", alignItems: "center", gap: 14, border: "1px solid rgba(255,255,255,0.06)", borderRadius: 16, background: "linear-gradient(135deg, rgba(255,255,255,0.02) 0%, rgba(255,255,255,0.04) 100%)", marginBottom: 24 }}>
              <div style={{ width: 10, height: 10, borderRadius: "50%", background: "#10b981", boxShadow: "0 0 10px #10b981" }} />
              <div>
                <h2 style={{ fontSize: 16, fontWeight: 700, color: "#f1f5f9", margin: 0 }}>{getGreeting()}, {adminSelf?.fullName || "Control"}</h2>
                <p style={{ fontSize: 12, color: "#94a3b8", margin: "2px 0 0" }}>System is online. Click your avatar to manage your profile.</p>
              </div>
            </div>
          </div>

          {/* Quick Metrics Banner */}
          <div style={{ padding: "0 16px 24px" }}>
            <p style={{ fontSize: 11, fontWeight: 700, letterSpacing: "0.12em", textTransform: "uppercase", color: "#475569", marginBottom: 12 }}>Active Telemetry</p>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
              <div className="glass" style={{ padding: "16px 18px", border: "1px solid rgba(255,255,255,0.05)" }}>
                <span style={{ fontSize: 10, color: "#94a3b8", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.05em" }}>Total Crews</span>
                <p style={{ fontSize: 32, fontWeight: 900, color: "#f1f5f9", margin: "4px 0 0", letterSpacing: "-1px" }}>{users.length}</p>
              </div>
              <div className="glass" style={{ padding: "16px 18px", border: "1px solid rgba(255,255,255,0.05)" }}>
                <span style={{ fontSize: 10, color: "#94a3b8", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.05em" }}>Active Mailers</span>
                <p style={{ fontSize: 15, fontWeight: 700, color: "#4ade80", margin: "16px 0 0", display: "flex", alignItems: "center", gap: 6 }}>
                  <span style={{ width: 8, height: 8, borderRadius: "50%", background: "#22c55e" }} />
                  SMTP Ready
                </p>
              </div>
            </div>
          </div>

          {/* Core System Grid */}
          <div style={{ padding: "0 16px" }}>
            <p style={{ fontSize: 11, fontWeight: 700, letterSpacing: "0.12em", textTransform: "uppercase", color: "#475569", marginBottom: 12 }}>Control Modules</p>
            
            <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
              
              {/* MODULE 1: ONBOARDING APPROVALS */}
              <div 
                className={`glass module-card ${pending.length > 0 ? "active-glow-pending" : ""}`}
                onClick={() => setActiveView("approvals")}
                style={{ 
                  padding: 20, 
                  border: pending.length > 0 ? "1px solid rgba(245, 158, 11, 0.4)" : "1px solid rgba(255,255,255,0.06)",
                  background: pending.length > 0 ? "linear-gradient(135deg, rgba(245,158,11,0.04) 0%, rgba(6,9,18,0.8) 100%)" : "rgba(255,255,255,0.02)"
                }}
              >
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 12 }}>
                  <div style={{ width: 44, height: 44, borderRadius: 12, background: pending.length > 0 ? "rgba(245,158,11,0.12)" : "rgba(124, 58, 237, 0.12)", border: pending.length > 0 ? "1px solid rgba(245, 158, 11, 0.3)" : "1px solid rgba(124, 58, 237, 0.2)", display: "flex", alignItems: "center", justifyContent: "center" }}>
                    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke={pending.length > 0 ? "#fbbf24" : "#a78bfa"} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M16 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="8.5" cy="7" r="4"/><line x1="20" y1="8" x2="20" y2="14"/><line x1="23" y1="11" x2="17" y2="11"/></svg>
                  </div>
                  {pending.length > 0 ? (
                    <span style={{ fontSize: 11, fontWeight: 800, background: "#fbbf24", color: "#060912", borderRadius: 10, padding: "4px 10px", textTransform: "uppercase", letterSpacing: "0.05em" }}>
                      ⚠️ {pending.length} Waiting
                    </span>
                  ) : (
                    <span style={{ fontSize: 10, fontWeight: 700, color: "#64748b", textTransform: "uppercase" }}>Clear</span>
                  )}
                </div>
                <h3 style={{ fontSize: 18, fontWeight: 800, color: "#f1f5f9", margin: "0 0 6px" }}>Access & Approvals</h3>
                <p style={{ fontSize: 12, color: "#94a3b8", lineHeight: 1.5, margin: 0 }}>Review registrations, authorize operational accounts, generate credentials, and manage active system users.</p>
              </div>

              {/* MODULE 2: LIVE GPS TRACKING */}
              <div 
                className="glass module-card"
                onClick={() => showToast("📍 Live Tracking is active in Background telemetry.")}
                style={{ padding: 20, border: "1px solid rgba(255,255,255,0.06)" }}
              >
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 12 }}>
                  <div style={{ width: 44, height: 44, borderRadius: 12, background: "rgba(6, 182, 212, 0.12)", border: "1px solid rgba(6, 182, 212, 0.2)", display: "flex", alignItems: "center", justifyContent: "center" }}>
                    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#06b6d4" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/><circle cx="12" cy="10" r="3"/></svg>
                  </div>
                  <span style={{ fontSize: 10, fontWeight: 700, color: "#06b6d4", textTransform: "uppercase", display: "flex", alignItems: "center", gap: 4 }}>
                    <span className="dot-pulse" style={{ background: "#06b6d4" }} /> Active
                  </span>
                </div>
                <h3 style={{ fontSize: 18, fontWeight: 800, color: "#f1f5f9", margin: "0 0 6px" }}>Live Crew Radar</h3>
                <p style={{ fontSize: 12, color: "#94a3b8", lineHeight: 1.5, margin: 0 }}>View real-time geological location tracking and check-in coordinates of field supervisors and finance teams.</p>
              </div>

              {/* MODULE 3: SYSTEM LOGGER */}
              <div 
                className="glass module-card"
                onClick={() => showToast("📊 Log analytics are being collected in the secure cloud.")}
                style={{ padding: 20, border: "1px solid rgba(255,255,255,0.06)" }}
              >
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 12 }}>
                  <div style={{ width: 44, height: 44, borderRadius: 12, background: "rgba(34, 197, 94, 0.12)", border: "1px solid rgba(34, 197, 94, 0.2)", display: "flex", alignItems: "center", justifyContent: "center" }}>
                    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#22c55e" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="20" x2="18" y2="10"/><line x1="12" y1="20" x2="12" y2="4"/><line x1="6" y1="20" x2="6" y2="14"/></svg>
                  </div>
                  <span style={{ fontSize: 10, fontWeight: 700, color: "#22c55e", textTransform: "uppercase" }}>Healthy</span>
                </div>
                <h3 style={{ fontSize: 18, fontWeight: 800, color: "#f1f5f9", margin: "0 0 6px" }}>Operational Metrics</h3>
                <p style={{ fontSize: 12, color: "#94a3b8", lineHeight: 1.5, margin: 0 }}>Inspect active logs, generated credentials copies, check-in history timestamps, and system anomalies.</p>
              </div>
              
            </div>
          </div>

          {/* Logout */}
          <div style={{ padding: "32px 16px 16px" }}>
            <button 
              onClick={async () => { await fetch("/api/mobile/sign-out", { method: "POST" }); window.location.href = "/login"; }}
              className="action-btn"
              style={{ width: "100%", minHeight: 48, background: "transparent", border: "1px solid rgba(239,68,68,0.25)", borderRadius: 14, color: "#f87171", fontSize: 14, fontWeight: 700, cursor: "pointer", fontFamily: "Outfit,sans-serif" }}
            >
              Secure Sign Out
            </button>
          </div>
        </div>
      )}

      {/* VIEW 2: DEDICATED APPROVALS MODULE */}
      {activeView === "approvals" && (
        <div className="fade-in" style={{ paddingBottom: 60 }}>
          
          {/* Sub Header */}
          <div style={{ padding: "20px 16px 14px", paddingTop: "calc(env(safe-area-inset-top, 0px) + 16px)", borderBottom: "1px solid rgba(255,255,255,0.05)", background: "rgba(6,9,18,0.6)", backdropFilter: "blur(10px)", position: "sticky", top: 0, zIndex: 10 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
              <button 
                onClick={() => setActiveView("hub")}
                className="back-btn"
                style={{ width: 38, height: 38, borderRadius: 10, border: "1px solid rgba(255,255,255,0.08)", background: "rgba(255,255,255,0.03)", display: "flex", alignItems: "center", justifyContent: "center", color: "#f1f5f9", cursor: "pointer" }}
              >
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="19" y1="12" x2="5" y2="12"/><polyline points="12 19 5 12 12 5"/></svg>
              </button>
              <div>
                <p style={{ fontSize: 10, fontWeight: 800, color: "#06b6d4", letterSpacing: "0.1em", textTransform: "uppercase", margin: 0 }}>System Management</p>
                <h1 style={{ fontSize: 20, fontWeight: 800, color: "#f1f5f9", margin: "2px 0 0", letterSpacing: "-0.5px" }}>Access Control</h1>
              </div>
            </div>
          </div>

          {/* Professional Tab Switcher */}
          <div style={{ padding: "16px 16px 0", display: "flex", gap: 10 }}>
            <button 
              onClick={() => setApprovalsTab("pending")}
              style={{
                flex: 1,
                minHeight: 40,
                background: approvalsTab === "pending" ? "rgba(124, 58, 237, 0.15)" : "rgba(255, 255, 255, 0.02)",
                border: approvalsTab === "pending" ? "1px solid rgba(124, 58, 237, 0.35)" : "1px solid rgba(255, 255, 255, 0.06)",
                borderRadius: 12,
                color: approvalsTab === "pending" ? "#c4b5fd" : "#94a3b8",
                fontSize: 13,
                fontWeight: 700,
                cursor: "pointer",
                fontFamily: "Outfit, sans-serif",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                gap: 6
              }}
            >
              <span>⏳ Requests</span>
              {pending.length > 0 && (
                <span style={{ fontSize: 10, background: "#fbbf24", color: "#060912", borderRadius: "50%", width: 18, height: 18, display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 800 }}>
                  {pending.length}
                </span>
              )}
            </button>
            <button 
              onClick={() => setApprovalsTab("active")}
              style={{
                flex: 1,
                minHeight: 40,
                background: approvalsTab === "active" ? "rgba(6, 182, 212, 0.15)" : "rgba(255, 255, 255, 0.02)",
                border: approvalsTab === "active" ? "1px solid rgba(6, 182, 212, 0.35)" : "1px solid rgba(255, 255, 255, 0.06)",
                borderRadius: 12,
                color: approvalsTab === "active" ? "#67e8f9" : "#94a3b8",
                fontSize: 13,
                fontWeight: 700,
                cursor: "pointer",
                fontFamily: "Outfit, sans-serif",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                gap: 6
              }}
            >
              <span>👥 Active Crew</span>
              <span style={{ fontSize: 10, background: "rgba(6, 182, 212, 0.2)", color: "#06b6d4", borderRadius: 10, padding: "2px 6px", fontWeight: 800 }}>
                {active.length}
              </span>
            </button>
          </div>

          {/* Tab A: Pending Requests */}
          {approvalsTab === "pending" && (
            <div style={{ padding: "20px 16px 0" }}>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 12 }}>
                <p style={{ fontSize: 11, fontWeight: 700, letterSpacing: "0.12em", textTransform: "uppercase", color: "#94a3b8" }}>Pending Approvals</p>
                {pending.length > 0 && <span className="badge badge-pending">{pending.length} waiting</span>}
              </div>

              {loading ? (
                <div style={{ textAlign: "center", padding: "40px 0", color: "#475569" }}>
                  <div className="spinner" style={{ margin: "0 auto 12px" }} />
                  Loading Database...
                </div>
              ) : pending.length === 0 ? (
                <div className="glass" style={{ padding: "24px 18px", textAlign: "center", border: "1px solid rgba(255,255,255,0.05)" }}>
                  <div style={{ fontSize: 28, marginBottom: 6 }}>✨</div>
                  <p style={{ color: "#64748b", fontSize: 13, margin: 0 }}>No pending onboarding requests.</p>
                </div>
              ) : (
                <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                  {pending.map(u => (
                    <div key={u.id} className="approval-card fade-in" style={{ background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.05)", borderRadius: 16, padding: 16 }}>
                      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 12, marginBottom: 4 }}>
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <p style={{ fontWeight: 700, fontSize: 15, color: "#f1f5f9", marginBottom: 2, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{u.full_name}</p>
                          <p style={{ fontSize: 12, color: "#64748b", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{u.email}</p>
                        </div>
                        <span style={{ fontSize: 11, fontWeight: 700, color: roleColor(u.role), background: `${roleColor(u.role)}18`, border: `1px solid ${roleColor(u.role)}30`, borderRadius: 8, padding: "3px 9px", flexShrink: 0, textTransform: "capitalize" }}>{u.role}</span>
                      </div>
                      
                      <div style={{ display: "flex", gap: 8, marginTop: 8 }}>
                        <button
                          onClick={() => approve(u.id)}
                          disabled={approving === u.id}
                          className="action-btn"
                          style={{ flex: 1, minHeight: 40, background: "linear-gradient(135deg,#16a34a,#15803d)", border: "none", borderRadius: 10, color: "white", fontSize: 13, fontWeight: 700, cursor: "pointer", fontFamily: "Outfit,sans-serif", display: "flex", alignItems: "center", justifyContent: "center", gap: 6, opacity: approving === u.id ? 0.6 : 1 }}
                        >
                          {approving === u.id ? <><div className="spinner" style={{ width: 14, height: 14 }} /> Approving...</> : <>✓ Approve</>}
                        </button>
                        <button
                          onClick={() => blockUser(u.id)}
                          disabled={blocking === u.id}
                          className="action-btn"
                          style={{ minWidth: 70, minHeight: 40, background: "rgba(239,68,68,0.08)", border: "1px solid rgba(239,68,68,0.2)", borderRadius: 10, color: "#f87171", fontSize: 13, fontWeight: 700, cursor: "pointer", fontFamily: "Outfit,sans-serif", opacity: blocking === u.id ? 0.6 : 1 }}
                        >
                          {blocking === u.id ? "..." : "Block"}
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Tab B: Active Crew Directory */}
          {approvalsTab === "active" && (
            <div style={{ padding: "20px 16px 0" }}>
              <p style={{ fontSize: 11, fontWeight: 700, letterSpacing: "0.12em", textTransform: "uppercase", color: "#94a3b8", marginBottom: 12 }}>Authorized Personnel Directory</p>
              
              {/* Search Box */}
              <div style={{ marginBottom: 14 }}>
                <input 
                  type="text" 
                  placeholder="🔍 Search active crew by name or email..." 
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="search-input"
                  style={{ 
                    width: "100%", 
                    height: 44, 
                    background: "rgba(0,0,0,0.3)", 
                    border: "1px solid rgba(255,255,255,0.08)", 
                    borderRadius: 12, 
                    padding: "0 14px", 
                    color: "#f1f5f9", 
                    fontSize: 13, 
                    outline: "none", 
                    fontFamily: "Outfit, sans-serif" 
                  }} 
                />
              </div>

              {loading ? (
                <div style={{ textAlign: "center", padding: "20px 0", color: "#475569" }}>
                  Loading Users...
                </div>
              ) : filteredActive.length === 0 ? (
                <div className="glass" style={{ padding: "20px", textAlign: "center", border: "1px solid rgba(255,255,255,0.05)" }}>
                  <p style={{ color: "#64748b", fontSize: 12, margin: 0 }}>
                    {searchQuery ? "No matching crew members found." : "No active crew members authorized yet."}
                  </p>
                </div>
              ) : (
                <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                  {filteredActive.map(u => (
                    <div 
                      key={u.id} 
                      className="glass module-card" 
                      onClick={() => openEditUser(u)}
                      style={{ 
                        padding: "14px 16px", 
                        display: "flex", 
                        alignItems: "center", 
                        justifyContent: "space-between", 
                        gap: 12, 
                        border: "1px solid rgba(255,255,255,0.04)",
                        borderRadius: 14,
                        background: "rgba(255,255,255,0.01)"
                      }}
                    >
                      <div style={{ display: "flex", alignItems: "center", gap: 12, minWidth: 0, flex: 1 }}>
                        {/* Round Initials Avatar */}
                        <div style={{
                          width: 38,
                          height: 38,
                          borderRadius: "50%",
                          background: "linear-gradient(135deg, #475569, #1e293b)",
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          color: "white",
                          fontSize: 14,
                          fontWeight: 800,
                          border: "1px solid rgba(255,255,255,0.1)",
                          textTransform: "uppercase"
                        }}>
                          {u.full_name.charAt(0)}
                        </div>
                        
                        <div style={{ minWidth: 0, flex: 1 }}>
                          <p style={{ fontWeight: 700, fontSize: 14, color: "#e2e8f0", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", margin: 0 }}>{u.full_name}</p>
                          <p style={{ fontSize: 11, color: "#64748b", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", margin: "2px 0 0" }}>{u.email}</p>
                        </div>
                      </div>

                      <div style={{ display: "flex", alignItems: "center", gap: 10, flexShrink: 0 }}>
                        <span style={{ fontSize: 10, fontWeight: 800, color: roleColor(u.role), textTransform: "uppercase", background: `${roleColor(u.role)}12`, padding: "4px 8px", borderRadius: 6, border: `1px solid ${roleColor(u.role)}20` }}>{u.role}</span>
                        <div style={{ width: 28, height: 28, borderRadius: "50%", background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.08)", display: "flex", alignItems: "center", justifyContent: "center", color: "#64748b" }}>
                          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M12 20h9"/><path d="M16.5 3.5a2.12 2.12 0 0 1 3 3L7 19l-4 1 1-4Z"/></svg>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* Credentials Modal */}
      {approvedCreds && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(6,9,18,0.85)", backdropFilter: "blur(8px)", display: "flex", alignItems: "center", justifyContent: "center", padding: 20, zIndex: 1000, animation: "fadeIn 0.2s ease" }}>
          <div className="glass glow-cyan" style={{ width: "100%", maxWidth: 400, padding: 30, background: "linear-gradient(135deg, #0e0829 0%, #060912 100%)", borderRadius: 24, textAlign: "center", border: "1px solid rgba(6,182,212,0.3)" }}>
            <div style={{ width: 56, height: 56, borderRadius: "50%", background: "rgba(6,182,212,0.15)", border: "1px solid rgba(6,182,212,0.3)", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 16px" }}>
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#06b6d4" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
            </div>
            <h3 style={{ fontSize: 20, fontWeight: 800, color: "#f1f5f9", marginBottom: 8 }}>Credentials Active!</h3>
            <p style={{ fontSize: 13, color: "#94a3b8", marginBottom: 20, lineHeight: 1.5 }}>
              Account is active. The credentials have been sent via email from <strong style={{ color: "#06b6d4" }}>ajipaul96@gmail.com</strong>! You can also copy them below:
            </p>
            
            <div style={{ background: "rgba(0,0,0,0.3)", border: "1px solid rgba(255,255,255,0.06)", borderRadius: 16, padding: 18, marginBottom: 24, textAlign: "left", display: "flex", flexDirection: "column", gap: 12 }}>
              <div>
                <span style={{ fontSize: 10, fontWeight: 700, color: "#64748b", textTransform: "uppercase", letterSpacing: "0.08em" }}>Login Email</span>
                <p style={{ fontSize: 14, fontFamily: "monospace", color: "#e2e8f0", margin: "2px 0 0" }}>{approvedCreds.email}</p>
              </div>
              <div style={{ height: 1, background: "rgba(255,255,255,0.05)" }} />
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <div>
                  <span style={{ fontSize: 10, fontWeight: 700, color: "#64748b", textTransform: "uppercase", letterSpacing: "0.08em" }}>Login ID</span>
                  <p style={{ fontSize: 15, fontFamily: "monospace", fontWeight: 700, color: "#06b6d4", margin: "2px 0 0" }}>{approvedCreds.loginId}</p>
                </div>
                <button onClick={() => { navigator.clipboard.writeText(approvedCreds.loginId); showToast("📋 Login ID copied!"); }} style={{ background: "rgba(6,182,212,0.1)", border: "1px solid rgba(6,182,212,0.2)", borderRadius: 8, padding: "4px 8px", fontSize: 11, fontWeight: 600, color: "#06b6d4", cursor: "pointer", fontFamily: "Outfit, sans-serif" }}>Copy</button>
              </div>
              <div style={{ height: 1, background: "rgba(255,255,255,0.05)" }} />
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <div>
                  <span style={{ fontSize: 10, fontWeight: 700, color: "#64748b", textTransform: "uppercase", letterSpacing: "0.08em" }}>Password</span>
                  <p style={{ fontSize: 16, fontFamily: "monospace", fontWeight: 800, color: "#a78bfa", margin: "2px 0 0", letterSpacing: "1px" }}>{approvedCreds.password}</p>
                </div>
                <button onClick={() => { navigator.clipboard.writeText(approvedCreds.password); showToast("📋 Password copied!"); }} style={{ background: "rgba(167,139,250,0.1)", border: "1px solid rgba(167,139,250,0.2)", borderRadius: 8, padding: "4px 8px", fontSize: 11, fontWeight: 600, color: "#a78bfa", cursor: "pointer", fontFamily: "Outfit, sans-serif" }}>Copy</button>
              </div>
            </div>
            
            <button onClick={() => setApprovedCreds(null)} className="btn-primary" style={{ minHeight: 44, fontSize: 14 }}>
              Done & Dismiss
            </button>
          </div>
        </div>
      )}

      {/* Admin Self Profile Settings Modal */}
      <ProfileModal
        isOpen={isAdminSettingsOpen}
        onClose={() => setIsAdminSettingsOpen(false)}
        user={adminSelf}
        onUpdate={(updated) => setAdminSelf(updated)}
      />

      {/* ADMINISTRATIVE USER MANAGEMENT MODAL */}
      {selectedUser && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(6,9,18,0.85)", backdropFilter: "blur(8px)", display: "flex", alignItems: "center", justifyContent: "center", padding: 20, zIndex: 1100, animation: "fadeIn 0.2s ease" }}>
          <div className="glass" style={{ width: "100%", maxWidth: 420, padding: "28px 24px", background: "linear-gradient(135deg, #0f082e 0%, #060912 100%)", borderRadius: 24, border: "1px solid rgba(255, 255, 255, 0.08)", boxShadow: "0 24px 64px rgba(0, 0, 0, 0.7)", color: "#f1f5f9" }}>
            
            {/* Modal Header */}
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 20 }}>
              <h3 style={{ fontSize: 18, fontWeight: 900, letterSpacing: "-0.02em", margin: 0 }}>Manage Crew Profile</h3>
              <button onClick={() => setSelectedUser(null)} style={{ background: "rgba(255, 255, 255, 0.04)", border: "1px solid rgba(255, 255, 255, 0.08)", width: 32, height: 32, borderRadius: "50%", color: "#94a3b8", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}>
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
              </button>
            </div>

            {/* Avatar Preview */}
            <div style={{ display: "flex", flexDirection: "column", alignItems: "center", marginBottom: 20 }}>
              <div style={{
                width: 64,
                height: 64,
                borderRadius: "50%",
                background: "linear-gradient(135deg, #475569, #1e293b)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                color: "white",
                fontSize: 24,
                fontWeight: 800,
                border: "2px solid rgba(255,255,255,0.1)",
                textTransform: "uppercase",
                marginBottom: 8
              }}>
                {editName ? editName.charAt(0) : "U"}
              </div>
              <span style={{ fontSize: 11, fontWeight: 700, color: roleColor(editRole), textTransform: "uppercase", letterSpacing: "0.05em" }}>{editRole}</span>
            </div>

            <form onSubmit={handleUpdateUser} style={{ display: "flex", flexDirection: "column", gap: 14 }}>
              {/* Name field */}
              <div>
                <label style={{ display: "block", fontSize: 11, fontWeight: 700, color: "#94a3b8", marginBottom: 6, textTransform: "uppercase", letterSpacing: "0.03em" }}>Display Name</label>
                <input
                  type="text"
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  required
                  style={{ width: "100%", height: 44, background: "rgba(0, 0, 0, 0.3)", border: "1px solid rgba(255, 255, 255, 0.08)", borderRadius: 12, padding: "0 14px", color: "#f1f5f9", fontSize: 14, fontFamily: "Outfit, sans-serif", outline: "none" }}
                />
              </div>

              {/* Email field */}
              <div>
                <label style={{ display: "block", fontSize: 11, fontWeight: 700, color: "#94a3b8", marginBottom: 6, textTransform: "uppercase", letterSpacing: "0.03em" }}>Email Address</label>
                <input
                  type="email"
                  value={editEmail}
                  onChange={(e) => setEditEmail(e.target.value)}
                  required
                  style={{ width: "100%", height: 44, background: "rgba(0, 0, 0, 0.3)", border: "1px solid rgba(255, 255, 255, 0.08)", borderRadius: 12, padding: "0 14px", color: "#f1f5f9", fontSize: 14, fontFamily: "monospace", outline: "none" }}
                />
              </div>

              {/* Role selector field */}
              <div>
                <label style={{ display: "block", fontSize: 11, fontWeight: 700, color: "#94a3b8", marginBottom: 6, textTransform: "uppercase", letterSpacing: "0.03em" }}>Security & Operations Role</label>
                <select
                  value={editRole}
                  onChange={(e) => setEditRole(e.target.value)}
                  style={{ width: "100%", height: 44, background: "#060912", border: "1px solid rgba(255, 255, 255, 0.08)", borderRadius: 12, padding: "0 14px", color: "#f1f5f9", fontSize: 14, outline: "none", cursor: "pointer", fontFamily: "Outfit, sans-serif" }}
                >
                  <option value="supervisor">Supervisor (Field Engineer)</option>
                  <option value="client">Client (KSEB / Board Member)</option>
                  <option value="finance">Finance Team Member</option>
                  <option value="admin">Administrator</option>
                </select>
              </div>

              {/* Account Status Display */}
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginTop: 4 }}>
                <div>
                  <span style={{ fontSize: 10, color: "#475569", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.05em" }}>Operational ID</span>
                  <p style={{ margin: "2px 0 0", fontSize: 13, fontWeight: 700, fontFamily: "monospace", color: "#94a3b8" }}>{selectedUser.login_id}</p>
                </div>
                <div>
                  <span style={{ fontSize: 10, color: "#475569", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.05em" }}>Status</span>
                  <p style={{ margin: "2px 0 0", fontSize: 13, fontWeight: 800, color: editStatus === "blocked" ? "#f87171" : "#4ade80", textTransform: "uppercase" }}>{editStatus}</p>
                </div>
              </div>

              {/* Action Buttons Row */}
              <div style={{ display: "flex", flexDirection: "column", gap: 10, marginTop: 14 }}>
                <button
                  type="submit"
                  disabled={savingUser}
                  style={{ width: "100%", minHeight: 44, background: "linear-gradient(135deg, #06b6d4 0%, #7c3aed 100%)", border: "none", borderRadius: 12, color: "white", fontSize: 14, fontWeight: 750, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: 6, boxShadow: "0 4px 15px rgba(6, 182, 212, 0.2)" }}
                >
                  {savingUser ? <div className="spinner" style={{ width: 14, height: 14 }} /> : "✓ Apply & Save Changes"}
                </button>

                <div style={{ display: "flex", gap: 10 }}>
                  {/* Resend credentials button */}
                  <button
                    type="button"
                    onClick={() => { resendCredentials(selectedUser.id); setSelectedUser(null); }}
                    style={{ flex: 1, minHeight: 40, background: "rgba(6, 182, 212, 0.08)", border: "1px solid rgba(6, 182, 212, 0.2)", borderRadius: 10, color: "#06b6d4", fontSize: 13, fontWeight: 700, cursor: "pointer" }}
                  >
                    🔑 Resend Mail
                  </button>

                  {/* Terminate Access Button */}
                  <button
                    type="button"
                    onClick={handleTerminateUser}
                    style={{ flex: 1, minHeight: 40, background: "rgba(239, 68, 68, 0.08)", border: "1px solid rgba(239, 68, 68, 0.2)", borderRadius: 10, color: "#fca5a5", fontSize: 13, fontWeight: 700, cursor: "pointer" }}
                  >
                    🚫 Terminate
                  </button>
                </div>
              </div>

            </form>
          </div>
        </div>
      )}

      {/* Toast */}
      {toast && (
        <div style={{ position: "fixed", bottom: 24, left: 16, right: 16, background: "#1e293b", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 14, padding: "14px 18px", fontSize: 14, fontWeight: 600, color: "#f1f5f9", zIndex: 10000, textAlign: "center", boxShadow: "0 8px 32px rgba(0,0,0,0.5)", animation: "fadeIn 0.3s ease" }}>
          {toast}
        </div>
      )}
    </div>
  );
}


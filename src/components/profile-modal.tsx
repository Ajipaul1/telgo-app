"use client";
import { useState, useEffect } from "react";

export type ProfileUser = {
  userId: string;
  email: string | null;
  fullName: string;
  role: string;
  loginId: string;
};

export const AVATAR_PRESETS = [
  { id: "teal", label: "Teal Glow", grad: "linear-gradient(135deg, #06b6d4, #0891b2)", bg: "#06b6d4", text: "#ffffff" },
  { id: "purple", label: "Amethyst Glow", grad: "linear-gradient(135deg, #7c3aed, #6d28d9)", bg: "#7c3aed", text: "#ffffff" },
  { id: "rose", label: "Sunset Rose", grad: "linear-gradient(135deg, #f43f5e, #be123c)", bg: "#f43f5e", text: "#ffffff" },
  { id: "emerald", label: "Jungle Green", grad: "linear-gradient(135deg, #10b981, #047857)", bg: "#10b981", text: "#ffffff" },
  { id: "amber", label: "Warm Amber", grad: "linear-gradient(135deg, #f59e0b, #b45309)", bg: "#f59e0b", text: "#060912" },
  { id: "slate", label: "Electric Slate", grad: "linear-gradient(135deg, #475569, #1e293b)", bg: "#475569", text: "#ffffff" },
];

export function getAvatarTheme(presetId: string) {
  return AVATAR_PRESETS.find(p => p.id === presetId) ?? AVATAR_PRESETS[0];
}

interface ProfileModalProps {
  isOpen: boolean;
  onClose: () => void;
  user: ProfileUser | null;
  onUpdate: (updatedUser: ProfileUser) => void;
}

export function ProfileModal({ isOpen, onClose, user, onUpdate }: ProfileModalProps) {
  const [fullName, setFullName] = useState("");
  const [selectedAvatar, setSelectedAvatar] = useState("teal");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [isSuccess, setIsSuccess] = useState(false);

  useEffect(() => {
    if (user) {
      setFullName(user.fullName);
      // Load saved avatar preset from local storage
      const savedPreset = localStorage.getItem(`telgo_avatar_${user.userId}`);
      if (savedPreset) {
        setSelectedAvatar(savedPreset);
      }
    }
  }, [user, isOpen]);

  if (!isOpen || !user) return null;

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    if (!fullName.trim()) {
      setMessage("Full Name is required.");
      setIsSuccess(false);
      return;
    }

    setLoading(true);
    setMessage("");

    try {
      const response = await fetch("/api/mobile/profile/update", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ fullName: fullName.trim(), avatarUrl: selectedAvatar }),
      });

      const data = await response.json();

      if (response.ok && data.ok) {
        // Save avatar locally
        localStorage.setItem(`telgo_avatar_${user.userId}`, selectedAvatar);
        
        onUpdate({
          ...user,
          fullName: fullName.trim(),
        });

        setIsSuccess(true);
        setMessage("✅ Profile updated successfully!");
        setTimeout(() => {
          setMessage("");
          onClose();
        }, 1500);
      } else {
        setIsSuccess(false);
        setMessage("❌ " + (data.message || "Failed to update profile."));
      }
    } catch {
      setIsSuccess(false);
      setMessage("❌ Connection error. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  const currentTheme = getAvatarTheme(selectedAvatar);

  return (
    <div style={{
      position: "fixed",
      inset: 0,
      background: "rgba(6, 9, 18, 0.85)",
      backdropFilter: "blur(12px)",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      padding: 20,
      zIndex: 9999,
      fontFamily: "Outfit, sans-serif"
    }}>
      <div className="glass fade-in" style={{
        width: "100%",
        maxWidth: 420,
        background: "linear-gradient(135deg, #0f082e 0%, #060912 100%)",
        border: "1px solid rgba(255, 255, 255, 0.08)",
        borderRadius: 24,
        padding: "28px 24px",
        boxShadow: "0 24px 64px rgba(0, 0, 0, 0.7)",
        color: "#f1f5f9"
      }}>
        {/* Header */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 20 }}>
          <h3 style={{ fontSize: 18, fontWeight: 900, letterSpacing: "-0.02em", margin: 0 }}>Account Settings</h3>
          <button onClick={onClose} style={{
            background: "rgba(255, 255, 255, 0.04)",
            border: "1px solid rgba(255, 255, 255, 0.08)",
            width: 32,
            height: 32,
            borderRadius: "50%",
            color: "#94a3b8",
            cursor: "pointer",
            display: "flex",
            alignItems: "center",
            justifyContent: "center"
          }}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
          </button>
        </div>

        {/* Live Avatar Preview */}
        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", marginBottom: 24 }}>
          <div style={{
            width: 80,
            height: 80,
            borderRadius: "50%",
            background: currentTheme.grad,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            color: currentTheme.text,
            fontSize: 32,
            fontWeight: 800,
            boxShadow: `0 8px 24px ${currentTheme.bg}40`,
            border: "2px solid rgba(255,255,255,0.15)",
            textTransform: "uppercase",
            marginBottom: 12
          }}>
            {fullName ? fullName.charAt(0) : user.fullName.charAt(0)}
          </div>
          <span style={{ fontSize: 12, fontWeight: 700, color: "#64748b", textTransform: "uppercase", letterSpacing: "0.05em" }}>Profile Preview</span>
        </div>

        <form onSubmit={handleSave} style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          {/* Avatar Theme Selection */}
          <div>
            <label style={{ display: "block", fontSize: 12, fontWeight: 700, color: "#94a3b8", marginBottom: 8, textTransform: "uppercase", letterSpacing: "0.03em" }}>Profile Color Theme</label>
            <div style={{ display: "flex", gap: 8, justifyContent: "space-between" }}>
              {AVATAR_PRESETS.map((preset) => (
                <button
                  key={preset.id}
                  type="button"
                  onClick={() => setSelectedAvatar(preset.id)}
                  style={{
                    width: 38,
                    height: 38,
                    borderRadius: "50%",
                    background: preset.grad,
                    border: selectedAvatar === preset.id ? "3px solid #ffffff" : "2px solid rgba(255, 255, 255, 0.05)",
                    cursor: "pointer",
                    boxShadow: selectedAvatar === preset.id ? `0 0 14px ${preset.bg}80` : "none",
                    transform: selectedAvatar === preset.id ? "scale(1.1)" : "scale(1)",
                    transition: "all 0.2s ease"
                  }}
                  title={preset.label}
                />
              ))}
            </div>
          </div>

          {/* Full Name */}
          <div>
            <label style={{ display: "block", fontSize: 12, fontWeight: 700, color: "#94a3b8", marginBottom: 8, textTransform: "uppercase", letterSpacing: "0.03em" }}>Display Name</label>
            <input
              type="text"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              placeholder="Enter your name"
              className="input-base"
              required
              style={{
                width: "100%",
                height: 46,
                background: "rgba(0, 0, 0, 0.3)",
                border: "1px solid rgba(255, 255, 255, 0.08)",
                borderRadius: 12,
                padding: "0 14px",
                color: "#f1f5f9",
                fontSize: 14,
                outline: "none",
                fontFamily: "Outfit, sans-serif"
              }}
            />
          </div>

          {/* Email (Read Only) */}
          <div>
            <label style={{ display: "block", fontSize: 12, fontWeight: 700, color: "#475569", marginBottom: 8, textTransform: "uppercase", letterSpacing: "0.03em" }}>Email (Operational Identifier)</label>
            <input
              type="email"
              value={user.email || ""}
              disabled
              style={{
                width: "100%",
                height: 46,
                background: "rgba(255, 255, 255, 0.02)",
                border: "1px solid rgba(255, 255, 255, 0.04)",
                borderRadius: 12,
                padding: "0 14px",
                color: "#64748b",
                fontSize: 14,
                fontFamily: "monospace",
                cursor: "not-allowed"
              }}
            />
          </div>

          {/* Key Identifiers */}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
            <div>
              <span style={{ fontSize: 10, color: "#475569", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.05em" }}>Operational Role</span>
              <p style={{ margin: "4px 0 0", fontSize: 13, fontWeight: 800, color: "#06b6d4", textTransform: "uppercase" }}>{user.role}</p>
            </div>
            <div>
              <span style={{ fontSize: 10, color: "#475569", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.05em" }}>Unique Login ID</span>
              <p style={{ margin: "4px 0 0", fontSize: 13, fontWeight: 700, fontFamily: "monospace", color: "#94a3b8" }}>{user.loginId}</p>
            </div>
          </div>

          {/* Message Notification */}
          {message && (
            <div style={{
              background: isSuccess ? "rgba(34, 197, 94, 0.08)" : "rgba(239, 68, 68, 0.08)",
              border: isSuccess ? "1px solid rgba(34, 197, 94, 0.2)" : "1px solid rgba(239, 68, 68, 0.2)",
              borderRadius: 12,
              padding: "10px 14px",
              fontSize: 13,
              color: isSuccess ? "#86efac" : "#fca5a5",
              textAlign: "left"
            }}>
              {message}
            </div>
          )}

          {/* Action Button */}
          <button
            type="submit"
            disabled={loading}
            style={{
              minHeight: 46,
              background: "linear-gradient(135deg, #06b6d4 0%, #7c3aed 100%)",
              border: "none",
              borderRadius: 12,
              color: "white",
              fontSize: 14,
              fontWeight: 700,
              cursor: loading ? "not-allowed" : "pointer",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: 8,
              boxShadow: "0 4px 15px rgba(6, 182, 212, 0.2)",
              marginTop: 8
            }}
          >
            {loading ? <div className="spinner" style={{ width: 16, height: 16 }} /> : "Save Profile Settings"}
          </button>
        </form>
      </div>
    </div>
  );
}

// Custom topbar profile avatar button component
interface ProfileHeaderWidgetProps {
  user: ProfileUser | null;
  onOpenSettings: () => void;
  dashboardTitle: string;
}

export function ProfileHeaderWidget({ user, onOpenSettings, dashboardTitle }: ProfileHeaderWidgetProps) {
  const [avatar, setAvatar] = useState("teal");

  useEffect(() => {
    if (user) {
      const savedPreset = localStorage.getItem(`telgo_avatar_${user.userId}`);
      if (savedPreset) {
        setAvatar(savedPreset);
      }
    }
  }, [user]);

  if (!user) return null;

  const currentTheme = getAvatarTheme(avatar);

  return (
    <div style={{
      width: "100%",
      display: "flex",
      alignItems: "center",
      justifyContent: "space-between",
      padding: "16px 20px",
      background: "rgba(6, 9, 18, 0.6)",
      backdropFilter: "blur(10px)",
      borderBottom: "1px solid rgba(255, 255, 255, 0.05)",
      position: "sticky",
      top: 0,
      zIndex: 100,
      boxSizing: "border-box"
    }}>
      <div>
        <p style={{ fontSize: 10, fontWeight: 800, color: "#06b6d4", letterSpacing: "0.15em", textTransform: "uppercase", margin: 0 }}>Telgo Operations</p>
        <h1 style={{ fontSize: 18, fontWeight: 900, color: "#f1f5f9", margin: "2px 0 0", letterSpacing: "-0.5px" }}>{dashboardTitle}</h1>
      </div>
      
      {/* Profile Button */}
      <button 
        onClick={onOpenSettings}
        style={{
          background: "none",
          border: "none",
          cursor: "pointer",
          display: "flex",
          alignItems: "center",
          gap: 10,
          padding: 0,
          outline: "none"
        }}
      >
        <div style={{ textAlign: "right", display: "none" /* can show on desktop if needed */ }}>
          <p style={{ fontSize: 13, fontWeight: 700, color: "#f1f5f9", margin: 0 }}>{user.fullName}</p>
          <p style={{ fontSize: 10, fontWeight: 600, color: "#64748b", margin: 0, textTransform: "capitalize" }}>{user.role}</p>
        </div>
        <div style={{
          width: 38,
          height: 38,
          borderRadius: "50%",
          background: currentTheme.grad,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          color: currentTheme.text,
          fontSize: 15,
          fontWeight: 800,
          border: "1px solid rgba(255,255,255,0.1)",
          boxShadow: `0 4px 10px ${currentTheme.bg}25`,
          textTransform: "uppercase"
        }}>
          {user.fullName.charAt(0)}
        </div>
      </button>
    </div>
  );
}

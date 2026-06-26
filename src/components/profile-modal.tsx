"use client";
import { useState, useEffect } from "react";

export type ProfileUser = {
  userId: string;
  email: string | null;
  fullName: string;
  role: string;
  loginId: string;
  avatarUrl?: string | null;
  phone?: string | null;
};

interface ProfileModalProps {
  isOpen: boolean;
  onClose: () => void;
  user: any;
  onUpdate: (updatedUser: any) => void;
}

export function ProfileModal({ isOpen, onClose, user, onUpdate }: ProfileModalProps) {
  const [fullName, setFullName] = useState("");
  const [phone, setPhone] = useState("");
  const [avatarUrl, setAvatarUrl] = useState("");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [isSuccess, setIsSuccess] = useState(false);

  useEffect(() => {
    if (user) {
      setFullName(user.fullName || user.full_name || "");
      setPhone(user.phone || "");
      setAvatarUrl(user.avatarUrl || user.avatar_url || "");
    }
  }, [user, isOpen]);

  if (!isOpen || !user) return null;

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement("canvas");
        canvas.width = 128;
        canvas.height = 128;
        const ctx = canvas.getContext("2d");
        if (ctx) {
          // Circular framing and center cropping
          const size = Math.min(img.width, img.height);
          const sx = (img.width - size) / 2;
          const sy = (img.height - size) / 2;

          // Draw image cropped
          ctx.drawImage(img, sx, sy, size, size, 0, 0, 128, 128);
          const base64 = canvas.toDataURL("image/jpeg", 0.85);
          setAvatarUrl(base64);
        }
      };
      img.src = event.target?.result as string;
    };
    reader.readAsDataURL(file);
  };

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    const currentUser = user;
    if (!currentUser) return;

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
        body: JSON.stringify({ 
          fullName: fullName.trim(), 
          avatarUrl: avatarUrl,
          phone: phone.trim()
        }),
      });

      const data = await response.json();

      if (response.ok && data.ok) {
        onUpdate({
          ...currentUser,
          fullName: fullName.trim(),
          fullNameRaw: fullName.trim(),
          full_name: fullName.trim(),
          avatarUrl: avatarUrl,
          avatar_url: avatarUrl,
          phone: phone.trim()
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

  const hasPhoto = avatarUrl && avatarUrl.startsWith("data:image/");

  return (
    <div style={{
      position: "fixed",
      inset: 0,
      background: "rgba(15, 23, 42, 0.3)",
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
        background: "linear-gradient(135deg, #ffffff 0%, #f8fafc 100%)",
        border: "1px solid var(--border)",
        borderRadius: 24,
        padding: "28px 24px",
        boxShadow: "0 8px 32px rgba(15, 23, 42, 0.06)",
        color: "var(--text)"
      }}>
        {/* Header */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 20 }}>
          <h3 style={{ fontSize: 18, fontWeight: 900, letterSpacing: "-0.02em", margin: 0 }}>Account Settings</h3>
          <button onClick={onClose} style={{
            background: "var(--surface)",
            border: "1px solid var(--border)",
            width: 32,
            height: 32,
            borderRadius: "50%",
            color: "var(--muted)",
            cursor: "pointer",
            display: "flex",
            alignItems: "center",
            justifyContent: "center"
          }}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
          </button>
        </div>

        {/* Live Photo Upload Section */}
        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", marginBottom: 24 }}>
          <div style={{ position: "relative" }}>
            <div style={{
              width: 84,
              height: 84,
              borderRadius: "50%",
              background: hasPhoto ? "none" : "linear-gradient(135deg, #06b6d4 0%, #7c3aed 100%)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              color: "white",
              fontSize: 32,
              fontWeight: 800,
              boxShadow: `0 8px 24px rgba(6, 182, 212, 0.2)`,
              border: "2px solid var(--border)",
              textTransform: "uppercase",
              overflow: "hidden"
            }}>
              {hasPhoto ? (
                <img src={avatarUrl} alt="Avatar" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
              ) : (
                fullName ? fullName.charAt(0) : "U"
              )}
            </div>
            
            <label htmlFor="profile-upload-file" style={{
              position: "absolute",
              bottom: 0,
              right: 0,
              background: "var(--violet)",
              border: "2px solid white",
              width: 28,
              height: 28,
              borderRadius: "50%",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              cursor: "pointer",
              boxShadow: "0 2px 8px rgba(0,0,0,0.15)"
            }}>
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"/><circle cx="12" cy="13" r="4"/></svg>
            </label>
            <input 
              type="file" 
              id="profile-upload-file" 
              accept="image/*" 
              onChange={handleFileChange} 
              style={{ display: "none" }} 
            />
          </div>
          <span style={{ fontSize: 11, fontWeight: 700, color: "var(--dim)", textTransform: "uppercase", letterSpacing: "0.05em", marginTop: 10 }}>Tap camera to upload</span>
        </div>

        <form onSubmit={handleSave} style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          {/* Display Name */}
          <div>
            <label style={{ display: "block", fontSize: 12, fontWeight: 700, color: "var(--muted)", marginBottom: 8, textTransform: "uppercase", letterSpacing: "0.03em" }}>Display Name</label>
            <input
              type="text"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              placeholder="Enter your name"
              required
              style={{
                width: "100%",
                height: 46,
                background: "var(--surface)",
                border: "1px solid var(--border)",
                borderRadius: 12,
                padding: "0 14px",
                color: "var(--text)",
                fontSize: 14,
                outline: "none",
                fontFamily: "Outfit, sans-serif",
                boxSizing: "border-box"
              }}
            />
          </div>

          {/* Email (Read Only) */}
          <div>
            <label style={{ display: "block", fontSize: 12, fontWeight: 700, color: "var(--muted)", marginBottom: 8, textTransform: "uppercase", letterSpacing: "0.03em" }}>Email (Operational Identifier)</label>
            <input
              type="email"
              value={user.email || ""}
              disabled
              style={{
                width: "100%",
                height: 46,
                background: "var(--surface)",
                border: "1px solid var(--border)",
                borderRadius: 12,
                padding: "0 14px",
                color: "var(--dim)",
                fontSize: 14,
                fontFamily: "monospace",
                cursor: "not-allowed",
                boxSizing: "border-box"
              }}
            />
          </div>

          {/* Phone Number */}
          <div>
            <label style={{ display: "block", fontSize: 12, fontWeight: 700, color: "var(--muted)", marginBottom: 8, textTransform: "uppercase", letterSpacing: "0.03em" }}>Phone Number</label>
            <input
              type="tel"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="Enter phone number"
              style={{
                width: "100%",
                height: 46,
                background: "var(--surface)",
                border: "1px solid var(--border)",
                borderRadius: 12,
                padding: "0 14px",
                color: "var(--text)",
                fontSize: 14,
                outline: "none",
                fontFamily: "Outfit, sans-serif",
                boxSizing: "border-box"
              }}
            />
          </div>

          {/* Key Identifiers */}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
            <div>
              <span style={{ fontSize: 10, color: "var(--muted)", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.05em" }}>Operational Role</span>
              <p style={{ margin: "4px 0 0", fontSize: 13, fontWeight: 800, color: "#06b6d4", textTransform: "uppercase" }}>{user.role}</p>
            </div>
            <div>
              <span style={{ fontSize: 10, color: "var(--muted)", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.05em" }}>Unique Login ID</span>
              <p style={{ margin: "4px 0 0", fontSize: 13, fontWeight: 700, fontFamily: "monospace", color: "var(--muted)" }}>{user.loginId || user.login_id}</p>
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
  user: any;
  onOpenSettings: () => void;
  dashboardTitle: string;
}

export function ProfileHeaderWidget({ user, onOpenSettings, dashboardTitle }: ProfileHeaderWidgetProps) {
  if (!user) return null;

  const avatar = user.avatarUrl || user.avatar_url || "";
  const hasPhoto = avatar && avatar.startsWith("data:image/");

  return (
    <div style={{
      width: "100%",
      display: "flex",
      alignItems: "center",
      justifyContent: "space-between",
      padding: "16px 20px",
      background: "rgba(255, 255, 255, 0.8)",
      backdropFilter: "blur(10px)",
      borderBottom: "1px solid var(--border)",
      position: "sticky",
      top: 0,
      zIndex: 100,
      boxSizing: "border-box"
    }}>
      <div>
        <p style={{ fontSize: 10, fontWeight: 800, color: "#06b6d4", letterSpacing: "0.15em", textTransform: "uppercase", margin: 0 }}>Telgo Operations</p>
        <h1 style={{ fontSize: 18, fontWeight: 900, color: "var(--text)", margin: "2px 0 0", letterSpacing: "-0.5px" }}>{dashboardTitle}</h1>
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
        <div style={{ textAlign: "right", display: "none" }}>
          <p style={{ fontSize: 13, fontWeight: 700, color: "var(--text)", margin: 0 }}>{user.fullName}</p>
          <p style={{ fontSize: 10, fontWeight: 600, color: "var(--dim)", margin: 0, textTransform: "capitalize" }}>{user.role}</p>
        </div>
        <div style={{
          width: 38,
          height: 38,
          borderRadius: "50%",
          background: hasPhoto ? "none" : "linear-gradient(135deg, #06b6d4 0%, #7c3aed 100%)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          color: "white",
          fontSize: 15,
          fontWeight: 800,
          border: "1px solid var(--border)",
          boxShadow: `0 4px 10px rgba(6, 182, 212, 0.25)`,
          textTransform: "uppercase",
          overflow: "hidden"
        }}>
          {hasPhoto ? (
            <img src={avatar} alt="Avatar" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
          ) : (
            (user.fullName || user.full_name || "U").charAt(0)
          )}
        </div>
      </button>
    </div>
  );
}

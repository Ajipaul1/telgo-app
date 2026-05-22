"use client";
import { useEffect, useState } from "react";

export default function FinanceDashboard() {
  const [user, setUser] = useState<{fullName:string;email:string;role:string}|null>(null);
  useEffect(() => {
    fetch("/api/mobile/me").then(r=>r.json()).then(d=>{ if(d.ok) setUser(d.user); else window.location.href="/login"; });
  }, []);
  return (
    <div style={{ minHeight:"100dvh", background:"#060912", display:"flex", flexDirection:"column", alignItems:"center", justifyContent:"center", padding:"24px" }}>
      <div className="glass fade-in" style={{ width:"100%", maxWidth:420, padding:"36px 28px", textAlign:"center" }}>
        <div style={{ width:64, height:64, borderRadius:"50%", background:"linear-gradient(135deg,#ca8a04,#facc15)", display:"flex", alignItems:"center", justifyContent:"center", margin:"0 auto 20px" }}>
          <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M12 2v20"/><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/></svg>
        </div>
        <h2 style={{ fontSize:22, fontWeight:800, color:"#f1f5f9", marginBottom:8 }}>Welcome, {user?.fullName ?? "Finance"}!</h2>
        <p style={{ fontSize:13, color:"#64748b", marginBottom:6 }}>{user?.email}</p>
        <span style={{ display:"inline-block", background:"rgba(250,204,21,0.15)", color:"#fcd34d", border:"1px solid rgba(250,204,21,0.25)", borderRadius:8, padding:"4px 14px", fontSize:12, fontWeight:700, textTransform:"uppercase", marginBottom:28 }}>Finance</span>
        <p style={{ fontSize:14, color:"#475569", marginBottom:32 }}>The financial reporting and approvals module is under construction.</p>
        <button onClick={async()=>{ await fetch("/api/mobile/sign-out",{method:"POST"}); window.location.href="/login"; }} style={{ width:"100%", minHeight:44, background:"transparent", border:"1px solid rgba(239,68,68,0.2)", borderRadius:12, color:"#f87171", fontSize:14, fontWeight:600, cursor:"pointer", fontFamily:"Outfit,sans-serif" }}>Sign Out</button>
      </div>
    </div>
  );
}

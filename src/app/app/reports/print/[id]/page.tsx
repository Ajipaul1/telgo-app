"use client";
import { use } from "react";
import { Screen } from "@/components/Screen";
import { Loaded, Button, Empty } from "@/components/ui";
import { useLoad } from "@/lib/client/hooks";
import { fmtDayLong, numIN } from "@/lib/shared/format";
import { hddFromRods, type ReportView } from "@/lib/shared/report";
import type { ProjectView } from "@/lib/shared/project";

// The HDD drilling log sheet, for printing or saving as PDF: only what the report holds.
export default function HddSheet({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const rep = useLoad<{ report: ReportView }>(`/api/reports/${id}`);
  const pid = rep.data?.report.projectId;
  const proj = useLoad<{ project: ProjectView }>(pid && rep.data?.report.projectName ? `/api/projects/${encodeURIComponent(pid)}` : null);
  return (
    <Screen title="HDD sheet" roles={["admin", "finance", "supervisor", "engineer"]} testId="hdd-sheet">
      <Loaded load={rep}>
        {({ report: r }) => {
          const h = r.body.hdd;
          if (!h) return <Empty title="This report has no HDD part" />;
          const hddWork = r.body.work.find((w) => w.key === "hdd");
          const route = hddWork?.route ?? [];
          const L = h.rodLengthM;
          const depths = h.rods.map((x) => Number(String(x.depth).replace(",", ".")));
          const deepest = depths.filter((x) => Number.isFinite(x)).reduce((a, b) => Math.max(a, b), 0);
          const W = 700, H = 220;
          const maxX = Math.max((h.rods.length || 1) * (L ?? 1), 1), maxY = Math.max(deepest, 1);
          const px = (x: number) => 50 + (x / maxX) * (W - 70), py = (y: number) => 20 + (y / maxY) * (H - 50);
          const pts = [[0, 0], ...h.rods.map((x, i) => [(i + 1) * (L ?? 1), Number(String(x.depth).replace(",", ".")) || 0])];
          const project = proj.data?.project;
          const cell = { border: "1px solid #9aa0bf", padding: "4px 6px", fontSize: 12 } as const;
          return (
            <div style={{ background: "#fff", padding: 14, borderRadius: 12 }} data-testid="hdd-sheet-page">
              <div className="no-print btn-row" style={{ marginBottom: 12 }}><Button onClick={() => window.print()}>Print or save as PDF</Button></div>
              <div className="row between" style={{ borderBottom: "3px solid #270869", paddingBottom: 8, marginBottom: 10 }}>
                <img src="/brand/telgo-logo.png" alt="Telgo Power Projects" style={{ width: 210 }} />
                <div style={{ textAlign: "right" }}><b style={{ fontFamily: "var(--font-head)", color: "#270869", fontSize: 18 }}>HDD drilling log</b><div className="tiny">Report {r.id.slice(0, 8).toUpperCase()}</div></div>
              </div>
              <table style={{ width: "100%", borderCollapse: "collapse", marginBottom: 10 }}>
                <tbody>
                  <tr><td style={cell}><b>Project</b></td><td style={cell}>{r.projectName ?? r.projectId}</td><td style={cell}><b>Date</b></td><td style={cell}>{fmtDayLong(r.reportDate)}</td></tr>
                  <tr><td style={cell}><b>Client</b></td><td style={cell}>{project?.client ?? "not recorded"}</td><td style={cell}><b>Supervisor</b></td><td style={cell}>{r.supervisorName}</td></tr>
                  <tr><td style={cell}><b>Machine</b></td><td style={cell}>{h.machine || "not recorded"}</td><td style={cell}><b>Vendor</b></td><td style={cell}>{h.vendor || "not recorded"}</td></tr>
                  <tr><td style={cell}><b>Tracker / surveyor</b></td><td style={cell}>{h.tracker || "not recorded"}</td><td style={cell}><b>Operator</b></td><td style={cell}>{h.operator || "not recorded"}</td></tr>
                  <tr><td style={cell}><b>Ducts / colour</b></td><td style={cell}>{h.ducts || "not recorded"}</td><td style={cell}><b>Rod length</b></td><td style={cell}>{L ? `${numIN(L)} m` : "not recorded"}</td></tr>
                  <tr><td style={cell}><b>Rods</b></td><td style={cell}>{h.rods.length}</td><td style={cell}><b>Length drilled</b></td><td style={cell}>{L ? `${numIN(hddFromRods(h))} m` : r.summary.hdd ? `${numIN(r.summary.hdd)} m (as entered)` : "not recorded"}</td></tr>
                  <tr><td style={cell}><b>Entry point</b></td><td style={cell}>{route[0] ? `${route[0][0].toFixed(6)}, ${route[0][1].toFixed(6)}` : "not recorded"}</td><td style={cell}><b>Exit point</b></td><td style={cell}>{route.length > 1 ? `${route[route.length - 1][0].toFixed(6)}, ${route[route.length - 1][1].toFixed(6)}` : "not recorded"}</td></tr>
                  <tr><td style={cell}><b>Deepest</b></td><td style={cell}>{deepest ? `${numIN(deepest)} m` : "not recorded"}</td><td style={cell}><b>Status</b></td><td style={cell}>{r.status === "approved" ? `Approved${r.approvedByName ? ` by ${r.approvedByName}` : ""}` : "Not approved yet"}</td></tr>
                </tbody>
              </table>
              {h.rods.length > 1 && L && (
                <svg viewBox={`0 0 ${W} ${H}`} style={{ width: "100%", border: "1px solid #9aa0bf", marginBottom: 10 }} role="img" aria-label="Bore profile">
                  <line x1="50" y1="20" x2={W - 20} y2="20" stroke="#5e6283" strokeDasharray="5 5" />
                  <text x="6" y="24" fontSize="11">0 m</text>
                  <text x="6" y={py(maxY) + 4} fontSize="11">{numIN(maxY, 1)} m</text>
                  {Array.from({ length: 6 }, (_, i) => { const x = (maxX / 5) * i; return <text key={i} x={px(x)} y={H - 8} fontSize="10" textAnchor="middle">{numIN(x, 0)} m</text>; })}
                  <polyline fill="none" stroke="#270869" strokeWidth="2.5" points={pts.map(([x, y]) => `${px(x)},${py(y)}`).join(" ")} />
                </svg>
              )}
              <table style={{ width: "100%", borderCollapse: "collapse" }}>
                <thead><tr>{["Rod", "At (m)", "Pitch (%)", "Depth (m)", "Soil", "Crossing"].map((t) => <th key={t} style={{ ...cell, background: "#eef0fa", textAlign: "left" }}>{t}</th>)}</tr></thead>
                <tbody>
                  {h.rods.map((x, i) => (
                    <tr key={x.no}><td style={cell}>{x.no}</td><td style={cell}>{L ? numIN((i + 1) * L) : "—"}</td><td style={cell}>{x.pitch || "—"}</td><td style={cell}>{x.depth || "—"}</td><td style={cell}>{x.strata || "—"}</td><td style={cell}>{x.crossing || ""}</td></tr>
                  ))}
                </tbody>
              </table>
              <div className="grid3" style={{ marginTop: 28 }}>
                {[["Supervisor", r.supervisorName], ["Telgo engineer", ""], ["Client representative", ""]].map(([role, name]) => (
                  <div key={role} style={{ borderTop: "1px solid #16123a", paddingTop: 6, fontSize: 12 }}><b>{role}</b><div>{name || " "}</div><div className="tiny muted">Signature and date</div></div>
                ))}
              </div>
              <p className="tiny muted" style={{ marginTop: 14 }}>Made by the Telgo app from the report of {fmtDayLong(r.reportDate)}. Only values recorded in the report are printed.</p>
            </div>
          );
        }}
      </Loaded>
    </Screen>
  );
}

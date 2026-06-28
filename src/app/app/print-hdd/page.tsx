"use client";
import { useEffect, useState, useRef } from "react";
import { useSearchParams } from "next/navigation";

type RodLog = {
  rodNo: number;
  pitch: number;
  depth: number;
  strata: string;
  crossing: string;
};

type ReportData = {
  id: string;
  reportDate: string;
  projectId: string;
  supervisorName: string;
  hddLength: number;
  hddDrillingLogs: RodLog[];
  hddMetadata: {
    hddMachineName?: string;
    hddVendorName?: string;
    hddTrackerName?: string;
    hddOperatorName?: string;
    hddDuctsInfo?: string;
    hddRodLengthM?: number | string;
  };
};

type ProjectData = {
  id: string;
  name: string;
  code: string;
  district: string;
  location?: string;
  description: string;
  startLabel: string;
  startCoords: [number, number];
  endLabel: string;
  endCoords: [number, number];
  hddDefaultMachineName?: string;
  hddDefaultVendorName?: string;
  hddDefaultTrackerName?: string;
  hddDefaultOperatorName?: string;
  hddDefaultDuctsInfo?: string;
  hddDefaultRodLengthM?: number | string;
  middlePoints?: [number, number][];
  utilityPath?: [number, number][];
};

export default function PrintHddLogSheet() {
  const searchParams = useSearchParams();
  const reportId = searchParams.get("reportId") || "";

  const [report, setReport] = useState<ReportData | null>(null);
  const [project, setProject] = useState<ProjectData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    if (!reportId) {
      setError("Missing reportId parameter");
      setLoading(false);
      return;
    }

    const fetchData = async () => {
      try {
        // Fetch report
        const repRes = await fetch(`/api/mobile/daily-reports?reportId=${reportId}`);
        const repData = await repRes.json();
        if (!repRes.ok || !repData.ok || !repData.report) {
          throw new Error(repData.message || "Failed to load daily report");
        }
        setReport(repData.report);

        // Fetch project
        const projRes = await fetch("/api/mobile/projects");
        const projData = await projRes.json();
        if (projRes.ok && projData.ok && projData.projects) {
          const matched = projData.projects.find((p: ProjectData) => p.id === repData.report.projectId);
          if (matched) {
            setProject(matched);
          }
        }
      } catch (err: any) {
        setError(err.message || "An error occurred while loading data");
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [reportId]);

  // Canvas plotter effect
  useEffect(() => {
    if (!report || !canvasRef.current) return;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const width = canvas.width;
    const height = canvas.height;

    // Clear and draw grid
    ctx.clearRect(0, 0, width, height);
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, width, height);

    const marginLeft = 40;
    const marginRight = 15;
    const marginTop = 15;
    const marginBottom = 20;

    const plotWidth = width - marginLeft - marginRight;
    const plotHeight = height - marginTop - marginBottom;

    // Draw grid lines (1mm like engineering paper)
    ctx.strokeStyle = "#cbd5e1";
    ctx.lineWidth = 0.5;
    
    // Vertical grid
    const cols = 20;
    for (let i = 0; i <= cols; i++) {
      const x = marginLeft + (i * plotWidth) / cols;
      ctx.beginPath();
      ctx.moveTo(x, marginTop);
      ctx.lineTo(x, marginTop + plotHeight);
      ctx.stroke();
    }

    // Horizontal grid
    const rows = 10;
    for (let i = 0; i <= rows; i++) {
      const y = marginTop + (i * plotHeight) / rows;
      ctx.beginPath();
      ctx.moveTo(marginLeft, y);
      ctx.lineTo(marginLeft + plotWidth, y);
      ctx.stroke();
    }

    // Draw main axes
    ctx.strokeStyle = "#1e293b";
    ctx.lineWidth = 1.2;
    ctx.beginPath();
    ctx.moveTo(marginLeft, marginTop);
    ctx.lineTo(marginLeft + plotWidth, marginTop);
    ctx.moveTo(marginLeft, marginTop);
    ctx.lineTo(marginLeft, marginTop + plotHeight);
    ctx.stroke();

    const logs = report.hddDrillingLogs || [];
    const rodLength = Number(report.hddMetadata?.hddRodLengthM || project?.hddDefaultRodLengthM || 3.0);

    if (logs.length === 0) {
      ctx.fillStyle = "#94a3b8";
      ctx.font = "italic 11px system-ui";
      ctx.textAlign = "center";
      ctx.fillText("No rod logs entered.", width / 2 + 10, height / 2 + 10);
      ctx.textAlign = "left";
      return;
    }

    // Map logs to points
    const points = logs.map((log, index) => {
      const dist = (index + 1) * rodLength;
      const depth = Number(log.depth || 0);
      return { dist, depth, rodNo: index + 1, crossing: log.crossing };
    });

    const maxDist = Math.max(50, ...points.map((p: any) => p.dist));
    const maxDepth = Math.max(6, ...points.map((p: any) => p.depth));

    const axisMaxDist = Math.ceil(maxDist / 10) * 10;
    const axisMaxDepth = Math.ceil(maxDepth / 2) * 2;

    // Draw X-axis ticks (Distance)
    ctx.fillStyle = "#334155";
    ctx.font = "bold 8px monospace";
    ctx.textAlign = "center";
    for (let i = 0; i <= 5; i++) {
      const val = (axisMaxDist * i) / 5;
      const x = marginLeft + (val / axisMaxDist) * plotWidth;
      ctx.fillText(val.toFixed(0) + "m", x, marginTop + plotHeight + 12);
    }

    // Draw Y-axis ticks (Depth - Downward)
    ctx.textAlign = "right";
    for (let i = 0; i <= 4; i++) {
      const val = (axisMaxDepth * i) / 4;
      const y = marginTop + (val / axisMaxDepth) * plotHeight;
      ctx.fillText(val.toFixed(1) + "m", marginLeft - 5, y + 3);
    }
    ctx.textAlign = "left";

    // Plot path line
    ctx.strokeStyle = "#2563eb";
    ctx.lineWidth = 2.0;
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    ctx.beginPath();
    ctx.moveTo(marginLeft, marginTop);

    points.forEach((p: any) => {
      const x = marginLeft + (p.dist / axisMaxDist) * plotWidth;
      const y = marginTop + (p.depth / axisMaxDepth) * plotHeight;
      ctx.lineTo(x, y);
    });
    ctx.stroke();

    // Draw markers
    points.forEach((p: any) => {
      const x = marginLeft + (p.dist / axisMaxDist) * plotWidth;
      const y = marginTop + (p.depth / axisMaxDepth) * plotHeight;

      ctx.fillStyle = "#ffffff";
      ctx.strokeStyle = "#2563eb";
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.arc(x, y, 3, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();

      // Label rod number
      ctx.fillStyle = "#1e293b";
      ctx.font = "6px monospace";
      ctx.fillText(p.rodNo.toString(), x - 2, y - 5);

      // Warning circle for crossing points
      if (p.crossing && p.crossing.trim() !== "") {
        ctx.fillStyle = "#ef4444";
        ctx.beginPath();
        ctx.arc(x, y, 4, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = "#ffffff";
        ctx.font = "bold 5px system-ui";
        ctx.textAlign = "center";
        ctx.fillText("!", x, y + 2);
        ctx.textAlign = "left";
      }
    });

  }, [report, project]);

  if (loading) {
    return (
      <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", minHeight: "100vh", background: "#f8fafc", fontFamily: "system-ui" }}>
        <div style={{ border: "4px solid #e2e8f0", borderTop: "4px solid #2563eb", borderRadius: "50%", width: 36, height: 36, animation: "spin 1s linear infinite" }} />
        <p style={{ marginTop: 12, fontSize: 14, color: "#64748b", fontWeight: 600 }}>Loading Log Sheet...</p>
        <style dangerouslySetInnerHTML={{ __html: `
          @keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }
        `}} />
      </div>
    );
  }

  if (error || !report) {
    return (
      <div style={{ padding: 24, textAlign: "center", fontFamily: "system-ui", color: "#ef4444" }}>
        <h3>Error: {error || "Daily report not found"}</h3>
        <p style={{ color: "#64748b", marginTop: 8 }}>Verify report ID or permissions.</p>
      </div>
    );
  }

  // Split logs for left and right columns
  const logsList = report.hddDrillingLogs || [];
  const rodLength = Number(report.hddMetadata?.hddRodLengthM || project?.hddDefaultRodLengthM || 3.0);
  const midPoint = Math.ceil(logsList.length / 2);
  const leftLogs = logsList.slice(0, 15);
  const rightLogs = logsList.slice(15, 30);

  const hddMeta = report.hddMetadata || {};

  return (
    <div className="a4-sheet" style={{ width: "210mm", minHeight: "297mm", padding: "12mm 10mm", background: "#ffffff", color: "#000000", margin: "0 auto", boxSizing: "border-box", fontSize: "11px", position: "relative" }}>
      
      {/* Styles for print formatting */}
      <style dangerouslySetInnerHTML={{ __html: `
        @media print {
          body {
            background: #ffffff !important;
            margin: 0 !important;
            padding: 0 !important;
          }
          .a4-sheet {
            width: 210mm !important;
            height: 297mm !important;
            box-shadow: none !important;
            margin: 0 !important;
            padding: 10mm !important;
            page-break-after: avoid;
            page-break-before: avoid;
          }
          .no-print {
            display: none !important;
          }
        }
        @page {
          size: A4 portrait;
          margin: 0;
        }
        table {
          width: 100%;
          border-collapse: collapse;
        }
        td, th {
          border: 1px solid #000000;
          padding: 4px 6px;
          text-align: left;
          vertical-align: middle;
        }
        .header-cell {
          font-weight: bold;
          background: #f1f5f9;
        }
      `}} />

      {/* Floating print actions */}
      <div className="no-print" style={{ position: "fixed", bottom: 20, right: 20, display: "flex", gap: 10, zIndex: 10000, background: "rgba(255,255,255,0.9)", padding: 10, borderRadius: 12, boxShadow: "0 4px 20px rgba(0,0,0,0.15)", border: "1px solid #cbd5e1" }}>
        <button onClick={() => window.print()} style={{ background: "#2563eb", color: "#ffffff", border: "none", borderRadius: 8, padding: "8px 16px", fontWeight: "bold", cursor: "pointer", fontSize: "12px" }}>
          🖨️ Print / Save as PDF
        </button>
        <button onClick={() => window.close()} style={{ background: "#64748b", color: "#ffffff", border: "none", borderRadius: 8, padding: "8px 16px", fontWeight: "bold", cursor: "pointer", fontSize: "12px" }}>
          ✕ Close
        </button>
      </div>

      {/* TOP HEADER SECTION */}
      <div style={{ display: "flex", border: "1px solid #000000", borderBottom: "none" }}>
        {/* Document reference details */}
        <div style={{ width: "35%", borderRight: "1px solid #000000", padding: "6px 10px", display: "flex", flexDirection: "column", gap: 2 }}>
          <div><b>From No:</b> KSEB Board / Contractor</div>
          <div><b>Rev. No:</b> 01</div>
          <div><b>Ref Doc:</b> TELGO-HDD-REPORT</div>
          <div><b>Sheet:</b> 1 of 1</div>
        </div>

        {/* Title Header */}
        <div style={{ width: "65%", padding: "10px", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", textAlign: "center", position: "relative" }}>
          <h2 style={{ fontSize: "13px", fontWeight: "bold", margin: 0, letterSpacing: "0.05em", textTransform: "uppercase" }}>
            INSPECTION REPORT FOR WORK DETAILS OF HDD MACHINE
          </h2>
          <div style={{ position: "absolute", right: 15, top: 12, color: "#dc2626", fontSize: "16px", fontWeight: "bold", fontFamily: "monospace" }}>
            299
          </div>
        </div>
      </div>

      {/* METADATA TABLE */}
      <table style={{ borderCollapse: "collapse", width: "100%", marginBottom: "10px" }}>
        <tbody>
          <tr>
            <td className="header-cell" style={{ width: "12%" }}>Client</td>
            <td style={{ width: "23%" }}>KSEB Kerala State Electricity Board</td>
            <td className="header-cell" style={{ width: "12%" }}>Route</td>
            <td style={{ width: "23%" }}>{project?.name || "Corridor Project"}</td>
            <td className="header-cell" style={{ width: "12%" }}>Site Location</td>
            <td style={{ width: "18%" }}>{project?.district || "Kerala"}, India</td>
          </tr>
          <tr>
            <td className="header-cell">Vendor Name</td>
            <td>{hddMeta.hddVendorName || project?.hddDefaultVendorName || "--"}</td>
            <td className="header-cell">Tracker Name</td>
            <td>{hddMeta.hddTrackerName || project?.hddDefaultTrackerName || "--"}</td>
            <td className="header-cell">Operator Name</td>
            <td>{hddMeta.hddOperatorName || project?.hddDefaultOperatorName || "--"}</td>
          </tr>
          <tr>
            <td className="header-cell">Machine No./Name</td>
            <td>{hddMeta.hddMachineName || project?.hddDefaultMachineName || "--"}</td>
            <td className="header-cell">Shot Length (M)</td>
            <td>{report.hddLength || "--"} m</td>
            <td className="header-cell">Strata Details</td>
            <td>{logsList[0]?.strata || "Soft Soil / Hard Strata"}</td>
          </tr>
          <tr>
            <td className="header-cell">No of Duct/ Colour</td>
            <td>{hddMeta.hddDuctsInfo || project?.hddDefaultDuctsInfo || "--"}</td>
            <td className="header-cell">Duct Length (M)</td>
            <td>{report.hddLength || "--"} m</td>
            <td className="header-cell">Rod Length (M)</td>
            <td>{rodLength} m</td>
          </tr>
          <tr>
            <td className="header-cell">Entry Pit GPS</td>
            <td>
              {project?.startCoords ? `${project.startCoords[0].toFixed(5)}, ${project.startCoords[1].toFixed(5)}` : "--"}
            </td>
            <td className="header-cell">Exit Pit GPS</td>
            <td>
              {project?.endCoords ? `${project.endCoords[0].toFixed(5)}, ${project.endCoords[1].toFixed(5)}` : "--"}
            </td>
            <td className="header-cell">Report No / Date</td>
            <td style={{ fontWeight: "bold" }}>
              {project?.code}-{report.reportDate}
            </td>
          </tr>
        </tbody>
      </table>

      {/* CORE INSPECTION GRAPH & LOG TABLES SECTION */}
      <div style={{ display: "flex", border: "1px solid #000000", height: "172mm" }}>
        
        {/* LEFT LOG TABLE (Rods 1-15) */}
        <div style={{ width: "20%", borderRight: "1px solid #000000", display: "flex", flexDirection: "column" }}>
          <table style={{ border: "none" }}>
            <thead>
              <tr style={{ background: "#f1f5f9" }}>
                <th style={{ fontSize: "9px", textAlign: "center", padding: "3px 4px", border: "none", borderBottom: "1px solid #000" }}>Rod</th>
                <th style={{ fontSize: "9px", textAlign: "center", padding: "3px 4px", border: "none", borderBottom: "1px solid #000", borderLeft: "1px solid #000" }}>Pitch</th>
                <th style={{ fontSize: "9px", textAlign: "center", padding: "3px 4px", border: "none", borderBottom: "1px solid #000", borderLeft: "1px solid #000" }}>Depth</th>
              </tr>
            </thead>
            <tbody>
              {Array.from({ length: 15 }).map((_, idx) => {
                const r = leftLogs[idx];
                return (
                  <tr key={idx} style={{ height: "10.4mm" }}>
                    <td style={{ fontSize: "9px", textAlign: "center", padding: "2px", border: "none", borderBottom: "1px solid #000" }}>
                      {idx + 1}
                    </td>
                    <td style={{ fontSize: "9px", textAlign: "center", padding: "2px", border: "none", borderBottom: "1px solid #000", borderLeft: "1px solid #000", fontWeight: r ? "bold" : "normal" }}>
                      {r ? `${r.pitch}%` : ""}
                    </td>
                    <td style={{ fontSize: "9px", textAlign: "center", padding: "2px", border: "none", borderBottom: "1px solid #000", borderLeft: "1px solid #000", fontWeight: r ? "bold" : "normal" }}>
                      {r ? `${Number(r.depth).toFixed(2)}m` : ""}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {/* CENTER PROFILE GRAPH & OFFSET DRAWING */}
        <div style={{ width: "60%", borderRight: "1px solid #000000", display: "flex", flexDirection: "column" }}>
          
          {/* Main Profile Canvas Box */}
          <div style={{ height: "100mm", borderBottom: "1px solid #000000", padding: "10px", boxSizing: "border-box", display: "flex", flexDirection: "column", background: "#ffffff" }}>
            <div style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center" }}>
              <canvas 
                ref={canvasRef} 
                width="400" 
                height="300" 
                style={{ width: "100%", height: "100%", maxHeight: "310px", display: "block" }} 
              />
            </div>
            
            <div style={{ display: "flex", justifyContent: "space-between", fontSize: "9px", color: "#475569", marginTop: "4px", padding: "0 10px" }}>
              <span><b>Scale: XAxis:</b> 1 Div = {rodLength} meters</span>
              <span><b>Scale: YAxis:</b> 1 Div = 1.0 meters</span>
            </div>
          </div>

          {/* Offset Drawing Area */}
          <div style={{ flex: 1, padding: "8px 12px", boxSizing: "border-box", display: "flex", flexDirection: "column" }}>
            <span style={{ fontSize: "9px", fontWeight: "bold", textTransform: "uppercase", color: "#475569" }}>
              OFFSET DRAWING & REMARKS
            </span>
            <div style={{ flex: 1, position: "relative", border: "1px dashed #cbd5e1", marginTop: "4px", borderRadius: "4px", padding: "8px", background: "#f8fafc", fontSize: "10px", lineHeight: "1.4" }}>
              <div style={{ fontWeight: "bold", color: "#1e293b", marginBottom: "4px" }}>Corridor Geotechnical Map:</div>
              <div>• <b>Start Junction:</b> {project?.startLabel || "Start Point"}</div>
              {project?.endLabel && <div>• <b>End Junction:</b> {project.endLabel}</div>}
              {project?.middlePoints && project.middlePoints.length > 0 && (
                <div>• <b>Junctions/Turnings:</b> {project.middlePoints.length} intermediate points registered.</div>
              )}
              
              <div style={{ marginTop: "8px", fontWeight: "bold", color: "#1e293b" }}>Soil Strata & Crossing Warning Logs:</div>
              <div style={{ maxHeight: "80px", overflow: "hidden", display: "flex", flexDirection: "column", gap: "2px" }}>
                {logsList.filter(l => l.crossing).map((l, i) => (
                  <div key={i} style={{ color: "#dc2626" }}>
                    ⚠️ Rod #{l.rodNo} ({((l.rodNo) * rodLength).toFixed(1)}m): <b>{l.crossing}</b> ({l.strata} strata)
                  </div>
                ))}
                {logsList.filter(l => l.crossing).length === 0 && (
                  <div style={{ color: "#16a34a" }}>No pipeline utility/road crossing crossings logged. Free path.</div>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* RIGHT LOG TABLE (Rods 16-30) */}
        <div style={{ width: "20%", display: "flex", flexDirection: "column" }}>
          <table style={{ border: "none" }}>
            <thead>
              <tr style={{ background: "#f1f5f9" }}>
                <th style={{ fontSize: "9px", textAlign: "center", padding: "3px 4px", border: "none", borderBottom: "1px solid #000" }}>Rod</th>
                <th style={{ fontSize: "9px", textAlign: "center", padding: "3px 4px", border: "none", borderBottom: "1px solid #000", borderLeft: "1px solid #000" }}>Pitch</th>
                <th style={{ fontSize: "9px", textAlign: "center", padding: "3px 4px", border: "none", borderBottom: "1px solid #000", borderLeft: "1px solid #000" }}>Depth</th>
              </tr>
            </thead>
            <tbody>
              {Array.from({ length: 15 }).map((_, idx) => {
                const rodNo = 16 + idx;
                const r = rightLogs[idx];
                return (
                  <tr key={idx} style={{ height: "10.4mm" }}>
                    <td style={{ fontSize: "9px", textAlign: "center", padding: "2px", border: "none", borderBottom: "1px solid #000" }}>
                      {rodNo}
                    </td>
                    <td style={{ fontSize: "9px", textAlign: "center", padding: "2px", border: "none", borderBottom: "1px solid #000", borderLeft: "1px solid #000", fontWeight: r ? "bold" : "normal" }}>
                      {r ? `${r.pitch}%` : ""}
                    </td>
                    <td style={{ fontSize: "9px", textAlign: "center", padding: "2px", border: "none", borderBottom: "1px solid #000", borderLeft: "1px solid #000", fontWeight: r ? "bold" : "normal" }}>
                      {r ? `${Number(r.depth).toFixed(2)}m` : ""}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

      </div>

      {/* SIGNATURE SECTION AT THE BOTTOM */}
      <table style={{ borderCollapse: "collapse", width: "100%", marginTop: "10px" }}>
        <tbody>
          <tr style={{ height: "30px" }}>
            <td className="header-cell" style={{ width: "20%" }}>Signature</td>
            <td style={{ width: "40%" }}></td>
            <td style={{ width: "40%" }}></td>
          </tr>
          <tr style={{ height: "24px" }}>
            <td className="header-cell">Name</td>
            <td style={{ fontWeight: "bold" }}>Contractor Representative</td>
            <td style={{ fontWeight: "bold" }}>Field Engineer ({report.supervisorName})</td>
          </tr>
          <tr style={{ height: "24px" }}>
            <td className="header-cell">Date</td>
            <td>{report.reportDate}</td>
            <td>{report.reportDate}</td>
          </tr>
        </tbody>
      </table>

    </div>
  );
}

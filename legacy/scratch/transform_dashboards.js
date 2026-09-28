import { readFile, writeFile } from "node:fs/promises";
import { join } from "node:path";

async function transformDashboard(file, name) {
  console.log(`Transforming Dashboard: ${name} (${file})`);
  let content = await readFile(file, "utf8");

  // 1. styled-jsx and local style tags
  content = content.replace(/background:\s*rgba\(255,\s*255,\s*255,\s*0\.06\)\s*!important/g, 'background: #f1f5f9 !important');
  content = content.replace(/background:\s*rgba\(0,\s*0,\s*0,\s*0\.6\)\s*!important/g, 'background: #ffffff !important');
  content = content.replace(/background:\s*rgba\(255,\s*255,\s*255,\s*0\.08\)\s*!important/g, 'background: #f1f5f9 !important');
  content = content.replace(/background:\s*rgba\(255,\s*255,\s*255,\s*0\.02\)\s*!important/g, 'background: var(--surface) !important');
  content = content.replace(/background:\s*rgba\(0,\s*0,\s*0,\s*0\.4\)\s*!important/g, 'background: var(--surface) !important');
  content = content.replace(/border:\s*1px solid rgba\(255,255,255,0\.08\);\s*background:\s*rgba\(255,255,255,0\.02\);\s*color:\s*#94a3b8;/g, 'border: 1px solid var(--border); background: var(--surface); color: var(--dim);');
  content = content.replace(/background:\s*rgba\(255,255,255,0\.06\);\s*border-color:\s*rgba\(255,255,255,0\.15\);/g, 'background: #f1f5f9; border-color: #cbd5e1;');
  content = content.replace(/border-color:\s*rgba\(255,\s*255,\s*255,\s*0\.08\)/g, 'border-color: var(--border)');
  content = content.replace(/background:\s*rgba\(255,\s*255,\s*255,\s*0\.04\)\s*!important/g, 'background: var(--surface) !important');
  
  // 2. Leaflet Map setup (srcDoc maps) - Positron light style
  content = content.replace(/basemaps.cartocdn.com\/dark_all/g, 'basemaps.cartocdn.com/light_all');
  content = content.replace(/background:\s*#060912\s*;/g, 'background: #f8fafc;');
  content = content.replace(/background:\s*#060912\s*!important/g, 'background: #f8fafc !important');
  content = content.replace(/background-color:\s*#0b0f19\s*!important/g, 'background-color: #ffffff !important');
  content = content.replace(/color:\s*#fff\s*!important/g, 'color: #334155 !important');
  content = content.replace(/border-color:\s*rgba\(255,255,255,0.15\)\s*!important/g, 'border-color: #e2e8f0 !important');
  content = content.replace(/background-color:\s*#121826\s*!important/g, 'background-color: #f1f5f9 !important');
  content = content.replace(/background:\s*rgba\(6,9,18,0.75\)/g, 'background: "rgba(255,255,255,0.9)"');

  // 3. Access controls logic (Admin and Supervisor)
  content = content.replace(/border:\s*pending\.length\s*>\s*0\s*\?\s*["']1px solid rgba\(251,\s*191,\s*36,\s*0\.35\)["']\s*:\s*["']1px solid rgba\(255,255,255,0\.05\)["']/g, 'border: pending.length > 0 ? "1px solid rgba(217, 119, 6, 0.35)" : "1px solid var(--border)"');
  content = content.replace(/background:\s*pending\.length\s*>\s*0\s*\?\s*["']linear-gradient\(135deg,\s*rgba\(251,191,36,0\.06\)\s*0%,\s*rgba\(6,9,18,0\.7\)\s*100%\)["']\s*:\s*["']rgba\(255,255,255,0\.01\)["']/g, 'background: pending.length > 0 ? "linear-gradient(135deg, #fffbeb 0%, #fef3c7 100%)" : "var(--surface)"');
  content = content.replace(/stroke=\{pending\.length\s*>\s*0\s*\?\s*["']#fbbf24["']\s*:\s*["']#c4b5fd["']\}/g, 'stroke={pending.length > 0 ? "#d97706" : "#7c3aed"}');
  content = content.replace(/background:\s*pending\.length\s*>\s*0\s*\?\s*["']rgba\(251,191,36,0\.12\)["']\s*:\s*["']rgba\(196,\s*181,\s*253,\s*0\.1\)["']/g, 'background: pending.length > 0 ? "rgba(217, 119, 6, 0.12)" : "rgba(124, 58, 237, 0.08)"');
  content = content.replace(/border:\s*pending\.length\s*>\s*0\s*\?\s*["']1px solid rgba\(251,191,36,0\.3\)["']\s*:\s*["']1px solid rgba\(196,\s*181,\s*253,\s*0\.2\)["']/g, 'border: pending.length > 0 ? "1px solid rgba(217, 119, 6, 0.3)" : "1px solid rgba(124, 58, 237, 0.2)"');
  content = content.replace(/background:\s*["']#fbbf24["']\s*,\s*color:\s*["']#060912["']/g, 'background: "#fbbf24", color: "#ffffff"');
  content = content.replace(/border:\s*["']1.5px solid #060912["']/g, 'border: "1.5px solid #ffffff"');

  // 4. Approvals tabs (Admin)
  content = content.replace(/background:\s*approvalsTab\s*===\s*["']pending["']\s*\?\s*["']rgba\(124,\s*58,\s*237,\s*0\.15\)["']\s*:\s*["']rgba\(255,\s*255,\s*255,\s*0\.02\)["']/g, 'background: approvalsTab === "pending" ? "rgba(124, 58, 237, 0.08)" : "var(--surface)"');
  content = content.replace(/border:\s*approvalsTab\s*===\s*["']pending["']\s*\?\s*["']1px solid rgba\(124,\s*58,\s*237,\s*0\.35\)["']\s*:\s*["']1px solid rgba\(255,\s*255,\s*255,\s*0\.06\)["']/g, 'border: approvalsTab === "pending" ? "1px solid rgba(124, 58, 237, 0.3)" : "1px solid var(--border)"');
  content = content.replace(/color:\s*approvalsTab\s*===\s*["']pending["']\s*\?\s*["']#c4b5fd["']\s*:\s*["']#94a3b8["']/g, 'color: approvalsTab === "pending" ? "var(--violet)" : "var(--dim)"');
  
  content = content.replace(/background:\s*approvalsTab\s*===\s*["']active["']\s*\?\s*["']rgba\(6,\s*182,\s*212,\s*0\.15\)["']\s*:\s*["']rgba\(255,\s*255,\s*255,\s*0\.02\)["']/g, 'background: approvalsTab === "active" ? "rgba(14, 165, 233, 0.08)" : "var(--surface)"');
  content = content.replace(/border:\s*approvalsTab\s*===\s*["']active["']\s*\?\s*["']1px solid rgba\(6,\s*182,\s*212,\s*0\.35\)["']\s*:\s*["']1px solid rgba\(255,\s*255,\s*255,\s*0\.06\)["']/g, 'border: approvalsTab === "active" ? "1px solid rgba(14, 165, 233, 0.3)" : "1px solid var(--border)"');
  content = content.replace(/color:\s*approvalsTab\s*===\s*["']active["']\s*\?\s*["']#67e8f9["']\s*:\s*["']#94a3b8["']/g, 'color: approvalsTab === "active" ? "var(--cyan)" : "var(--dim)"');
  content = content.replace(/background:\s*["']rgba\(6,\s*182,\s*212,\s*0\.2\)["']/g, 'background: "rgba(14, 165, 233, 0.12)"');
  content = content.replace(/color:\s*["']#06b6d4["']/g, 'color: "var(--cyan)"');

  // 5. Selectable projects lists (Admin and Supervisor)
  content = content.replace(/background:\s*isSelected\s*\?\s*["']rgba\(6,\s*182,\s*212,\s*0\.08\)["']\s*:\s*["']rgba\(255,255,255,0\.01\)["']/g, 'background: isSelected ? "rgba(14, 165, 233, 0.08)" : "var(--surface)"');
  content = content.replace(/border:\s*isSelected\s*\?\s*["']1px solid rgba\(6,\s*182,\s*212,\s*0\.3\)["']\s*:\s*["']1px solid rgba\(255,255,255,0\.04\)["']/g, 'border: isSelected ? "1px solid rgba(14, 165, 233, 0.3)" : "1px solid var(--border)"');
  
  content = content.replace(/background:\s*isSelected\s*\?\s*["']rgba\(167,\s*139,\s*250,\s*0\.08\)["']\s*:\s*["']rgba\(255,255,255,0\.01\)["']/g, 'background: isSelected ? "rgba(124, 58, 237, 0.08)" : "var(--surface)"');
  content = content.replace(/border:\s*isSelected\s*\?\s*["']1px solid rgba\(167,\s*139,\s*250,\s*0\.3\)["']\s*:\s*["']1px solid rgba\(255,255,255,0\.04\)["']/g, 'border: isSelected ? "1px solid rgba(124, 58, 237, 0.3)" : "1px solid var(--border)"');

  content = content.replace(/background:\s*isSelected\s*\?\s*["']rgba\(124,\s*58,\s*237,\s*0\.08\)["']\s*:\s*["']rgba\(255,255,255,0\.01\)["']/g, 'background: isSelected ? "rgba(124, 58, 237, 0.08)" : "var(--surface)"');
  content = content.replace(/border:\s*isSelected\s*\?\s*["']1px solid rgba\(124,\s*58,\s*237,\s*0\.3\)["']\s*:\s*["']1px solid rgba\(255,255,255,0\.04\)["']/g, 'border: isSelected ? "1px solid rgba(124, 58, 237, 0.3)" : "1px solid var(--border)"');

  content = content.replace(/background:\s*isSelected\s*\?\s*["']rgba\(16,\s*185,\s*129,\s*0\.08\)["']\s*:\s*["']rgba\(255,255,255,0\.01\)["']/g, 'background: isSelected ? "rgba(22, 163, 74, 0.08)" : "var(--surface)"');
  content = content.replace(/border:\s*isSelected\s*\?\s*["']1px solid rgba\(16,\s*185,\s*129,\s*0\.3\)["']\s*:\s*["']1px solid rgba\(255,255,255,0\.04\)["']/g, 'border: isSelected ? "1px solid rgba(22, 163, 74, 0.3)" : "1px solid var(--border)"');

  content = content.replace(/color:\s*isSelected\s*\?\s*["']#c4b5fd["']\s*:\s*["']#f1f5f9["']/g, 'color: isSelected ? "var(--violet)" : "var(--text)"');
  content = content.replace(/color:\s*isSelected\s*\?\s*["']#c4b5fd["']\s*:\s*["']#f1f5f9["']/g, 'color: isSelected ? "var(--violet)" : "var(--text)"');

  // 6. Icon backgrounds and strokes
  content = content.replace(/stroke=\{isShiftActive\s*\?\s*["']#a78bfa["']\s*:\s*["']#06b6d4["']\}/g, 'stroke={isShiftActive ? "var(--violet)" : "var(--cyan)"}');
  content = content.replace(/color:\s*isShiftActive\s*\?\s*["']#a78bfa["']\s*:\s*["']#64748b["']/g, 'color: isShiftActive ? "var(--violet)" : "var(--dim)"');
  
  content = content.replace(/background:\s*["']rgba\(6,\s*182,\s*212,\s*0\.08\)["']/g, 'background: "rgba(14, 165, 233, 0.08)"');
  content = content.replace(/border:\s*["']1px solid rgba\(6,\s*182,\s*212,\s*0\.2\)["']/g, 'border: "1px solid rgba(14, 165, 233, 0.2)"');
  content = content.replace(/background:\s*["']rgba\(245,\s*158,\s*11,\s*0\.08\)["']/g, 'background: "rgba(217, 119, 6, 0.08)"');
  content = content.replace(/border:\s*["']1px solid rgba\(245,\s*158,\s*11,\s*0\.2\)["']/g, 'border: "1px solid rgba(217, 119, 6, 0.2)"');
  
  content = content.replace(/background:\s*["']rgba\(16,\s*185,\s*129,\s*0\.05\)["']/g, 'background: "rgba(22, 163, 74, 0.08)"');
  content = content.replace(/border:\s*["']1px solid rgba\(16,\s*185,\s*129,\s*0\.15\)["']/g, 'border: "1px solid rgba(22, 163, 74, 0.2)"');
  content = content.replace(/background:\s*["']rgba\(167,\s*139,\s*250,\s*0\.06\)["']/g, 'background: "rgba(124, 58, 237, 0.08)"');
  content = content.replace(/border:\s*["']1px solid rgba\(167,\s*139,\s*250,\s*0\.15\)["']/g, 'border: "1px solid rgba(124, 58, 237, 0.2)"');
  content = content.replace(/background:\s*["']rgba\(167,\s*139,\s*250,\s*0\.08\)["']/g, 'background: "rgba(124, 58, 237, 0.08)"');
  content = content.replace(/border:\s*["']1px solid rgba\(167,\s*139,\s*250,\s*0\.2\)["']/g, 'border: "1px solid rgba(124, 58, 237, 0.2)"');

  content = content.replace(/background:\s*["']rgba\(251,\s*191,\s*36,\s*0\.08\)["']/g, 'background: "rgba(217, 119, 6, 0.08)"');
  content = content.replace(/border:\s*["']1px solid rgba\(251,\s*191,\s*36,\s*0\.2\)["']/g, 'border: "1px solid rgba(217, 119, 6, 0.2)"');

  content = content.replace(/background:\s*["']rgba\(6,\s*182,\s*212,\s*0\.05\)["']/g, 'background: "rgba(14, 165, 233, 0.08)"');
  content = content.replace(/border:\s*["']1px solid rgba\(6,\s*182,\s*212,\s*0\.15\)["']/g, 'border: "1px solid rgba(14, 165, 233, 0.2)"');

  content = content.replace(/background:\s*["']rgba\(239,\s*68,\s*68,\s*0\.05\)["']/g, 'background: "rgba(220, 38, 38, 0.08)"');
  content = content.replace(/border:\s*["']1px solid rgba\(239,\s*68,\s*68,\s*0\.15\)["']/g, 'border: "1px solid rgba(220, 38, 38, 0.2)"');

  // 7. General white transparencies
  content = content.replace(/rgba\(255,\s*255,\s*255,\s*0\.05\)/g, 'var(--border)');
  content = content.replace(/rgba\(255,\s*255,\s*255,\s*0\.08\)/g, 'var(--border)');
  content = content.replace(/rgba\(255,\s*255,\s*255,\s*0\.06\)/g, 'var(--border)');
  content = content.replace(/rgba\(255,\s*255,\s*255,\s*0\.04\)/g, 'var(--border)');
  content = content.replace(/rgba\(255,\s*255,\s*255,\s*0\.02\)/g, 'var(--surface)');
  content = content.replace(/rgba\(255,\s*255,\s*255,\s*0\.03\)/g, 'var(--surface)');
  content = content.replace(/rgba\(255,\s*255,\s*255,\s*0\.01\)/g, 'var(--surface)');

  // 8. GIS Editor Modal
  content = content.replace(/background:\s*["']linear-gradient\(135deg,\s*#0d0621\s*0%,\s*#060912\s*100%\)["']/g, 'background: "linear-gradient(135deg, #ffffff 0%, #f8fafc 100%)"');
  content = content.replace(/boxShadow:\s*["']0\s*24px\s*64px\s*rgba\(0,\s*0,\s*0,\s*0\.75\)["']/g, 'boxShadow: "0 8px 32px rgba(15, 23, 42, 0.06)"');
  content = content.replace(/background:\s*["']rgba\(255,\s*255,\s*255,\s*0\.04\)["']/g, 'background: "var(--surface)"');
  content = content.replace(/border:\s*["']1px solid rgba\(255,\s*255,\s*255,\s*0\.08\)["']/g, 'border: "1px solid var(--border)"');
  content = content.replace(/background:\s*["']rgba\(251,191,36,0\.1\)["']/g, 'background: "rgba(217, 119, 6, 0.08)"');
  content = content.replace(/border:\s*["']1px solid rgba\(251,191,36,0\.2\)["']/g, 'border: "1px solid rgba(217, 119, 6, 0.2)"');
  content = content.replace(/background:\s*["']rgba\(0,\s*0,\s*0,\s*0\.4\)["']/g, 'background: "var(--surface)"');
  content = content.replace(/background:\s*["']rgba\(0,\s*0,\s*0,\s*0\.3\)["']/g, 'background: "var(--surface)"');
  content = content.replace(/background:\s*["']rgba\(6,\s*182,\s*212,\s*0\.15\)["']/g, 'background: "rgba(14, 165, 233, 0.08)"');
  content = content.replace(/border:\s*["']1px solid rgba\(6,\s*182,\s*212,\s*0\.3\)["']/g, 'border: "1px solid rgba(14, 165, 233, 0.3)"');
  content = content.replace(/background:\s*["']rgba\(255,255,255,0.9\)["']/g, 'background: "rgba(15, 23, 42, 0.35)"');
  
  // 9. Status markers in GIS
  content = content.replace(/background:\s*["']rgba\(34,\s*197,\s*94,\s*0\.08\)["']/g, 'background: "rgba(22, 163, 74, 0.08)"');
  content = content.replace(/background:\s*["']rgba\(239,\s*68,\s*68,\s*0\.08\)["']/g, 'background: "rgba(220, 38, 38, 0.08)"');
  content = content.replace(/background:\s*["']rgba\(251,\s*191,\s*36,\s*0\.08\)["']/g, 'background: "rgba(217, 119, 6, 0.08)"');
  content = content.replace(/background:\s*["']rgba\(37,\s*99,\s*235,\s*0\.08\)["']/g, 'background: "rgba(37, 99, 235, 0.08)"');
  content = content.replace(/background:\s*["']rgba\(249,\s*115,\s*22,\s*0\.08\)["']/g, 'background: "rgba(249, 115, 22, 0.08)"');
  content = content.replace(/background:\s*["']rgba\(168,\s*85,\s*247,\s*0\.08\)["']/g, 'background: "rgba(124, 58, 237, 0.08)"');

  await writeFile(file, content, "utf8");
  console.log(`Successfully polished Dashboard: ${name}`);
}

async function run() {
  const root = "c:\\Users\\Elitebook\\OneDrive\\Documents\\GitHub\\telgo-app";
  await transformDashboard(join(root, "src/app/app/admin/page.tsx"), "Admin Console");
  await transformDashboard(join(root, "src/app/app/supervisor/page.tsx"), "Supervisor Mobile Console");
  console.log("Dashboard polishing complete!");
}

run().catch(console.error);

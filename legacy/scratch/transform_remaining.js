import { readFile, writeFile } from "node:fs/promises";
import { join } from "node:path";

async function transformClient() {
  const file = "c:\\Users\\Elitebook\\OneDrive\\Documents\\GitHub\\telgo-app\\src\\app\\app\\client\\page.tsx";
  console.log(`Transforming Client Page: ${file}`);
  let content = await readFile(file, "utf8");

  // 1. General colors
  content = content.replace(/background:\s*["']#060912["']/g, 'background: "var(--bg)"');
  content = content.replace(/color:\s*["']#f1f5f9["']/g, 'color: "var(--text)"');
  content = content.replace(/color:\s*["']#64748b["']/g, 'color: "var(--dim)"');
  content = content.replace(/color:\s*["']#cbd5e1["']/g, 'color: "var(--muted)"');
  content = content.replace(/color:\s*["']#94a3b8["']/g, 'color: "var(--dim)"');
  content = content.replace(/color:\s*["']#f87171["']/g, 'color: "var(--red)"');
  content = content.replace(/color:\s*["']#86efac["']/g, 'color: "var(--green)"');
  content = content.replace(/color:\s*["']#4ade80["']/g, 'color: "var(--green)"');

  // 2. Gradients and transparent backgrounds
  content = content.replace(/background:\s*["']rgba\(255,\s*255,\s*255,\s*0\.01\)["']/g, 'background: "var(--surface)"');
  content = content.replace(/background:\s*["']rgba\(255,\s*255,\s*255,\s*0\.02\)["']/g, 'background: "var(--surface)"');
  content = content.replace(/background:\s*["']rgba\(255,\s*255,\s*255,\s*0\.03\)["']/g, 'background: "var(--surface)"');
  content = content.replace(/background:\s*["']rgba\(255,\s*255,\s*255,\s*0\.04\)["']/g, 'background: "var(--surface)"');
  content = content.replace(/background:\s*["']rgba\(255,\s*255,\s*255,\s*0\.06\)["']/g, 'background: "var(--surface)"');
  content = content.replace(/background:\s*["']rgba\(255,\s*255,\s*255,\s*0\.08\)["']/g, 'background: "var(--surface)"');
  content = content.replace(/background:\s*["']rgba\(0,\s*0,\s*0,\s*0\.1\)["']/g, 'background: "var(--surface)"');
  content = content.replace(/background:\s*["']rgba\(0,\s*0,\s*0,\s*0\.6\)["']/g, 'background: "rgba(255, 255, 255, 0.85)"');
  content = content.replace(/background:\s*["']rgba\(6,\s*9,\s*18,\s*0\.85\)["']/g, 'background: "rgba(15, 23, 42, 0.3)"');
  content = content.replace(/background:\s*["']linear-gradient\(180deg,\s*#0b0f19\s*0%,\s*#060912\s*100%\)["']/g, 'background: "linear-gradient(180deg, #ffffff 0%, #f8fafc 100%)"');
  content = content.replace(/background:\s*["']linear-gradient\(180deg,\s*#0d1222\s*0%,\s*#060912\s*100%\)["']/g, 'background: "linear-gradient(180deg, #ffffff 0%, #f8fafc 100%)"');

  // 3. Borders & Shadows
  content = content.replace(/border:\s*["']1px solid rgba\(255,\s*255,\s*255,\s*0\.05\)["']/g, 'border: "1px solid var(--border)"');
  content = content.replace(/border:\s*["']1px solid rgba\(255,\s*255,\s*255,\s*0\.08\)["']/g, 'border: "1px solid var(--border)"');
  content = content.replace(/border:\s*["']1px solid rgba\(255,\s*255,\s*255,\s*0\.06\)["']/g, 'border: "1px solid var(--border)"');
  content = content.replace(/border:\s*["']1px solid rgba\(255,\s*255,\s*255,\s*0\.04\)["']/g, 'border: "1px solid var(--border)"');
  content = content.replace(/border:\s*["']1px solid rgba\(255,\s*255,\s*255,\s*0\.02\)["']/g, 'border: "1px solid var(--border)"');
  content = content.replace(/border:\s*["']1.5px solid rgba\(255,\s*255,\s*255,\s*0\.15\)["']/g, 'border: "1.5px solid var(--border)"');
  content = content.replace(/borderBottom:\s*["']1px solid rgba\(255,\s*255,\s*255,\s*0\.06\)["']/g, 'borderBottom: "1px solid var(--border)"');
  content = content.replace(/borderTop:\s*["']1px solid rgba\(255,\s*255,\s*255,\s*0\.05\)["']/g, 'borderTop: "1px solid var(--border)"');
  content = content.replace(/boxShadow:\s*["']0\s*-20px\s*60px\s*rgba\(0,\s*0,\s*0,\s*0\.8\)["']/g, 'boxShadow: "0 -4px 20px rgba(0, 0, 0, 0.05)"');

  // 4. Role tag and badge accents
  content = content.replace(/background:\s*["']rgba\(74,222,128,0\.15\)["']/g, 'background: "rgba(22, 163, 74, 0.08)"');
  content = content.replace(/border:\s*["']1px solid rgba\(74,222,128,0\.25\)["']/g, 'border: "1px solid rgba(22, 163, 74, 0.2)"');
  content = content.replace(/background:\s*["']rgba\(34,197,94,0\.12\)["']/g, 'background: "rgba(22, 163, 74, 0.08)"');
  content = content.replace(/border:\s*["']1px solid rgba\(34,197,94,0\.2\)["']/g, 'border: "1px solid rgba(22, 163, 74, 0.2)"');

  // 5. Tactical Radar map background elements
  content = content.replace(/background:\s*["']#05070e["']/g, 'background: "var(--surface)"');
  content = content.replace(/background:\s*["']#05070e["']/g, 'background: "var(--surface)"');
  content = content.replace(/rgba\(255,255,255,0\.015\)/g, 'rgba(15,23,42,0.025)');
  content = content.replace(/fill=["']#0f172a["']/g, 'fill="#ffffff"');
  content = content.replace(/fill=["']#0f172a["']/g, 'fill="#ffffff"');
  content = content.replace(/color:\s*["']#f1f5f9["']\s*,\s*marginBottom:\s*6/g, 'color: "var(--text)", marginBottom: 6');
  content = content.replace(/color:\s*["']#f1f5f9["']\s*,\s*margin:\s*0/g, 'color: "var(--text)", margin: 0');
  content = content.replace(/color:\s*["']#cbd5e1["']/g, 'color: "var(--muted)"');
  content = content.replace(/color:\s*["']#cbd5e1["']/g, 'color: "var(--muted)"');

  // 6. Selected worker background list elements
  content = content.replace(/selectedWorker\?.userId === w.userId \?\s*["']rgba\(16, 185, 129, 0\.06\)["']\s*:\s*["']rgba\(255,255,255,0\.02\)["']/g, 'selectedWorker?.userId === w.userId ? "rgba(16, 185, 129, 0.08)" : "var(--surface)"');
  content = content.replace(/selectedWorker\?.userId === w.userId \?\s*["']1px solid rgba\(16, 185, 129, 0\.25\)["']\s*:\s*["']1px solid rgba\(255,255,255,0\.05\)["']/g, 'selectedWorker?.userId === w.userId ? "1px solid rgba(16, 185, 129, 0.35)" : "1px solid var(--border)"');
  content = content.replace(/selectedWorker\?.userId === w.userId \?\s*["']#10b981["']\s*:\s*["']rgba\(255,255,255,0\.15\)["']/g, 'selectedWorker?.userId === w.userId ? "var(--green)" : "var(--border)"');
  content = content.replace(/background:\s*["']linear-gradient\(135deg, #1e293b, #0f172a\)["']/g, 'background: "linear-gradient(135deg, var(--violet), var(--cyan))"');
  content = content.replace(/background:\s*["']rgba\(255, 255, 255, 0.01\)["']/g, 'background: "var(--surface)"');
  content = content.replace(/border:\s*["']1px solid rgba\(255, 255, 255, 0.05\)["']/g, 'border: "1px solid var(--border)"');

  await writeFile(file, content, "utf8");
  console.log("Successfully transformed Client page!");
}

async function transformFinance() {
  const file = "c:\\Users\\Elitebook\\OneDrive\\Documents\\GitHub\\telgo-app\\src\\app\\app\\finance\\page.tsx";
  console.log(`Transforming Finance Page: ${file}`);
  let content = await readFile(file, "utf8");

  // 1. General colors
  content = content.replace(/background:\s*["']#060912["']/g, 'background: "var(--bg)"');
  content = content.replace(/color:\s*["']#f1f5f9["']/g, 'color: "var(--text)"');
  content = content.replace(/color:\s*["']#64748b["']/g, 'color: "var(--dim)"');
  content = content.replace(/color:\s*["']#cbd5e1["']/g, 'color: "var(--muted)"');
  content = content.replace(/color:\s*["']#94a3b8["']/g, 'color: "var(--dim)"');
  content = content.replace(/color:\s*["']#f87171["']/g, 'color: "var(--red)"');
  content = content.replace(/color:\s*["']#060912["']/g, 'color: "white"'); // gold button text override back to dark/white
  content = content.replace(/background:\s*["']#080b13["']/g, 'background: "var(--bg)"');

  // 2. Gradients and transparent backgrounds
  content = content.replace(/background:\s*["']rgba\(255,\s*255,\s*255,\s*0\.01\)["']/g, 'background: "var(--surface)"');
  content = content.replace(/background:\s*["']rgba\(255,\s*255,\s*255,\s*0\.02\)["']/g, 'background: "var(--surface)"');
  content = content.replace(/background:\s*["']rgba\(255,\s*255,\s*255,\s*0\.03\)["']/g, 'background: "var(--surface)"');
  content = content.replace(/background:\s*["']rgba\(255,\s*255,\s*255,\s*0\.04\)["']/g, 'background: "var(--surface)"');
  content = content.replace(/background:\s*["']rgba\(255,\s*255,\s*255,\s*0\.06\)["']/g, 'background: "var(--surface)"');
  content = content.replace(/background:\s*["']rgba\(255,\s*255,\s*255,\s*0\.08\)["']/g, 'background: "var(--surface)"');
  content = content.replace(/background:\s*["']rgba\(0,\s*0,\s*0,\s*0\.2\)["']/g, 'background: "var(--surface)"');
  content = content.replace(/background:\s*["']rgba\(6,\s*9,\s*18,\s*0\.85\)["']/g, 'background: "rgba(15, 23, 42, 0.3)"');
  content = content.replace(/background:\s*["']linear-gradient\(135deg,\s*#0e0828\s*0%,\s*#060912\s*100%\)["']/g, 'background: "linear-gradient(135deg, #ffffff 0%, #f8fafc 100%)"');
  content = content.replace(/boxShadow:\s*["']0\s*24px\s*64px\s*rgba\(0,0,0,0\.7\)["']/g, 'boxShadow: "0 8px 32px rgba(15, 23, 42, 0.06)"');

  // 3. Borders & Shadows
  content = content.replace(/border:\s*["']1px solid rgba\(255,\s*255,\s*255,\s*0\.06\)["']/g, 'border: "1px solid var(--border)"');
  content = content.replace(/border:\s*["']1px solid rgba\(255,\s*255,\s*255,\s*0\.08\)["']/g, 'border: "1px solid var(--border)"');
  content = content.replace(/border:\s*["']1px solid rgba\(255,\s*255,\s*255,\s*0\.04\)["']/g, 'border: "1px solid var(--border)"');
  content = content.replace(/border:\s*["']2px solid rgba\(255,\s*255,\s*255,\s*0\.1\)["']/g, 'border: "2px solid var(--border)"');

  // 4. Gold specific highlights (improve text contrast)
  content = content.replace(/color:\s*["']#facc15["']/g, 'color: "#d97706"'); // Use darker high-contrast amber
  content = content.replace(/background:\s*["']rgba\(250,\s*204,\s*21,\s*0\.08\)["']/g, 'background: "rgba(217, 119, 6, 0.08)"');
  content = content.replace(/background:\s*["']rgba\(250,\s*204,\s*21,\s*0\.02\)["']/g, 'background: "rgba(217, 119, 6, 0.02)"');
  content = content.replace(/background:\s*["']rgba\(250,\s*204,\s*21,\s*0\.12\)["']/g, 'background: "rgba(217, 119, 6, 0.08)"');
  content = content.replace(/background:\s*["']rgba\(250,204,21,0\.06\)["']/g, 'background: "rgba(217, 119, 6, 0.08)"');
  content = content.replace(/border:\s*["']1px solid rgba\(250,\s*204,\s*21,\s*0\.3\)["']/g, 'border: "1px solid rgba(217, 119, 6, 0.3)"');
  content = content.replace(/border:\s*["']1px solid rgba\(250,\s*204,\s*21,\s*0\.2\)["']/g, 'border: "1px solid rgba(217, 119, 6, 0.2)"');
  content = content.replace(/border:\s*["']1px solid rgba\(250,\s*204,\s*21,\s*0\.25\)["']/g, 'border: "1px solid rgba(217, 119, 6, 0.25)"');
  content = content.replace(/border:\s*["']1px solid rgba\(250,204,21,0\.15\)["']/g, 'border: "1px solid rgba(217, 119, 6, 0.15)"');
  content = content.replace(/color:\s*isShiftActive\s*\?\s*["']#f87171["']\s*:\s*["']#060912["']/g, 'color: isShiftActive ? "var(--red)" : "white"');
  content = content.replace(/background:\s*["']linear-gradient\(135deg,\s*#ca8a04,\s*#facc15\)["']/g, 'background: "linear-gradient(135deg, #d97706, #fbbf24)"');

  // 5. Leaflet maps inside srcDoc (CartoDB Positron tiles)
  content = content.replace(/basemaps.cartocdn.com\/dark_all/g, 'basemaps.cartocdn.com/light_all');
  content = content.replace(/background:\s*#060912\s*;/g, 'background: #f8fafc;');
  content = content.replace(/background:\s*#060912\s*!important/g, 'background: #f8fafc !important');
  content = content.replace(/background-color:\s*#0b0f19\s*!important/g, 'background-color: #ffffff !important');
  content = content.replace(/color:\s*#fff\s*!important/g, 'color: #334155 !important');
  content = content.replace(/border-color:\s*rgba\(255,255,255,0.15\)\s*!important/g, 'border-color: #e2e8f0 !important');
  content = content.replace(/background-color:\s*#121826\s*!important/g, 'background-color: #f1f5f9 !important');

  await writeFile(file, content, "utf8");
  console.log("Successfully transformed Finance page!");
}

async function transformSharedComponents() {
  const file = "c:\\Users\\Elitebook\\OneDrive\\Documents\\GitHub\\telgo-app\\src\\components\\profile-modal.tsx";
  console.log(`Transforming Shared Profile Modal: ${file}`);
  let content = await readFile(file, "utf8");

  // 1. Theme modal replacements
  content = content.replace(/background:\s*["']rgba\(6,\s*9,\s*18,\s*0\.85\)["']/g, 'background: "rgba(15, 23, 42, 0.3)"');
  content = content.replace(/background:\s*["']linear-gradient\(135deg,\s*#0f082e\s*0%,\s*#060912\s*100%\)["']/g, 'background: "linear-gradient(135deg, #ffffff 0%, #f8fafc 100%)"');
  content = content.replace(/border:\s*["']1px solid rgba\(255,\s*255,\s*255,\s*0\.08\)["']/g, 'border: "1px solid var(--border)"');
  content = content.replace(/color:\s*["']#f1f5f9["']/g, 'color: "var(--text)"');
  content = content.replace(/background:\s*["']rgba\(255,\s*255,\s*255,\s*0\.04\)["']/g, 'background: "var(--surface)"');
  content = content.replace(/border:\s*["']1px solid rgba\(255,\s*255,\s*255,\s*0\.08\)["']/g, 'border: "1px solid var(--border)"');
  content = content.replace(/border:\s*selectedAvatar === preset\.id\s*\?\s*["']3px solid #ffffff["']\s*:\s*["']2px solid rgba\(255,\s*255,\s*255,\s*0\.05\)["']/g, 'border: selectedAvatar === preset.id ? "3px solid var(--violet)" : "2px solid var(--border)"');
  content = content.replace(/background:\s*["']rgba\(0,\s*0,\s*0,\s*0\.3\)["']/g, 'background: "var(--surface)"');
  content = content.replace(/background:\s*["']rgba\(255,\s*255,\s*255,\s*0\.02\)["']/g, 'background: "var(--surface)"');
  content = content.replace(/border:\s*["']1px solid rgba\(255,\s*255,\s*255,\s*0\.04\)["']/g, 'border: "1px solid var(--border)"');
  content = content.replace(/color:\s*["']#64748b["']/g, 'color: "var(--dim)"');
  content = content.replace(/color:\s*["']#475569["']/g, 'color: "var(--muted)"');
  content = content.replace(/color:\s*["']#cbd5e1["']/g, 'color: "var(--text)"');
  content = content.replace(/color:\s*["']#94a3b8["']/g, 'color: "var(--muted)"');
  content = content.replace(/background:\s*["']rgba\(6,\s*9,\s*18,\s*0\.6\)["']/g, 'background: "rgba(255, 255, 255, 0.8)"');
  content = content.replace(/borderBottom:\s*["']1px solid rgba\(255,\s*255,\s*255,\s*0\.05\)["']/g, 'borderBottom: "1px solid var(--border)"');
  content = content.replace(/border:\s*["']1px solid rgba\(255,255,255,0\.1\)["']/g, 'border: "1px solid var(--border)"');
  content = content.replace(/border:\s*["']2px solid rgba\(255,255,255,0\.15\)["']/g, 'border: "2px solid var(--border)"');
  content = content.replace(/boxShadow:\s*["']0\s*24px\s*64px\s*rgba\(0,\s*0,\s*0,\s*0\.7\)["']/g, 'boxShadow: "0 8px 32px rgba(15, 23, 42, 0.06)"');

  await writeFile(file, content, "utf8");
  console.log("Successfully transformed Shared components!");
}

async function run() {
  await transformClient();
  await transformFinance();
  await transformSharedComponents();
  console.log("All three primary targets transformed successfully!");
}

run().catch(console.error);

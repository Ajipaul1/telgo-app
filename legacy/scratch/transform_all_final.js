import { readFile, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { readdir, stat } from "node:fs/promises";

async function walk(dir) {
  let results = [];
  const list = await readdir(dir);
  for (const file of list) {
    const filePath = join(dir, file);
    const s = await stat(filePath);
    if (s.isDirectory()) {
      if (file !== "node_modules" && file !== ".next" && file !== ".git") {
        results = results.concat(await walk(filePath));
      }
    } else if (file.endsWith(".tsx")) {
      results.push(filePath);
    }
  }
  return results;
}

async function run() {
  const root = "c:\\Users\\Elitebook\\OneDrive\\Documents\\GitHub\\telgo-app";
  const files = await walk(join(root, "src/app"));
  
  console.log(`Starting deep visual refactoring of ${files.length} pages...`);
  
  for (const file of files) {
    const relative = file.slice(root.length + 1);
    console.log(`Processing: ${relative}`);
    let content = await readFile(file, "utf8");
    const original = content;

    // 1. Convert hardcoded dark page/main backgrounds to light-theme gradients
    content = content.replace(/background:\s*["']linear-gradient\(160deg,\s*#0d0621\s*0%,\s*#060912\s*50%,\s*#040d1a\s*100%\)["']/g, 'background: "linear-gradient(165deg, #ffffff 0%, #f8fafc 50%, #f1f5f9 100%)"');
    content = content.replace(/background:\s*["']linear-gradient\(160deg,#0d0621,#060912,#040d1a\)["']/g, 'background: "linear-gradient(165deg, #ffffff 0%, #f8fafc 50%, #f1f5f9 100%)"');

    // 2. Fix unreplaced white/light slate text labels inside style objects
    content = content.replace(/color:\s*["']#f1f5f9["']/g, 'color: "var(--text)"');
    content = content.replace(/color:\s*["']#cbd5e1["']/g, 'color: "var(--muted)"');
    content = content.replace(/color:\s*["']#94a3b8["']/g, 'color: "var(--dim)"');
    content = content.replace(/color:\s*["']#e2e8f0["']/g, 'color: "var(--text)"');
    content = content.replace(/color:\s*["']#64748b["']/g, 'color: "var(--dim)"');
    content = content.replace(/color:\s*["']#475569["']/g, 'color: "var(--muted)"');
    content = content.replace(/color:\s*["']white["']/g, 'color: "var(--text)"');
    content = content.replace(/color:\s*["']#fff["']/g, 'color: "var(--text)"');

    // 3. Fix unreplaced transparent borders
    content = content.replace(/border:\s*["']1px solid rgba\(255,\s*255,\s*255,\s*0\.08\)["']/g, 'border: "1px solid var(--border)"');
    content = content.replace(/border:\s*["']1px solid rgba\(255,\s*255,\s*255,\s*0\.06\)["']/g, 'border: "1px solid var(--border)"');
    content = content.replace(/border:\s*["']1px solid rgba\(255,\s*255,\s*255,\s*0\.05\)["']/g, 'border: "1px solid var(--border)"');
    content = content.replace(/border:\s*["']1.5px solid rgba\(255,\s*255,\s*255,\s*0\.15\)["']/g, 'border: "1.5px solid var(--border)"');
    content = content.replace(/border:\s*["']1px solid rgba\(255,255,255,0\.1\)["']/g, 'border: "1px solid var(--border)"');
    content = content.replace(/border:\s*["']1px dashed rgba\(255,255,255,0\.15\)["']/g, 'border: "1px dashed var(--border)"');
    content = content.replace(/border:\s*["']2px solid rgba\(255,255,255,0\.1\)["']/g, 'border: "2px solid var(--border)"');
    content = content.replace(/background:\s*["']rgba\(255,255,255,0\.01\)["']/g, 'background: "var(--surface)"');
    content = content.replace(/background:\s*["']rgba\(255,255,255,0\.06\)["']/g, 'background: "var(--border)"');
    content = content.replace(/background:\s*["']rgba\(0,0,0,0\.3\)["']/g, 'background: "var(--surface)"');

    // 4. Fix high-contrast role request buttons in request-access
    content = content.replace(/border:\s*`1px solid \$\{role === r \?\s*["']rgba\(124,58,237,0\.6\)["']\s*:\s*["']rgba\(255,255,255,0\.08\)["']\}`/g, 'border: `1px solid ${role === r ? "var(--violet)" : "var(--border)"}`');
    content = content.replace(/background:\s*role === r \?\s*["']rgba\(124,58,237,0\.15\)["']\s*:\s*["']rgba\(0,0,0,0\.3\)["']/g, 'background: role === r ? "rgba(124,58,237,0.08)" : "var(--surface)"');
    content = content.replace(/color:\s*role === r \?\s*["']#c4b5fd["']\s*:\s*["']#64748b["']/g, 'color: role === r ? "var(--violet)" : "var(--muted)"');

    // 5. Fix unreplaced conditional/ternary colors in styles (e.g. isSelected, isShiftActive)
    content = content.replace(/color:\s*isSelected\s*\?\s*["']#a78bfa["']\s*:\s*["']#f1f5f9["']/g, 'color: isSelected ? "var(--violet)" : "var(--text)"');
    content = content.replace(/color:\s*isSelected\s*\?\s*["']#67e8f9["']\s*:\s*["']#cbd5e1["']/g, 'color: isSelected ? "var(--cyan)" : "var(--text)"');
    content = content.replace(/color:\s*isSelected\s*\?\s*["']#67e8f9["']\s*:\s*["']#f1f5f9["']/g, 'color: isSelected ? "var(--cyan)" : "var(--text)"');
    content = content.replace(/color:\s*isSelected\s*\?\s*["']#facc15["']\s*:\s*["']#cbd5e1["']/g, 'color: isSelected ? "#d97706" : "var(--text)"');
    content = content.replace(/color:\s*isSelected\s*\?\s*["']#facc15["']\s*:\s*["']#f1f5f9["']/g, 'color: isSelected ? "#d97706" : "var(--text)"');
    content = content.replace(/color:\s*isSelected\s*\?\s*["']#fbbf24["']\s*:\s*["']#cbd5e1["']/g, 'color: isSelected ? "#d97706" : "var(--text)"');
    content = content.replace(/color:\s*isSelected\s*\?\s*["']#fbbf24["']\s*:\s*["']#f1f5f9["']/g, 'color: isSelected ? "#d97706" : "var(--text)"');
    content = content.replace(/color:\s*isSelected\s*\?\s*["']#c4b5fd["']\s*:\s*["']#f1f5f9["']/g, 'color: isSelected ? "var(--violet)" : "var(--text)"');
    content = content.replace(/color:\s*isSelected\s*\?\s*["']#c4b5fd["']\s*:\s*["']#cbd5e1["']/g, 'color: isSelected ? "var(--violet)" : "var(--text)"');
    content = content.replace(/color:\s*isSelected\s*\?\s*["']#4ade80["']\s*:\s*["']#f1f5f9["']/g, 'color: isSelected ? "var(--green)" : "var(--text)"');
    content = content.replace(/color:\s*isSelected\s*\?\s*["']#4ade80["']\s*:\s*["']#cbd5e1["']/g, 'color: isSelected ? "var(--green)" : "var(--text)"');

    // 6. Fix bright yellow/amber, green, and red text colors on white backgrounds to high-contrast colors
    // We want #fbbf24 and #facc15 -> #d97706 (deep gold/amber)
    // We want #4ade80 and #86efac -> #15803d (deep green)
    // We want #fca5a5 and #f87171 -> #dc2626 (deep red)
    // We want #67e8f9 and #60a5fa -> #0284c7 (deep cyan)
    
    // Replace hex colors in styling props
    content = content.replace(/color:\s*["']#fbbf24["']/g, 'color: "#d97706"');
    content = content.replace(/color:\s*["']#facc15["']/g, 'color: "#d97706"');
    content = content.replace(/color:\s*["']#4ade80["']/g, 'color: "#15803d"');
    content = content.replace(/color:\s*["']#86efac["']/g, 'color: "#15803d"');
    content = content.replace(/color:\s*["']#fca5a5["']/g, 'color: "#dc2626"');
    content = content.replace(/color:\s*["']#f87171["']/g, 'color: "#dc2626"');
    content = content.replace(/color:\s*["']#67e8f9["']/g, 'color: "#0284c7"');
    content = content.replace(/color:\s*["']#60a5fa["']/g, 'color: "#2563eb"');

    // 7. Fix Roster Circle Avatars (L1938) - Make them beautiful premium light slate circles
    content = content.replace(/background:\s*["']linear-gradient\(135deg,\s*#1e293b,\s*#0f172a\)["']/g, 'background: "linear-gradient(135deg, #f8fafc, #e2e8f0)"');
    content = content.replace(/color:\s*roleColor\(u\.role\)/g, 'color: "var(--text)"');
    content = content.replace(/border:\s*`1.5px solid \$\{roleColor\(u\.role\)\}30`/g, 'border: "1px solid var(--border)"');

    // 8. Fix bottom dark analytics bar in Admin Hub (L1086/L1096 area)
    content = content.replace(/background:\s*["']rgba\(3,\s*4,\s*9,\s*0\.95\)["']/g, 'background: "var(--surface)"');
    content = content.replace(/border:\s*["']1px solid var\(--border\)["']\s*,\s*borderRadius:\s*16\s*,\s*overflow:\s*["']hidden["']\s*,\s*background:\s*["']#05070c["']/g, 'border: "1px solid var(--border)", borderRadius: 16, overflow: "hidden", background: "var(--bg)"');
    
    // 9. Fix SMTP Ready badge color for premium look
    content = content.replace(/color:\s*["']#22c55e["']/g, 'color: "#16a34a"');

    if (content !== original) {
      await writeFile(file, content, "utf8");
      console.log(`✅ Successfully updated: ${relative}`);
    }
  }
  
  console.log("Deep visual refactoring complete!");
}

run().catch(console.error);

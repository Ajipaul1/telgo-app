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
    } else if (file.endsWith(".tsx") || file.endsWith(".ts") || file.endsWith(".css")) {
      results.push(filePath);
    }
  }
  return results;
}

async function run() {
  const root = "c:\\Users\\Elitebook\\OneDrive\\Documents\\GitHub\\telgo-app";
  const files = await walk(join(root, "src"));
  
  let reportText = "=== TELGO HIGH-FIDELITY THEME AUDIT REPORT ===\n\n";
  
  for (const file of files) {
    const relative = file.slice(root.length + 1);
    const content = await readFile(file, "utf8");
    const lines = content.split("\n");
    const matches = [];
    
    lines.forEach((line, idx) => {
      const trimmed = line.trim();
      
      // Let's identify colors, backgrounds, borders, box-shadows, SVGs that might need high-fidelity light theme auditing
      const hasColorMatch = /color|background|border|shadow|fill|stroke|rgba/i.test(trimmed);
      
      if (hasColorMatch) {
        // Highlight styles that look like dark-mode leftovers or mismatching light theme accents
        const hasDarkHex = /#0609|#080b|#0d06|#040d|#0a0e|#0f08|#0e08|#0b0f|#1118|#1e29/i.test(trimmed);
        const hasWhiteRgba = /rgba\(\s*255\s*,\s*255\s*,\s*255/i.test(trimmed);
        const hasDarkRgba = /rgba\(\s*0\s*,\s*0\s*,\s*0\s*,\s*0\.[3-9]/i.test(trimmed);
        const hasLightTextAccent = /#67e8f9|#c4b5fd|#fca5a5|#fcd34d/i.test(trimmed);
        const hasOldBorder = /rgba\(\s*255\s*,\s*255\s*,\s*255\s*,\s*0\.0[2-9]/i.test(trimmed) || /rgba\(\s*255\s*,\s*255\s*,\s*255\s*,\s*0\.1/i.test(trimmed);
        const hasInlineBackground = /background:\s*["']rgba\(/i.test(trimmed);
        
        if (hasDarkHex || hasWhiteRgba || hasDarkRgba || hasLightTextAccent || hasOldBorder || hasInlineBackground) {
          matches.push({ lineNum: idx + 1, content: trimmed });
        }
      }
    });
    
    if (matches.length > 0) {
      reportText += `📄 File: ${relative} (${matches.length} matches)\n`;
      matches.forEach(m => {
        reportText += `  L${m.lineNum}: ${m.content}\n`;
      });
      reportText += "\n";
    }
  }
  
  await writeFile(join(root, "scratch/audit_report.txt"), reportText, "utf8");
  console.log("Audit complete. Report written to scratch/audit_report.txt");
}

run().catch(console.error);

import { readFile } from "node:fs/promises";
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
  
  console.log(`Auditing ${files.length} pages/components for unreplaced style properties...`);
  
  for (const file of files) {
    const relative = file.slice(root.length + 1);
    const content = await readFile(file, "utf8");
    const lines = content.split("\n");
    const issues = [];
    
    lines.forEach((line, idx) => {
      // Look for inline styles with hardcoded colors that were missed
      // (like color: "#cbd5e1", color: "#f1f5f9", background: "#060912", etc.)
      const trimmed = line.trim();
      
      // Let's identify React style properties
      if (trimmed.includes("style={{") || trimmed.includes("style={") || trimmed.includes("color:") || trimmed.includes("background:") || trimmed.includes("border:")) {
        const matchesDarkHex = /#0609|#080b|#0d06|#040d|#0a0e|#0f08|#0e08|#0b0f|#1118|#1e29/i.test(trimmed);
        const matchesLightHex = /#f1f5f9|#cbd5e1|#e2e8f0|#94a3b8|#64748b|#475569|white/i.test(trimmed);
        const matchesRgba = /rgba\(\s*255\s*,\s*255\s*,\s*255/i.test(trimmed) || /rgba\(\s*0\s*,\s*0\s*,\s*0\s*,\s*0\.[1-9]/i.test(trimmed);
        
        // Exclude svgs definitions that are meant to be white stroke/fill (like stroke="white" or fill="white") unless they are in style objects
        const isInlineStyle = trimmed.includes("style={{") || /color:|background:|border:/i.test(trimmed);
        
        if (isInlineStyle && (matchesDarkHex || matchesLightHex || matchesRgba)) {
          // Check if it has a color replacement target
          if (!trimmed.includes("btn-primary") && !trimmed.includes("back-btn") && !trimmed.includes("var(--text)") && !trimmed.includes("var(--bg)")) {
            issues.push({ lineNum: idx + 1, content: trimmed });
          }
        }
      }
    });
    
    if (issues.length > 0) {
      console.log(`\n📄 File: ${relative} (${issues.length} potential issues)`);
      issues.forEach(issue => {
        console.log(`  L${issue.lineNum}: ${issue.content}`);
      });
    }
  }
}

run().catch(console.error);

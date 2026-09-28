import { readFile } from "node:fs/promises";

const content = await readFile("src/app/app/supervisor/page.tsx", "utf8");
const lines = content.split("\n");

console.log("--- SEARCH RESULTS ---");
lines.forEach((line, idx) => {
  if (line.includes('type="file"') || line.includes("type='file'") || line.includes("type: 'file'") || line.includes("accept=")) {
    console.log(`Line ${idx + 1}: ${line.trim()}`);
  }
});

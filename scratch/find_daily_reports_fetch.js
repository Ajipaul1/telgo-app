import { readFile } from "node:fs/promises";
import { join } from "node:path";

async function run() {
  const root = "c:\\Users\\Elitebook\\OneDrive\\Documents\\GitHub\\telgo-app";
  const adminFile = join(root, "src/app/app/admin/page.tsx");
  const content = await readFile(adminFile, "utf8");
  
  const lines = content.split("\n");
  console.log("Searching for daily reports fetch or render logic in admin/page.tsx...");
  
  lines.forEach((line, idx) => {
    if (line.includes("No pending reports submitted") || line.includes("/api/mobile/daily-reports") || line.includes("Submitting Crew Roster")) {
      console.log(`L${idx + 1}: ${line.trim()}`);
    }
  });
}

run().catch(console.error);

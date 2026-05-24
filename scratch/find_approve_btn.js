import { readFile } from "node:fs/promises";
import { join } from "node:path";

async function run() {
  const root = "c:\\Users\\Elitebook\\OneDrive\\Documents\\GitHub\\telgo-app";
  const adminFile = join(root, "src/app/app/admin/page.tsx");
  const content = await readFile(adminFile, "utf8");
  
  const lines = content.split("\n");
  console.log("Searching for Approve & Lock button inside admin/page.tsx...");
  
  lines.forEach((line, idx) => {
    if (line.includes("Approve & Lock") || line.includes("handleApproveDailyReport")) {
      console.log(`L${idx + 1}: ${line.trim()}`);
    }
  });
}

run().catch(console.error);

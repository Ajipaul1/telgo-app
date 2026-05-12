import fs from "node:fs/promises";
import path from "node:path";

const accessToken = process.env.SUPABASE_ACCESS_TOKEN;
const projectRef = process.env.SUPABASE_PROJECT_REF ?? "qujinbsslmyaltfgsjzb";
const migrations = [
  "20260510134500_operational_workflow_extensions.sql",
  "20260512103000_mobile_access_gate.sql"
].map((fileName) => path.join(process.cwd(), "supabase", "migrations", fileName));

if (!accessToken) {
  console.error("SUPABASE_ACCESS_TOKEN is required.");
  process.exit(1);
}

const query = (await Promise.all(migrations.map((migrationPath) => fs.readFile(migrationPath, "utf8"))))
  .join("\n\n");
const response = await fetch(`https://api.supabase.com/v1/projects/${projectRef}/database/query`, {
  method: "POST",
  headers: {
    Authorization: `Bearer ${accessToken}`,
    "Content-Type": "application/json"
  },
  body: JSON.stringify({ query })
});

const text = await response.text();
if (!response.ok) {
  console.error(`Supabase schema update failed: ${response.status}`);
  console.error(text);
  process.exit(1);
}

console.log("Supabase operational schema update applied.");
if (text.trim()) console.log(text);

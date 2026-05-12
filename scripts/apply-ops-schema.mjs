import fs from "node:fs/promises";
import path from "node:path";

await loadLocalEnv();

const accessToken = process.env.SUPABASE_ACCESS_TOKEN;
const projectRef = process.env.SUPABASE_PROJECT_REF ?? "qujinbsslmyaltfgsjzb";
const migrations = [
  "20260510134500_operational_workflow_extensions.sql",
  "20260510180000_mobile_mvp_users.sql",
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

async function loadLocalEnv() {
  const envPath = path.join(process.cwd(), ".env.local");
  const content = await fs.readFile(envPath, "utf8").catch(() => "");
  for (const line of content.split(/\r?\n/)) {
    const match = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/);
    if (!match) continue;
    const [, key, rawValue] = match;
    if (process.env[key]) continue;
    process.env[key] = rawValue.replace(/^['"]|['"]$/g, "");
  }
}

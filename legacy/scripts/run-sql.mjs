import fs from "node:fs/promises";
import path from "node:path";

await loadLocalEnv();

const accessToken = process.env.SUPABASE_ACCESS_TOKEN;
const projectRef = process.env.SUPABASE_PROJECT_REF ?? "qujinbsslmyaltfgsjzb";

if (!accessToken) {
  console.error("Error: SUPABASE_ACCESS_TOKEN is not defined in .env.local");
  process.exit(1);
}

// Get query from command line arguments
const query = process.argv.slice(2).join(" ").trim();

if (!query) {
  console.error("Usage: node scripts/run-sql.mjs \"YOUR SQL QUERY HERE\"");
  process.exit(1);
}

console.log(`Executing SQL Query on project '${projectRef}'...`);

const response = await fetch(`https://api.supabase.com/v1/projects/${projectRef}/database/query`, {
  method: "POST",
  headers: {
    Authorization: `Bearer ${accessToken}`,
    "Content-Type": "application/json"
  },
  body: JSON.stringify({ query })
});

const result = await response.json();
if (!response.ok) {
  console.error(`Error: Query failed with status ${response.status}`);
  console.error(JSON.stringify(result, null, 2));
  process.exit(1);
}

if (Array.isArray(result)) {
  if (result.length === 0) {
    printSuccess("Query completed successfully. Empty result set (0 rows).");
  } else {
    printSuccess(`Query completed successfully (${result.length} rows returned):`);
    console.table(result);
  }
} else {
  printSuccess("Query completed successfully. Result:");
  console.log(result);
}

function printSuccess(msg) {
  console.log(`\x1b[32m✓ ${msg}\x1b[0m`);
}

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

const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

// Load .env.local manually
const envText = fs.readFileSync(".env.local", "utf8");
const env = Object.fromEntries(
  envText.split("\n")
    .map(line => line.trim())
    .filter(line => line && !line.startsWith("#"))
    .map(line => {
      const idx = line.indexOf("=");
      return [line.slice(0, idx).trim(), line.slice(idx + 1).trim().replace(/^"|\"$/g, "")];
    })
);

const SUPABASE_URL = env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_KEY = env.SUPABASE_SECRET_KEY ?? env.SUPABASE_SERVICE_ROLE_KEY ?? env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;

if (!SUPABASE_URL || !SUPABASE_KEY) {
  console.error("ERROR: Missing Supabase credentials in .env.local");
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY, {
  auth: { persistSession: false, autoRefreshToken: false }
});

async function run() {
  console.log("Querying pending_daily_reports...");
  const { data: reports, error: reportsErr } = await supabase
    .from("pending_daily_reports")
    .select("*");

  if (reportsErr) {
    console.error("Error reading pending_daily_reports:", reportsErr);
  } else {
    console.log(`Found ${reports.length} reports in DB:`);
    reports.forEach(r => {
      console.log(`- ID: ${r.id}, Supervisor: ${r.supervisor_name}, Project: ${r.project_id}, Date: ${r.report_date}, Status: ${r.status}`);
    });
  }

  console.log("\nQuerying master_project_ledger...");
  const { data: ledger, error: ledgerErr } = await supabase
    .from("master_project_ledger")
    .select("*");

  if (ledgerErr) {
    console.error("Error reading master_project_ledger:", ledgerErr);
  } else {
    console.log(`Found ${ledger.length} ledger rows in DB:`);
    ledger.forEach(l => {
      console.log(`- ID: ${l.id}, Project: ${l.project_id}, Date: ${l.ledger_date}, Labor: ${l.total_labor_count}, Wages: ${l.total_wages}`);
    });
  }
}

run();

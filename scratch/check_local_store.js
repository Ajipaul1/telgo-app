const fs = require('fs');
const path = require('path');
const os = require('os');

const STORE_PATH = path.join(os.tmpdir(), "telgo-reports-store.json");
console.log("Store path:", STORE_PATH);

if (!fs.existsSync(STORE_PATH)) {
  console.log("Local store file does not exist.");
  process.exit(0);
}

try {
  const content = fs.readFileSync(STORE_PATH, 'utf8');
  const store = JSON.parse(content);
  console.log(`Found ${store.reports?.length ?? 0} reports in local store:`);
  store.reports?.forEach((r, idx) => {
    console.log(`Report #${idx + 1}:`);
    console.log(`- ID: ${r.id}`);
    console.log(`- Date: ${r.reportDate}`);
    console.log(`- Project: ${r.projectId}`);
    console.log(`- Supervisor: ${r.supervisorName}`);
    console.log(`- Status: ${r.status}`);
  });

  console.log(`\nFound ${store.ledger?.length ?? 0} ledger rows in local store:`);
  store.ledger?.forEach((l, idx) => {
    console.log(`Ledger #${idx + 1}:`);
    console.log(`- Project: ${l.projectId}`);
    console.log(`- Date: ${l.ledgerDate}`);
    console.log(`- Labor Count: ${l.totalLaborCount}`);
    console.log(`- Total Wages: ${l.totalWages}`);
  });
} catch (e) {
  console.error("Error reading local store:", e);
}

// Applies supabase/rebuild/*.sql to the LOCAL test database only (Docker, 127.0.0.1:54322).
// Refuses any other address, so it can never touch the live database.
import fs from "node:fs";
import path from "node:path";
import pg from "pg";

const url = process.env.LOCAL_DB_URL ?? "postgresql://postgres:postgres@127.0.0.1:54322/postgres";
if (!/@(127\.0\.0\.1|localhost):54322\//.test(url)) {
  console.error("Refusing: apply-local only runs against the local test database (127.0.0.1:54322).");
  process.exit(1);
}
const dir = path.resolve(import.meta.dirname, "../../supabase/rebuild");
const files = fs.readdirSync(dir).filter((f) => /^\d{4}_.+\.sql$/.test(f)).sort();

const client = new pg.Client({ connectionString: url });
await client.connect();
let failed = false;
for (const f of files) {
  const sql = fs.readFileSync(path.join(dir, f), "utf8");
  const t = Date.now();
  try {
    await client.query(sql);
    console.log(`ok   ${f} (${Date.now() - t} ms)`);
  } catch (e) {
    failed = true;
    console.error(`FAIL ${f}: ${e.message}${e.position ? ` at char ${e.position}` : ""}`);
    if (e.position) {
      const p = Number(e.position);
      console.error("  near: " + sql.slice(Math.max(0, p - 160), p + 60).replace(/\s+/g, " "));
    }
    break;
  }
}
// PostgREST reads the schema at start; tell it the schema changed
await client.query("notify pgrst, 'reload schema'").catch(() => {});
await client.end();
process.exit(failed ? 1 : 0);

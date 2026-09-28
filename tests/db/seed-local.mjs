// Fills the LOCAL test database (Docker, 127.0.0.1:54322) with test logins and projects, including
// data shaped like the old app's (a legacy password hash, an old report, old attendance marks),
// so the tests prove old rows still show correctly. Refuses any other database.
import crypto from "node:crypto";
import pg from "pg";

const url = process.env.LOCAL_DB_URL ?? "postgresql://postgres:postgres@127.0.0.1:54322/postgres";
if (!/@(127\.0\.0\.1|localhost):54322\//.test(url)) { console.error("Refusing: local test database only."); process.exit(1); }

export const PASSWORDS = {
  admin: "Local#Admin2026", admin2: "Local#Admin2027", sup1: "Local#Site2026", sup2: "Local#Site2027", eng: "Local#Eng2026",
  fin: "Local#Money2026", client: "Local#Client2026", legacy: "oldpass123", blocked: "Local#Blocked26",
};

function scrypt(pw) {
  const salt = crypto.randomBytes(16);
  const key = crypto.scryptSync(pw, salt, 32, { N: 16384, r: 8, p: 1, maxmem: 64 * 1024 * 1024 });
  return `scrypt$16384$8$1$${salt.toString("base64url")}$${key.toString("base64url")}`;
}
const legacy = (email, pw) => crypto.createHash("sha256").update(`${email}:${pw}`).digest("hex");

export const IDS = {
  admin: "a0000000-0000-4000-8000-000000000001", admin2: "a0000000-0000-4000-8000-000000000002",
  sup1: "b0000000-0000-4000-8000-000000000001", sup2: "b0000000-0000-4000-8000-000000000002", eng: "b0000000-0000-4000-8000-000000000003",
  fin: "c0000000-0000-4000-8000-000000000001", client: "d0000000-0000-4000-8000-000000000001",
  legacy: "e0000000-0000-4000-8000-000000000001", blocked: "e0000000-0000-4000-8000-000000000002", pending: "e0000000-0000-4000-8000-000000000003",
};

export async function seed() {
  const c = new pg.Client({ connectionString: url });
  await c.connect();
  await c.query("begin");
  await c.query("set local app.allow_hard_delete = 'on'");
  // a clean slate every time (this is the local test database)
  for (const t of ["inventory_changes", "site_materials", "chat_messages", "chat_members", "chat_threads", "push_subscriptions", "report_clarification_messages",
    "pending_daily_reports", "mobile_live_locations", "mobile_attendance", "mobile_notifications", "project_access", "app_sessions", "login_attempts",
    "app_files", "rate_events", "app_error_log", "projects", "mobile_app_users"]) {
    await c.query(`delete from public.${t}`);
  }
  await c.query("alter table public.audit_log disable trigger trg_audit_guard");
  await c.query("delete from public.audit_log");
  await c.query("alter table public.audit_log enable trigger trg_audit_guard");

  const users = [
    [IDS.admin, "Admin Local", "admin@telgo.local", "admin", "TLG-ADMIN1", "active", scrypt(PASSWORDS.admin), false],
    [IDS.admin2, "Second Admin", "admin2@telgo.local", "admin", "TLG-ADMIN2", "active", scrypt(PASSWORDS.admin2), false],
    [IDS.sup1, "Anish Site", "sup1@telgo.local", "supervisor", "TLG-SUP00001", "active", scrypt(PASSWORDS.sup1), false],
    [IDS.sup2, "Ebin Site", "sup2@telgo.local", "supervisor", "TLG-SUP00002", "active", scrypt(PASSWORDS.sup2), false],
    [IDS.eng, "Engineer Local", "eng@telgo.local", "engineer", "TLG-ENG00001", "active", scrypt(PASSWORDS.eng), false],
    [IDS.fin, "Accounts Local", "fin@telgo.local", "finance", "TLG-FIN00001", "active", scrypt(PASSWORDS.fin), false],
    [IDS.client, "KSEB Client", "client@telgo.local", "client", "TLG-CLI00001", "active", scrypt(PASSWORDS.client), false],
    [IDS.legacy, "Old Login", "legacy@telgo.local", "supervisor", "TLG-OLD00001", "active", legacy("legacy@telgo.local", PASSWORDS.legacy), false],
    [IDS.blocked, "Blocked Person", "blocked@telgo.local", "supervisor", "TLG-BLK00001", "blocked", scrypt(PASSWORDS.blocked), false],
    [IDS.pending, "Waiting Person", "pending@telgo.local", "finance", "TLG-PND00001", "pending", null, false],
  ];
  for (const u of users) {
    await c.query(`insert into public.mobile_app_users (id, full_name, email, role, login_id, access_status, password_hash, must_change_password, blocked_at, activated_at)
      values ($1,$2,$3,$4,$5,$6,$7,$8, case when $6 = 'blocked' then now() end, now())`, u);
  }
  // a project the old app saved (route in corridor_data, [lat,lng]) and one drawn in the new editor
  await c.query(`insert into public.projects (id, code, name, client_name, location, district, status, budget, total_length_km, corridor_data, site_radius_m)
    values ('prj-6133', 'PRJ-01', 'MOSC-KOLANCHERY', 'Reliable Infra Pvt. Ltd.', 'Kolenchery, Ernakulam', 'Ernakulam', 'on_track', 12800000, 18.6,
      '{"startLabel":"Kolenchery junction","endLabel":"MOSC substation","startCoords":[9.9812,76.4731],"endCoords":[9.9905,76.4862],"middlePoints":[[9.9851,76.4790]]}', 300)`);
  await c.query(`insert into public.projects (id, code, name, client_name, location, district, status, budget, total_length_km, route, start_label, end_label, site_radius_m, standard_wage)
    values ('rdss-imperial', 'TLGO-PRJ-2025-0094', 'RDSS Imperial Kannur', 'KSEB RDSS', 'Kannur town', 'Kannur', 'active', 19800000, 11.2,
      '[[11.8745,75.3704],[11.8780,75.3750],[11.8815,75.3802]]', 'Imperial junction', 'Thavakkara', 250, 900)`);
  // a client sees one shared project
  await c.query(`insert into public.project_access (user_id, project_id, granted_by) values ($1, 'prj-6133', $2)`, [IDS.client, IDS.admin]);

  // an old-app report (lists inside stock_available.richDetails, a picture inside the row), for a sample project that doesn't exist
  const dot = "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==";
  const rich = { richDetails: { workerWageRate: 900, laborWagesNarration: "Six workers", otWorkers: [{ workerCount: 2, hours: 1.5, rate: 150, narration: "evening" }],
    fuelExpensesList: [{ amount: "1200", narration: "diesel for JCB", billImage: dot }], travelExpensesList: [], roomRentList: [], toolRentList: [], otherExpensesList: [],
    wipProgressList: { trenching: { value: 80, narration: "near school", photo: dot, path: [[9.9812, 76.4731], [9.9820, 76.4740]] }, hdd: { value: 0 } },
    requestsAndNotes: { dailyWorkReport: "Trench along the road", problems: "Rain after 3 pm", plans: "Cable laying" } } };
  const today = new Date().toLocaleDateString("en-CA", { timeZone: "Asia/Kolkata" });
  await c.query(`alter table public.pending_daily_reports disable trigger trg_report_rules`);
  await c.query(`insert into public.pending_daily_reports (id, report_date, project_id, supervisor_id, supervisor_name, labor_count, ot_hours, calculated_wages, fuel_expenses,
      excavation_length, stock_available, clearances, status, created_at)
    values ('f0000000-0000-4000-8000-000000000001', ($1::date - 20), 'PRV-EDP-001', $2, 'Anish Site', 6, 3, 5850, 1200, 80, $3, '{"PWD":{"status":"Demand Note Issued","receipt":""}}', 'approved', now() - interval '20 days')`,
    [today, IDS.sup1, JSON.stringify(rich)]);
  await c.query(`alter table public.pending_daily_reports enable trigger trg_report_rules`);
  // old-app attendance marks: a sign-in row, a ping row, and a separate "checked_out" row, 3 days ago from 8 am India time
  // (so the day never crosses midnight, whatever time the tests run)
  for (const [status, mins] of [["checked_in", 0], ["checked_in", 90], ["checked_out", 540]]) {
    await c.query(`insert into public.mobile_attendance (mobile_user_id, user_name, user_login_id, user_role, project_id, project_name, check_in_at, latitude, longitude, distance_from_site_m, within_geofence, status)
      values ($1, 'Anish Site', 'TLG-SUP00001', 'supervisor', 'vadakkekotta-sn-cable', 'Vadakkekotta Sn-Cable Corridor', ((date_trunc('day', now() at time zone 'Asia/Kolkata') - interval '3 days' + interval '8 hours') at time zone 'Asia/Kolkata') + make_interval(mins => $2), 9.98, 76.47, 12, true, $3)`,
      [IDS.sup1, mins, status]);
  }
  await c.query("commit");
  await c.end();
}

if (import.meta.url === `file:///${process.argv[1].replace(/\\/g, "/")}` || process.argv[1]?.endsWith("seed-local.mjs")) {
  seed().then(() => console.log("local test data ready"), (e) => { console.error(e.message); process.exit(1); });
}

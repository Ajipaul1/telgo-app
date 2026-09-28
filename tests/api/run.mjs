// API TRUTH TESTS (RULES.md section 11): every security layer and truth rule, as real requests to the
// app (http://127.0.0.1:3000) with the LOCAL test database behind it. The database is reset first.
// node tests/api/run.mjs   (the app must be running: npm run dev)
import pg from "pg";
import crypto from "node:crypto";
import { seed, IDS, PASSWORDS } from "../db/seed-local.mjs";

const BASE = process.env.TELGO_BASE ?? "http://127.0.0.1:3000";
const DB = process.env.LOCAL_DB_URL ?? "postgresql://postgres:postgres@127.0.0.1:54322/postgres";
if (!/127\.0\.0\.1|localhost/.test(BASE) || !/@(127\.0\.0\.1|localhost):54322\//.test(DB)) { console.error("Refusing: local app and local test database only."); process.exit(1); }

const db = new pg.Client({ connectionString: DB });
const q = async (sql, params = []) => (await db.query(sql, params)).rows;

// ---------- a tiny test runner ----------
const results = [];
let group = "";
async function t(name, fn) {
  const at = Date.now();
  try { await fn(); results.push({ group, name, ok: true, ms: Date.now() - at }); process.stdout.write("."); }
  catch (e) { results.push({ group, name, ok: false, why: e.message }); process.stdout.write("F"); }
}
const eq = (a, b, what = "value") => { if (JSON.stringify(a) !== JSON.stringify(b)) throw new Error(`${what}: expected ${JSON.stringify(b)}, got ${JSON.stringify(a)}`); };
const ok = (c, what) => { if (!c) throw new Error(what); };
const has = (s, part, what = "message") => { if (!String(s ?? "").toLowerCase().includes(part.toLowerCase())) throw new Error(`${what}: "${s}" doesn't say "${part}"`); };

// ---------- a phone with its own cookie ----------
class Phone {
  constructor(name) { this.name = name; this.cookie = ""; }
  async req(method, path, body, opts = {}) {
    const headers = { Origin: opts.origin ?? BASE };
    if (opts.noOrigin) { delete headers.Origin; if (opts.fetchSite) headers["Sec-Fetch-Site"] = opts.fetchSite; }
    if (this.cookie) headers.Cookie = this.cookie;
    let payload;
    if (body instanceof FormData) payload = body;
    else if (body !== undefined) { headers["Content-Type"] = "application/json"; payload = JSON.stringify(body); }
    if (opts.host) headers["X-Forwarded-Host"] = opts.host;
    const r = await fetch(BASE + path, { method, headers, body: payload, redirect: "manual" });
    const set = r.headers.getSetCookie?.() ?? [];
    for (const c of set) {
      const m = /^telgo_sid=([^;]*)/.exec(c);
      if (m) this.cookie = m[1] ? `telgo_sid=${m[1]}` : "";
    }
    let json = null;
    try { json = await r.json(); } catch { /* not json */ }
    return { status: r.status, json, headers: r.headers };
  }
  get(p, o) { return this.req("GET", p, undefined, o); }
  post(p, b = {}, o) { return this.req("POST", p, b, o); }
  patch(p, b = {}, o) { return this.req("PATCH", p, b, o); }
}
async function signIn(id, pw) {
  const p = new Phone(id);
  const r = await p.post("/api/auth/sign-in", { identifier: id, password: pw });
  if (r.status !== 200) throw new Error(`sign-in ${id}: ${r.status} ${JSON.stringify(r.json)}`);
  p.resume = r.json.resume;
  return p;
}
const ON_ROUTE = { lat: 9.98315, lng: 76.47605, accuracy: 10 };   // on the MOSC-KOLANCHERY route
const FAR = { lat: 10.05, lng: 76.30, accuracy: 20 };              // ~20 km away
const JPEG = Buffer.from("/9j/4AAQSkZJRgABAQEASABIAAD/2wBDAP//////////////////////////////////////////////////////////////////////////////////////wgALCAABAAEBAREA/8QAFBABAAAAAAAAAAAAAAAAAAAAAP/aAAgBAQABPxA=", "base64");
const ref = () => crypto.randomUUID();
const today = () => new Date().toLocaleDateString("en-CA", { timeZone: "Asia/Kolkata" });
const dayMinus = (n) => { const d = new Date(today() + "T00:00:00Z"); d.setUTCDate(d.getUTCDate() - n); return d.toISOString().slice(0, 10); };
async function upload(phone, kind, bytes = JPEG, name = "p.jpg", type = "image/jpeg") {
  const f = new FormData();
  f.append("file", new Blob([bytes], { type }), name);
  f.append("kind", kind);
  return phone.req("POST", "/api/files", f);
}
const notes = (userId) => q("select title, body, link, notification_type, is_test from mobile_notifications where recipient_user_id = $1 order by created_at", [userId]);

// a full report body (what the phone sends)
const bodyFor = (billId, photoId) => ({
  crew: { workers: 6, wageRate: 900, wagesNote: "six workers", ot: [{ workers: 2, hours: 1.5, rate: 150, note: "evening" }] },
  expenses: [
    { id: "e1", category: "fuel", amount: 1200, name: "", note: "diesel", bill: billId ? { fileId: billId } : null },
    { id: "e2", category: "room", amount: 800, name: "", note: "lodge", bill: null },
    { id: "e3", category: "other", amount: 150.5, name: "tea", note: "", bill: null },
  ],
  work: [
    { key: "trenching", value: 80, note: "near school", photos: photoId ? [{ fileId: photoId }] : [], route: [[9.9812, 76.4731], [9.9820, 76.4740]] },
    { key: "hdd", value: 0, note: "", photos: [], route: [] },
    { key: "joints", value: 2, note: "", photos: [], route: [] },
  ],
  hdd: { machine: "XCMG 180", vendor: "V", tracker: "T", operator: "O", ducts: "2 red", rodLengthM: 3, rods: [{ pitch: "-10", depth: "1.2", strata: "Clay", crossing: "" }, { pitch: "0", depth: "1.5", strata: "Sand", crossing: "road" }] },
  clearances: [{ agency: "PWD", status: "demand_note", note: "", receipt: null }],
  notes: { workDone: "Trench along the road", problems: "Rain", plans: "Cable laying", moneyNeeded: null, moneyReason: "", moneyReceipt: null, toAdmin: "" },
});

// ===================================================================================================
await db.connect();
console.log("Resetting the local test database…");
await seed();
let admin, sup1, sup2, fin, client;

group = "1. The public key has no rights";
const anonKey = (() => {
  const b64 = (o) => Buffer.from(JSON.stringify(o)).toString("base64url");
  const h = b64({ alg: "HS256", typ: "JWT" }), p = b64({ iss: "supabase-demo", role: "anon", exp: 1983812996 });
  return `${h}.${p}.${crypto.createHmac("sha256", "super-secret-jwt-token-with-at-least-32-characters-long").update(`${h}.${p}`).digest("base64url")}`;
})();
for (const table of ["mobile_app_users", "pending_daily_reports", "app_sessions", "audit_log", "site_materials", "chat_messages", "v_ledger_daily"]) {
  await t(`anon can't read ${table}`, async () => {
    const r = await fetch(`http://127.0.0.1:54321/rest/v1/${table}?select=*&limit=1`, { headers: { apikey: anonKey, Authorization: `Bearer ${anonKey}` } });
    ok([401, 403].includes(r.status), `status ${r.status}`);
  });
}
await t("anon can't make itself admin", async () => {
  const r = await fetch("http://127.0.0.1:54321/rest/v1/mobile_app_users", { method: "POST", headers: { apikey: anonKey, Authorization: `Bearer ${anonKey}`, "Content-Type": "application/json" }, body: JSON.stringify({ full_name: "x", role: "admin", access_status: "active" }) });
  ok([401, 403].includes(r.status), `status ${r.status}`);
});
await t("anon can't call database functions", async () => {
  const r = await fetch("http://127.0.0.1:54321/rest/v1/rpc/telgo_purge_trash", { method: "POST", headers: { apikey: anonKey, Authorization: `Bearer ${anonKey}`, "Content-Type": "application/json" }, body: "{}" });
  ok([401, 403, 404].includes(r.status), `status ${r.status}`);
});

group = "2. Sign-in and sessions";
await t("wrong password: plain words, tries left, attempt recorded", async () => {
  const r = await new Phone().post("/api/auth/sign-in", { identifier: "TLG-SUP00002", password: "nope" });
  eq(r.status, 401, "status"); has(r.json.error.message, "4 tries left");
  const a = await q("select ok, reason from login_attempts where identifier = 'tlg-sup00002' order by at desc limit 1");
  eq(a[0], { ok: false, reason: "wrong_password" }, "attempt");
});
await t("unknown login gets the same words (no hint that it doesn't exist)", async () => {
  const r = await new Phone().post("/api/auth/sign-in", { identifier: "TLG-NOBODY", password: "x" });
  eq(r.status, 401); has(r.json.error.message, "is wrong");
});
await t("5 wrong passwords lock the login, even the right password is refused", async () => {
  for (let i = 0; i < 4; i++) await new Phone().post("/api/auth/sign-in", { identifier: "TLG-SUP00002", password: "nope" + i });
  const r = await new Phone().post("/api/auth/sign-in", { identifier: "TLG-SUP00002", password: PASSWORDS.sup2 });
  eq(r.status, 423, "status"); has(r.json.error.message, "locked");
  await q("delete from login_attempts where identifier = 'tlg-sup00002'"); // unlock for the rest of the suite
});
await t("an old-style password works once and is upgraded to scrypt", async () => {
  const p = await signIn("legacy@telgo.local", PASSWORDS.legacy);
  ok(p.cookie, "cookie set");
  const h = await q("select password_hash from mobile_app_users where id = $1", [IDS.legacy]);
  ok(h[0].password_hash.startsWith("scrypt$"), "hash upgraded");
  const again = await signIn("TLG-OLD00001", PASSWORDS.legacy);
  ok(again.cookie, "signs in again with the upgraded hash");
});
await t("a blocked login is refused with the reason", async () => {
  const r = await new Phone().post("/api/auth/sign-in", { identifier: "TLG-BLK00001", password: PASSWORDS.blocked });
  eq(r.status, 403); has(r.json.error.message, "blocked");
});
await t("no master password exists", async () => {
  const r = await new Phone().post("/api/auth/sign-in", { identifier: "ajipaul96@gmail.com", password: "god" + "islove" });
  eq(r.status, 401);
  eq((await q("select count(*)::int n from mobile_app_users where lower(email) = 'ajipaul96@gmail.com'"))[0].n, 0, "no account made");
});
admin = await signIn("TLG-ADMIN1", PASSWORDS.admin);
sup1 = await signIn("TLG-SUP00001", PASSWORDS.sup1);
sup2 = await signIn("sup2@telgo.local", PASSWORDS.sup2);
fin = await signIn("TLG-FIN00001", PASSWORDS.fin);
client = await signIn("TLG-CLI00001", PASSWORDS.client);
await t("the cookie is httpOnly and SameSite", async () => {
  const r = await fetch(BASE + "/api/auth/sign-in", { method: "POST", headers: { Origin: BASE, "Content-Type": "application/json" }, body: JSON.stringify({ identifier: "TLG-ENG00001", password: PASSWORDS.eng }) });
  const c = (r.headers.getSetCookie?.() ?? []).find((x) => x.startsWith("telgo_sid=")) ?? "";
  ok(/HttpOnly/i.test(c) && /SameSite=lax/i.test(c), c);
});
await t("the database stores only the hash of the session ticket", async () => {
  const raw = sup1.cookie.split("=")[1];
  eq((await q("select count(*)::int n from app_sessions where token_hash = $1", [raw]))[0].n, 0, "raw ticket stored");
  eq((await q("select count(*)::int n from app_sessions where token_hash = $1", [crypto.createHash("sha256").update(raw).digest("hex")]))[0].n, 1, "hash stored");
});
await t("blocking a person signs them out at their next tap", async () => {
  const victim = await signIn("TLG-ENG00001", PASSWORDS.eng);
  eq((await victim.get("/api/me")).status, 200);
  const r = await admin.post(`/api/team/people/${IDS.eng}/action`, { action: "block", reason: "test" });
  eq(r.status, 200, "block");
  const after = await victim.get("/api/me");
  eq(after.status, 401); eq(after.json.error.reason, "blocked", "reason");
  await admin.post(`/api/team/people/${IDS.eng}/action`, { action: "unblock" });
});
await t("sign out ends the session on the server", async () => {
  const p = await signIn("TLG-ENG00001", PASSWORDS.eng);
  const cookie = p.cookie;
  await p.post("/api/auth/sign-out", {});
  const reuse = new Phone(); reuse.cookie = cookie;
  eq((await reuse.get("/api/me")).status, 401);
});
await t("the resume ticket restores a lost cookie once, and changes each time", async () => {
  const p = await signIn("TLG-ENG00001", PASSWORDS.eng);
  const lost = new Phone();
  const r = await lost.post("/api/auth/resume", { resume: p.resume });
  eq(r.status, 200); ok(lost.cookie, "new cookie");
  eq((await lost.get("/api/me")).status, 200);
  eq((await new Phone().post("/api/auth/resume", { resume: p.resume })).status, 401, "old ticket reused");
});
await t("a change from another website is refused (Origin)", async () => {
  const r = await admin.post("/api/projects", { name: "x" }, { origin: "https://evil.example" });
  eq(r.status, 403); has(r.json.error.message, "didn't come from the Telgo app");
});
await t("a cross-site request without Origin is refused", async () => {
  const r = await admin.post("/api/projects", { name: "x" }, { noOrigin: true, fetchSite: "cross-site" });
  eq(r.status, 403);
});
await t("roles: a supervisor can't open the team list", async () => {
  const r = await sup1.get("/api/team/people");
  eq(r.status, 403); has(r.json.error.message, "can't open");
});
await t("the old open routes are gone", async () => {
  for (const p of ["/api/mobile/check-db", "/api/mobile/sign-in", "/api/mobile/me"]) ok([404, 405].includes((await new Phone().get(p)).status), p);
});
await t("a Host header of localhost gives no rights", async () => {
  const r = await new Phone().get("/api/projects", { host: "localhost" });
  eq(r.status, 401);
});
await t("a new login must change its temporary password first", async () => {
  const r = await admin.post("/api/team/people", { fullName: "New Person", email: "new@telgo.local", role: "supervisor" });
  eq(r.status, 200); ok(r.json.tempPassword?.length === 10, "temp password");
  const p = await signIn("new@telgo.local", r.json.tempPassword);
  const blocked = await p.get("/api/home");
  eq(blocked.status, 403); eq(blocked.json.error.code, "CHANGE_PASSWORD");
  eq((await p.post("/api/auth/change-password", { current: r.json.tempPassword, next: "short" })).status, 400, "short refused");
  eq((await p.post("/api/auth/change-password", { current: r.json.tempPassword, next: "Brand#New2026" })).status, 200, "changed");
  eq((await p.get("/api/home")).status, 200, "now allowed");
});
await t("the public access form can't ask for admin", async () => {
  const r = await new Phone().post("/api/auth/request-access", { fullName: "Hacker", email: "h@x.local", role: "admin" });
  eq(r.status, 400);
});
await t("an access request tells the admins (made by the database)", async () => {
  const r = await new Phone().post("/api/auth/request-access", { fullName: "Asha Field", email: "asha@telgo.local", role: "supervisor", note: "new site" });
  eq(r.status, 200);
  const n = await notes(IDS.admin);
  ok(n.some((x) => x.title === "New access request" && x.body.includes("Asha Field")), "admin notified");
});

group = "3. Attendance: sign in, sign out, 12 hours";
await t("not signed in at a site: sending a report is refused (owner's rule)", async () => {
  const r = await sup2.post("/api/reports", { ref: ref(), projectId: "prj-6133", reportDate: today(), body: bodyFor() });
  eq(r.status, 403); eq(r.json.error.code, "NEED_SHIFT");
});
let shift1;
await t("sign in on the route: at the site, distance measured by the server", async () => {
  const r = await sup1.post("/api/attendance/sign-in", { projectId: "prj-6133", ...ON_ROUTE, ref: ref() });
  eq(r.status, 200); shift1 = r.json.shift;
  ok(shift1.inWithin === true && shift1.inDistanceM <= 5, `distance ${shift1.inDistanceM}`);
  eq(shift1.state, "open");
});
await t("the exact GPS position is stored (7 decimals, not rounded)", async () => {
  const r = (await q("select latitude::float lat, longitude::float lng from mobile_attendance where id = $1", [shift1.id]))[0];
  eq([r.lat, r.lng], [ON_ROUTE.lat, ON_ROUTE.lng], "position");
});
await t("a second sign-in is refused while signed in", async () => {
  const r = await sup1.post("/api/attendance/sign-in", { projectId: "prj-6133", ...ON_ROUTE, ref: ref() });
  eq(r.status, 409); has(r.json.error.message, "already signed in");
});
await t("the same sign-in sent twice saves once", async () => {
  const k = ref();
  const a = await sup2.post("/api/attendance/sign-in", { projectId: "prj-6133", ...FAR, ref: k });
  const b = await sup2.post("/api/attendance/sign-in", { projectId: "prj-6133", ...FAR, ref: k });
  eq(a.status, 200); eq(b.status, 200); eq(b.json.repeat, true, "repeat");
  eq((await q("select count(*)::int n from mobile_attendance where client_ref = $1", [k]))[0].n, 1);
});
await t("signing in far away tells the admins how far", async () => {
  const n = await notes(IDS.admin);
  const x = n.find((y) => y.title === "Signed in away from site" && /Ebin Site signed in 2\d(\.\d)? km from MOSC-KOLANCHERY/.test(y.body));
  ok(x, JSON.stringify(n.filter((y) => y.notification_type === "attendance").map((y) => y.body)));
});
await t("an on-site sign-in sends no notification (no spam)", async () => {
  const n = await notes(IDS.admin);
  ok(!n.some((y) => y.body?.includes("Anish Site signed in")), "no notification for Anish");
});
await t("a rough GPS fix is refused with words", async () => {
  const r = await fin.post("/api/attendance/sign-in", { projectId: "prj-6133", lat: 10, lng: 76, accuracy: 5000, ref: ref() });
  eq(r.status, 400); has(r.json.error.message, "too rough");
});
await t("the live map point is saved while signed in, at most every 2 minutes", async () => {
  // (the database refuses deletes; the test clears the sign-in point the only way it can)
  await q("begin"); await q("set local app.allow_hard_delete = 'on'");
  await q("delete from mobile_live_locations where mobile_user_id = $1 and source = 'sign_in'", [IDS.sup1]);
  await q("commit");
  const a = await sup1.post("/api/attendance/ping", ON_ROUTE);
  const b = await sup1.post("/api/attendance/ping", ON_ROUTE);
  eq(a.json.saved, true, "first"); eq(b.json.saved, false, "second"); eq(b.json.reason, "too_soon");
});
await t("sign-out without GPS is recorded as such, never with a made-up place", async () => {
  const r = await sup2.post("/api/attendance/sign-out", { note: "gps off" });
  eq(r.status, 200);
  const row = (await q("select check_out_lat, check_out_lng, closed_how, check_out_at from mobile_attendance where mobile_user_id = $1 order by check_in_at desc limit 1", [IDS.sup2]))[0];
  eq([row.check_out_lat, row.check_out_lng, row.closed_how], [null, null, "signed_out_no_location"]);
  ok(row.check_out_at, "closed");
});
await t("after 12 hours the shift closes by itself at the 12-hour mark, and both sides are told", async () => {
  const f = await signIn("TLG-FIN00001", PASSWORDS.fin);
  await f.post("/api/attendance/sign-in", { projectId: "rdss-imperial", lat: 11.8745, lng: 75.3704, accuracy: 10, ref: ref() });
  await q("update mobile_attendance set check_in_at = now() - interval '13 hours' where mobile_user_id = $1 and status = 'signed_in'", [IDS.fin]);
  const r = await f.get("/api/attendance/me");
  eq(r.json.open, null, "no open shift");
  const row = (await q("select closed_how, extract(epoch from (check_out_at - check_in_at))::int secs from mobile_attendance where mobile_user_id = $1 order by check_in_at desc limit 1", [IDS.fin]))[0];
  eq([row.closed_how, row.secs], ["auto_12h", 43200]);
  ok((await notes(IDS.fin)).some((x) => x.title === "Signed out after 12 hours"), "person told");
  ok((await notes(IDS.admin)).some((x) => x.title === "Missed sign-out"), "admin told");
});
await t("old-app attendance rows are grouped into one shift, with no invented distance", async () => {
  const r = await sup1.get("/api/attendance/me");
  const old = r.json.shifts.find((s) => s.fromOldApp);
  ok(old && old.marks === 3 && old.outAt && old.inDistanceM === null, JSON.stringify(old));
});

group = "4. Daily reports";
let billId, photoId, report;
await t("photos are stored after reading their real type", async () => {
  const a = await upload(sup1, "bill"); const b = await upload(sup1, "work");
  eq(a.status, 200); billId = a.json.file.id; photoId = b.json.file.id;
  const fake = await upload(sup1, "work", Buffer.from("not a picture at all"), "x.jpg");
  eq(fake.status, 415, "fake photo");
});
await t("a report is saved with totals worked out from its lists", async () => {
  const k = ref();
  const r = await sup1.post("/api/reports", { ref: k, projectId: "prj-6133", reportDate: today(), body: bodyFor(billId, photoId) });
  eq(r.status, 200, JSON.stringify(r.json)); report = r.json.report;
  const row = (await q("select labor_count, calculated_wages::float w, fuel_expenses::float f, room_rent::float rr, other_expenses::float o, excavation_length::float t, hdd_length::float h, joining_links_completed j, ot_hours_exact::float ot, status, (details->>'v')::int v from pending_daily_reports where client_ref = $1", [k]))[0];
  // wages = 6 × 900 + 2 × 1.5 h × 150 = 5400 + 450
  eq(row, { labor_count: 6, w: 5850, f: 1200, rr: 800, o: 150.5, t: 80, h: 6, j: 2, ot: 3, status: "pending", v: 2 }, "stored columns");
});
await t("the same report sent twice saves once", async () => {
  const k = ref();
  await sup1.post("/api/reports", { ref: k, projectId: "rdss-imperial", reportDate: today(), body: bodyFor() });
  const again = await sup1.post("/api/reports", { ref: k, projectId: "rdss-imperial", reportDate: today(), body: bodyFor() });
  eq(again.json.repeat, true);
  eq((await q("select count(*)::int n from pending_daily_reports where client_ref = $1", [k]))[0].n, 1);
});
await t("a new report tells the admins", async () => {
  ok((await notes(IDS.admin)).some((x) => x.title === "New daily report" && x.body.includes("MOSC-KOLANCHERY")), "notified");
});
await t("dates outside today and the 3 days before are refused (server and database)", async () => {
  const r = await sup1.post("/api/reports", { ref: ref(), projectId: "prj-6133", reportDate: dayMinus(5), body: bodyFor() });
  eq(r.status, 400); eq(r.json.error.code, "REPORT_DATE");
  let dbRefused = false;
  try { await q("insert into pending_daily_reports (report_date, project_id, supervisor_id, supervisor_name) values ($1, 'prj-6133', $2, 'x')", [dayMinus(9), IDS.sup1]); } catch (e) { dbRefused = /3 days/.test(e.message); }
  ok(dbRefused, "database refused it too");
});
await t("an empty report is refused", async () => {
  const r = await sup1.post("/api/reports", { ref: ref(), projectId: "prj-6133", reportDate: today(), body: { crew: { workers: 0, ot: [] }, expenses: [], work: [], clearances: [], notes: {} } });
  eq(r.status, 400); eq(r.json.error.code, "EMPTY");
});
await t("workers without a wage are refused", async () => {
  const b = bodyFor(); b.crew.wageRate = null;
  eq((await sup1.post("/api/reports", { ref: ref(), projectId: "prj-6133", reportDate: today(), body: b })).status, 400);
});
await t("a photo from someone else can't be put in a report", async () => {
  await sup2.post("/api/attendance/sign-in", { projectId: "prj-6133", ...ON_ROUTE, ref: ref() });
  const r = await sup2.post("/api/reports", { ref: ref(), projectId: "prj-6133", reportDate: today(), body: bodyFor(billId) });
  eq(r.status, 400); has(r.json.error.message, "photo");
});
await t("who can open a report: owner yes, another supervisor no, client no (pending), accounts no (pending)", async () => {
  eq((await sup1.get(`/api/reports/${report.id}`)).status, 200, "owner");
  eq((await sup2.get(`/api/reports/${report.id}`)).status, 404, "other supervisor");
  eq((await client.get(`/api/reports/${report.id}`)).status, 404, "client");
  eq((await fin.get(`/api/reports/${report.id}`)).status, 404, "accounts");
});
await t("a bill photo can't be opened by a client", async () => {
  eq((await client.get(`/api/files/${billId}`)).status, 403);
  eq((await admin.get(`/api/files/${billId}`)).status, 200, "admin can");
});
await t("approving with an old version is refused (no silent overwrite)", async () => {
  const r = await admin.post(`/api/reports/${report.id}/decide`, { action: "approve", expected: "2000-01-01T00:00:00Z" });
  eq(r.status, 409); eq(r.json.error.code, "CHANGED");
});
await t("ask to fix: the message and the status change together; the supervisor is told", async () => {
  const r = await admin.post(`/api/reports/${report.id}/decide`, { action: "ask_fix", expected: report.updatedAt, message: "Add the fuel bill for the second can" });
  eq(r.status, 200, JSON.stringify(r.json)); eq(r.json.report.status, "clarification");
  report = r.json.report;
  ok((await notes(IDS.sup1)).some((x) => x.title === "Please fix your report" && x.body.includes("fuel bill")), "supervisor told");
});
await t("the supervisor fixes it; it goes back for review and the admins are told", async () => {
  const b = bodyFor(billId, photoId); b.expenses[0].amount = 1300;
  const r = await sup1.patch(`/api/reports/${report.id}`, { expected: report.updatedAt, body: b });
  eq(r.status, 200, JSON.stringify(r.json)); eq(r.json.report.status, "pending"); eq(r.json.report.summary.fuel, 1300);
  report = r.json.report;
  ok((await notes(IDS.admin)).some((x) => x.title === "Report fixed"), "admins told");
});
await t("approve: counted once in the totals; approving again is refused", async () => {
  const r = await admin.post(`/api/reports/${report.id}/decide`, { action: "approve", expected: report.updatedAt });
  eq(r.status, 200); report = r.json.report;
  const again = await admin.post(`/api/reports/${report.id}/decide`, { action: "approve", expected: report.updatedAt });
  eq(again.status, 409); eq(again.json.error.code, "ALREADY_APPROVED");
  const l = (await q("select reports, fuel::float, wages::float from v_ledger_daily where project_id = 'prj-6133' and report_date = $1", [today()]))[0];
  eq(l, { reports: 1, fuel: 1300, wages: 5850 }, "ledger");
  ok((await notes(IDS.sup1)).some((x) => x.title === "Report approved"), "supervisor told");
});
await t("an approved report is locked (server and database)", async () => {
  eq((await sup1.patch(`/api/reports/${report.id}`, { expected: report.updatedAt, body: bodyFor() })).status, 409, "server");
  let locked = false;
  try { await q("update pending_daily_reports set fuel_expenses = 1 where id = $1", [report.id]); } catch (e) { locked = /locked/.test(e.message); }
  ok(locked, "database");
});
await t("the admin's correction needs a reason and is kept in the change log", async () => {
  eq((await admin.post(`/api/reports/${report.id}/admin-edit`, { expected: report.updatedAt, patch: { fuel_expenses: 1250 }, reason: "" })).status, 400, "no reason");
  const r = await admin.post(`/api/reports/${report.id}/admin-edit`, { expected: report.updatedAt, patch: { fuel_expenses: 1250 }, reason: "bill shows 1250" });
  eq(r.status, 200, JSON.stringify(r.json)); eq(r.json.report.summary.fuel, 1250);
  const log = await q("select changes from audit_log where table_name = 'pending_daily_reports' and row_id = $1 and action = 'update' order by at desc limit 1", [report.id]);
  eq(log[0].changes.fuel_expenses, [1300, 1250], "before and after");
  const msg = await q("select kind, message from report_clarification_messages where report_id = $1 and kind = 'admin_edit'", [report.id]);
  ok(msg.length && msg[0].message.includes("bill shows 1250"), "reason on the report");
  report = r.json.report;
});
await t("accounts and the client can open it once approved; the client sees no money", async () => {
  eq((await fin.get(`/api/reports/${report.id}`)).status, 200, "accounts");
  const c = await client.get(`/api/reports/${report.id}`);
  eq(c.status, 200, "client (project shared)");
  eq([c.json.report.summary.wages, c.json.report.summary.fuel, c.json.report.body.expenses.length], [0, 0, 0], "no money");
});
await t("an old-app report reads the same as a new one", async () => {
  const r = await admin.get("/api/reports/f0000000-0000-4000-8000-000000000001");
  const v = r.json.report;
  eq([v.fromOldApp, v.projectName, v.body.expenses[0]?.amount, !!v.body.expenses[0]?.bill?.legacy, v.body.work[0]?.key, v.body.work[0]?.value, v.body.notes.problems], [true, null, 1200, true, "trenching", 80, "Rain after 3 pm"]);
});
await t("an old-app report on a missing project can't be approved until it is moved", async () => {
  // it is already approved in the seed; a pending copy on a missing project:
  await q("alter table pending_daily_reports disable trigger trg_report_rules");
  await q("insert into pending_daily_reports (id, report_date, project_id, supervisor_id, supervisor_name, labor_count, status) values ('f0000000-0000-4000-8000-000000000002', $1, 'MNR-DVK-004', $2, 'Anish Site', 3, 'pending')", [dayMinus(10), IDS.sup1]);
  await q("alter table pending_daily_reports enable trigger trg_report_rules");
  const g = await admin.get("/api/reports/f0000000-0000-4000-8000-000000000002");
  const r = await admin.post("/api/reports/f0000000-0000-4000-8000-000000000002/decide", { action: "approve", expected: g.json.report.updatedAt });
  eq(r.status, 409); eq(r.json.error.code, "NO_PROJECT");
});
await t("records are never deleted directly; the change log can't be edited", async () => {
  let a = false, b = false;
  try { await q("delete from pending_daily_reports where id = $1", [report.id]); } catch (e) { a = /never deleted/.test(e.message); }
  try { await q("update audit_log set action = 'x' where id = (select max(id) from audit_log)"); } catch (e) { b = /can't be edited/.test(e.message); }
  ok(a && b, `delete refused ${a}, log locked ${b}`);
});
await t("a report message reaches the other side", async () => {
  const r = await sup1.post(`/api/reports/${report.id}/messages`, { message: "Thanks, the second bill is in the office" });
  eq(r.status, 200);
  ok((await notes(IDS.admin)).some((x) => x.title === "Message on a report"), "admin told");
});
await t("totals and money pages come from approved reports only", async () => {
  const t1 = await fin.get(`/api/reports/totals?from=${dayMinus(40)}&to=${today()}`);
  eq(t1.status, 200);
  ok(t1.json.total.fuel === 1250 + 1200, `fuel total ${t1.json.total.fuel}`); // this report + the old approved one
  const items = await fin.get(`/api/reports/items?kind=fuel&from=${dayMinus(40)}&to=${today()}`);
  eq(items.json.items.length, 2, "fuel lines");
});

group = "5. Inventory";
let item;
await t("add an item (signed in): the admins are told what, how much and where", async () => {
  const p = await upload(sup1, "material");
  const r = await sup1.post("/api/inventory", { ref: ref(), projectId: "prj-6133", material: "Cable 11 kV", description: "drum 7", quantity: 500, unit: "m", location: "Behind the KSEB office", photoFileId: p.json.file.id });
  eq(r.status, 200, JSON.stringify(r.json)); item = r.json.item;
  eq([item.quantityLeft, item.status], [500, "in_stock"]);
  ok((await notes(IDS.admin)).some((x) => x.title === "Added to inventory" && x.body.includes("500 m") && x.body.includes("KSEB office")), "admin told");
});
let change;
await t("'used 120 m' waits for the admin: nothing changes yet", async () => {
  const r = await sup1.post(`/api/inventory/${item.id}`, { ref: ref(), kind: "used", quantityUsed: 120, note: "for the road crossing" });
  eq(r.status, 200, JSON.stringify(r.json)); change = r.json.change;
  eq((await q("select quantity_left::float l from site_materials where id = $1", [item.id]))[0].l, 500, "unchanged");
  ok((await notes(IDS.admin)).some((x) => x.title === "Inventory change to approve" && x.body.includes("used 120 m")), "admin told with details");
});
await t("a second request while one waits is refused", async () => {
  const r = await sup1.post(`/api/inventory/${item.id}`, { ref: ref(), kind: "moved", newLocation: "site office" });
  eq(r.status, 409); eq(r.json.error.code, "PENDING");
});
await t("the admin approves: the item changes, and the person is told who approved and when", async () => {
  const r = await admin.post(`/api/inventory/changes/${change.id}`, { decision: "approve" });
  eq(r.status, 200); eq(Number(r.json.quantityLeft), 380);
  const h = await sup1.get(`/api/inventory/${item.id}`);
  const c = h.json.history[0];
  eq([c.status, c.decidedBy], ["approved", "Admin Local"]); ok(c.decidedAt, "time");
  ok((await notes(IDS.sup1)).some((x) => x.title === "Inventory change approved"), "told");
});
await t("using more than is left is refused", async () => {
  const r = await sup1.post(`/api/inventory/${item.id}`, { ref: ref(), kind: "used", quantityUsed: 999 });
  eq(r.status, 400); has(r.json.error.message, "more than is left");
});
await t("refusing needs a reason; closing (fully used) closes it after approval", async () => {
  const a = await sup1.post(`/api/inventory/${item.id}`, { ref: ref(), kind: "closed", note: "all laid" });
  eq((await admin.post(`/api/inventory/changes/${a.json.change.id}`, { decision: "reject", note: "" })).status, 400, "no reason");
  eq((await admin.post(`/api/inventory/changes/${a.json.change.id}`, { decision: "approve" })).status, 200);
  const it = (await q("select status, quantity_left::float l from site_materials where id = $1", [item.id]))[0];
  eq(it, { status: "closed", l: 0 });
  eq((await sup1.post(`/api/inventory/${item.id}`, { ref: ref(), kind: "used", quantityUsed: 1 })).status, 409, "closed item refuses changes");
});
await t("accounts see inventory but can't change it", async () => {
  eq((await fin.get("/api/inventory?status=all")).status, 200);
  eq((await fin.post(`/api/inventory/${item.id}`, { ref: ref(), kind: "moved", newLocation: "x" })).status, 403);
});

group = "6. Projects";
let proj;
await t("the admin adds a project; the code must be unique", async () => {
  const r = await admin.post("/api/projects", { name: "Test Line", code: "TST-001", location: "Aluva", district: "Ernakulam", route: [[10.1, 76.35], [10.11, 76.36]], siteRadiusM: 200 });
  eq(r.status, 200, JSON.stringify(r.json)); proj = r.json.project;
  eq((await admin.post("/api/projects", { name: "Dup", code: "tst-001", location: "x" })).status, 409, "duplicate code");
});
await t("editing with an old version is refused; with the right one it saves", async () => {
  eq((await admin.patch(`/api/projects/${proj.id}`, { expected: "2000-01-01T00:00:00Z", name: "Changed" })).status, 409);
  const r = await admin.patch(`/api/projects/${proj.id}`, { expected: proj.updatedAt, name: "Test Line 2" });
  eq(r.status, 200); eq(r.json.project.name, "Test Line 2");
});
await t("a supervisor can't change a project and sees no budget", async () => {
  eq((await sup1.patch(`/api/projects/${proj.id}`, { expected: proj.updatedAt, name: "x" })).status, 403);
  const l = await sup1.get("/api/projects");
  ok(l.json.projects.every((p) => p.budget === null), "no budget");
});
await t("a client sees only the projects shared with them", async () => {
  const l = await client.get("/api/projects");
  eq(l.json.projects.map((p) => p.id), ["prj-6133"]);
  eq((await client.get("/api/projects/rdss-imperial")).status, 404);
});
await t("the old app's route (corridor_data) is read, with start and end names", async () => {
  const r = await admin.get("/api/projects/prj-6133");
  const p = r.json.project;
  eq([p.route.length, p.routeFromOldApp, p.startLabel], [3, true, "Kolenchery junction"]);
  ok(p.plan.route?.path.length === 3 && p.planSaved === false, "the plan starts from the old route, not saved yet");
});
await t("the work plan: the server measures every length; the route follows the plan's whole route", async () => {
  const cur = (await admin.get(`/api/projects/${proj.id}`)).json.project;
  const plan = {
    route: { waypoints: [[10.1, 76.35], [10.11, 76.36]], path: [[10.1, 76.35], [10.105, 76.355], [10.11, 76.36]], follow: true, lengthM: 1 },
    parts: [
      { id: "a", type: "Open trench", name: "School road", waypoints: [[10.1, 76.35], [10.105, 76.355]], path: [[10.1, 76.35], [10.105, 76.355]], follow: true, lengthM: 999999 },
      { id: "b", type: "Duct laying", name: "", waypoints: [[10.105, 76.355], [10.11, 76.36]], path: [[10.105, 76.355], [10.11, 76.36]], follow: false },
    ],
    types: ["Duct laying"],
  };
  const r = await admin.patch(`/api/projects/${proj.id}`, { expected: cur.updatedAt, plan });
  eq(r.status, 200, JSON.stringify(r.json));
  const p = r.json.project;
  const a = p.plan.parts.find((x) => x.id === "a");
  ok(a.lengthM > 700 && a.lengthM < 800, `measured by the server, not the phone's 999999: ${a.lengthM}`); // ~0.005° each way ≈ 780 m
  eq(p.route.length, 3, "the route column is the plan's whole route");
  ok(p.plan.types.includes("Duct laying") && p.planSaved === true, "a new type is kept");
  const bad = await admin.patch(`/api/projects/${proj.id}`, { expected: p.updatedAt, plan: { parts: [{ type: "", path: [] }] } });
  eq(bad.status, 400, "a part needs a type");
  const junk = await admin.patch(`/api/projects/${proj.id}`, { expected: p.updatedAt, plan: { route: { path: [["x", 1], [2, 3]] } } });
  eq(junk.status, 400, "a point must be a real place");
  eq((await sup1.patch(`/api/projects/${proj.id}`, { expected: p.updatedAt, plan })).status, 403, "only the admin");
});

group = "7. File manager (Archive, Trash 90 days)";
await t("archive: out of lists, still in the totals", async () => {
  const r = await admin.post("/api/file-manager", { kind: "reports", id: report.id, action: "archive" });
  eq(r.status, 200);
  const list = await admin.get("/api/reports?status=approved");
  ok(!list.json.reports.some((x) => x.id === report.id), "gone from list");
  eq((await q("select count(*)::int n from v_ledger_daily where project_id = 'prj-6133' and report_date = $1", [today()]))[0].n, 1, "still counted");
});
await t("trash: out of the totals; restore brings it back", async () => {
  await admin.post("/api/file-manager", { kind: "reports", id: report.id, action: "trash" });
  eq((await q("select count(*)::int n from v_ledger_daily where project_id = 'prj-6133' and report_date = $1", [today()]))[0].n, 0, "out of totals");
  const t1 = await admin.get("/api/file-manager?kind=reports&tab=trash");
  const it = t1.json.items.find((x) => x.id === report.id);
  ok(it && Date.parse(it.goneOn) - Date.parse(it.trashedAt) === 90 * 86400e3, "gone on +90 days");
  await admin.post("/api/file-manager", { kind: "reports", id: report.id, action: "restore" });
  eq((await q("select count(*)::int n from v_ledger_daily where project_id = 'prj-6133' and report_date = $1", [today()]))[0].n, 1, "back");
});
await t("people are never put in the Trash", async () => {
  const r = await admin.post("/api/file-manager", { kind: "people", id: IDS.sup2, action: "trash" });
  eq(r.status, 400);
});
await t("after 90 days in the Trash the clean-up deletes it for good, not before", async () => {
  const young = await sup1.post("/api/inventory", { ref: ref(), projectId: "prj-6133", material: "Sand", location: "yard" });
  const old = await sup1.post("/api/inventory", { ref: ref(), projectId: "prj-6133", material: "Old tape", location: "yard" });
  await admin.post("/api/file-manager", { kind: "inventory", id: young.json.item.id, action: "trash" });
  await admin.post("/api/file-manager", { kind: "inventory", id: old.json.item.id, action: "trash" });
  await q("update site_materials set trashed_at = now() - interval '91 days' where id = $1", [old.json.item.id]);
  const secret = (await import("node:fs")).readFileSync(new URL("../../.env.local", import.meta.url), "utf8").match(/^CRON_SECRET=(.*)$/m)?.[1];
  const r = await fetch(BASE + "/api/cron/purge", { headers: { Authorization: `Bearer ${secret}` } });
  eq(r.status, 200);
  const left = await q("select id from site_materials where id = any($1)", [[young.json.item.id, old.json.item.id]]);
  eq(left.map((x) => x.id), [young.json.item.id], "only the young one remains");
});
await t("the clean-up job needs its secret", async () => {
  eq((await fetch(BASE + "/api/cron/purge")).status, 401);
});

group = "8. Chat";
let thread;
await t("a supervisor opens a chat with the admin and sends a message", async () => {
  const o = await sup1.post("/api/chat", { with: IDS.admin });
  eq(o.status, 200); thread = o.json.threadId;
  const k = ref();
  const a = await sup1.post(`/api/chat/${thread}`, { kind: "text", body: "Material reached site", ref: k });
  const b = await sup1.post(`/api/chat/${thread}`, { kind: "text", body: "Material reached site", ref: k });
  eq(a.status, 200); eq(b.json.repeat, true, "sent once");
});
await t("the notification never shows the message text", async () => {
  const n = (await notes(IDS.admin)).filter((x) => x.notification_type === "chat");
  ok(n.length === 1 && !n[0].body.includes("Material") && n[0].body.includes("Open the chat"), JSON.stringify(n));
});
await t("unread count, then Seen after the admin reads", async () => {
  const me = await admin.get("/api/me");
  ok(me.json.counts.chats >= 1, "unread");
  await admin.post(`/api/chat/${thread}/read`, {});
  const v = await sup1.get(`/api/chat/${thread}`);
  const adminRead = v.json.people.find((p) => p.id === IDS.admin).lastReadAt;
  ok(adminRead && Date.parse(adminRead) >= Date.parse(v.json.messages.at(-1).at), "seen");
});
await t("supervisors can't start chats with each other (only the admin, and the team chat)", async () => {
  eq((await sup1.post("/api/chat", { with: IDS.sup2 })).status, 403);
});
await t("a client has no team chat; someone outside a chat can't read it", async () => {
  const l = await client.get("/api/chat");
  ok(!l.json.chats.some((c) => c.kind === "team"), "no team chat for clients");
  eq((await sup2.get(`/api/chat/${thread}`)).status, 403);
});
let group1, team;
await t("the Team chat is pinned first in the list, whatever is newer", async () => {
  const l = await admin.get("/api/chat");
  eq(l.json.chats[0].kind, "team", "first chat");
  team = l.json.chats[0].threadId;
  ok(l.json.canMakeGroups === true, "the admin can make groups");
});
await t("the admin makes a group chat (the + button); the people added are told", async () => {
  const r = await admin.post("/api/chat", { title: "Aluva HDD site", members: [IDS.sup1] });
  eq(r.status, 200); group1 = r.json.threadId;
  const n = (await notes(IDS.sup1)).filter((x) => x.link === `/app/chat/${group1}`);
  ok(n.length === 1 && n[0].body.includes("added you") && n[0].body.includes("Aluva HDD site"), JSON.stringify(n));
  const l = await sup1.get("/api/chat");
  const g = l.json.chats.find((c) => c.threadId === group1);
  ok(g && g.kind === "topic" && g.title === "Aluva HDD site" && g.people === 3, JSON.stringify(g)); // both admins + the supervisor
  eq(l.json.chats[0].kind, "team", "the Team chat still first");
  eq((await sup2.get(`/api/chat/${group1}`)).status, 403, "someone not added");
  eq((await admin.post("/api/chat", { title: "  ", members: [IDS.sup1] })).status, 400, "no name");
});
await t("a supervisor's group chat is with the admin (people they pick are not added)", async () => {
  const r = await sup1.post("/api/chat", { title: "Diesel for the rig", members: [IDS.sup2] });
  eq(r.status, 200);
  const members = await q("select user_id::text from chat_members where thread_id = $1 order by user_id", [r.json.threadId]);
  const ids = members.map((m) => m.user_id);
  ok(ids.includes(IDS.sup1) && ids.includes(IDS.admin) && !ids.includes(IDS.sup2), JSON.stringify(ids));
  eq((await client.post("/api/chat", { title: "Client group" })).status, 403, "clients make no groups");
});
await t("stickers: one from the list sends, an unknown one is refused", async () => {
  eq((await sup1.post(`/api/chat/${group1}`, { kind: "sticker", body: "reached", ref: ref() })).status, 200);
  eq((await sup1.post(`/api/chat/${group1}`, { kind: "sticker", body: "not-a-sticker", ref: ref() })).status, 400);
});
await t("@mention: the person gets a 'mentioned you' card (never the text), others the usual one", async () => {
  await q("update mobile_notifications set is_read = true where recipient_user_id = $1", [IDS.admin]);
  const r = await sup1.post(`/api/chat/${group1}`, { kind: "text", body: "@Admin Local please check the pit depth", mentions: [IDS.admin, IDS.sup2], ref: ref() });
  eq(r.status, 200);
  eq(r.json.message.mentions, [IDS.admin], "only people in the chat count");
  const n = (await notes(IDS.admin)).filter((x) => x.link === `/app/chat/${group1}` && x.notification_type === "mention");
  ok(n.length === 1 && n[0].body.includes("mentioned you") && !n[0].body.includes("pit depth"), JSON.stringify(n));
  const l = await admin.get("/api/chat");
  ok(l.json.chats.find((c) => c.threadId === group1).mentioned === true, "the list says mentioned");
});
await t("change a message: only the sender, only text; everyone sees 'edited'", async () => {
  const v = await sup1.get(`/api/chat/${group1}`);
  const m = v.json.messages.find((x) => x.kind === "text");
  eq((await admin.post(`/api/chat/message/${m.id}`, { action: "edit", body: "changed by someone else" })).status, 403);
  const e = await sup1.post(`/api/chat/message/${m.id}`, { action: "edit", body: "@Admin Local please check the pit depth (1.6 m)" });
  eq(e.status, 200); eq(e.json.message.edited, true, "edited");
  const s = v.json.messages.find((x) => x.kind === "sticker");
  eq((await sup1.post(`/api/chat/message/${s.id}`, { action: "edit", body: "x" })).status, 400, "a sticker can't be changed");
});
await t("earlier messages come 50 at a time (Show earlier messages)", async () => {
  await q(`insert into chat_messages (thread_id, sender_id, kind, body, created_at, is_test)
           select $1, $2, 'text', 'old ' || g, now() - interval '2 days' + (g || ' seconds')::interval, false from generate_series(1, 70) g`, [group1, IDS.admin]);
  const first = await sup1.get(`/api/chat/${group1}`);
  eq(first.json.messages.length, 60, "the newest 60"); eq(first.json.more, true, "more");
  const older = await sup1.get(`/api/chat/${group1}?before=${encodeURIComponent(first.json.messages[0].at)}`);
  ok(older.json.messages.length > 0 && older.json.messages.at(-1).at < first.json.messages[0].at, "older ones");
});
await t("clear chat for me: gone for me only; the others keep every message", async () => {
  const r = await sup1.post(`/api/chat/${group1}/clear`, { for: "me" });
  eq(r.status, 200);
  eq((await sup1.get(`/api/chat/${group1}`)).json.messages.length, 0, "cleared for me");
  ok((await admin.get(`/api/chat/${group1}`)).json.messages.length > 0, "the admin still sees them");
  eq((await sup1.post(`/api/chat/${group1}/clear`, { for: "everyone" })).status, 403, "only the admin clears for everyone");
});
await t("the admin adds people later; the admin clears for everyone (to the Trash, 90 days)", async () => {
  eq((await sup1.post(`/api/chat/${group1}/people`, { members: [IDS.sup2] })).status, 403, "only the admin adds");
  const a = await admin.post(`/api/chat/${group1}/people`, { members: [IDS.sup2] });
  eq(a.status, 200); eq(a.json.added, 1);
  ok((await notes(IDS.sup2)).some((x) => x.link === `/app/chat/${group1}` && x.body.includes("added you")), "sup2 told");
  eq((await sup2.get(`/api/chat/${group1}`)).status, 200, "sup2 can read it now");
  const c = await admin.post(`/api/chat/${group1}/clear`, { for: "everyone" });
  eq(c.status, 200);
  eq((await admin.get(`/api/chat/${group1}`)).json.messages.length, 0, "gone for everyone");
  const trashed = await q("select count(*)::int n from chat_messages where thread_id = $1 and trashed_at is not null", [group1]);
  ok(trashed[0].n >= 70, "kept in the Trash");
  ok((await q("select 1 from audit_log where table_name = 'chat_threads' and row_id = $1 and changes ? 'cleared_at'", [group1])).length === 1, "in the change log");
});
await t("the File manager lists group chats by their name", async () => {
  const f = await admin.get("/api/file-manager?kind=chats&tab=active");
  ok(f.json.items.some((i) => i.row.title === "Group: Aluva HDD site"), JSON.stringify(f.json.items.map((i) => i.row.title)));
});

group = "9. Notifications, push, Error Doctor, test data";
await t("notifications can be read and cleared (cleared ones leave the list)", async () => {
  const l = await sup1.get("/api/notifications");
  const id = l.json.notifications[0].id;
  eq((await sup1.post("/api/notifications", { action: "clear", ids: [id] })).status, 200);
  ok(!(await sup1.get("/api/notifications")).json.notifications.some((n) => n.id === id), "cleared");
});
await t("push: set up on the server, a phone can turn it on and off", async () => {
  const s = await sup1.get("/api/push");
  eq(s.json.configured, true);
  const sub = { endpoint: "https://push.example.invalid/abc", keys: { p256dh: "BNcRdreALRFXTkOOUHK1EtK2wtaz5Ry4YfYCA_0QTpQtUbVlUls0VJXg7A8u-Ts1XbjhazAkj7I99e8QcYP7DkM", auth: "tBHItJI5svbpez7KI4CCXg" } };
  eq((await sup1.post("/api/push", { action: "subscribe", subscription: sub })).status, 200);
  eq((await sup1.get(`/api/push?endpoint=${encodeURIComponent(sub.endpoint)}`)).json.onHere, true);
  eq((await sup1.post("/api/push", { action: "unsubscribe", endpoint: sub.endpoint })).status, 200);
});
await t("signing out on all phones also stops those phones' notifications", async () => {
  const p = await signIn("TLG-ENG00001", PASSWORDS.eng);
  const sub = { endpoint: "https://push.example.invalid/eng-phone", keys: { p256dh: "BNcRdreALRFXTkOOUHK1EtK2wtaz5Ry4YfYCA_0QTpQtUbVlUls0VJXg7A8u-Ts1XbjhazAkj7I99e8QcYP7DkM", auth: "tBHItJI5svbpez7KI4CCXg" } };
  eq((await p.post("/api/push", { action: "subscribe", subscription: sub })).status, 200);
  await p.post("/api/auth/sign-out", { everywhere: true });
  const row = (await q("select disabled_at from push_subscriptions where endpoint = $1", [sub.endpoint]))[0];
  ok(row.disabled_at, "push switched off");
});
await t("the profile reply keeps the voice language", async () => {
  const me = await sup1.get("/api/me");
  const r = await sup1.patch("/api/me", { expected: me.json.me.updatedAt, voiceLanguage: "ml-IN" });
  eq(r.status, 200); eq(r.json.me.voiceLanguage, "ml-IN");
  const back = await sup1.patch("/api/me", { expected: r.json.me.updatedAt, voiceLanguage: "en-IN" });
  eq(back.json.me.voiceLanguage, "en-IN");
});
await t("the phone's problem report gets a reference and lands in the Problems log", async () => {
  const r = await sup1.post("/api/problems", { message: "Screen crashed: test", where: "/app/test" });
  ok(/^T-[0-9A-F]{6}$/.test(r.json.ref), r.json.ref);
  eq((await q("select source from app_error_log where ref = $1", [r.json.ref]))[0].source, "phone");
  const sys = await admin.get("/api/system?view=problems");
  ok(sys.json.items.some((x) => x.ref === r.json.ref), "admin sees it");
});
await t("test logins' data never reaches real screens", async () => {
  await q("update mobile_app_users set is_test = true where id = $1", [IDS.sup2]);
  const tp = await signIn("TLG-SUP00002", PASSWORDS.sup2);
  await tp.post("/api/attendance/sign-in", { projectId: "prj-6133", ...ON_ROUTE, ref: ref() }).catch(() => {});
  const home = await admin.get("/api/home");
  ok(!home.json.people.some((p) => p.id === IDS.sup2), "test person hidden from the real admin");
  await q("update mobile_app_users set is_test = false where id = $1", [IDS.sup2]);
});
await t("every change is in the change log with who did it", async () => {
  const rows = await q("select actor from audit_log where table_name = 'projects' and row_id = $1 and action = 'update'", [proj.id]);
  ok(rows.length && rows.every((r) => r.actor === IDS.admin), JSON.stringify(rows));
});
await t("server replies never carry the password hash or its locked copy", async () => {
  for (const path of [`/api/team/people/${IDS.sup1}`, "/api/team/people?status=all", "/api/me"]) {
    const s = JSON.stringify((await admin.get(path)).json);
    ok(!s.includes("scrypt$") && !s.includes("password_view") && !s.includes('"v1:'), `${path} leaked`);
  }
});

group = "10. Passwords the admin can see (owner's decision)";
await t("a login shows its password after a sign-in; one never signed in since shows 'not known'", async () => {
  const r = await admin.get(`/api/team/people/${IDS.legacy}/password`);
  eq(r.status, 200); eq(r.json.password, PASSWORDS.legacy, "seen after the old-style sign-in");
  await q("update mobile_app_users set password_view = null where id = $1", [IDS.admin2]);
  eq((await admin.get(`/api/team/people/${IDS.admin2}/password`)).json.password, null, "not known");
});
await t("the version check tells which settings are on (yes / no), never their values", async () => {
  const v = await (await fetch(BASE + "/api/version")).json();
  const s = v.settings ?? {};
  ok(["pushNotifications", "googleMaps", "trashCleanup"].every((k) => typeof s[k] === "boolean"), JSON.stringify(s));
  ok(!/AIza|BEGIN|[A-Za-z0-9_-]{40,}/.test(JSON.stringify(v)), "no value shown");
});
await t("the admin sets a password: it works at once, stays visible, no forced change unless asked", async () => {
  const s = await admin.post(`/api/team/people/${IDS.sup2}/action`, { action: "set_password", password: "Site-pass-2026" });
  eq(s.status, 200); eq(s.json.password, "Site-pass-2026"); eq(s.json.person.mustChangePassword, false, "no forced change");
  eq((await admin.get(`/api/team/people/${IDS.sup2}/password`)).json.password, "Site-pass-2026");
  ok((await signIn("TLG-SUP00002", "Site-pass-2026")).cookie, "signs in with it");
  const made = await admin.post(`/api/team/people/${IDS.sup2}/action`, { action: "set_password", password: "", mustChange: true });
  ok(made.json.password?.length === 10 && made.json.person.mustChangePassword === true, "made one, change asked");
  eq((await admin.post(`/api/team/people/${IDS.sup2}/action`, { action: "set_password", password: "short" })).status, 400, "too short");
  eq((await admin.post(`/api/team/people/${IDS.admin}/action`, { action: "set_password", password: "Another-2026" })).status, 400, "not your own here");
  await admin.post(`/api/team/people/${IDS.sup2}/action`, { action: "set_password", password: PASSWORDS.sup2 });
});
await t("a reset's temporary password and a person's own new password are visible too", async () => {
  const r = await admin.post(`/api/team/people/${IDS.eng}/action`, { action: "reset_password" });
  eq((await admin.get(`/api/team/people/${IDS.eng}/password`)).json.password, r.json.tempPassword, "temporary one");
  const eng = await signIn("TLG-ENG00001", r.json.tempPassword);
  eq((await eng.post("/api/auth/change-password", { current: r.json.tempPassword, next: PASSWORDS.eng })).status, 200);
  eq((await admin.get(`/api/team/people/${IDS.eng}/password`)).json.password, PASSWORDS.eng, "their own new one");
});
await t("only the admin sees passwords; every look is in the change log, which never holds a password", async () => {
  eq((await sup1.get(`/api/team/people/${IDS.sup2}/password`)).status, 403);
  eq((await sup1.get("/api/team/passwords")).status, 403);
  const all = await admin.get("/api/team/passwords");
  ok(all.json.passwords.some((x) => x.id === IDS.sup2 && x.password === PASSWORDS.sup2), "all at once");
  const looks = (await q("select action from audit_log where action in ('view_password', 'view_passwords') and actor = $1", [IDS.admin])).map((x) => x.action);
  ok(looks.includes("view_password") && looks.includes("view_passwords"), JSON.stringify(looks));
  const log = await q("select changes::text c from audit_log where table_name = 'mobile_app_users' and row_id = $1", [IDS.sup2]);
  ok(log.length && log.every((x) => !x.c.includes("v1:") && !x.c.includes("Site-pass-2026") && !x.c.includes(PASSWORDS.sup2)), "no password in the log");
  const row = await q("select password_view from mobile_app_users where id = $1", [IDS.sup2]);
  ok(row[0].password_view.startsWith("v1:") && !row[0].password_view.includes(PASSWORDS.sup2), "the database holds only the locked copy");
});
await t("security headers on every page", async () => {
  const r = await fetch(BASE + "/login");
  const csp = r.headers.get("content-security-policy") ?? "";
  ok(/script-src 'self' 'nonce-/.test(csp) && /frame-ancestors 'none'/.test(csp), csp);
  eq([r.headers.get("x-frame-options"), r.headers.get("x-content-type-options"), r.headers.get("x-robots-tag")], ["DENY", "nosniff", "noindex, nofollow"]);
});

// ---------- summary ----------
await db.end();
console.log("\n");
let current = "";
for (const r of results) {
  if (r.group !== current) { current = r.group; console.log(`\n${current}`); }
  console.log(`  ${r.ok ? "PASS" : "FAIL"}  ${r.name}${r.ok ? "" : `\n        → ${r.why}`}`);
}
const failed = results.filter((r) => !r.ok).length;
console.log(`\n${results.length - failed}/${results.length} API checks passed`);
process.exit(failed ? 1 : 0);

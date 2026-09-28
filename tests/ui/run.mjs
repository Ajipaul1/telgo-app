// PHONE TESTS (RULES.md section 11): every screen of every role, and every form filled and saved,
// on an Android phone (Chrome) and an iPhone (WebKit). Checked against the database.
// The app must be running (npm run dev); the LOCAL test database is reset first.
// node tests/ui/run.mjs [--chrome-only] [--webkit-only]
import fs from "node:fs";
import path from "node:path";
import pg from "pg";
import { chromium, webkit } from "playwright-core";
import { seed, PASSWORDS } from "../db/seed-local.mjs";

const BASE = process.env.TELGO_BASE ?? "http://127.0.0.1:3000";
const DB = process.env.LOCAL_DB_URL ?? "postgresql://postgres:postgres@127.0.0.1:54322/postgres";
if (!/127\.0\.0\.1|localhost/.test(BASE) || !/@(127\.0\.0\.1|localhost):54322\//.test(DB)) { console.error("Refusing: local only."); process.exit(1); }
const OUT = path.resolve(import.meta.dirname, "../.out/ui");
fs.mkdirSync(OUT, { recursive: true });
const PHOTO = path.resolve(import.meta.dirname, "../.out/photo.jpg");
fs.writeFileSync(PHOTO, Buffer.from("/9j/4AAQSkZJRgABAQEASABIAAD/2wBDAP//////////////////////////////////////////////////////////////////////////////////////wgALCAABAAEBAREA/8QAFBABAAAAAAAAAAAAAAAAAAAAAP/aAAgBAQABPxA=", "base64"));

const db = new pg.Client({ connectionString: DB });
await db.connect();
const q = async (sql, p = []) => (await db.query(sql, p)).rows;

const results = [];
let where = "";
let watch = [];   // the phones of the current block: a failed step saves what they showed
let fails = 0;
async function t(name, fn) {
  try { await fn(); results.push({ where, name, ok: true }); process.stdout.write("."); }
  catch (e) {
    fails++;
    for (const [i, p] of watch.entries()) await p.screenshot({ path: path.join(OUT, `FAIL_${fails}_${i}.png`), animations: "disabled", timeout: 20000 }).catch(() => {});
    results.push({ where, name, ok: false, why: String(e.message).split("\n")[0].slice(0, 300) + (watch.length ? ` (picture: tests/.out/ui/FAIL_${fails}_*.png)` : "") });
    process.stdout.write("F");
  }
}
const ok = (c, what) => { if (!c) throw new Error(what); };

const MENU = {
  admin: ["app", "app/team/employees", "app/team/employees/new", "app/team/requests", "app/team/live", "app/team/attendance", "app/projects", "app/projects/prj-6133", "app/projects/edit", "app/projects/edit/new",
    "app/inventory/sites", "app/inventory", "app/inventory/approvals", "app/inventory/add", "app/reports/review", "app/reports/fix", "app/reports/saved", "app/reports/totals", "app/reports/wages", "app/reports/fuel",
    "app/reports/travel", "app/reports/room", "app/reports/tools", "app/reports/other", "app/reports/progress", "app/files", "app/notifications", "app/chat", "app/profile", "app/system/sign-ins", "app/system/changes", "app/system/problems",
    "app/reports/view/f0000000-0000-4000-8000-000000000001"],
  supervisor: ["app", "app/attendance", "app/attendance/history", "app/report/new", "app/my-reports", "app/inventory/add", "app/inventory", "app/inventory/sites", "app/projects", "app/projects/prj-6133", "app/notifications", "app/chat", "app/profile",
    "app/my-reports/f0000000-0000-4000-8000-000000000001"],
  finance: ["app", "app/attendance", "app/attendance/history", "app/reports/saved", "app/reports/totals", "app/reports/wages", "app/reports/fuel", "app/reports/progress", "app/inventory/sites", "app/inventory", "app/projects", "app/notifications", "app/chat", "app/profile",
    "app/reports/view/f0000000-0000-4000-8000-000000000001"],
  client: ["app", "app/projects", "app/projects/prj-6133", "app/progress", "app/notifications", "app/chat", "app/profile"],
};

// one screen is healthy: no crash, no endless loading, nothing wider than the phone, big enough to tap, 16 px inputs
async function healthy(page, label, shots) {
  const t0 = Date.now();
  while (Date.now() - t0 < 20000) {
    const busy = await page.locator("[aria-busy=true], .skeleton").count();
    if (!busy) break;
    await page.waitForTimeout(250);
  }
  const report = await page.evaluate(() => {
    const vw = window.innerWidth;
    const wide = document.documentElement.scrollWidth > vw + 1;
    const crashed = !!document.body.innerText.match(/This screen stopped working|Application error|Unhandled Runtime Error/);
    const stuck = document.querySelectorAll("[aria-busy=true], .skeleton").length > 0;
    const small = [...document.querySelectorAll("main button, main a.btn, main .item, main input:not([type=checkbox]):not([type=file]):not([hidden]), main select")]
      .filter((e) => { const r = e.getBoundingClientRect(); return r.width > 0 && r.height > 0 && getComputedStyle(e).visibility !== "hidden" && r.height < 40; })
      .map((e) => (e.textContent || e.getAttribute("aria-label") || e.tagName).trim().slice(0, 30));
    const tinyText = [...document.querySelectorAll("input:not([type=checkbox]):not([type=file]), textarea, select")].filter((e) => parseFloat(getComputedStyle(e).fontSize) < 16).length;
    const icons = document.querySelectorAll("main svg:not(.leaflet-zoom-animated):not([role=img])").length;
    return { wide, crashed, stuck, small: [...new Set(small)].slice(0, 6), tinyText, icons, title: document.querySelector("[data-testid=screen-title]")?.textContent };
  });
  if (shots) await page.screenshot({ path: path.join(OUT, `${shots}.png`), fullPage: true, animations: "disabled", timeout: 60000 }).catch(() => {});
  ok(!report.crashed, `${label}: crashed`);
  ok(!report.stuck, `${label}: still loading after 20 s`);
  ok(!report.wide, `${label}: wider than the phone`);
  ok(report.tinyText === 0, `${label}: ${report.tinyText} inputs with text under 16 px (iPhone zooms)`);
  ok(report.small.length === 0, `${label}: too small to tap: ${report.small.join(" | ")}`);
  ok(report.icons === 0, `${label}: ${report.icons} icons in the content`);
  return report;
}

async function newPhone(browser, kind) {
  const common = { geolocation: { latitude: 9.98315, longitude: 76.47605, accuracy: 10 }, permissions: ["geolocation"], locale: "en-IN", timezoneId: "Asia/Kolkata" };
  const ctx = kind === "iphone"
    ? await browser.newContext({ ...common, viewport: { width: 390, height: 844 }, deviceScaleFactor: 3, isMobile: true, hasTouch: true, userAgent: "Mozilla/5.0 (iPhone; CPU iPhone OS 17_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.5 Mobile/15E148 Safari/604.1" })
    : await browser.newContext({ ...common, viewport: { width: 412, height: 915 }, deviceScaleFactor: 2.6, isMobile: true, hasTouch: true, userAgent: "Mozilla/5.0 (Linux; Android 14; Pixel 8) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/140.0 Mobile Safari/537.36" });
  // every write of a report draft is traced, so a draft that survives a send can be explained
  await ctx.addInitScript(() => {
    const set = Storage.prototype.setItem, rem = Storage.prototype.removeItem;
    window.__draftLog = [];
    Storage.prototype.setItem = function (k, v) { if (String(k).includes("report_draft")) window.__draftLog.push(`set ${Date.now()} ${String(v).slice(0, 60)} | ${(new Error().stack || "").split(String.fromCharCode(10)).slice(2, 5).join(" < ")}`); return set.call(this, k, v); };
    Storage.prototype.removeItem = function (k) { if (String(k).includes("report_draft")) window.__draftLog.push(`remove ${Date.now()}`); return rem.call(this, k); };
  });
  const page = await ctx.newPage();
  page.errors = [];
  page.on("pageerror", (e) => page.errors.push(e.message.slice(0, 200)));
  page.on("console", (m) => { if (m.type() === "error" && !/Failed to load resource|favicon|tile|cartocdn|arcgisonline|net::ERR/i.test(m.text())) page.errors.push(m.text().slice(0, 200)); });
  return { ctx, page };
}
async function login(page, id, pw) {
  await page.goto(BASE + "/login", { waitUntil: "domcontentloaded" });
  await page.waitForSelector("[data-testid=login-submit]:not([disabled])", { timeout: 20000 });
  await page.fill("[data-testid=login-id]", id);
  await page.fill("[data-testid=login-pw]", pw);
  await page.click("[data-testid=login-submit]");
  await page.waitForURL(/\/app/, { timeout: 25000 });
}
async function signInAtSite(page) {
  await page.waitForSelector("[data-testid=gate], [data-testid=home-staff]", { timeout: 20000 });
  if (await page.locator("[data-testid=gate]").count()) {
    await page.waitForSelector("[data-testid=sign-in-project] option:nth-child(2)", { state: "attached", timeout: 15000 });
    await page.selectOption("[data-testid=sign-in-project]", "prj-6133");
    await page.click("[data-testid=sign-in-button]");
    await page.waitForSelector("[data-testid=home-staff]", { timeout: 25000 });
  }
}
const go = (page, p) => page.goto(`${BASE}/${p}`, { waitUntil: "domcontentloaded" });

async function run(kind) {
  const browser = kind === "iphone"
    ? await webkit.launch({ headless: true })
    : await chromium.launch({ executablePath: "C:/Program Files/Google/Chrome/Application/chrome.exe", headless: true, args: ["--disable-gpu", "--hide-scrollbars"] });
  const shot = (name) => `${kind}_${name.replace(/[^a-z0-9]+/gi, "_")}`;

  where = `${kind}: sign-in screens`;
  {
    const { ctx, page } = await newPhone(browser, kind);
    await t("the sign-in page is healthy and shows the Telgo logo", async () => {
      await page.goto(BASE + "/login", { waitUntil: "domcontentloaded" });
      ok(await page.locator("img[alt*='Telgo']").count(), "logo");
      await healthy(page, "login", shot("login"));
    });
    await t("a wrong password is said in plain words", async () => {
      await page.waitForSelector("[data-testid=login-submit]:not([disabled])", { timeout: 20000 });
      await page.fill("[data-testid=login-id]", "TLG-SUP00002");
      await page.fill("[data-testid=login-pw]", "wrong-one");
      await page.click("[data-testid=login-submit]");
      await page.waitForSelector("text=/is wrong/", { timeout: 15000 });
    });
    await t("the old app's saved password is removed from the phone", async () => {
      await page.evaluate(() => { localStorage.setItem("telgo_saved_password", "x"); localStorage.setItem("telgo_saved_email", "y"); });
      await page.reload({ waitUntil: "domcontentloaded" });
      await page.waitForSelector("[data-testid=login-submit]:not([disabled])", { timeout: 20000 });
      await page.waitForTimeout(300);
      const left = await page.evaluate(() => [localStorage.getItem("telgo_saved_password"), localStorage.getItem("telgo_saved_email")]);
      ok(left[0] === null && left[1] === null, "still there");
    });
    await t("ask for access: the form is sent and confirmed", async () => {
      await go(page, "request-access");
      await page.waitForSelector("[data-testid=ra-submit]:not([disabled])", { timeout: 20000 });
      await page.fill("[data-testid=ra-name]", `Field ${kind}`);
      await page.fill("[data-testid=ra-email]", `field-${kind}@telgo.local`);
      await page.selectOption("[data-testid=ra-role]", "supervisor");
      await page.click("[data-testid=ra-submit]");
      await page.waitForSelector("[data-testid=request-done]", { timeout: 15000 });
      ok((await q("select access_status from mobile_app_users where email = $1", [`field-${kind}@telgo.local`]))[0]?.access_status === "pending", "saved as pending");
    });
    await ctx.close();
  }

  for (const [role, id, pw] of [["admin", "TLG-ADMIN1", PASSWORDS.admin], ["supervisor", "TLG-SUP00001", PASSWORDS.sup1], ["finance", "TLG-FIN00001", PASSWORDS.fin], ["client", "TLG-CLI00001", PASSWORDS.client]]) {
    where = `${kind}: every ${role} screen`;
    const { ctx, page } = await newPhone(browser, kind);
    await login(page, id, pw);
    if (role === "supervisor" || role === "finance") await t("not signed in at a site: only the sign-in screen, then sign in", async () => { await signInAtSite(page); });
    await t("the menu opens with its groups (button)", async () => {
      await go(page, "app");
      await page.click("[data-testid=menu-button]");
      await page.waitForTimeout(400);
      const groups = await page.locator(".nav-group").allTextContents();
      ok(groups.length >= 2, `groups: ${groups.join(",")}`);
      if (role === "admin") ok(["Team", "Projects", "Inventory", "Reports", "Files", "You", "System"].every((g) => groups.map((x) => x.toLowerCase()).includes(g.toLowerCase())), `admin groups: ${groups.join(",")}`);
      // every menu word is white on the dark blue (a form-label style once turned them dark)
      const dark = await page.$$eval(".drawer .nav-item", (els) => els.map((e) => {
        const label = e.querySelector(".nav-label") ?? e;
        const [r, g, b] = getComputedStyle(label).color.match(/\d+/g).map(Number);
        return { t: label.textContent, light: r > 220 && g > 220 && b > 220 };
      }).filter((x) => !x.light).map((x) => x.t));
      ok(!dark.length, `menu words not white: ${dark.join(", ")}`);
      await page.screenshot({ path: path.join(OUT, `${shot(role + "_menu")}.png`), animations: "disabled", timeout: 60000 }).catch(() => {});
      await page.mouse.click(400, 400);
    });
    for (const p of MENU[role]) {
      await t(`${p} is healthy`, async () => {
        page.errors.length = 0;
        await go(page, p);
        await page.waitForSelector("main", { timeout: 20000 });
        await healthy(page, p, shot(`${role}_${p}`));
        ok(!page.errors.length, `console: ${page.errors.join(" | ")}`);
      });
    }
    await ctx.close();
  }

  where = `${kind}: the field day, from sign-in to approval`;
  {
    const sup = await newPhone(browser, kind);
    const adm = await newPhone(browser, kind);
    const s = sup.page, a = adm.page;
    watch = [s, a];
    await login(s, "TLG-SUP00002", PASSWORDS.sup2);
    await t("gate → sign in at the site", async () => { await signInAtSite(s); ok(await s.locator("[data-testid=sign-out-card]").count(), "signed in card"); });
    await t("send daily report: every step filled, photos added, sent, confirmed by the server", async () => {
      await s.click("[data-testid=send-report-shortcut]");
      await s.waitForSelector("[data-testid=report-project]");
      await s.selectOption("[data-testid=report-project]", "prj-6133");
      await s.click("[data-testid=report-next]");
      await s.fill("[data-testid=crew-workers]", "5");
      await s.fill("[data-testid=crew-rate]", "950");
      await s.click("[data-testid=ot-add]");
      await s.fill("[data-testid=ot-hours-0]", "2");
      await s.fill("[data-testid=ot-rate-0]", "120");
      await s.waitForSelector("[data-testid=wages-total]:has-text('4,990')", { timeout: 5000 }); // 5 × 950 + 1 × 2 × 120
      await s.click("[data-testid=report-next]");
      await s.click("[data-testid=expense-add-fuel]");
      await s.fill("[data-testid=expense-amount-0]", "640");
      await s.locator("[data-testid=expense-bill-0] input[type=file]").nth(1).setInputFiles(PHOTO);
      await s.waitForSelector("[data-testid=expense-bill-0] .thumb img", { timeout: 20000 });
      await s.click("[data-testid=report-next]");
      await s.click("[data-testid=work-cable_laying]");
      await s.fill("[data-testid=work-value-cable_laying]", "120");
      await s.locator("[data-testid=work-photos-cable_laying] input[type=file]").nth(1).setInputFiles(PHOTO);
      await s.waitForSelector("[data-testid=work-photos-cable_laying] .thumb img", { timeout: 20000 });
      await s.click("[data-testid=work-hdd]");
      await s.fill("[data-testid=hdd-rod-length]", "3");
      await s.click("[data-testid=rod-add]"); await s.fill("[data-testid=rod-depth-0]", "1.2");
      await s.click("[data-testid=rod-add]"); await s.fill("[data-testid=rod-depth-1]", "1.6");
      await s.click("[data-testid=report-next]");
      await s.click("[data-testid=report-next]");
      await s.fill("[data-testid=note-work]", "Cable laid from the junction");
      await s.click("[data-testid=report-next]");
      await s.waitForSelector("[data-testid=report-check]");
      await healthy(s, "check step", shot("report_check"));
      await s.click("[data-testid=report-send]");
      await s.waitForSelector("[data-testid=report-sent]", { timeout: 30000 });
      const r = (await q("select calculated_wages::float w, fuel_expenses::float f, cable_laying_length::float c, hdd_length::float h, jsonb_array_length(details->'files') files from pending_daily_reports where supervisor_name = 'Ebin Site' and report_date = (now() at time zone 'Asia/Kolkata')::date order by created_at desc limit 1"))[0];
      ok(r && r.w === 4990 && r.f === 640 && r.c === 120 && r.h === 6 && r.files === 2, JSON.stringify(r));
      const left = await s.evaluate(() => Object.keys(localStorage).some((k) => k.startsWith("telgo_report_draft")));
      if (left) console.log("\nDRAFT LOG:\n" + (await s.evaluate(() => window.__draftLog.slice(-8).join("\n"))));
      ok(!left, "draft cleared after the server confirmed");
    });
    await login(a, "TLG-ADMIN1", PASSWORDS.admin);
    await t("the admin sees it on Home and approves it", async () => {
      const id = (await q("select id from pending_daily_reports where supervisor_name = 'Ebin Site' order by created_at desc limit 1"))[0].id;
      await go(a, `app/reports/view/${id}`);
      await a.waitForSelector("[data-testid=approve]", { timeout: 20000 });
      await healthy(a, "report view", shot("report_view_admin"));
      await a.click("[data-testid=approve]");
      await a.click("[data-testid=approve-confirm]");
      await a.waitForSelector("text=Approved", { timeout: 15000 });
      ok((await q("select status from pending_daily_reports where id = $1", [id]))[0].status === "approved", "approved in the database");
    });
    await t("inventory: add with a photo, report 'used', the admin approves, the item shows the new amount", async () => {
      await go(s, "app/inventory/add");
      await s.waitForSelector("[data-testid=inv-project]");
      await s.selectOption("[data-testid=inv-project]", "prj-6133");
      await s.fill("[data-testid=inv-material]", "HDPE duct");
      await s.fill("[data-testid=inv-quantity]", "300");
      await s.fill("[data-testid=inv-location]", "Site yard near the school");
      await s.locator("[data-testid=inv-photo] input[type=file]").nth(1).setInputFiles(PHOTO);
      await s.waitForSelector("[data-testid=inv-photo] .thumb img", { timeout: 20000 });
      await s.click("[data-testid=inv-save]");
      await s.waitForSelector("text=/HDPE duct added at/", { timeout: 20000 });
      const it = (await q("select id from site_materials where material = 'HDPE duct' order by created_at desc limit 1"))[0];
      await go(s, `app/inventory/item/${it.id}`);
      await s.click("[data-testid=inv-used]");
      await s.fill("[data-testid=inv-used-qty]", "75");
      await s.click("[data-testid=inv-change-send]");
      await s.waitForSelector("text=Waiting for the admin", { timeout: 15000 });
      await go(a, "app/inventory/approvals");
      await a.click("[data-testid=inv-approve]");
      await a.click("[data-testid=inv-decide-confirm]");
      await a.waitForSelector("text=Nothing waiting", { timeout: 15000 });
      await go(s, `app/inventory/item/${it.id}`);
      await s.waitForSelector("[data-testid=inv-left]:has-text('225')", { timeout: 15000 });
    });
    await t("chat: the supervisor writes to the admin; the admin reads it", async () => {
      await go(s, "app/chat");
      await s.click("text=Admin Local");
      await s.waitForSelector("[data-testid=chat-text]", { timeout: 15000 });
      await s.fill("[data-testid=chat-text]", `Hello from the ${kind} test`);
      await s.click("[data-testid=chat-send]");
      await s.waitForSelector(`text=Hello from the ${kind} test`, { timeout: 15000 });
      await go(a, "app/chat");
      await a.click("text=Ebin Site");
      await a.waitForSelector(`text=Hello from the ${kind} test`, { timeout: 15000 });
      await healthy(a, "chat thread", shot("chat_thread"));
    });
    await t("pop-up chat: Team chat on top, send, minimise, the same chat comes back, sticker, new group, phone Back", async () => {
      await go(a, "app");
      await a.click("[data-testid=chat-button]");
      await a.waitForSelector("[data-testid=chat-pop] [data-testid=chat-team]", { timeout: 15000 });
      const first = await a.$eval("[data-testid=chat-pop] [data-testid=chats]", (el) => el.querySelector("[data-testid=chat-team], .list .item")?.getAttribute("data-testid"));
      ok(first === "chat-team", "the Team chat is the first chat");
      await a.screenshot({ path: path.join(OUT, `${shot("chat_popup_list")}.png`), animations: "disabled", timeout: 60000 }).catch(() => {});
      await a.click("[data-testid=chat-pop] [data-testid=chat-team]");
      await a.waitForSelector("[data-testid=chat-pop] [data-testid=chat-text]", { timeout: 15000 });
      await a.fill("[data-testid=chat-pop] [data-testid=chat-text]", `Team hello from the ${kind} pop-up`);
      await a.click("[data-testid=chat-pop] [data-testid=chat-send]");
      await a.waitForSelector(`[data-testid=chat-pop] >> text=Team hello from the ${kind} pop-up`, { timeout: 15000 });
      await a.screenshot({ path: path.join(OUT, `${shot("chat_popup")}.png`), animations: "disabled", timeout: 60000 }).catch(() => {});
      // every button in the pop-up is big enough to tap
      const small = await a.$$eval("[data-testid=chat-pop] button", (els) => els.filter((e) => { const r = e.getBoundingClientRect(); return r.width > 0 && r.height > 0 && r.height < 40; }).map((e) => e.textContent.trim().slice(0, 20)));
      ok(!small.length, `too small to tap in the pop-up: ${small.join(" | ")}`);
      await a.click("[data-testid=chat-minimise]");
      await a.waitForSelector("[data-testid=chat-pop]", { state: "detached", timeout: 10000 });
      ok((await a.textContent("[data-testid=chat-button]")).includes("Team chat"), "the bubble carries the chat's name");
      await a.click("[data-testid=chat-button]");
      await a.waitForSelector(`[data-testid=chat-pop] >> text=Team hello from the ${kind} pop-up`, { timeout: 15000 });
      await a.click("[data-testid=chat-pop] [data-testid=chat-stickers]");
      await a.click("[data-testid=chat-pop] [data-testid=sticker-reached]");
      await a.waitForSelector("[data-testid=chat-pop] .bubble.plain .sticker", { timeout: 15000 });
      await a.click("[data-testid=chat-pop] [data-testid=chat-back]");
      await a.click("[data-testid=chat-pop] [data-testid=chat-new]");
      await a.fill("[data-testid=group-name]", `Site group ${kind}`);
      await a.click("[data-testid=group-people] .chip >> nth=0");
      await a.click("[data-testid=group-make]");
      await a.waitForSelector(`[data-testid=chat-pop] .chat-head-title >> text=Site group ${kind}`, { timeout: 15000 });
      ok((await q("select count(*)::int n from chat_threads where kind = 'topic' and title = $1", [`Site group ${kind}`]))[0].n === 1, "the group is in the database");
      const url = a.url();
      await a.goBack();
      await a.waitForSelector("[data-testid=chat-pop]", { state: "detached", timeout: 10000 });
      ok(a.url() === url, "Back folded the chat away and stayed on the screen");
    });
    await t("the map pictures really load (street and satellite), with a Google Maps link", async () => {
      await go(a, "app/projects/prj-6133");
      await a.waitForSelector("[data-testid=project-map] .leaflet-tile-loaded", { timeout: 20000 });
      const tiles = async () => a.$$eval("[data-testid=project-map] img.leaflet-tile-loaded", (els) => els.filter((e) => e.naturalWidth > 0).map((e) => new URL(e.src).host));
      const street = await tiles();
      ok(street.length > 0 && street.every((h) => h === "tile.openstreetmap.org"), `street tiles: ${[...new Set(street)].join(",")}`);
      await a.click("[data-testid=project-map] ~ .map-tools >> text=Satellite");
      await a.waitForFunction(() => [...document.querySelectorAll("[data-testid=project-map] img.leaflet-tile-loaded")].some((e) => e.naturalWidth > 0 && e.src.includes("arcgisonline")), null, { timeout: 20000 });
      const link = await a.getAttribute("a:has-text('in Google Maps')", "href");
      ok(/^https:\/\/www\.google\.com\/maps\/search\/\?api=1&query=-?\d+\.\d+,-?\d+\.\d+$/.test(link ?? ""), `link ${link}`);
    });
    await t("the admin draws a new project's route on the map and saves it", async () => {
      await go(a, "app/projects/edit/new");
      await a.fill("[data-testid=p-name]", `Map test ${kind}`);
      await a.fill("[data-testid=p-code]", `MAP-${kind.toUpperCase()}`);
      await a.fill("[data-testid=p-place]", "Aluva");
      const m = a.locator("[data-testid=route-editor]");
      await m.scrollIntoViewIfNeeded();
      const box = await m.boundingBox();
      // the map centres on the first point, so the next taps go well away from the middle (a tap on a pin adds nothing)
      for (const [x, y] of [[0.3, 0.4], [0.8, 0.25], [0.2, 0.8]]) { await a.mouse.click(box.x + box.width * x, box.y + box.height * y); await a.waitForTimeout(250); }
      await a.click("[data-testid=p-save]");
      await a.waitForURL(/projects\/edit\/map-/, { timeout: 20000 });
      const p = (await q("select jsonb_array_length(route) n from projects where code = $1", [`MAP-${kind.toUpperCase()}`]))[0];
      ok(p && p.n === 3, JSON.stringify(p));
    });
    await t("profile: the name is changed and the server confirms it", async () => {
      await go(s, "app/profile");
      await s.waitForSelector("[data-testid=profile-name]");
      await s.fill("[data-testid=profile-name]", `Ebin Site ${kind}`);
      await s.click("[data-testid=profile-save]");
      await s.waitForSelector("text=/Saved at/", { timeout: 15000 });
      ok((await q("select full_name from mobile_app_users where login_id = 'TLG-SUP00002'"))[0].full_name === `Ebin Site ${kind}`, "saved in the database");
      await q("update mobile_app_users set full_name = 'Ebin Site' where login_id = 'TLG-SUP00002'");
    });
    await t("every note box has Speak (voice typing)", async () => {
      await go(s, "app/report/new");
      await s.waitForSelector("[data-testid=report-project]");
      await s.selectOption("[data-testid=report-project]", "prj-6133");
      await s.click("[data-testid=report-next]");
      ok(await s.locator("button:has-text('Speak')").count() >= 1, "Speak button");
    });
    await t("sign out from Home: the sign-in screen comes back", async () => {
      await go(s, "app");
      await s.click("[data-testid=sign-out-button]");
      await s.click("[data-testid=sign-out-confirm]");
      await s.waitForSelector("[data-testid=gate]", { timeout: 20000 });
      ok((await q("select closed_how from mobile_attendance where user_login_id = 'TLG-SUP00002' order by check_in_at desc limit 1"))[0].closed_how === "signed_out", "closed in the database");
    });
    await t("the swipe from the left edge opens the menu", async () => {
      await go(a, "app");
      await a.waitForSelector("[data-testid=home-admin]");
      await a.evaluate(() => {
        const mk = (type, x) => {
          const ev = new Event(type, { bubbles: true });
          const pt = [{ clientX: x, clientY: 400 }];
          Object.defineProperty(ev, "touches", { value: type === "touchend" ? [] : pt });
          Object.defineProperty(ev, "changedTouches", { value: pt });
          return ev;
        };
        document.dispatchEvent(mk("touchstart", 6));
        document.dispatchEvent(mk("touchend", 160));
      });
      await a.waitForTimeout(400);
      ok(await a.evaluate(() => document.body.classList.contains("menu-open")), "menu open");
    });
    watch = [];
    await sup.ctx.close(); await adm.ctx.close();
  }
  await browser.close();
}

console.log("Resetting the local test database…");
await seed();
const only = process.argv.find((a) => a.startsWith("--"));
if (only !== "--webkit-only") await run("android");
if (only !== "--chrome-only") {
  try { await run("iphone"); }
  catch (e) { results.push({ where: "iphone", name: "WebKit could start", ok: false, why: e.message.split("\n")[0] }); }
}
await db.end();
console.log("\n");
let cur = "";
for (const r of results) { if (r.where !== cur) { cur = r.where; console.log(`\n${cur}`); } if (!r.ok) console.log(`  FAIL  ${r.name}\n        → ${r.why}`); }
const failed = results.filter((r) => !r.ok).length;
console.log(`\n${results.length - failed}/${results.length} phone checks passed · screenshots in tests/.out/ui/`);
process.exit(failed ? 1 : 0);

import { chromium, devices } from "playwright-core";

const chromePath =
  process.env.CHROME_PATH ?? "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe";
const baseUrl = process.env.TELGO_BASE_URL ?? "http://127.0.0.1:3000";

const results = [];

function record(name, ok, detail = "") {
  results.push({ name, ok, detail });
}

async function expectVisible(page, text, name) {
  const locator = page.getByText(text, { exact: false });
  await locator.first().waitFor({ state: "visible", timeout: 20_000 });
  record(name, true, text);
}

async function expectAnyVisible(page, patterns, name) {
  const locator = page.getByText(new RegExp(patterns.join("|"), "i"));
  await locator.first().waitFor({ state: "visible", timeout: 20_000 });
  record(name, true, patterns.join(" or "));
}

async function goto(page, route) {
  await page.goto(`${baseUrl}${route}`, { waitUntil: "domcontentloaded", timeout: 45_000 });
  await page.waitForLoadState("domcontentloaded", { timeout: 45_000 });
  const error = await page.getByText("Application error", { exact: false }).count();
  if (error) throw new Error(`Application error on ${route}`);
}

async function tapVisibleCenter(page, locator, name) {
  await locator.scrollIntoViewIfNeeded();
  await page.waitForTimeout(700);
  const ownsCenter = await locator.evaluate((element) => {
    const rect = element.getBoundingClientRect();
    const x = rect.left + rect.width / 2;
    const y = rect.top + rect.height / 2;
    return document.elementsFromPoint(x, y).includes(element);
  });
  if (!ownsCenter) throw new Error(`${name} is covered at its tap point`);
  const box = await locator.boundingBox();
  if (!box) throw new Error(`${name} has no visible tap box`);
  await page.mouse.click(box.x + box.width / 2, box.y + box.height / 2);
}

async function clickRole(page, role) {
  const button = page.getByRole("button", { name: role });
  await button.click();
}

async function signIn(page, role) {
  const credentials = {
    admin: ["admin@telgo.test", "TelgoAdmin#2026"],
    engineer: ["engineer@telgo.test", "TelgoEng#2026"],
    finance: ["finance@telgo.test", "TelgoFin#2026"],
    client: ["client@telgo.test", "TelgoClient#2026"]
  };
  await goto(page, "/");
  await page.getByRole("button", { name: "Sign In" }).waitFor({ state: "visible", timeout: 30_000 });
  await clickRole(page, role);
  await page.getByLabel("User ID / Phone Number").fill(credentials[role][0]);
  await page.getByLabel("Password").fill(credentials[role][1]);
  await page.getByRole("button", { name: "Sign In" }).click({ noWaitAfter: true });
  await page.waitForURL(/\/app\//, { timeout: 45_000, waitUntil: "domcontentloaded" });
  record(`${role} login`, true, page.url());
}

const browser = await chromium.launch({
  executablePath: chromePath,
  headless: true,
  args: ["--force-device-scale-factor=1"]
});

const context = await browser.newContext({
  ...devices["Pixel 5"],
  geolocation: { latitude: 9.9312, longitude: 76.2673 },
  permissions: ["geolocation"]
});

const page = await context.newPage();
const runtimeErrors = [];
page.on("pageerror", (error) => runtimeErrors.push(error.message));
page.on("console", (message) => {
  if (message.type() === "error") runtimeErrors.push(message.text());
});

try {
  await goto(page, "/request-access");
  await page.getByRole("button", { name: "Submit Request" }).waitFor({ state: "visible", timeout: 30_000 });
  await page.getByLabel("Full Name").fill("Aneesh P. Menon");
  await page.getByLabel("Phone Number").fill("+91 98955 42318");
  await page.getByLabel("Email Address").fill(`aneesh.${Date.now()}@telgo.test`);
  await page.getByLabel("Company Name").fill("Telgo Power Projects");
  await page.getByLabel("Preferred Site / Project").fill("Panangad HDD Crossing");
  await page.getByLabel("Company Address").fill("Kundannoor, Kochi, Kerala");
  await page.getByRole("button", { name: "Submit Request" }).click();
  await page
    .getByText(/Request submitted|form stayed safe/i)
    .waitFor({ state: "visible", timeout: 30_000 });
  record("access request stored", true, "submitted or safely queued");

  await signIn(page, "admin");
  await goto(page, "/app/admin/approvals");
  await expectVisible(page, "Access Requests", "admin sees pending access requests");
  await page.getByRole("button", { name: "Approve" }).first().click();
  await expectVisible(page, "Generated credentials", "admin approval generated credentials");

  await signIn(page, "engineer");
  await expectVisible(page, "Current Working Site", "engineer dashboard loaded");
  await page.getByRole("button", { name: "Save Site" }).click();
  await expectVisible(page, "saved as current working site", "project assignment saved");

  await goto(page, "/app/engineer/attendance");
  await page.getByRole("button", { name: "Mark attendance" }).click();
  await expectVisible(page, "Checked In", "attendance geofence check-in");

  await goto(page, "/app/chat");
  await page.getByRole("button", { name: "Send message" }).waitFor({ state: "visible", timeout: 30_000 });
  await page.getByPlaceholder("Type a message...").fill("Hi everyone, site work started.");
  await page.getByRole("button", { name: "Send message" }).click();
  await expectVisible(page, "site work started", "engineer chat persistence");
  await page.getByPlaceholder("Type a message...").fill("@Finance Need diesel approval for HDD machine. @Admin please note.");
  await page.getByRole("button", { name: "Send message" }).click();
  await expectVisible(page, "Need diesel approval", "role tagging chat");

  await goto(page, "/app/engineer/finance-request");
  await page.getByRole("button", { name: "Submit Request" }).waitFor({ state: "visible", timeout: 30_000 });
  await page.getByLabel("Title / Purpose").fill("HDD bearing replacement");
  await page.getByLabel("Description").fill("Urgent request for HDD bearing replacement at Panangad.");
  await page.getByRole("textbox", { name: "Amount" }).fill("12000");
  await page.getByRole("button", { name: "Submit Request" }).click();
  await expectAnyVisible(page, ["Finance request submitted", "Saved offline and queued"], "engineer finance request");

  await goto(page, "/app/engineer/shift-report");
  await page.getByLabel("Meters Drilled Today").fill("245");
  await page.getByLabel("Fuel Used (L)").fill("72");
  await tapVisibleCenter(page, page.getByRole("button", { name: "Submit Report" }), "Submit Report");
  await expectVisible(page, "Logout is now unlocked", "mandatory shift report");

  await goto(page, "/app/admin/finance");
  await expectVisible(page, "Access Restricted", "engineer blocked from finance");

  await goto(page, "/app/engineer/offline-sync");
  await page.getByRole("button", { name: "Simulate No Signal" }).click();
  await expectVisible(page, "Offline Mode", "offline mode simulated");
  await page.getByRole("button", { name: "Restore Signal" }).click();

  await signIn(page, "finance");
  await expectVisible(page, "Engineer Finance Requests", "finance dashboard requests visible");
  await page.getByRole("button", { name: "Approve" }).first().click();
  await goto(page, "/app/chat");
  await expectVisible(page, "Approved. Funds ready.", "finance chat reply sync");
  await goto(page, "/app/engineer/shift-report");
  await expectVisible(page, "Access Restricted", "finance blocked from engineer reports");

  await signIn(page, "client");
  await expectVisible(page, "Client Portal", "client dashboard loaded");
  await page.getByRole("button", { name: "Request Review" }).click();
  await expectVisible(page, "Review request sent to Admin", "client review escalation");
  await goto(page, "/app/admin");
  await expectVisible(page, "Access Restricted", "client blocked from admin");

  for (const route of [
    "/",
    "/request-access",
    "/app/engineer",
    "/app/engineer/attendance",
    "/app/engineer/logs",
    "/app/engineer/finance-request",
    "/app/engineer/shift-report",
    "/app/admin/approvals",
    "/app/admin/finance",
    "/app/client",
    "/app/client/photos",
    "/app/chat"
  ]) {
    await goto(page, route);
    const metrics = await page.evaluate(() => ({
      overflowX: document.documentElement.scrollWidth - window.innerWidth,
      buttonsTooSmall: Array.from(document.querySelectorAll("button, a")).filter((element) => {
        const rect = element.getBoundingClientRect();
        return rect.width > 0 && rect.height > 0 && (rect.width < 36 || rect.height < 36);
      }).length
    }));
    record(`mobile layout ${route}`, metrics.overflowX <= 2 && metrics.buttonsTooSmall <= 2, JSON.stringify(metrics));
  }
} catch (error) {
  const bodyText = await page.locator("body").innerText().catch(() => "");
  record(
    "workflow exception",
    false,
    `${error instanceof Error ? error.message : String(error)}\nVISIBLE:\n${bodyText.slice(0, 1200)}`
      + `\nERRORS:\n${runtimeErrors.slice(-8).join("\n")}`
  );
} finally {
  await browser.close();
}

console.table(results);
const failed = results.filter((item) => !item.ok);
if (failed.length) {
  console.error(JSON.stringify(failed, null, 2));
  process.exitCode = 1;
}

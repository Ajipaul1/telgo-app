import fs from "node:fs/promises";
import path from "node:path";
import { chromium } from "playwright-core";

const chromePath = process.env.CHROME_PATH ?? "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe";
const baseUrl = process.env.TELGO_BASE_URL ?? "http://127.0.0.1:3000";
const outDir = process.env.TELGO_SCREENSHOT_DIR
  ? path.resolve(process.env.TELGO_SCREENSHOT_DIR)
  : path.join(process.cwd(), "screenshots", "mobile-ui-latest");

const allRoutes = [
  "/",
  "/request-access",
  "/forgot-password",
  "/otp",
  "/app",
  "/app/admin",
  "/app/admin/projects",
  "/app/admin/projects/new",
  "/app/admin/staff",
  "/app/admin/staff/eng-arjun",
  "/app/admin/staff/eng-arjun/assign-task",
  "/app/admin/approvals",
  "/app/admin/alerts",
  "/app/admin/map",
  "/app/admin/map/full",
  "/app/admin/profile",
  "/app/admin/finance",
  "/app/chat",
  "/app/client",
  "/app/client/projects",
  "/app/client/projects/new",
  "/app/client/settings",
  "/app/client/progress",
  "/app/client/progress/update",
  "/app/client/documents",
  "/app/client/documents/new",
  "/app/client/engineers",
  "/app/client/reports",
  "/app/client/profile",
  "/app/client/photos",
  "/app/client/review",
  "/app/engineer",
  "/app/engineer/projects",
  "/app/engineer/attendance",
  "/app/engineer/documents",
  "/app/engineer/documents/new",
  "/app/engineer/reports",
  "/app/engineer/profile",
  "/app/engineer/finance-request",
  "/app/engineer/leave",
  "/app/engineer/shift-report",
  "/app/engineer/offline-sync",
  "/app/engineer/logs"
];

const requested = process.env.TELGO_SCREENSHOT_ROUTES;
const routes = requested
  ? requested.split(",").map((route) => route.trim()).filter(Boolean)
  : allRoutes;
const fullPage = process.env.TELGO_FULL_PAGE === "true";

await fs.mkdir(outDir, { recursive: true });

const browser = await chromium.launch({
  executablePath: chromePath,
  headless: true
});

const results = [];

for (const route of routes) {
  const page = await browser.newPage({
    viewport: { width: 393, height: 852 },
    deviceScaleFactor: 2,
    isMobile: true,
    hasTouch: true
  });

  const response = await page.goto(`${baseUrl}${route}`, {
    waitUntil: "domcontentloaded",
    timeout: 45_000
  });
  await page.waitForTimeout(900);
  if (route === "/") {
    await page.waitForFunction(() => !document.body.innerText.includes("Loading..."), null, {
      timeout: 8_000
    }).catch(() => undefined);
  }

  const metrics = await page.evaluate(() => {
    const root = document.documentElement;
    const visibleText = document.body.innerText.trim();
    const buttons = Array.from(document.querySelectorAll("button, a")).filter((element) => {
      const rect = element.getBoundingClientRect();
      return rect.width > 0 && rect.height > 0;
    });
    const smallTargets = buttons.filter((element) => {
      const rect = element.getBoundingClientRect();
      return rect.width < 34 || rect.height < 34;
    }).length;

    return {
      textLength: visibleText.length,
      overflowX: Math.max(0, root.scrollWidth - window.innerWidth),
      smallTargets,
      scrollHeight: root.scrollHeight
    };
  });

  const safeName = route === "/" ? "home" : route.replaceAll("/", "__").replace(/^__/, "");
  const screenshot = path.join(outDir, `${safeName}.png`);
  await page.screenshot({ path: screenshot, fullPage });
  const stat = await fs.stat(screenshot);
  await page.close();

  results.push({
    route,
    status: response?.status() ?? 0,
    screenshot: path.relative(process.cwd(), screenshot),
    bytes: stat.size,
    ...metrics,
    ok:
      (response?.ok() ?? false) &&
      metrics.textLength > 50 &&
      metrics.overflowX <= 2 &&
      stat.size > 10_000
  });
}

await browser.close();

console.table(
  results.map(({ route, status, overflowX, smallTargets, bytes, ok }) => ({
    route,
    status,
    overflowX,
    smallTargets,
    bytes,
    ok
  }))
);

const failures = results.filter((result) => !result.ok);
if (failures.length) {
  console.error(JSON.stringify(failures, null, 2));
  process.exitCode = 1;
}

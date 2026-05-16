import fs from "node:fs/promises";
import path from "node:path";
import { chromium } from "playwright-core";

const chromePath =
  process.env.CHROME_PATH ?? "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe";
const baseUrl = process.env.TELGO_BASE_URL ?? "http://127.0.0.1:3000";
const outDir = path.join(process.cwd(), "test-results", "visual");

const routes = [
  "/",
  "/request-access",
  "/app/engineer",
  "/app/engineer/attendance",
  "/app/engineer/logs",
  "/app/admin",
  "/app/admin/map",
  "/app/admin/finance",
  "/app/chat"
];

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
    waitUntil: "networkidle",
    timeout: 45_000
  });

  await page.waitForTimeout(1200);

  const metrics = await page.evaluate(() => {
    const body = document.body;
    const root = document.documentElement;
    const visibleText = body.innerText.trim();
    const overflowX = root.scrollWidth - window.innerWidth;
    const fixedNav = Boolean(document.querySelector("nav"));
    const mapCanvas = Boolean(
      document.querySelector('[data-telgo-google-map="true"]') || document.querySelector(".gm-style")
    );
    const buttons = Array.from(document.querySelectorAll("button, a")).filter((element) => {
      const rect = element.getBoundingClientRect();
      return rect.width > 0 && rect.height > 0;
    });
    const smallTargets = buttons.filter((element) => {
      const rect = element.getBoundingClientRect();
      return rect.width < 36 || rect.height < 36;
    }).length;
    return {
      title: document.title,
      textLength: visibleText.length,
      overflowX,
      fixedNav,
      mapCanvas,
      smallTargets,
      scrollHeight: root.scrollHeight
    };
  });

  const safeName = route === "/" ? "home" : route.replaceAll("/", "__").replace(/^__/, "");
  const screenshot = path.join(outDir, `${safeName}.png`);
  await page.screenshot({ path: screenshot, fullPage: false });
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
      metrics.textLength > 100 &&
      metrics.overflowX <= 2 &&
      metrics.smallTargets <= 2 &&
      stat.size > 20_000
  });
}

await browser.close();

console.table(
  results.map(({ route, status, overflowX, smallTargets, mapCanvas, bytes, ok }) => ({
    route,
    status,
    overflowX,
    smallTargets,
    mapCanvas,
    bytes,
    ok
  }))
);

const failures = results.filter((result) => !result.ok);
if (failures.length) {
  console.error(JSON.stringify(failures, null, 2));
  process.exitCode = 1;
}

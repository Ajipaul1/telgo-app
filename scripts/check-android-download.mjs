import fs from "node:fs/promises";
import path from "node:path";
import { chromium, devices } from "playwright-core";

const chromePath =
  process.env.CHROME_PATH ?? "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe";
const baseUrl = process.env.TELGO_BASE_URL ?? "http://127.0.0.1:3000";
const outDir = path.join(process.cwd(), "test-results", "android-download");

await fs.mkdir(outDir, { recursive: true });

const apkResponse = await fetch(`${baseUrl}/downloads/telgo-hub.apk`);
if (!apkResponse.ok) {
  throw new Error(`APK download returned HTTP ${apkResponse.status}`);
}

const apkBytes = Buffer.from(await apkResponse.arrayBuffer());
if (apkBytes.length < 1_000_000 || apkBytes.subarray(0, 2).toString("utf8") !== "PK") {
  throw new Error("APK download is missing or does not look like an APK zip container.");
}

const browser = await chromium.launch({
  executablePath: chromePath,
  headless: true
});

const page = await browser.newPage({
  ...devices["Pixel 5"]
});

await page.goto(baseUrl, { waitUntil: "domcontentloaded", timeout: 45_000 });
await page.locator("#download-android").scrollIntoViewIfNeeded();
await page.getByRole("link", { name: "Download Android App" }).waitFor({
  state: "visible",
  timeout: 20_000
});

const metrics = await page.evaluate(() => {
  const section = document.querySelector("#download-android");
  const link = document.querySelector('a[href="/downloads/telgo-hub.apk"]');
  const rect = section?.getBoundingClientRect();
  return {
    sectionVisible: Boolean(section && rect && rect.width > 0 && rect.height > 0),
    linkHref: link?.getAttribute("href") ?? null,
    overflowX: document.documentElement.scrollWidth - window.innerWidth,
    smallTargets: Array.from(document.querySelectorAll("#download-android a, #download-android button")).filter(
      (element) => {
        const target = element.getBoundingClientRect();
        return target.width > 0 && target.height > 0 && (target.width < 44 || target.height < 44);
      }
    ).length
  };
});

await page.screenshot({
  path: path.join(outDir, "landing-download-mobile.png"),
  fullPage: false
});
await browser.close();

const ok =
  metrics.sectionVisible &&
  metrics.linkHref === "/downloads/telgo-hub.apk" &&
  metrics.overflowX <= 2 &&
  metrics.smallTargets === 0;

console.table([
  {
    ...metrics,
    apkKb: Math.round(apkBytes.length / 1024),
    ok
  }
]);

if (!ok) process.exitCode = 1;

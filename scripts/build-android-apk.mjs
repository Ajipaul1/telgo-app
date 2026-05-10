import { createHash } from "node:crypto";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { inflateRawSync } from "node:zlib";

const endpoint =
  process.env.PWABUILDER_APK_ENDPOINT ??
  "https://pwabuilder-cloudapk.azurewebsites.net/generateAppPackage";
const host = process.env.TELGO_APP_URL ?? "https://telgo-app.vercel.app";
const packageId = process.env.TELGO_ANDROID_PACKAGE_ID ?? "com.telgopower.telgohub";
const appVersion = process.env.TELGO_ANDROID_VERSION ?? "1.0.0.0";
const appVersionCode = Number(process.env.TELGO_ANDROID_VERSION_CODE ?? "1");

const root = process.cwd();
const publicDownloadsDir = path.join(root, "public", "downloads");
const publicWellKnownDir = path.join(root, "public", ".well-known");
const distDir = path.join(root, "dist", "android");
const apkOutputPath = path.join(publicDownloadsDir, "telgo-hub.apk");
const zipOutputPath = path.join(distDir, "telgo-hub-android-package.zip");
const assetLinksOutputPath = path.join(publicWellKnownDir, "assetlinks.json");

const requestBody = {
  additionalTrustedOrigins: [],
  appVersion,
  appVersionCode,
  backgroundColor: "#020915",
  display: "standalone",
  enableNotifications: false,
  enableSiteSettingsShortcut: true,
  fallbackType: "customtabs",
  features: {
    locationDelegation: {
      enabled: true
    },
    playBilling: {
      enabled: false
    }
  },
  host,
  iconUrl: `${host}/assets/telgo-logo-cropped.png`,
  includeSourceCode: false,
  isChromeOSOnly: false,
  launcherName: "Telgo Hub",
  maskableIconUrl: null,
  monochromeIconUrl: null,
  name: "Telgo Hub",
  navigationColor: "#020915",
  navigationColorDark: "#020915",
  navigationDividerColor: "#020915",
  navigationDividerColorDark: "#020915",
  orientation: "default",
  packageId,
  serviceAccountJsonFile: null,
  shareTarget: null,
  shortcuts: [],
  signing: {
    alias: "telgo_hub",
    countryCode: "IN",
    fullName: "Telgo Power Projects",
    organization: "Telgo Power Projects",
    organizationalUnit: "Operations"
  },
  signingMode: "new",
  splashScreenFadeOutDuration: 300,
  startUrl: "/",
  themeColor: "#020915",
  themeColorDark: "#020915",
  webManifestUrl: `${host}/manifest.webmanifest`
};

function findEndOfCentralDirectory(zip) {
  for (let offset = zip.length - 22; offset >= 0; offset -= 1) {
    if (zip.readUInt32LE(offset) === 0x06054b50) return offset;
  }
  throw new Error("Invalid zip: end of central directory not found.");
}

function readZipEntry(zip, entry) {
  if (zip.readUInt32LE(entry.localHeaderOffset) !== 0x04034b50) {
    throw new Error(`Invalid local header for ${entry.name}`);
  }

  const fileNameLength = zip.readUInt16LE(entry.localHeaderOffset + 26);
  const extraLength = zip.readUInt16LE(entry.localHeaderOffset + 28);
  const dataStart = entry.localHeaderOffset + 30 + fileNameLength + extraLength;
  const compressed = zip.subarray(dataStart, dataStart + entry.compressedSize);

  if (entry.compressionMethod === 0) return compressed;
  if (entry.compressionMethod === 8) return inflateRawSync(compressed);
  throw new Error(`Unsupported zip compression method ${entry.compressionMethod} for ${entry.name}`);
}

function getZipEntries(zip) {
  const eocdOffset = findEndOfCentralDirectory(zip);
  const totalEntries = zip.readUInt16LE(eocdOffset + 10);
  let offset = zip.readUInt32LE(eocdOffset + 16);
  const entries = [];

  for (let index = 0; index < totalEntries; index += 1) {
    if (zip.readUInt32LE(offset) !== 0x02014b50) {
      throw new Error(`Invalid central directory header at ${offset}`);
    }

    const compressionMethod = zip.readUInt16LE(offset + 10);
    const compressedSize = zip.readUInt32LE(offset + 20);
    const fileNameLength = zip.readUInt16LE(offset + 28);
    const extraLength = zip.readUInt16LE(offset + 30);
    const commentLength = zip.readUInt16LE(offset + 32);
    const localHeaderOffset = zip.readUInt32LE(offset + 42);
    const name = zip.subarray(offset + 46, offset + 46 + fileNameLength).toString("utf8");

    entries.push({
      name,
      compressionMethod,
      compressedSize,
      localHeaderOffset
    });

    offset += 46 + fileNameLength + extraLength + commentLength;
  }

  return entries;
}

console.log(`Requesting Android package for ${host}...`);
const response = await fetch(endpoint, {
  method: "POST",
  headers: {
    "Content-Type": "application/json",
    "platform-identifier": "telgo-hub-local-build",
    "platform-identifier-version": appVersion
  },
  body: JSON.stringify(requestBody)
});

const bytes = Buffer.from(await response.arrayBuffer());
if (!response.ok) {
  throw new Error(`PWABuilder failed (${response.status}): ${bytes.toString("utf8")}`);
}

await mkdir(publicDownloadsDir, { recursive: true });
await mkdir(publicWellKnownDir, { recursive: true });
await mkdir(distDir, { recursive: true });
await writeFile(zipOutputPath, bytes);

const entries = getZipEntries(bytes);
const apkEntry = entries.find((entry) => entry.name.toLowerCase().endsWith(".apk"));
if (!apkEntry) throw new Error("PWABuilder response did not include an APK.");

const apk = readZipEntry(bytes, apkEntry);
await writeFile(apkOutputPath, apk);

const assetLinksEntry = entries.find((entry) => entry.name.toLowerCase().endsWith("assetlinks.json"));
if (assetLinksEntry) {
  await writeFile(assetLinksOutputPath, readZipEntry(bytes, assetLinksEntry));
}

const apkHash = createHash("sha256").update(apk).digest("hex");
console.log(`APK written: ${apkOutputPath}`);
console.log(`APK size: ${Math.round(apk.length / 1024)} KB`);
console.log(`APK sha256: ${apkHash}`);
console.log(`Build zip kept outside public: ${zipOutputPath}`);
if (assetLinksEntry) console.log(`Asset links written: ${assetLinksOutputPath}`);

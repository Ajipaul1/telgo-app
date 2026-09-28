import fs from "node:fs/promises";
import path from "node:path";
import { spawn } from "node:child_process";

const root = process.cwd();
const nodeBin = process.execPath;
const nextBin = path.join(root, "node_modules", "next", "dist", "bin", "next");
const screenshotScript = path.join(root, "scripts", "mobile-screenshots.mjs");
const baseUrl = process.env.TELGO_BASE_URL ?? "http://127.0.0.1:3002";
const screenshotDir =
  process.env.TELGO_SCREENSHOT_DIR ??
  path.join(root, "screenshots", `mobile-ui-${new Date().toISOString().slice(0, 10)}`);

const buildIdPath = path.join(root, ".next", "BUILD_ID");

async function main() {
  await ensureBuild();
  const server = startServer();

  try {
    await waitForServer(baseUrl, server);
    const exitCode = await runScreenshots();
    process.exitCode = exitCode;
  } finally {
    await stopServer(server);
  }
}

async function ensureBuild() {
  try {
    await fs.access(buildIdPath);
  } catch {
    await runCommand(nodeBin, [nextBin, "build"], { label: "next build" });
  }
}

function startServer() {
  const args = [nextBin, "start", "--port", "3002", "--hostname", "127.0.0.1"];
  const server = spawn(nodeBin, args, {
    cwd: root,
    env: process.env,
    stdio: ["ignore", "pipe", "pipe"]
  });

  server.stdout.on("data", (chunk) => process.stdout.write(chunk));
  server.stderr.on("data", (chunk) => process.stderr.write(chunk));

  return server;
}

async function waitForServer(url, server) {
  for (let attempt = 0; attempt < 80; attempt += 1) {
    if (server.exitCode !== null) {
      throw new Error(`Screenshot server exited early with code ${server.exitCode}.`);
    }

    try {
      const response = await fetch(url);
      if (response.ok) return;
    } catch {
    }

    await delay(1000);
  }

  throw new Error(`Screenshot server did not become ready at ${url}.`);
}

async function runScreenshots() {
  const env = {
    ...process.env,
    TELGO_BASE_URL: baseUrl,
    TELGO_SCREENSHOT_DIR: screenshotDir
  };

  return await runCommand(nodeBin, [screenshotScript], {
    env,
    label: "mobile screenshots"
  });
}

async function stopServer(server) {
  if (server.exitCode !== null) return;

  server.kill("SIGTERM");
  const stopped = await Promise.race([
    onceExit(server),
    delay(5000).then(() => false)
  ]);

  if (!stopped && server.exitCode === null) {
    server.kill("SIGKILL");
    await onceExit(server);
  }
}

async function runCommand(command, args, options = {}) {
  const child = spawn(command, args, {
    cwd: options.cwd ?? root,
    env: options.env ?? process.env,
    stdio: "inherit"
  });

  return await new Promise((resolve, reject) => {
    child.on("error", reject);
    child.on("exit", (code) => {
      if (code === 0) {
        resolve(0);
        return;
      }

      reject(new Error(`${options.label ?? "command"} failed with exit code ${code ?? "unknown"}.`));
    });
  }).catch((error) => {
    console.error(error instanceof Error ? error.message : String(error));
    return 1;
  });
}

function onceExit(child) {
  return new Promise((resolve) => {
    child.once("exit", () => resolve(true));
  });
}

function delay(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

await main();

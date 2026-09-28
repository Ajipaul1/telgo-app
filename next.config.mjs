import fs from "node:fs";
import { PHASE_PRODUCTION_BUILD } from "next/constants.js";

// One version number for the whole build: the commit on Vercel; locally the build's own id, which
// "next start" reads back from .next/BUILD_ID (so the phone and the server always agree).
function versionFor(phase) {
  if (process.env.VERCEL_GIT_COMMIT_SHA) return process.env.VERCEL_GIT_COMMIT_SHA.slice(0, 12);
  if (phase !== PHASE_PRODUCTION_BUILD && fs.existsSync(".next/BUILD_ID")) return fs.readFileSync(".next/BUILD_ID", "utf8").trim();
  return "local-" + Date.now().toString(36);
}

/** @type {(phase: string) => import('next').NextConfig} */
export default function config(phase) {
const buildId = versionFor(phase);
const nextConfig = {
  poweredByHeader: false,
  devIndicators: false,
  reactStrictMode: true,
  env: { NEXT_PUBLIC_BUILD_ID: buildId },
  generateBuildId: async () => buildId,
  async headers() {
    const common = [
      { key: "X-Content-Type-Options", value: "nosniff" },
      { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
      { key: "X-Robots-Tag", value: "noindex, nofollow" },
    ];
    return [
      { source: "/api/:path*", headers: [...common, { key: "X-Frame-Options", value: "DENY" }] },
      // the service worker must always be fresh (a stale one would keep an old app)
      { source: "/sw.js", headers: [...common, { key: "Cache-Control", value: "no-cache, no-store, must-revalidate" }, { key: "Service-Worker-Allowed", value: "/" }] },
      { source: "/icons/:path*", headers: [...common, { key: "Cache-Control", value: "public, max-age=604800" }] },
    ];
  },
  async redirects() {
    // the old app's addresses
    return [
      { source: "/app/admin", destination: "/app", permanent: false },
      { source: "/app/supervisor", destination: "/app", permanent: false },
      { source: "/app/finance", destination: "/app", permanent: false },
      { source: "/app/client", destination: "/app", permanent: false },
      { source: "/forgot-password", destination: "/login?forgot=1", permanent: false },
    ];
  },
};

return nextConfig;
}

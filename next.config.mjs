import { execSync } from "node:child_process";

// One version number everyone agrees on: the git commit (Vercel gives it; locally it is read from git).
// It must not change between the build, its worker processes and "next start", or the phone would
// always think a new version is out.
function version() {
  if (process.env.VERCEL_GIT_COMMIT_SHA) return process.env.VERCEL_GIT_COMMIT_SHA.slice(0, 12);
  try { return execSync("git rev-parse --short=12 HEAD", { stdio: ["ignore", "pipe", "ignore"] }).toString().trim(); }
  catch { return "dev"; }
}

/** @type {() => import('next').NextConfig} */
export default function config() {
const buildId = version();
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

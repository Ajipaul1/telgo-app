// Browser lock-down (RULES.md section 6): a new nonce and a strict Content-Security-Policy on every page,
// no framing, no sniffing, noindex, HSTS; location, camera and microphone only for this app.
// /app pages need a sign-in ticket (the page itself then checks it with the database).
import { NextResponse, type NextRequest } from "next/server";

// map pictures: OpenStreetMap and Esri (no key), and Google Maps when its key is set
const TILES = "https://tile.openstreetmap.org https://server.arcgisonline.com https://*.googleapis.com https://*.gstatic.com https://*.google.com https://*.googleusercontent.com";
const GOOGLE = "https://*.googleapis.com https://*.gstatic.com https://*.google.com";

export function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;
  if (pathname.startsWith("/app") && !req.cookies.get("telgo_sid")) {
    const url = new URL("/login", req.url);
    if (pathname !== "/app") url.searchParams.set("next", pathname);
    return NextResponse.redirect(url);
  }
  const nonce = btoa(crypto.randomUUID());
  const dev = process.env.NODE_ENV !== "production";
  // upgrade and HSTS only over https (the live app); on a plain-http test server they would break every file
  const https = req.nextUrl.protocol === "https:" || req.headers.get("x-forwarded-proto") === "https";
  const csp = [
    "default-src 'self'",
    `script-src 'self' 'nonce-${nonce}' 'strict-dynamic'${dev ? " 'unsafe-eval'" : ""}`,
    "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
    `img-src 'self' data: blob: ${TILES}`,
    "font-src 'self' https://fonts.gstatic.com",
    `connect-src 'self' ${GOOGLE} data: blob:${dev ? " ws:" : ""}`,
    "media-src 'self' blob:",
    "worker-src 'self' blob:",
    "manifest-src 'self'",
    `frame-src 'self' https://*.google.com`,
    "frame-ancestors 'none'",
    "base-uri 'self'",
    "form-action 'self'",
    "object-src 'none'",
    ...(https ? ["upgrade-insecure-requests"] : []),
  ].join("; ");
  const headers = new Headers(req.headers);
  headers.set("x-nonce", nonce);
  headers.set("Content-Security-Policy", csp);
  const res = NextResponse.next({ request: { headers } });
  res.headers.set("Content-Security-Policy", csp);
  res.headers.set("X-Content-Type-Options", "nosniff");
  res.headers.set("X-Frame-Options", "DENY");
  res.headers.set("Referrer-Policy", "strict-origin-when-cross-origin");
  res.headers.set("Permissions-Policy", "geolocation=(self), camera=(self), microphone=(self), payment=(), usb=(), interest-cohort=()");
  res.headers.set("Cross-Origin-Opener-Policy", "same-origin");
  res.headers.set("X-Robots-Tag", "noindex, nofollow");
  if (https) res.headers.set("Strict-Transport-Security", "max-age=63072000; includeSubDomains; preload");
  return res;
}

export const config = {
  // every page; not the API (it sets its own no-store replies), not Next's own files, not static files
  matcher: [{ source: "/((?!api/|_next/static|_next/image|icons/|downloads/|\\.well-known/|sw\\.js|manifest\\.webmanifest|favicon\\.ico).*)" }],
};

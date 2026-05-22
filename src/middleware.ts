import { NextResponse, type NextRequest } from "next/server";
import { readMobileSession } from "@/lib/server/mobile-session";

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const session = readMobileSession(request);

  // Protect /app/* routes
  if (pathname.startsWith("/app")) {
    if (!session) {
      return NextResponse.redirect(new URL("/login", request.url));
    }
    // Protect admin routes
    if (pathname.startsWith("/app/admin") && session.role !== "admin") {
      const dest =
        session.role === "finance" ? "/app/finance" :
        session.role === "client" ? "/app/client" :
        "/app/supervisor";
      return NextResponse.redirect(new URL(dest, request.url));
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/app/:path*"]
};

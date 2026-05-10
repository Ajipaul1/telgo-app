import { NextResponse, type NextRequest } from "next/server";

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const isLegacyAppRoute = pathname.startsWith("/app/") && pathname !== "/app";
  const isLegacyAuthRoute = ["/otp", "/forgot-password", "/request-access"].includes(pathname);

  if (isLegacyAppRoute || isLegacyAuthRoute) {
    const url = request.nextUrl.clone();
    url.pathname = isLegacyAppRoute ? "/app" : "/";
    url.search = "";
    return NextResponse.redirect(url);
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/app/:path*", "/otp", "/forgot-password", "/request-access"]
};

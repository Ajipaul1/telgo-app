import { NextResponse } from "next/server";

// which version is live: the phone compares it with the one it is running and offers the new one.
// Also yes/no (never the values) for the settings the owner adds in Vercel, so anyone can check them:
// push notifications, the Google map key, the 90-day clean-up.
export const dynamic = "force-dynamic";
export function GET() {
  const set = (...names: string[]) => names.every((n) => !!process.env[n]);
  return NextResponse.json(
    {
      ok: true, version: process.env.NEXT_PUBLIC_BUILD_ID ?? "dev", serverTime: new Date().toISOString(),
      settings: {
        pushNotifications: set("NEXT_PUBLIC_VAPID_PUBLIC_KEY", "VAPID_PRIVATE_KEY") || set("VAPID_PUBLIC_KEY", "VAPID_PRIVATE_KEY"),
        googleMaps: set("NEXT_PUBLIC_GOOGLE_MAPS_API_KEY"),
        trashCleanup: set("CRON_SECRET"),
      },
    },
    { headers: { "Cache-Control": "no-store" } },
  );
}

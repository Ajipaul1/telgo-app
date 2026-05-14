import { NextResponse, type NextRequest } from "next/server";
import { getMobileAccessClient } from "@/lib/server/mobile-access";
import {
  listMobileNotifications,
  markAllMobileNotificationsRead
} from "@/lib/server/mobile-notifications";
import { readMobileSession } from "@/lib/server/mobile-session";

export async function GET(request: NextRequest) {
  const session = readMobileSession(request);
  if (!session) {
    return NextResponse.json({ ok: false, message: "Sign in again to load notifications." }, { status: 401 });
  }

  let supabase: ReturnType<typeof getMobileAccessClient>;
  try {
    supabase = getMobileAccessClient();
  } catch (error) {
    return NextResponse.json({ ok: false, message: getErrorMessage(error) }, { status: 500 });
  }

  try {
    const notifications = await listMobileNotifications(supabase, session.userId);
    return NextResponse.json({
      ok: true,
      notifications,
      unreadCount: notifications.filter((item) => !item.isRead).length
    });
  } catch (error) {
    return NextResponse.json({ ok: false, message: getErrorMessage(error) }, { status: 500 });
  }
}

export async function PATCH(request: NextRequest) {
  const session = readMobileSession(request);
  if (!session) {
    return NextResponse.json({ ok: false, message: "Sign in again to update notifications." }, { status: 401 });
  }

  let supabase: ReturnType<typeof getMobileAccessClient>;
  try {
    supabase = getMobileAccessClient();
  } catch (error) {
    return NextResponse.json({ ok: false, message: getErrorMessage(error) }, { status: 500 });
  }

  try {
    await markAllMobileNotificationsRead(supabase, session.userId);
    return NextResponse.json({ ok: true });
  } catch (error) {
    return NextResponse.json({ ok: false, message: getErrorMessage(error) }, { status: 500 });
  }
}

function getErrorMessage(error: unknown) {
  if (error instanceof Error) return error.message;
  if (typeof error === "object" && error && "message" in error) {
    return String((error as { message?: unknown }).message ?? "Notifications request failed.");
  }
  return "Notifications request failed.";
}

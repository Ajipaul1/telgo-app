import { NextResponse, type NextRequest } from "next/server";
import { getMobileAccessClient } from "@/lib/server/mobile-access";
import { readMobileSession } from "@/lib/server/mobile-session";
import { createShiftReport } from "@/lib/server/mobile-reports";

export async function POST(request: NextRequest) {
  const session = readMobileSession(request);
  if (!session) {
    return NextResponse.json(
      { ok: false, message: "Sign in again to create a report." },
      { status: 401 }
    );
  }

  let supabase: ReturnType<typeof getMobileAccessClient>;
  try {
    supabase = getMobileAccessClient();
  } catch (error) {
    return NextResponse.json({ ok: false, message: getErrorMessage(error) }, { status: 500 });
  }

  try {
    const body = await request.json();
    const result = await createShiftReport(supabase, session, body);
    return NextResponse.json({ ok: true, ...result });
  } catch (error) {
    return NextResponse.json({ ok: false, message: getErrorMessage(error) }, { status: 500 });
  }
}

function getErrorMessage(error: unknown) {
  if (error instanceof Error) return error.message;
  if (typeof error === "object" && error && "message" in error) {
    return String((error as { message?: unknown }).message ?? "Report creation failed.");
  }
  return "Report creation failed.";
}

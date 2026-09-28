import { NextResponse, type NextRequest } from "next/server";
import { readMobileSession } from "@/lib/server/mobile-session";
import { getMasterLedger } from "@/lib/server/mobile-daily-reports";

export async function GET(request: NextRequest) {
  const session = await readMobileSession(request);
  if (!session || session.role !== "admin") {
    return NextResponse.json({ ok: false, message: "Unauthorized. Admin credentials required." }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const projectId = searchParams.get("projectId") || "";

  if (!projectId) {
    return NextResponse.json({ ok: false, message: "Missing projectId parameter." }, { status: 400 });
  }

  try {
    const ledger = await getMasterLedger(projectId);
    return NextResponse.json({ ok: true, ledger });
  } catch (error: any) {
    return NextResponse.json({ ok: false, message: error.message || "Failed to retrieve master ledger." }, { status: 500 });
  }
}

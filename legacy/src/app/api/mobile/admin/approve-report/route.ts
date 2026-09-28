import { NextResponse, type NextRequest } from "next/server";
import { readMobileSession } from "@/lib/server/mobile-session";
import { approveDailyReport } from "@/lib/server/mobile-daily-reports";

export async function POST(request: NextRequest) {
  const session = await readMobileSession(request);
  if (!session || session.role !== "admin") {
    return NextResponse.json({ ok: false, message: "Unauthorized. Admin credentials required." }, { status: 401 });
  }

  try {
    const body = await request.json();
    const { reportId } = body;

    if (!reportId) {
      return NextResponse.json({ ok: false, message: "Missing reportId parameter." }, { status: 400 });
    }

    const result = await approveDailyReport(reportId);
    if (result.ok) {
      return NextResponse.json({ ok: true });
    } else {
      return NextResponse.json({ ok: false, message: result.message || "Approval failed." }, { status: 400 });
    }
  } catch (error: any) {
    return NextResponse.json({ ok: false, message: error.message || "Failed to approve report." }, { status: 500 });
  }
}

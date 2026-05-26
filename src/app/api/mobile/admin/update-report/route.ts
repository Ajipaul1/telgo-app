import { NextResponse, type NextRequest } from "next/server";
import { readMobileSession } from "@/lib/server/mobile-session";
import { updateDailyReport } from "@/lib/server/mobile-daily-reports";

export async function POST(request: NextRequest) {
  const session = await readMobileSession(request);
  if (!session || session.role !== "admin") {
    return NextResponse.json({ ok: false, message: "Unauthorized. Admin credentials required." }, { status: 401 });
  }

  try {
    const body = await request.json();
    const { reportId, updates } = body;

    if (!reportId || !updates) {
      return NextResponse.json({ ok: false, message: "Missing reportId or updates parameter." }, { status: 400 });
    }

    const updatedReport = await updateDailyReport(reportId, updates);
    return NextResponse.json({ ok: true, report: updatedReport });
  } catch (error: any) {
    return NextResponse.json({ ok: false, message: error.message || "Failed to update report parameters." }, { status: 500 });
  }
}

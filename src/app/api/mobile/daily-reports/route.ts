import { NextResponse, type NextRequest } from "next/server";
import { readMobileSession } from "@/lib/server/mobile-session";
import { createDailyReport, getDailyReports } from "@/lib/server/mobile-daily-reports";

export async function GET(request: NextRequest) {
  const session = await readMobileSession(request);
  if (!session) {
    return NextResponse.json({ ok: false, message: "Unauthorized." }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const projectId = searchParams.get("projectId") || "";
  const reportDate = searchParams.get("reportDate") || "";

  if (!projectId || !reportDate) {
    return NextResponse.json({ ok: false, message: "Missing projectId or reportDate query parameters." }, { status: 400 });
  }

  try {
    const reports = await getDailyReports(projectId, reportDate);
    return NextResponse.json({ ok: true, reports });
  } catch (error: any) {
    return NextResponse.json({ ok: false, message: error.message || "Failed to retrieve daily reports." }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  const session = await readMobileSession(request);
  if (!session) {
    return NextResponse.json({ ok: false, message: "Unauthorized. Please sign in again." }, { status: 401 });
  }

  try {
    const body = await request.json();
    
    // Server-side validations & calculations
    const reportDate = body.reportDate;
    const projectId = body.projectId;
    
    if (!reportDate || !projectId) {
      return NextResponse.json({ ok: false, message: "Date and Project ID are required." }, { status: 400 });
    }

    // Force strict chronological boundaries: [Today - 7 days] to [Today]
    const selectedDate = new Date(reportDate);
    const today = new Date();
    today.setHours(23, 59, 59, 999); // Allow full today
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(today.getDate() - 7);
    sevenDaysAgo.setHours(0, 0, 0, 0);

    if (selectedDate > today || selectedDate < sevenDaysAgo) {
      return NextResponse.json({
        ok: false,
        message: "Submission blocked: Daily reports can only be submitted for dates between today and 7 days ago."
      }, { status: 400 });
    }

    // Calculate wages: Wages = (₹900 * Labors) + (₹150 * OT Hours)
    const laborCount = Math.max(0, parseInt(body.laborCount || 0));
    const otHours = Math.max(0, parseInt(body.otHours || 0));
    const calculatedWages = (laborCount * 900) + (otHours * 150);

    const reportData = {
      reportDate,
      projectId,
      supervisorId: session.userId,
      supervisorName: session.fullName,
      laborCount,
      otHours,
      calculatedWages,
      fuelExpenses: Math.max(0, Number(body.fuelExpenses || 0)),
      travelExpenses: Math.max(0, Number(body.travelExpenses || 0)),
      roomRent: Math.max(0, Number(body.roomRent || 0)),
      roomRentReceipt: body.roomRentReceipt || "",
      toolRent: Math.max(0, Number(body.toolRent || 0)),
      toolRentReceipt: body.toolRentReceipt || "",
      excavationLength: Math.max(0, Number(body.excavationLength || 0)),
      hddLength: Math.max(0, Number(body.hddLength || 0)),
      cableLayingLength: Math.max(0, Number(body.cableLayingLength || 0)),
      cableMoundingLength: Math.max(0, Number(body.cableMoundingLength || 0)),
      joiningLinksCompleted: Math.max(0, parseInt(body.joiningLinksCompleted || 0)),
      rmuFoundationStatus: Math.max(0, parseInt(body.rmuFoundationStatus || 0)),
      terminationEndpoints: Math.max(0, parseInt(body.terminationEndpoints || 0)),
      terminationGpsLat: body.terminationGpsLat ? Number(body.terminationGpsLat) : undefined,
      terminationGpsLng: body.terminationGpsLng ? Number(body.terminationGpsLng) : undefined,
      stockAvailable: body.stockAvailable || {},
      clearances: body.clearances || {},
    };

    const savedReport = await createDailyReport(reportData);
    return NextResponse.json({ ok: true, report: savedReport });
  } catch (error: any) {
    return NextResponse.json({ ok: false, message: error.message || "Failed to submit daily report." }, { status: 500 });
  }
}

import { NextResponse, type NextRequest } from "next/server";
import { readMobileSession } from "@/lib/server/mobile-session";
import { getMobileAccessClient } from "@/lib/server/mobile-access";
import { notifyAdmins } from "@/lib/server/mobile-notifications";
import { createDailyReport, getDailyReports, getDailyReportById, getDailyReportsForProject, getDailyReportsForSupervisor } from "@/lib/server/mobile-daily-reports";

export async function GET(request: NextRequest) {
  const session = await readMobileSession(request);
  if (!session) {
    return NextResponse.json({ ok: false, message: "Unauthorized." }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const reportId = searchParams.get("reportId") || "";
  const projectId = searchParams.get("projectId") || "";
  const reportDate = searchParams.get("reportDate") || "";
  const supervisorId = searchParams.get("supervisorId") || "";

  try {
    // 1. Fetch single report by ID if reportId is provided
    if (reportId) {
      const report = await getDailyReportById(reportId);
      return NextResponse.json({ ok: true, report });
    }

    // 2. Fetch reports for supervisor if supervisorId is provided or if supervisor is querying their own reports
    if (supervisorId) {
      const reports = await getDailyReportsForSupervisor(supervisorId);
      return NextResponse.json({ ok: true, reports });
    }
    
    if (session.role === "supervisor" && !projectId) {
      const reports = await getDailyReportsForSupervisor(session.userId);
      return NextResponse.json({ ok: true, reports });
    }

    // 3. Fetch reports for a project (all dates) if projectId is provided and reportDate is omitted
    if (projectId && !reportDate) {
      const reports = await getDailyReportsForProject(projectId);
      return NextResponse.json({ ok: true, reports });
    }

    // 4. Fetch reports for project & date if both provided (backward compatibility)
    if (projectId && reportDate) {
      const reports = await getDailyReports(projectId, reportDate);
      return NextResponse.json({ ok: true, reports });
    }

    return NextResponse.json({ ok: false, message: "Missing query parameters." }, { status: 400 });
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

    // Force strict chronological boundaries: [Today - 3 days] to [Today]
    const selectedDate = new Date(reportDate);
    const today = new Date();
    today.setHours(23, 59, 59, 999); // Allow full today
    const threeDaysAgo = new Date();
    threeDaysAgo.setDate(today.getDate() - 3);
    threeDaysAgo.setHours(0, 0, 0, 0);

    if (selectedDate > today || selectedDate < threeDaysAgo) {
      return NextResponse.json({
        ok: false,
        message: "Submission blocked: Daily reports can only be submitted for dates between today and 3 days ago."
      }, { status: 400 });
    }

    // Calculate wages: Wages = (₹900 * Labors) + (₹1200 * Supervisor if included) + Sum(OT worker wages)
    // Calculate wages dynamically based on reporter-supplied rates
    const workerWageRate = Math.max(0, Number(body.workerWageRate ?? 900));
    const supervisorWageRate = Math.max(0, Number(body.supervisorWageRate ?? 1200));

    const crewLabor = Math.max(0, parseInt(body.laborCount || 0));
    const supervisorCount = body.includeSupervisor ? 1 : 0;
    const supervisorWage = supervisorCount * supervisorWageRate;
    const crewWages = (crewLabor * workerWageRate) + supervisorWage;

    // Overtime workers array calculation
    const otWorkers = body.otWorkers || [];
    let totalOtHours = 0;
    let totalOtWages = 0;
    let totalOtWorkersCount = 0;
    otWorkers.forEach((w: any) => {
      const hours = Math.max(0, Number(w.hours || 0));
      const rate = Math.max(0, Number(w.rate || 0));
      const count = Math.max(0, Number(w.workerCount || 1));
      totalOtHours += hours;
      totalOtWorkersCount += count;
      totalOtWages += hours * rate * count;
    });

    const calculatedWages = crewWages + totalOtWages;

    // Expense lists summations
    const fuelList = body.fuelExpensesList || [];
    const fuelExpenses = fuelList.reduce((sum: number, item: any) => sum + Math.max(0, Number(item.amount || 0)), 0);

    const travelList = body.travelExpensesList || [];
    const travelExpenses = travelList.reduce((sum: number, item: any) => sum + Math.max(0, Number(item.amount || 0)), 0);

    const roomList = body.roomRentList || [];
    const roomRent = roomList.reduce((sum: number, item: any) => sum + Math.max(0, Number(item.amount || 0)), 0);

    const toolList = body.toolRentList || [];
    const toolRent = toolList.reduce((sum: number, item: any) => sum + Math.max(0, Number(item.amount || 0)), 0);

    const otherList = body.otherExpensesList || [];
    const otherExpensesSum = otherList.reduce((sum: number, item: any) => sum + Math.max(0, Number(item.amount || 0)), 0);

    // Sum other expenses into travel for standard dashboard representation
    const finalTravelExpenses = travelExpenses + otherExpensesSum;

    // Physical WIP metric extraction
    const wip = body.wipProgressList || {};
    const excavationLength = Math.max(0, Number(wip.trenching?.value || 0));
    const hddLength = Math.max(0, Number(wip.hdd?.value || 0));
    const cableLayingLength = Math.max(0, Number(wip.cableLaying?.value || 0));
    const cableMoundingLength = Math.max(0, Number(wip.cableMounding?.value || 0));
    const joiningLinksCompleted = Math.max(0, parseInt(wip.joining?.value || 0));
    const rmuFoundationStatus = Math.max(0, parseInt(wip.rmu?.value || 0));
    const terminationEndpoints = Math.max(0, parseInt(wip.terminations?.value || 0));

    // Combine all detailed arrays, narrations, other tool names, and requests into stockAvailable JSONB
    const stockAvailable = {
      ...body.stockAvailable,
      richDetails: {
        includeSupervisor: body.includeSupervisor,
        supervisorWageRate,
        workerWageRate,
        supervisorNarration: body.supervisorNarration || "",
        laborWagesNarration: body.laborWagesNarration || "",
        otWorkers,
        fuelExpensesList: fuelList,
        travelExpensesList: travelList,
        roomRentList: roomList,
        toolRentList: toolList,
        otherExpensesList: otherList,
        wipProgressList: wip,
        requestsAndNotes: body.requestsAndNotes || {},
        startGpsLat: body.startGpsLat ? Number(body.startGpsLat) : undefined,
        startGpsLng: body.startGpsLng ? Number(body.startGpsLng) : undefined
      }
    };

    const reportData = {
      reportDate,
      projectId,
      supervisorId: session.userId,
      supervisorName: session.fullName,
      laborCount: crewLabor + supervisorCount,
      otHours: Math.round(totalOtHours),
      calculatedWages,
      fuelExpenses,
      travelExpenses: finalTravelExpenses,
      roomRent,
      roomRentReceipt: roomList[0]?.billImage || "",
      toolRent,
      toolRentReceipt: toolList[0]?.billImage || "",
      excavationLength,
      hddLength,
      cableLayingLength,
      cableMoundingLength,
      joiningLinksCompleted,
      rmuFoundationStatus,
      terminationEndpoints,
      terminationGpsLat: body.terminationGpsLat ? Number(body.terminationGpsLat) : undefined,
      terminationGpsLng: body.terminationGpsLng ? Number(body.terminationGpsLng) : undefined,
      stockAvailable,
      clearances: body.clearances || {},
    };

    const savedReport = await createDailyReport(reportData);

    try {
      const supabase = getMobileAccessClient();
      const { data: project } = await supabase
        .from("projects")
        .select("name")
        .eq("id", projectId)
        .maybeSingle();

      const projName = project?.name || "Project";
      await notifyAdmins(
        supabase,
        "📝 Daily Report Submitted",
        `New report submitted for "${projName}" on ${reportDate} by ${session.fullName}.`,
        { reportId: savedReport.id, projectId }
      );
    } catch (err) {
      console.error("Failed to trigger daily report notification:", err);
    }

    return NextResponse.json({ ok: true, report: savedReport });
  } catch (error: any) {
    return NextResponse.json({ ok: false, message: error.message || "Failed to submit daily report." }, { status: 500 });
  }
}

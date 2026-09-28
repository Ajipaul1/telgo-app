import { getMobileAccessClient } from "./mobile-access";

export interface DailyReport {
  id: string;
  reportDate: string;
  projectId: string;
  supervisorId: string;
  supervisorName: string;
  laborCount: number;
  otHours: number;
  calculatedWages: number;
  fuelExpenses: number;
  travelExpenses: number;
  roomRent: number;
  roomRentReceipt?: string;
  toolRent: number;
  toolRentReceipt?: string;
  excavationLength: number;
  hddLength: number;
  cableLayingLength: number;
  cableMoundingLength: number;
  joiningLinksCompleted: number;
  rmuFoundationStatus: number;
  terminationEndpoints: number;
  terminationGpsLat?: number;
  terminationGpsLng?: number;
  stockAvailable: Record<string, any>;
  clearances: Record<string, { status: string; receipt?: string }>;
  hddDrillingLogs?: any[];
  hddMetadata?: Record<string, any>;
  createdAt: string;
  status: "pending" | "approved";
}

export interface LedgerRow {
  id: string;
  ledgerDate: string;
  projectId: string;
  totalLaborCount: number;
  totalOtHours: number;
  totalWages: number;
  totalFuel: number;
  totalTravel: number;
  totalRoomRent: number;
  totalToolRent: number;
  totalExcavation: number;
  totalHdd: number;
  totalCableLaying: number;
  totalCableMounding: number;
  totalJoiningLinks: number;
  totalRmuFoundations: number;
  totalTerminations: number;
  approvedReportsCount: number;
  updatedAt: string;
}

export async function createDailyReport(input: Omit<DailyReport, "id" | "createdAt" | "status">): Promise<DailyReport> {
  const supabase = getMobileAccessClient();
  const { data, error } = await supabase
    .from("pending_daily_reports")
    .insert({
      report_date: input.reportDate,
      project_id: input.projectId,
      supervisor_id: input.supervisorId,
      supervisor_name: input.supervisorName,
      labor_count: input.laborCount,
      ot_hours: input.otHours,
      calculated_wages: input.calculatedWages,
      fuel_expenses: input.fuelExpenses,
      travel_expenses: input.travelExpenses,
      room_rent: input.roomRent,
      room_rent_receipt: input.roomRentReceipt || null,
      tool_rent: input.toolRent,
      tool_rent_receipt: input.toolRentReceipt || null,
      excavation_length: input.excavationLength,
      hdd_length: input.hddLength,
      cable_laying_length: input.cableLayingLength,
      cable_mounding_length: input.cableMoundingLength,
      joining_links_completed: input.joiningLinksCompleted,
      rmu_foundation_status: input.rmuFoundationStatus,
      termination_endpoints: input.terminationEndpoints,
      termination_gps_lat: input.terminationGpsLat || null,
      termination_gps_lng: input.terminationGpsLng || null,
      stock_available: input.stockAvailable,
      clearances: input.clearances,
      hdd_drilling_logs: input.hddDrillingLogs || [],
      hdd_metadata: input.hddMetadata || {},
      status: "pending"
    })
    .select("*")
    .single();

  if (error) {
    console.error("Supabase insert error in createDailyReport:", error);
    throw new Error(`Failed to save daily report in Supabase database: ${error.message}`);
  }

  if (!data) {
    throw new Error("Failed to save daily report: Database returned no data.");
  }

  console.log("✓ Daily report stored successfully in Supabase DB");
  return mapDbRowToReport(data);
}

export async function getDailyReports(projectId: string, reportDate: string): Promise<DailyReport[]> {
  const supabase = getMobileAccessClient();
  const { data, error } = await supabase
    .from("pending_daily_reports")
    .select("*")
    .eq("project_id", projectId)
    .eq("report_date", reportDate);

  if (error) {
    console.error("Supabase fetch reports failed in getDailyReports:", error);
    throw new Error(`Failed to retrieve daily reports from Supabase: ${error.message}`);
  }

  return (data || []).map(mapDbRowToReport);
}

export async function approveDailyReport(reportId: string): Promise<{ ok: boolean; message?: string }> {
  const supabase = getMobileAccessClient();

  // 1. Update the pending report to status 'approved'
  const { data: matchedReportRow, error: updateError } = await supabase
    .from("pending_daily_reports")
    .update({ status: "approved", approved_at: new Date().toISOString() })
    .eq("id", reportId)
    .select("*")
    .maybeSingle();

  if (updateError) {
    console.error("Supabase error during report approval:", updateError);
    throw new Error(`Failed to approve daily report in Supabase: ${updateError.message}`);
  }

  if (!matchedReportRow) {
    return { ok: false, message: "Report not found." };
  }

  const matchedReport = mapDbRowToReport(matchedReportRow);
  const { projectId, reportDate } = matchedReport;

  // 2. Perform Atomic Sum Consolidation into the Master Ledger
  // Fetch existing ledger row for same project & date
  const { data: existing, error: fetchErr } = await supabase
    .from("master_project_ledger")
    .select("*")
    .eq("project_id", projectId)
    .eq("ledger_date", reportDate)
    .maybeSingle();

  if (fetchErr) {
    console.error("Supabase ledger fetch failed during consolidation:", fetchErr);
    throw new Error(`Failed to consolidate to ledger (fetch failed): ${fetchErr.message}`);
  }

  const consolidated = {
    ledger_date: reportDate,
    project_id: projectId,
    total_labor_count: (existing?.total_labor_count ?? 0) + matchedReport.laborCount,
    total_ot_hours: (existing?.total_ot_hours ?? 0) + matchedReport.otHours,
    total_wages: Number(existing?.total_wages ?? 0) + matchedReport.calculatedWages,
    total_fuel: Number(existing?.total_fuel ?? 0) + matchedReport.fuelExpenses,
    total_travel: Number(existing?.total_travel ?? 0) + matchedReport.travelExpenses,
    total_room_rent: Number(existing?.total_room_rent ?? 0) + matchedReport.roomRent,
    total_tool_rent: Number(existing?.total_tool_rent ?? 0) + matchedReport.toolRent,
    total_excavation: Number(existing?.total_excavation ?? 0) + matchedReport.excavationLength,
    total_hdd: Number(existing?.total_hdd ?? 0) + matchedReport.hddLength,
    total_cable_laying: Number(existing?.total_cable_laying ?? 0) + matchedReport.cableLayingLength,
    total_cable_mounding: Number(existing?.total_cable_mounding ?? 0) + matchedReport.cableMoundingLength,
    total_joining_links: (existing?.total_joining_links ?? 0) + matchedReport.joiningLinksCompleted,
    total_rmu_foundations: (existing?.total_rmu_foundations ?? 0) + matchedReport.rmuFoundationStatus,
    total_terminations: (existing?.total_terminations ?? 0) + matchedReport.terminationEndpoints,
    approved_reports_count: (existing?.approved_reports_count ?? 0) + 1,
    updated_at: new Date().toISOString()
  };

  const { error: upsertErr } = await supabase
    .from("master_project_ledger")
    .upsert(consolidated, { onConflict: "ledger_date,project_id" });

  if (upsertErr) {
    console.error("Supabase ledger upsert failed:", upsertErr);
    throw new Error(`Failed to consolidate to ledger (upsert failed): ${upsertErr.message}`);
  }

  console.log("✓ Ledger row atomically consolidated and saved to Supabase DB");
  return { ok: true };
}

export async function getMasterLedger(projectId: string): Promise<LedgerRow[]> {
  const supabase = getMobileAccessClient();
  const { data, error } = await supabase
    .from("master_project_ledger")
    .select("*")
    .eq("project_id", projectId)
    .order("ledger_date", { ascending: true });

  if (error) {
    console.error("Supabase fetch ledger failed in getMasterLedger:", error);
    throw new Error(`Failed to retrieve master ledger: ${error.message}`);
  }

  return (data || []).map(mapDbRowToLedgerRow);
}

export async function getDailyReportById(reportId: string): Promise<DailyReport | null> {
  const supabase = getMobileAccessClient();
  const { data, error } = await supabase
    .from("pending_daily_reports")
    .select("*")
    .eq("id", reportId)
    .maybeSingle();

  if (error) {
    console.error("Supabase fetch report failed in getDailyReportById:", error);
    throw new Error(`Failed to retrieve daily report: ${error.message}`);
  }

  return data ? mapDbRowToReport(data) : null;
}

export async function getDailyReportsForProject(projectId: string): Promise<DailyReport[]> {
  const supabase = getMobileAccessClient();
  const { data, error } = await supabase
    .from("pending_daily_reports")
    .select("*")
    .eq("project_id", projectId)
    .order("report_date", { ascending: false });

  if (error) {
    console.error("Supabase fetch reports failed in getDailyReportsForProject:", error);
    throw new Error(`Failed to retrieve daily reports: ${error.message}`);
  }

  return (data || []).map(mapDbRowToReport);
}

export async function getDailyReportsForSupervisor(supervisorId: string): Promise<DailyReport[]> {
  const supabase = getMobileAccessClient();
  const { data, error } = await supabase
    .from("pending_daily_reports")
    .select("*")
    .eq("supervisor_id", supervisorId)
    .order("report_date", { ascending: false });

  if (error) {
    console.error("Supabase fetch reports failed in getDailyReportsForSupervisor:", error);
    throw new Error(`Failed to retrieve daily reports: ${error.message}`);
  }

  return (data || []).map(mapDbRowToReport);
}

export async function updateDailyReport(reportId: string, updates: Partial<DailyReport>): Promise<DailyReport> {
  const supabase = getMobileAccessClient();
  
  // Map standard camelCase fields to DB snake_case columns
  const mappedUpdates: Record<string, any> = {};
  if (updates.reportDate !== undefined) mappedUpdates.report_date = updates.reportDate;
  if (updates.projectId !== undefined) mappedUpdates.project_id = updates.projectId;
  if (updates.supervisorId !== undefined) mappedUpdates.supervisor_id = updates.supervisorId;
  if (updates.supervisorName !== undefined) mappedUpdates.supervisor_name = updates.supervisorName;
  if (updates.laborCount !== undefined) mappedUpdates.labor_count = updates.laborCount;
  if (updates.otHours !== undefined) mappedUpdates.ot_hours = updates.otHours;
  if (updates.calculatedWages !== undefined) mappedUpdates.calculated_wages = updates.calculatedWages;
  if (updates.fuelExpenses !== undefined) mappedUpdates.fuel_expenses = updates.fuelExpenses;
  if (updates.travelExpenses !== undefined) mappedUpdates.travel_expenses = updates.travelExpenses;
  if (updates.roomRent !== undefined) mappedUpdates.room_rent = updates.roomRent;
  if (updates.roomRentReceipt !== undefined) mappedUpdates.room_rent_receipt = updates.roomRentReceipt;
  if (updates.toolRent !== undefined) mappedUpdates.tool_rent = updates.toolRent;
  if (updates.toolRentReceipt !== undefined) mappedUpdates.tool_rent_receipt = updates.toolRentReceipt;
  if (updates.excavationLength !== undefined) mappedUpdates.excavation_length = updates.excavationLength;
  if (updates.hddLength !== undefined) mappedUpdates.hdd_length = updates.hddLength;
  if (updates.cableLayingLength !== undefined) mappedUpdates.cable_laying_length = updates.cableLayingLength;
  if (updates.cableMoundingLength !== undefined) mappedUpdates.cable_mounding_length = updates.cableMoundingLength;
  if (updates.joiningLinksCompleted !== undefined) mappedUpdates.joining_links_completed = updates.joiningLinksCompleted;
  if (updates.rmuFoundationStatus !== undefined) mappedUpdates.rmu_foundation_status = updates.rmuFoundationStatus;
  if (updates.terminationEndpoints !== undefined) mappedUpdates.termination_endpoints = updates.terminationEndpoints;
  if (updates.terminationGpsLat !== undefined) mappedUpdates.termination_gps_lat = updates.terminationGpsLat;
  if (updates.terminationGpsLng !== undefined) mappedUpdates.termination_gps_lng = updates.terminationGpsLng;
  if (updates.stockAvailable !== undefined) mappedUpdates.stock_available = updates.stockAvailable;
  if (updates.clearances !== undefined) mappedUpdates.clearances = updates.clearances;
  if (updates.status !== undefined) mappedUpdates.status = updates.status;

  const { data, error } = await supabase
    .from("pending_daily_reports")
    .update(mappedUpdates)
    .eq("id", reportId)
    .select("*")
    .single();

  if (error) {
    console.error("Supabase update report failed in updateDailyReport:", error);
    throw new Error(`Failed to update daily report: ${error.message}`);
  }

  return mapDbRowToReport(data);
}


// Helpers to map DB snake_case naming schema into standard frontend camelCase objects
function mapDbRowToReport(row: any): DailyReport {
  return {
    id: row.id,
    reportDate: row.report_date,
    projectId: row.project_id,
    supervisorId: row.supervisor_id,
    supervisorName: row.supervisor_name,
    laborCount: row.labor_count,
    otHours: row.ot_hours,
    calculatedWages: Number(row.calculated_wages || 0),
    fuelExpenses: Number(row.fuel_expenses || 0),
    travelExpenses: Number(row.travel_expenses || 0),
    roomRent: Number(row.room_rent || 0),
    roomRentReceipt: row.room_rent_receipt,
    toolRent: Number(row.tool_rent || 0),
    toolRentReceipt: row.tool_rent_receipt,
    excavationLength: Number(row.excavation_length || 0),
    hddLength: Number(row.hdd_length || 0),
    cableLayingLength: Number(row.cable_laying_length || 0),
    cableMoundingLength: Number(row.cable_mounding_length || 0),
    joiningLinksCompleted: row.joining_links_completed,
    rmuFoundationStatus: row.rmu_foundation_status,
    terminationEndpoints: row.termination_endpoints,
    terminationGpsLat: row.termination_gps_lat ? Number(row.termination_gps_lat) : undefined,
    terminationGpsLng: row.termination_gps_lng ? Number(row.termination_gps_lng) : undefined,
    stockAvailable: typeof row.stock_available === "string" ? JSON.parse(row.stock_available) : row.stock_available || {},
    clearances: typeof row.clearances === "string" ? JSON.parse(row.clearances) : row.clearances || {},
    hddDrillingLogs: typeof row.hdd_drilling_logs === "string" ? JSON.parse(row.hdd_drilling_logs) : row.hdd_drilling_logs || [],
    hddMetadata: typeof row.hdd_metadata === "string" ? JSON.parse(row.hdd_metadata) : row.hdd_metadata || {},
    createdAt: row.created_at,
    status: row.status || "pending",
  };
}

function mapDbRowToLedgerRow(row: any): LedgerRow {
  return {
    id: row.id,
    ledgerDate: row.ledger_date,
    projectId: row.project_id,
    totalLaborCount: row.total_labor_count,
    totalOtHours: row.total_ot_hours,
    totalWages: Number(row.total_wages || 0),
    totalFuel: Number(row.total_fuel || 0),
    totalTravel: Number(row.total_travel || 0),
    totalRoomRent: Number(row.total_room_rent || 0),
    totalToolRent: Number(row.total_tool_rent || 0),
    totalExcavation: Number(row.total_excavation || 0),
    totalHdd: Number(row.total_hdd || 0),
    totalCableLaying: Number(row.total_cable_laying || 0),
    totalCableMounding: Number(row.total_cable_mounding || 0),
    totalJoiningLinks: row.total_joining_links,
    totalRmuFoundations: row.total_rmu_foundations,
    totalTerminations: row.total_terminations,
    approvedReportsCount: row.approved_reports_count,
    updatedAt: row.updated_at,
  };
}

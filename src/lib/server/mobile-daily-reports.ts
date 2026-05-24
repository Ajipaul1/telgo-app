import { promises as fs } from "node:fs";
import path from "node:path";
import os from "node:os";
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

const STORE_PATH = path.join(os.tmpdir(), "telgo-reports-store.json");

async function getLocalStore() {
  try {
    const data = await fs.readFile(STORE_PATH, "utf8");
    return JSON.parse(data) as { reports: DailyReport[]; ledger: LedgerRow[] };
  } catch {
    // If not exists or malformed, return empty layout
    const initial = { reports: [], ledger: [] };
    await fs.mkdir(path.dirname(STORE_PATH), { recursive: true }).catch(() => {});
    await fs.writeFile(STORE_PATH, JSON.stringify(initial, null, 2), "utf8");
    return initial;
  }
}

async function saveLocalStore(store: { reports: DailyReport[]; ledger: LedgerRow[] }) {
  await fs.mkdir(path.dirname(STORE_PATH), { recursive: true }).catch(() => {});
  await fs.writeFile(STORE_PATH, JSON.stringify(store, null, 2), "utf8");
}

export async function createDailyReport(input: Omit<DailyReport, "id" | "createdAt" | "status">): Promise<DailyReport> {
  const newReport: DailyReport = {
    ...input,
    id: typeof crypto !== "undefined" && crypto.randomUUID ? crypto.randomUUID() : Math.random().toString(36).substring(2) + Date.now().toString(36),
    createdAt: new Date().toISOString(),
    status: "pending",
  };

  // Attempt Supabase
  try {
    const supabase = getMobileAccessClient();
    const { data, error } = await supabase
      .from("pending_daily_reports")
      .insert({
        report_date: newReport.reportDate,
        project_id: newReport.projectId,
        supervisor_id: newReport.supervisorId,
        supervisor_name: newReport.supervisorName,
        labor_count: newReport.laborCount,
        ot_hours: newReport.otHours,
        calculated_wages: newReport.calculatedWages,
        fuel_expenses: newReport.fuelExpenses,
        travel_expenses: newReport.travelExpenses,
        room_rent: newReport.roomRent,
        room_rent_receipt: newReport.roomRentReceipt || null,
        tool_rent: newReport.toolRent,
        tool_rent_receipt: newReport.toolRentReceipt || null,
        excavation_length: newReport.excavationLength,
        hdd_length: newReport.hddLength,
        cable_laying_length: newReport.cableLayingLength,
        cable_mounding_length: newReport.cableMoundingLength,
        joining_links_completed: newReport.joiningLinksCompleted,
        rmu_foundation_status: newReport.rmuFoundationStatus,
        termination_endpoints: newReport.terminationEndpoints,
        termination_gps_lat: newReport.terminationGpsLat || null,
        termination_gps_lng: newReport.terminationGpsLng || null,
        stock_available: newReport.stockAvailable,
        clearances: newReport.clearances,
        status: "pending"
      })
      .select("*")
      .single();

    if (!error && data) {
      console.log("✓ Daily report stored successfully in Supabase DB");
      return mapDbRowToReport(data);
    }
    console.warn("Supabase insert error, falling back to local storage:", error?.message);
  } catch (err) {
    console.warn("Supabase connection error, falling back to local storage:", err);
  }

  // Fallback to Local JSON store
  const store = await getLocalStore();
  store.reports.push(newReport);
  await saveLocalStore(store);
  console.log("✓ Daily report stored successfully in Local JSON File Store");
  return newReport;
}

export async function getDailyReports(projectId: string, reportDate: string): Promise<DailyReport[]> {
  // Attempt Supabase
  try {
    const supabase = getMobileAccessClient();
    const { data, error } = await supabase
      .from("pending_daily_reports")
      .select("*")
      .eq("project_id", projectId)
      .eq("report_date", reportDate)
      .eq("status", "pending");

    if (!error && data) {
      return data.map(mapDbRowToReport);
    }
    console.warn("Supabase fetch reports failed, using local store fallback:", error?.message);
  } catch (err) {
    console.warn("Supabase connection error, using local store fallback:", err);
  }

  // Fallback
  const store = await getLocalStore();
  return store.reports.filter(
    (r) => r.projectId === projectId && r.reportDate === reportDate && r.status === "pending"
  );
}

export async function approveDailyReport(reportId: string): Promise<{ ok: boolean; message?: string }> {
  let matchedReport: DailyReport | null = null;

  // 1. Try to find and update the pending report
  try {
    const supabase = getMobileAccessClient();
    const { data, error } = await supabase
      .from("pending_daily_reports")
      .update({ status: "approved", approved_at: new Date().toISOString() })
      .eq("id", reportId)
      .select("*")
      .maybeSingle();

    if (!error && data) {
      matchedReport = mapDbRowToReport(data);
      console.log("✓ Report status updated to APPROVED in Supabase DB");
    } else {
      console.warn("Supabase approve update failed, trying local store search:", error?.message);
    }
  } catch (err) {
    console.warn("Supabase error during report approval, searching local store:", err);
  }

  const store = await getLocalStore();
  if (!matchedReport) {
    const idx = store.reports.findIndex((r) => r.id === reportId);
    if (idx !== -1) {
      store.reports[idx].status = "approved";
      matchedReport = store.reports[idx];
      console.log("✓ Report status updated to APPROVED in Local JSON File Store");
    }
  } else {
    // If found in Supabase, make sure to sync status locally too in case it was stored locally
    const idx = store.reports.findIndex((r) => r.id === reportId);
    if (idx !== -1) {
      store.reports[idx].status = "approved";
    }
  }

  if (!matchedReport) {
    return { ok: false, message: "Report not found." };
  }

  // 2. Perform Atomic Sum Consolidation into the Master Ledger
  const { projectId, reportDate } = matchedReport;

  // Supabase Ledger Upsert
  try {
    const supabase = getMobileAccessClient();
    // Fetch existing ledger row for same project & date
    const { data: existing, error: fetchErr } = await supabase
      .from("master_project_ledger")
      .select("*")
      .eq("project_id", projectId)
      .eq("ledger_date", reportDate)
      .maybeSingle();

    if (!fetchErr) {
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

      if (!upsertErr) {
        console.log("✓ Ledger row atomically consolidated and saved to Supabase DB");
      } else {
        console.warn("Supabase ledger upsert failed, consolidating locally:", upsertErr.message);
      }
    } else {
      console.warn("Supabase ledger fetch failed, consolidating locally:", fetchErr.message);
    }
  } catch (err) {
    console.warn("Supabase ledger integration failed, consolidating locally:", err);
  }

  // Local JSON Ledger Upsert
  const ledgerIdx = store.ledger.findIndex(
    (l) => l.projectId === projectId && l.ledgerDate === reportDate
  );

  if (ledgerIdx !== -1) {
    const existing = store.ledger[ledgerIdx];
    store.ledger[ledgerIdx] = {
      ...existing,
      totalLaborCount: existing.totalLaborCount + matchedReport.laborCount,
      totalOtHours: existing.totalOtHours + matchedReport.otHours,
      totalWages: existing.totalWages + matchedReport.calculatedWages,
      totalFuel: existing.totalFuel + matchedReport.fuelExpenses,
      totalTravel: existing.totalTravel + matchedReport.travelExpenses,
      totalRoomRent: existing.totalRoomRent + matchedReport.roomRent,
      totalToolRent: existing.totalToolRent + matchedReport.toolRent,
      totalExcavation: existing.totalExcavation + matchedReport.excavationLength,
      totalHdd: existing.totalHdd + matchedReport.hddLength,
      totalCableLaying: existing.totalCableLaying + matchedReport.cableLayingLength,
      totalCableMounding: existing.totalCableMounding + matchedReport.cableMoundingLength,
      totalJoiningLinks: existing.totalJoiningLinks + matchedReport.joiningLinksCompleted,
      totalRmuFoundations: existing.totalRmuFoundations + matchedReport.rmuFoundationStatus,
      totalTerminations: existing.totalTerminations + matchedReport.terminationEndpoints,
      approvedReportsCount: existing.approvedReportsCount + 1,
      updatedAt: new Date().toISOString(),
    };
  } else {
    store.ledger.push({
      id: typeof crypto !== "undefined" && crypto.randomUUID ? crypto.randomUUID() : Math.random().toString(36).substring(2) + Date.now().toString(36),
      ledgerDate: reportDate,
      projectId: projectId,
      totalLaborCount: matchedReport.laborCount,
      totalOtHours: matchedReport.otHours,
      totalWages: matchedReport.calculatedWages,
      totalFuel: matchedReport.fuelExpenses,
      totalTravel: matchedReport.travelExpenses,
      totalRoomRent: matchedReport.roomRent,
      totalToolRent: matchedReport.toolRent,
      totalExcavation: matchedReport.excavationLength,
      totalHdd: matchedReport.hddLength,
      totalCableLaying: matchedReport.cableLayingLength,
      totalCableMounding: matchedReport.cableMoundingLength,
      totalJoiningLinks: matchedReport.joiningLinksCompleted,
      totalRmuFoundations: matchedReport.rmuFoundationStatus,
      totalTerminations: matchedReport.terminationEndpoints,
      approvedReportsCount: 1,
      updatedAt: new Date().toISOString(),
    });
  }

  await saveLocalStore(store);
  console.log("✓ Ledger row atomically consolidated and saved in Local JSON File Store");
  return { ok: true };
}

export async function getMasterLedger(projectId: string): Promise<LedgerRow[]> {
  // Attempt Supabase
  try {
    const supabase = getMobileAccessClient();
    const { data, error } = await supabase
      .from("master_project_ledger")
      .select("*")
      .eq("project_id", projectId)
      .order("ledger_date", { ascending: true });

    if (!error && data) {
      return data.map(mapDbRowToLedgerRow);
    }
    console.warn("Supabase fetch ledger failed, using local store fallback:", error?.message);
  } catch (err) {
    console.warn("Supabase connection error, using local store fallback:", err);
  }

  // Fallback
  const store = await getLocalStore();
  return store.ledger
    .filter((l) => l.projectId === projectId)
    .sort((a, b) => new Date(a.ledgerDate).getTime() - new Date(b.ledgerDate).getTime());
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

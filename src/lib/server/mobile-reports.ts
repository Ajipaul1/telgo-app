import type { SupabaseClient } from "@supabase/supabase-js";
import type { MobileSession } from "@/lib/server/mobile-session";

export type ShiftReportInput = {
  projectId: string;
  title: string;
  description: string;
  metersDrilled: number;
  fuelUsedL: number;
  notes: string;
  safetyIssue: string;
  photoPath?: string;
  urgency: "normal" | "urgent";
};

export async function createShiftReport(
  supabase: SupabaseClient,
  session: MobileSession,
  input: ShiftReportInput
) {
  const { data, error } = await supabase
    .from("shift_reports")
    .insert({
      user_id: session.userId,
      project_id: input.projectId,
      title: input.title,
      description: input.description,
      meters_drilled: input.metersDrilled,
      fuel_used_l: input.fuelUsedL,
      notes: input.notes,
      safety_issue: input.safetyIssue,
      photo_path: input.photoPath,
      urgency: input.urgency,
    })
    .select("*")
    .single();

  if (error) {
    throw new Error(error.message);
  }

  return data;
}

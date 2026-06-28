-- Migration to add daily report unlock and reversion functionality
-- This script reverses the master ledger balance updates when a report is unlocked.

-- Helper function to reverse ledger entry
CREATE OR REPLACE FUNCTION revert_daily_report_ledger_entries(target_report_id UUID)
RETURNS VOID AS $$
DECLARE
    report_row RECORD;
BEGIN
    -- 1. Fetch details of the report being unlocked
    SELECT * INTO report_row 
    FROM pending_daily_reports 
    WHERE id = target_report_id;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'Daily report with ID % not found', target_report_id;
    END IF;

    -- 2. Deduct quantities from master_project_ledger for the corresponding project and date
    -- Note: Since the report was approved, these values were added to the ledger.
    -- Unlocking it means we must subtract those added quantities.
    UPDATE master_project_ledger
    SET 
        total_labor_count = GREATEST(0, total_labor_count - COALESCE(report_row.labor_count, 0)),
        total_ot_hours = GREATEST(0, total_ot_hours - COALESCE(report_row.ot_hours, 0)),
        total_wages = GREATEST(0, total_wages - COALESCE(report_row.calculated_wages, 0)),
        total_fuel = GREATEST(0, total_fuel - COALESCE(report_row.fuel_expenses, 0)),
        total_travel = GREATEST(0, total_travel - COALESCE(report_row.travel_expenses, 0)),
        total_room_rent = GREATEST(0, total_room_rent - COALESCE(report_row.room_rent, 0)),
        total_tool_rent = GREATEST(0, total_tool_rent - COALESCE(report_row.tool_rent, 0)),
        total_excavation = GREATEST(0, total_excavation - COALESCE(report_row.excavation_length, 0)),
        total_hdd = GREATEST(0, total_hdd - COALESCE(report_row.hdd_length, 0)),
        total_cable_laying = GREATEST(0, total_cable_laying - COALESCE(report_row.cable_laying_length, 0)),
        total_cable_mounding = GREATEST(0, total_cable_mounding - COALESCE(report_row.cable_mounding_length, 0)),
        total_joining_links = GREATEST(0, total_joining_links - COALESCE(report_row.joining_links_completed, 0)),
        total_rmu_foundations = GREATEST(0, total_rmu_foundations - COALESCE(report_row.rmu_foundation_status::integer, 0)),
        total_terminations = GREATEST(0, total_terminations - COALESCE(report_row.termination_endpoints, 0)),
        approved_reports_count = GREATEST(0, approved_reports_count - 1),
        updated_at = NOW()
    WHERE project_id = report_row.project_id AND ledger_date = report_row.report_date;

    -- 3. Revert the report status to 'pending'
    UPDATE pending_daily_reports
    SET 
        status = 'pending',
        approved_at = NULL,
        approved_by = NULL,
        updated_at = NOW()
    WHERE id = target_report_id;

END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

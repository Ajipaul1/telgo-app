"use client";
import { Screen } from "@/components/Screen";
import { ReportList } from "../_parts/ReportList";

// approved reports (admin, accounts): the last 30 days to start with
export default function SavedReports() {
  return (
    <Screen title="Saved reports" roles={["admin", "finance"]} testId="reports-saved">
      <ReportList status="approved" emptyTitle="No approved reports in these dates" />
    </Screen>
  );
}

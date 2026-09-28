"use client";
import { Screen } from "@/components/Screen";
import { ReportList } from "../_parts/ReportList";

// reports the admin sent back to be fixed (every day, so none is hidden by its age)
export default function AskedToFix() {
  return (
    <Screen title="Asked to fix" roles={["admin"]} testId="reports-fix">
      <ReportList status="clarification" allDates emptyTitle="Nothing waiting to be fixed" emptyText="No report is waiting for its supervisor to fix it." />
    </Screen>
  );
}

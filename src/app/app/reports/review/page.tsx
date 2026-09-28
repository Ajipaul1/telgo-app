"use client";
import { Screen } from "@/components/Screen";
import { ReportList } from "../_parts/ReportList";

// reports waiting for the admin (every day, so none is hidden by its age)
export default function ToReview() {
  return (
    <Screen title="To review" roles={["admin"]} testId="reports-review">
      <ReportList status="pending" allDates emptyTitle="Nothing to review" emptyText="Every report sent has been reviewed." />
    </Screen>
  );
}

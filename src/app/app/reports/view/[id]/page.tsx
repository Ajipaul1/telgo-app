"use client";
import { use } from "react";
import { Screen } from "@/components/Screen";
import { ReportDetail } from "@/components/ReportDetail";

export default function ReportView({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  return (
    <Screen title="Daily report" roles={["admin", "finance", "client"]} testId="report-view">
      <ReportDetail id={id} />
    </Screen>
  );
}

"use client";
import { use } from "react";
import { Screen } from "@/components/Screen";
import { ReportDetail } from "@/components/ReportDetail";

export default function MyReport({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  return (
    <Screen title="My report" roles={["supervisor", "engineer"]} testId="my-report">
      <ReportDetail id={id} />
    </Screen>
  );
}

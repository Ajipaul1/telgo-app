"use client";
import { Screen } from "@/components/Screen";
import { Items } from "../_parts/Items";

// wages from the approved reports: crew and overtime, report by report
export default function Wages() {
  return (
    <Screen title="Wages" roles={["admin", "finance"]} testId="reports-wages">
      <Items kind="wages" title="Wages" />
    </Screen>
  );
}

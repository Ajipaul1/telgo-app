"use client";
import { Screen } from "@/components/Screen";
import { Items } from "../_parts/Items";

// every fuel bill in the approved reports
export default function Fuel() {
  return (
    <Screen title="Fuel" roles={["admin", "finance"]} testId="reports-fuel">
      <Items kind="fuel" title="Fuel" />
    </Screen>
  );
}

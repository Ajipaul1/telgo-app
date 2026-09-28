"use client";
import { Screen } from "@/components/Screen";
import { Items } from "../_parts/Items";

// every other expense in the approved reports
export default function OtherExpenses() {
  return (
    <Screen title="Other expenses" roles={["admin", "finance"]} testId="reports-other">
      <Items kind="other" title="Other expenses" />
    </Screen>
  );
}

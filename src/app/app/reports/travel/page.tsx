"use client";
import { Screen } from "@/components/Screen";
import { Items } from "../_parts/Items";

// every travel bill in the approved reports
export default function Travel() {
  return (
    <Screen title="Travel" roles={["admin", "finance"]} testId="reports-travel">
      <Items kind="travel" title="Travel" />
    </Screen>
  );
}

"use client";
import { Screen } from "@/components/Screen";
import { Items } from "../_parts/Items";

// every tool rent bill in the approved reports
export default function ToolRent() {
  return (
    <Screen title="Tool rent" roles={["admin", "finance"]} testId="reports-tool">
      <Items kind="tool" title="Tool rent" />
    </Screen>
  );
}

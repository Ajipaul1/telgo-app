"use client";
import { Screen } from "@/components/Screen";
import { Items } from "../_parts/Items";

// every room rent bill in the approved reports
export default function RoomRent() {
  return (
    <Screen title="Room rent" roles={["admin", "finance"]} testId="reports-room">
      <Items kind="room" title="Room rent" />
    </Screen>
  );
}

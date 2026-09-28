"use client";
import { use } from "react";
import { useRouter } from "next/navigation";
import { Screen } from "@/components/Screen";
import { ChatRoom } from "@/components/chat/ChatRoom";

// One chat as a full screen (a notification opens this); the same chat as the pop-up, every option.
export default function ChatThread({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const router = useRouter();
  return (
    <Screen title="Chat" fill>
      <ChatRoom id={id} mode="page" onBack={() => router.push("/app/chat")} />
    </Screen>
  );
}

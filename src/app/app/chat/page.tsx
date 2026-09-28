"use client";
import { useRouter } from "next/navigation";
import { Screen } from "@/components/Screen";
import { ChatList } from "@/components/chat/ChatList";

// My chats (the same list as the pop-up chat): Team chat pinned on top, group chats, people.
export default function Chats() {
  const router = useRouter();
  return (
    <Screen title="Chat" testId="chat-list">
      <ChatList onOpen={(id) => router.push(`/app/chat/${id}`)} />
    </Screen>
  );
}

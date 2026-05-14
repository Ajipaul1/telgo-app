import { NextResponse, type NextRequest } from "next/server";
import {
  ensureMobileChat,
  listMobileChatMembers,
  listMobileChatMessages,
  createMobileChatMessage
} from "@/lib/server/mobile-chat";
import { getMobileAccessClient } from "@/lib/server/mobile-access";
import { readMobileSession } from "@/lib/server/mobile-session";

export async function GET(request: NextRequest) {
  const session = readMobileSession(request);
  if (!session) {
    return NextResponse.json(
      { ok: false, message: "Sign in again to open live chat on this device." },
      { status: 401 }
    );
  }

  let supabase: ReturnType<typeof getMobileAccessClient>;
  try {
    supabase = getMobileAccessClient();
  } catch (error) {
    return NextResponse.json(
      { ok: false, message: getErrorMessage(error) },
      { status: 500 }
    );
  }

  try {
    const chat = await ensureMobileChat(supabase);
    const members = await listMobileChatMembers(supabase);
    const messages = await listMobileChatMessages(supabase, chat.id);
    return NextResponse.json({
      ok: true,
      chat: {
        id: chat.id,
        title: chat.title
      },
      messages,
      members
    });
  } catch (error) {
    return NextResponse.json(
      { ok: false, message: getErrorMessage(error) },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  const session = readMobileSession(request);
  if (!session) {
    return NextResponse.json(
      { ok: false, message: "Sign in again to send a message." },
      { status: 401 }
    );
  }

  let supabase: ReturnType<typeof getMobileAccessClient>;
  try {
    supabase = getMobileAccessClient();
  } catch (error) {
    return NextResponse.json(
      { ok: false, message: getErrorMessage(error) },
      { status: 500 }
    );
  }

  try {
    const contentType = request.headers.get("content-type") ?? "";
    let body = "";
    let files: File[] = [];

    if (contentType.includes("multipart/form-data")) {
      const formData = await request.formData();
      body = String(formData.get("body") ?? "");
      files = formData
        .getAll("images")
        .filter((item): item is File => typeof File !== "undefined" && item instanceof File);
    } else {
      const json = (await request.json().catch(() => null)) as { body?: unknown } | null;
      body = String(json?.body ?? "");
    }

    if (!body.trim() && files.length === 0) {
      return NextResponse.json(
        { ok: false, message: "Type a message or attach at least one photo." },
        { status: 400 }
      );
    }

    const message = await createMobileChatMessage(supabase, session, body, files);
    return NextResponse.json({ ok: true, chatMessage: message });
  } catch (error) {
    return NextResponse.json(
      { ok: false, message: getErrorMessage(error) },
      { status: 500 }
    );
  }
}

function getErrorMessage(error: unknown) {
  if (error instanceof Error) return error.message;
  if (typeof error === "object" && error && "message" in error) {
    return String((error as { message?: unknown }).message ?? "Chat request failed.");
  }
  return "Chat request failed.";
}

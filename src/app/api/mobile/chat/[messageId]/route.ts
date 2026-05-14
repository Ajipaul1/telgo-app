import { NextResponse, type NextRequest } from "next/server";
import { deleteMobileChatMessage } from "@/lib/server/mobile-chat";
import { getMobileAccessClient } from "@/lib/server/mobile-access";
import { readMobileSession } from "@/lib/server/mobile-session";

export async function DELETE(
  request: NextRequest,
  context: { params: Promise<{ messageId: string }> }
) {
  const session = readMobileSession(request);
  if (!session) {
    return NextResponse.json({ ok: false, message: "Sign in again to manage chat." }, { status: 401 });
  }

  const { messageId } = await context.params;
  if (!messageId) {
    return NextResponse.json({ ok: false, message: "Chat message id is required." }, { status: 400 });
  }

  let supabase: ReturnType<typeof getMobileAccessClient>;
  try {
    supabase = getMobileAccessClient();
  } catch (error) {
    return NextResponse.json({ ok: false, message: getErrorMessage(error) }, { status: 500 });
  }

  try {
    const chatMessage = await deleteMobileChatMessage(supabase, session, messageId);
    return NextResponse.json({ ok: true, chatMessage });
  } catch (error) {
    const message = getErrorMessage(error);
    const status = /only the sender or an admin/i.test(message) ? 403 : 500;
    return NextResponse.json({ ok: false, message }, { status });
  }
}

function getErrorMessage(error: unknown) {
  if (error instanceof Error) return error.message;
  if (typeof error === "object" && error && "message" in error) {
    return String((error as { message?: unknown }).message ?? "Chat delete failed.");
  }
  return "Chat delete failed.";
}

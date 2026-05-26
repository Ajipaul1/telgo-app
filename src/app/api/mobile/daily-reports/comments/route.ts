import { NextResponse, type NextRequest } from "next/server";
import { readMobileSession } from "@/lib/server/mobile-session";
import { getMobileAccessClient } from "@/lib/server/mobile-access";

export async function GET(request: NextRequest) {
  const session = await readMobileSession(request);
  if (!session) {
    return NextResponse.json({ ok: false, message: "Unauthorized." }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const reportId = searchParams.get("reportId") || "";

  if (!reportId) {
    return NextResponse.json({ ok: false, message: "Missing reportId parameter." }, { status: 400 });
  }

  try {
    const supabase = getMobileAccessClient();
    const { data, error } = await supabase
      .from("report_clarification_messages")
      .select("*")
      .eq("report_id", reportId)
      .order("created_at", { ascending: true });

    if (error) {
      console.error("Supabase error fetching clarification messages:", error);
      return NextResponse.json({ ok: false, message: error.message }, { status: 500 });
    }

    return NextResponse.json({ ok: true, comments: data || [] });
  } catch (error: any) {
    return NextResponse.json({ ok: false, message: error.message || "Failed to load chat." }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  const session = await readMobileSession(request);
  if (!session) {
    return NextResponse.json({ ok: false, message: "Unauthorized." }, { status: 401 });
  }

  try {
    const body = await request.json();
    const { reportId, message, itemType } = body;

    if (!reportId || !message) {
      return NextResponse.json({ ok: false, message: "Missing reportId or message parameter." }, { status: 400 });
    }

    const supabase = getMobileAccessClient();

    // 1. Insert chat message
    const { data: insertedMsg, error: insertErr } = await supabase
      .from("report_clarification_messages")
      .insert({
        report_id: reportId,
        sender_id: session.userId,
        sender_name: session.fullName,
        sender_role: session.role,
        message,
        item_type: itemType || null
      })
      .select("*")
      .single();

    if (insertErr) {
      console.error("Supabase insert comment failed:", insertErr);
      return NextResponse.json({ ok: false, message: insertErr.message }, { status: 500 });
    }

    // 2. Automate report workflow transitions based on sender role
    let newStatus = "";
    if (session.role === "admin") {
      newStatus = "clarification";
    } else if (session.role === "supervisor") {
      newStatus = "pending";
    }

    if (newStatus) {
      const { error: updateErr } = await supabase
        .from("pending_daily_reports")
        .update({ status: newStatus })
        .eq("id", reportId);

      if (updateErr) {
        console.error("Failed to transition daily report status on comment:", updateErr);
      }
    }

    return NextResponse.json({ ok: true, comment: insertedMsg });
  } catch (error: any) {
    return NextResponse.json({ ok: false, message: error.message || "Failed to send chat message." }, { status: 500 });
  }
}

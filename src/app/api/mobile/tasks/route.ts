import { NextResponse, type NextRequest } from "next/server";
import { getMobileAccessClient } from "@/lib/server/mobile-access";
import { readMobileSession } from "@/lib/server/mobile-session";
import { createRealTask, listRealTasks } from "@/lib/server/mobile-tasks";
import type { ManagedTask } from "@/store/ops-store";

export async function GET(request: NextRequest) {
  if (!canReadTasks(request)) {
    return NextResponse.json(
      { ok: false, message: "Sign in to load live task data." },
      { status: 401 }
    );
  }

  let supabase: ReturnType<typeof getMobileAccessClient>;
  try {
    supabase = getMobileAccessClient();
  } catch (error) {
    return NextResponse.json({ ok: false, message: getErrorMessage(error) }, { status: 500 });
  }

  try {
    const result = await listRealTasks(supabase);
    return NextResponse.json({
      ok: true,
      tasks: result.tasks,
      source: result.message ? "demo" : "supabase",
      message: result.message
    });
  } catch (error) {
    return NextResponse.json({ ok: false, message: getErrorMessage(error) }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  const session = readMobileSession(request);
  if (!canCreateTasks(request, session?.role)) {
    return NextResponse.json(
      { ok: false, message: "Admin or supervisor access is required to assign tasks." },
      { status: 403 }
    );
  }

  let supabase: ReturnType<typeof getMobileAccessClient>;
  try {
    supabase = getMobileAccessClient();
  } catch (error) {
    return NextResponse.json({ ok: false, message: getErrorMessage(error) }, { status: 500 });
  }

  const body = (await request.json().catch(() => null)) as Partial<ManagedTask> | null;
  if (!body?.title || !body?.projectId || !body?.assigneeUserId) {
    return NextResponse.json(
      { ok: false, message: "Task title, project, and assignee are required." },
      { status: 400 }
    );
  }

  try {
    const task = await createRealTask(supabase, {
      title: body.title,
      detail: body.detail ?? "Task detail to be confirmed.",
      projectId: body.projectId,
      assigneeUserId: body.assigneeUserId,
      assignedByUserId: body.assignedByUserId ?? session?.userId ?? "admin",
      priority: body.priority ?? "medium",
      status: body.status ?? "pending",
      dueAt: body.dueAt ?? "",
      taskType: body.taskType ?? "Inspection",
      location: body.location,
      notes: body.notes,
      attachmentName: body.attachmentName
    });
    return NextResponse.json({ ok: true, task });
  } catch (error) {
    return NextResponse.json({ ok: false, message: getErrorMessage(error) }, { status: 500 });
  }
}

function canReadTasks(request: NextRequest) {
  return Boolean(readMobileSession(request)) || isTrustedLocalRequest(request);
}

function canCreateTasks(request: NextRequest, role?: string) {
  return role === "admin" || role === "supervisor" || isTrustedLocalRequest(request);
}

function isTrustedLocalRequest(request: NextRequest) {
  const host = request.headers.get("host") ?? "";
  return /^(127\.0\.0\.1|localhost)(:\d+)?$/i.test(host);
}

function getErrorMessage(error: unknown) {
  if (error instanceof Error) return error.message;
  if (typeof error === "object" && error && "message" in error) {
    return String((error as { message?: unknown }).message ?? "Task request failed.");
  }
  return "Task request failed.";
}

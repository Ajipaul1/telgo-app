import { NextResponse, type NextRequest } from "next/server";
import { getMobileAccessClient } from "@/lib/server/mobile-access";
import { readMobileSession } from "@/lib/server/mobile-session";
import { updateRealProject } from "@/lib/server/mobile-projects";
import type { Project } from "@/lib/types";

export async function PATCH(
  request: NextRequest,
  context: { params: Promise<{ projectId: string }> }
) {
  const session = await readMobileSession(request);
  if (!canWriteProjects(request, session?.role)) {
    return NextResponse.json(
      { ok: false, message: "Admin access is required to update projects." },
      { status: 403 }
    );
  }

  let supabase: ReturnType<typeof getMobileAccessClient>;
  try {
    supabase = getMobileAccessClient();
  } catch (error) {
    return NextResponse.json({ ok: false, message: getErrorMessage(error) }, { status: 500 });
  }

  const { projectId } = await context.params;
  const body = (await request.json().catch(() => null)) as Partial<Project> | null;
  if (!projectId || !body) {
    return NextResponse.json(
      { ok: false, message: "Project id and update payload are required." },
      { status: 400 }
    );
  }

  try {
    const project = await updateRealProject(supabase, projectId, body);
    return NextResponse.json({ ok: true, project });
  } catch (error) {
    return NextResponse.json({ ok: false, message: getErrorMessage(error) }, { status: 500 });
  }
}

function canWriteProjects(request: NextRequest, role?: string) {
  return role === "admin" || isTrustedLocalRequest(request);
}

function isTrustedLocalRequest(request: NextRequest) {
  const host = request.headers.get("host") ?? "";
  return /^(127\.0\.0\.1|localhost)(:\d+)?$/i.test(host);
}

function getErrorMessage(error: unknown) {
  if (error instanceof Error) return error.message;
  if (typeof error === "object" && error && "message" in error) {
    return String((error as { message?: unknown }).message ?? "Project update failed.");
  }
  return "Project update failed.";
}

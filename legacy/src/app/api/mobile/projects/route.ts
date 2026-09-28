import { NextResponse, type NextRequest } from "next/server";
import { getMobileAccessClient } from "@/lib/server/mobile-access";
import { readMobileSession } from "@/lib/server/mobile-session";
import { createRealProject, listRealProjects } from "@/lib/server/mobile-projects";
import { notifyAdmins } from "@/lib/server/mobile-notifications";
import type { Project } from "@/lib/types";

export async function GET(request: NextRequest) {
  if (!(await canReadProjects(request))) {
    return NextResponse.json(
      { ok: false, message: "Sign in to load real project data." },
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
    const result = await listRealProjects(supabase, { syncDemoProjects: true });
    return NextResponse.json({
      ok: true,
      projects: result.projects,
      source: result.message ? "demo" : "supabase",
      message: result.message
    });
  } catch (error) {
    return NextResponse.json({ ok: false, message: getErrorMessage(error) }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  const session = await readMobileSession(request);
  if (!canWriteProjects(request, session?.role)) {
    return NextResponse.json(
      { ok: false, message: "Admin access is required to create projects." },
      { status: 403 }
    );
  }

  let supabase: ReturnType<typeof getMobileAccessClient>;
  try {
    supabase = getMobileAccessClient();
  } catch (error) {
    return NextResponse.json({ ok: false, message: getErrorMessage(error) }, { status: 500 });
  }

  const body = (await request.json().catch(() => null)) as (Partial<Project> & { id?: string }) | null;
  const location = body?.location || ((body as any)?.district ? `${(body as any).district}, Kerala` : undefined);
  if (!body?.name || !location) {
    return NextResponse.json(
      { ok: false, message: "Project name and location are required." },
      { status: 400 }
    );
  }

  if (body) {
    body.location = location;
  }

  try {
    const project = await createRealProject(supabase, body as Omit<Project, "id"> & { id?: string });

    try {
      const actorName = session?.fullName || "System Admin";
      await notifyAdmins(
        supabase,
        "➕ Project Created",
        `New project "${project.name}" (Code: ${project.code}) created by ${actorName}.`,
        { projectId: project.id, actorUserId: session?.userId || null }
      );
    } catch (err) {
      console.error("Failed to trigger project creation notification:", err);
    }

    return NextResponse.json({ ok: true, project });
  } catch (error) {
    return NextResponse.json({ ok: false, message: getErrorMessage(error) }, { status: 500 });
  }
}

async function canReadProjects(request: NextRequest) {
  const session = await readMobileSession(request);
  return Boolean(session) || isTrustedLocalRequest(request);
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
    return String((error as { message?: unknown }).message ?? "Project request failed.");
  }
  return "Project request failed.";
}

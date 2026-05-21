import { NextResponse, type NextRequest } from "next/server";
import { getMobileAccessClient } from "@/lib/server/mobile-access";
import { readMobileSession } from "@/lib/server/mobile-session";
import { createRealProject, listRealProjects } from "@/lib/server/mobile-projects";
import type { Project } from "@/lib/types";

export async function GET(request: NextRequest) {
  if (!canReadProjects(request)) {
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
  const session = readMobileSession(request);
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
  if (!body?.name || !body?.location) {
    return NextResponse.json(
      { ok: false, message: "Project name and location are required." },
      { status: 400 }
    );
  }

  try {
    const project = await createRealProject(supabase, body as Omit<Project, "id"> & { id?: string });
    return NextResponse.json({ ok: true, project });
  } catch (error) {
    return NextResponse.json({ ok: false, message: getErrorMessage(error) }, { status: 500 });
  }
}

function canReadProjects(request: NextRequest) {
  return Boolean(readMobileSession(request)) || isTrustedLocalRequest(request);
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

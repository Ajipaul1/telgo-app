import { randomBytes, randomUUID } from "node:crypto";
import { NextResponse, type NextRequest } from "next/server";
import {
  getMobileAccessClient,
  toMobileAccessUser
} from "@/lib/server/mobile-access";

import { createHash } from "node:crypto";

const allowedRoles = new Set(["supervisor", "finance", "client", "admin"]);

function normalizeEmail(value: unknown) {
  const email = String(value ?? "").trim().toLowerCase();
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) ? email : "";
}

function normalizeRole(value: unknown) {
  const role = String(value ?? "supervisor").trim().toLowerCase();
  if (role === "site engineer" || role === "engineer") {
    return "supervisor";
  }
  return allowedRoles.has(role) ? role : "supervisor";
}

function makeTelgoId() {
  return `TLG-${randomBytes(4).toString("hex").toUpperCase()}`;
}

export async function POST(request: NextRequest) {
  const body = (await request.json().catch(() => null)) as
    | { fullName?: unknown; email?: unknown; role?: unknown }
    | null;
  const fullName = String(body?.fullName ?? "").trim();
  const email = normalizeEmail(body?.email);
  const role = normalizeRole(body?.role);

  if (fullName.length < 2 || !email) {
    return NextResponse.json(
      { ok: false, message: "Name and a valid email address are required." },
      { status: 400 }
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

  let targetEmail = email;
  let existingUser = null;
  const [base, domain] = email.split("@");
  const cleanBase = base.split("+")[0];

  // Scan through candidate email aliases to find the first available one
  for (let i = 0; i < 20; i++) {
    const candidate = i === 0 
      ? `${cleanBase}@${domain}` 
      : (i === 1 ? `${cleanBase}+${role}@${domain}` : `${cleanBase}+${role}${i}@${domain}`);

    const { data, error } = await supabase
      .from("mobile_app_users")
      .select("id,email,full_name,role,login_id,user_folder_path,created_at,auth_user_id,pin_set_at,access_status,blocked_at")
      .eq("email", candidate)
      .maybeSingle();

    if (error) {
      return NextResponse.json(
        { ok: false, message: `Access lookup failed: ${error.message}` },
        { status: 500 }
      );
    }

    if (!data) {
      // Free email alias candidate found, we will create a new account!
      targetEmail = candidate;
      existingUser = null;
      break;
    }

    // We can re-use/overwrite this candidate if it matches the role and is not active/blocked
    if (data.role === role && data.access_status !== "active" && data.access_status !== "blocked") {
      targetEmail = candidate;
      existingUser = data;
      break;
    }

    // Otherwise, this candidate is taken. Keep looping!
  }

  if (existingUser?.blocked_at || existingUser?.access_status === "blocked") {
    return NextResponse.json(
      { ok: false, message: "This account is blocked. Contact Telgo operations." },
      { status: 403 }
    );
  }

  const loginId = existingUser?.login_id ? String(existingUser.login_id) : makeTelgoId();
  const folderPath =
    existingUser?.user_folder_path && String(existingUser.user_folder_path).trim()
      ? String(existingUser.user_folder_path)
      : `mobile-users/${loginId}`;

  const activatedAt = new Date().toISOString();
  const payload = {
    email: targetEmail,
    login_id: loginId,
    temp_password_hash: null,
    full_name: fullName,
    role,
    access_status: "pending",
    blocked_at: null,
    blocked_reason: null,
    activated_at: null,
    pin_hash: null,
    pin_set_at: null,
    user_folder_path: folderPath,
    updated_at: activatedAt
  };
  let data: Record<string, unknown> | null = null;
  let error: { message: string } | null = null;

  if (existingUser?.id != null) {
    const response = await supabase
      .from("mobile_app_users")
      .update(payload)
      .eq("id", existingUser.id)
      .select("id,email,full_name,role,login_id,user_folder_path,created_at")
      .single();
    data = response.data;
    error = response.error;
  } else {
    const insertResponse = await supabase
      .from("mobile_app_users")
      .insert(payload)
      .select("id,email,full_name,role,login_id,user_folder_path,created_at")
      .single();
    data = insertResponse.data;
    error = insertResponse.error;

    if (
      error &&
      /null value in column "id"|violates not-null constraint/i.test(error.message)
    ) {
      const fallbackUserId = randomUUID();
      const retryResponse = await supabase
        .from("mobile_app_users")
        .insert({
          id: fallbackUserId,
          ...payload
        })
        .select("id,email,full_name,role,login_id,user_folder_path,created_at")
        .single();
      data = retryResponse.data;
      error = retryResponse.error;
    }
  }

  if (error) {
    return NextResponse.json(
      { ok: false, message: `Access could not be created: ${error.message}` },
      { status: 500 }
    );
  }
  if (!data) {
    return NextResponse.json(
      { ok: false, message: "Access could not be created: no user record was returned." },
      { status: 500 }
    );
  }

  const savedUser = toMobileAccessUser(data);
  const savedLoginId = savedUser.login_id;

  const { error: profileError } = await supabase.from("mobile_user_files").upsert(
    {
      mobile_user_id: savedUser.id,
      folder_path: folderPath,
      profile: {
        fullName: savedUser.full_name,
        email: savedUser.email,
        role: savedUser.role,
        loginId: savedLoginId
      },
      updated_at: activatedAt
    },
    { onConflict: "folder_path" }
  );

  if (profileError) {
    console.error("Mobile user file sync failed after access activation", {
      email: targetEmail,
      loginId: savedLoginId,
      message: profileError.message
    });
  }

  if (!existingUser?.auth_user_id) {
    const { error: authUserError } = await supabase.auth.admin.createUser({
      email: targetEmail,
      email_confirm: true,
      user_metadata: {
        full_name: fullName,
        role,
        login_id: savedLoginId,
        mobile_access_id: savedUser.id
      }
    });

    if (
      authUserError &&
      !/already registered|already exists|duplicate/i.test(authUserError.message)
    ) {
      console.error("Supabase Auth user provisioning failed", {
        email: targetEmail,
        loginId: savedLoginId,
        message: authUserError.message
      });
    }
  }

  return NextResponse.json({
    ok: true,
    loginId: savedLoginId,
    email: targetEmail,
    fullName,
    role,
    message: "Access request submitted. Your account is pending admin approval. You will receive an email once approved."
  });
}

function getErrorMessage(error: unknown) {
  if (error instanceof Error) return error.message;
  return "Server configuration is missing.";
}

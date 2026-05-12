import { createHash, randomBytes } from "node:crypto";
import { NextResponse, type NextRequest } from "next/server";
import {
  getMobileAccessClient,
  toMobileAccessUser
} from "@/lib/server/mobile-access";

const allowedRoles = new Set(["engineer", "supervisor", "finance", "client", "admin"]);

function normalizeEmail(value: unknown) {
  const email = String(value ?? "").trim().toLowerCase();
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) ? email : "";
}

function normalizeRole(value: unknown) {
  const role = String(value ?? "engineer").trim().toLowerCase();
  return allowedRoles.has(role) ? role : "engineer";
}

function makeTelgoId() {
  return `TLG-${randomBytes(4).toString("hex").toUpperCase()}`;
}

function makePassword() {
  return `Telgo-${randomBytes(3).toString("hex").toUpperCase()}`;
}

function hashSecret(identifier: string, secret: string) {
  return createHash("sha256").update(`${identifier.toUpperCase()}:${secret}`).digest("hex");
}

function accessEmailHtml({
  fullName,
  role,
  loginId,
  password,
  appUrl
}: {
  fullName: string;
  role: string;
  loginId: string;
  password: string;
  appUrl: string;
}) {
  return `
    <div style="font-family:Arial,sans-serif;color:#07122f;line-height:1.6">
      <h2>Telgo Hub access approved</h2>
      <p>Hello ${fullName},</p>
      <p>Your ${role} access for Telgo Hub has been approved. Use these details once, then create your 4-digit PIN in the app.</p>
      <div style="border:1px solid #dbeafe;border-radius:12px;padding:16px;background:#f8fbff;margin:18px 0">
        <p style="margin:0 0 8px"><strong>Telgo ID:</strong> ${loginId}</p>
        <p style="margin:0"><strong>One-time password:</strong> ${password}</p>
      </div>
      <p><a href="${appUrl}" style="display:inline-block;background:#115cff;color:white;text-decoration:none;border-radius:10px;padding:12px 18px;font-weight:700">Open Telgo Hub</a></p>
      <p style="font-size:13px;color:#64748b">If this request was not made by you, contact Telgo operations immediately so the access can be blocked.</p>
    </div>
  `;
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

  const resendApiKey = process.env.RESEND_API_KEY;
  if (!resendApiKey) {
    return NextResponse.json(
      { ok: false, message: "Email service is not configured on the server." },
      { status: 500 }
    );
  }

  const loginId = makeTelgoId();
  const password = makePassword();
  const passwordHash = hashSecret(loginId, password);
  let supabase: ReturnType<typeof getMobileAccessClient>;
  try {
    supabase = getMobileAccessClient();
  } catch (error) {
    return NextResponse.json(
      { ok: false, message: getErrorMessage(error) },
      { status: 500 }
    );
  }

  const userId = `email-${createHash("md5").update(email).digest("hex")}`;
  const folderPath = `mobile-users/${loginId}`;
  const { data, error } = await supabase
    .from("mobile_app_users")
    .upsert(
      {
        id: userId,
        email,
        login_id: loginId,
        temp_password_hash: passwordHash,
        full_name: fullName,
        role,
        access_status: "active",
        blocked_at: null,
        blocked_reason: null,
        activated_at: new Date().toISOString(),
        user_folder_path: folderPath,
        updated_at: new Date().toISOString()
      },
      { onConflict: "id" }
    )
    .select("id,email,full_name,role,login_id,user_folder_path,created_at")
    .single();

  if (error) {
    return NextResponse.json(
      { ok: false, message: `Access could not be created: ${error.message}` },
      { status: 500 }
    );
  }

  const savedUser = toMobileAccessUser(data);
  const savedLoginId = savedUser.login_id;
  await supabase.from("mobile_user_files").upsert(
    {
      mobile_user_id: savedUser.id,
      folder_path: folderPath,
      profile: {
        fullName: savedUser.full_name,
        email: savedUser.email,
        role: savedUser.role,
        loginId: savedLoginId
      },
      updated_at: new Date().toISOString()
    },
    { onConflict: "folder_path" }
  );

  const appUrl = new URL("/", request.url).toString();
  const from = process.env.RESEND_FROM_EMAIL ?? "Telgo Hub <onboarding@resend.dev>";
  const emailResponse = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${resendApiKey}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      from,
      to: email,
      subject: "Your Telgo Hub access is ready",
      html: accessEmailHtml({
        fullName,
        role,
        loginId: savedLoginId,
        password,
        appUrl
      })
    })
  });

  if (!emailResponse.ok) {
    const message = await emailResponse.text();
    return NextResponse.json(
      { ok: false, message: `Access was created, but email failed: ${message}` },
      { status: 502 }
    );
  }

  return NextResponse.json({
    ok: true,
    loginId: savedLoginId,
    email,
    fullName,
    role,
    message: "Access approved and email sent."
  });
}

function getErrorMessage(error: unknown) {
  if (error instanceof Error) return error.message;
  return "Server configuration is missing.";
}

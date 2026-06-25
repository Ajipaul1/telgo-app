import { createHash, randomBytes, randomUUID } from "node:crypto";
import { NextResponse, type NextRequest } from "next/server";
import { getMobileAccessClient, toMobileAccessUser } from "@/lib/server/mobile-access";
import { readMobileSession } from "@/lib/server/mobile-session";
import { sendEmail } from "@/lib/server/email";

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
  // 1. Authorize Admin Session
  const session = await readMobileSession(request);
  if (!session || session.role !== "admin") {
    return NextResponse.json({ ok: false, message: "Unauthorized." }, { status: 401 });
  }

  // 2. Parse Request Body
  let body;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ ok: false, message: "Invalid JSON request body." }, { status: 400 });
  }

  const { fullName, email, role, password } = body as {
    fullName?: string;
    email?: string;
    role?: string;
    password?: string;
  };

  const nameTrimmed = String(fullName ?? "").trim();
  const normalizedEmail = normalizeEmail(email);
  const normalizedRole = normalizeRole(role);
  const passwordTrimmed = String(password ?? "").trim();

  // 3. Validation
  if (nameTrimmed.length < 2) {
    return NextResponse.json(
      { ok: false, message: "Name is too short (minimum 2 characters)." },
      { status: 400 }
    );
  }
  if (!normalizedEmail) {
    return NextResponse.json(
      { ok: false, message: "A valid email address is required." },
      { status: 400 }
    );
  }
  if (passwordTrimmed.length < 6) {
    return NextResponse.json(
      { ok: false, message: "Password must be at least 6 characters long." },
      { status: 400 }
    );
  }

  let supabase;
  try {
    supabase = getMobileAccessClient();
  } catch (dbError) {
    return NextResponse.json(
      { ok: false, message: "Database connection configuration error." },
      { status: 500 }
    );
  }

  // 4. Check for Existing Email
  const { data: existingUser, error: checkError } = await supabase
    .from("mobile_app_users")
    .select("id, email")
    .eq("email", normalizedEmail)
    .maybeSingle();

  if (checkError) {
    return NextResponse.json(
      { ok: false, message: `Access lookup failed: ${checkError.message}` },
      { status: 500 }
    );
  }

  if (existingUser) {
    return NextResponse.json(
      { ok: false, message: "A user with this email address already exists." },
      { status: 400 }
    );
  }

  // 5. Generate Access IDs and Hashes
  const loginId = makeTelgoId();
  const folderPath = `mobile-users/${loginId}`;
  const passwordHash = createHash("sha256")
    .update(`${normalizedEmail}:${passwordTrimmed}`)
    .digest("hex");
  const activatedAt = new Date().toISOString();

  const payload = {
    email: normalizedEmail,
    login_id: loginId,
    temp_password_hash: null,
    full_name: nameTrimmed,
    role: normalizedRole,
    access_status: "active",
    blocked_at: null,
    blocked_reason: null,
    activated_at: activatedAt,
    pin_hash: null,
    pin_set_at: null,
    user_folder_path: folderPath,
    updated_at: activatedAt,
    password_hash: passwordHash
  };

  // 6. Insert User Record with Fallback
  let data: Record<string, unknown> | null = null;
  let error: { message: string } | null = null;

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

  if (error || !data) {
    return NextResponse.json(
      { ok: false, message: `Access could not be created: ${error?.message ?? "unknown DB error."}` },
      { status: 500 }
    );
  }

  const savedUser = toMobileAccessUser(data);

  // 7. Sync Profile record in mobile_user_files
  const { error: profileError } = await supabase.from("mobile_user_files").upsert(
    {
      mobile_user_id: savedUser.id,
      folder_path: folderPath,
      profile: {
        fullName: savedUser.full_name,
        email: savedUser.email,
        role: savedUser.role,
        loginId: savedUser.login_id
      },
      updated_at: activatedAt
    },
    { onConflict: "folder_path" }
  );

  if (profileError) {
    console.error("Mobile user file sync failed after admin profile creation:", {
      email: normalizedEmail,
      loginId: savedUser.login_id,
      message: profileError.message
    });
  }

  // 8. Dispatch Credentials Email
  try {
    let roleColor = "#0284c7"; // default blue
    const roleUpper = String(savedUser.role).toUpperCase();
    if (roleUpper === "ADMIN") roleColor = "#7c3aed";
    else if (roleUpper === "SUPERVISOR") roleColor = "#0284c7";
    else if (roleUpper === "FINANCE") roleColor = "#db2777";
    else if (roleUpper === "CLIENT") roleColor = "#059669";

    const emailHtml = `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Account Created - Telgo Hub</title>
</head>
<body style="margin: 0; padding: 0; background-color: #f4f6f9; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; -webkit-text-size-adjust: 100%; -ms-text-size-adjust: 100%;">
  <table width="100%" border="0" cellspacing="0" cellpadding="0" style="background-color: #f4f6f9; margin: 0; padding: 36px 12px; width: 100% !important;">
    <tr>
      <td align="center" valign="top">
        <table border="0" cellspacing="0" cellpadding="0" style="max-width: 480px; width: 100%; background-color: #ffffff; border: 1px solid #e2e8f0; border-radius: 12px; box-shadow: 0 4px 12px rgba(0, 0, 0, 0.05); box-sizing: border-box; overflow: hidden;">
          <tr>
            <td style="padding: 40px 32px;">
              <table border="0" cellspacing="0" cellpadding="0" style="margin: 0 auto 16px auto; background-color: #0f172a; border-radius: 8px;">
                <tr>
                  <td style="padding: 10px 20px; font-family: -apple-system, BlinkMacSystemFont, sans-serif; font-size: 20px; font-weight: 900; color: #ffffff; letter-spacing: 2px; text-align: center; text-transform: uppercase;">
                    TELGO HUB
                  </td>
                </tr>
              </table>
              <table border="0" cellspacing="0" cellpadding="0" style="width: 100%; text-align: center; margin-bottom: 32px;">
                <tr>
                  <td>
                    <p style="margin: 0; color: #64748b; font-size: 11px; font-weight: 700; letter-spacing: 1px; text-transform: uppercase; font-family: sans-serif;">Enterprise Operations Platform</p>
                  </td>
                </tr>
              </table>
              <table border="0" cellspacing="0" cellpadding="0" style="width: 100%; text-align: left; margin-bottom: 28px;">
                <tr>
                  <td style="font-family: sans-serif;">
                    <p style="font-size: 16px; font-weight: bold; color: #0f172a; line-height: 1.5; margin: 0 0 12px;">Hello ${savedUser.full_name},</p>
                    <p style="font-size: 14px; color: #475569; line-height: 1.6; margin: 0;">An account has been manually created for you on the <strong style="color: #0f172a;">Telgo Hub</strong> operations console. You have been granted immediate access. Find your credential details below.</p>
                  </td>
                </tr>
              </table>
              <table border="0" cellspacing="0" cellpadding="0" style="width: 100%; background-color: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; margin-bottom: 28px;">
                <tr>
                  <td style="padding: 18px 20px 4px 20px; font-family: sans-serif; font-size: 10px; font-weight: 700; color: #64748b; text-transform: uppercase; letter-spacing: 1px;">
                    Access Level
                  </td>
                </tr>
                <tr>
                  <td style="padding: 0 20px 14px 20px; font-family: sans-serif; font-size: 14px; font-weight: 800; color: ${roleColor}; text-transform: uppercase;">
                    ${savedUser.role}
                  </td>
                </tr>
                <tr>
                  <td style="padding: 0 20px;">
                    <table border="0" cellspacing="0" cellpadding="0" style="width: 100%;">
                      <tr><td style="height: 1px; background-color: #e2e8f0; font-size: 0; line-height: 0;"></td></tr>
                    </table>
                  </td>
                </tr>
                <tr>
                  <td style="padding: 14px 20px 4px 20px; font-family: sans-serif; font-size: 10px; font-weight: 700; color: #64748b; text-transform: uppercase; letter-spacing: 1px;">
                    Login Email
                  </td>
                </tr>
                <tr>
                  <td style="padding: 0 20px 14px 20px; font-family: monospace; font-size: 14px; font-weight: 600; color: #0f172a; word-break: break-all;">
                    ${savedUser.email}
                  </td>
                </tr>
                <tr>
                  <td style="padding: 0 20px;">
                    <table border="0" cellspacing="0" cellpadding="0" style="width: 100%;">
                      <tr><td style="height: 1px; background-color: #e2e8f0; font-size: 0; line-height: 0;"></td></tr>
                    </table>
                  </td>
                </tr>
                <tr>
                  <td style="padding: 14px 20px 6px 20px; font-family: sans-serif; font-size: 10px; font-weight: 700; color: #64748b; text-transform: uppercase; letter-spacing: 1px;">
                    Password
                  </td>
                </tr>
                <tr>
                  <td style="padding: 0 20px 20px 20px;">
                    <table border="0" cellspacing="0" cellpadding="0" style="width: 100%;">
                      <tr>
                        <td style="padding: 12px 14px; background-color: #f1f5f9; border: 1px dashed #cbd5e1; border-radius: 6px; font-family: monospace; font-size: 20px; font-weight: bold; color: #7c3aed; text-align: center; letter-spacing: 2px;">
                          ${passwordTrimmed}
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>
              </table>
              <table border="0" cellspacing="0" cellpadding="0" style="width: 100%; background-color: #fffbeb; border: 1px solid #fef3c7; border-radius: 8px; margin-bottom: 28px;">
                <tr>
                  <td style="padding: 12px 16px; text-align: left;">
                    <p style="margin: 0; font-size: 12px; color: #b45309; line-height: 1.5; font-family: sans-serif;">
                      ⚠️ <strong>Security Notice:</strong> Keep this password confidential. You can log in using your Email address as your username.
                    </p>
                  </td>
                </tr>
              </table>
              <table border="0" cellspacing="0" cellpadding="0" style="width: 100%; text-align: center;">
                <tr>
                  <td align="center">
                    <a href="https://telgo-app.vercel.app/login" style="display: inline-block; width: 100%; max-width: 280px; text-align: center; background-color: #0f172a; color: #ffffff; text-decoration: none; padding: 14px 0; border-radius: 8px; font-weight: 700; font-size: 14px; font-family: sans-serif; text-transform: uppercase; letter-spacing: 1px;">Open Telgo Hub</a>
                  </td>
                </tr>
              </table>
              <table border="0" cellspacing="0" cellpadding="0" style="width: 100%; margin-top: 32px; padding-top: 24px; border-top: 1px solid #1e293b; text-align: center;">
                <tr>
                  <td style="font-size: 11px; color: #475569; line-height: 1.6; font-family: sans-serif;">
                    This is an automated operational transmission from Telgo Power Projects Operations Control.<br />
                    © ${new Date().getFullYear()} Telgo Power Projects. All rights reserved.
                  </td>
                </tr>
              </table>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;

    // 1. Primary email dispatch
    try {
      await sendEmail({
        to: savedUser.email!,
        subject: "🔑 Your Telgo Hub Account has Been Created",
        html: emailHtml,
      });
    } catch (primaryErr) {
      console.error("Manual profile creation: Primary send error:", primaryErr);
    }

    // 2. Sandbox developer testing copy
    const devEmail = "ajipaul96@gmail.com";
    if (savedUser.email !== devEmail) {
      try {
        const sandboxHtml = `
          <div style="background: rgba(124,58,237,0.15); border: 2px solid #7c3aed; color: #c4b5fd; padding: 16px; border-radius: 12px; margin-bottom: 24px; font-family: sans-serif; font-size: 14px; line-height: 1.5;">
            🔔 <strong>[Resend Sandbox Copy]</strong><br />
            This is a testing copy of the onboarding email generated for manually created account <strong>${savedUser.email}</strong>.<br />
            Since the Resend sandbox restricts email delivery to verified accounts only, we've routed this copy to your inbox (<strong>ajipaul96@gmail.com</strong>) so you can retrieve their generated credentials instantly!
          </div>
          ${emailHtml}
        `;
        
        await sendEmail({
          to: devEmail,
          subject: `🔔 [Testing Copy] Account Created for ${savedUser.email}`,
          html: sandboxHtml,
        });
      } catch (sandboxErr) {
        console.error("Manual profile creation: Sandbox copy error:", sandboxErr);
      }
    }

  } catch (emailDispatchError) {
    console.error("Failed to process email notifications for manual user creation:", emailDispatchError);
  }

  // 9. Return Response
  return NextResponse.json({
    ok: true,
    user: savedUser,
    message: "Member profile created and activated successfully."
  });
}

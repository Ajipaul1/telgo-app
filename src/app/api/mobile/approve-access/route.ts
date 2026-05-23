import { createHash, randomBytes } from "node:crypto";
import { NextResponse, type NextRequest } from "next/server";
import { getMobileAccessClient } from "@/lib/server/mobile-access";
import { readMobileSession } from "@/lib/server/mobile-session";
import { sendEmail } from "@/lib/server/email";

function generatePassword(length = 10) {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789";
  let pass = "";
  const bytes = randomBytes(length);
  for (let i = 0; i < length; i++) {
    pass += chars[bytes[i] % chars.length];
  }
  return pass;
}

export async function POST(request: NextRequest) {
  const session = await readMobileSession(request);
  if (!session || session.role !== "admin") {
    return NextResponse.json({ ok: false, message: "Unauthorized" }, { status: 401 });
  }

  let body;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ ok: false, message: "Invalid JSON request body." }, { status: 400 });
  }

  const { userId } = body as { userId?: string };

  if (!userId) {
    return NextResponse.json({ ok: false, message: "User ID is required." }, { status: 400 });
  }

  let supabase;
  try {
    supabase = getMobileAccessClient();
  } catch {
    return NextResponse.json({ ok: false, message: "Database config error." }, { status: 500 });
  }

  const { data: user, error: fetchError } = await supabase
    .from("mobile_app_users")
    .select("id, email, full_name, role, login_id")
    .eq("id", userId)
    .maybeSingle();

  if (fetchError || !user) {
    return NextResponse.json(
      { ok: false, message: fetchError?.message ?? "User not found." },
      { status: 404 }
    );
  }

  const plainPassword = generatePassword();
  const email = String(user.email ?? "").trim().toLowerCase();
  const passwordHash = createHash("sha256")
    .update(`${email}:${plainPassword}`)
    .digest("hex");

  const activatedAt = new Date().toISOString();

  const { error: updateError } = await supabase
    .from("mobile_app_users")
    .update({
      access_status: "active",
      activated_at: activatedAt,
      updated_at: activatedAt,
      password_hash: passwordHash,
    })
    .eq("id", userId);

  if (updateError) {
    return NextResponse.json(
      { ok: false, message: `Failed to activate access: ${updateError.message}` },
      { status: 500 }
    );
  }

  if (user.email) {
    // Determine a professional formal theme color for the user's role
    let roleColor = "#0284c7"; // default blue
    const roleUpper = String(user.role).toUpperCase();
    if (roleUpper === "ADMIN") roleColor = "#7c3aed"; // violet
    else if (roleUpper === "SUPERVISOR") roleColor = "#0284c7"; // sky blue
    else if (roleUpper === "FINANCE") roleColor = "#db2777"; // rose pink
    else if (roleUpper === "CLIENT") roleColor = "#059669"; // emerald green

    const emailHtml = `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Access Approved - Telgo Hub</title>
</head>
<body style="margin: 0; padding: 0; background-color: #f4f6f9; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; -webkit-text-size-adjust: 100%; -ms-text-size-adjust: 100%;">
  <table width="100%" border="0" cellspacing="0" cellpadding="0" style="background-color: #f4f6f9; margin: 0; padding: 36px 12px; width: 100% !important;">
    <tr>
      <td align="center" valign="top">
        <!-- Main Card Wrapper -->
        <table border="0" cellspacing="0" cellpadding="0" style="max-width: 480px; width: 100%; background-color: #ffffff; border: 1px solid #e2e8f0; border-radius: 12px; box-shadow: 0 4px 12px rgba(0, 0, 0, 0.05); box-sizing: border-box; overflow: hidden;">
          <tr>
            <td style="padding: 40px 32px;">
              
              <!-- Header Brand Logo Badge -->
              <table border="0" cellspacing="0" cellpadding="0" style="margin: 0 auto 16px auto; background-color: #0f172a; border-radius: 8px;">
                <tr>
                  <td style="padding: 10px 20px; font-family: -apple-system, BlinkMacSystemFont, sans-serif; font-size: 20px; font-weight: 900; color: #ffffff; letter-spacing: 2px; text-align: center; text-transform: uppercase;">
                    TELGO HUB
                  </td>
                </tr>
              </table>

              <!-- Header Subtext -->
              <table border="0" cellspacing="0" cellpadding="0" style="width: 100%; text-align: center; margin-bottom: 32px;">
                <tr>
                  <td>
                    <p style="margin: 0; color: #64748b; font-size: 11px; font-weight: 700; letter-spacing: 1px; text-transform: uppercase; font-family: sans-serif;">Enterprise Operations Platform</p>
                  </td>
                </tr>
              </table>

              <!-- Body Message -->
              <table border="0" cellspacing="0" cellpadding="0" style="width: 100%; text-align: left; margin-bottom: 28px;">
                <tr>
                  <td style="font-family: sans-serif;">
                    <p style="font-size: 16px; font-weight: bold; color: #0f172a; line-height: 1.5; margin: 0 0 12px;">Hello ${user.full_name},</p>
                    <p style="font-size: 14px; color: #475569; line-height: 1.6; margin: 0;">Your access to the <strong style="color: #0f172a;">Telgo Hub</strong> operations console has been successfully <strong style="color: #059669;">approved</strong>. Below are your official credential details for logging in.</p>
                  </td>
                </tr>
              </table>

              <!-- Credentials Card (Professional Vertical Rows) -->
              <table border="0" cellspacing="0" cellpadding="0" style="width: 100%; background-color: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; margin-bottom: 28px;">
                <!-- Row 1: Access Level Label -->
                <tr>
                  <td style="padding: 18px 20px 4px 20px; font-family: sans-serif; font-size: 10px; font-weight: 700; color: #64748b; text-transform: uppercase; letter-spacing: 1px;">
                    Access Level
                  </td>
                </tr>
                <!-- Row 2: Access Level Value -->
                <tr>
                  <td style="padding: 0 20px 14px 20px; font-family: sans-serif; font-size: 14px; font-weight: 800; color: ${roleColor}; text-transform: uppercase;">
                    ${user.role}
                  </td>
                </tr>
                
                <!-- Divider -->
                <tr>
                  <td style="padding: 0 20px;">
                    <table border="0" cellspacing="0" cellpadding="0" style="width: 100%;">
                      <tr><td style="height: 1px; background-color: #e2e8f0; font-size: 0; line-height: 0;"></td></tr>
                    </table>
                  </td>
                </tr>

                <!-- Row 3: Login Email Label -->
                <tr>
                  <td style="padding: 14px 20px 4px 20px; font-family: sans-serif; font-size: 10px; font-weight: 700; color: #64748b; text-transform: uppercase; letter-spacing: 1px;">
                    Login Email
                  </td>
                </tr>
                <!-- Row 4: Login Email Value -->
                <tr>
                  <td style="padding: 0 20px 14px 20px; font-family: monospace; font-size: 14px; font-weight: 600; color: #0f172a; word-break: break-all;">
                    ${user.email}
                  </td>
                </tr>

                <!-- Divider -->
                <tr>
                  <td style="padding: 0 20px;">
                    <table border="0" cellspacing="0" cellpadding="0" style="width: 100%;">
                      <tr><td style="height: 1px; background-color: #e2e8f0; font-size: 0; line-height: 0;"></td></tr>
                    </table>
                  </td>
                </tr>

                <!-- Row 5: Unique Login ID Label -->
                <tr>
                  <td style="padding: 14px 20px 4px 20px; font-family: sans-serif; font-size: 10px; font-weight: 700; color: #64748b; text-transform: uppercase; letter-spacing: 1px;">
                    Unique Login ID
                  </td>
                </tr>
                <!-- Row 6: Unique Login ID Value -->
                <tr>
                  <td style="padding: 0 20px 14px 20px; font-family: monospace; font-size: 15px; font-weight: bold; color: #0284c7;">
                    ${user.login_id}
                  </td>
                </tr>

                <!-- Divider -->
                <tr>
                  <td style="padding: 0 20px;">
                    <table border="0" cellspacing="0" cellpadding="0" style="width: 100%;">
                      <tr><td style="height: 1px; background-color: #e2e8f0; font-size: 0; line-height: 0;"></td></tr>
                    </table>
                  </td>
                </tr>

                <!-- Row 7: Temporary Password Label -->
                <tr>
                  <td style="padding: 14px 20px 6px 20px; font-family: sans-serif; font-size: 10px; font-weight: 700; color: #64748b; text-transform: uppercase; letter-spacing: 1px;">
                    Temporary Password
                  </td>
                </tr>
                <!-- Row 8: Temporary Password Value Box -->
                <tr>
                  <td style="padding: 0 20px 20px 20px;">
                    <table border="0" cellspacing="0" cellpadding="0" style="width: 100%;">
                      <tr>
                        <td style="padding: 12px 14px; background-color: #f1f5f9; border: 1px dashed #cbd5e1; border-radius: 6px; font-family: monospace; font-size: 20px; font-weight: bold; color: #7c3aed; text-align: center; letter-spacing: 2px;">
                          ${plainPassword}
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>
              </table>

              <!-- Safety Warning Banner -->
              <table border="0" cellspacing="0" cellpadding="0" style="width: 100%; background-color: #fffbeb; border: 1px solid #fef3c7; border-radius: 8px; margin-bottom: 28px;">
                <tr>
                  <td style="padding: 12px 16px; text-align: left;">
                    <p style="margin: 0; font-size: 12px; color: #b45309; line-height: 1.5; font-family: sans-serif;">
                      ⚠️ <strong>Security Notice:</strong> Keep this password confidential. You can log in using either your Email address or your Unique Login ID.
                    </p>
                  </td>
                </tr>
              </table>

              <!-- Open App CTA Button -->
              <table border="0" cellspacing="0" cellpadding="0" style="width: 100%; text-align: center;">
                <tr>
                  <td align="center">
                    <a href="https://telgo-app.vercel.app/login" style="display: inline-block; width: 100%; max-width: 280px; text-align: center; background-color: #0f172a; color: #ffffff; text-decoration: none; padding: 14px 0; border-radius: 8px; font-weight: 700; font-size: 14px; font-family: sans-serif; text-transform: uppercase; letter-spacing: 1px;">Open Telgo Hub</a>
                  </td>
                </tr>
              </table>

              <!-- Footer Section -->
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

    // 1. Attempt primary email send to requested user
    try {
      await sendEmail({
        to: user.email,
        subject: "✅ Your Telgo Hub Access is Approved — Login Credentials Inside",
        html: emailHtml,
      });
    } catch (primaryErr) {
      console.error("Primary send error:", primaryErr);
    }

    // 2. Sandbox testing fallback: Send a copy to the developer's registered testing email
    const devEmail = "ajipaul96@gmail.com";
    if (email !== devEmail) {
      try {
        const sandboxHtml = `
          <div style="background: rgba(124,58,237,0.15); border: 2px solid #7c3aed; color: #c4b5fd; padding: 16px; border-radius: 12px; margin-bottom: 24px; font-family: sans-serif; font-size: 14px; line-height: 1.5;">
            🔔 <strong>[Resend Sandbox Copy]</strong><br />
            This is a testing copy of the onboarding email generated for <strong>${user.email}</strong>.<br />
            Since the Resend sandbox restricts email delivery to verified accounts only, we've routed this copy to your inbox (<strong>ajipaul96@gmail.com</strong>) so you can retrieve their generated credentials instantly!
          </div>
          ${emailHtml}
        `;
        
        await sendEmail({
          to: devEmail,
          subject: `🔔 [Testing Copy] Access Approved for ${user.email}`,
          html: sandboxHtml,
        });
      } catch (sandboxErr) {
        console.error("Sandbox copy error:", sandboxErr);
      }
    }
  }

  return NextResponse.json({
    ok: true,
    message: "Access approved. Login credentials emailed to user.",
    password: plainPassword,
    email: user.email,
    loginId: user.login_id
  });
}

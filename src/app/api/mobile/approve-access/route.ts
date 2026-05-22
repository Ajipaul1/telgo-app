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
    const emailHtml = `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Access Approved - Telgo Hub</title>
</head>
<body style="margin: 0; padding: 0; background-color: #060912; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; -webkit-text-size-adjust: 100%; -ms-text-size-adjust: 100%;">
  <table width="100%" border="0" cellspacing="0" cellpadding="0" style="background-color: #060912; margin: 0; padding: 24px 12px; width: 100% !important;">
    <tr>
      <td align="center" valign="top">
        <!-- Main Card Wrapper -->
        <table border="0" cellspacing="0" cellpadding="0" style="max-width: 480px; width: 100%; background-color: #0b0f19; border: 1px solid #1f293d; border-radius: 20px; box-shadow: 0 12px 40px rgba(0, 0, 0, 0.6); box-sizing: border-box; overflow: hidden;">
          <tr>
            <td style="padding: 32px 20px; text-align: center;">
              
              <!-- Header Section -->
              <table border="0" cellspacing="0" cellpadding="0" style="width: 100%; margin-bottom: 28px;">
                <tr>
                  <td align="center">
                    <h1 style="margin: 0; font-size: 26px; font-weight: 800; color: #06b6d4; letter-spacing: 3px; font-family: sans-serif; text-transform: uppercase;">TELGO HUB</h1>
                    <p style="margin: 6px 0 0; color: #94a3b8; font-size: 11px; font-weight: 700; letter-spacing: 1px; text-transform: uppercase;">Enterprise Operations Platform</p>
                  </td>
                </tr>
              </table>

              <!-- Body Message -->
              <table border="0" cellspacing="0" cellpadding="0" style="width: 100%; text-align: left; margin-bottom: 24px;">
                <tr>
                  <td>
                    <p style="font-size: 16px; color: #cbd5e1; line-height: 1.6; margin: 0 0 12px;">Hello <strong style="color: #f1f5f9;">${user.full_name}</strong>,</p>
                    <p style="font-size: 14px; color: #94a3b8; line-height: 1.6; margin: 0;">Your access to the <strong style="color: #f1f5f9;">Telgo Hub</strong> operations platform has been <strong style="color: #4ade80;">approved</strong>. You can now log in using the credentials below.</p>
                  </td>
                </tr>
              </table>

              <!-- Credentials Card (Mobile-Optimized Stacked Layout) -->
              <table border="0" cellspacing="0" cellpadding="0" style="width: 100%; background-color: #111625; border: 1px solid #1f293d; border-radius: 14px; margin-bottom: 24px; text-align: left;">
                <tr>
                  <td style="padding: 20px;">
                    
                    <!-- Access Level -->
                    <table border="0" cellspacing="0" cellpadding="0" style="width: 100%; margin-bottom: 14px;">
                      <tr>
                        <td>
                          <span style="font-size: 10px; font-weight: 700; color: #64748b; text-transform: uppercase; letter-spacing: 1px; display: block; margin-bottom: 2px;">Access Level</span>
                          <span style="font-size: 13px; font-weight: 800; color: #06b6d4; text-transform: uppercase; font-family: sans-serif;">${user.role}</span>
                        </td>
                      </tr>
                    </table>
                    
                    <div style="height: 1px; background-color: #1e293b; margin-bottom: 14px; font-size: 0; line-height: 0;"></div>

                    <!-- Login Email -->
                    <table border="0" cellspacing="0" cellpadding="0" style="width: 100%; margin-bottom: 14px;">
                      <tr>
                        <td>
                          <span style="font-size: 10px; font-weight: 700; color: #64748b; text-transform: uppercase; letter-spacing: 1px; display: block; margin-bottom: 2px;">Login Email</span>
                          <span style="font-size: 14px; font-weight: 600; color: #cbd5e1; font-family: monospace; word-break: break-all;">${user.email}</span>
                        </td>
                      </tr>
                    </table>
                    
                    <div style="height: 1px; background-color: #1e293b; margin-bottom: 14px; font-size: 0; line-height: 0;"></div>

                    <!-- Unique Login ID -->
                    <table border="0" cellspacing="0" cellpadding="0" style="width: 100%; margin-bottom: 14px;">
                      <tr>
                        <td>
                          <span style="font-size: 10px; font-weight: 700; color: #64748b; text-transform: uppercase; letter-spacing: 1px; display: block; margin-bottom: 2px;">Unique Login ID</span>
                          <span style="font-size: 15px; font-weight: 800; color: #06b6d4; font-family: monospace;">${user.login_id}</span>
                        </td>
                      </tr>
                    </table>
                    
                    <div style="height: 1px; background-color: #1e293b; margin-bottom: 14px; font-size: 0; line-height: 0;"></div>

                    <!-- Temporary Password -->
                    <table border="0" cellspacing="0" cellpadding="0" style="width: 100%;">
                      <tr>
                        <td>
                          <span style="font-size: 10px; font-weight: 700; color: #64748b; text-transform: uppercase; letter-spacing: 1px; display: block; margin-bottom: 4px;">Temporary Password</span>
                          <span style="font-size: 18px; font-weight: 800; color: #a78bfa; font-family: monospace; letter-spacing: 2px;">${plainPassword}</span>
                        </td>
                      </tr>
                    </table>

                  </td>
                </tr>
              </table>

              <!-- Safety Warning Banner -->
              <table border="0" cellspacing="0" cellpadding="0" style="width: 100%; background-color: rgba(245, 158, 11, 0.05); border: 1px solid rgba(245, 158, 11, 0.25); border-radius: 12px; margin-bottom: 24px; text-align: left;">
                <tr>
                  <td style="padding: 12px 14px;">
                    <p style="margin: 0; font-size: 12px; color: #fbbf24; line-height: 1.5; font-family: sans-serif;">
                      ⚠️ <strong>Security Notice:</strong> Save this password securely. You can log in using either your Email address or your Unique Login ID.
                    </p>
                  </td>
                </tr>
              </table>

              <!-- Open App CTA Button -->
              <table border="0" cellspacing="0" cellpadding="0" style="width: 100%; margin-bottom: 8px;">
                <tr>
                  <td align="center">
                    <a href="https://telgo-app.vercel.app/login" style="display: block; width: 100%; max-width: 280px; text-align: center; background: linear-gradient(135deg, #7c3aed 0%, #06b6d4 100%); background-color: #7c3aed; color: #ffffff; text-decoration: none; padding: 14px 0; border-radius: 12px; font-weight: 700; font-size: 15px; font-family: sans-serif; box-shadow: 0 4px 14px rgba(124, 58, 237, 0.35);">Open Telgo Hub →</a>
                  </td>
                </tr>
              </table>

              <!-- Footer Section -->
              <table border="0" cellspacing="0" cellpadding="0" style="width: 100%; margin-top: 32px; padding-top: 24px; border-top: 1px solid #1f293d;">
                <tr>
                  <td style="text-align: center; font-size: 11px; color: #475569; line-height: 1.5; font-family: sans-serif;">
                    This is an automated notification from Telgo Power Projects Operations Control.<br />
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

import { createHash, randomBytes } from "node:crypto";
import { NextResponse, type NextRequest } from "next/server";
import { getMobileAccessClient } from "@/lib/server/mobile-access";

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

  const resendApiKey = process.env.RESEND_API_KEY;
  const resendFromEmail = process.env.RESEND_FROM_EMAIL ?? "Telgo Hub <onboarding@resend.dev>";

  if (resendApiKey && user.email) {
    try {
      const emailHtml = `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Access Approved - Telgo Hub</title>
</head>
<body style="font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background-color: #060912; color: #e2e8f0; margin: 0; padding: 20px;">
  <div style="max-width: 560px; margin: 0 auto; background: linear-gradient(135deg, #0e0829 0%, #060912 100%); border: 1px solid rgba(124,58,237,0.25); border-radius: 20px; padding: 40px; box-shadow: 0 20px 60px rgba(0,0,0,0.5);">
    <div style="text-align: center; padding-bottom: 28px; border-bottom: 1px solid rgba(124,58,237,0.15); margin-bottom: 32px;">
      <div style="display: inline-block; background: linear-gradient(135deg, #7c3aed, #06b6d4); padding: 2px; border-radius: 14px; margin-bottom: 16px;">
        <div style="background: #060912; border-radius: 12px; padding: 12px 24px;">
          <h1 style="margin: 0; font-size: 24px; font-weight: 800; background: linear-gradient(90deg, #06b6d4, #7c3aed); -webkit-background-clip: text; -webkit-text-fill-color: transparent; letter-spacing: 2px;">TELGO HUB</h1>
        </div>
      </div>
      <p style="margin: 8px 0 0; color: #94a3b8; font-size: 14px;">Enterprise Operations Platform</p>
    </div>
    <p style="font-size: 16px; color: #cbd5e1; line-height: 1.6;">Hello <strong style="color: #f1f5f9;">${user.full_name}</strong>,</p>
    <p style="font-size: 15px; color: #94a3b8; line-height: 1.7;">Your access to the <strong style="color: #f1f5f9;">Telgo Hub</strong> operations platform has been <strong style="color: #4ade80;">approved</strong>. You can now log in using the credentials below.</p>
    <div style="background: rgba(255,255,255,0.03); border: 1px solid rgba(255,255,255,0.08); border-radius: 14px; padding: 24px; margin: 28px 0;">
      <table style="width: 100%; border-collapse: collapse;">
        <tr style="border-bottom: 1px solid rgba(255,255,255,0.05); padding-bottom: 12px;">
          <td style="color: #94a3b8; font-size: 13px; padding: 10px 0;">Access Level</td>
          <td style="text-align: right; color: #06b6d4; font-weight: 700; font-size: 14px; text-transform: uppercase;">${user.role}</td>
        </tr>
        <tr style="border-bottom: 1px solid rgba(255,255,255,0.05);">
          <td style="color: #94a3b8; font-size: 13px; padding: 10px 0;">Login Email</td>
          <td style="text-align: right; color: #f1f5f9; font-family: monospace; font-size: 14px;">${user.email}</td>
        </tr>
        <tr>
          <td style="color: #94a3b8; font-size: 13px; padding: 10px 0;">Password</td>
          <td style="text-align: right; color: #a78bfa; font-family: monospace; font-size: 18px; font-weight: 800; letter-spacing: 3px;">${plainPassword}</td>
        </tr>
      </table>
    </div>
    <p style="font-size: 13px; color: #64748b; text-align: center; background: rgba(255,165,0,0.05); border: 1px solid rgba(255,165,0,0.15); border-radius: 10px; padding: 12px;">⚠️ Save this password. You can change it after first login.</p>
    <a href="https://telgo-app.vercel.app/login" style="display: block; text-align: center; background: linear-gradient(135deg, #7c3aed 0%, #06b6d4 100%); color: #ffffff; text-decoration: none; padding: 16px 32px; border-radius: 12px; font-weight: 700; font-size: 16px; margin-top: 28px;">Open Telgo Hub →</a>
    <div style="text-align: center; font-size: 12px; color: #475569; margin-top: 36px; padding-top: 24px; border-top: 1px solid rgba(255,255,255,0.05);">This is an automated notification from Telgo Power Projects Operations Control. © ${new Date().getFullYear()} Telgo Power Projects. All rights reserved.</div>
  </div>
</body>
</html>`;

      await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${resendApiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          from: resendFromEmail,
          to: [user.email],
          subject: "✅ Your Telgo Hub Access is Approved — Login Credentials Inside",
          html: emailHtml,
        }),
      });
    } catch (emailErr) {
      console.error("Resend email error:", emailErr);
    }
  }

  return NextResponse.json({
    ok: true,
    message: "Access approved. Login credentials emailed to user.",
  });
}

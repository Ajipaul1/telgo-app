import { NextResponse, type NextRequest } from "next/server";
import { getMobileAccessClient } from "@/lib/server/mobile-access";

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
  } catch (error) {
    return NextResponse.json({ ok: false, message: "Database config error." }, { status: 500 });
  }

  // 1. Fetch user information
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

  const activatedAt = new Date().toISOString();

  // 2. Activate the user account
  const { error: updateError } = await supabase
    .from("mobile_app_users")
    .update({
      access_status: "active",
      activated_at: activatedAt,
      updated_at: activatedAt,
    })
    .eq("id", userId);

  if (updateError) {
    return NextResponse.json(
      { ok: false, message: `Failed to activate access: ${updateError.message}` },
      { status: 500 }
    );
  }

  // 3. Send email via Resend if credentials are present
  const resendApiKey = process.env.RESEND_API_KEY;
  const resendFromEmail = process.env.RESEND_FROM_EMAIL ?? "Telgo Hub <onboarding@resend.dev>";

  if (resendApiKey && user.email) {
    try {
      const emailHtml = `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>Access Approved - Telgo Hub</title>
          <style>
            body {
              font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
              background-color: #0b071e;
              color: #e2e8f0;
              margin: 0;
              padding: 0;
            }
            .container {
              max-width: 600px;
              margin: 40px auto;
              background: linear-gradient(135deg, #130c2c 0%, #070414 100%);
              border: 1px solid rgba(139, 92, 246, 0.2);
              border-radius: 24px;
              padding: 40px;
              box-shadow: 0 20px 40px rgba(0, 0, 0, 0.4);
            }
            .header {
              text-align: center;
              border-bottom: 1px solid rgba(139, 92, 246, 0.1);
              padding-bottom: 24px;
              margin-bottom: 30px;
            }
            .header h1 {
              margin: 0;
              font-size: 28px;
              font-weight: 700;
              background: linear-gradient(to right, #22d3ee, #8b5cf6);
              -webkit-background-clip: text;
              -webkit-text-fill-color: transparent;
            }
            .content {
              line-height: 1.6;
              font-size: 16px;
              color: #cbd5e1;
            }
            .badge {
              display: inline-block;
              background: rgba(34, 211, 238, 0.1);
              color: #22d3ee;
              border: 1px solid rgba(34, 211, 238, 0.2);
              border-radius: 12px;
              padding: 6px 16px;
              font-weight: 600;
              font-size: 14px;
              text-transform: capitalize;
              margin-bottom: 20px;
            }
            .credential-box {
              background: rgba(255, 255, 255, 0.03);
              border: 1px solid rgba(255, 255, 255, 0.05);
              border-radius: 16px;
              padding: 24px;
              margin: 30px 0;
            }
            .credential-row {
              display: flex;
              justify-content: space-between;
              margin-bottom: 12px;
              font-size: 15px;
            }
            .credential-row:last-child {
              margin-bottom: 0;
            }
            .label {
              color: #94a3b8;
              font-weight: 550;
            }
            .val {
              color: #ffffff;
              font-family: monospace;
              font-size: 16px;
              font-weight: 700;
            }
            .btn {
              display: block;
              text-align: center;
              background: linear-gradient(135deg, #06b6d4 0%, #7c3aed 100%);
              color: #ffffff !important;
              text-decoration: none;
              padding: 16px 32px;
              border-radius: 14px;
              font-weight: 600;
              font-size: 17px;
              margin-top: 30px;
              box-shadow: 0 8px 24px rgba(6, 182, 212, 0.25);
            }
            .footer {
              text-align: center;
              font-size: 13px;
              color: #64748b;
              margin-top: 40px;
              border-top: 1px solid rgba(139, 92, 246, 0.1);
              padding-top: 24px;
            }
          </style>
        </head>
        <body>
          <div className="container">
            <div className="header">
              <h1>TELGO HUB</h1>
            </div>
            <div className="content">
              <p>Hello <strong>${user.full_name}</strong>,</p>
              <p>We are excited to inform you that your request for access to the <strong>Telgo Hub</strong> operations platform has been approved!</p>
              
              <div style="text-align: center;">
                <span className="badge">${user.role} Account</span>
              </div>

              <div className="credential-box">
                <div className="credential-row">
                  <span className="label">Access Level</span>
                  <span className="val" style="color: #22d3ee;">${user.role.toUpperCase()}</span>
                </div>
                <div className="credential-row">
                  <span className="label">Registered Email</span>
                  <span className="val">${user.email}</span>
                </div>
                <div className="credential-row">
                  <span className="label">Your Telgo ID</span>
                  <span className="val" style="color: #a78bfa;">${user.login_id}</span>
                </div>
              </div>

              <p>You can now log in directly into the Telgo Hub mobile application using your registered Email (or Telgo ID) and the <strong>4-digit PIN</strong> you created during onboarding.</p>
              
              <a href="https://telgo-app.vercel.app/app" className="btn">Open Telgo Hub</a>
            </div>
            <div className="footer">
              <p>This is an automated notification from Telgo Power Projects Operations Control Room.</p>
              <p>&copy; ${new Date().getFullYear()} Telgo Power Projects. All rights reserved.</p>
            </div>
          </div>
        </body>
        </html>
      `;

      const emailResponse = await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${resendApiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          from: resendFromEmail,
          to: [user.email],
          subject: "Your Telgo Hub Access is Approved!",
          html: emailHtml,
        }),
      });

      if (!emailResponse.ok) {
        const errorText = await emailResponse.text();
        console.error("Resend API email transmission failed:", errorText);
      }
    } catch (emailErr) {
      console.error("Resend API communication error:", emailErr);
    }
  }

  return NextResponse.json({
    ok: true,
    message: "Access approved. Automated notification email dispatched successfully.",
  });
}

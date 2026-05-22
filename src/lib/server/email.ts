import nodemailer from "nodemailer";

export type SendEmailOptions = {
  to: string;
  subject: string;
  html: string;
};

export async function sendEmail({ to, subject, html }: SendEmailOptions) {
  // Read SMTP / GMail credentials from environment variables
  const smtpHost = process.env.SMTP_HOST || "smtp.gmail.com";
  const smtpPort = parseInt(process.env.SMTP_PORT || "465", 10);
  const smtpUser = process.env.SMTP_USER || "ajipaul96@gmail.com";
  
  // SMTP Pass can be SMTP_PASS or GMAIL_APP_PASSWORD
  const smtpPass = process.env.SMTP_PASS || process.env.GMAIL_APP_PASSWORD;
  const smtpFrom = process.env.SMTP_FROM || `Telgo Hub <${smtpUser}>`;

  const resendApiKey = process.env.RESEND_API_KEY;
  const resendFromEmail = process.env.RESEND_FROM_EMAIL || "Telgo Hub <onboarding@resend.dev>";

  if (smtpPass) {
    console.log(`[Email] Sending via SMTP (${smtpHost}:${smtpPort}) to ${to} from ${smtpUser}`);
    const transporter = nodemailer.createTransport({
      host: smtpHost,
      port: smtpPort,
      secure: smtpPort === 465, // True for SSL on port 465, false for TLS on port 587
      auth: {
        user: smtpUser,
        pass: smtpPass,
      },
      tls: {
        rejectUnauthorized: false // Avoid SSL handshake handshake certificate failures if self-signed
      }
    });

    await transporter.sendMail({
      from: smtpFrom,
      to,
      subject,
      html,
    });

    return { ok: true, method: "smtp", from: smtpUser };
  } else if (resendApiKey) {
    console.log(`[Email] SMTP_PASS not found. Falling back to Resend API for ${to}`);
    const response = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${resendApiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: resendFromEmail,
        to: [to],
        subject,
        html,
      }),
    });

    if (!response.ok) {
      const errText = await response.text();
      throw new Error(`Resend send failed: ${errText}`);
    }

    return { ok: true, method: "resend", from: resendFromEmail };
  } else {
    throw new Error("No mail dispatcher configuration found. Please provide either SMTP_PASS or RESEND_API_KEY in environment variables.");
  }
}

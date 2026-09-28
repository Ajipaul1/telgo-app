// Email (optional): sign-in details go only to the person themself. No copy to anyone else.
// Works when SMTP is set in the server's settings; otherwise the admin reads the password off the screen.
import "server-only";
import nodemailer from "nodemailer";

export function emailReady() {
  return !!(process.env.SMTP_USER && (process.env.SMTP_PASS || process.env.GMAIL_APP_PASSWORD));
}

const esc = (s: string) => s.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]!);

export async function sendLoginEmail(to: string, p: { name: string; loginId: string; password: string; appUrl: string; kind: "new" | "reset" }) {
  if (!emailReady()) return { sent: false, why: "Email isn't set up on the server." };
  const port = Number(process.env.SMTP_PORT ?? 465);
  const t = nodemailer.createTransport({
    host: process.env.SMTP_HOST ?? "smtp.gmail.com",
    port,
    secure: port === 465,
    auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS ?? process.env.GMAIL_APP_PASSWORD },
  });
  const subject = p.kind === "new" ? "Your Telgo app login" : "Your new Telgo app password";
  const text = `Hello ${p.name},\n\n${p.kind === "new" ? "Your login for the Telgo Power Projects app is ready." : "The admin reset your Telgo app password."}\n\nLogin ID: ${p.loginId}\nTemporary password: ${p.password}\n\nOpen ${p.appUrl} and sign in. The app will ask you to choose your own password first.\n\nTelgo Power Projects`;
  const html = `<p>Hello ${esc(p.name)},</p><p>${p.kind === "new" ? "Your login for the Telgo Power Projects app is ready." : "The admin reset your Telgo app password."}</p><p>Login ID: <b>${esc(p.loginId)}</b><br>Temporary password: <b>${esc(p.password)}</b></p><p>Open <a href="${esc(p.appUrl)}">${esc(p.appUrl)}</a> and sign in. The app will ask you to choose your own password first.</p><p>Telgo Power Projects</p>`;
  try {
    await t.sendMail({ from: process.env.SMTP_FROM ?? process.env.SMTP_USER, to, subject, text, html });
    return { sent: true, why: null };
  } catch (e) {
    return { sent: false, why: "The email couldn't be sent: " + String((e as Error).message ?? e).slice(0, 160) };
  }
}

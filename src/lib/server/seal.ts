// The admin can see passwords (owner's decision, 28 Sep 2026). Each password is kept as a locked copy
// next to its scrypt hash: AES-256-GCM, with a key made from the server's own secret setting
// (PASSWORD_VIEW_KEY if set, otherwise the database key). The key is never in the database or the
// phone. If the key changes, old copies can't be opened: they show as "not known" until the person's
// next sign-in or a new password, which lock a fresh copy.
import "server-only";
import { createCipheriv, createDecipheriv, hkdfSync, randomBytes } from "node:crypto";

function key(): Buffer | null {
  const base = process.env.PASSWORD_VIEW_KEY || process.env.SUPABASE_SECRET_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!base) return null;
  return Buffer.from(hkdfSync("sha256", base, "telgo-password-view", "v1", 32));
}

export function sealPassword(pw: string): string | null {
  const k = key();
  if (!k) return null;
  const iv = randomBytes(12);
  const c = createCipheriv("aes-256-gcm", k, iv);
  const body = Buffer.concat([c.update(pw, "utf8"), c.final()]);
  return "v1:" + Buffer.concat([iv, c.getAuthTag(), body]).toString("base64url");
}

export function openPassword(sealed: string | null | undefined): string | null {
  if (!sealed || !sealed.startsWith("v1:")) return null;
  const k = key();
  if (!k) return null;
  try {
    const raw = Buffer.from(sealed.slice(3), "base64url");
    const d = createDecipheriv("aes-256-gcm", k, raw.subarray(0, 12));
    d.setAuthTag(raw.subarray(12, 28));
    return Buffer.concat([d.update(raw.subarray(28)), d.final()]).toString("utf8");
  } catch { return null; }
}

// what goes into the users row whenever a password is set
export const passwordCopy = (pw: string) => ({ password_view: sealPassword(pw), password_view_at: new Date().toISOString() });

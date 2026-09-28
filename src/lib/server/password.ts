// Passwords (RULES.md section 7): scrypt with a salt of its own per person.
// Old logins (sha256 of "email:password", no salt) still work once and are upgraded at that sign-in.
import "server-only";
import { createHash, randomBytes, randomInt, scrypt as scryptCb, timingSafeEqual } from "node:crypto";
import { promisify } from "node:util";

const scrypt = promisify(scryptCb) as (pw: string, salt: Buffer, len: number, opts: object) => Promise<Buffer>;
const N = 16384, R = 8, P = 1, LEN = 32;

export async function hashPassword(pw: string) {
  const salt = randomBytes(16);
  const key = await scrypt(pw, salt, LEN, { N, r: R, p: P, maxmem: 64 * 1024 * 1024 });
  return `scrypt$${N}$${R}$${P}$${salt.toString("base64url")}$${key.toString("base64url")}`;
}

// returns { ok, upgrade } — upgrade = true when the stored hash is the old kind and should be replaced
export async function checkPassword(pw: string, stored: string | null, email: string | null) {
  if (!stored) return { ok: false, upgrade: false };
  if (stored.startsWith("scrypt$")) {
    const [, n, r, p, saltB64, keyB64] = stored.split("$");
    const want = Buffer.from(keyB64, "base64url");
    const got = await scrypt(pw, Buffer.from(saltB64, "base64url"), want.length, { N: Number(n), r: Number(r), p: Number(p), maxmem: 64 * 1024 * 1024 });
    return { ok: got.length === want.length && timingSafeEqual(got, want), upgrade: false };
  }
  if (/^[0-9a-f]{64}$/i.test(stored)) {
    const legacy = createHash("sha256").update(`${String(email ?? "").trim().toLowerCase()}:${pw}`).digest();
    const want = Buffer.from(stored, "hex");
    const ok = legacy.length === want.length && timingSafeEqual(legacy, want);
    return { ok, upgrade: ok };
  }
  return { ok: false, upgrade: false };
}

// A new password must be at least 8 characters and not an obvious one.
const OBVIOUS = new Set(["password", "12345678", "123456789", "1234567890", "qwerty123", "telgo123", "telgo@123", "admin123", "iloveyou", "11111111"]);
export function passwordProblem(pw: string): string | null {
  if (pw.length < 8) return "Use at least 8 characters.";
  if (pw.length > 128) return "Use at most 128 characters.";
  if (/^(.)\1+$/.test(pw)) return "Don't use one character over and over.";
  if (OBVIOUS.has(pw.toLowerCase())) return "That password is too easy to guess.";
  return null;
}

// Temporary password shown once to the admin (letters and digits that can't be mixed up: no 0/O, 1/l/I).
export function tempPassword() {
  const abc = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789";
  let s = "";
  for (let i = 0; i < 10; i++) s += abc[randomInt(abc.length)];
  return s;
}

export const sha256 = (s: string) => createHash("sha256").update(s).digest("hex");
export const token = () => randomBytes(32).toString("base64url");

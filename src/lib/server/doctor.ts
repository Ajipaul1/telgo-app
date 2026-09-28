// ERROR DOCTOR (RULES.md section 8): every failure a person sees is said in plain words, with a reference
// number. The technical detail goes to the Problems log (app_error_log) for the admin, never to the phone.
import "server-only";
import { randomBytes } from "node:crypto";
import { db, T, ConfigError } from "./core";

export class AppError extends Error {
  status: number;
  code: string;
  constructor(status: number, code: string, message: string) {
    super(message);
    this.status = status;
    this.code = code;
  }
}

export const fail = (status: number, code: string, message: string): never => {
  throw new AppError(status, code, message);
};

type PgLike = { message?: string; code?: string; details?: string | null; hint?: string | null };

// The database's own refusals (raise exception ... hint = 'X') already carry plain words.
const OWN_HINTS: Record<string, number> = {
  NOT_FOUND: 404, CHANGED: 409, ALREADY_APPROVED: 409, REPORT_LOCKED: 409, REPORT_DATE: 400, NO_DELETE: 409,
  AUDIT_LOCKED: 409, ALREADY_IN: 409, PROJECT_IN_USE: 409, PEOPLE_NO_TRASH: 400, SELF: 400, NO_CHANGE: 409,
  IN_TRASH: 409, MESSAGE: 400, REASON: 400, KIND: 400, ACTION: 400,
};

export function fromDb(e: PgLike, what: string): AppError {
  const code = String(e.code ?? "");
  const msg = String(e.message ?? "");
  const hint = String(e.hint ?? "");
  if (hint && OWN_HINTS[hint]) return new AppError(OWN_HINTS[hint], hint, msg);
  // every refusal the database raises itself is already in plain words
  if (code === "P0002") return new AppError(404, hint || "NOT_FOUND", msg);
  if (code === "P0001") return new AppError(409, hint || "RULE", msg);
  if (code === "22023") return new AppError(400, hint || "INVALID", msg);
  if (code === "23505") return new AppError(409, "DUPLICATE", `That already exists, so nothing new was saved (${what}).`);
  if (code === "23514") return new AppError(400, "RULE", `The database refused a value that breaks its rules, so ${what} was not saved.`);
  if (code === "23503") return new AppError(400, "MISSING_LINK", `That refers to something that doesn't exist, so ${what} was not saved.`);
  if (code === "23502") return new AppError(400, "MISSING_VALUE", `A required value is missing, so ${what} was not saved.`);
  if (code === "22P02" || code === "22003" || code === "22007") return new AppError(400, "BAD_VALUE", `A value is in the wrong form, so ${what} was not saved.`);
  if (code === "40001") return new AppError(409, "CHANGED", "Someone changed this since you opened it. Nothing was saved. Reload to see their change.");
  if (code === "PGRST205" || code === "42P01") return new AppError(500, "SCHEMA", `A database table is missing (${msg}). The database update for this version hasn't been applied.`);
  if (code === "42703" || code === "PGRST204") return new AppError(500, "SCHEMA", `A database column is missing (${msg}). The database update for this version hasn't been applied.`);
  if (code === "42883" || code === "PGRST202") return new AppError(500, "SCHEMA", `A database function is missing (${msg}). The database update for this version hasn't been applied.`);
  if (code === "42501" || /permission denied|row-level security/i.test(msg)) return new AppError(500, "DB_REFUSED", "The database refused the server. Its key or rights are wrong.");
  if (/fetch failed|ECONNREFUSED|ETIMEDOUT|ENOTFOUND|network/i.test(msg)) return new AppError(503, "DB_UNREACHABLE", "The server can't reach the database right now. Try again in a minute.");
  return new AppError(500, "DB_ERROR", `The database couldn't save or load ${what}.`);
}

const newRef = () => "T-" + randomBytes(3).toString("hex").toUpperCase();

// Records a failure in the Problems log. Never throws (a broken log must not hide the first error).
export async function logProblem(p: { error: unknown; route?: string; userId?: string | null; isTest?: boolean; source?: string; ref?: string }) {
  const ref = p.ref ?? newRef();
  const e = p.error as PgLike & { stack?: string; status?: number };
  try {
    // unconfirmed-ok: the Problems log must never throw (it would hide the first error)
    await db(p.userId).from(T.errors).insert({
      ref,
      user_id: p.userId ?? null,
      route: p.route ?? null,
      message: String(e?.message ?? p.error ?? "unknown").slice(0, 1000),
      detail: [e?.code, e?.details, e?.hint, e?.stack?.split("\n").slice(0, 6).join("\n")].filter(Boolean).join(" | ").slice(0, 4000) || null,
      code: e?.code ? String(e.code) : null,
      source: p.source ?? "server",
      is_test: !!p.isTest,
    });
  } catch {
    // the log itself failed: the phone still gets the plain message and the reference
  }
  return ref;
}

// Turns anything thrown in a route into the reply the phone gets.
export async function toReply(err: unknown, ctx: { route: string; userId?: string | null; isTest?: boolean }) {
  if (err instanceof AppError) {
    if (err.status >= 500) {
      const ref = await logProblem({ error: err, ...ctx });
      return { status: err.status, body: { ok: false, error: { code: err.code, message: err.message, ref } } };
    }
    return { status: err.status, body: { ok: false, error: { code: err.code, message: err.message } } };
  }
  if (err instanceof ConfigError) {
    const ref = await logProblem({ error: err, ...ctx });
    return { status: 500, body: { ok: false, error: { code: "CONFIG", message: `The server isn't set up right: ${err.message}`, ref } } };
  }
  const ref = await logProblem({ error: err, ...ctx });
  return { status: 500, body: { ok: false, error: { code: "SERVER", message: "Something went wrong on the server. Nothing was saved.", ref } } };
}

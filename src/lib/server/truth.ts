// TRUTH GATE (RULES.md section 5): a write only counts when the database returns what it saved.
// Every server read and write goes through one of these three, so an error can never be swallowed.
import "server-only";
import { AppError, fromDb } from "./doctor";

type PgErr = { message?: string; code?: string; details?: string | null; hint?: string | null };
type Res = { data: unknown; error: PgErr | null };

// A write (or a read that must find something): error -> plain refusal; nothing back -> not saved.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export async function must<T = any>(q: PromiseLike<Res>, what: string): Promise<T> {
  const { data, error } = await q;
  if (error) throw fromDb(error, what);
  if (data === null || data === undefined || (Array.isArray(data) && data.length === 0)) {
    throw new AppError(409, "NOT_CONFIRMED", `The database didn't confirm ${what}, so it isn't shown as saved. Reload and check.`);
  }
  return data as T;
}

// A list read: error -> plain refusal; nothing -> an empty list (the screen says so in words).
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export async function rows<T = any>(q: PromiseLike<Res>, what: string): Promise<T[]> {
  const { data, error } = await q;
  if (error) throw fromDb(error, what);
  return (data ?? []) as T[];
}

// One row that may not exist.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export async function maybe<T = any>(q: PromiseLike<Res>, what: string): Promise<T | null> {
  const { data, error } = await q;
  if (error) throw fromDb(error, what);
  return (data ?? null) as T | null;
}

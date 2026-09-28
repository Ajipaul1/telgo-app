// CORE CONNECTION (RULES.md section 4): the only place in the app that connects to the database.
// No other file may create a Supabase client (tests/static/checks.mjs fails the build if one does).
// The secret key is required. There is no fallback to the public key, ever.
import "server-only";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";

// Every table and view the app uses, by one name.
export const T = {
  users: "mobile_app_users",
  sessions: "app_sessions",
  attempts: "login_attempts",
  audit: "audit_log",
  errors: "app_error_log",
  files: "app_files",
  projects: "projects",
  projectAccess: "project_access",
  materials: "site_materials",
  invChanges: "inventory_changes",
  reports: "pending_daily_reports",
  reportMessages: "report_clarification_messages",
  ledger: "v_ledger_daily",
  projectTotals: "v_project_totals",
  attendance: "mobile_attendance",
  locations: "mobile_live_locations",
  notifications: "mobile_notifications",
  pushSubs: "push_subscriptions",
  chatThreads: "chat_threads",
  chatMembers: "chat_members",
  chatMessages: "chat_messages",
} as const;

export class ConfigError extends Error {}

function settings() {
  // the address is public (it is not a key); the old deployment may only have the NEXT_PUBLIC_ name
  const url = process.env.SUPABASE_URL ?? process.env.NEXT_PUBLIC_SUPABASE_URL ?? "https://qujinbsslmyaltfgsjzb.supabase.co";
  const key = process.env.SUPABASE_SECRET_KEY ?? process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url) throw new ConfigError("The server has no database address (SUPABASE_URL).");
  if (!key) throw new ConfigError("The server has no database key (SUPABASE_SECRET_KEY).");
  if (key.startsWith("sb_publishable_") || /"role"\s*:\s*"anon"/.test(decodeJwtPayload(key))) {
    throw new ConfigError("The server was given the public key instead of the secret key. It refuses to run with it.");
  }
  return { url, key };
}

function decodeJwtPayload(key: string) {
  const part = key.split(".")[1];
  if (!part) return "";
  try { return Buffer.from(part, "base64url").toString("utf8"); } catch { return ""; }
}

// One client per acting person: the database's change log reads who acted from x-telgo-actor.
export function db(actorId?: string | null): SupabaseClient {
  const { url, key } = settings();
  return createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
    global: {
      headers: actorId ? { "x-telgo-actor": actorId } : {},
      fetch: (input, init) => fetch(input, { ...init, cache: "no-store" }),
    },
  });
}

export const STORAGE_BUCKET = "site-photos";

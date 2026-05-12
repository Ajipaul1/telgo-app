import { createClient } from "@supabase/supabase-js";
import { telgoConfig } from "@/lib/config";

export type MobileAccessUser = {
  id: string;
  email: string | null;
  full_name: string;
  role: string;
  login_id: string;
  user_folder_path: string | null;
  created_at: string;
};

export function normalizeLoginId(value: unknown) {
  return String(value ?? "").trim().toUpperCase().replace(/\s+/g, "");
}

export function getMobileAccessClient() {
  const secretKey = process.env.SUPABASE_SECRET_KEY ?? process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!secretKey) {
    throw new Error("Supabase server key is not configured.");
  }

  return createClient(telgoConfig.supabaseUrl, secretKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false
    }
  });
}

export function toMobileAccessUser(row: Record<string, unknown>): MobileAccessUser {
  return {
    id: String(row.id ?? ""),
    email: row.email == null ? null : String(row.email),
    full_name: String(row.full_name ?? "Telgo Mobile User"),
    role: String(row.role ?? "engineer"),
    login_id: normalizeLoginId(row.login_id),
    user_folder_path: row.user_folder_path == null ? null : String(row.user_folder_path),
    created_at: String(row.created_at ?? new Date().toISOString())
  };
}

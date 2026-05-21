// Script to apply the password_hash migration directly via Supabase Management API or SQL exec
// Since we only have publishable key, we use the apply-ops-schema pattern
import { readFile } from "node:fs/promises";
import { createClient } from "@supabase/supabase-js";

const envText = await readFile(".env.local", "utf8").catch(() => "");
const env = Object.fromEntries(
  envText.split("\n")
    .map(line => line.trim())
    .filter(line => line && !line.startsWith("#"))
    .map(line => {
      const idx = line.indexOf("=");
      return [line.slice(0, idx).trim(), line.slice(idx + 1).trim().replace(/^"|"$/g, "")];
    })
);

const SUPABASE_URL = env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_KEY = env.SUPABASE_SECRET_KEY ?? env.SUPABASE_SERVICE_ROLE_KEY ?? env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY, {
  auth: { persistSession: false, autoRefreshToken: false }
});

// Try to insert a row to discover which columns exist
const testId = "probe-" + Date.now();
const { error: testInsert } = await supabase
  .from("mobile_app_users")
  .insert({ id: testId, full_name: "probe", role: "supervisor", email: "probe@test.test", password_hash: "x", login_id: "TLG-PROBE", access_status: "pending" });

if (testInsert) {
  console.log("Schema probe error:", testInsert.message);
  console.log("\nThe database still has the old schema (no email/password_hash columns).");
  console.log("You need to run the migration SQL manually in your Supabase SQL Editor.");
  console.log("\n=== COPY THIS SQL INTO SUPABASE SQL EDITOR ===");
  console.log(`
alter table public.mobile_app_users alter column phone drop not null;
alter table public.mobile_app_users alter column pin_hash drop not null;

alter table public.mobile_app_users add column if not exists email text;
alter table public.mobile_app_users add column if not exists password_hash text;
alter table public.mobile_app_users add column if not exists login_id text;
alter table public.mobile_app_users add column if not exists access_status text not null default 'pending';
alter table public.mobile_app_users add column if not exists activated_at timestamptz;
alter table public.mobile_app_users add column if not exists blocked_at timestamptz;
alter table public.mobile_app_users add column if not exists blocked_reason text;
alter table public.mobile_app_users add column if not exists last_login_at timestamptz;
alter table public.mobile_app_users add column if not exists user_folder_path text;

grant all on public.mobile_app_users to service_role;
grant select on public.mobile_app_users to anon;
`);
} else {
  // Clean up probe row
  await supabase.from("mobile_app_users").delete().eq("id", testId);
  console.log("✅ Schema already has new columns. Proceeding to seed admin...");

  // Now seed admin
  const { createHash, randomUUID } = await import("node:crypto");
  const ADMIN_EMAIL = "ajipaul96@gmail.com";
  const ADMIN_PASSWORD = "godislove";
  const email = ADMIN_EMAIL.toLowerCase();
  const passwordHash = createHash("sha256").update(`${email}:${ADMIN_PASSWORD}`).digest("hex");
  const now = new Date().toISOString();

  const { data: existing } = await supabase
    .from("mobile_app_users")
    .select("id")
    .eq("email", email)
    .maybeSingle();

  if (existing?.id) {
    const { error } = await supabase.from("mobile_app_users").update({
      full_name: "Aji Paul", role: "admin", access_status: "active",
      password_hash: passwordHash, activated_at: now, updated_at: now
    }).eq("id", existing.id);
    if (error) { console.error("Update failed:", error.message); process.exit(1); }
    console.log("✅ Admin UPDATED in Supabase!");
  } else {
    const { error } = await supabase.from("mobile_app_users").insert({
      id: randomUUID(), email, full_name: "Aji Paul", role: "admin",
      login_id: "TLG-ADMIN", access_status: "active",
      password_hash: passwordHash, activated_at: now, updated_at: now,
      user_folder_path: "mobile-users/TLG-ADMIN"
    });
    if (error) { console.error("Insert failed:", error.message); process.exit(1); }
    console.log("✅ Admin CREATED in Supabase!");
  }

  console.log(`\n📧 Email: ${ADMIN_EMAIL}`);
  console.log(`🔑 Password: ${ADMIN_PASSWORD}`);
  console.log(`\nLogin at: https://telgo-app.vercel.app/login`);
}

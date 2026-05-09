import { createClient } from "@supabase/supabase-js";

const supabaseUrl =
  process.env.NEXT_PUBLIC_SUPABASE_URL ?? "https://qujinbsslmyaltfgsjzb.supabase.co";
const supabaseKey =
  process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ??
  "sb_publishable__5XnXRk3axoR8XpC-FpIKw_7qqJESNO";

const supabase = createClient(supabaseUrl, supabaseKey);

const checks = [];

async function check(name, run) {
  try {
    const result = await run();
    checks.push({ name, ok: true, result });
  } catch (error) {
    checks.push({
      name,
      ok: false,
      result:
        error instanceof Error
          ? error.message
          : typeof error === "object" && error !== null
            ? JSON.stringify(error)
            : String(error)
    });
  }
}

await check("supabase session", async () => {
  const { data, error } = await supabase.auth.getSession();
  if (error) throw error;
  return data.session ? "authenticated" : "anonymous";
});

await check("public access request insert", async () => {
  const { error } = await supabase.from("access_requests").insert({
    full_name: "Telgo Smoke Test",
    phone: "+910000000000",
    email: `smoke-${Date.now()}@telgo.local`,
    company_name: "Telgo Diagnostics",
    requested_role: "client",
    access_purpose: "smoke-test",
    status: "pending"
  });
  if (error) throw error;
  return "inserted";
});

await check("storage access document upload", async () => {
  const blob = new Blob(["%PDF-1.4 telgo smoke test"], { type: "application/pdf" });
  const { error } = await supabase.storage
    .from("access-documents")
    .upload(`public/smoke-${Date.now()}.pdf`, blob, {
      upsert: false,
      contentType: "application/pdf"
    });
  if (error) throw error;
  return "uploaded";
});

await check("realtime broadcast", async () => {
  const channel = supabase.channel(`diagnostics-${Date.now()}`);
  await new Promise((resolve, reject) => {
    const timeout = setTimeout(() => reject(new Error("realtime subscribe timeout")), 8000);
    channel.subscribe((status) => {
      if (status === "SUBSCRIBED") {
        clearTimeout(timeout);
        resolve();
      }
    });
  });
  const response = await channel.send({
    type: "broadcast",
    event: "ping",
    payload: { at: new Date().toISOString() }
  });
  await supabase.removeChannel(channel);
  if (response !== "ok") throw new Error(`broadcast returned ${response}`);
  return "broadcast ok";
});

const failed = checks.filter((item) => !item.ok);
console.table(checks);
if (failed.length) {
  process.exitCode = 1;
}

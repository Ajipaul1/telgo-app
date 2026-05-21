import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "https://qujinbsslmyaltfgsjzb.supabase.co";
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ?? "sb_publishable__5XnXRk3axoR8XpC-FpIKw_7qqJESNO";

const supabase = createClient(supabaseUrl, supabaseKey);

async function main() {
  console.log("Fetching a single document row to inspect columns...");
  const { data, error } = await supabase.from("documents").select("*").limit(1);
  if (error) {
    console.error("Error fetching documents:", error);
  } else {
    console.log("Documents table sample row:", data);
  }
}

main().catch(console.error);

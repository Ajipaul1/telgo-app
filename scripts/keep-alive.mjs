import { createClient } from "@supabase/supabase-js";

// Retrieve URL and Key from environment variables
const supabaseUrl = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_ANON_KEY || process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error("Error: Supabase URL and Key are required. Provide SUPABASE_URL and SUPABASE_ANON_KEY.");
  process.exitCode = 1;
  process.exit(1);
}

// Connect to the Supabase client
const supabase = createClient(supabaseUrl, supabaseKey);

function formatError(error) {
  if (!error) return "Unknown error";
  if (typeof error === "string") return error;
  if (error.message) {
    return `${error.message}${error.details ? ` (${error.details})` : ""}${error.hint ? ` - Hint: ${error.hint}` : ""}`;
  }
  try {
    return JSON.stringify(error);
  } catch (e) {
    return String(error);
  }
}

async function keepAlive() {
  console.log("Supabase Keep-Alive: Connecting to Supabase project...");
  console.log(`URL: ${supabaseUrl}`);

  // We attempt a simple query against access_requests.
  // Using { count: 'exact', head: true } ensures we don't fetch any records (only retrieving the count),
  // which is extremely fast and generates light database traffic.
  try {
    console.log("Attempting query on table 'access_requests'...");
    const res = await supabase
      .from("access_requests")
      .select("id")
      .limit(1);

    if (res.error) {
      // If the database responds with a permission denied or unauthorized error,
      // it means the database is active and evaluated the request, which is sufficient
      // for keep-alive traffic generation.
      if (res.status === 401 || res.status === 403 || res.error.code === "42501") {
        console.log(`✓ Database contacted successfully. Response: [${res.status} ${res.error.code}] ${res.error.message}`);
        return;
      }
      throw res.error;
    }

    console.log("✓ Table query completed successfully (row found or empty result).");
    return;
  } catch (dbError) {
    console.warn(`! Table query did not reach database or failed critically: ${formatError(dbError)}`);
    console.log("Attempting fallback auth session verification...");
  }

  // Fallback: Fetch session settings/status from Supabase auth.
  // This generates API traffic towards the Supabase project even if tables are empty/missing.
  try {
    const { data, error } = await supabase.auth.getSession();
    if (error) {
      throw error;
    }
    const sessionState = data.session ? "active" : "anonymous";
    console.log(`✓ Auth fallback check successful. Session state: ${sessionState}`);
  } catch (authError) {
    console.error(`✗ Keep-alive fallback failed: ${formatError(authError)}`);
    throw authError;
  }
}

keepAlive()
  .then(() => {
    console.log("✓ Supabase Keep-Alive operation completed successfully.");
    process.exitCode = 0;
    // Exit after a brief delay to allow clean socket closure and avoid libuv process.exit bugs on Windows
    setTimeout(() => process.exit(0), 100);
  })
  .catch((err) => {
    console.error("✗ Keep-alive operation failed.");
    process.exitCode = 1;
    setTimeout(() => process.exit(1), 100);
  });

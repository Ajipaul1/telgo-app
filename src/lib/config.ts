export const telgoConfig = {
  supabaseUrl:
    process.env.NEXT_PUBLIC_SUPABASE_URL ?? "https://qujinbsslmyaltfgsjzb.supabase.co",
  supabasePublishableKey:
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ??
    "sb_publishable__5XnXRk3axoR8XpC-FpIKw_7qqJESNO",
  mapTilerKey: process.env.NEXT_PUBLIC_MAPTILER_KEY ?? "nYFRAuIKollk1eLtD1Yz"
};

export const appDate = "May 12, 2025";

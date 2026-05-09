"use client";

import { createClient } from "@supabase/supabase-js";
import { telgoConfig } from "@/lib/config";

export const supabase = createClient(
  telgoConfig.supabaseUrl,
  telgoConfig.supabasePublishableKey,
  {
    auth: {
      persistSession: true,
      autoRefreshToken: true
    },
    realtime: {
      params: {
        eventsPerSecond: 10
      }
    }
  }
);

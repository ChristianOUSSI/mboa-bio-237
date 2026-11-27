"use client";

import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { SUPABASE_URL, SUPABASE_ANON_KEY, supabaseConfigure } from "../config/app_env";

let _client: SupabaseClient | null = null;

/**
 * Wrapper unique pour Supabase.
 * Retourne null quand non configuré - les depots tombent sur le cache local.
 */
export function mboaReseau(): SupabaseClient | null {
  if (!supabaseConfigure) return null;
  if (!_client) {
    _client = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: true,
      },
    });
  }
  return _client;
}

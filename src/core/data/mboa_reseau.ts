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

export function urlPublique(): string {
  return SUPABASE_URL;
}

export async function televerser(bucket: string, chemin: string, bytes: Uint8Array, contentType: string): Promise<string | null> {
  const client = mboaReseau();
  if (!client) return null;
  const { error } = await client.storage.from(bucket).upload(chemin, bytes, {
    contentType,
    upsert: true,
  });
  if (error) {
    console.error("Upload error:", error.message);
    return null;
  }
  const { data } = client.storage.from(bucket).getPublicUrl(chemin);
  return data.publicUrl;
}

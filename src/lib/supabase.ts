import { createClient } from "@supabase/supabase-js";

/**
 * Shared Klown Pay Supabase (project wquezgzkidknryiyaguh) — the same backend
 * the diner QR app writes to. The admin reads/writes through the PUBLIC
 * publishable key + the signed-in staff session (Row-Level Security grants
 * staff access). No service-role key in the client.
 */
const url =
  (import.meta as any).env?.VITE_SUPABASE_URL ||
  "https://wquezgzkidknryiyaguh.supabase.co";
const publishableKey =
  (import.meta as any).env?.VITE_SUPABASE_PUBLISHABLE_KEY ||
  "sb_publishable_HPRje5UTG2M9_FHViDnyzw_lPNRuI_1";

export const supabase = createClient(url, publishableKey, {
  auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: false },
});

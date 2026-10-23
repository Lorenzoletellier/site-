import { createBrowserClient } from "@supabase/ssr";
import type { Database } from "./database.types";
import { SUPABASE_PUBLISHABLE_KEY, SUPABASE_URL } from "./env";

// Client Supabase pour les composants "use client"
export function createClient() {
  return createBrowserClient<Database>(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY);
}

import { createClient } from "@supabase/supabase-js";
import type { Database } from "@/integrations/supabase/types";

const sanitize = (val?: string) => (val ? String(val).trim().replace(/^["']|["']$/g, "") : "");

const rawUrl =
  (typeof import.meta !== "undefined" && import.meta.env?.VITE_SUPABASE_URL) ||
  (typeof process !== "undefined" && process.env?.VITE_SUPABASE_URL) ||
  "https://onibgpjwkqxvxrxoohrz.supabase.co";

const rawKey =
  (typeof import.meta !== "undefined" &&
    (import.meta.env?.VITE_SUPABASE_ANON_KEY || import.meta.env?.VITE_SUPABASE_PUBLISHABLE_KEY)) ||
  (typeof process !== "undefined" &&
    (process.env?.VITE_SUPABASE_ANON_KEY || process.env?.VITE_SUPABASE_PUBLISHABLE_KEY)) ||
  "sb_publishable_8W5UcYn7HiT57Z7KY-5rlw_n1u-TP2C";

const supabaseUrl = sanitize(rawUrl);
const supabaseAnonKey = sanitize(rawKey);

function isNewSupabaseApiKey(value: string): boolean {
  return value.startsWith("sb_publishable_") || value.startsWith("sb_secret_");
}

const customFetch: typeof fetch = (input, init) => {
  const headers = new Headers(
    typeof Request !== "undefined" && input instanceof Request ? input.headers : undefined
  );

  if (init?.headers) {
    new Headers(init.headers).forEach((value, key) => {
      if (value !== undefined && value !== null) {
        headers.set(key, String(value));
      }
    });
  }

  // Remove invalid bearer auth when using opaque publishable key format
  if (isNewSupabaseApiKey(supabaseAnonKey) && headers.get("Authorization") === `Bearer ${supabaseAnonKey}`) {
    headers.delete("Authorization");
  }

  headers.set("apikey", supabaseAnonKey);

  return fetch(input, { ...init, headers });
};

export const supabase = createClient<Database>(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: typeof window !== "undefined",
    autoRefreshToken: typeof window !== "undefined",
  },
  global: {
    fetch: customFetch,
  },
});

import { createClient } from "@supabase/supabase-js";
import type { Database } from "@/integrations/supabase/types";

const sanitize = (val?: string) => {
  if (!val) return "";
  return String(val).replace(/[\s"']/g, ""); // Aggressively remove all whitespace, newlines, and quotes
};

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
  const cleanHeaders: Record<string, string> = {};

  if (init?.headers) {
    const rawHeaders = init.headers;
    if (rawHeaders instanceof Headers) {
      rawHeaders.forEach((value, key) => {
        cleanHeaders[key] = value.replace(/[\r\n]/g, ""); // Strip newlines
      });
    } else if (Array.isArray(rawHeaders)) {
      rawHeaders.forEach(([key, value]) => {
        cleanHeaders[key] = value.replace(/[\r\n]/g, "");
      });
    } else {
      for (const [key, value] of Object.entries(rawHeaders)) {
        if (value) cleanHeaders[key] = String(value).replace(/[\r\n]/g, "");
      }
    }
  }

  // We previously deleted the Authorization header here, but since we aggressively 
  // sanitize the API key for newlines/whitespace, we don't need to do that anymore.
  // Deleting it might break PostgREST or Kong which expect the Bearer token.
  
  cleanHeaders["apikey"] = supabaseAnonKey;

  return fetch(input, { ...init, headers: cleanHeaders });
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

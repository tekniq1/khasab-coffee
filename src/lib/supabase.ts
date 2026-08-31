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

export const supabase = createClient<Database>(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: typeof window !== "undefined",
    autoRefreshToken: typeof window !== "undefined",
  },
});

import { createClient } from "@supabase/supabase-js";
import type { Database } from "@/integrations/supabase/types";

const supabaseUrl =
  (typeof process !== "undefined" && (process.env?.SUPABASE_URL || process.env?.VITE_SUPABASE_URL)) ||
  (typeof import.meta !== "undefined" && import.meta.env?.VITE_SUPABASE_URL) ||
  "https://onibgpjwkqxvxrxoohrz.supabase.co";

const supabaseServiceKey =
  (typeof process !== "undefined" &&
    (process.env?.SUPABASE_SERVICE_ROLE_KEY ||
      process.env?.VITE_SUPABASE_ANON_KEY ||
      process.env?.VITE_SUPABASE_PUBLISHABLE_KEY)) ||
  (typeof import.meta !== "undefined" &&
    (import.meta.env?.VITE_SUPABASE_ANON_KEY || import.meta.env?.VITE_SUPABASE_PUBLISHABLE_KEY)) ||
  "sb_publishable_8W5UcYn7HiT57Z7KY-5rlw_n1u-TP2C";

export const createServerSupabaseClient = () => {
  return createClient<Database>(supabaseUrl, supabaseServiceKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  });
};

export const supabaseServer = createServerSupabaseClient();

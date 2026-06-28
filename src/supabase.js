import { createClient } from "@supabase/supabase-js";

const config = window.TALENT_APP_CONFIG || {};
const supabaseUrl = config.supabaseUrl || localStorage.getItem("talent_supabase_url") || "";
const supabaseAnonKey = config.supabaseAnonKey || localStorage.getItem("talent_supabase_anon_key") || "";

export const isSupabaseConfigured = Boolean(supabaseUrl && supabaseAnonKey);

export const supabase = isSupabaseConfigured
  ? createClient(supabaseUrl, supabaseAnonKey)
  : null;

export function saveLocalSupabaseConfig(url, anonKey) {
  localStorage.setItem("talent_supabase_url", url.trim());
  localStorage.setItem("talent_supabase_anon_key", anonKey.trim());
}

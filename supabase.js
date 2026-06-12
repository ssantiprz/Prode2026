const SUPABASE_URL = "PEGAR_URL_SUPABASE";
const SUPABASE_ANON_KEY = "PEGAR_ANON_KEY";

const supabaseClient = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

function isSupabaseConfigured() {
  return (
    SUPABASE_URL !== "PEGAR_URL_SUPABASE" &&
    SUPABASE_ANON_KEY !== "PEGAR_ANON_KEY" &&
    SUPABASE_URL.startsWith("https://")
  );
}

const SUPABASE_URL = "https://pqxglrlbrvqyruarmgtj.supabase.co";
const SUPABASE_ANON_KEY = "sb_publishable_5p3BgxVDWV2iD8OcJGqn5A_v0_K06zM";

const supabaseClient = window.supabase.createClient(
  SUPABASE_URL,
  SUPABASE_ANON_KEY
);

function isSupabaseConfigured() {
  return (
    SUPABASE_URL &&
    SUPABASE_ANON_KEY &&
    SUPABASE_URL.startsWith("https://")
  );
}
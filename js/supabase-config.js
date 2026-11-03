
const SUPABASE_URL = "https://slmcompmqdajvyzluisg.supabase.co";
const SUPABASE_KEY = "sb_publishable_8lH6SmWQrhBlqnOHaaryYw_xs9EckDC";

if (window.supabase) {
    window.supabaseClient = window.supabase.createClient(
        SUPABASE_URL,
        SUPABASE_KEY
    );
    console.log("Supabase connected!");
} else {
    console.error("Supabase library not loaded!");
}

// Variables publiques Supabase, vérifiées au démarrage pour échouer avec un message clair
const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const publishableKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;

if (!url || !publishableKey) {
  throw new Error(
    "NEXT_PUBLIC_SUPABASE_URL et NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY doivent être définies (.env.local ou Vercel)."
  );
}

export const SUPABASE_URL = url;
export const SUPABASE_PUBLISHABLE_KEY = publishableKey;

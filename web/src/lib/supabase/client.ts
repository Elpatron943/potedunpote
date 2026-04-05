import { createBrowserClient } from "@supabase/ssr";

/** Client Supabase pour le navigateur (REST / Auth / Storage…). */
export function createClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key) {
    throw new Error(
      "Variables manquantes : NEXT_PUBLIC_SUPABASE_URL et NEXT_PUBLIC_SUPABASE_ANON_KEY (dashboard Supabase → Project Settings → API).",
    );
  }
  return createBrowserClient(url, key);
}

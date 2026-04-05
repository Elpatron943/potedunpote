import { createClient, type SupabaseClient } from "@supabase/supabase-js";

/**
 * Client serveur avec la clé **service_role** (dashboard → API → « service_role » secret).
 * Contourne RLS : à utiliser uniquement dans routes API, Server Actions, etc. — jamais côté navigateur.
 * Remplace l’ancien accès Prisma / `DATABASE_URL`.
 */
let cached: SupabaseClient | undefined;

export function getSupabaseAdmin(): SupabaseClient {
  if (cached) return cached;
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim();
  if (!url || !key) {
    throw new Error(
      "NEXT_PUBLIC_SUPABASE_URL et SUPABASE_SERVICE_ROLE_KEY sont requis (Supabase → Project Settings → API).",
    );
  }
  cached = createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  return cached;
}

import { getSupabaseAdmin } from "@/lib/supabase/admin";

/**
 * SIRENs pour lesquels un compte artisan a revendiqué l’entreprise et la vérification est validée (`verifiedAt`).
 */
export async function getVerifiedRegisteredSirens(sirens: string[]): Promise<Set<string>> {
  const unique = [...new Set(sirens.filter((s) => /^\d{9}$/.test(s)))];
  if (unique.length === 0) return new Set();

  const supabase = getSupabaseAdmin();
  const { data: rows, error } = await supabase
    .from("ArtisanProfile")
    .select("siren")
    .in("siren", unique)
    .not("verifiedAt", "is", null);

  if (error) throw error;
  return new Set((rows ?? []).map((r) => r.siren as string));
}

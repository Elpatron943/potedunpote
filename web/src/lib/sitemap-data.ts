import { getSupabaseAdmin } from "@/lib/supabase/admin";

/** SIREN des fiches a indexer : avis publies et/ou profils artisan en base. */
export async function listSirensForSitemap(): Promise<
  { siren: string; lastModified: Date | undefined }[]
> {
  const supabase = getSupabaseAdmin();
  const bySiren = new Map<string, Date>();

  const merge = (siren: string, iso: string | null | undefined) => {
    if (!/^\d{9}$/.test(siren) || !iso) return;
    const d = new Date(iso);
    if (Number.isNaN(d.getTime())) return;
    const prev = bySiren.get(siren);
    if (!prev || d > prev) bySiren.set(siren, d);
  };

  const { data: reviews } = await supabase
    .from("Review")
    .select("siren, updatedAt")
    .eq("status", "PUBLISHED");

  for (const row of reviews ?? []) {
    merge(row.siren as string, row.updatedAt as string);
  }

  const { data: artisans } = await supabase.from("ArtisanProfile").select("siren, updatedAt");
  for (const row of artisans ?? []) {
    merge(row.siren as string, row.updatedAt as string);
  }

  return [...bySiren.entries()].map(([siren, lastModified]) => ({
    siren,
    lastModified,
  }));
}

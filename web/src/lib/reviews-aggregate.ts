import { getSupabaseAdmin } from "@/lib/supabase/admin";

export type PublishedReviewAggregate = {
  avg: number;
  count: number;
};

/**
 * Moyenne et nombre d’avis publiés par SIREN (page résultats recherche).
 */
export async function getPublishedReviewAggregatesBySiren(
  sirens: string[],
): Promise<Map<string, PublishedReviewAggregate>> {
  const unique = [...new Set(sirens.filter((s) => /^\d{9}$/.test(s)))];
  if (unique.length === 0) return new Map();

  const supabase = getSupabaseAdmin();
  const { data: rows, error } = await supabase
    .from("Review")
    .select("siren, ratingOverall")
    .eq("status", "PUBLISHED")
    .in("siren", unique);

  if (error) throw error;

  const bySiren = new Map<string, { sum: number; count: number }>();
  for (const r of rows ?? []) {
    const s = r.siren as string;
    const rating = r.ratingOverall as number;
    const cur = bySiren.get(s) ?? { sum: 0, count: 0 };
    cur.sum += rating;
    cur.count += 1;
    bySiren.set(s, cur);
  }

  const map = new Map<string, PublishedReviewAggregate>();
  for (const [siren, { sum, count }] of bySiren) {
    if (count > 0) map.set(siren, { avg: sum / count, count });
  }
  return map;
}

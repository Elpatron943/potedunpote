import { getSupabaseAdmin } from "@/lib/supabase/admin";

export type PublishedPricePerM2Aggregate = {
  /** Moyenne des prix au m² (€/m²) sur les avis comparables. */
  avgEurPerM2: number;
  count: number;
};

/**
 * Moyenne du prix au m² (montant déclaré / surface) pour une prestation donnée.
 * Seuls les avis avec montant + surface > 0 sont pris en compte (comparables).
 */
export async function getPublishedAvgEurPerM2BySirenForPrestation(
  sirens: string[],
  metierId: string,
  activiteIds: string[],
): Promise<Map<string, PublishedPricePerM2Aggregate>> {
  const uniqueSirens = [...new Set(sirens.filter((s) => /^\d{9}$/.test(s)))];
  const uniqueActs = [...new Set(activiteIds.map((x) => String(x).trim()).filter(Boolean))];
  const mid = metierId.trim();
  if (uniqueSirens.length === 0) return new Map();
  if (!mid || uniqueActs.length === 0) return new Map();

  const supabase = getSupabaseAdmin();
  const { data: rows, error } = await supabase
    .from("Review")
    .select("siren, amountPaidCents, surfaceM2")
    .eq("status", "PUBLISHED")
    .eq("metierId", mid)
    .in("specialiteId", uniqueActs)
    .in("siren", uniqueSirens)
    .not("amountPaidCents", "is", null);

  if (error) throw error;

  const bySiren = new Map<string, { sumEurPerM2: number; count: number }>();
  for (const r of rows ?? []) {
    const s = r.siren as string;
    const cents = r.amountPaidCents as number | null;
    const m2 = r.surfaceM2 as number | null;
    if (cents == null || m2 == null || !(m2 > 0)) continue;
    const eurPerM2 = (cents / 100) / m2;
    if (!Number.isFinite(eurPerM2) || eurPerM2 <= 0) continue;
    const cur = bySiren.get(s) ?? { sumEurPerM2: 0, count: 0 };
    cur.sumEurPerM2 += eurPerM2;
    cur.count += 1;
    bySiren.set(s, cur);
  }

  const map = new Map<string, PublishedPricePerM2Aggregate>();
  for (const [siren, { sumEurPerM2, count }] of bySiren) {
    if (count > 0) map.set(siren, { avgEurPerM2: sumEurPerM2 / count, count });
  }
  return map;
}

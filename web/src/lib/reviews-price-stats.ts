import { getSupabaseAdmin } from "@/lib/supabase/admin";

export type PublishedPriceStats = {
  count: number;
  avgCents: number;
  minCents: number;
  maxCents: number;
  /** Moyenne / min / max des prix au m² (avis avec montant + surface). */
  perM2?: {
    count: number;
    avgEurPerM2: number;
    minEurPerM2: number;
    maxEurPerM2: number;
  };
};

/**
 * Agrège les montants déclarés (avis publiés avec `amountPaidCents` renseigné).
 */
export async function getPublishedPriceStatsForSiren(
  siren: string,
): Promise<PublishedPriceStats | null> {
  const supabase = getSupabaseAdmin();
  const { data: rows, error } = await supabase
    .from("Review")
    .select("amountPaidCents, surfaceM2")
    .eq("siren", siren)
    .eq("status", "PUBLISHED")
    .not("amountPaidCents", "is", null);

  if (error) throw error;
  const list = (rows ?? []).filter((r) => r.amountPaidCents != null) as {
    amountPaidCents: number;
    surfaceM2: number | null;
  }[];

  if (list.length === 0) return null;

  const cents = list.map((r) => r.amountPaidCents);
  const minCents = Math.min(...cents);
  const maxCents = Math.max(...cents);
  const avgCents = Math.round(cents.reduce((a, b) => a + b, 0) / cents.length);

  const eurPerM2List: number[] = [];
  for (const r of list) {
    const c = r.amountPaidCents;
    const m = r.surfaceM2;
    if (c == null || m == null || !(m > 0)) continue;
    eurPerM2List.push(c / 100 / m);
  }

  let perM2: PublishedPriceStats["perM2"];
  if (eurPerM2List.length > 0) {
    const sum = eurPerM2List.reduce((a, b) => a + b, 0);
    perM2 = {
      count: eurPerM2List.length,
      avgEurPerM2: sum / eurPerM2List.length,
      minEurPerM2: Math.min(...eurPerM2List),
      maxEurPerM2: Math.max(...eurPerM2List),
    };
  }

  return {
    count: list.length,
    avgCents,
    minCents,
    maxCents,
    perM2,
  };
}

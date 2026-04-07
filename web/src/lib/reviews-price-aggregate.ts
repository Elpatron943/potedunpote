import { getSupabaseAdmin } from "@/lib/supabase/admin";

import type { SearchComparablePriceUnit } from "@/lib/search-price-denom";

export type PublishedPricePerDenomAggregate = {
  avgPerDenom: number;
  count: number;
};

function denomQuantityFromRow(
  row: Record<string, unknown>,
  denom: SearchComparablePriceUnit,
): number | null {
  const cents = row.amountPaidCents as number | null;
  if (cents == null) return null;

  const pu = row.priceUnit as string | null | undefined;

  if (denom === "FORFAIT") {
    const m2 = row.surfaceM2 as number | null | undefined;
    const ml = row.linearMl as number | null | undefined;
    const m3 = row.volumeM3 as number | null | undefined;
    const u = row.quantityUnits as number | null | undefined;

    const hasQty =
      (m2 != null && m2 > 0) ||
      (ml != null && ml > 0) ||
      (m3 != null && m3 > 0) ||
      (u != null && u > 0);

    // Forfait explicite, ou compat rétro : pas d'unité enregistrée et aucune quantité.
    if (pu === "FORFAIT" || ((pu == null || pu === "") && !hasQty)) return 1;
    return null;
  }

  if (denom === "M2") {
    const m2 = row.surfaceM2 as number | null | undefined;
    if (m2 == null || !(m2 > 0)) return null;
    if (pu != null && pu !== "" && pu !== "M2") return null;
    return m2;
  }

  if (pu !== denom) return null;

  if (denom === "ML") {
    const v = row.linearMl as number | null | undefined;
    return v != null && v > 0 ? v : null;
  }
  if (denom === "M3") {
    const v = row.volumeM3 as number | null | undefined;
    return v != null && v > 0 ? v : null;
  }
  const v = row.quantityUnits as number | null | undefined;
  return v != null && v > 0 ? v : null;
}

/**
 * Moyenne du prix par unité (montant déclaré ÷ quantité) pour une prestation donnée,
 * selon l’unité homogène des spécialités filtrées.
 */
export async function getPublishedAvgPerDenomBySirenForPrestation(
  sirens: string[],
  metierId: string,
  activiteIds: string[],
  denom: SearchComparablePriceUnit,
): Promise<Map<string, PublishedPricePerDenomAggregate>> {
  const uniqueSirens = [...new Set(sirens.filter((s) => /^\d{9}$/.test(s)))];
  const uniqueActs = [...new Set(activiteIds.map((x) => String(x).trim()).filter(Boolean))];
  const mid = metierId.trim();
  if (uniqueSirens.length === 0) return new Map();
  if (!mid || uniqueActs.length === 0) return new Map();

  const supabase = getSupabaseAdmin();
  const { data: rows, error } = await supabase
    .from("Review")
    .select(
      "siren, amountPaidCents, surfaceM2, linearMl, volumeM3, quantityUnits, priceUnit",
    )
    .eq("status", "PUBLISHED")
    .eq("metierId", mid)
    .in("specialiteId", uniqueActs)
    .in("siren", uniqueSirens)
    .not("amountPaidCents", "is", null);

  if (error) throw error;

  const bySiren = new Map<string, { sum: number; count: number }>();
  for (const r of rows ?? []) {
    const rec = r as Record<string, unknown>;
    const s = rec.siren as string;
    const cents = rec.amountPaidCents as number | null;
    const q = denomQuantityFromRow(rec, denom);
    if (cents == null || q == null) continue;
    const per = (cents / 100) / q;
    if (!Number.isFinite(per) || per <= 0) continue;
    const cur = bySiren.get(s) ?? { sum: 0, count: 0 };
    cur.sum += per;
    cur.count += 1;
    bySiren.set(s, cur);
  }

  const map = new Map<string, PublishedPricePerDenomAggregate>();
  for (const [siren, { sum, count }] of bySiren) {
    if (count > 0) map.set(siren, { avgPerDenom: sum / count, count });
  }
  return map;
}

/** @deprecated Utiliser getPublishedAvgPerDenomBySirenForPrestation(..., "M2"). */
export async function getPublishedAvgEurPerM2BySirenForPrestation(
  sirens: string[],
  metierId: string,
  activiteIds: string[],
): Promise<Map<string, { avgEurPerM2: number; count: number }>> {
  const m = await getPublishedAvgPerDenomBySirenForPrestation(
    sirens,
    metierId,
    activiteIds,
    "M2",
  );
  const out = new Map<string, { avgEurPerM2: number; count: number }>();
  for (const [k, v] of m) {
    out.set(k, { avgEurPerM2: v.avgPerDenom, count: v.count });
  }
  return out;
}

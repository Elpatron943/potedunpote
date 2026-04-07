import { getSupabaseAdmin } from "@/lib/supabase/admin";

type PerDenomBlock = {
  count: number;
  avg: number;
  min: number;
  max: number;
};

export type PublishedPriceStats = {
  count: number;
  avgCents: number;
  minCents: number;
  maxCents: number;
  /** Moyenne / min / max des prix au m² (avis avec montant + surface). */
  perM2?: PerDenomBlock;
  perMl?: PerDenomBlock;
  perM3?: PerDenomBlock;
  perUnit?: PerDenomBlock;
};

function pushDenom(
  list: number[],
  cents: number,
  qty: number | null | undefined,
): void {
  if (qty == null || !(qty > 0)) return;
  list.push(cents / 100 / qty);
}

/**
 * Agrège les montants déclarés (avis publiés avec `amountPaidCents` renseigné).
 */
export async function getPublishedPriceStatsForSiren(
  siren: string,
): Promise<PublishedPriceStats | null> {
  const supabase = getSupabaseAdmin();
  const { data: rows, error } = await supabase
    .from("Review")
    .select(
      "amountPaidCents, surfaceM2, linearMl, volumeM3, quantityUnits, priceUnit",
    )
    .eq("siren", siren)
    .eq("status", "PUBLISHED")
    .not("amountPaidCents", "is", null);

  if (error) throw error;
  const list = (rows ?? []).filter((r) => r.amountPaidCents != null) as {
    amountPaidCents: number;
    surfaceM2: number | null;
    linearMl: number | null;
    volumeM3: number | null;
    quantityUnits: number | null;
    priceUnit: string | null;
  }[];

  if (list.length === 0) return null;

  const centsArr = list.map((r) => r.amountPaidCents);
  const minCents = Math.min(...centsArr);
  const maxCents = Math.max(...centsArr);
  const avgCents = Math.round(centsArr.reduce((a, b) => a + b, 0) / centsArr.length);

  const eurPerM2: number[] = [];
  const eurPerMl: number[] = [];
  const eurPerM3: number[] = [];
  const eurPerUnit: number[] = [];

  for (const r of list) {
    const c = r.amountPaidCents;
    const pu = r.priceUnit;

    if (r.surfaceM2 != null && r.surfaceM2 > 0 && (pu == null || pu === "" || pu === "M2")) {
      pushDenom(eurPerM2, c, r.surfaceM2);
    }
    if (pu === "ML") pushDenom(eurPerMl, c, r.linearMl);
    if (pu === "M3") pushDenom(eurPerM3, c, r.volumeM3);
    if (pu === "UNIT") pushDenom(eurPerUnit, c, r.quantityUnits);
  }

  function block(arr: number[]): PerDenomBlock | undefined {
    if (arr.length === 0) return undefined;
    const sum = arr.reduce((a, b) => a + b, 0);
    return {
      count: arr.length,
      avg: sum / arr.length,
      min: Math.min(...arr),
      max: Math.max(...arr),
    };
  }

  return {
    count: list.length,
    avgCents,
    minCents,
    maxCents,
    perM2: block(eurPerM2),
    perMl: block(eurPerMl),
    perM3: block(eurPerM3),
    perUnit: block(eurPerUnit),
  };
}

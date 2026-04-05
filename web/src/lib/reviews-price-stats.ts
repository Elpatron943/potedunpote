import { prisma } from "@/lib/db";

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
  const agg = await prisma.review.aggregate({
    where: {
      siren,
      status: "PUBLISHED",
      amountPaidCents: { not: null },
    },
    _avg: { amountPaidCents: true },
    _min: { amountPaidCents: true },
    _max: { amountPaidCents: true },
    _count: true,
  });

  const count = agg._count;
  const minCents = agg._min.amountPaidCents;
  const maxCents = agg._max.amountPaidCents;
  const avgRaw = agg._avg.amountPaidCents;

  if (count === 0 || minCents == null || maxCents == null || avgRaw == null) {
    return null;
  }

  const withSurface = await prisma.review.findMany({
    where: {
      siren,
      status: "PUBLISHED",
      amountPaidCents: { not: null },
      surfaceM2: { not: null, gt: 0 },
    },
    select: { amountPaidCents: true, surfaceM2: true },
  });

  const eurPerM2List: number[] = [];
  for (const r of withSurface) {
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
    count,
    avgCents: Math.round(Number(avgRaw)),
    minCents,
    maxCents,
    perM2,
  };
}

import { prisma } from "@/lib/db";

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

  const rows = await prisma.review.groupBy({
    by: ["siren"],
    where: {
      siren: { in: unique },
      status: "PUBLISHED",
    },
    _avg: { ratingOverall: true },
    _count: { id: true },
  });

  const map = new Map<string, PublishedReviewAggregate>();
  for (const r of rows) {
    const avg = r._avg.ratingOverall;
    if (avg == null) continue;
    map.set(r.siren, { avg, count: r._count.id });
  }
  return map;
}

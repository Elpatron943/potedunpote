import { prisma } from "@/lib/db";

/**
 * SIRENs des profils Pro (`premiumUntil` futur) ayant déclaré au moins une des
 * sous-activités pour ce métier dans `sousActivitesSelection`.
 */
export async function getSirensWithDeclaredSousActivites(
  metierId: string,
  actIds: string[],
): Promise<Set<string>> {
  if (actIds.length === 0) return new Set();

  const now = new Date();
  const rows = await prisma.artisanProfile.findMany({
    where: {
      premiumUntil: { gt: now },
    },
    select: { siren: true, sousActivitesSelection: true },
  });

  const matches = new Set<string>();
  for (const row of rows) {
    const raw = row.sousActivitesSelection;
    if (raw == null || typeof raw !== "object" || Array.isArray(raw)) continue;
    const obj = raw as Record<string, unknown>;
    const list = obj[metierId];
    if (!Array.isArray(list)) continue;
    const declared = new Set(list.filter((x): x is string => typeof x === "string"));
    if (actIds.some((id) => declared.has(id))) {
      matches.add(row.siren);
    }
  }
  return matches;
}

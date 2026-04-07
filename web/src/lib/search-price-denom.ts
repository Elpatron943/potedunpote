import type { BtpReferentiel, SerializedBtpReferentiel } from "@/lib/btp-referentiel-types";
import type { BtpPriceUnit } from "@/lib/btp-price-unit";
import { getPrestationPriceUnit } from "@/lib/btp-referentiel";

/** Unités pour lesquelles on peut filtrer « prix moyen / unité max » sur la recherche. */
export type SearchComparablePriceUnit = "M2" | "ML" | "M3" | "UNIT";

const SEARCHABLE: SearchComparablePriceUnit[] = ["M2", "ML", "M3", "UNIT"];

function isSearchable(u: BtpPriceUnit): u is SearchComparablePriceUnit {
  return (SEARCHABLE as readonly string[]).includes(u);
}

/**
 * Si toutes les spécialités cochées partagent la même unité (autre que forfait),
 * retourne cette unité pour appliquer un filtre prix / unité homogène.
 */
export function getHomogeneousSearchPriceUnit(
  ref: BtpReferentiel | SerializedBtpReferentiel,
  metierId: string,
  actIds: string[],
): SearchComparablePriceUnit | null {
  if (actIds.length === 0 || !metierId.trim()) return null;
  const units = actIds.map((id) => getPrestationPriceUnit(ref, metierId, id));
  if (units.some((u) => u == null)) return null;
  const u0 = units[0]!;
  if (!isSearchable(u0)) return null;
  if (!units.every((u) => u === u0)) return null;
  return u0;
}

export function searchPriceUnitToQueryParam(unit: SearchComparablePriceUnit): string {
  switch (unit) {
    case "M2":
      return "pmaxm2";
    case "ML":
      return "pmaxml";
    case "M3":
      return "pmaxm3";
    case "UNIT":
      return "pmaxunit";
    default:
      return "pmaxm2";
  }
}

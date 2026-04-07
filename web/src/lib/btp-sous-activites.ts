/**
 * Prestations par métier : source Supabase via `getBtpReferentiel`.
 * Les helpers prennent le référentiel en premier argument (serveur ou version sérialisée client).
 */
export type { SousActivite } from "@/lib/btp-referentiel-types";
export {
  filterSousActiviteIdsForMetier,
  getPrestationActiviteLabel,
  getPrestationPriceUnit,
  getSousActivitesForMetier,
  isPrestationPricedBySurface,
  isValidPrestationPair,
} from "@/lib/btp-referentiel";

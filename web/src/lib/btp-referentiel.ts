import { unstable_cache } from "next/cache";

import {
  SEED_BTP_METIERS,
  SEED_BTP_SOUS_ACTIVITES,
  SEED_SURFACE_PRICED_ACTIVITE_IDS,
} from "@/lib/btp-referentiel-seed";
import type {
  BtpMetier,
  BtpReferentiel,
  SerializedBtpReferentiel,
  SousActivite,
} from "@/lib/btp-referentiel-types";
import { getSupabaseAdmin } from "@/lib/supabase/admin";

export type { BtpMetier, BtpReferentiel, SerializedBtpReferentiel, SousActivite } from "@/lib/btp-referentiel-types";

function buildReferentielFromSeed(): BtpReferentiel {
  return {
    metiers: [...SEED_BTP_METIERS],
    prestationsByMetierId: { ...SEED_BTP_SOUS_ACTIVITES },
    surfacePricedActiviteIds: new Set(SEED_SURFACE_PRICED_ACTIVITE_IDS),
  };
}

async function loadReferentielFromSupabase(): Promise<BtpReferentiel | null> {
  const supabase = getSupabaseAdmin();
  const { data: metierRows, error: e1 } = await supabase
    .from("BtpMetier")
    .select("id,label,codeNaf")
    .order("sortOrder", { ascending: true });
  const { data: prestationRows, error: e2 } = await supabase
    .from("BtpPrestation")
    .select("id,metierId,label,pricedBySurface")
    .order("sortOrder", { ascending: true });

  if (e1 || e2) {
    console.error("[btp-referentiel]", e1?.message ?? e2?.message);
    return null;
  }
  if (!metierRows?.length || !prestationRows?.length) {
    return null;
  }

  const metiers: BtpMetier[] = metierRows.map((r) => ({
    id: r.id as string,
    label: r.label as string,
    codeNaf: r.codeNaf as string,
  }));

  const prestationsByMetierId: Record<string, SousActivite[]> = {};
  const surfacePricedActiviteIds = new Set<string>();

  for (const m of metiers) {
    prestationsByMetierId[m.id] = [];
  }
  for (const r of prestationRows) {
    const mid = r.metierId as string;
    if (!prestationsByMetierId[mid]) prestationsByMetierId[mid] = [];
    prestationsByMetierId[mid].push({
      id: r.id as string,
      label: r.label as string,
    });
    if (r.pricedBySurface === true) {
      surfacePricedActiviteIds.add(r.id as string);
    }
  }

  return { metiers, prestationsByMetierId, surfacePricedActiviteIds };
}

async function loadBtpReferentielUncached(): Promise<BtpReferentiel> {
  try {
    const fromDb = await loadReferentielFromSupabase();
    if (fromDb) return fromDb;
  } catch (e) {
    console.error("[btp-referentiel]", e);
  }
  console.warn("[btp-referentiel] fallback seed (Supabase vide ou indisponible)");
  return buildReferentielFromSeed();
}

/**
 * Données sérialisables pour `unstable_cache` : pas de `Set` (mal géré selon runtime Next / Turbopack).
 */
async function loadBtpReferentielSerializableForCache(): Promise<{
  metiers: BtpMetier[];
  prestationsByMetierId: Record<string, SousActivite[]>;
  surfacePricedActiviteIds: string[];
}> {
  const ref = await loadBtpReferentielUncached();
  return {
    metiers: ref.metiers,
    prestationsByMetierId: ref.prestationsByMetierId,
    surfacePricedActiviteIds: [...ref.surfacePricedActiviteIds],
  };
}

const getCachedBtpReferentielSerializable = unstable_cache(
  loadBtpReferentielSerializableForCache,
  ["btp-referentiel-v2"],
  { revalidate: 3600 },
);

/**
 * Référentiel métiers + prestations (Supabase, sinon copie embarquée).
 * Mis en cache (revalidation 1 h).
 */
export async function getBtpReferentiel(): Promise<BtpReferentiel> {
  const p = await getCachedBtpReferentielSerializable();
  return {
    metiers: p.metiers,
    prestationsByMetierId: p.prestationsByMetierId,
    surfacePricedActiviteIds: new Set(p.surfacePricedActiviteIds),
  };
}

function surfacePricedIdsAsArray(ref: BtpReferentiel | SerializedBtpReferentiel): string[] {
  const raw = ref.surfacePricedActiviteIds;
  if (raw instanceof Set) return [...raw];
  if (Array.isArray(raw)) return [...raw];
  return [];
}

export function serializeBtpReferentiel(ref: BtpReferentiel): SerializedBtpReferentiel {
  return {
    metiers: ref.metiers.map((m) => ({ id: m.id, label: m.label })),
    prestationsByMetierId: ref.prestationsByMetierId,
    surfacePricedActiviteIds: surfacePricedIdsAsArray(ref),
  };
}

function surfaceSet(ref: BtpReferentiel | SerializedBtpReferentiel): Set<string> {
  return new Set(surfacePricedIdsAsArray(ref));
}

export function getBtpMetierFromRef(
  ref: BtpReferentiel | SerializedBtpReferentiel,
  id: string,
): BtpMetier | { id: string; label: string } | undefined {
  return ref.metiers.find((m) => m.id === id);
}

export function getBtpMetierLabelFromRef(
  ref: BtpReferentiel | SerializedBtpReferentiel,
  id: string,
): string | null {
  return getBtpMetierFromRef(ref, id)?.label ?? null;
}

export function getSousActivitesForMetier(
  ref: BtpReferentiel | SerializedBtpReferentiel,
  metierId: string,
): SousActivite[] {
  return ref.prestationsByMetierId[metierId] ?? [];
}

export function filterSousActiviteIdsForMetier(
  ref: BtpReferentiel | SerializedBtpReferentiel,
  metierId: string,
  ids: string[],
): string[] {
  const allowed = new Set(getSousActivitesForMetier(ref, metierId).map((a) => a.id));
  return [...new Set(ids.filter((id) => allowed.has(id)))];
}

export function isValidPrestationPair(
  ref: BtpReferentiel | SerializedBtpReferentiel,
  metierId: string,
  activiteId: string,
): boolean {
  return getSousActivitesForMetier(ref, metierId).some((a) => a.id === activiteId);
}

export function getPrestationActiviteLabel(
  ref: BtpReferentiel | SerializedBtpReferentiel,
  metierId: string,
  activiteId: string,
): string | null {
  return getSousActivitesForMetier(ref, metierId).find((a) => a.id === activiteId)?.label ?? null;
}

export function isPrestationPricedBySurface(
  ref: BtpReferentiel | SerializedBtpReferentiel,
  metierId: string,
  activiteId: string,
): boolean {
  if (!isValidPrestationPair(ref, metierId, activiteId)) return false;
  return surfaceSet(ref).has(activiteId);
}

export async function getBtpMetier(id: string): Promise<BtpMetier | undefined> {
  const ref = await getBtpReferentiel();
  return ref.metiers.find((m) => m.id === id);
}

export async function getBtpMetierLabel(id: string): Promise<string | null> {
  return (await getBtpMetier(id))?.label ?? null;
}

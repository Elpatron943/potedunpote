import { unstable_cache } from "next/cache";

import { priceUnitForPrestationId } from "@/lib/btp-prestation-price-units";
import {
  SEED_BTP_METIERS,
  SEED_BTP_SOUS_ACTIVITES,
} from "@/lib/btp-referentiel-seed";
import type {
  BtpMetier,
  BtpReferentiel,
  SerializedBtpReferentiel,
  SousActivite,
} from "@/lib/btp-referentiel-types";
import type { BtpPriceUnit } from "@/lib/btp-price-unit";
import { isBtpPriceUnit } from "@/lib/btp-price-unit";
import { getSupabaseAdmin } from "@/lib/supabase/admin";

export type { BtpMetier, BtpReferentiel, SerializedBtpReferentiel, SousActivite } from "@/lib/btp-referentiel-types";

function attachPriceUnits(rows: { id: string; label: string }[]): SousActivite[] {
  return rows.map((r) => ({
    id: r.id,
    label: r.label,
    priceUnit: priceUnitForPrestationId(r.id),
  }));
}

function buildReferentielFromSeed(): BtpReferentiel {
  const prestationsByMetierId: Record<string, SousActivite[]> = {};
  for (const [mid, rows] of Object.entries(SEED_BTP_SOUS_ACTIVITES)) {
    prestationsByMetierId[mid] = attachPriceUnits(rows);
  }
  return {
    metiers: [...SEED_BTP_METIERS],
    prestationsByMetierId,
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
    .select("id,metierId,label,pricedBySurface,priceUnit")
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
  for (const m of metiers) {
    prestationsByMetierId[m.id] = [];
  }
  for (const r of prestationRows) {
    const mid = r.metierId as string;
    if (!prestationsByMetierId[mid]) prestationsByMetierId[mid] = [];
    const rawUnit = (r as { priceUnit?: string }).priceUnit;
    const priceUnit: BtpPriceUnit =
      rawUnit != null && isBtpPriceUnit(rawUnit)
        ? rawUnit
        : (r as { pricedBySurface?: boolean }).pricedBySurface === true
          ? "M2"
          : priceUnitForPrestationId(r.id as string);
    prestationsByMetierId[mid].push({
      id: r.id as string,
      label: r.label as string,
      priceUnit,
    });
  }

  return { metiers, prestationsByMetierId };
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

async function loadBtpReferentielSerializableForCache(): Promise<{
  metiers: BtpMetier[];
  prestationsByMetierId: Record<string, SousActivite[]>;
}> {
  const ref = await loadBtpReferentielUncached();
  return {
    metiers: ref.metiers,
    prestationsByMetierId: ref.prestationsByMetierId,
  };
}

const getCachedBtpReferentielSerializable = unstable_cache(
  loadBtpReferentielSerializableForCache,
  ["btp-referentiel-v3-price-unit"],
  { revalidate: 3600 },
);

/**
 * Référentiel métiers + prestations (Supabase, sinon copie embarquée).
 * Mis en cache (revalidation 1 h).
 */
export async function getBtpReferentiel(): Promise<BtpReferentiel> {
  return getCachedBtpReferentielSerializable();
}

export function serializeBtpReferentiel(ref: BtpReferentiel): SerializedBtpReferentiel {
  return {
    metiers: ref.metiers.map((m) => ({ id: m.id, label: m.label })),
    prestationsByMetierId: ref.prestationsByMetierId,
  };
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

export function getPrestationPriceUnit(
  ref: BtpReferentiel | SerializedBtpReferentiel,
  metierId: string,
  activiteId: string,
): BtpPriceUnit | null {
  if (!isValidPrestationPair(ref, metierId, activiteId)) return null;
  return getSousActivitesForMetier(ref, metierId).find((a) => a.id === activiteId)?.priceUnit ?? null;
}

/** @deprecated Préférer getPrestationPriceUnit — vrai si l’unité est le m². */
export function isPrestationPricedBySurface(
  ref: BtpReferentiel | SerializedBtpReferentiel,
  metierId: string,
  activiteId: string,
): boolean {
  return getPrestationPriceUnit(ref, metierId, activiteId) === "M2";
}

export async function getBtpMetier(id: string): Promise<BtpMetier | undefined> {
  const ref = await getBtpReferentiel();
  return ref.metiers.find((m) => m.id === id);
}

export async function getBtpMetierLabel(id: string): Promise<string | null> {
  return (await getBtpMetier(id))?.label ?? null;
}

import { cache } from "react";

const ENTREPRISES_SEARCH_BASE = "https://recherche-entreprises.api.gouv.fr";

export type EntrepriseDetail = {
  siren: string;
  nom: string;
  dateCreation: string | null;
  dateFermeture: string | null;
  etatAdministratif: string | null;
  categorieEntreprise: string | null;
  anneeCategorieEntreprise: string | null;
  trancheEffectif: string | null;
  anneeTrancheEffectif: string | null;
  complements: Record<string, unknown>;
  rgeSiege: { siret: string | null; codes: string[] };
  rgeEtablissements: Array<{
    siret: string;
    adresse: string | null;
    codes: string[];
  }>;
};

function parseListeRge(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value.filter((v): v is string => typeof v === "string" && v.trim().length > 0);
}

/** Détail entreprise (même flux que la recherche). */
export const getEntrepriseDetail = cache(
  async (siren: string): Promise<EntrepriseDetail | null> => {
    const url = `${ENTREPRISES_SEARCH_BASE}/search?q=${encodeURIComponent(siren)}&per_page=1`;
    let res: Response;
    try {
      res = await fetch(url, {
        headers: {
          Accept: "application/json",
          "User-Agent": "LePoteDunPote/1.0 (plateforme avis BTP)",
        },
        next: { revalidate: 600 },
      });
    } catch {
      return null;
    }

    if (res.status === 429 || !res.ok) return null;

    const data = (await res.json()) as {
      results?: Record<string, unknown>[];
    };
    const hit = data.results?.[0];
    if (!hit || String(hit.siren) !== siren) return null;

    const siege = (hit.siege as Record<string, unknown> | undefined) ?? {};
    const rgeSiege = {
      siret: siege.siret != null ? String(siege.siret) : null,
      codes: parseListeRge(siege.liste_rge),
    };

    const rawMatch = hit.matching_etablissements;
    const matching = Array.isArray(rawMatch) ? rawMatch : [];
    const rgeEtablissements: EntrepriseDetail["rgeEtablissements"] = [];

    for (const row of matching) {
      if (!row || typeof row !== "object") continue;
      const et = row as Record<string, unknown>;
      const codes = parseListeRge(et.liste_rge);
      if (codes.length === 0) continue;
      rgeEtablissements.push({
        siret: et.siret != null ? String(et.siret) : "",
        adresse: typeof et.adresse === "string" ? et.adresse : null,
        codes,
      });
    }

    const comp = hit.complements;
    const complements =
      comp && typeof comp === "object" && !Array.isArray(comp)
        ? (comp as Record<string, unknown>)
        : {};

    return {
      siren: String(hit.siren),
      nom:
        (hit.nom_raison_sociale as string) ||
        (hit.nom_complet as string) ||
        "Sans nom",
      dateCreation: (hit.date_creation as string) || null,
      dateFermeture: (hit.date_fermeture as string) || null,
      etatAdministratif: (hit.etat_administratif as string) || null,
      categorieEntreprise: (hit.categorie_entreprise as string) || null,
      anneeCategorieEntreprise:
        hit.annee_categorie_entreprise != null
          ? String(hit.annee_categorie_entreprise)
          : null,
      trancheEffectif: (hit.tranche_effectif_salarie as string) || null,
      anneeTrancheEffectif:
        hit.annee_tranche_effectif_salarie != null
          ? String(hit.annee_tranche_effectif_salarie)
          : null,
      complements,
      rgeSiege,
      rgeEtablissements,
    };
  },
);

export function formatComplementValue(value: unknown): string {
  if (value === null || value === undefined) return "—";
  if (typeof value === "boolean") return value ? "Oui" : "Non";
  if (typeof value === "string" || typeof value === "number")
    return String(value);
  try {
    return JSON.stringify(value, null, 2);
  } catch {
    return String(value);
  }
}

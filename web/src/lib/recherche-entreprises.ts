import { getBtpMetier } from "@/lib/btp-referentiel";

const ENTREPRISES_SEARCH_BASE = "https://recherche-entreprises.api.gouv.fr";

export type EntrepriseResult = {
  siren: string;
  nom: string;
  codeNaf: string | null;
  active: boolean;
  adresse: string | null;
  codePostal: string | null;
  commune: string | null;
  /**
   * true si l’adresse affichée vient d’un établissement qui correspond au lieu
   * (CP / commune / requête), et non du siège social — souvent plus proche de la zone cherchée.
   */
  addressFromMatchingEtablissement: boolean;
  /** Indicateur issu du bloc compléments */
  estRge: boolean;
  /** Date de création de l’unité légale (répertoire) */
  dateCreation: string | null;
};

export type SearchEntreprisesResult =
  | {
      ok: true;
      entreprises: EntrepriseResult[];
      total: number;
      page: number;
      perPage: number;
      totalPages: number;
    }
  | { ok: false; error: string };

type FetchSearchOptions = {
  /** Demande les établissements « matching » pour afficher une adresse dans la zone filtrée. */
  preferMatchingEstablishmentAddress?: boolean;
};

async function fetchSearchResults(
  params: URLSearchParams,
  requestedPage: number,
  requestedPerPage: number,
  options?: FetchSearchOptions,
): Promise<SearchEntreprisesResult> {
  if (options?.preferMatchingEstablishmentAddress) {
    params.set("minimal", "true");
    params.set("include", "matching_etablissements,siege,complements");
    params.set("limite_matching_etablissements", "5");
  }

  const url = `${ENTREPRISES_SEARCH_BASE}/search?${params.toString()}`;

  let res: Response;
  try {
    res = await fetch(url, {
      headers: {
        Accept: "application/json",
        "User-Agent": "LePoteDunPote/1.0 (plateforme avis BTP)",
      },
      next: { revalidate: 300 },
    });
  } catch {
    return {
      ok: false,
      error: "Impossible de joindre le service des entreprises. Réessayez plus tard.",
    };
  }

  if (res.status === 429) {
    return {
      ok: false,
      error: "Trop de recherches en peu de temps. Patientez quelques secondes.",
    };
  }

  if (!res.ok) {
    return {
      ok: false,
      error: `Erreur du service de recherche (${res.status}).`,
    };
  }

  const data = (await res.json()) as {
    results?: Record<string, unknown>[];
    total_results?: number;
    page?: number;
    per_page?: number;
    total_pages?: number;
  };

  const results = data.results ?? [];
  const total = typeof data.total_results === "number" ? data.total_results : results.length;
  const currentPage = typeof data.page === "number" ? data.page : requestedPage;
  const pSize = typeof data.per_page === "number" ? data.per_page : requestedPerPage;
  const totalPages = typeof data.total_pages === "number" ? data.total_pages : 1;

  const useMatchingAddress = options?.preferMatchingEstablishmentAddress ?? false;

  return {
    ok: true,
    entreprises: results.map((row) => mapHit(row, useMatchingAddress)),
    total,
    page: currentPage,
    perPage: pSize,
    totalPages,
  };
}

function pickDisplayEtablissement(
  raw: Record<string, unknown>,
  siege: Record<string, unknown> | null | undefined,
): {
  loc: Record<string, unknown> | null | undefined;
  addressFromMatchingEtablissement: boolean;
} {
  const matching = raw.matching_etablissements;
  if (!Array.isArray(matching) || matching.length === 0) {
    return { loc: siege, addressFromMatchingEtablissement: false };
  }
  const first = matching[0] as Record<string, unknown>;
  const hasLocHint =
    (typeof first.adresse === "string" && first.adresse.trim() !== "") ||
    (typeof first.code_postal === "string" && first.code_postal.trim() !== "");
  if (!hasLocHint) {
    return { loc: siege, addressFromMatchingEtablissement: false };
  }
  const ss = siege?.siret != null ? String(siege.siret) : "";
  const es = first.siret != null ? String(first.siret) : "";
  const sameEtab = ss !== "" && es !== "" && ss === es;
  const addressFromMatchingEtablissement = !sameEtab;
  return { loc: first, addressFromMatchingEtablissement };
}

function mapHit(raw: Record<string, unknown>, useMatchingAddress: boolean): EntrepriseResult {
  const siege = raw.siege as Record<string, unknown> | null | undefined;
  const etat = raw.etat_administratif as string | undefined;
  const siegeEtat = siege?.etat_administratif as string | undefined;
  const active =
    etat === "A" && (siegeEtat == null || siegeEtat === "A");

  const nom =
    (raw.nom_raison_sociale as string) ||
    (raw.nom_complet as string) ||
    "Sans nom";

  const { loc, addressFromMatchingEtablissement } = useMatchingAddress
    ? pickDisplayEtablissement(raw, siege)
    : { loc: siege, addressFromMatchingEtablissement: false };

  const adresse = (loc?.adresse as string) || null;
  const complements = raw.complements as Record<string, unknown> | undefined;
  const estRge = complements?.est_rge === true;

  const dateCreation =
    typeof raw.date_creation === "string" && raw.date_creation.trim() !== ""
      ? raw.date_creation.trim()
      : null;

  return {
    siren: String(raw.siren),
    nom,
    codeNaf: (raw.activite_principale as string) || null,
    active,
    adresse,
    codePostal: (loc?.code_postal as string) || null,
    commune: (loc?.libelle_commune as string) || null,
    addressFromMatchingEtablissement,
    estRge,
    dateCreation,
  };
}

/**
 * Recherche BTP par zone et filtres optionnels.
 * Le type d’artisan est ciblé uniquement par codes NAF (`activite_principale`), pas par mots-clés texte.
 */
export async function searchEntreprisesBtp(
  metierId: string,
  locationRaw: string,
  page = 1,
  perPage = 12,
  /** Uniquement les entreprises signalées RGE dans les données. */
  rgeOnly = false,
): Promise<SearchEntreprisesResult> {
  const metier = await getBtpMetier(metierId);
  if (!metier) {
    return { ok: false, error: "Type d’artisan inconnu." };
  }

  const location = locationRaw.trim();
  if (!location) {
    return {
      ok: false,
      error: "Indiquez un code postal (5 chiffres) ou une ville.",
    };
  }

  const params = new URLSearchParams();
  params.set("activite_principale", metier.codeNaf);
  /** Unités légales actives uniquement (A = active, C = cessée — INSEE). */
  params.set("etat_administratif", "A");

  if (/^\d{5}$/.test(location)) {
    params.set("code_postal", location);
  } else {
    params.set("q", location);
  }

  params.set("page", String(Math.max(1, page)));
  params.set("per_page", String(Math.min(25, Math.max(1, perPage))));
  if (rgeOnly) {
    params.set("est_rge", "true");
  }

  return fetchSearchResults(params, page, perPage, {
    preferMatchingEstablishmentAddress: true,
  });
}

/**
 * Recherche par SIREN (9 chiffres), SIRET (14 chiffres) ou dénomination sociale — sans filtre NAF BTP.
 */
export async function searchEntreprisesDirect(
  queryRaw: string,
  page = 1,
  perPage = 12,
  rgeOnly = false,
): Promise<SearchEntreprisesResult> {
  const trimmed = queryRaw.trim();
  const compact = trimmed.replace(/\s/g, "");

  let q: string;
  if (/^\d{14}$/.test(compact)) {
    q = compact.slice(0, 9);
  } else if (/^\d{9}$/.test(compact)) {
    q = compact;
  } else {
    q = trimmed;
    if (q.length < 2) {
      return {
        ok: false,
        error: "Pour une recherche par raison sociale, saisis au moins 2 caractères.",
      };
    }
  }

  const params = new URLSearchParams();
  params.set("q", q);
  params.set("page", String(Math.max(1, page)));
  params.set("per_page", String(Math.min(25, Math.max(1, perPage))));
  if (rgeOnly) {
    params.set("est_rge", "true");
  }

  return fetchSearchResults(params, page, perPage);
}


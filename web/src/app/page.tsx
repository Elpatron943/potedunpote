import type { Metadata } from "next";
import type { ReactNode } from "react";
import Link from "next/link";
import { HomeSearchForm } from "@/components/home-search-form";
import { getSirensWithDeclaredSousActivites } from "@/lib/artisan-sous-activites-search";
import {
  filterSousActiviteIdsForMetier,
  getBtpReferentiel,
  getSousActivitesForMetier,
} from "@/lib/btp-referentiel";
import {
  getPremiumContactsBySirens,
  type PremiumContactInfo,
} from "@/lib/artisan-premium-contact";
import { getVerifiedRegisteredSirens } from "@/lib/artisan-verified-sirens";
import { ContactProButton } from "@/components/contact-pro-button";
import { searchEntreprisesBtp, searchEntreprisesDirect } from "@/lib/recherche-entreprises";
import { getPublishedReviewAggregatesBySiren } from "@/lib/reviews-aggregate";
import type { SearchComparablePriceUnit } from "@/lib/search-price-denom";
import {
  getHomogeneousSearchPriceUnit,
  searchPriceUnitToQueryParam,
} from "@/lib/search-price-denom";
import { getPublishedAvgPerDenomBySirenForPrestation } from "@/lib/reviews-price-aggregate";
import { SearchResultReviewScore } from "@/components/search-result-review-score";

export const metadata: Metadata = {
  title: "Artisans du bâtiment près de chez toi",
  description:
    "Métier, lieu ou SIREN : fiches entreprise, avis, prix payés par d’autres clients pour des prestations proches, pour comparer avant de choisir ton artisan.",
};

function HeroHighlight({ children }: { children: ReactNode }) {
  return (
    <span className="relative inline-block px-0.5">
      <span className="relative z-10 font-semibold italic text-warm">{children}</span>
      <span
        className="absolute -bottom-1 left-0 right-0 -z-0 h-2 rounded-sm bg-accent/25 dark:bg-accent/20 sm:h-2.5"
        aria-hidden
      />
    </span>
  );
}

type PageProps = {
  searchParams: Promise<{
    metier?: string;
    loc?: string;
    page?: string;
    rge?: string;
    act?: string | string[];
    /** Note minimale : moyenne des avis publiés ≥ cette valeur (1–5). */
    stars?: string;
    /** Plafond prix / unité homogène (m², ml, m³ ou unité) selon les prestations cochées. */
    pmaxm2?: string;
    pmaxml?: string;
    pmaxm3?: string;
    pmaxunit?: string;
    /** Plafond prix moyen forfait (prestations au forfait). */
    pmaxforfait?: string;
    /** SIREN, SIRET ou dénomination (recherche directe). */
    entreprise?: string;
  }>;
};

function parseActParam(raw: string | string[] | undefined): string[] {
  if (raw == null) return [];
  const arr = Array.isArray(raw) ? raw : [raw];
  return [...new Set(arr.map((x) => String(x).trim()).filter(Boolean))];
}

function parseRgeParam(value: string | undefined): boolean {
  const v = (value ?? "").toLowerCase();
  return v === "1" || v === "true" || v === "on" || v === "oui";
}

function parseMinStarsParam(value: string | undefined): number | null {
  if (value == null || value === "") return null;
  const n = Number.parseInt(value, 10);
  if (!Number.isInteger(n) || n < 1 || n > 5) return null;
  return n;
}

/** Seuil max en € par unité (décimales autorisées). */
function parseMaxEurPerDenom(value: string | undefined): number | null {
  const t = (value ?? "").trim();
  if (!t) return null;
  const normalized = t.replace(/\s/g, "").replace(",", ".");
  const n = Number(normalized);
  if (!Number.isFinite(n) || n <= 0) return null;
  return n;
}

function maxDenomRawForUnit(
  denom: SearchComparablePriceUnit,
  sp: {
    pmaxm2?: string;
    pmaxml?: string;
    pmaxm3?: string;
    pmaxunit?: string;
    pmaxforfait?: string;
  },
): string {
  switch (denom) {
    case "M2":
      return sp.pmaxm2 ?? "";
    case "ML":
      return sp.pmaxml ?? "";
    case "M3":
      return sp.pmaxm3 ?? "";
    case "UNIT":
      return sp.pmaxunit ?? "";
    case "FORFAIT":
      return sp.pmaxforfait ?? "";
    default:
      return "";
  }
}

function formatDateCreation(iso: string | null): string | null {
  if (!iso) return null;
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return new Intl.DateTimeFormat("fr-FR", {
    day: "numeric",
    month: "long",
    year: "numeric",
  }).format(d);
}

export default async function HomePage({ searchParams }: PageProps) {
  const sp = await searchParams;
  const btpRef = await getBtpReferentiel();
  const directEntreprise = (sp.entreprise ?? "").trim();
  const shouldDirectSearch = directEntreprise.length > 0;
  const metierId = (sp.metier ?? "").trim();
  const loc = (sp.loc ?? "").trim();
  const page = Math.max(1, Number.parseInt(sp.page ?? "1", 10) || 1);
  const rgeOnly = parseRgeParam(sp.rge);
  const validatedActs = shouldDirectSearch
    ? []
    : filterSousActiviteIdsForMetier(btpRef, metierId, parseActParam(sp.act));
  const minStars = parseMinStarsParam(sp.stars);
  const apiPerPage = minStars != null ? 25 : 12;

  const shouldMetierSearch = !shouldDirectSearch && metierId.length > 0 && loc.length > 0;

  const searchPriceDenom =
    shouldMetierSearch && validatedActs.length > 0
      ? getHomogeneousSearchPriceUnit(btpRef, metierId, validatedActs)
      : null;
  const maxDenomForFilter =
    searchPriceDenom != null
      ? parseMaxEurPerDenom(maxDenomRawForUnit(searchPriceDenom, sp))
      : null;
  const priceFilterParam =
    searchPriceDenom != null ? searchPriceUnitToQueryParam(searchPriceDenom) : null;

  const matchingSirens =
    shouldMetierSearch && validatedActs.length > 0
      ? await getSirensWithDeclaredSousActivites(metierId, validatedActs)
      : new Set<string>();

  const result = shouldDirectSearch
    ? await searchEntreprisesDirect(directEntreprise, page, apiPerPage, rgeOnly)
    : shouldMetierSearch
      ? await searchEntreprisesBtp(metierId, loc, page, apiPerPage, rgeOnly)
      : null;

  const displayEntreprises =
    result?.ok
      ? validatedActs.length > 0
        ? [...result.entreprises].sort((a, b) => {
            const am = matchingSirens.has(a.siren) ? 1 : 0;
            const bm = matchingSirens.has(b.siren) ? 1 : 0;
            return bm - am;
          })
        : result.entreprises
      : [];

  const reviewAggregates =
    result?.ok && displayEntreprises.length > 0
      ? await getPublishedReviewAggregatesBySiren(displayEntreprises.map((e) => e.siren))
      : new Map<string, { avg: number; count: number }>();

  const filteredByStars =
    minStars == null
      ? displayEntreprises
      : displayEntreprises.filter((e) => {
          const a = reviewAggregates.get(e.siren);
          return a != null && a.count > 0 && a.avg >= minStars;
        });

  const pricePerDenomAverages =
    !shouldDirectSearch &&
    shouldMetierSearch &&
    validatedActs.length > 0 &&
    searchPriceDenom != null &&
    maxDenomForFilter != null &&
    maxDenomForFilter > 0 &&
    filteredByStars.length > 0
      ? await getPublishedAvgPerDenomBySirenForPrestation(
          filteredByStars.map((e) => e.siren),
          metierId,
          validatedActs,
          searchPriceDenom,
        )
      : new Map<string, { avgPerDenom: number; count: number }>();

  const filteredByMaxDenom =
    maxDenomForFilter == null
      ? filteredByStars
      : filteredByStars.filter((e) => {
          const a = pricePerDenomAverages.get(e.siren);
          return a != null && a.count > 0 && a.avgPerDenom <= maxDenomForFilter;
        });

  const sortedFilteredEntreprises =
    minStars != null
      ? [...filteredByMaxDenom].sort((a, b) => {
          const av = reviewAggregates.get(a.siren)?.avg ?? 0;
          const bv = reviewAggregates.get(b.siren)?.avg ?? 0;
          if (bv !== av) return bv - av;
          return a.nom.localeCompare(b.nom, "fr");
        })
      : filteredByMaxDenom;

  let verifiedRegisteredSirens = new Set<string>();
  let premiumContactsBySiren = new Map<string, PremiumContactInfo>();
  if (result?.ok && sortedFilteredEntreprises.length > 0) {
    const sirens = sortedFilteredEntreprises.map((e) => e.siren);
    const [verified, premium] = await Promise.all([
      getVerifiedRegisteredSirens(sirens),
      getPremiumContactsBySirens(sirens),
    ]);
    verifiedRegisteredSirens = verified;
    premiumContactsBySiren = premium;
  }

  const buildPageHref = (p: number) => {
    const q = new URLSearchParams();
    if (shouldDirectSearch) {
      q.set("entreprise", directEntreprise);
    } else {
      q.set("metier", metierId);
      q.set("loc", loc);
      for (const id of validatedActs) {
        q.append("act", id);
      }
    }
    if (rgeOnly) q.set("rge", "1");
    if (minStars != null) q.set("stars", String(minStars));
    if (!shouldDirectSearch && validatedActs.length > 0 && maxDenomForFilter != null && priceFilterParam) {
      q.set(priceFilterParam, String(maxDenomForFilter));
    }
    if (p > 1) q.set("page", String(p));
    return `/?${q.toString()}`;
  };

  return (
    <div className="relative min-h-screen overflow-x-clip">
      {/* Fond atmosphère */}
      <div
        className="pointer-events-none fixed inset-0 -z-10"
        aria-hidden
      >
        <div className="absolute inset-0 bg-canvas" />
        <div
          className="absolute -top-32 left-1/2 h-[42rem] w-[42rem] -translate-x-1/2 rounded-full bg-gradient-to-b from-teal-300/35 via-amber-200/25 to-transparent blur-3xl dark:from-teal-500/20 dark:via-orange-500/10 dark:to-transparent animate-home-shimmer"
        />
        <div className="absolute bottom-0 right-0 h-80 w-80 rounded-full bg-warm/10 blur-3xl dark:bg-warm/5" />
        <div className="absolute top-1/3 -left-24 h-64 w-64 rounded-full bg-accent/10 blur-3xl" />
      </div>

      <div className="relative mx-auto max-w-4xl px-4 pb-24 pt-8 sm:px-6 sm:pt-12 lg:px-8">
        {/* En-tête marque */}
        <header className="mb-12 flex flex-col items-center text-center sm:mb-16">
          <p className="animate-home-fade-up mb-4 inline-flex items-center gap-2 rounded-full border border-ink/10 bg-card px-4 py-1.5 text-xs font-medium uppercase tracking-[0.2em] text-ink-soft backdrop-blur-md dark:border-white/10">
            Confiance travaux
          </p>
          <h1
            className="animate-home-fade-up-delay mx-auto max-w-xl text-balance font-[family-name:var(--font-display)] text-3xl leading-[1.2] text-ink sm:max-w-4xl sm:text-4xl sm:leading-[1.15] md:text-5xl md:leading-[1.12]"
            style={{ fontFeatureSettings: '"liga" 1, "kern" 1' }}
          >
            J&apos;ai le <HeroHighlight>pote d&apos;un pote</HeroHighlight> qui{" "}
            <HeroHighlight>bosse bien</HeroHighlight>{" "}
            <HeroHighlight>pour un prix correct</HeroHighlight> et{" "}
            <HeroHighlight>dans les temps</HeroHighlight>
          </h1>
          <p className="animate-home-fade-up-delay-2 mt-5 max-w-2xl text-lg text-ink-soft sm:text-xl">
            Repère un artisan du bâtiment près de chez toi :{" "}
            <strong className="font-semibold text-ink">fiches entreprise</strong>,{" "}
            <strong className="font-semibold text-ink">avis de clients</strong>, une idée du{" "}
            <strong className="font-semibold text-ink">prix payé par d’autres clients</strong> pour une
            prestation similaire, et des infos utiles pour{" "}
            <strong className="font-semibold text-ink">décider sereinement</strong>.
          </p>
        </header>

        {/* Carte recherche */}
        <div className="animate-home-fade-up-delay-2 mx-auto max-w-2xl">
          <div className="overflow-visible rounded-[1.75rem] border border-[var(--card-border)] bg-[var(--card)] p-6 shadow-[0_24px_80px_-20px_rgba(28,25,23,0.18)] backdrop-blur-xl dark:shadow-[0_24px_80px_-20px_rgba(0,0,0,0.55)] sm:p-8">
            <div className="mb-6 flex items-start gap-3">
              <span className="mt-0.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-accent/15 text-accent dark:bg-accent/10">
                <SearchGlyph />
              </span>
              <div>
                <h2 className="text-lg font-semibold tracking-tight text-ink">
                  Lance ta recherche
                </h2>
                <p className="mt-1 text-sm leading-relaxed text-ink-soft">
                  <strong className="font-medium text-ink">Métier + lieu</strong> (aide à la saisie)
                  ou <strong className="font-medium text-ink">SIREN, SIRET ou raison sociale</strong>
                  . Filtres optionnels : sous-activités,{" "}
                  <strong className="font-medium text-ink">note minimale</strong> (avis publiés),{" "}
                  <strong className="font-medium text-ink">prix moyen par unité max</strong> (m², ml, m³ ou
                  unité si les prestations cochées partagent la même unité),{" "}
                  <strong className="font-medium text-ink">RGE</strong>.
                </p>
              </div>
            </div>

            <HomeSearchForm
              metiers={btpRef.metiers.map((m) => ({ id: m.id, label: m.label }))}
              prestationsByMetierId={btpRef.prestationsByMetierId}
              defaultMetier={metierId}
              defaultLoc={loc}
              defaultRge={rgeOnly}
              defaultActs={validatedActs}
              defaultMinStars={minStars}
              priceFilterParam={priceFilterParam}
              defaultMaxDenom={
                searchPriceDenom != null ? maxDenomRawForUnit(searchPriceDenom, sp) : ""
              }
              defaultEntreprise={directEntreprise}
            />
          </div>
        </div>

        {/* Messages & résultats */}
        <div id="resultats" className="mx-auto mt-14 max-w-2xl space-y-6">
          {result && !result.ok && (
            <div
              className="rounded-2xl border border-red-500/25 bg-red-500/[0.08] px-5 py-4 text-sm text-red-900 dark:text-red-200"
              role="alert"
            >
              {result.error}
            </div>
          )}

          {result && result.ok && (
            <section className="space-y-6" aria-live="polite">
              <div className="flex flex-wrap items-end justify-between gap-3 border-b border-ink/10 pb-4 dark:border-white/10">
                <div>
                  <h3 className="font-[family-name:var(--font-display)] text-2xl text-ink">
                    Résultats
                  </h3>
                  <p className="mt-1 text-sm text-ink-soft">
                    {result.total.toLocaleString("fr-FR")} entreprise
                    {result.total > 1 ? "s" : ""} trouvée
                    {result.total > 1 ? "s" : ""}
                    {shouldDirectSearch
                      ? " · recherche par SIREN / SIRET ou dénomination"
                      : validatedActs.length > 0
                        ? " · sous-activités prises en compte"
                        : ""}
                    {rgeOnly ? " · filtre RGE actif" : ""}
                    {minStars != null
                      ? ` · filtre ${minStars}★+ (avis)`
                      : ""}
                    {result.totalPages > 1
                      ? ` · page ${result.page} sur ${result.totalPages}`
                      : ""}
                  </p>
                  {minStars != null && result.entreprises.length > 0 ? (
                    <p className="mt-2 text-xs leading-relaxed text-ink-soft">
                      Le filtre par étoiles s’applique aux résultats de cette page (échantillon
                      élargi à {apiPerPage} entreprises). Sans avis publié ou avec
                      une moyenne inférieure, l’entreprise est masquée. Passe à la page suivante
                      pour voir d’autres propositions.
                    </p>
                  ) : null}
                </div>
                <div className="flex flex-wrap items-center justify-end gap-2">
                  {minStars != null && (
                    <span className="rounded-full bg-amber-500/20 px-3 py-1 text-xs font-semibold text-amber-950 dark:text-amber-200">
                      Moyenne avis ≥ {minStars}/5
                    </span>
                  )}
                  {rgeOnly && (
                    <span className="rounded-full bg-emerald-500/15 px-3 py-1 text-xs font-semibold text-emerald-800 dark:text-emerald-300">
                      RGE uniquement
                    </span>
                  )}
                  {validatedActs.length > 0 && (
                    <span className="rounded-full bg-teal-500/15 px-3 py-1 text-xs font-semibold text-teal-900 dark:text-teal-300">
                      Prestations : priorité fiches Pro
                    </span>
                  )}
                </div>
              </div>

              {result.entreprises.length === 0 ? (
                <p className="rounded-2xl border border-dashed border-ink/15 bg-canvas-muted/40 px-6 py-10 text-center text-ink-soft dark:border-white/10">
                  {rgeOnly ? (
                    <>
                      Aucune entreprise <strong className="text-ink">RGE</strong> ne
                      correspond à ce métier et à cet endroit. Élargis la zone (ville
                      voisine, département) ou décoche le filtre RGE.
                    </>
                  ) : (
                    <>
                      Aucune entreprise ne correspond. Essaie un autre code postal ou
                      une ville à côté.
                    </>
                  )}
                </p>
              ) : sortedFilteredEntreprises.length === 0 && minStars != null ? (
                <p className="rounded-2xl border border-dashed border-amber-500/30 bg-amber-500/[0.06] px-6 py-10 text-center text-sm text-ink-soft dark:border-amber-500/25">
                  Aucune entreprise de <strong className="text-ink">cette page</strong> n’a une
                  moyenne d’avis publiés d’au moins <strong className="text-ink">{minStars}★</strong>
                  . Essaie une note plus basse, enlève le filtre, ou consulte la page suivante de
                  résultats.
                </p>
              ) : (
                <>
                  {minStars != null && sortedFilteredEntreprises.length > 0 ? (
                    <p className="rounded-2xl border border-amber-500/20 bg-amber-500/[0.06] px-4 py-3 text-sm text-ink-soft dark:border-amber-500/25">
                      <span className="font-medium text-ink">
                        {sortedFilteredEntreprises.length} entreprise
                        {sortedFilteredEntreprises.length > 1 ? "s" : ""}
                      </span>{" "}
                      sur les {result.entreprises.length} de cette page ont une moyenne ≥{" "}
                      {minStars}★ (tri par note décroissante).
                    </p>
                  ) : null}
                  {validatedActs.length > 0 && (
                    <p className="rounded-2xl border border-teal-500/20 bg-teal-500/[0.06] px-4 py-3 text-sm text-ink-soft dark:border-teal-500/25">
                      <span className="font-medium text-ink">Tri :</span> le périmètre métier
                      repose sur les codes NAF du type d’artisan. Les libellés cochés servent à
                      remonter en premier les entreprises avec une fiche{" "}
                      <strong className="text-ink">Pro</strong> ayant déclaré au moins une de ces
                      prestations.
                    </p>
                  )}
                  {validatedActs.length > 0 && (
                    <ul className="flex flex-wrap gap-2 text-xs text-ink-soft">
                      {validatedActs.map((id) => {
                        const label = getSousActivitesForMetier(btpRef, metierId).find((a) => a.id === id)
                          ?.label;
                        if (!label) return null;
                        return (
                          <li
                            key={id}
                            className="rounded-lg border border-ink/10 bg-canvas-muted/60 px-2.5 py-1 dark:border-white/10"
                          >
                            {label}
                          </li>
                        );
                      })}
                    </ul>
                  )}
                <ul className="space-y-4">
                  {sortedFilteredEntreprises.map((e, i) => {
                    const dateLabel = formatDateCreation(e.dateCreation);
                    const proMatch =
                      validatedActs.length > 0 && matchingSirens.has(e.siren);
                    const reviews = reviewAggregates.get(e.siren);
                    return (
                    <li
                      key={e.siren}
                      className="animate-home-fade-up"
                      style={{ animationDelay: `${Math.min(i * 0.04, 0.4)}s` }}
                    >
                      <article className="group rounded-2xl border border-[var(--card-border)] bg-[var(--card)] p-5 shadow-sm backdrop-blur-md transition duration-300 hover:-translate-y-0.5 hover:border-accent/35 hover:shadow-[0_20px_50px_-24px_rgba(15,118,110,0.35)] dark:hover:shadow-[0_20px_50px_-24px_rgba(45,212,191,0.12)]">
                        <div className="flex flex-wrap items-start justify-between gap-3">
                          <h4 className="text-lg font-semibold leading-snug text-ink">
                            <Link
                              href={`/entreprise/${e.siren}`}
                              className="transition-colors hover:text-accent dark:hover:text-accent"
                            >
                              {e.nom}
                            </Link>
                          </h4>
                          <div className="flex flex-wrap items-center justify-end gap-2">
                            {verifiedRegisteredSirens.has(e.siren) && (
                              <span className="shrink-0 rounded-full bg-indigo-500/15 px-3 py-1 text-xs font-semibold text-indigo-950 dark:text-indigo-200">
                                Prestataire inscrit
                              </span>
                            )}
                            {proMatch && (
                              <span className="shrink-0 rounded-full bg-amber-500/20 px-3 py-1 text-xs font-semibold text-amber-950 dark:text-amber-200">
                                Prestation indiquée (Pro)
                              </span>
                            )}
                            {e.estRge && (
                              <span className="shrink-0 rounded-full bg-teal-500/15 px-3 py-1 text-xs font-semibold text-teal-900 dark:text-teal-300">
                                RGE
                              </span>
                            )}
                            <span
                              className={`shrink-0 rounded-full px-3 py-1 text-xs font-semibold ${
                                e.active
                                  ? "bg-emerald-500/15 text-emerald-800 dark:text-emerald-300"
                                  : "bg-amber-500/15 text-amber-900 dark:text-amber-200"
                              }`}
                            >
                              {e.active ? "Active" : "Cessée / inactive"}
                            </span>
                          </div>
                        </div>
                        <p className="mt-2 font-mono text-xs text-ink-soft">
                          SIREN {e.siren}
                          {e.codeNaf ? ` · NAF ${e.codeNaf}` : ""}
                        </p>
                        {dateLabel && (
                          <p className="mt-2 text-sm text-ink">
                            <span className="font-medium text-ink-soft">
                              Création :{" "}
                            </span>
                            {dateLabel}
                          </p>
                        )}
                        {(e.adresse || e.codePostal || e.commune) && (
                          <div className="mt-3 space-y-1">
                            <p className="text-sm leading-relaxed text-ink-soft">
                              {e.adresse ??
                                [e.codePostal, e.commune].filter(Boolean).join(" ")}
                            </p>
                            {e.addressFromMatchingEtablissement ? (
                              <p className="text-xs text-ink-soft/90">
                                Établissement dans la zone recherchée (le siège social peut être à une autre
                                adresse).
                              </p>
                            ) : null}
                          </div>
                        )}
                        <div className="mt-4 flex flex-col gap-3 border-t border-ink/10 pt-4 dark:border-white/10 sm:flex-row sm:flex-wrap sm:items-center sm:justify-between">
                          <div className="flex w-full flex-col gap-2 sm:w-auto sm:flex-row sm:flex-wrap sm:items-center">
                          <Link
                            href={`/entreprise/${e.siren}`}
                            className="inline-flex min-h-[2.75rem] w-full items-center justify-center rounded-xl bg-teal-700 px-4 py-2.5 text-center text-sm font-bold text-white shadow-sm transition hover:bg-teal-800 dark:bg-teal-600 dark:hover:bg-teal-500 sm:w-auto sm:min-w-[180px] sm:flex-none"
                          >
                            Fiche & avis
                          </Link>
                          {premiumContactsBySiren.has(e.siren) ? (
                            <ContactProButton
                              raisonSociale={e.nom}
                              contact={premiumContactsBySiren.get(e.siren)!}
                            />
                          ) : null}
                          </div>
                          {reviews && reviews.count > 0 ? (
                            <div className="flex w-full justify-center sm:w-auto sm:justify-end sm:pl-4">
                              <SearchResultReviewScore
                                avg={reviews.avg}
                                count={reviews.count}
                                compact
                              />
                            </div>
                          ) : (
                            <p className="w-full text-center text-sm leading-relaxed text-ink-soft sm:max-w-xs sm:flex-1 sm:text-right">
                              Avez-vous fait appel à ce pro ?{" "}
                              <Link
                                href={`/entreprise/${e.siren}#avis`}
                                className="font-medium text-accent underline decoration-accent/40 underline-offset-2 transition hover:decoration-accent dark:text-teal-300"
                              >
                                Soyez le premier à laisser un avis
                              </Link>
                              .
                            </p>
                          )}
                        </div>
                      </article>
                    </li>
                    );
                  })}
                </ul>
                </>
              )}

              {result.totalPages > 1 && (
                <nav
                  className="flex flex-wrap justify-center gap-3 pt-4"
                  aria-label="Pagination"
                >
                  {result.page > 1 && (
                    <Link
                      href={buildPageHref(result.page - 1)}
                      className="rounded-2xl border border-ink/10 bg-canvas-muted/50 px-5 py-2.5 text-sm font-medium text-ink transition hover:border-accent/40 hover:bg-canvas dark:border-white/10"
                    >
                      ← Précédent
                    </Link>
                  )}
                  {result.page < result.totalPages && (
                    <Link
                      href={buildPageHref(result.page + 1)}
                      className="rounded-2xl border border-ink/10 bg-canvas-muted/50 px-5 py-2.5 text-sm font-medium text-ink transition hover:border-accent/40 hover:bg-canvas dark:border-white/10"
                    >
                      Suivant →
                    </Link>
                  )}
                </nav>
              )}
            </section>
          )}
        </div>
      </div>
    </div>
  );
}

function SearchGlyph() {
  return (
    <svg
      width="20"
      height="20"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      <circle cx="11" cy="11" r="7" />
      <path d="M21 21l-4.35-4.35" />
    </svg>
  );
}

import Link from "next/link";
import { ContactProButton } from "@/components/contact-pro-button";
import type { PremiumContactInfo } from "@/lib/artisan-premium-contact";
import type { ReviewStatus } from "@/lib/db-enums";
import { ReviewForm } from "@/components/review-form";
import { complementKeyLabel } from "@/lib/complements-labels";
import type { EntrepriseDetail } from "@/lib/entreprise-detail";
import { formatComplementValue } from "@/lib/entreprise-detail";
import {
  AVAILABILITY_LABELS,
  DEADLINES_LABELS,
  PAYMENT_TYPE_LABELS,
  PRICE_BRACKET_LABELS,
  QUOTE_ACCURACY_LABELS,
  reviewStatusLabel,
} from "@/lib/review-labels";
import type { SerializedBtpReferentiel } from "@/lib/btp-referentiel-types";
import {
  getBtpMetierLabelFromRef,
  getPrestationActiviteLabel,
} from "@/lib/btp-referentiel";
import {
  formatEurFromCents,
  formatEurPerCountableUnitFromCents,
  formatEurPerCubicMeterFromCents,
  formatEurPerLinearMeterFromCents,
  formatEurPerSquareMeter,
  formatEurPerSquareMeterFromCents,
} from "@/lib/format-money";
import type { PublicReviewPayload } from "@/lib/reviews-queries";
import { authorDisplayName } from "@/lib/reviews-queries";
import type { PublishedPriceStats } from "@/lib/reviews-price-stats";
import { formatRgeDomaineCode } from "@/lib/rge-domaines";
import { formatTrancheEffectif } from "@/lib/tranche-effectif";

function formatDateFr(iso: string | null): string {
  if (!iso) return "—";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return new Intl.DateTimeFormat("fr-FR", {
    day: "numeric",
    month: "long",
    year: "numeric",
  }).format(d);
}

function etatLabel(code: string | null): string {
  if (!code) return "—";
  if (code === "A") return "Active";
  if (code === "C") return "Cessée";
  return code;
}

function StarsRow({ rating }: { rating: number }) {
  const n = Math.min(5, Math.max(0, Math.round(rating)));
  return (
    <span className="text-amber-600 dark:text-amber-400" aria-label={`Note ${n} sur 5`}>
      {"★".repeat(n)}
      <span className="text-ink/25 dark:text-white/20">{"★".repeat(5 - n)}</span>
    </span>
  );
}

function formatReviewDate(d: Date): string {
  return new Intl.DateTimeFormat("fr-FR", {
    day: "numeric",
    month: "long",
    year: "numeric",
  }).format(d);
}

function formatPrestationReviewLine(
  r: PublicReviewPayload,
  ref: SerializedBtpReferentiel,
): string | null {
  const metierId = r.metierId ?? r.prestationMetierId;
  const specialiteId = r.specialiteId ?? r.prestationActiviteId;
  if (!metierId || !specialiteId) return null;
  const metier = getBtpMetierLabelFromRef(ref, metierId);
  const act = getPrestationActiviteLabel(ref, metierId, specialiteId);
  if (!act) return metier;
  return metier ? `${metier} — ${act}` : act;
}

export function EntrepriseFiche({
  detail,
  publishedReviews,
  myReview,
  isLoggedIn,
  priceStats,
  btpReferentiel,
  premiumContact,
}: {
  detail: EntrepriseDetail;
  publishedReviews: PublicReviewPayload[];
  myReview: { id: string; status: ReviewStatus } | null;
  isLoggedIn: boolean;
  priceStats: PublishedPriceStats | null;
  btpReferentiel: SerializedBtpReferentiel;
  premiumContact: PremiumContactInfo | null;
}) {
  const complementEntries = Object.entries(detail.complements).sort(([a], [b]) =>
    a.localeCompare(b, "fr"),
  );

  const estRge = detail.complements.est_rge === true;

  return (
    <div className="space-y-10">
      <header className="space-y-2 border-b border-ink/10 pb-8 dark:border-white/10">
        <h1 className="font-[family-name:var(--font-display)] text-3xl text-ink sm:text-4xl">
          {detail.nom}
        </h1>
        <p className="font-mono text-sm text-ink-soft">SIREN {detail.siren}</p>
        <p className="text-sm text-ink-soft">
          Les informations ci-dessous sont affichées à titre indicatif et peuvent être incomplètes
          ou évolutives.
        </p>
        {premiumContact ? (
          <div className="mt-6 flex flex-wrap items-center gap-3">
            <span className="rounded-full bg-accent/15 px-3 py-1 text-xs font-semibold text-accent dark:text-teal-200">
              Pro — contact activé
            </span>
            <ContactProButton raisonSociale={detail.nom} contact={premiumContact} />
          </div>
        ) : null}
      </header>

      {/* Synthèse légale */}
      <section className="rounded-2xl border border-[var(--card-border)] bg-[var(--card)] p-6 backdrop-blur-md">
        <h2 className="text-lg font-semibold text-ink">Identité & effectif</h2>
        <dl className="mt-4 grid gap-4 sm:grid-cols-2">
          <div>
            <dt className="text-xs font-semibold uppercase tracking-wider text-ink-soft">
              Date de création
            </dt>
            <dd className="mt-1 text-base text-ink">
              {formatDateFr(detail.dateCreation)}
            </dd>
          </div>
          <div>
            <dt className="text-xs font-semibold uppercase tracking-wider text-ink-soft">
              État administratif
            </dt>
            <dd className="mt-1 text-base text-ink">
              {etatLabel(detail.etatAdministratif)}
              {detail.dateFermeture ? (
                <span className="block text-sm text-ink-soft">
                  Cessation : {formatDateFr(detail.dateFermeture)}
                </span>
              ) : null}
            </dd>
          </div>
          <div>
            <dt className="text-xs font-semibold uppercase tracking-wider text-ink-soft">
              Catégorie d’entreprise
            </dt>
            <dd className="mt-1 text-base text-ink">
              {detail.categorieEntreprise ?? "—"}
              {detail.anneeCategorieEntreprise ? (
                <span className="text-ink-soft">
                  {" "}
                  (année {detail.anneeCategorieEntreprise})
                </span>
              ) : null}
            </dd>
          </div>
          <div>
            <dt className="text-xs font-semibold uppercase tracking-wider text-ink-soft">
              Tranche d’effectif salarié
            </dt>
            <dd className="mt-1 text-base text-ink">
              {formatTrancheEffectif(detail.trancheEffectif)}
              {detail.anneeTrancheEffectif ? (
                <span className="block text-sm text-ink-soft">
                  Référence {detail.anneeTrancheEffectif}
                </span>
              ) : null}
            </dd>
          </div>
        </dl>
      </section>

      {/* Compléments */}
      <section>
        <h2 className="text-lg font-semibold text-ink">Compléments</h2>
        <p className="mt-1 text-sm text-ink-soft">
          Indicateurs booléens et listes associés à la fiche.
        </p>
        <div className="mt-4 overflow-hidden rounded-2xl border border-[var(--card-border)]">
          <table className="w-full text-left text-sm">
            <thead className="bg-canvas-muted/60 text-xs uppercase tracking-wider text-ink-soft dark:bg-canvas-muted/30">
              <tr>
                <th className="px-4 py-3 font-semibold">Indicateur</th>
                <th className="px-4 py-3 font-semibold">Valeur</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-ink/10 dark:divide-white/10">
              {complementEntries.map(([key, value]) => (
                <tr key={key} className="bg-[var(--card)]/50">
                  <td className="px-4 py-3 align-top text-ink">
                    {complementKeyLabel(key)}
                  </td>
                  <td className="px-4 py-3 align-top text-ink-soft whitespace-pre-wrap break-words">
                    {formatComplementValue(value)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      {/* RGE */}
      <section>
        <h2 className="text-lg font-semibold text-ink">RGE — domaines déclarés</h2>
        <p className="mt-1 text-sm text-ink-soft">
          Codes de domaine pour le siège (et le cas échéant pour des établissements associés).
          Libellés indicatifs ; une nomenclature détaillée peut exister pour ces codes.
        </p>

        <div className="mt-4 rounded-2xl border border-[var(--card-border)] bg-[var(--card)] p-5 backdrop-blur-md">
          <p className="text-sm font-medium text-ink">
            Statut affiché :{" "}
            <span className={estRge ? "text-emerald-700 dark:text-emerald-400" : ""}>
              {estRge ? "Entreprise signalée RGE" : "Non signalée RGE dans ce bloc"}
            </span>
          </p>

          <h3 className="mt-6 text-sm font-semibold uppercase tracking-wider text-ink-soft">
            Siège
            {detail.rgeSiege.siret ? (
              <span className="ml-2 font-mono font-normal normal-case text-ink-soft">
                SIRET {detail.rgeSiege.siret}
              </span>
            ) : null}
          </h3>
          {detail.rgeSiege.codes.length === 0 ? (
            <p className="mt-2 text-sm text-ink-soft">
              Aucune liste de domaines RGE renseignée sur le siège dans ces données.
            </p>
          ) : (
            <ul className="mt-3 space-y-2">
              {detail.rgeSiege.codes.map((c) => {
                const { code, label } = formatRgeDomaineCode(c);
                return (
                  <li
                    key={`siege-${code}`}
                    className="rounded-xl border border-ink/10 bg-canvas/40 px-4 py-3 dark:border-white/10 dark:bg-canvas-muted/20"
                  >
                    <span className="font-mono text-sm font-semibold text-accent dark:text-teal-300">
                      {code}
                    </span>
                    <span className="mt-1 block text-sm text-ink">{label}</span>
                  </li>
                );
              })}
            </ul>
          )}

          {detail.rgeEtablissements.length > 0 && (
            <>
              <h3 className="mt-8 text-sm font-semibold uppercase tracking-wider text-ink-soft">
                Établissements (recherche) avec domaines RGE
              </h3>
              <ul className="mt-3 space-y-4">
                {detail.rgeEtablissements.map((et) => (
                  <li
                    key={et.siret}
                    className="rounded-xl border border-ink/10 bg-canvas/40 p-4 dark:border-white/10 dark:bg-canvas-muted/20"
                  >
                    <p className="font-mono text-sm text-ink">{et.siret}</p>
                    {et.adresse ? (
                      <p className="mt-1 text-sm text-ink-soft">{et.adresse}</p>
                    ) : null}
                    <ul className="mt-2 space-y-2">
                      {et.codes.map((c) => {
                        const { code, label } = formatRgeDomaineCode(c);
                        return (
                          <li key={code} className="text-sm">
                            <span className="font-mono font-semibold text-accent dark:text-teal-300">
                              {code}
                            </span>
                            <span className="text-ink"> — {label}</span>
                          </li>
                        );
                      })}
                    </ul>
                  </li>
                ))}
              </ul>
            </>
          )}
        </div>
      </section>

      {/* Avis clients */}
      <section id="avis" className="scroll-mt-24 space-y-6">
        <div>
          <h2 className="text-lg font-semibold text-ink">Avis clients</h2>
          <p className="mt-1 text-sm text-ink-soft">
            Avis soumis par des utilisateurs connectés et affichés sur la fiche. Une seule
            contribution par compte et par entreprise. Tu peux indiquer prestation et prix pour toute
            entreprise, même si elle n’est pas inscrite ici — aucun abonnement n’est requis.
          </p>
        </div>

        {priceStats && priceStats.count > 0 ? (
          <div className="rounded-2xl border border-teal-500/25 bg-teal-500/[0.07] p-5 dark:border-teal-500/30 dark:bg-teal-950/20">
            <h3 className="text-base font-semibold text-ink">Prix déclarés par les clients</h3>
            <p className="mt-1 text-xs text-ink-soft">
              Synthèse à partir des avis publiés ayant indiqué un montant payé ({priceStats.count}{" "}
              déclaration
              {priceStats.count > 1 ? "s" : ""}). Les montants sont fournis par les clients et ne
              sont pas vérifiés par la plateforme.
            </p>
            <dl className="mt-4 grid gap-3 sm:grid-cols-3">
              <div className="rounded-xl border border-ink/10 bg-[var(--card)]/80 px-4 py-3 dark:border-white/10">
                <dt className="text-xs font-semibold uppercase tracking-wider text-ink-soft">
                  Moyenne
                </dt>
                <dd className="mt-1 text-lg font-bold tabular-nums text-ink">
                  {formatEurFromCents(priceStats.avgCents)}
                </dd>
              </div>
              <div className="rounded-xl border border-ink/10 bg-[var(--card)]/80 px-4 py-3 dark:border-white/10">
                <dt className="text-xs font-semibold uppercase tracking-wider text-ink-soft">
                  Moins cher
                </dt>
                <dd className="mt-1 text-lg font-bold tabular-nums text-ink">
                  {formatEurFromCents(priceStats.minCents)}
                </dd>
              </div>
              <div className="rounded-xl border border-ink/10 bg-[var(--card)]/80 px-4 py-3 dark:border-white/10">
                <dt className="text-xs font-semibold uppercase tracking-wider text-ink-soft">
                  Plus élevé
                </dt>
                <dd className="mt-1 text-lg font-bold tabular-nums text-ink">
                  {formatEurFromCents(priceStats.maxCents)}
                </dd>
              </div>
            </dl>
            {priceStats.perM2 && priceStats.perM2.count > 0 ? (
              <div className="mt-5 border-t border-teal-500/20 pt-5 dark:border-teal-500/25">
                <h4 className="text-sm font-semibold text-ink">Prix au m² (avis avec surface renseignée)</h4>
                <p className="mt-1 text-xs text-ink-soft">
                  Moyenne des prix au m² calculés à partir du montant déclaré et de la surface (
                  {priceStats.perM2.count} avis).
                </p>
                <dl className="mt-3 grid gap-3 sm:grid-cols-3">
                  <div className="rounded-xl border border-ink/10 bg-[var(--card)]/80 px-4 py-3 dark:border-white/10">
                    <dt className="text-xs font-semibold uppercase tracking-wider text-ink-soft">
                      Moyenne / m²
                    </dt>
                    <dd className="mt-1 text-lg font-bold tabular-nums text-ink">
                      {formatEurPerSquareMeter(priceStats.perM2.avg)}
                    </dd>
                  </div>
                  <div className="rounded-xl border border-ink/10 bg-[var(--card)]/80 px-4 py-3 dark:border-white/10">
                    <dt className="text-xs font-semibold uppercase tracking-wider text-ink-soft">
                      Min. / m²
                    </dt>
                    <dd className="mt-1 text-lg font-bold tabular-nums text-ink">
                      {formatEurPerSquareMeter(priceStats.perM2.min)}
                    </dd>
                  </div>
                  <div className="rounded-xl border border-ink/10 bg-[var(--card)]/80 px-4 py-3 dark:border-white/10">
                    <dt className="text-xs font-semibold uppercase tracking-wider text-ink-soft">
                      Max. / m²
                    </dt>
                    <dd className="mt-1 text-lg font-bold tabular-nums text-ink">
                      {formatEurPerSquareMeter(priceStats.perM2.max)}
                    </dd>
                  </div>
                </dl>
              </div>
            ) : null}
            {priceStats.perMl && priceStats.perMl.count > 0 ? (
              <div className="mt-5 border-t border-teal-500/20 pt-5 dark:border-teal-500/25">
                <h4 className="text-sm font-semibold text-ink">Prix au ml (mètre linéaire)</h4>
                <p className="mt-1 text-xs text-ink-soft">{priceStats.perMl.count} avis avec linéaire renseigné.</p>
                <dl className="mt-3 grid gap-3 sm:grid-cols-3">
                  <div className="rounded-xl border border-ink/10 bg-[var(--card)]/80 px-4 py-3 dark:border-white/10">
                    <dt className="text-xs font-semibold uppercase tracking-wider text-ink-soft">Moyenne / ml</dt>
                    <dd className="mt-1 text-lg font-bold tabular-nums text-ink">
                      {formatEurPerSquareMeter(priceStats.perMl.avg)}
                    </dd>
                  </div>
                  <div className="rounded-xl border border-ink/10 bg-[var(--card)]/80 px-4 py-3 dark:border-white/10">
                    <dt className="text-xs font-semibold uppercase tracking-wider text-ink-soft">Min. / ml</dt>
                    <dd className="mt-1 text-lg font-bold tabular-nums text-ink">
                      {formatEurPerSquareMeter(priceStats.perMl.min)}
                    </dd>
                  </div>
                  <div className="rounded-xl border border-ink/10 bg-[var(--card)]/80 px-4 py-3 dark:border-white/10">
                    <dt className="text-xs font-semibold uppercase tracking-wider text-ink-soft">Max. / ml</dt>
                    <dd className="mt-1 text-lg font-bold tabular-nums text-ink">
                      {formatEurPerSquareMeter(priceStats.perMl.max)}
                    </dd>
                  </div>
                </dl>
              </div>
            ) : null}
            {priceStats.perM3 && priceStats.perM3.count > 0 ? (
              <div className="mt-5 border-t border-teal-500/20 pt-5 dark:border-teal-500/25">
                <h4 className="text-sm font-semibold text-ink">Prix au m³</h4>
                <p className="mt-1 text-xs text-ink-soft">{priceStats.perM3.count} avis avec volume renseigné.</p>
                <dl className="mt-3 grid gap-3 sm:grid-cols-3">
                  <div className="rounded-xl border border-ink/10 bg-[var(--card)]/80 px-4 py-3 dark:border-white/10">
                    <dt className="text-xs font-semibold uppercase tracking-wider text-ink-soft">Moyenne / m³</dt>
                    <dd className="mt-1 text-lg font-bold tabular-nums text-ink">
                      {formatEurPerSquareMeter(priceStats.perM3.avg)}
                    </dd>
                  </div>
                  <div className="rounded-xl border border-ink/10 bg-[var(--card)]/80 px-4 py-3 dark:border-white/10">
                    <dt className="text-xs font-semibold uppercase tracking-wider text-ink-soft">Min. / m³</dt>
                    <dd className="mt-1 text-lg font-bold tabular-nums text-ink">
                      {formatEurPerSquareMeter(priceStats.perM3.min)}
                    </dd>
                  </div>
                  <div className="rounded-xl border border-ink/10 bg-[var(--card)]/80 px-4 py-3 dark:border-white/10">
                    <dt className="text-xs font-semibold uppercase tracking-wider text-ink-soft">Max. / m³</dt>
                    <dd className="mt-1 text-lg font-bold tabular-nums text-ink">
                      {formatEurPerSquareMeter(priceStats.perM3.max)}
                    </dd>
                  </div>
                </dl>
              </div>
            ) : null}
            {priceStats.perUnit && priceStats.perUnit.count > 0 ? (
              <div className="mt-5 border-t border-teal-500/20 pt-5 dark:border-teal-500/25">
                <h4 className="text-sm font-semibold text-ink">Prix par unité</h4>
                <p className="mt-1 text-xs text-ink-soft">{priceStats.perUnit.count} avis avec quantité renseignée.</p>
                <dl className="mt-3 grid gap-3 sm:grid-cols-3">
                  <div className="rounded-xl border border-ink/10 bg-[var(--card)]/80 px-4 py-3 dark:border-white/10">
                    <dt className="text-xs font-semibold uppercase tracking-wider text-ink-soft">Moyenne / unité</dt>
                    <dd className="mt-1 text-lg font-bold tabular-nums text-ink">
                      {formatEurPerSquareMeter(priceStats.perUnit.avg)}
                    </dd>
                  </div>
                  <div className="rounded-xl border border-ink/10 bg-[var(--card)]/80 px-4 py-3 dark:border-white/10">
                    <dt className="text-xs font-semibold uppercase tracking-wider text-ink-soft">Min. / unité</dt>
                    <dd className="mt-1 text-lg font-bold tabular-nums text-ink">
                      {formatEurPerSquareMeter(priceStats.perUnit.min)}
                    </dd>
                  </div>
                  <div className="rounded-xl border border-ink/10 bg-[var(--card)]/80 px-4 py-3 dark:border-white/10">
                    <dt className="text-xs font-semibold uppercase tracking-wider text-ink-soft">Max. / unité</dt>
                    <dd className="mt-1 text-lg font-bold tabular-nums text-ink">
                      {formatEurPerSquareMeter(priceStats.perUnit.max)}
                    </dd>
                  </div>
                </dl>
              </div>
            ) : null}
          </div>
        ) : null}

        {publishedReviews.length === 0 ? (
          <p className="rounded-2xl border border-dashed border-ink/15 bg-canvas-muted/40 px-5 py-8 text-center text-sm text-ink-soft dark:border-white/10">
            Aucun avis publié pour l’instant. Sois le premier à partager ton expérience.
          </p>
        ) : (
          <ul className="space-y-4">
            {publishedReviews.map((r) => {
              const prestationLine = formatPrestationReviewLine(r, btpReferentiel);
              return (
              <li
                key={r.id}
                className="rounded-2xl border border-[var(--card-border)] bg-[var(--card)] p-5 backdrop-blur-md"
              >
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <p className="text-sm font-semibold text-ink">
                    {authorDisplayName(r.authorPseudo ?? r.author.name)}
                  </p>
                  <time className="text-xs text-ink-soft" dateTime={r.createdAt.toISOString()}>
                    {formatReviewDate(r.createdAt)}
                  </time>
                </div>
                <p className="mt-2 text-lg">
                  <StarsRow rating={r.ratingOverall} />
                  <span className="ml-2 text-sm font-medium text-ink-soft">{r.ratingOverall}/5</span>
                </p>
                {r.comment ? (
                  <p className="mt-3 whitespace-pre-wrap text-sm leading-relaxed text-ink">
                    {r.comment}
                  </p>
                ) : null}
                {r.photoBeforeUrl || r.photoAfterUrl ? (
                  <div className="mt-4 grid gap-3 sm:grid-cols-2">
                    {r.photoBeforeUrl ? (
                      <figure className="overflow-hidden rounded-xl border border-ink/10 bg-canvas-muted/30 dark:border-white/10">
                        <figcaption className="border-b border-ink/10 px-3 py-2 text-xs font-semibold uppercase tracking-wider text-ink-soft dark:border-white/10">
                          Avant
                        </figcaption>
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                          src={r.photoBeforeUrl}
                          alt={`Photo avant travaux — ${authorDisplayName(r.authorPseudo ?? r.author.name)}`}
                          className="h-auto max-h-64 w-full object-cover"
                          loading="lazy"
                        />
                      </figure>
                    ) : null}
                    {r.photoAfterUrl ? (
                      <figure className="overflow-hidden rounded-xl border border-ink/10 bg-canvas-muted/30 dark:border-white/10">
                        <figcaption className="border-b border-ink/10 px-3 py-2 text-xs font-semibold uppercase tracking-wider text-ink-soft dark:border-white/10">
                          Après
                        </figcaption>
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                          src={r.photoAfterUrl}
                          alt={`Photo après travaux — ${authorDisplayName(r.authorPseudo ?? r.author.name)}`}
                          className="h-auto max-h-64 w-full object-cover"
                          loading="lazy"
                        />
                      </figure>
                    ) : null}
                  </div>
                ) : null}
                {prestationLine ? (
                  <p className="mt-2 text-sm text-ink">
                    <span className="font-medium text-ink-soft">Prestation : </span>
                    {prestationLine}
                  </p>
                ) : null}
                {r.amountPaidCents != null ? (
                  <p className="mt-1 text-sm text-ink">
                    <span className="font-medium text-ink-soft">Montant payé déclaré : </span>
                    {formatEurFromCents(r.amountPaidCents)}
                  </p>
                ) : null}
                {r.surfaceM2 != null && r.surfaceM2 > 0 ? (
                  <p className="mt-1 text-sm text-ink">
                    <span className="font-medium text-ink-soft">Surface déclarée : </span>
                    {new Intl.NumberFormat("fr-FR", {
                      maximumFractionDigits: 2,
                    }).format(r.surfaceM2)}{" "}
                    m²
                  </p>
                ) : null}
                {r.linearMl != null && r.linearMl > 0 ? (
                  <p className="mt-1 text-sm text-ink">
                    <span className="font-medium text-ink-soft">Linéaire déclaré : </span>
                    {new Intl.NumberFormat("fr-FR", { maximumFractionDigits: 2 }).format(r.linearMl)} ml
                  </p>
                ) : null}
                {r.volumeM3 != null && r.volumeM3 > 0 ? (
                  <p className="mt-1 text-sm text-ink">
                    <span className="font-medium text-ink-soft">Volume déclaré : </span>
                    {new Intl.NumberFormat("fr-FR", { maximumFractionDigits: 2 }).format(r.volumeM3)} m³
                  </p>
                ) : null}
                {r.quantityUnits != null && r.quantityUnits > 0 ? (
                  <p className="mt-1 text-sm text-ink">
                    <span className="font-medium text-ink-soft">Quantité déclarée : </span>
                    {new Intl.NumberFormat("fr-FR", { maximumFractionDigits: 2 }).format(r.quantityUnits)}
                  </p>
                ) : null}
                {r.amountPaidCents != null &&
                r.surfaceM2 != null &&
                r.surfaceM2 > 0 &&
                (r.priceUnit == null || r.priceUnit === "M2") ? (
                  <p className="mt-1 text-sm font-medium text-teal-800 dark:text-teal-200">
                    <span className="font-medium text-ink-soft">Prix au m² : </span>
                    {formatEurPerSquareMeterFromCents(r.amountPaidCents, r.surfaceM2)}
                  </p>
                ) : null}
                {r.amountPaidCents != null &&
                r.linearMl != null &&
                r.linearMl > 0 &&
                r.priceUnit === "ML" ? (
                  <p className="mt-1 text-sm font-medium text-teal-800 dark:text-teal-200">
                    <span className="font-medium text-ink-soft">Prix au ml : </span>
                    {formatEurPerLinearMeterFromCents(r.amountPaidCents, r.linearMl)}
                  </p>
                ) : null}
                {r.amountPaidCents != null &&
                r.volumeM3 != null &&
                r.volumeM3 > 0 &&
                r.priceUnit === "M3" ? (
                  <p className="mt-1 text-sm font-medium text-teal-800 dark:text-teal-200">
                    <span className="font-medium text-ink-soft">Prix au m³ : </span>
                    {formatEurPerCubicMeterFromCents(r.amountPaidCents, r.volumeM3)}
                  </p>
                ) : null}
                {r.amountPaidCents != null &&
                r.quantityUnits != null &&
                r.quantityUnits > 0 &&
                r.priceUnit === "UNIT" ? (
                  <p className="mt-1 text-sm font-medium text-teal-800 dark:text-teal-200">
                    <span className="font-medium text-ink-soft">Prix par unité : </span>
                    {formatEurPerCountableUnitFromCents(r.amountPaidCents, r.quantityUnits)}
                  </p>
                ) : null}
                <ul className="mt-3 flex flex-wrap gap-2 text-xs text-ink-soft">
                  {r.priceBracket ? (
                    <li className="rounded-lg bg-canvas-muted/70 px-2 py-1 dark:bg-white/5">
                      Prix : {PRICE_BRACKET_LABELS[r.priceBracket]}
                    </li>
                  ) : null}
                  {r.deadlinesKept ? (
                    <li className="rounded-lg bg-canvas-muted/70 px-2 py-1 dark:bg-white/5">
                      Délais : {DEADLINES_LABELS[r.deadlinesKept]}
                    </li>
                  ) : null}
                  {r.availability ? (
                    <li className="rounded-lg bg-canvas-muted/70 px-2 py-1 dark:bg-white/5">
                      Dispo : {AVAILABILITY_LABELS[r.availability]}
                    </li>
                  ) : null}
                  {r.paymentType ? (
                    <li className="rounded-lg bg-canvas-muted/70 px-2 py-1 dark:bg-white/5">
                      Paiement : {PAYMENT_TYPE_LABELS[r.paymentType]}
                    </li>
                  ) : null}
                  {r.quoteVsPaid ? (
                    <li className="rounded-lg bg-canvas-muted/70 px-2 py-1 dark:bg-white/5">
                      Devis : {QUOTE_ACCURACY_LABELS[r.quoteVsPaid]}
                    </li>
                  ) : null}
                </ul>
                {r.response ? (
                  <div className="mt-4 border-t border-ink/10 pt-4 dark:border-white/10">
                    <p className="text-xs font-semibold uppercase tracking-wider text-ink-soft">
                      Réponse de l’entreprise
                    </p>
                    <p className="mt-2 whitespace-pre-wrap text-sm text-ink">{r.response.body}</p>
                    <p className="mt-1 text-xs text-ink-soft">
                      {formatReviewDate(r.response.createdAt)}
                    </p>
                  </div>
                ) : null}
              </li>
              );
            })}
          </ul>
        )}

        <div className="rounded-2xl border border-[var(--card-border)] bg-[var(--card)] p-6 backdrop-blur-md">
          <h3 className="text-base font-semibold text-ink">Laisser un avis</h3>
          {!isLoggedIn ? (
            <p className="mt-3 text-sm text-ink-soft">
              <Link
                href={`/connexion?next=${encodeURIComponent(`/entreprise/${detail.siren}`)}`}
                className="font-semibold text-teal-700 underline-offset-4 hover:underline dark:text-teal-400"
              >
                Connecte-toi
              </Link>{" "}
              (ou crée un compte) pour déposer un avis sur cette entreprise.
            </p>
          ) : myReview ? (
            <p
              className={
                myReview.status === "PUBLISHED"
                  ? "mt-3 rounded-xl border border-emerald-500/25 bg-emerald-500/10 px-4 py-3 text-sm text-ink dark:text-emerald-100"
                  : "mt-3 rounded-xl border border-amber-500/25 bg-amber-500/10 px-4 py-3 text-sm text-ink"
              }
            >
              Tu as déjà déposé un avis ici — statut :{" "}
              <strong>{reviewStatusLabel(myReview.status)}</strong>.
              {myReview.status === "PENDING"
                ? " Tu recevras une confirmation lorsqu’il sera traité."
                : null}
            </p>
          ) : (
            <div className="mt-4">
              <ReviewForm siren={detail.siren} referentiel={btpReferentiel} />
            </div>
          )}
        </div>
      </section>

      <p className="text-center text-sm text-ink-soft">
        <Link href="/" className="font-medium text-accent hover:underline dark:text-teal-300">
          ← Nouvelle recherche
        </Link>
      </p>
    </div>
  );
}

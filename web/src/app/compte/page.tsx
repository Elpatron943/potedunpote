import type { Metadata } from "next";
import Link from "next/link";
import { requireClientAccountPage } from "@/lib/client-account";
import {
  getBtpMetierLabelFromRef,
  getBtpReferentiel,
  getPrestationActiviteLabel,
  serializeBtpReferentiel,
} from "@/lib/btp-referentiel";
import { getEntrepriseDetail } from "@/lib/entreprise-detail";
import { formatEurFromCents, formatEurPerSquareMeterFromCents } from "@/lib/format-money";
import { reviewStatusLabel } from "@/lib/review-labels";
import { getOptionalProContext } from "@/lib/pro-auth";
import { getReviewsByAuthorId } from "@/lib/reviews-queries";

export const metadata: Metadata = {
  title: "Mon compte",
  description: "Avis laissés, accès rapide à la recherche et à ton profil membre.",
};

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

export default async function ComptePage() {
  const user = await requireClientAccountPage();

  const [reviews, btpRef, proCtx] = await Promise.all([
    getReviewsByAuthorId(user.userId),
    getBtpReferentiel(),
    getOptionalProContext(),
  ]);
  const ref = serializeBtpReferentiel(btpRef);

  const uniqueSirens = [...new Set(reviews.map((r) => r.siren))];
  const details = await Promise.all(uniqueSirens.map((s) => getEntrepriseDetail(s)));
  const nomBySiren = new Map(
    uniqueSirens.map((s, i) => [s, details[i]?.nom ?? `Entreprise ${s}`]),
  );

  function prestationLine(metierId: string | null, specialiteId: string | null): string | null {
    if (!metierId || !specialiteId) return null;
    const metier = getBtpMetierLabelFromRef(ref, metierId);
    const act = getPrestationActiviteLabel(ref, metierId, specialiteId);
    if (!act) return metier;
    return metier ? `${metier} — ${act}` : act;
  }

  return (
    <div className="mx-auto max-w-2xl space-y-10">
      <header>
        <h2 className="font-[family-name:var(--font-display)] text-2xl font-semibold text-ink sm:text-3xl">
          Bienvenue{user.name?.trim() ? `, ${user.name.trim()}` : ""}
        </h2>
        <p className="mt-2 text-sm text-ink-soft">
          Retrouve ici les avis que tu as publiés et accède rapidement à la recherche.
        </p>
      </header>

      <section className="rounded-2xl border border-ink/10 bg-[var(--card)] p-5 shadow-sm dark:border-white/10">
        <h3 className="text-sm font-semibold uppercase tracking-wider text-ink-soft">Raccourcis</h3>
        <ul className="mt-3 flex flex-wrap gap-2">
          <li>
            <Link
              href="/"
              className="inline-flex rounded-xl bg-teal-700 px-4 py-2.5 text-sm font-bold text-white shadow-sm transition hover:bg-teal-800 dark:bg-teal-600 dark:hover:bg-teal-500"
            >
              Nouvelle recherche
            </Link>
          </li>
          <li>
            <Link
              href="/compte#mes-avis"
              className="inline-flex rounded-xl border border-ink/15 bg-canvas-muted/50 px-4 py-2.5 text-sm font-semibold text-ink transition hover:bg-canvas-muted dark:border-white/10 dark:bg-white/5"
            >
              Voir mes avis
            </Link>
          </li>
          {proCtx && !proCtx.artisanProfile ? (
            <li>
              <Link
                href="/pro/onboarding"
                className="inline-flex rounded-xl border border-teal-600/30 bg-teal-500/10 px-4 py-2.5 text-sm font-semibold text-teal-900 transition hover:bg-teal-500/15 dark:border-teal-500/30 dark:text-teal-200 dark:hover:bg-teal-500/10"
              >
                Espace pro — vérification Kbis
              </Link>
            </li>
          ) : null}
          {proCtx?.artisanProfile ? (
            <li>
              <Link
                href="/pro/tableau"
                className="inline-flex rounded-xl border border-teal-600/30 bg-teal-500/10 px-4 py-2.5 text-sm font-semibold text-teal-900 transition hover:bg-teal-500/15 dark:border-teal-500/30 dark:text-teal-200 dark:hover:bg-teal-500/10"
              >
                Espace professionnel
              </Link>
            </li>
          ) : null}
        </ul>
      </section>

      <section id="mes-avis" className="scroll-mt-24 space-y-4">
        <div className="flex flex-wrap items-end justify-between gap-2">
          <h3 className="text-lg font-semibold text-ink">Mes avis</h3>
          {reviews.length > 0 ? (
            <span className="text-xs font-medium text-ink-soft">
              {reviews.length} avis enregistré{reviews.length > 1 ? "s" : ""}
            </span>
          ) : null}
        </div>

        {reviews.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-ink/15 bg-canvas-muted/30 px-6 py-10 text-center text-sm text-ink-soft dark:border-white/10">
            Tu n’as pas encore laissé d’avis. Lance une{" "}
            <Link href="/" className="font-semibold text-teal-700 underline-offset-2 hover:underline dark:text-teal-400">
              recherche par métier et lieu
            </Link>
            , ouvre une fiche entreprise et dépose un avis après ton chantier.
          </div>
        ) : (
          <ul className="space-y-4">
            {reviews.map((r) => {
              const nom = nomBySiren.get(r.siren) ?? r.siren;
              const presta = prestationLine(r.metierId, r.specialiteId);
              return (
                <li
                  key={r.id}
                  className="rounded-2xl border border-[var(--card-border)] bg-[var(--card)] p-5 backdrop-blur-md"
                >
                  <div className="flex flex-wrap items-start justify-between gap-2">
                    <div>
                      <p className="font-semibold text-ink">
                        <Link
                          href={`/entreprise/${r.siren}`}
                          className="text-teal-800 hover:underline dark:text-teal-300"
                        >
                          {nom}
                        </Link>
                      </p>
                      <p className="mt-0.5 font-mono text-xs text-ink-soft">SIREN {r.siren}</p>
                    </div>
                    <div className="text-right text-xs text-ink-soft">
                      <time dateTime={r.createdAt.toISOString()}>{formatReviewDate(r.createdAt)}</time>
                      <p className="mt-1">
                        <span
                          className={
                            r.status === "PUBLISHED"
                              ? "rounded-full bg-emerald-500/15 px-2 py-0.5 font-medium text-emerald-900 dark:text-emerald-200"
                              : "rounded-full bg-amber-500/15 px-2 py-0.5 font-medium text-amber-950 dark:text-amber-200"
                          }
                        >
                          {reviewStatusLabel(r.status)}
                        </span>
                      </p>
                    </div>
                  </div>
                  <p className="mt-3 text-lg">
                    <StarsRow rating={r.ratingOverall} />
                    <span className="ml-2 text-sm font-medium text-ink-soft">{r.ratingOverall}/5</span>
                  </p>
                  {r.authorPseudo ? (
                    <p className="mt-1 text-xs text-ink-soft">
                      Pseudo sur la fiche :{" "}
                      <span className="font-medium text-ink">{r.authorPseudo}</span>
                    </p>
                  ) : null}
                  {r.comment ? (
                    <p className="mt-2 whitespace-pre-wrap text-sm leading-relaxed text-ink">{r.comment}</p>
                  ) : null}
                  {presta ? (
                    <p className="mt-2 text-sm text-ink">
                      <span className="font-medium text-ink-soft">Prestation : </span>
                      {presta}
                    </p>
                  ) : null}
                  {r.amountPaidCents != null ? (
                    <p className="mt-1 text-sm text-ink">
                      <span className="font-medium text-ink-soft">Montant déclaré : </span>
                      {formatEurFromCents(r.amountPaidCents)}
                    </p>
                  ) : null}
                  {r.surfaceM2 != null && r.surfaceM2 > 0 ? (
                    <p className="mt-1 text-sm text-ink">
                      <span className="font-medium text-ink-soft">Surface : </span>
                      {new Intl.NumberFormat("fr-FR", { maximumFractionDigits: 2 }).format(r.surfaceM2)} m²
                    </p>
                  ) : null}
                  {r.amountPaidCents != null && r.surfaceM2 != null && r.surfaceM2 > 0 ? (
                    <p className="mt-1 text-sm font-medium text-teal-800 dark:text-teal-200">
                      Prix au m² : {formatEurPerSquareMeterFromCents(r.amountPaidCents, r.surfaceM2)}
                    </p>
                  ) : null}
                  <p className="mt-4">
                    <Link
                      href={`/entreprise/${r.siren}#avis`}
                      className="text-sm font-semibold text-teal-700 underline-offset-2 hover:underline dark:text-teal-400"
                    >
                      Voir sur la fiche →
                    </Link>
                  </p>
                </li>
              );
            })}
          </ul>
        )}
      </section>
    </div>
  );
}

import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getEntrepriseDetail } from "@/lib/entreprise-detail";
import { getSession } from "@/lib/auth-session";
import { getPublishedPriceStatsForSiren } from "@/lib/reviews-price-stats";
import { getPublishedReviewsForSiren, getUserReviewForSiren } from "@/lib/reviews-queries";
import { getBtpReferentiel, serializeBtpReferentiel } from "@/lib/btp-referentiel";
import { EntrepriseFiche } from "./entreprise-fiche";

type PageProps = {
  params: Promise<{ siren: string }>;
};

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { siren } = await params;
  if (!/^\d{9}$/.test(siren)) {
    return { title: "Entreprise" };
  }
  const detail = await getEntrepriseDetail(siren);
  if (!detail) {
    return { title: "Entreprise introuvable" };
  }
  return {
    title: detail.nom,
    description: `Fiche ${detail.nom} (SIREN ${siren}) — données publiques.`,
  };
}

export default async function EntreprisePage({ params }: PageProps) {
  const { siren } = await params;
  if (!/^\d{9}$/.test(siren)) {
    notFound();
  }

  const [detail, session] = await Promise.all([
    getEntrepriseDetail(siren),
    getSession(),
  ]);

  if (!detail) {
    return (
      <div className="min-h-screen bg-canvas px-4 py-12 sm:px-6">
        <div className="mx-auto max-w-lg space-y-4 text-center">
          <h1 className="font-[family-name:var(--font-display)] text-2xl text-ink">
            Entreprise introuvable
          </h1>
          <p className="text-sm text-ink-soft">
            Aucune fiche ne correspond à ce SIREN pour le moment, ou le service est temporairement
            indisponible.
          </p>
          <Link
            href="/"
            className="inline-block font-medium text-accent underline dark:text-teal-300"
          >
            Retour à l’accueil
          </Link>
        </div>
      </div>
    );
  }

  const [publishedReviews, myReview, priceStats, btpRef] = await Promise.all([
    getPublishedReviewsForSiren(siren),
    session ? getUserReviewForSiren(session.userId, siren) : Promise.resolve(null),
    getPublishedPriceStatsForSiren(siren),
    getBtpReferentiel(),
  ]);
  const btpReferentiel = serializeBtpReferentiel(btpRef);

  return (
    <div className="min-h-screen bg-canvas px-4 py-10 sm:px-6">
      <div className="mx-auto max-w-3xl">
        <p className="mb-8 text-sm text-ink-soft">
          <Link
            href="/"
            className="font-medium text-accent transition hover:underline dark:text-teal-300"
          >
            ← Accueil & recherche
          </Link>
        </p>
        <EntrepriseFiche
          detail={detail}
          publishedReviews={publishedReviews}
          myReview={myReview}
          isLoggedIn={session != null}
          priceStats={priceStats}
          btpReferentiel={btpReferentiel}
        />
      </div>
    </div>
  );
}

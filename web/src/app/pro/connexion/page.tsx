import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { ConnexionForm } from "@/components/connexion-form";
import { PORTAIL_ACHETEUR_CONNEXION } from "@/lib/auth-portals";

export const metadata: Metadata = {
  title: "Connexion artisan",
  description:
    "Connexion ou inscription pour les professionnels du bâtiment — offres Pro et visibilité.",
};

function ConnexionFallback() {
  return (
    <div className="mx-auto max-w-md animate-pulse rounded-2xl border border-ink/10 bg-canvas-muted/40 p-8 dark:border-white/10">
      <div className="h-10 rounded-xl bg-ink/10 dark:bg-white/10" />
      <div className="mt-6 h-12 rounded-2xl bg-ink/10 dark:bg-white/10" />
      <div className="mt-4 h-12 rounded-2xl bg-ink/10 dark:bg-white/10" />
    </div>
  );
}

export default function ProConnexionPage() {
  return (
    <div className="min-h-[70vh] bg-canvas px-4 py-12 sm:px-6">
      <p className="mx-auto max-w-lg text-center text-sm text-ink-soft">
        <Link href="/pro" className="font-medium text-teal-700 hover:underline dark:text-teal-400">
          ← Présentation Pro
        </Link>
        {" · "}
        <Link href="/pro/forfaits" className="font-medium text-teal-700 hover:underline dark:text-teal-400">
          Forfaits & tarifs
        </Link>
      </p>
      <div className="mx-auto mt-6 max-w-lg text-center">
        <p className="text-xs font-semibold uppercase tracking-wider text-teal-800 dark:text-teal-300">
          Espace professionnel
        </p>
        <h1 className="mt-2 font-[family-name:var(--font-display)] text-3xl text-ink">
          Connexion Pro
        </h1>
        <p className="mt-2 text-sm text-ink-soft">
          Compte artisan pour accéder aux offres Pro, booster ta fiche et suivre ta visibilité. L’inscription
          exige une <strong className="font-medium text-ink">vérification par code e-mail</strong> (même
          principe que pour les particuliers).
        </p>
        <p className="mt-3 text-sm text-ink-soft">
          Tu veux seulement laisser un avis en tant que particulier ?{" "}
          <a
            href={PORTAIL_ACHETEUR_CONNEXION}
            className="font-medium text-teal-700 underline decoration-teal-700/30 underline-offset-2 hover:decoration-teal-700 dark:text-teal-400"
          >
            Portail particuliers
          </a>
        </p>
      </div>
      <div className="mx-auto mt-10 max-w-lg">
        <Suspense fallback={<ConnexionFallback />}>
          <ConnexionForm portal="pro" />
        </Suspense>
      </div>
    </div>
  );
}

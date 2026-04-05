import type { Metadata } from "next";
import { Suspense } from "react";
import { ConnexionForm } from "@/components/connexion-form";
import { PORTAIL_PRO_CONNEXION } from "@/lib/auth-portals";

export const metadata: Metadata = {
  title: "Connexion",
  description: "Connexion ou inscription pour laisser un avis sur une entreprise du BTP.",
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

export default function ConnexionPage() {
  return (
    <div className="min-h-[70vh] bg-canvas px-4 py-12 sm:px-6">
      <div className="mx-auto max-w-lg text-center">
        <p className="text-xs font-semibold uppercase tracking-wider text-ink-soft">
          Particuliers & avis
        </p>
        <h1 className="mt-2 font-[family-name:var(--font-display)] text-3xl text-ink">
          Connexion
        </h1>
        <p className="mt-2 text-sm text-ink-soft">
          Compte gratuit pour déposer un avis. L’inscription envoie un <strong className="font-medium text-ink">code par e-mail</strong> ; après validation, tu es connecté automatiquement.
        </p>
        <p className="mt-3 text-sm text-ink-soft">
          Tu es artisan et tu cherches les offres Pro ?{" "}
          <a
            href={PORTAIL_PRO_CONNEXION}
            className="font-medium text-teal-700 underline decoration-teal-700/30 underline-offset-2 hover:decoration-teal-700 dark:text-teal-400"
          >
            Espace professionnel
          </a>
        </p>
      </div>
      <div className="mx-auto mt-10 max-w-lg">
        <Suspense fallback={<ConnexionFallback />}>
          <ConnexionForm portal="acheteur" />
        </Suspense>
      </div>
    </div>
  );
}

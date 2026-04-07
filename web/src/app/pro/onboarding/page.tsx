import { Suspense } from "react";
import Link from "next/link";
import { redirect } from "next/navigation";

import { ProOnboardingForm } from "./pro-onboarding-form";
import { requireProContext } from "@/lib/pro-auth";

export default async function ProOnboardingPage() {
  const ctx = await requireProContext();
  if (ctx.artisanProfile) {
    redirect("/pro/tableau");
  }

  return (
    <div className="min-h-[70vh] bg-canvas px-4 py-12 sm:px-6">
      <div className="mx-auto max-w-lg text-center">
        <p className="text-xs font-semibold uppercase tracking-wider text-teal-800 dark:text-teal-300">
          Espace professionnel
        </p>
        <h1 className="mt-2 font-[family-name:var(--font-display)] text-3xl text-ink">
          Associer ton entreprise
        </h1>
        <p className="mt-2 text-sm text-ink-soft">
          Même si tu t’es inscrit comme <strong className="text-ink">particulier</strong>, tu peux activer
          l’espace pro ici : ce n’est qu’<strong className="text-ink">après cette vérification Kbis</strong>{" "}
          qu’un profil entreprise est créé. Dépose un <strong className="text-ink">Kbis de moins de 3 mois</strong>{" "}
          (mention « À jour au … » lisible), au format image, et indique le <strong className="text-ink">SIREN</strong>
          . Vérification automatique du document et de la date.
        </p>
        <p className="mt-3 text-sm text-ink-soft">
          Compte connecté : <span className="font-medium text-ink">{ctx.email}</span>
        </p>
      </div>
      <div className="mx-auto mt-10 max-w-lg">
        <Suspense fallback={<div className="h-32 animate-pulse rounded-2xl border border-ink/10 bg-canvas-muted/40 dark:border-white/10" />}>
          <ProOnboardingForm />
        </Suspense>
        <p className="mt-6 text-center text-sm text-ink-soft">
          <Link href="/" className="font-medium text-teal-700 hover:underline dark:text-teal-400">
            ← Retour à la recherche
          </Link>
        </p>
      </div>
    </div>
  );
}


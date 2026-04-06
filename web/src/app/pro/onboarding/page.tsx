import { Suspense } from "react";
import Link from "next/link";

import { ProOnboardingForm } from "./pro-onboarding-form";
import { requireProContext } from "@/lib/pro-auth";

export default async function ProOnboardingPage() {
  const ctx = await requireProContext();

  return (
    <div className="min-h-[70vh] bg-canvas px-4 py-12 sm:px-6">
      <div className="mx-auto max-w-lg text-center">
        <p className="text-xs font-semibold uppercase tracking-wider text-teal-800 dark:text-teal-300">
          Espace professionnel
        </p>
        <h1 className="mt-2 font-[family-name:var(--font-display)] text-3xl text-ink">
          Créer ton profil artisan
        </h1>
        <p className="mt-2 text-sm text-ink-soft">
          Pour activer les options Pro, on associe ton compte à ton entreprise via ton <strong className="text-ink">SIREN</strong>.
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


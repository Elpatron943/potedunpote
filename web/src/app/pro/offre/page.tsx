import Link from "next/link";
import { Suspense } from "react";

import { requireProContext } from "@/lib/pro-auth";
import { ProOfferForm } from "./pro-offer-form";

export default async function ProOfferPage() {
  const ctx = await requireProContext();

  return (
    <div className="min-h-screen bg-canvas px-4 py-10 sm:px-6">
      <div className="mx-auto max-w-3xl">
        <p className="text-sm text-ink-soft">
          <Link href="/pro" className="font-medium text-teal-700 hover:underline dark:text-teal-400">
            ← Retour au tableau de bord
          </Link>
        </p>

        <header className="mt-6 border-b border-ink/10 pb-6 dark:border-white/10">
          <p className="text-xs font-semibold uppercase tracking-wider text-teal-800 dark:text-teal-300">
            Offre Pro (sans Stripe)
          </p>
          <h1 className="mt-2 font-[family-name:var(--font-display)] text-3xl text-ink">
            Choisir une formule
          </h1>
          <p className="mt-2 text-sm text-ink-soft">
            Pour l’instant, la souscription est <strong className="text-ink">activée immédiatement</strong> (mode démo).
            Tu pourras brancher Stripe ensuite.
          </p>
          {ctx.artisanProfile ? (
            <p className="mt-2 text-sm text-ink-soft">
              SIREN : <span className="font-medium text-ink">{ctx.artisanProfile.siren}</span>
            </p>
          ) : (
            <p className="mt-2 text-sm text-warm">
              Tu dois d’abord créer ton profil artisan (SIREN) avant de choisir une offre.
            </p>
          )}
        </header>

        <div className="mt-8">
          <Suspense fallback={<div className="h-40 animate-pulse rounded-2xl border border-ink/10 bg-canvas-muted/40 dark:border-white/10" />}>
            <ProOfferForm disabled={!ctx.artisanProfile} />
          </Suspense>
        </div>
      </div>
    </div>
  );
}


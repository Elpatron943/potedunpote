import Link from "next/link";
import { Suspense } from "react";
import { redirect } from "next/navigation";

import { requireProContext } from "@/lib/pro-auth";
import { ProProfileForm } from "./pro-profile-form";
import { getBtpReferentiel, serializeBtpReferentiel } from "@/lib/btp-referentiel";

export default async function ProProfilePage() {
  const ctx = await requireProContext();
  if (!ctx.artisanProfile) redirect("/pro/onboarding");
  const ref = serializeBtpReferentiel(await getBtpReferentiel());

  return (
    <div className="min-h-screen bg-canvas px-4 py-10 sm:px-6">
      <div className="mx-auto max-w-3xl">
        <p className="text-sm text-ink-soft">
          <Link href="/pro/tableau" className="font-medium text-teal-700 hover:underline dark:text-teal-400">
            ← Retour au tableau de bord
          </Link>
        </p>

        <header className="mt-6 border-b border-ink/10 pb-6 dark:border-white/10">
          <p className="text-xs font-semibold uppercase tracking-wider text-teal-800 dark:text-teal-300">
            Profil artisan
          </p>
          <h1 className="mt-2 font-[family-name:var(--font-display)] text-3xl text-ink">
            Coordonnées & prestations
          </h1>
          <p className="mt-2 text-sm text-ink-soft">
            Ces informations alimentent le bouton <strong className="text-ink">Contacter</strong> et les filtres de recherche.
          </p>
        </header>

        <div className="mt-8">
          <Suspense fallback={<div className="h-40 animate-pulse rounded-2xl border border-ink/10 bg-canvas-muted/40 dark:border-white/10" />}>
            <ProProfileForm
              initialProfile={ctx.artisanProfile}
              referentiel={ref}
            />
          </Suspense>
        </div>
      </div>
    </div>
  );
}


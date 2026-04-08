import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { Suspense } from "react";

import { requireProContext } from "@/lib/pro-auth";
import { hasPlanAtLeast } from "@/lib/pro-plan";
import { getSupabaseAdmin } from "@/lib/supabase/admin";
import { LaborProfileCreateForm } from "./labor-profile-create-form";
import { LaborProfileRow } from "./labor-profile-row";

export const metadata: Metadata = {
  title: "Profils temps (main d’œuvre)",
  description: "Profils personnalisables et TJM interne pour valoriser le temps sur les chantiers.",
};

export default async function ProProfilsMoPage() {
  const ctx = await requireProContext();
  if (!ctx.artisanProfile) redirect("/pro/onboarding");
  const planId = ctx.subscription.planId;
  if (!ctx.subscription.isActive || !planId || !hasPlanAtLeast(planId, "pilotage")) {
    redirect("/pro/offre");
  }

  const supabase = getSupabaseAdmin();
  const { data: rows, error } = await supabase
    .from("ProLaborProfile")
    .select("id,label,internalTjmCents,sortOrder,createdAt")
    .eq("siren", ctx.artisanProfile.siren)
    .order("sortOrder", { ascending: true })
    .order("createdAt", { ascending: true });

  const profiles = (error ? [] : (rows ?? [])) as {
    id: string;
    label: string;
    internalTjmCents: number;
    sortOrder: number;
    createdAt: string;
  }[];

  return (
    <div className="min-h-screen bg-canvas px-4 py-10 sm:px-6">
      <div className="mx-auto max-w-3xl space-y-8">
        <p className="text-sm text-ink-soft">
          <Link href="/pro/chantiers" className="font-medium text-teal-700 hover:underline dark:text-teal-400">
            ← Chantiers
          </Link>
          {" · "}
          <Link href="/pro/catalog" className="font-medium text-teal-700 hover:underline dark:text-teal-400">
            Catalogue
          </Link>
          {" · "}
          <Link href="/pro/tableau" className="font-medium text-teal-700 hover:underline dark:text-teal-400">
            Tableau de bord
          </Link>
        </p>

        <header className="border-b border-ink/10 pb-6 dark:border-white/10">
          <p className="text-xs font-semibold uppercase tracking-wider text-teal-800 dark:text-teal-300">Pro Pilotage</p>
          <h1 className="mt-2 font-[family-name:var(--font-display)] text-3xl text-ink">Profils temps</h1>
          <p className="mt-2 text-sm text-ink-soft">
            Crée tes propres profils (chef d’équipe, compagnon, apprenti, etc.) avec un{" "}
            <strong className="font-medium text-ink">TJM interne en €/jour</strong>. À la saisie du temps sur un chantier, tu choisis
            le profil ; sinon le <strong className="font-medium text-ink">TJM du chantier</strong> sert de repli. Valorisation : 8 h = 1 jour.
          </p>
        </header>

        <section className="rounded-2xl border border-[var(--card-border)] bg-[var(--card)] p-6 shadow-sm dark:border-white/10">
          <h2 className="text-lg font-semibold text-ink">Nouveau profil</h2>
          <div className="mt-4">
            <Suspense fallback={<div className="h-24 animate-pulse rounded-xl bg-canvas-muted/30" />}>
              <LaborProfileCreateForm />
            </Suspense>
          </div>
        </section>

        <section className="rounded-2xl border border-[var(--card-border)] bg-[var(--card)] p-6 shadow-sm dark:border-white/10">
          <h2 className="text-lg font-semibold text-ink">Tes profils ({profiles.length})</h2>
          {profiles.length === 0 ? (
            <p className="mt-3 text-sm text-ink-soft">Aucun profil pour l’instant — ajoute-en un ci-dessus.</p>
          ) : (
            <ul className="mt-4 space-y-4">
              {profiles.map((p) => (
                <LaborProfileRow key={p.id} profileId={p.id} label={p.label} internalTjmCents={p.internalTjmCents} />
              ))}
            </ul>
          )}
          <p className="mt-4 text-xs text-ink-soft">
            Ces montants sont des <strong className="font-medium text-ink">coûts internes</strong> (pas le prix facturé au client).
          </p>
        </section>
      </div>
    </div>
  );
}

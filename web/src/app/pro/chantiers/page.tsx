import Link from "next/link";
import { redirect } from "next/navigation";
import { Suspense } from "react";

import { requireProContext } from "@/lib/pro-auth";
import { hasPlanAtLeast } from "@/lib/pro-plan";
import { getSupabaseAdmin } from "@/lib/supabase/admin";
import { ProjectsCreateForm } from "./projects-create-form";

export default async function ProChantiersPage() {
  const ctx = await requireProContext();
  if (!ctx.artisanProfile) redirect("/pro/onboarding");
  const planId = ctx.subscription.planId;
  if (!ctx.subscription.isActive || !planId || !hasPlanAtLeast(planId, "pilotage")) {
    redirect("/pro/offre");
  }

  const supabase = getSupabaseAdmin();
  const { data: projects, error } = await supabase
    .from("ProProject")
    .select("id,title,clientName,status,createdAt")
    .eq("siren", ctx.artisanProfile.siren)
    .order("createdAt", { ascending: false })
    .limit(200);
  if (error) throw error;

  return (
    <div className="min-h-screen bg-canvas px-4 py-10 sm:px-6">
      <div className="mx-auto max-w-3xl">
        <p className="text-sm text-ink-soft">
          <Link href="/pro/tableau" className="font-medium text-teal-700 hover:underline dark:text-teal-400">
            ← Retour au tableau de bord
          </Link>
          {" · "}
          <Link href="/pro/catalog" className="font-medium text-teal-700 hover:underline dark:text-teal-400">
            Catalogue
          </Link>
        </p>

        <header className="mt-6 border-b border-ink/10 pb-6 dark:border-white/10">
          <p className="text-xs font-semibold uppercase tracking-wider text-teal-800 dark:text-teal-300">
            Pro Pilotage
          </p>
          <h1 className="mt-2 font-[family-name:var(--font-display)] text-3xl text-ink">Chantiers</h1>
          <p className="mt-2 text-sm text-ink-soft">
            Suivi interne : devis, factures, temps, dépenses (sans Stripe).
          </p>
        </header>

        <div className="mt-8">
          <Suspense fallback={<div className="h-40 animate-pulse rounded-2xl border border-ink/10 bg-canvas-muted/40 dark:border-white/10" />}>
            <ProjectsCreateForm />
          </Suspense>
        </div>

        <section className="mt-8 rounded-2xl border border-[var(--card-border)] bg-[var(--card)] p-6 shadow-sm dark:border-white/10">
          <h2 className="text-lg font-semibold text-ink">Liste</h2>
          {!projects || projects.length === 0 ? (
            <p className="mt-3 text-sm text-ink-soft">Aucun chantier.</p>
          ) : (
            <ul className="mt-4 space-y-3">
              {(projects as any[]).map((p) => (
                <li key={p.id as string} className="rounded-xl border border-ink/10 bg-canvas/40 px-4 py-3 dark:border-white/10 dark:bg-canvas-muted/20">
                  <div className="flex flex-wrap items-start justify-between gap-2">
                    <div>
                      <p className="font-semibold text-ink">{p.title as string}</p>
                      <p className="mt-0.5 text-xs text-ink-soft">
                        {(p.clientName as string | null) ? `Client : ${p.clientName as string} · ` : ""}Statut {(p.status as string) || "OPEN"}
                      </p>
                    </div>
                    <Link
                      href={`/pro/chantiers/${p.id as string}`}
                      className="inline-flex min-h-[2.25rem] items-center justify-center rounded-lg bg-teal-700 px-3 py-2 text-xs font-bold text-white transition hover:bg-teal-800 dark:bg-teal-600 dark:hover:bg-teal-500"
                    >
                      Ouvrir →
                    </Link>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>
    </div>
  );
}


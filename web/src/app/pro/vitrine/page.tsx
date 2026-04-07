import Link from "next/link";
import { redirect } from "next/navigation";
import { Suspense } from "react";

import { requireProContext } from "@/lib/pro-auth";
import { hasPlanAtLeast } from "@/lib/pro-plan";
import { getSupabaseAdmin } from "@/lib/supabase/admin";
import { VitrinePhotosForm } from "./vitrine-photos-form";

export default async function ProVitrinePage() {
  const ctx = await requireProContext();
  if (!ctx.artisanProfile) redirect("/pro/onboarding");
  const planId = ctx.subscription.planId;
  if (!ctx.subscription.isActive || !planId || !hasPlanAtLeast(planId, "vitrine")) {
    redirect("/pro/offre");
  }

  const supabase = getSupabaseAdmin();
  const { data: photos, error } = await supabase
    .from("ProjectPhoto")
    .select("id, storageKey, caption, createdAt")
    .eq("artisanId", ctx.artisanProfile.id)
    .order("createdAt", { ascending: false })
    .limit(60);
  if (error) throw error;

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
            Pro Vitrine
          </p>
          <h1 className="mt-2 font-[family-name:var(--font-display)] text-3xl text-ink">
            Vitrine & photos
          </h1>
          <p className="mt-2 text-sm text-ink-soft">
            Tes photos apparaissent sur ta vitrine publique.
          </p>
          <p className="mt-3 text-sm">
            <Link
              href={`/vitrine/${ctx.artisanProfile.siren}`}
              className="font-semibold text-teal-700 underline-offset-2 hover:underline dark:text-teal-400"
            >
              Voir ma vitrine publique →
            </Link>
          </p>
        </header>

        <div className="mt-8">
          <Suspense fallback={<div className="h-40 animate-pulse rounded-2xl border border-ink/10 bg-canvas-muted/40 dark:border-white/10" />}>
            <VitrinePhotosForm siren={ctx.artisanProfile.siren} photos={(photos ?? []) as any[]} />
          </Suspense>
        </div>
      </div>
    </div>
  );
}


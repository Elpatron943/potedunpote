import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { Suspense } from "react";

import { requireProContext } from "@/lib/pro-auth";
import { hasPlanAtLeast } from "@/lib/pro-plan";
import { getSupabaseAdmin } from "@/lib/supabase/admin";
import { CatalogCreateForm } from "./catalog-create-form";
import { CatalogItemRow, type CatalogItemRowData } from "./catalog-item-row";

export const metadata: Metadata = {
  title: "Catalogue devis & factures",
  description: "Articles, main d’œuvre (TJM), sous-traitance — Pilotage Pro.",
};

export default async function ProCatalogPage() {
  const ctx = await requireProContext();
  if (!ctx.artisanProfile) redirect("/pro/onboarding");
  const planId = ctx.subscription.planId;
  if (!ctx.subscription.isActive || !planId || !hasPlanAtLeast(planId, "pilotage")) {
    redirect("/pro/offre");
  }

  const supabase = getSupabaseAdmin();
  const { data: rows, error } = await supabase
    .from("ProCatalogItem")
    .select("id,kind,label,description,unit,purchaseUnitPriceCents,saleUnitPriceCents,sortOrder,createdAt")
    .eq("siren", ctx.artisanProfile.siren)
    .order("sortOrder", { ascending: true })
    .order("createdAt", { ascending: false })
    .limit(500);

  const items = (error ? [] : (rows ?? [])) as CatalogItemRowData[];

  return (
    <div className="min-h-screen bg-canvas px-4 py-10 sm:px-6">
      <div className="mx-auto max-w-3xl space-y-8">
        <p className="text-sm text-ink-soft">
          <Link href="/pro/chantiers" className="font-medium text-teal-700 hover:underline dark:text-teal-400">
            ← Chantiers
          </Link>
          {" · "}
          <Link href="/pro/tableau" className="font-medium text-teal-700 hover:underline dark:text-teal-400">
            Tableau de bord
          </Link>
          {" · "}
          <Link href="/pro/profils-mo" className="font-medium text-teal-700 hover:underline dark:text-teal-400">
            Profils temps
          </Link>
        </p>

        <header className="border-b border-ink/10 pb-6 dark:border-white/10">
          <p className="text-xs font-semibold uppercase tracking-wider text-teal-800 dark:text-teal-300">Pro Pilotage</p>
          <h1 className="mt-2 font-[family-name:var(--font-display)] text-3xl text-ink">Catalogue</h1>
          <p className="mt-2 text-sm text-ink-soft">
            Référentiel prix pour composer tes devis et factures : fournitures, main d’œuvre (ex. TJM en unité « jour »),
            sous-traitance. Les montants sont repris sur les chantiers lorsque tu insères une ligne depuis le catalogue.
          </p>
        </header>

        <section className="rounded-2xl border border-[var(--card-border)] bg-[var(--card)] p-6 shadow-sm dark:border-white/10">
          <h2 className="text-lg font-semibold text-ink">Nouvelle ligne catalogue</h2>
          <div className="mt-4">
            <Suspense fallback={<div className="h-32 animate-pulse rounded-xl bg-canvas-muted/30" />}>
              <CatalogCreateForm />
            </Suspense>
          </div>
        </section>

        <section className="rounded-2xl border border-[var(--card-border)] bg-[var(--card)] p-6 shadow-sm dark:border-white/10">
          <h2 className="text-lg font-semibold text-ink">Ton catalogue ({items.length})</h2>
          {items.length === 0 ? (
            <p className="mt-3 text-sm text-ink-soft">Aucun article pour l’instant — ajoute-en un ci‑dessus.</p>
          ) : (
            <ul className="mt-4 space-y-4">
              {items.map((it) => (
                <CatalogItemRow key={it.id} item={it} />
              ))}
            </ul>
          )}
        </section>
      </div>
    </div>
  );
}

import Link from "next/link";
import { notFound } from "next/navigation";

import { getEntrepriseDetail } from "@/lib/entreprise-detail";
import { getSupabaseAdmin } from "@/lib/supabase/admin";
import { getPublicProPlanForSiren } from "@/lib/pro-plan-public";
import { hasPlanAtLeast } from "@/lib/pro-plan";
import { getPremiumContactForSiren } from "@/lib/artisan-premium-contact";
import { ContactProButton } from "@/components/contact-pro-button";

export default async function VitrinePage({ params }: { params: Promise<{ siren: string }> }) {
  const { siren } = await params;
  if (!/^\d{9}$/.test(siren)) notFound();

  const [detail, plan, premium] = await Promise.all([
    getEntrepriseDetail(siren),
    getPublicProPlanForSiren(siren),
    getPremiumContactForSiren(siren),
  ]);
  if (!detail) notFound();
  if (!plan?.active || !hasPlanAtLeast(plan.planId, "vitrine")) notFound();

  const supabase = getSupabaseAdmin();
  const { data: prof } = await supabase
    .from("ArtisanProfile")
    .select("id,vitrineHeadline,vitrineBio")
    .eq("siren", siren)
    .maybeSingle();

  const { data: photos } = await supabase
    .from("ProjectPhoto")
    .select("id, storageKey, caption, createdAt")
    .eq("artisanId", (prof?.id as string) ?? "")
    .order("createdAt", { ascending: false })
    .limit(60);

  const headline = (prof?.vitrineHeadline as string | null) ?? null;
  const bio = (prof?.vitrineBio as string | null) ?? null;

  return (
    <div className="min-h-screen bg-canvas px-4 py-10 sm:px-6">
      <div className="mx-auto max-w-3xl space-y-8">
        <p className="text-sm text-ink-soft">
          <Link href={`/entreprise/${siren}`} className="font-medium text-teal-700 hover:underline dark:text-teal-400">
            ← Fiche entreprise
          </Link>
        </p>

        <header className="rounded-2xl border border-[var(--card-border)] bg-[var(--card)] p-6 shadow-sm dark:border-white/10">
          <p className="text-xs font-semibold uppercase tracking-wider text-warm">Vitrine</p>
          <h1 className="mt-2 font-[family-name:var(--font-display)] text-3xl text-ink sm:text-4xl">
            {detail.nom}
          </h1>
          {headline ? <p className="mt-3 text-lg text-ink">{headline}</p> : null}
          {bio ? <p className="mt-3 whitespace-pre-wrap text-sm leading-relaxed text-ink-soft">{bio}</p> : null}
          {premium ? (
            <div className="mt-5">
              <ContactProButton raisonSociale={detail.nom} contact={premium} />
            </div>
          ) : null}
        </header>

        <section className="rounded-2xl border border-[var(--card-border)] bg-[var(--card)] p-6 shadow-sm dark:border-white/10">
          <h2 className="text-lg font-semibold text-ink">Photos de chantiers</h2>
          {!photos || photos.length === 0 ? (
            <p className="mt-3 text-sm text-ink-soft">Aucune photo pour l’instant.</p>
          ) : (
            <ul className="mt-4 grid gap-4 sm:grid-cols-2">
              {(photos as any[]).map((p) => (
                <li key={p.id as string} className="overflow-hidden rounded-xl border border-ink/10 dark:border-white/10">
                  <div className="border-b border-ink/10 bg-canvas-muted/30 px-3 py-2 text-xs text-ink-soft dark:border-white/10">
                    {(p.caption as string | null) ?? "Chantier"}
                  </div>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={`/api/pro/vitrine/photo?key=${encodeURIComponent(p.storageKey as string)}`}
                    alt={(p.caption as string | null) ?? "Photo chantier"}
                    className="h-auto max-h-80 w-full object-cover"
                    loading="lazy"
                  />
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>
    </div>
  );
}


import Link from "next/link";
import { redirect } from "next/navigation";

import { requireProContext } from "@/lib/pro-auth";
import { getSupabaseAdmin } from "@/lib/supabase/admin";

export default async function ProTableauPage() {
  const ctx = await requireProContext();
  if (!ctx.artisanProfile) {
    redirect("/pro/onboarding");
  }

  const supabase = getSupabaseAdmin();
  const { data: sub } = await supabase
    .from("ProSubscription")
    .select("id, planId, status, currentPeriodEnd, updatedAt")
    .eq("userId", ctx.userId)
    .maybeSingle();

  const planId = (sub?.planId as string | undefined) ?? "—";
  const status = (sub?.status as string | undefined) ?? "INACTIVE";
  const until = (sub?.currentPeriodEnd as string | null | undefined) ?? null;

  return (
    <div className="min-h-screen bg-canvas px-4 py-10 sm:px-6">
      <div className="mx-auto max-w-3xl">
        <p className="text-sm text-ink-soft">
          <Link href="/pro" className="font-medium text-teal-700 hover:underline dark:text-teal-400">
            ← Espace Pro (présentation)
          </Link>
        </p>

        <header className="mb-8 mt-6 border-b border-ink/10 pb-6 dark:border-white/10">
          <p className="text-xs font-semibold uppercase tracking-wider text-teal-800 dark:text-teal-300">
            Espace professionnel
          </p>
          <h1 className="mt-2 font-[family-name:var(--font-display)] text-3xl text-ink">
            Tableau de bord
          </h1>
          <p className="mt-2 text-sm text-ink-soft">
            Compte : <span className="font-medium text-ink">{ctx.email}</span>
            {ctx.artisanProfile?.siren ? (
              <>
                {" "}
                · SIREN : <span className="font-medium text-ink">{ctx.artisanProfile.siren}</span>
              </>
            ) : null}
          </p>
        </header>

        <section className="rounded-2xl border border-[var(--card-border)] bg-[var(--card)] p-6 shadow-sm dark:border-white/10">
          <h2 className="text-lg font-semibold text-ink">Offre & options</h2>
          <p className="mt-2 text-sm text-ink-soft">
            Statut : <span className="font-medium text-ink">{status}</span> · Plan :{" "}
            <span className="font-medium text-ink">{planId}</span>
            {until ? (
              <>
                {" "}
                · fin période :{" "}
                <span className="font-medium text-ink">{new Date(until).toLocaleDateString("fr-FR")}</span>
              </>
            ) : null}
          </p>
          <div className="mt-4 flex flex-wrap gap-3">
            <Link
              href="/pro/offre"
              className="inline-flex min-h-[2.75rem] items-center justify-center rounded-xl bg-teal-700 px-4 py-2.5 text-sm font-bold text-white shadow-sm transition hover:bg-teal-800 dark:bg-teal-600 dark:hover:bg-teal-500"
            >
              Choisir / modifier l’offre
            </Link>
            <Link
              href="/pro/profil"
              className="inline-flex min-h-[2.75rem] items-center justify-center rounded-xl border border-ink/15 bg-canvas-muted/40 px-4 py-2.5 text-sm font-semibold text-ink transition hover:bg-canvas-muted/60 dark:border-white/15 dark:bg-white/5"
            >
              Compléter mon profil (contact, prestations…)
            </Link>
          </div>
        </section>

        <p className="mt-8 text-sm text-ink-soft">
          Formules & tarifs :{" "}
          <Link href="/pro/forfaits" className="font-medium text-teal-700 hover:underline dark:text-teal-400">
            /pro/forfaits
          </Link>
        </p>
      </div>
    </div>
  );
}

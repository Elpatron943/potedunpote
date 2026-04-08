import Link from "next/link";
import { redirect } from "next/navigation";

import { requireProContext } from "@/lib/pro-auth";
import { hasPlanAtLeast, type ProPlanId } from "@/lib/pro-plan";
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

  const planIdRaw = (sub?.planId as string | undefined) ?? null;
  const planId =
    planIdRaw === "essentiel" ||
    planIdRaw === "relation" ||
    planIdRaw === "vitrine" ||
    planIdRaw === "pilotage"
      ? (planIdRaw as ProPlanId)
      : null;
  const status = (sub?.status as string | undefined) ?? "INACTIVE";
  const until = (sub?.currentPeriodEnd as string | null | undefined) ?? null;

  // KPI pipeline (demandes → devis → commandes → factures) + chantiers terminés.
  // NB: ProQuote/ProInvoice n'ont pas de champ siren : on filtre via projectId et/ou leadId des demandes du SIREN.
  const siren = ctx.artisanProfile.siren;
  const [{ data: projIdsRes }, { data: leadIdsRes }] = await Promise.all([
    supabase.from("ProProject").select("id").eq("siren", siren).limit(2000),
    supabase.from("ProLead").select("id").eq("siren", siren).limit(2000),
  ]);
  const projectIds = (projIdsRes ?? [])
    .map((r) => String((r as { id?: unknown }).id ?? ""))
    .filter(Boolean);
  const leadIdsForSiren = (leadIdsRes ?? [])
    .map((r) => String((r as { id?: unknown }).id ?? ""))
    .filter(Boolean);

  const quoteArchivedOrParts: string[] = [];
  if (projectIds.length) quoteArchivedOrParts.push(`projectId.in.(${projectIds.join(",")})`);
  if (leadIdsForSiren.length) quoteArchivedOrParts.push(`leadId.in.(${leadIdsForSiren.join(",")})`);
  const quotesArchivedPromise =
    quoteArchivedOrParts.length === 0
      ? Promise.resolve({ count: 0 } as { count: number | null })
      : supabase
          .from("ProQuote")
          .select("id", { count: "exact", head: true })
          .in("status", ["CANCELLED", "ARCHIVED"])
          .or(quoteArchivedOrParts.join(","));

  const [
    leadsPendingRes,
    quotesSentAwaitingRes,
    ordersValidatedRes,
    ordersInvoicedRes,
    quotesArchivedRes,
    leadsArchivedRes,
    projectsOpenRes,
    projectsClosedRes,
  ] = await Promise.all([
    supabase
      .from("ProLead")
      .select("id", { count: "exact", head: true })
      .eq("siren", siren)
      .eq("status", "NEW"),
    projectIds.length === 0
      ? Promise.resolve({ count: 0 } as { count: number | null })
      : supabase
          .from("ProQuote")
          .select("id", { count: "exact", head: true })
          .in("projectId", projectIds)
          .eq("status", "SENT")
          .eq("source", "LEAD"),
    projectIds.length === 0
      ? Promise.resolve({ count: 0 } as { count: number | null })
      : supabase
          .from("ProQuote")
          .select("id", { count: "exact", head: true })
          .in("projectId", projectIds)
          .eq("status", "ACCEPTED"),
    projectIds.length === 0
      ? Promise.resolve({ count: 0 } as { count: number | null })
      : supabase
          .from("ProQuote")
          .select("id", { count: "exact", head: true })
          .in("projectId", projectIds)
          .eq("status", "INVOICED"),
    quotesArchivedPromise,
    supabase
      .from("ProLead")
      .select("id", { count: "exact", head: true })
      .eq("siren", siren)
      .eq("status", "ARCHIVED"),
    supabase
      .from("ProProject")
      .select("id", { count: "exact", head: true })
      .eq("siren", siren)
      .eq("status", "OPEN"),
    supabase
      .from("ProProject")
      .select("id", { count: "exact", head: true })
      .eq("siren", siren)
      .eq("status", "CLOSED"),
  ]);

  const leadsPending = leadsPendingRes.count ?? 0;
  const quotesAwaitingValidation = quotesSentAwaitingRes.count ?? 0;
  const ordersValidated = ordersValidatedRes.count ?? 0;
  const ordersInvoiced = ordersInvoicedRes.count ?? 0;
  const quotesArchived = quotesArchivedRes.count ?? 0;
  const leadsArchived = leadsArchivedRes.count ?? 0;
  const projectsOpen = projectsOpenRes.count ?? 0;
  const projectsClosed = projectsClosedRes.count ?? 0;

  return (
    <div className="min-h-screen bg-canvas px-4 py-10 sm:px-6">
      <div className="mx-auto max-w-3xl">
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

        <section className="mb-6 rounded-2xl border border-violet-500/20 bg-[var(--card)] p-6 shadow-sm dark:border-violet-500/25 dark:bg-[var(--card)]">
          <p className="text-xs font-semibold uppercase tracking-wider text-violet-800 dark:text-violet-300">Commercial</p>
          <h2 className="mt-1 text-lg font-semibold text-ink">Pipeline ventes et facturation</h2>
          <p className="mt-2 text-sm text-ink-soft">
            Demandes de devis, devis envoyés en attente de validation, commandes (devis acceptés), factures, et dossiers classés sans
            suite (demandes archivées, devis refusés ou archivés).
          </p>
          <dl className="mt-4 grid gap-3 text-sm sm:grid-cols-2">
            <div className="rounded-xl border border-ink/10 bg-canvas/40 px-4 py-3 dark:border-white/10 dark:bg-canvas-muted/20">
              <dt className="text-xs font-semibold uppercase tracking-wider text-ink-soft">Demandes de devis (en attente)</dt>
              <dd className="mt-1 flex items-baseline justify-between gap-3">
                <span className="text-2xl font-semibold tabular-nums text-ink">{leadsPending}</span>
                <Link href="/pro/demandes" className="text-xs font-semibold text-teal-700 hover:underline dark:text-teal-400">
                  Voir →
                </Link>
              </dd>
            </div>
            <div className="rounded-xl border border-ink/10 bg-canvas/40 px-4 py-3 dark:border-white/10 dark:bg-canvas-muted/20">
              <dt className="text-xs font-semibold uppercase tracking-wider text-ink-soft">Devis (attente validation)</dt>
              <dd className="mt-1 flex items-baseline justify-between gap-3">
                <span className="text-2xl font-semibold tabular-nums text-ink">{quotesAwaitingValidation}</span>
                <Link href="/pro/chantiers" className="text-xs font-semibold text-teal-700 hover:underline dark:text-teal-400">
                  Ouvrir →
                </Link>
              </dd>
            </div>
            <div className="rounded-xl border border-ink/10 bg-canvas/40 px-4 py-3 dark:border-white/10 dark:bg-canvas-muted/20">
              <dt className="text-xs font-semibold uppercase tracking-wider text-ink-soft">Commandes validées</dt>
              <dd className="mt-1 flex items-baseline justify-between gap-3">
                <span className="text-2xl font-semibold tabular-nums text-ink">{ordersValidated}</span>
                <Link href="/pro/chantiers" className="text-xs font-semibold text-teal-700 hover:underline dark:text-teal-400">
                  Ouvrir →
                </Link>
              </dd>
            </div>
            <div className="rounded-xl border border-ink/10 bg-canvas/40 px-4 py-3 dark:border-white/10 dark:bg-canvas-muted/20">
              <dt className="text-xs font-semibold uppercase tracking-wider text-ink-soft">Commandes facturées</dt>
              <dd className="mt-1 flex items-baseline justify-between gap-3">
                <span className="text-2xl font-semibold tabular-nums text-ink">{ordersInvoiced}</span>
                <Link href="/pro/chantiers" className="text-xs font-semibold text-teal-700 hover:underline dark:text-teal-400">
                  Ouvrir →
                </Link>
              </dd>
            </div>
            <div className="rounded-xl border border-ink/10 bg-canvas/40 px-4 py-3 dark:border-white/10 dark:bg-canvas-muted/20">
              <dt className="text-xs font-semibold uppercase tracking-wider text-ink-soft">Devis archivés ou sans suite</dt>
              <dd className="mt-1 flex flex-col gap-1 sm:flex-row sm:items-baseline sm:justify-between sm:gap-3">
                <span className="text-2xl font-semibold tabular-nums text-ink">{quotesArchived}</span>
                <div className="flex flex-wrap gap-x-3 gap-y-1 text-xs font-semibold text-teal-700 dark:text-teal-400">
                  <Link href="/pro/demandes?quotes=archived" className="hover:underline">
                    Demandes →
                  </Link>
                  <Link href="/pro/chantiers" className="hover:underline">
                    Chantiers →
                  </Link>
                </div>
              </dd>
              <p className="mt-2 text-[11px] leading-snug text-ink-soft">
                Statuts <span className="font-mono">CANCELLED</span> (refus / perdu) ou <span className="font-mono">ARCHIVED</span> (classé sans
                décision), sur tes chantiers ou tes demandes.
              </p>
            </div>
            <div className="rounded-xl border border-ink/10 bg-canvas/40 px-4 py-3 dark:border-white/10 dark:bg-canvas-muted/20">
              <dt className="text-xs font-semibold uppercase tracking-wider text-ink-soft">Demandes archivées (non suivies)</dt>
              <dd className="mt-1 flex items-baseline justify-between gap-3">
                <span className="text-2xl font-semibold tabular-nums text-ink">{leadsArchived}</span>
                <Link
                  href="/pro/demandes?status=ARCHIVED"
                  className="text-xs font-semibold text-teal-700 hover:underline dark:text-teal-400"
                >
                  Voir →
                </Link>
              </dd>
              <p className="mt-2 text-[11px] leading-snug text-ink-soft">
                Statut « Archivé » : demande que tu as classée sans traitement commercial abouti (à distinguer de « Clôturé » / dossier
                conclu).
              </p>
            </div>
          </dl>
        </section>

        <section className="mb-6 rounded-2xl border border-teal-500/25 bg-[var(--card)] p-6 shadow-sm dark:border-teal-400/20 dark:bg-[var(--card)]">
          <p className="text-xs font-semibold uppercase tracking-wider text-teal-800 dark:text-teal-300">Opérations</p>
          <h2 className="mt-1 text-lg font-semibold text-ink">Chantiers</h2>
          <p className="mt-2 text-sm text-ink-soft">
            Suivi des chantiers ouverts et clôturés (pilotage, temps, dépenses, rentabilité).
          </p>
          <dl className="mt-4 grid gap-3 text-sm sm:grid-cols-2">
            <div className="rounded-xl border border-ink/10 bg-canvas/40 px-4 py-3 dark:border-white/10 dark:bg-canvas-muted/20">
              <dt className="text-xs font-semibold uppercase tracking-wider text-ink-soft">Chantiers en cours</dt>
              <dd className="mt-1 flex items-baseline justify-between gap-3">
                <span className="text-2xl font-semibold tabular-nums text-ink">{projectsOpen}</span>
                <Link href="/pro/chantiers" className="text-xs font-semibold text-teal-700 hover:underline dark:text-teal-400">
                  Voir →
                </Link>
              </dd>
            </div>
            <div className="rounded-xl border border-ink/10 bg-canvas/40 px-4 py-3 dark:border-white/10 dark:bg-canvas-muted/20">
              <dt className="text-xs font-semibold uppercase tracking-wider text-ink-soft">Chantiers clôturés</dt>
              <dd className="mt-1 flex items-baseline justify-between gap-3">
                <span className="text-2xl font-semibold tabular-nums text-ink">{projectsClosed}</span>
                <Link href="/pro/chantiers" className="text-xs font-semibold text-teal-700 hover:underline dark:text-teal-400">
                  Voir chantiers →
                </Link>
              </dd>
            </div>
          </dl>
          <p className="mt-3 text-xs text-ink-soft">
            Astuce : un chantier peut contenir plusieurs commandes (devis acceptés) et plusieurs factures. Un chantier
            <span className="font-medium text-ink"> clôturé</span> correspond au statut <span className="font-mono">CLOSED</span>.
          </p>
        </section>
      </div>
    </div>
  );
}

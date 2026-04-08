import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { Suspense } from "react";

import { requireProContext } from "@/lib/pro-auth";
import { hasPlanAtLeast } from "@/lib/pro-plan";
import { formatEurFromCents } from "@/lib/format-money";
import { isProCatalogKind, type ProCatalogKind } from "@/lib/pro-catalog-kinds";
import type { ProCatalogPickerItem } from "@/lib/pro-catalog-types";
import { resolveQuoteRecipientEmail } from "@/lib/pro-quote-recipient";
import { getSupabaseAdmin } from "@/lib/supabase/admin";
import { ChantierTabsNav, parseChantierTab, type ChantierTabId } from "./chantier-tabs-nav";
import { ClientEmailForm } from "./client-email-form";
import { QuoteCreateForm } from "./quote-create-form";
import { QuoteCommandeWorkflow, QuoteDevisWorkflow } from "./quote-workflow-forms";
import { InvoiceCreateForm } from "./invoice-create-form";
import { InvoiceStatusForm } from "./invoice-status-form";
import { TimeCreateForm } from "./time-create-form";
import { ExpenseCreateForm } from "./expense-create-form";
import { InternalTjmForm } from "./internal-tjm-form";

function fmtDate(iso: string | null): string {
  if (!iso) return "—";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return new Intl.DateTimeFormat("fr-FR", { day: "numeric", month: "long", year: "numeric" }).format(d);
}

function sumCentsInvoicesBilled(rows: { status?: unknown; totalCents?: unknown }[]): number {
  return rows
    .filter((r) => (r.status as string) !== "DRAFT")
    .reduce((s, r) => s + (typeof r.totalCents === "number" ? r.totalCents : 0), 0);
}

function sumCentsInvoicesPaid(rows: { status?: unknown; totalCents?: unknown }[]): number {
  return rows
    .filter((r) => (r.status as string) === "PAID")
    .reduce((s, r) => s + (typeof r.totalCents === "number" ? r.totalCents : 0), 0);
}

function sumCentsExpenses(rows: { amountCents?: unknown }[]): number {
  return rows.reduce((s, r) => s + (typeof r.amountCents === "number" ? r.amountCents : 0), 0);
}

function sumMinutes(rows: { minutes?: unknown }[]): number {
  return rows.reduce((s, r) => s + (typeof r.minutes === "number" ? r.minutes : 0), 0);
}

function formatDurationMinutes(totalMin: number): string {
  if (totalMin <= 0) return "0 min";
  const h = Math.floor(totalMin / 60);
  const m = totalMin % 60;
  if (h === 0) return `${m} min`;
  if (m === 0) return `${h} h`;
  return `${h} h ${m} min`;
}

function laborCostCentsForMinutes(minutes: number, tjmCents: number): number {
  const hours = Math.max(0, minutes) / 60;
  const hourly = tjmCents / 8; // 8 h = 1 jour
  return Math.round(hours * hourly);
}

function sumTimeEntriesLaborCents(
  entries: { minutes?: unknown; laborProfileId?: unknown }[],
  profileTjmById: Map<string, number>,
  projectTjmCents: number | null,
): number | null {
  let sum = 0;
  let counted = false;
  for (const e of entries) {
    const m = typeof e.minutes === "number" ? e.minutes : 0;
    const pid = typeof e.laborProfileId === "string" && e.laborProfileId.trim() ? e.laborProfileId.trim() : null;
    let tjm: number | null = null;
    if (pid && profileTjmById.has(pid)) {
      const v = profileTjmById.get(pid)!;
      if (v > 0) tjm = v;
    }
    if (tjm == null && projectTjmCents != null && projectTjmCents > 0) {
      tjm = projectTjmCents;
    }
    if (tjm != null && tjm > 0) {
      sum += laborCostCentsForMinutes(m, tjm);
      counted = true;
    }
  }
  return counted ? sum : null;
}

function quoteStatusLabel(status: string): string {
  switch (status) {
    case "DRAFT":
      return "Brouillon";
    case "SENT":
      return "Envoyé au client";
    case "ACCEPTED":
      return "Commande (accepté)";
    case "INVOICED":
      return "Facturé";
    case "CANCELLED":
      return "Annulé";
    case "ARCHIVED":
      return "Archivé";
    default:
      return status || "Brouillon";
  }
}

function quoteSourceBadge(source: string | null | undefined): { label: string; className: string } | null {
  const s = source || "MANUAL";
  if (s === "LEAD") {
    return {
      label: "Depuis demande entrante",
      className:
        "bg-violet-500/15 text-violet-900 ring-violet-500/30 dark:bg-violet-500/20 dark:text-violet-100 dark:ring-violet-400/30",
    };
  }
  if (s === "MANUAL") {
    return {
      label: "Devis manuel",
      className: "bg-slate-500/10 text-slate-700 ring-slate-400/25 dark:text-slate-200 dark:ring-white/15",
    };
  }
  return null;
}

function quoteStatusRaw(q: Record<string, unknown>): string {
  return (q.status as string) || "DRAFT";
}

function isDevisTabQuote(st: string): boolean {
  return st === "DRAFT" || st === "SENT" || st === "CANCELLED" || st === "ARCHIVED";
}

function isCommandeTabQuote(st: string): boolean {
  return st === "ACCEPTED" || st === "INVOICED";
}

export default async function ProChantierDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ tab?: string }>;
}) {
  const { id } = await params;
  const sp = await searchParams;
  const tab: ChantierTabId = parseChantierTab(sp.tab);

  const ctx = await requireProContext();
  if (!ctx.artisanProfile) redirect("/pro/onboarding");
  const planId = ctx.subscription.planId;
  if (!ctx.subscription.isActive || !planId || !hasPlanAtLeast(planId, "pilotage")) {
    redirect("/pro/offre");
  }

  const supabase = getSupabaseAdmin();
  const { data: proj, error } = await supabase.from("ProProject").select("*").eq("id", id).maybeSingle();
  if (error || !proj) notFound();
  if ((proj.siren as string) !== ctx.artisanProfile.siren) notFound();

  const recipientEmail = await resolveQuoteRecipientEmail(supabase, {
    sourceLeadId: proj.sourceLeadId as string | null | undefined,
    clientEmail: proj.clientEmail as string | null | undefined,
  });

  const [quotes, invoices, timeEntries, expenses, catalogRes, laborProfilesRes] = await Promise.all([
    supabase.from("ProQuote").select("*").eq("projectId", id).order("createdAt", { ascending: false }),
    supabase.from("ProInvoice").select("*").eq("projectId", id).order("createdAt", { ascending: false }),
    supabase
      .from("ProTimeEntry")
      .select("id,minutes,workDate,note,createdAt,laborProfileId")
      .eq("projectId", id)
      .order("createdAt", { ascending: false }),
    supabase.from("ProExpense").select("id,label,amountCents,category,expenseDate,note,createdAt").eq("projectId", id).order("createdAt", { ascending: false }),
    supabase
      .from("ProCatalogItem")
      .select("id,kind,label,unit,purchaseUnitPriceCents,saleUnitPriceCents")
      .eq("siren", ctx.artisanProfile.siren)
      .order("sortOrder", { ascending: true })
      .order("createdAt", { ascending: false })
      .limit(500),
    supabase
      .from("ProLaborProfile")
      .select("id,label,internalTjmCents,sortOrder,createdAt")
      .eq("siren", ctx.artisanProfile.siren)
      .order("sortOrder", { ascending: true })
      .order("createdAt", { ascending: true }),
  ]);

  const catalogItems: ProCatalogPickerItem[] = (catalogRes.error ? [] : (catalogRes.data ?? []))
    .filter((r) => isProCatalogKind(String((r as { kind?: string }).kind)))
    .map((r) => {
      const row = r as {
        id: string;
        kind: string;
        label: string;
        unit: string | null;
        purchaseUnitPriceCents: number | null;
        saleUnitPriceCents: number | null;
      };
      return {
        id: row.id,
        kind: row.kind as ProCatalogKind,
        label: row.label,
        unit: row.unit?.trim() ? row.unit : "forfait",
        purchaseUnitPriceCents: typeof row.purchaseUnitPriceCents === "number" ? row.purchaseUnitPriceCents : null,
        saleUnitPriceCents: typeof row.saleUnitPriceCents === "number" ? row.saleUnitPriceCents : null,
      };
    });

  const qRows = (quotes.data ?? []) as Record<string, unknown>[];
  const iRows = (invoices.data ?? []) as Record<string, unknown>[];
  const tRows = timeEntries.data ?? [];
  const eRows = expenses.data ?? [];
  const laborProfileRows = (!laborProfilesRes.error && laborProfilesRes.data ? laborProfilesRes.data : []) as {
    id: string;
    label: string;
    internalTjmCents: number;
  }[];
  const profileTjmById = new Map(laborProfileRows.map((p) => [p.id, p.internalTjmCents]));
  const profileLabelById = new Map(laborProfileRows.map((p) => [p.id, p.label]));
  const laborProfileOptions = laborProfileRows.map((p) => ({ id: p.id, label: p.label }));

  const quotesDevis = qRows.filter((q) => isDevisTabQuote(quoteStatusRaw(q)));
  const quotesCommande = qRows.filter((q) => isCommandeTabQuote(quoteStatusRaw(q)));

  const billedCents = sumCentsInvoicesBilled(iRows);
  const paidCents = sumCentsInvoicesPaid(iRows);
  const expenseCents = sumCentsExpenses(eRows);
  const totalMinutes = sumMinutes(tRows);
  const internalTjmCents = typeof (proj as { internalTjmCents?: unknown }).internalTjmCents === "number" ? (proj as { internalTjmCents?: number }).internalTjmCents! : null;
  const internalLaborCents = sumTimeEntriesLaborCents(tRows, profileTjmById, internalTjmCents);
  const marginOnPaid = paidCents - expenseCents;
  const marginOnBilled = billedCents - expenseCents;
  const marginOnPaidAfterLabor = internalLaborCents == null ? null : paidCents - expenseCents - internalLaborCents;
  const marginOnBilledAfterLabor = internalLaborCents == null ? null : billedCents - expenseCents - internalLaborCents;

  function invoiceLinkedToQuote(quoteId: string): Record<string, unknown> | undefined {
    return iRows.find((inv) => String(inv.sourceQuoteId ?? "") === quoteId);
  }

  return (
    <div className="min-h-screen bg-canvas px-4 py-10 sm:px-6">
      <div className="mx-auto max-w-4xl space-y-8">
        <p className="text-sm text-ink-soft">
          <Link href="/pro/chantiers" className="font-medium text-teal-700 hover:underline dark:text-teal-400">
            ← Tous les chantiers
          </Link>
          {" · "}
          <Link href="/pro/catalog" className="font-medium text-teal-700 hover:underline dark:text-teal-400">
            Catalogue devis
          </Link>
          {" · "}
          <Link href="/pro/profils-mo" className="font-medium text-teal-700 hover:underline dark:text-teal-400">
            Profils temps
          </Link>
        </p>

        <header className="rounded-2xl border border-[var(--card-border)] bg-[var(--card)] p-6 shadow-sm dark:border-white/10">
          <div className="flex flex-wrap items-center gap-2">
            <p className="text-xs font-semibold uppercase tracking-wider text-teal-800 dark:text-teal-300">Chantier</p>
            {(proj.sourceLeadId as string | null) ? (
              <span className="rounded-full bg-violet-500/15 px-2.5 py-0.5 text-[11px] font-semibold text-violet-900 ring-1 ring-violet-500/25 dark:bg-violet-500/20 dark:text-violet-100 dark:ring-violet-400/30">
                Lié à une demande entrante
              </span>
            ) : null}
          </div>
          <h1 className="mt-2 font-[family-name:var(--font-display)] text-3xl text-ink">{proj.title as string}</h1>
          <p className="mt-2 text-sm text-ink-soft">
            {(proj.clientName as string | null) ? `Client : ${proj.clientName as string} · ` : ""}
            Statut {(proj.status as string) || "OPEN"} · Créé le {fmtDate(proj.createdAt as string)}
          </p>
          {(proj.sourceLeadId as string | null) ? (
            <p className="mt-2 text-sm">
              <Link
                href="/pro/demandes"
                className="font-medium text-violet-700 underline-offset-2 hover:underline dark:text-violet-300"
              >
                Liste des demandes
              </Link>
              <span className="text-ink-soft"> — réf. {proj.sourceLeadId as string}</span>
            </p>
          ) : null}

          <div className="mt-4 rounded-xl border border-ink/10 bg-canvas/40 p-4 dark:border-white/10 dark:bg-canvas-muted/20">
            <p className="text-[11px] font-semibold uppercase tracking-wider text-ink-soft">Envoi des devis</p>
            {recipientEmail ? (
              <p className="mt-1 text-sm text-ink">
                Le bouton « Envoyer le devis » utilise l’adresse du demandeur :{" "}
                <span className="font-mono text-teal-800 dark:text-teal-300">{recipientEmail}</span>
                {(proj.sourceLeadId as string | null)
                  ? " (compte connecté ou e-mail indiqué sur la demande, sinon e-mail enregistré sur le chantier)."
                  : " (e-mail enregistré sur le chantier)."}
              </p>
            ) : (
              <p className="mt-1 text-sm text-amber-900 dark:text-amber-200">
                Aucun e-mail exploitable pour l’instant. Enregistrez ci-dessous l’adresse du client pour pouvoir envoyer les devis.
              </p>
            )}
            <div className="mt-3">
              <ClientEmailForm projectId={id} defaultEmail={(proj.clientEmail as string | null) ?? null} />
            </div>
          </div>

          {(proj.notes as string | null) ? (
            <p className="mt-4 whitespace-pre-wrap text-sm text-ink-soft">{proj.notes as string}</p>
          ) : null}
        </header>

        <section className="rounded-2xl border border-teal-500/25 bg-teal-500/5 p-5 shadow-sm dark:border-teal-400/20 dark:bg-teal-950/20">
          <h2 className="text-base font-semibold text-ink">Synthèse rentabilité</h2>
          <p className="mt-1 text-xs text-ink-soft">
            Basé sur les factures (hors brouillon) et les dépenses du chantier. Le CA encaissé inclut uniquement les factures au statut{" "}
            <span className="font-mono">PAID</span>. Le coût MO utilise le profil choisi sur chaque saisie de temps, sinon le TJM du chantier (
            <Link href="/pro/profils-mo" className="font-medium text-teal-700 hover:underline dark:text-teal-400">
              profils personnalisables
            </Link>
            ).
          </p>
          <div className="mt-4 rounded-xl border border-ink/10 bg-[var(--card)] p-4 dark:border-white/10">
            <InternalTjmForm projectId={id} defaultInternalTjmCents={internalTjmCents} />
          </div>
          <dl className="mt-4 grid gap-2 text-sm sm:grid-cols-2 lg:grid-cols-4">
            <div className="rounded-xl border border-ink/10 bg-[var(--card)] px-3 py-2.5 dark:border-white/10">
              <dt className="text-[10px] font-semibold uppercase tracking-wider text-ink-soft">CA facturé</dt>
              <dd className="mt-0.5 font-semibold tabular-nums text-ink">{formatEurFromCents(billedCents)}</dd>
            </div>
            <div className="rounded-xl border border-ink/10 bg-[var(--card)] px-3 py-2.5 dark:border-white/10">
              <dt className="text-[10px] font-semibold uppercase tracking-wider text-ink-soft">CA encaissé</dt>
              <dd className="mt-0.5 font-semibold tabular-nums text-ink">{formatEurFromCents(paidCents)}</dd>
            </div>
            <div className="rounded-xl border border-ink/10 bg-[var(--card)] px-3 py-2.5 dark:border-white/10">
              <dt className="text-[10px] font-semibold uppercase tracking-wider text-ink-soft">Dépenses</dt>
              <dd className="mt-0.5 font-semibold tabular-nums text-ink">{formatEurFromCents(expenseCents)}</dd>
            </div>
            <div className="rounded-xl border border-ink/10 bg-[var(--card)] px-3 py-2.5 dark:border-white/10">
              <dt className="text-[10px] font-semibold uppercase tracking-wider text-ink-soft">Temps</dt>
              <dd className="mt-0.5 font-semibold text-ink">{formatDurationMinutes(totalMinutes)}</dd>
            </div>
            <div className="rounded-xl border border-ink/10 bg-[var(--card)] px-3 py-2.5 sm:col-span-2 dark:border-white/10">
              <dt className="text-[10px] font-semibold uppercase tracking-wider text-ink-soft">Marge (encaissé − dépenses)</dt>
              <dd className="mt-0.5 font-semibold tabular-nums text-ink">{formatEurFromCents(marginOnPaid)}</dd>
            </div>
            <div className="rounded-xl border border-ink/10 bg-[var(--card)] px-3 py-2.5 sm:col-span-2 dark:border-white/10">
              <dt className="text-[10px] font-semibold uppercase tracking-wider text-ink-soft">Marge (facturé − dépenses)</dt>
              <dd className="mt-0.5 font-semibold tabular-nums text-ink">{formatEurFromCents(marginOnBilled)}</dd>
            </div>
            {internalLaborCents != null ? (
              <>
                <div className="rounded-xl border border-ink/10 bg-[var(--card)] px-3 py-2.5 sm:col-span-2 dark:border-white/10">
                  <dt className="text-[10px] font-semibold uppercase tracking-wider text-ink-soft">Coût main d’œuvre interne (estim.)</dt>
                  <dd className="mt-0.5 font-semibold tabular-nums text-ink">{formatEurFromCents(internalLaborCents)}</dd>
                </div>
                <div className="rounded-xl border border-ink/10 bg-[var(--card)] px-3 py-2.5 sm:col-span-2 dark:border-white/10">
                  <dt className="text-[10px] font-semibold uppercase tracking-wider text-ink-soft">
                    Marge (encaissé − dépenses − MO)
                  </dt>
                  <dd className="mt-0.5 font-semibold tabular-nums text-ink">{formatEurFromCents(marginOnPaidAfterLabor ?? 0)}</dd>
                </div>
                <div className="rounded-xl border border-ink/10 bg-[var(--card)] px-3 py-2.5 sm:col-span-2 dark:border-white/10">
                  <dt className="text-[10px] font-semibold uppercase tracking-wider text-ink-soft">
                    Marge (facturé − dépenses − MO)
                  </dt>
                  <dd className="mt-0.5 font-semibold tabular-nums text-ink">{formatEurFromCents(marginOnBilledAfterLabor ?? 0)}</dd>
                </div>
              </>
            ) : null}
          </dl>
        </section>

        <ChantierTabsNav projectId={id} active={tab} />

        <div className="rounded-2xl border border-[var(--card-border)] bg-[var(--card)] p-6 shadow-sm dark:border-white/10">
          {tab === "devis" ? (
            <div className="space-y-4">
              <div>
                <h2 className="text-lg font-semibold text-ink">Devis</h2>
                <p className="mt-1 text-xs text-ink-soft">
                  Créez ou complétez vos devis, envoyez-les en un clic au demandeur, puis validez pour les passer en commande.
                </p>
              </div>
              <Suspense fallback={<div className="h-20 animate-pulse rounded-xl bg-canvas-muted/30" />}>
                <QuoteCreateForm projectId={id} catalogItems={catalogItems} />
              </Suspense>
              {quotesDevis.length === 0 ? (
                <p className="text-sm text-ink-soft">Aucun devis en cours (brouillon ou envoyé).</p>
              ) : (
                <ul className="space-y-3 text-sm">
                  {quotesDevis.map((q) => {
                    const src = quoteSourceBadge(q.source as string | undefined);
                    const st = quoteStatusRaw(q);
                    const qid = String(q.id);
                    return (
                      <li
                        key={qid}
                        className="rounded-xl border border-ink/10 bg-canvas/40 px-4 py-3 dark:border-white/10 dark:bg-canvas-muted/20"
                      >
                        <div className="flex flex-wrap items-start justify-between gap-2">
                          <div className="flex flex-wrap items-center gap-2">
                            <span className="font-semibold text-ink">Devis {(q.number as string) || "—"}</span>
                            {src ? (
                              <span className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ring-1 ${src.className}`}>
                                {src.label}
                              </span>
                            ) : null}
                          </div>
                          <span className="text-ink-soft">
                            {quoteStatusLabel(st)} · {formatEurFromCents((q.totalCents as number) || 0)}
                          </span>
                        </div>
                        <p className="mt-1 text-xs text-ink-soft">
                          Émis : {fmtDate((q.issuedAt as string | null) ?? null)}
                          {(q.sentAt as string | null) ? ` · Envoyé : ${fmtDate(q.sentAt as string)}` : ""}
                        </p>
                        <QuoteDevisWorkflow projectId={id} quoteId={qid} status={st} />
                      </li>
                    );
                  })}
                </ul>
              )}
            </div>
          ) : null}

          {tab === "commande" ? (
            <div className="space-y-4">
              <div>
                <h2 className="text-lg font-semibold text-ink">Commande</h2>
                <p className="mt-1 text-xs text-ink-soft">
                  Devis acceptés par vous : générez la facture depuis une commande. Les commandes déjà facturées restent visibles ci-dessous.
                </p>
              </div>
              {quotesCommande.length === 0 ? (
                <p className="text-sm text-ink-soft">
                  Aucune commande pour l’instant. Depuis l’onglet Devis, envoyez un devis puis validez-le pour le passer en commande.
                </p>
              ) : (
                <ul className="space-y-3 text-sm">
                  {quotesCommande.map((q) => {
                    const src = quoteSourceBadge(q.source as string | undefined);
                    const st = quoteStatusRaw(q);
                    const qid = String(q.id);
                    const linked = invoiceLinkedToQuote(qid);
                    return (
                      <li
                        key={qid}
                        className="rounded-xl border border-ink/10 bg-canvas/40 px-4 py-3 dark:border-white/10 dark:bg-canvas-muted/20"
                      >
                        <div className="flex flex-wrap items-start justify-between gap-2">
                          <div className="flex flex-wrap items-center gap-2">
                            <span className="font-semibold text-ink">{(q.number as string) || "—"}</span>
                            {src ? (
                              <span className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ring-1 ${src.className}`}>
                                {src.label}
                              </span>
                            ) : null}
                          </div>
                          <span className="text-ink-soft">
                            {quoteStatusLabel(st)} · {formatEurFromCents((q.totalCents as number) || 0)}
                          </span>
                        </div>
                        <p className="mt-1 text-xs text-ink-soft">
                          {(q.acceptedAt as string | null) ? `Commande le ${fmtDate(q.acceptedAt as string)}` : "—"}
                          {linked ? (
                            <>
                              {" · "}
                              <Link
                                href={`/pro/chantiers/${id}?tab=facture`}
                                className="font-medium text-teal-700 hover:underline dark:text-teal-400"
                              >
                                Facture {(linked.number as string) || "—"}
                              </Link>
                            </>
                          ) : null}
                        </p>
                        <QuoteCommandeWorkflow projectId={id} quoteId={qid} status={st} />
                      </li>
                    );
                  })}
                </ul>
              )}
            </div>
          ) : null}

          {tab === "facture" ? (
            <div className="space-y-4">
              <div>
                <h2 className="text-lg font-semibold text-ink">Facture</h2>
                <p className="mt-1 text-xs text-ink-soft">
                  Factures du chantier (y compris celles créées depuis une commande). Ajustez les statuts pour le suivi du CA.
                </p>
              </div>
              <Suspense fallback={<div className="h-20 animate-pulse rounded-xl bg-canvas-muted/30" />}>
                <InvoiceCreateForm projectId={id} catalogItems={catalogItems} />
              </Suspense>
              {iRows.length === 0 ? (
                <p className="text-sm text-ink-soft">Aucune facture.</p>
              ) : (
                <ul className="space-y-2 text-sm">
                  {iRows.map((inv) => (
                    <li
                      key={String(inv.id)}
                      className="rounded-xl border border-ink/10 bg-canvas/40 px-4 py-3 dark:border-white/10 dark:bg-canvas-muted/20"
                    >
                      <div className="flex flex-wrap justify-between gap-2">
                        <span className="font-semibold text-ink">Facture {(inv.number as string) || "—"}</span>
                        <span className="text-ink-soft">
                          {(inv.status as string) || "DRAFT"} · {formatEurFromCents((inv.totalCents as number) || 0)}
                        </span>
                      </div>
                      <p className="mt-1 text-xs text-ink-soft">
                        Émise : {fmtDate((inv.issuedAt as string | null) ?? null)} · Payée :{" "}
                        {fmtDate((inv.paidAt as string | null) ?? null)}
                        {(inv.sourceQuoteId as string | null) ? " · Issue d’un devis / commande" : ""}
                      </p>
                      <InvoiceStatusForm
                        projectId={id}
                        invoiceId={String(inv.id)}
                        status={(inv.status as string) || "DRAFT"}
                      />
                    </li>
                  ))}
                </ul>
              )}
            </div>
          ) : null}
        </div>

        <div className="grid gap-6 lg:grid-cols-2">
          <section className="rounded-2xl border border-[var(--card-border)] bg-[var(--card)] p-6 shadow-sm dark:border-white/10">
            <h2 className="text-lg font-semibold text-ink">Temps</h2>
            <p className="mt-1 text-xs text-ink-soft">
              <Link href="/pro/profils-mo" className="font-medium text-teal-700 hover:underline dark:text-teal-400">
                Gérer les profils et les TJM internes
              </Link>
            </p>
            <div className="mt-4">
              <Suspense fallback={<div className="h-20 animate-pulse rounded-xl bg-canvas-muted/30" />}>
                <TimeCreateForm projectId={id} laborProfiles={laborProfileOptions} />
              </Suspense>
            </div>
            {tRows.length === 0 ? (
              <p className="mt-4 text-sm text-ink-soft">Aucune saisie.</p>
            ) : (
              <ul className="mt-4 space-y-2 text-sm">
                {tRows.map((t) => (
                  <li
                    key={t.id as string}
                    className="rounded-xl border border-ink/10 bg-canvas/40 px-4 py-3 dark:border-white/10 dark:bg-canvas-muted/20"
                  >
                    <div className="flex flex-wrap justify-between gap-2">
                      <span className="font-semibold text-ink">{t.workDate as string}</span>
                      <span className="text-ink-soft">{t.minutes as number} min</span>
                    </div>
                    {(() => {
                      const lid = typeof t.laborProfileId === "string" ? t.laborProfileId : null;
                      const pl = lid ? profileLabelById.get(lid) : null;
                      return pl ? (
                        <p className="mt-1 text-xs font-medium text-violet-800 dark:text-violet-200">Profil : {pl}</p>
                      ) : (
                        <p className="mt-1 text-xs text-ink-soft">Profil : TJM chantier (défaut)</p>
                      );
                    })()}
                    {(t.note as string | null) ? <p className="mt-1 text-xs text-ink-soft">{t.note as string}</p> : null}
                  </li>
                ))}
              </ul>
            )}
          </section>

          <section className="rounded-2xl border border-[var(--card-border)] bg-[var(--card)] p-6 shadow-sm dark:border-white/10">
            <h2 className="text-lg font-semibold text-ink">Dépenses</h2>
            <div className="mt-4">
              <Suspense fallback={<div className="h-20 animate-pulse rounded-xl bg-canvas-muted/30" />}>
                <ExpenseCreateForm projectId={id} />
              </Suspense>
            </div>
            {eRows.length === 0 ? (
              <p className="mt-4 text-sm text-ink-soft">Aucune dépense.</p>
            ) : (
              <ul className="mt-4 space-y-2 text-sm">
                {eRows.map((e) => (
                  <li
                    key={e.id as string}
                    className="rounded-xl border border-ink/10 bg-canvas/40 px-4 py-3 dark:border-white/10 dark:bg-canvas-muted/20"
                  >
                    <div className="flex flex-wrap justify-between gap-2">
                      <span className="font-semibold text-ink">
                        {e.expenseDate as string} · {(e.label as string) || "—"}
                      </span>
                      <span className="text-ink-soft">
                        {formatEurFromCents((e.amountCents as number) || 0)} · {(e.category as string) || "OTHER"}
                      </span>
                    </div>
                    {(e.note as string | null) ? <p className="mt-1 text-xs text-ink-soft">{e.note as string}</p> : null}
                  </li>
                ))}
              </ul>
            )}
          </section>
        </div>
      </div>
    </div>
  );
}

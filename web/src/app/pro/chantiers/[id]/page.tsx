import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { Suspense } from "react";

import { requireProContext } from "@/lib/pro-auth";
import { hasPlanAtLeast } from "@/lib/pro-plan";
import { formatEurFromCents } from "@/lib/format-money";
import { isProCatalogKind, type ProCatalogKind } from "@/lib/pro-catalog-kinds";
import type { ProCatalogPickerItem } from "@/lib/pro-catalog-types";
import { getSupabaseAdmin } from "@/lib/supabase/admin";
import { QuoteCreateForm } from "./quote-create-form";
import { InvoiceCreateForm } from "./invoice-create-form";
import { InvoiceStatusForm } from "./invoice-status-form";
import { TimeCreateForm } from "./time-create-form";
import { ExpenseCreateForm } from "./expense-create-form";

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

export default async function ProChantierDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const ctx = await requireProContext();
  if (!ctx.artisanProfile) redirect("/pro/onboarding");
  const planId = ctx.subscription.planId;
  if (!ctx.subscription.isActive || !planId || !hasPlanAtLeast(planId, "pilotage")) {
    redirect("/pro/offre");
  }

  const supabase = getSupabaseAdmin();
  const { data: proj, error } = await supabase
    .from("ProProject")
    .select("id,siren,title,clientName,status,notes,createdAt")
    .eq("id", id)
    .maybeSingle();
  if (error || !proj) notFound();
  if ((proj.siren as string) !== ctx.artisanProfile.siren) notFound();

  const [quotes, invoices, timeEntries, expenses, catalogRes] = await Promise.all([
    supabase.from("ProQuote").select("id,number,status,totalCents,issuedAt,createdAt").eq("projectId", id).order("createdAt", { ascending: false }),
    supabase.from("ProInvoice").select("id,number,status,totalCents,issuedAt,paidAt,createdAt").eq("projectId", id).order("createdAt", { ascending: false }),
    supabase.from("ProTimeEntry").select("id,minutes,workDate,note,createdAt").eq("projectId", id).order("createdAt", { ascending: false }),
    supabase.from("ProExpense").select("id,label,amountCents,category,expenseDate,note,createdAt").eq("projectId", id).order("createdAt", { ascending: false }),
    supabase
      .from("ProCatalogItem")
      .select("id,kind,label,unit,purchaseUnitPriceCents,saleUnitPriceCents")
      .eq("siren", ctx.artisanProfile.siren)
      .order("sortOrder", { ascending: true })
      .order("createdAt", { ascending: false })
      .limit(500),
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

  const qRows = quotes.data ?? [];
  const iRows = invoices.data ?? [];
  const tRows = timeEntries.data ?? [];
  const eRows = expenses.data ?? [];

  const billedCents = sumCentsInvoicesBilled(iRows);
  const paidCents = sumCentsInvoicesPaid(iRows);
  const expenseCents = sumCentsExpenses(eRows);
  const totalMinutes = sumMinutes(tRows);
  const marginOnPaid = paidCents - expenseCents;
  const marginOnBilled = billedCents - expenseCents;

  return (
    <div className="min-h-screen bg-canvas px-4 py-10 sm:px-6">
      <div className="mx-auto max-w-3xl space-y-8">
        <p className="text-sm text-ink-soft">
          <Link href="/pro/chantiers" className="font-medium text-teal-700 hover:underline dark:text-teal-400">
            ← Tous les chantiers
          </Link>
          {" · "}
          <Link href="/pro/catalog" className="font-medium text-teal-700 hover:underline dark:text-teal-400">
            Catalogue devis
          </Link>
        </p>

        <header className="rounded-2xl border border-[var(--card-border)] bg-[var(--card)] p-6 shadow-sm dark:border-white/10">
          <p className="text-xs font-semibold uppercase tracking-wider text-teal-800 dark:text-teal-300">
            Chantier
          </p>
          <h1 className="mt-2 font-[family-name:var(--font-display)] text-3xl text-ink">
            {proj.title as string}
          </h1>
          <p className="mt-2 text-sm text-ink-soft">
            {(proj.clientName as string | null) ? `Client : ${proj.clientName as string} · ` : ""}
            Statut {(proj.status as string) || "OPEN"} · Créé le {fmtDate(proj.createdAt as string)}
          </p>
          {(proj.notes as string | null) ? (
            <p className="mt-3 whitespace-pre-wrap text-sm text-ink-soft">{proj.notes as string}</p>
          ) : null}
        </header>

        <section className="rounded-2xl border border-teal-500/25 bg-teal-500/5 p-6 shadow-sm dark:border-teal-400/20 dark:bg-teal-950/20">
          <h2 className="text-lg font-semibold text-ink">Rentabilité (synthèse)</h2>
          <p className="mt-1 text-xs text-ink-soft">
            Les montants proviennent des factures et dépenses saisies ci‑dessous. Marque une facture comme payée
            (statut <span className="font-mono">PAID</span>) pour l’inclure dans le CA encaissé.
          </p>
          <dl className="mt-4 grid gap-3 text-sm sm:grid-cols-2">
            <div className="rounded-xl border border-ink/10 bg-[var(--card)] px-4 py-3 dark:border-white/10">
              <dt className="text-xs font-semibold uppercase tracking-wider text-ink-soft">CA facturé (hors brouillon)</dt>
              <dd className="mt-1 font-semibold text-ink">{formatEurFromCents(billedCents)}</dd>
            </div>
            <div className="rounded-xl border border-ink/10 bg-[var(--card)] px-4 py-3 dark:border-white/10">
              <dt className="text-xs font-semibold uppercase tracking-wider text-ink-soft">CA encaissé (payé)</dt>
              <dd className="mt-1 font-semibold text-ink">{formatEurFromCents(paidCents)}</dd>
            </div>
            <div className="rounded-xl border border-ink/10 bg-[var(--card)] px-4 py-3 dark:border-white/10">
              <dt className="text-xs font-semibold uppercase tracking-wider text-ink-soft">Dépenses chantier</dt>
              <dd className="mt-1 font-semibold text-ink">{formatEurFromCents(expenseCents)}</dd>
            </div>
            <div className="rounded-xl border border-ink/10 bg-[var(--card)] px-4 py-3 dark:border-white/10">
              <dt className="text-xs font-semibold uppercase tracking-wider text-ink-soft">Temps passé</dt>
              <dd className="mt-1 font-semibold text-ink">{formatDurationMinutes(totalMinutes)}</dd>
            </div>
            <div className="rounded-xl border border-ink/10 bg-[var(--card)] px-4 py-3 dark:border-white/10 sm:col-span-2">
              <dt className="text-xs font-semibold uppercase tracking-wider text-ink-soft">Marge (encaissé − dépenses)</dt>
              <dd className="mt-1 font-semibold text-ink">{formatEurFromCents(marginOnPaid)}</dd>
            </div>
            <div className="rounded-xl border border-ink/10 bg-[var(--card)] px-4 py-3 dark:border-white/10 sm:col-span-2">
              <dt className="text-xs font-semibold uppercase tracking-wider text-ink-soft">Marge (facturé − dépenses)</dt>
              <dd className="mt-1 font-semibold text-ink">{formatEurFromCents(marginOnBilled)}</dd>
            </div>
          </dl>
        </section>

        <div className="grid gap-6">
          <section className="rounded-2xl border border-[var(--card-border)] bg-[var(--card)] p-6 shadow-sm dark:border-white/10">
            <h2 className="text-lg font-semibold text-ink">Devis</h2>
            <div className="mt-4">
              <Suspense fallback={<div className="h-20 animate-pulse rounded-xl bg-canvas-muted/30" />}>
                <QuoteCreateForm projectId={id} catalogItems={catalogItems} />
              </Suspense>
            </div>
            {qRows.length === 0 ? (
              <p className="mt-4 text-sm text-ink-soft">Aucun devis.</p>
            ) : (
              <ul className="mt-4 space-y-2 text-sm">
                {qRows.map((q) => (
                  <li key={q.id as string} className="rounded-xl border border-ink/10 bg-canvas/40 px-4 py-3 dark:border-white/10 dark:bg-canvas-muted/20">
                    <div className="flex flex-wrap justify-between gap-2">
                      <span className="font-semibold text-ink">Devis {(q.number as string) || "—"}</span>
                      <span className="text-ink-soft">
                        {(q.status as string) || "DRAFT"} · {formatEurFromCents((q.totalCents as number) || 0)}
                      </span>
                    </div>
                    <p className="mt-1 text-xs text-ink-soft">
                      Émis : {fmtDate((q.issuedAt as string | null) ?? null)}
                    </p>
                  </li>
                ))}
              </ul>
            )}
          </section>

          <section className="rounded-2xl border border-[var(--card-border)] bg-[var(--card)] p-6 shadow-sm dark:border-white/10">
            <h2 className="text-lg font-semibold text-ink">Factures</h2>
            <div className="mt-4">
              <Suspense fallback={<div className="h-20 animate-pulse rounded-xl bg-canvas-muted/30" />}>
                <InvoiceCreateForm projectId={id} catalogItems={catalogItems} />
              </Suspense>
            </div>
            {iRows.length === 0 ? (
              <p className="mt-4 text-sm text-ink-soft">Aucune facture.</p>
            ) : (
              <ul className="mt-4 space-y-2 text-sm">
                {iRows.map((inv) => (
                  <li key={inv.id as string} className="rounded-xl border border-ink/10 bg-canvas/40 px-4 py-3 dark:border-white/10 dark:bg-canvas-muted/20">
                    <div className="flex flex-wrap justify-between gap-2">
                      <span className="font-semibold text-ink">Facture {(inv.number as string) || "—"}</span>
                      <span className="text-ink-soft">
                        {(inv.status as string) || "DRAFT"} · {formatEurFromCents((inv.totalCents as number) || 0)}
                      </span>
                    </div>
                    <p className="mt-1 text-xs text-ink-soft">
                      Émise : {fmtDate((inv.issuedAt as string | null) ?? null)} · Payée : {fmtDate((inv.paidAt as string | null) ?? null)}
                    </p>
                    <InvoiceStatusForm
                      projectId={id}
                      invoiceId={inv.id as string}
                      status={(inv.status as string) || "DRAFT"}
                    />
                  </li>
                ))}
              </ul>
            )}
          </section>

          <section className="rounded-2xl border border-[var(--card-border)] bg-[var(--card)] p-6 shadow-sm dark:border-white/10">
            <h2 className="text-lg font-semibold text-ink">Temps</h2>
            <div className="mt-4">
              <Suspense fallback={<div className="h-20 animate-pulse rounded-xl bg-canvas-muted/30" />}>
                <TimeCreateForm projectId={id} />
              </Suspense>
            </div>
            {tRows.length === 0 ? (
              <p className="mt-4 text-sm text-ink-soft">Aucune saisie.</p>
            ) : (
              <ul className="mt-4 space-y-2 text-sm">
                {tRows.map((t) => (
                  <li key={t.id as string} className="rounded-xl border border-ink/10 bg-canvas/40 px-4 py-3 dark:border-white/10 dark:bg-canvas-muted/20">
                    <div className="flex flex-wrap justify-between gap-2">
                      <span className="font-semibold text-ink">{t.workDate as string}</span>
                      <span className="text-ink-soft">{t.minutes as number} min</span>
                    </div>
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
                  <li key={e.id as string} className="rounded-xl border border-ink/10 bg-canvas/40 px-4 py-3 dark:border-white/10 dark:bg-canvas-muted/20">
                    <div className="flex flex-wrap justify-between gap-2">
                      <span className="font-semibold text-ink">{e.expenseDate as string} · {(e.label as string) || "—"}</span>
                      <span className="text-ink-soft">{formatEurFromCents((e.amountCents as number) || 0)} · {(e.category as string) || "OTHER"}</span>
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


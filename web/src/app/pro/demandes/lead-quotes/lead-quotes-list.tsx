"use client";

import Link from "next/link";
import { useActionState } from "react";

import { QuoteLinesPreview } from "@/components/quote-lines-preview";
import { QuoteCloseForms } from "@/app/pro/chantiers/quote-close-forms";
import { sendQuoteToClientAction } from "@/app/pro/chantiers/pilotage.actions";
import { acceptLeadQuoteAsOrderAction, openOrAttachChantierForLeadOrderAction } from "./lead-quotes.actions";

function eur(totalCents: number): string {
  const v = Math.max(0, Number.isFinite(totalCents) ? totalCents : 0);
  return (v / 100).toLocaleString("fr-FR", { style: "currency", currency: "EUR" });
}

function quoteSourceBadge(source: string | null | undefined): { label: string; className: string } | null {
  const s = source || "MANUAL";
  if (s === "LEAD") {
    return {
      label: "Depuis demande (brouillon IA possible)",
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

function labelStatus(s: string): string {
  switch (s) {
    case "DRAFT":
      return "Brouillon";
    case "SENT":
      return "Envoyé";
    case "ACCEPTED":
      return "Commande (validée)";
    case "INVOICED":
      return "Facturé";
    case "CANCELLED":
      return "Annulé / perdu";
    case "ARCHIVED":
      return "Archivé";
    default:
      return s || "—";
  }
}

const initial: { ok: boolean; error?: string; projectId?: string } | null = null;

function SendForm({ quoteId }: { quoteId: string }) {
  const [state, formAction, pending] = useActionState(sendQuoteToClientAction, initial);
  return (
    <form action={formAction} className="inline-flex items-center gap-2">
      <input type="hidden" name="quoteId" value={quoteId} />
      <button
        type="submit"
        disabled={pending}
        className="inline-flex min-h-[2rem] items-center justify-center rounded-lg bg-teal-700 px-3 py-2 text-xs font-bold text-white transition hover:bg-teal-800 disabled:opacity-50 dark:bg-teal-600 dark:hover:bg-teal-500"
      >
        {pending ? "Envoi…" : "Envoyer"}
      </button>
      {state?.ok === false && state.error ? <span className="text-xs text-red-700 dark:text-red-300">{state.error}</span> : null}
      {state?.ok === true ? <span className="text-xs text-emerald-800 dark:text-emerald-200">Envoyé.</span> : null}
    </form>
  );
}

function AcceptForm({ quoteId }: { quoteId: string }) {
  const [state, formAction, pending] = useActionState(acceptLeadQuoteAsOrderAction, initial);
  return (
    <form action={formAction} className="inline-flex items-center gap-2">
      <input type="hidden" name="quoteId" value={quoteId} />
      <button
        type="submit"
        disabled={pending}
        className="inline-flex min-h-[2rem] items-center justify-center rounded-lg bg-amber-600 px-3 py-2 text-xs font-bold text-white transition hover:bg-amber-700 disabled:opacity-50 dark:bg-amber-600 dark:hover:bg-amber-500"
      >
        {pending ? "Validation…" : "Marquer comme validé"}
      </button>
      {state?.ok === false && state.error ? <span className="text-xs text-red-700 dark:text-red-300">{state.error}</span> : null}
      {state?.ok === true ? <span className="text-xs text-emerald-800 dark:text-emerald-200">Commande validée.</span> : null}
    </form>
  );
}

function OpenChantierForm({ quoteId }: { quoteId: string }) {
  const [state, formAction, pending] = useActionState(openOrAttachChantierForLeadOrderAction, initial);
  return (
    <form action={formAction} className="inline-flex items-center gap-2">
      <input type="hidden" name="quoteId" value={quoteId} />
      <button
        type="submit"
        disabled={pending}
        className="inline-flex min-h-[2rem] items-center justify-center rounded-lg bg-slate-900 px-3 py-2 text-xs font-bold text-white transition hover:bg-slate-800 disabled:opacity-50 dark:bg-white dark:text-slate-950 dark:hover:bg-slate-100"
      >
        {pending ? "Ouverture…" : "Ouvrir un chantier"}
      </button>
      {state?.ok === false && state.error ? <span className="text-xs text-red-700 dark:text-red-300">{state.error}</span> : null}
      {state?.ok === true && state.projectId ? (
        <Link className="text-xs font-semibold text-teal-700 hover:underline dark:text-teal-400" href={`/pro/chantiers/${state.projectId}`}>
          Voir le chantier →
        </Link>
      ) : null}
    </form>
  );
}

export function LeadQuotesList({
  leadId,
  quotes,
}: {
  leadId: string;
  quotes: {
    id: string;
    leadId: string | null;
    projectId: string | null;
    number: string;
    status: string;
    source?: string;
    totalCents: number;
    linesJson: unknown;
    sentAt: string | null;
    acceptedAt: string | null;
    createdAt: string;
  }[];
}) {
  return (
    <section className="mt-4 rounded-2xl border border-[var(--card-border)] bg-[var(--card)] p-5 shadow-sm dark:border-white/10">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wider text-ink-soft">Devis / commandes</p>
          <p className="mt-1 text-xs text-ink-soft">Devis liés à cette demande (avant ouverture d’un chantier).</p>
        </div>
        <span className="rounded-full bg-slate-900/5 px-2 py-1 text-[11px] font-semibold text-slate-900 dark:bg-white/10 dark:text-white">
          {quotes.length}
        </span>
      </div>

      {quotes.length === 0 ? <p className="mt-3 text-sm text-ink-soft">Aucun devis pour l’instant.</p> : null}

      {quotes.length > 0 ? (
        <ul className="mt-4 space-y-3">
          {quotes.map((q) => {
            const src = quoteSourceBadge(q.source);
            return (
            <li key={q.id} className="rounded-xl border border-ink/10 bg-canvas/50 p-4 dark:border-white/10 dark:bg-canvas-muted/25">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="min-w-[14rem]">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="font-mono text-xs text-ink-soft">#{q.number}</p>
                    {src ? (
                      <span className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ring-1 ${src.className}`}>
                        {src.label}
                      </span>
                    ) : null}
                  </div>
                  <p className="mt-1 text-sm font-semibold text-ink">
                    {eur(q.totalCents)}{" "}
                    <span className="ml-2 rounded-full bg-slate-900/5 px-2 py-0.5 text-[11px] font-semibold text-slate-900 dark:bg-white/10 dark:text-white">
                      {labelStatus(q.status)}
                    </span>
                  </p>
                </div>

                <div className="flex flex-wrap items-center gap-2">
                  {q.status === "DRAFT" ? <SendForm quoteId={q.id} /> : null}
                  {q.status === "SENT" ? <AcceptForm quoteId={q.id} /> : null}
                  {q.status === "ACCEPTED" && !q.projectId ? <OpenChantierForm quoteId={q.id} /> : null}
                  {q.projectId ? (
                    <Link className="text-xs font-semibold text-teal-700 hover:underline dark:text-teal-400" href={`/pro/chantiers/${q.projectId}`}>
                      Ouvrir le chantier →
                    </Link>
                  ) : null}
                </div>
              </div>
              <div className="mt-2">
                <QuoteLinesPreview linesJson={q.linesJson} defaultOpen={q.status === "DRAFT"} />
              </div>
              {q.status === "DRAFT" || q.status === "SENT" ? (
                <QuoteCloseForms quoteId={q.id} projectId={q.projectId} />
              ) : null}
            </li>
            );
          })}
        </ul>
      ) : null}
    </section>
  );
}


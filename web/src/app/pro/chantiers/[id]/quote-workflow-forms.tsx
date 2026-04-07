"use client";

import { useActionState } from "react";

import {
  acceptQuoteAsOrderAction,
  createInvoiceFromQuoteAction,
  sendQuoteToClientAction,
} from "../pilotage.actions";

const initial: { ok: boolean; error?: string } | null = null;

function SendQuoteForm({ projectId, quoteId }: { projectId: string; quoteId: string }) {
  const [state, formAction, pending] = useActionState(sendQuoteToClientAction, initial);
  return (
    <form action={formAction} className="mt-2 space-y-2 rounded-lg border border-teal-500/20 bg-teal-500/5 p-3 dark:border-teal-400/15 dark:bg-teal-950/15">
      <input type="hidden" name="projectId" value={projectId} />
      <input type="hidden" name="quoteId" value={quoteId} />
      {state?.ok === false && state.error ? (
        <p className="rounded border border-red-500/30 bg-red-500/10 px-2 py-1 text-xs text-red-900 dark:text-red-200">{state.error}</p>
      ) : null}
      {state?.ok === true ? (
        <p className="rounded border border-emerald-500/30 bg-emerald-500/10 px-2 py-1 text-xs text-emerald-950 dark:text-emerald-100">
          Devis envoyé à l’adresse du demandeur (e-mail du compte ou de la demande).
        </p>
      ) : null}
      <button
        type="submit"
        disabled={pending}
        className="w-full rounded-lg bg-teal-700 px-3 py-2 text-xs font-bold text-white hover:bg-teal-800 disabled:opacity-50 dark:bg-teal-600 dark:hover:bg-teal-500"
      >
        {pending ? "Envoi…" : "Envoyer le devis au client"}
      </button>
    </form>
  );
}

function AcceptQuoteForm({ projectId, quoteId }: { projectId: string; quoteId: string }) {
  const [state, formAction, pending] = useActionState(acceptQuoteAsOrderAction, initial);
  return (
    <form action={formAction} className="mt-2">
      <input type="hidden" name="projectId" value={projectId} />
      <input type="hidden" name="quoteId" value={quoteId} />
      {state?.ok === false && state.error ? (
        <p className="mb-2 rounded border border-red-500/30 bg-red-500/10 px-2 py-1 text-xs text-red-900 dark:text-red-200">{state.error}</p>
      ) : null}
      {state?.ok === true ? (
        <p className="mb-2 rounded border border-emerald-500/30 bg-emerald-500/10 px-2 py-1 text-xs text-emerald-950 dark:text-emerald-100">
          Devis passé en commande.
        </p>
      ) : null}
      <button
        type="submit"
        disabled={pending}
        className="w-full rounded-lg border border-amber-600/50 bg-amber-500/15 px-3 py-2 text-xs font-bold text-amber-950 hover:bg-amber-500/25 disabled:opacity-50 dark:text-amber-100 dark:hover:bg-amber-500/20"
      >
        {pending ? "…" : "Valider — passer en commande"}
      </button>
    </form>
  );
}

function InvoiceFromQuoteForm({ projectId, quoteId }: { projectId: string; quoteId: string }) {
  const [state, formAction, pending] = useActionState(createInvoiceFromQuoteAction, initial);
  return (
    <form action={formAction} className="mt-2 space-y-2 rounded-lg border border-ink/10 bg-canvas/30 p-3 dark:border-white/10 dark:bg-canvas-muted/20">
      <input type="hidden" name="projectId" value={projectId} />
      <input type="hidden" name="quoteId" value={quoteId} />
      {state?.ok === false && state.error ? (
        <p className="rounded border border-red-500/30 bg-red-500/10 px-2 py-1 text-xs text-red-900 dark:text-red-200">{state.error}</p>
      ) : null}
      {state?.ok === true ? (
        <p className="rounded border border-emerald-500/30 bg-emerald-500/10 px-2 py-1 text-xs text-emerald-950 dark:text-emerald-100">
          Facture brouillon créée à partir du devis.
        </p>
      ) : null}
      <label className="flex flex-col gap-1">
        <span className="text-[10px] font-semibold uppercase tracking-wider text-ink-soft">N° facture (vide = généré)</span>
        <input
          name="number"
          className="rounded border border-ink/10 bg-canvas/80 px-2 py-1.5 text-xs text-ink dark:border-white/10 dark:bg-canvas-muted/40"
          placeholder="FAC-2026-042"
        />
      </label>
      <button
        type="submit"
        disabled={pending}
        className="w-full rounded-lg bg-slate-800 px-3 py-2 text-xs font-bold text-white hover:bg-slate-900 disabled:opacity-50 dark:bg-slate-600 dark:hover:bg-slate-500"
      >
        {pending ? "Création…" : "Créer la facture depuis ce devis"}
      </button>
    </form>
  );
}

/** Onglet Devis : envoi + validation (devis brouillon / envoyé). */
export function QuoteDevisWorkflow({ projectId, quoteId, status }: { projectId: string; quoteId: string; status: string }) {
  const st = status || "DRAFT";
  return (
    <div className="mt-2 border-t border-ink/10 pt-3 dark:border-white/10">
      {(st === "DRAFT" || st === "SENT") && <SendQuoteForm projectId={projectId} quoteId={quoteId} />}
      {st === "SENT" && <AcceptQuoteForm projectId={projectId} quoteId={quoteId} />}
    </div>
  );
}

/** Onglet Commande : facturation depuis devis accepté. */
export function QuoteCommandeWorkflow({ projectId, quoteId, status }: { projectId: string; quoteId: string; status: string }) {
  const st = status || "DRAFT";
  return (
    <div className="mt-2 border-t border-ink/10 pt-3 dark:border-white/10">
      {st === "ACCEPTED" && <InvoiceFromQuoteForm projectId={projectId} quoteId={quoteId} />}
      {st === "INVOICED" ? (
        <p className="mt-1 text-xs text-ink-soft">Une facture a été générée pour cette commande.</p>
      ) : null}
    </div>
  );
}

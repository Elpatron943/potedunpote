"use client";

import { useActionState } from "react";

import { prepareQuoteFromLeadWithAiAction } from "./lead-quotes.actions";

const initial: { ok: boolean; error?: string; quoteId?: string } | null = null;

export function LeadQuoteAiForm({ leadId }: { leadId: string }) {
  const [state, formAction, pending] = useActionState(prepareQuoteFromLeadWithAiAction, initial);
  return (
    <form
      action={formAction}
      className="mt-3 rounded-xl border border-violet-600/25 bg-violet-500/5 p-4 dark:border-violet-500/20 dark:bg-violet-950/20"
    >
      <input type="hidden" name="leadId" value={leadId} />
      <p className="text-xs font-semibold uppercase tracking-wider text-violet-900 dark:text-violet-200">
        Devis (IA)
      </p>
      <p className="mt-1 text-xs text-ink-soft">
        Génère un devis brouillon à partir de la demande et de ton catalogue (lignes + prix).
      </p>
      {state?.ok === false && state.error ? (
        <p className="mt-2 text-xs text-red-700 dark:text-red-300">{state.error}</p>
      ) : null}
      {state?.ok === true ? (
        <p className="mt-2 text-xs text-emerald-800 dark:text-emerald-200">
          Devis créé. Tu peux le retrouver dans Pilotage chantiers (onglet Devis) une fois rattaché à un chantier.
        </p>
      ) : null}
      <button
        type="submit"
        disabled={pending}
        className="mt-3 inline-flex min-h-[2.25rem] items-center justify-center rounded-lg bg-violet-700 px-4 py-2 text-xs font-bold text-white transition hover:bg-violet-800 disabled:opacity-50 dark:bg-violet-600 dark:hover:bg-violet-500"
      >
        {pending ? "Préparation…" : "Préparer un devis (IA)"}
      </button>
    </form>
  );
}


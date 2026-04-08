"use client";

import { useActionState } from "react";

import { closeQuoteAsCancelledOrArchivedAction } from "./pilotage.actions";

const initial: { ok: boolean; error?: string } | null = null;

/**
 * Devis en brouillon ou envoyé : refus explicite vs archivage sans décision (KPI tableau de bord).
 */
export function QuoteCloseForms({ quoteId, projectId }: { quoteId: string; projectId?: string | null }) {
  const [state, formAction, pending] = useActionState(closeQuoteAsCancelledOrArchivedAction, initial);

  return (
    <div className="mt-2 space-y-2 border-t border-ink/10 pt-2 dark:border-white/10">
      {state?.ok === false && state.error ? (
        <p className="text-xs text-red-700 dark:text-red-300" role="alert">
          {state.error}
        </p>
      ) : null}
      {state?.ok === true ? (
        <p className="text-xs text-emerald-800 dark:text-emerald-200" role="status">
          Devis classé.
        </p>
      ) : null}
      <div className="flex flex-wrap gap-2">
        <form action={formAction} className="inline-flex">
          <input type="hidden" name="quoteId" value={quoteId} />
          {projectId ? <input type="hidden" name="projectId" value={projectId} /> : null}
          <input type="hidden" name="outcome" value="CANCELLED" />
          <button
            type="submit"
            disabled={pending}
            className="rounded-lg border border-red-600/40 bg-red-500/10 px-3 py-1.5 text-xs font-semibold text-red-900 transition hover:bg-red-500/20 disabled:opacity-50 dark:text-red-200 dark:hover:bg-red-500/15"
          >
            {pending ? "…" : "Refuser / perdu"}
          </button>
        </form>
        <form action={formAction} className="inline-flex">
          <input type="hidden" name="quoteId" value={quoteId} />
          {projectId ? <input type="hidden" name="projectId" value={projectId} /> : null}
          <input type="hidden" name="outcome" value="ARCHIVED" />
          <button
            type="submit"
            disabled={pending}
            className="rounded-lg border border-slate-500/35 bg-slate-500/10 px-3 py-1.5 text-xs font-semibold text-slate-800 transition hover:bg-slate-500/15 disabled:opacity-50 dark:text-slate-200 dark:hover:bg-slate-500/20"
          >
            {pending ? "…" : "Archiver (sans suite)"}
          </button>
        </form>
      </div>
      <p className="text-[10px] leading-snug text-ink-soft">
        Refus = devis refusé ou dossier perdu. Archiver = classé sans décision (hors pipeline actif).
      </p>
    </div>
  );
}

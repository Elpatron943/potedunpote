"use client";

import { useActionState } from "react";

import { createChantierFromLeadAction } from "@/app/pro/chantiers/pilotage.actions";

const initial: { ok: boolean; error?: string } | null = null;

export function LeadToChantierForm({
  leadId,
  defaultWithDraftQuote,
  aiLineCount,
}: {
  leadId: string;
  /** Cocher par défaut si le brouillon IA contient des lignes exploitables. */
  defaultWithDraftQuote: boolean;
  aiLineCount: number;
}) {
  const [state, formAction, pending] = useActionState(createChantierFromLeadAction, initial);

  return (
    <form
      action={formAction}
      className="mt-3 rounded-xl border border-teal-600/30 bg-teal-500/5 p-4 dark:border-teal-500/25 dark:bg-teal-950/25"
    >
      <input type="hidden" name="leadId" value={leadId} />
      <p className="text-xs font-semibold uppercase tracking-wider text-teal-900 dark:text-teal-200">
        Pro Pilotage
      </p>
      <p className="mt-1 text-xs text-ink-soft">
        Crée un chantier avec le client et le dossier copiés dans les notes. Tu peux ajouter un devis brouillon (lignes
        issues du brouillon IA, prix unitaires à 0 € à compléter).
      </p>
      {aiLineCount > 0 ? (
        <label className="mt-3 flex cursor-pointer gap-2 text-sm text-ink">
          <input
            type="checkbox"
            name="withDraftQuote"
            value="1"
            defaultChecked={defaultWithDraftQuote}
            className="mt-1 h-4 w-4 rounded border-ink/20 text-teal-700"
          />
          <span>
            Inclure un devis brouillon ({aiLineCount} ligne{aiLineCount > 1 ? "s" : ""} suggérée
            {aiLineCount > 1 ? "s" : ""}, total 0 €)
          </span>
        </label>
      ) : (
        <p className="mt-2 text-xs text-ink-soft">
          Pas encore de postes IA sur cette demande : seul le chantier sera créé (tu pourras ajouter un devis à la main).
        </p>
      )}
      {state?.ok === false && state.error ? (
        <p className="mt-2 text-xs text-red-700 dark:text-red-300">{state.error}</p>
      ) : null}
      <button
        type="submit"
        disabled={pending}
        className="mt-3 inline-flex min-h-[2.25rem] items-center justify-center rounded-lg bg-teal-700 px-4 py-2 text-xs font-bold text-white transition hover:bg-teal-800 disabled:opacity-50 dark:bg-teal-600 dark:hover:bg-teal-500"
      >
        {pending ? "Création…" : "Créer le chantier"}
      </button>
    </form>
  );
}

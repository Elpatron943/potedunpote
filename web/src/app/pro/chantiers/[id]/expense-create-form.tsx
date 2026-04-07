"use client";

import { useActionState } from "react";
import { addExpenseAction } from "../pilotage.actions";

const initial: { ok: boolean; error?: string } | null = null;

export function ExpenseCreateForm({ projectId }: { projectId: string }) {
  const [state, formAction, pending] = useActionState(addExpenseAction, initial);
  const today = new Date().toISOString().slice(0, 10);

  return (
    <form action={formAction} className="grid gap-3 rounded-xl border border-ink/10 bg-canvas/40 p-4 dark:border-white/10 dark:bg-canvas-muted/20">
      <input type="hidden" name="projectId" value={projectId} />
      {state?.ok === false && state.error ? (
        <p className="rounded-lg border border-red-500/30 bg-red-500/10 px-3 py-2 text-xs text-red-900 dark:text-red-200">
          {state.error}
        </p>
      ) : null}
      {state?.ok === true ? (
        <p className="rounded-lg border border-emerald-500/30 bg-emerald-500/10 px-3 py-2 text-xs text-emerald-950 dark:text-emerald-100">
          Dépense ajoutée.
        </p>
      ) : null}
      <div className="grid gap-3 sm:grid-cols-2">
        <label className="flex flex-col gap-1">
          <span className="text-[11px] font-semibold uppercase tracking-wider text-ink-soft">Libellé</span>
          <input name="label" required className="rounded-lg border border-ink/10 bg-canvas/80 px-3 py-2 text-sm text-ink dark:border-white/10 dark:bg-canvas-muted/40" placeholder="Ex. Matériaux" />
        </label>
        <label className="flex flex-col gap-1">
          <span className="text-[11px] font-semibold uppercase tracking-wider text-ink-soft">Montant (€)</span>
          <input name="amountEuros" required inputMode="decimal" className="rounded-lg border border-ink/10 bg-canvas/80 px-3 py-2 text-sm text-ink dark:border-white/10 dark:bg-canvas-muted/40" placeholder="ex. 85,50" />
        </label>
      </div>
      <div className="grid gap-3 sm:grid-cols-3">
        <label className="flex flex-col gap-1">
          <span className="text-[11px] font-semibold uppercase tracking-wider text-ink-soft">Date</span>
          <input type="date" name="expenseDate" defaultValue={today} className="rounded-lg border border-ink/10 bg-canvas/80 px-3 py-2 text-sm text-ink dark:border-white/10 dark:bg-canvas-muted/40" />
        </label>
        <label className="flex flex-col gap-1">
          <span className="text-[11px] font-semibold uppercase tracking-wider text-ink-soft">Catégorie</span>
          <select name="category" className="rounded-lg border border-ink/10 bg-canvas/80 px-3 py-2 text-sm text-ink dark:border-white/10 dark:bg-canvas-muted/40" defaultValue="OTHER">
            <option value="MATERIAL">Matériaux</option>
            <option value="SUBCONTRACT">Sous-traitance</option>
            <option value="TRAVEL">Déplacement</option>
            <option value="OTHER">Autre</option>
          </select>
        </label>
        <label className="flex flex-col gap-1 sm:col-span-1">
          <span className="text-[11px] font-semibold uppercase tracking-wider text-ink-soft">Note</span>
          <input name="note" className="rounded-lg border border-ink/10 bg-canvas/80 px-3 py-2 text-sm text-ink dark:border-white/10 dark:bg-canvas-muted/40" placeholder="Optionnel" />
        </label>
      </div>
      <button type="submit" disabled={pending} className="rounded-lg bg-teal-700 px-3 py-2 text-sm font-bold text-white transition hover:bg-teal-800 disabled:opacity-50 dark:bg-teal-600 dark:hover:bg-teal-500">
        {pending ? "Ajout…" : "Ajouter"}
      </button>
    </form>
  );
}


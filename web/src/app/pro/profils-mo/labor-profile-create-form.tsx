"use client";

import { useActionState } from "react";

import { createLaborProfileAction } from "@/app/pro/chantiers/pilotage.actions";

const initial: { ok: boolean; error?: string } | null = null;

export function LaborProfileCreateForm() {
  const [state, formAction, pending] = useActionState(createLaborProfileAction, initial);

  return (
    <form action={formAction} className="grid gap-3 rounded-xl border border-ink/10 bg-canvas/40 p-4 dark:border-white/10 dark:bg-canvas-muted/20">
      {state?.ok === false && state.error ? (
        <p className="rounded-lg border border-red-500/30 bg-red-500/10 px-3 py-2 text-xs text-red-900 dark:text-red-200">{state.error}</p>
      ) : null}
      {state?.ok === true ? (
        <p className="rounded-lg border border-emerald-500/30 bg-emerald-500/10 px-3 py-2 text-xs text-emerald-950 dark:text-emerald-100">
          Profil ajouté.
        </p>
      ) : null}
      <div className="grid gap-3 sm:grid-cols-2">
        <label className="flex flex-col gap-1">
          <span className="text-[11px] font-semibold uppercase tracking-wider text-ink-soft">Libellé du profil</span>
          <input
            name="label"
            required
            maxLength={80}
            placeholder="ex. Chef d'équipe, Ouvrier qualifié…"
            className="rounded-lg border border-ink/10 bg-canvas/80 px-3 py-2 text-sm text-ink dark:border-white/10 dark:bg-canvas-muted/40"
          />
        </label>
        <label className="flex flex-col gap-1">
          <span className="text-[11px] font-semibold uppercase tracking-wider text-ink-soft">TJM interne (€/jour)</span>
          <input
            name="internalTjmEuros"
            inputMode="decimal"
            required
            placeholder="ex. 380"
            className="rounded-lg border border-ink/10 bg-canvas/80 px-3 py-2 text-sm text-ink dark:border-white/10 dark:bg-canvas-muted/40"
          />
        </label>
      </div>
      <button
        type="submit"
        disabled={pending}
        className="rounded-lg bg-teal-700 px-3 py-2 text-sm font-bold text-white transition hover:bg-teal-800 disabled:opacity-50 dark:bg-teal-600 dark:hover:bg-teal-500"
      >
        {pending ? "Ajout…" : "Ajouter un profil"}
      </button>
    </form>
  );
}

"use client";

import { useActionState } from "react";
import { addTimeEntryAction } from "../pilotage.actions";

const initial: { ok: boolean; error?: string } | null = null;

export type LaborProfileOption = { id: string; label: string };

export function TimeCreateForm({
  projectId,
  laborProfiles = [],
}: {
  projectId: string;
  laborProfiles?: LaborProfileOption[];
}) {
  const [state, formAction, pending] = useActionState(addTimeEntryAction, initial);
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
          Temps ajouté.
        </p>
      ) : null}
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <label className="flex flex-col gap-1">
          <span className="text-[11px] font-semibold uppercase tracking-wider text-ink-soft">Date</span>
          <input type="date" name="workDate" defaultValue={today} className="rounded-lg border border-ink/10 bg-canvas/80 px-3 py-2 text-sm text-ink dark:border-white/10 dark:bg-canvas-muted/40" />
        </label>
        <label className="flex flex-col gap-1">
          <span className="text-[11px] font-semibold uppercase tracking-wider text-ink-soft">Minutes</span>
          <input name="minutes" inputMode="numeric" required className="rounded-lg border border-ink/10 bg-canvas/80 px-3 py-2 text-sm text-ink dark:border-white/10 dark:bg-canvas-muted/40" placeholder="ex. 90" />
        </label>
        <label className="flex flex-col gap-1 lg:col-span-1">
          <span className="text-[11px] font-semibold uppercase tracking-wider text-ink-soft">Profil (TJM)</span>
          <select
            name="laborProfileId"
            className="rounded-lg border border-ink/10 bg-canvas/80 px-3 py-2 text-sm text-ink dark:border-white/10 dark:bg-canvas-muted/40"
          >
            <option value="">TJM du chantier (défaut)</option>
            {laborProfiles.map((p) => (
              <option key={p.id} value={p.id}>
                {p.label}
              </option>
            ))}
          </select>
        </label>
        <label className="flex flex-col gap-1 sm:col-span-2 lg:col-span-1">
          <span className="text-[11px] font-semibold uppercase tracking-wider text-ink-soft">Note</span>
          <input name="note" className="rounded-lg border border-ink/10 bg-canvas/80 px-3 py-2 text-sm text-ink dark:border-white/10 dark:bg-canvas-muted/40" placeholder="ex. Pose / déplacement" />
        </label>
      </div>
      <button type="submit" disabled={pending} className="rounded-lg bg-teal-700 px-3 py-2 text-sm font-bold text-white transition hover:bg-teal-800 disabled:opacity-50 dark:bg-teal-600 dark:hover:bg-teal-500">
        {pending ? "Ajout…" : "Ajouter"}
      </button>
    </form>
  );
}


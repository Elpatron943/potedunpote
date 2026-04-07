"use client";

import { useActionState } from "react";

import { createProjectAction } from "./pilotage.actions";

const initial: { ok: boolean; error?: string } | null = null;

export function ProjectsCreateForm() {
  const [state, formAction, pending] = useActionState(createProjectAction, initial);

  return (
    <form action={formAction} className="space-y-4 rounded-2xl border border-[var(--card-border)] bg-[var(--card)] p-6 shadow-sm dark:border-white/10">
      {state?.ok === false && state.error ? (
        <p className="rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-900 dark:text-red-200">
          {state.error}
        </p>
      ) : null}
      <h2 className="text-lg font-semibold text-ink">Créer un chantier</h2>
      <label className="flex flex-col gap-2">
        <span className="text-xs font-semibold uppercase tracking-wider text-ink-soft">Titre</span>
        <input
          name="title"
          required
          className="rounded-xl border border-ink/10 bg-canvas/80 px-3 py-2.5 text-sm text-ink dark:border-white/10 dark:bg-canvas-muted/40"
          placeholder="Ex. Remplacement chauffe-eau"
          maxLength={160}
        />
      </label>
      <label className="flex flex-col gap-2">
        <span className="text-xs font-semibold uppercase tracking-wider text-ink-soft">Client (optionnel)</span>
        <input
          name="clientName"
          className="rounded-xl border border-ink/10 bg-canvas/80 px-3 py-2.5 text-sm text-ink dark:border-white/10 dark:bg-canvas-muted/40"
          placeholder="Ex. M. Dupont"
          maxLength={160}
        />
      </label>
      <label className="flex flex-col gap-2">
        <span className="text-xs font-semibold uppercase tracking-wider text-ink-soft">Notes (optionnel)</span>
        <textarea
          name="notes"
          rows={3}
          className="rounded-xl border border-ink/10 bg-canvas/80 px-3 py-2.5 text-sm text-ink dark:border-white/10 dark:bg-canvas-muted/40"
          placeholder="Adresse, contraintes, matériaux…"
        />
      </label>
      <button
        type="submit"
        disabled={pending}
        className="w-full rounded-xl bg-teal-700 px-4 py-2.5 text-sm font-bold text-white transition hover:bg-teal-800 disabled:opacity-50 dark:bg-teal-600 dark:hover:bg-teal-500"
      >
        {pending ? "Création…" : "Créer"}
      </button>
    </form>
  );
}


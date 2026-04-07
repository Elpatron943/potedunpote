"use client";

import { useActionState } from "react";

import { updateProjectClientEmailAction } from "../pilotage.actions";

const initial: { ok: boolean; error?: string } | null = null;

export function ClientEmailForm({
  projectId,
  defaultEmail,
}: {
  projectId: string;
  defaultEmail: string | null;
}) {
  const [state, formAction, pending] = useActionState(updateProjectClientEmailAction, initial);
  return (
    <form action={formAction} className="mt-3 flex flex-col gap-2 rounded-xl border border-ink/10 bg-canvas/40 p-3 text-sm dark:border-white/10 dark:bg-canvas-muted/20 sm:flex-row sm:items-end sm:flex-wrap">
      <input type="hidden" name="projectId" value={projectId} />
      {state?.ok === false && state.error ? (
        <p className="w-full rounded-lg border border-red-500/30 bg-red-500/10 px-2 py-1.5 text-xs text-red-900 dark:text-red-200">
          {state.error}
        </p>
      ) : null}
      {state?.ok === true ? (
        <p className="w-full rounded-lg border border-emerald-500/30 bg-emerald-500/10 px-2 py-1.5 text-xs text-emerald-950 dark:text-emerald-100">
          E-mail enregistré.
        </p>
      ) : null}
      <label className="flex min-w-[200px] flex-1 flex-col gap-1">
        <span className="text-[11px] font-semibold uppercase tracking-wider text-ink-soft">E-mail du client (envoi devis)</span>
        <input
          name="clientEmail"
          type="email"
          required
          defaultValue={defaultEmail ?? ""}
          className="rounded-lg border border-ink/10 bg-canvas/80 px-3 py-2 text-sm text-ink dark:border-white/10 dark:bg-canvas-muted/40"
          placeholder="client@exemple.fr"
        />
      </label>
      <button
        type="submit"
        disabled={pending}
        className="rounded-lg border border-teal-600/40 bg-teal-700/10 px-3 py-2 text-xs font-bold text-teal-900 transition hover:bg-teal-700/20 disabled:opacity-50 dark:text-teal-200 dark:hover:bg-teal-500/20"
      >
        {pending ? "…" : "Enregistrer"}
      </button>
    </form>
  );
}

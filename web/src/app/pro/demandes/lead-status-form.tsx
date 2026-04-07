"use client";

import { useActionState } from "react";

import { proUpdateLeadStatusAction } from "@/app/pro/leads.actions";

const LABELS: Record<string, string> = {
  NEW: "Nouveau",
  IN_PROGRESS: "En cours",
  CLOSED: "Clôturé",
  ARCHIVED: "Archivé",
};

type Props = {
  leadId: string;
  currentStatus: string;
};

export function LeadStatusForm({ leadId, currentStatus }: Props) {
  const [state, action, pending] = useActionState(proUpdateLeadStatusAction, null);

  return (
    <form action={action} className="flex flex-wrap items-center gap-2">
      <input type="hidden" name="leadId" value={leadId} />
      <label className="sr-only" htmlFor={`lead-status-${leadId}`}>
        Statut de la demande
      </label>
      <select
        id={`lead-status-${leadId}`}
        name="status"
        defaultValue={currentStatus || "NEW"}
        disabled={pending}
        className="rounded-xl border border-ink/15 bg-canvas px-3 py-1.5 text-xs font-medium text-ink dark:border-white/15 dark:bg-canvas-muted/30"
      >
        {Object.entries(LABELS).map(([value, label]) => (
          <option key={value} value={value}>
            {label}
          </option>
        ))}
      </select>
      <button
        type="submit"
        disabled={pending}
        className="rounded-full bg-teal-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-teal-700 disabled:opacity-50 dark:bg-teal-500 dark:hover:bg-teal-400"
      >
        {pending ? "…" : "Enregistrer"}
      </button>
      {state?.ok === false && state.error ? (
        <span className="text-xs text-red-600 dark:text-red-400">{state.error}</span>
      ) : null}
    </form>
  );
}

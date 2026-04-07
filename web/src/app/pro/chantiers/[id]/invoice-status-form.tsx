"use client";

import { useActionState } from "react";

import { updateInvoiceStatusAction } from "../pilotage.actions";

const LABELS: Record<string, string> = {
  DRAFT: "Brouillon",
  ISSUED: "Émise",
  SENT: "Envoyée",
  PAID: "Payée",
};

type Props = {
  projectId: string;
  invoiceId: string;
  status: string;
};

export function InvoiceStatusForm({ projectId, invoiceId, status }: Props) {
  const [state, action, pending] = useActionState(updateInvoiceStatusAction, null);

  return (
    <form action={action} className="mt-2 flex flex-wrap items-center gap-2 border-t border-ink/5 pt-2 dark:border-white/10">
      <input type="hidden" name="projectId" value={projectId} />
      <input type="hidden" name="invoiceId" value={invoiceId} />
      <label className="sr-only" htmlFor={`inv-st-${invoiceId}`}>
        Statut facture
      </label>
      <select
        id={`inv-st-${invoiceId}`}
        name="status"
        defaultValue={status || "DRAFT"}
        disabled={pending}
        className="rounded-lg border border-ink/10 bg-canvas/80 px-2 py-1 text-xs text-ink dark:border-white/10 dark:bg-canvas-muted/40"
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
        className="rounded-lg bg-teal-600 px-2 py-1 text-xs font-semibold text-white hover:bg-teal-700 disabled:opacity-50 dark:bg-teal-500"
      >
        {pending ? "…" : "Appliquer"}
      </button>
      {state?.ok === false && state.error ? (
        <span className="text-xs text-red-600 dark:text-red-400">{state.error}</span>
      ) : null}
    </form>
  );
}

"use client";

import { useActionState } from "react";

import type { ProCatalogPickerItem } from "@/lib/pro-catalog-types";
import { createInvoiceAction } from "../pilotage.actions";
import { CatalogLinesEditor } from "../catalog-lines-editor";

const initial: { ok: boolean; error?: string } | null = null;

export function InvoiceCreateForm({ projectId, catalogItems }: { projectId: string; catalogItems: ProCatalogPickerItem[] }) {
  const [state, formAction, pending] = useActionState(createInvoiceAction, initial);
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
          Facture créée.
        </p>
      ) : null}
      <label className="flex flex-col gap-1">
        <span className="text-[11px] font-semibold uppercase tracking-wider text-ink-soft">Numéro</span>
        <input
          name="number"
          required
          className="rounded-lg border border-ink/10 bg-canvas/80 px-3 py-2 text-sm text-ink dark:border-white/10 dark:bg-canvas-muted/40"
          placeholder="FAC-2026-001"
        />
      </label>

      <div className="border-t border-ink/10 pt-3 dark:border-white/10">
        <p className="text-[11px] font-semibold uppercase tracking-wider text-ink-soft">Lignes & total</p>
        <p className="mt-1 text-xs text-ink-soft">Même principe que pour les devis : catalogue ou lignes libres, total calculé.</p>
        <div className="mt-3">
          <CatalogLinesEditor catalogItems={catalogItems} />
        </div>
      </div>

      <button
        type="submit"
        disabled={pending}
        className="rounded-lg bg-teal-700 px-3 py-2 text-sm font-bold text-white transition hover:bg-teal-800 disabled:opacity-50 dark:bg-teal-600 dark:hover:bg-teal-500"
      >
        {pending ? "Création…" : "Créer une facture"}
      </button>
    </form>
  );
}

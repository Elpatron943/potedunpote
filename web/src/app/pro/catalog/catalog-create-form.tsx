"use client";

import { useActionState } from "react";

import { createCatalogItemAction } from "./catalog.actions";
import { PRO_CATALOG_KIND_LABELS, PRO_CATALOG_KINDS } from "@/lib/pro-catalog-kinds";

const initial: { ok: boolean; error?: string } | null = null;

export function CatalogCreateForm() {
  const [state, formAction, pending] = useActionState(createCatalogItemAction, initial);

  return (
    <form action={formAction} className="grid gap-3 rounded-xl border border-ink/10 bg-canvas/40 p-4 dark:border-white/10 dark:bg-canvas-muted/20">
      {state?.ok === false && state.error ? (
        <p className="rounded-lg border border-red-500/30 bg-red-500/10 px-3 py-2 text-xs text-red-900 dark:text-red-200">{state.error}</p>
      ) : null}
      {state?.ok === true ? (
        <p className="rounded-lg border border-emerald-500/30 bg-emerald-500/10 px-3 py-2 text-xs text-emerald-950 dark:text-emerald-100">
          Article ajouté au catalogue.
        </p>
      ) : null}

      <div className="grid gap-3 sm:grid-cols-2">
        <label className="flex flex-col gap-1">
          <span className="text-[11px] font-semibold uppercase tracking-wider text-ink-soft">Type</span>
          <select
            name="kind"
            required
            className="rounded-lg border border-ink/10 bg-canvas/80 px-3 py-2 text-sm text-ink dark:border-white/10 dark:bg-canvas-muted/40"
            defaultValue="PRODUCT"
          >
            {PRO_CATALOG_KINDS.map((k) => (
              <option key={k} value={k}>
                {PRO_CATALOG_KIND_LABELS[k]}
              </option>
            ))}
          </select>
        </label>
        <label className="flex flex-col gap-1">
          <span className="text-[11px] font-semibold uppercase tracking-wider text-ink-soft">Unité (devis)</span>
          <input
            name="unit"
            className="rounded-lg border border-ink/10 bg-canvas/80 px-3 py-2 text-sm text-ink dark:border-white/10 dark:bg-canvas-muted/40"
            placeholder="forfait, jour, h, m², unité…"
            defaultValue="forfait"
          />
        </label>
      </div>

      <label className="flex flex-col gap-1">
        <span className="text-[11px] font-semibold uppercase tracking-wider text-ink-soft">Libellé</span>
        <input
          name="label"
          required
          minLength={2}
          maxLength={200}
          className="rounded-lg border border-ink/10 bg-canvas/80 px-3 py-2 text-sm text-ink dark:border-white/10 dark:bg-canvas-muted/40"
          placeholder="Ex. Carrelage 60×60 fourni posé, MO charpentier, ST électricité…"
        />
      </label>

      <label className="flex flex-col gap-1">
        <span className="text-[11px] font-semibold uppercase tracking-wider text-ink-soft">Description (optionnel)</span>
        <textarea
          name="description"
          rows={2}
          maxLength={4000}
          className="rounded-lg border border-ink/10 bg-canvas/80 px-3 py-2 text-sm text-ink dark:border-white/10 dark:bg-canvas-muted/40"
        />
      </label>

      <div className="grid gap-3 sm:grid-cols-3">
        <label className="flex flex-col gap-1">
          <span className="text-[11px] font-semibold uppercase tracking-wider text-ink-soft">Prix d’achat / coût (€)</span>
          <input
            name="purchaseEuros"
            inputMode="decimal"
            className="rounded-lg border border-ink/10 bg-canvas/80 px-3 py-2 text-sm text-ink dark:border-white/10 dark:bg-canvas-muted/40"
            placeholder="vide si inconnu"
          />
        </label>
        <label className="flex flex-col gap-1">
          <span className="text-[11px] font-semibold uppercase tracking-wider text-ink-soft">Prix de vente (€)</span>
          <input
            name="saleEuros"
            inputMode="decimal"
            className="rounded-lg border border-ink/10 bg-canvas/80 px-3 py-2 text-sm text-ink dark:border-white/10 dark:bg-canvas-muted/40"
            placeholder="TJM si unité « jour »"
          />
        </label>
        <label className="flex flex-col gap-1">
          <span className="text-[11px] font-semibold uppercase tracking-wider text-ink-soft">Ordre</span>
          <input
            name="sortOrder"
            type="number"
            min={0}
            max={999999}
            defaultValue={0}
            className="rounded-lg border border-ink/10 bg-canvas/80 px-3 py-2 text-sm text-ink dark:border-white/10 dark:bg-canvas-muted/40"
          />
        </label>
      </div>

      <p className="text-xs text-ink-soft">
        Pour la <strong>main d’œuvre</strong>, mets l’unité <span className="font-mono">jour</span> ou <span className="font-mono">h</span> et le prix de vente = TJM ou taux horaire.
      </p>

      <button
        type="submit"
        disabled={pending}
        className="rounded-lg bg-teal-700 px-3 py-2 text-sm font-bold text-white transition hover:bg-teal-800 disabled:opacity-50 dark:bg-teal-600 dark:hover:bg-teal-500"
      >
        {pending ? "Enregistrement…" : "Ajouter au catalogue"}
      </button>
    </form>
  );
}

"use client";

import { useActionState } from "react";

import { deleteCatalogItemAction, updateCatalogItemAction } from "./catalog.actions";
import { PRO_CATALOG_KIND_LABELS, PRO_CATALOG_KINDS, type ProCatalogKind } from "@/lib/pro-catalog-kinds";
import { formatEurFromCents } from "@/lib/format-money";

const initial: { ok: boolean; error?: string } | null = null;

export type CatalogItemRowData = {
  id: string;
  kind: string;
  label: string;
  description: string | null;
  unit: string;
  purchaseUnitPriceCents: number | null;
  saleUnitPriceCents: number | null;
  sortOrder: number;
};

function centsToInput(cents: number | null): string {
  if (cents == null) return "";
  return (cents / 100).toFixed(2);
}

export function CatalogItemRow({ item }: { item: CatalogItemRowData }) {
  const [updState, updAction, updPending] = useActionState(updateCatalogItemAction, initial);
  const [delState, delAction, delPending] = useActionState(deleteCatalogItemAction, initial);

  const kind = (PRO_CATALOG_KINDS as readonly string[]).includes(item.kind) ? (item.kind as ProCatalogKind) : "PRODUCT";

  return (
    <li className="rounded-xl border border-ink/10 bg-canvas/40 p-4 dark:border-white/10 dark:bg-canvas-muted/20">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wider text-teal-800 dark:text-teal-300">
            {PRO_CATALOG_KIND_LABELS[kind]}
          </p>
          <p className="mt-1 font-semibold text-ink">{item.label}</p>
          <p className="mt-0.5 text-xs text-ink-soft">
            Unité : <span className="font-mono">{item.unit}</span>
            {" · "}
            Achat :{" "}
            {item.purchaseUnitPriceCents != null ? formatEurFromCents(item.purchaseUnitPriceCents) : "—"}
            {" · "}
            Vente : {item.saleUnitPriceCents != null ? formatEurFromCents(item.saleUnitPriceCents) : "—"}
            {" · "}
            Tri {item.sortOrder}
          </p>
          {item.description ? <p className="mt-2 whitespace-pre-wrap text-xs text-ink-soft">{item.description}</p> : null}
        </div>
        <form action={delAction} className="shrink-0">
          <input type="hidden" name="id" value={item.id} />
          <button
            type="submit"
            disabled={delPending}
            className="text-xs font-semibold text-red-700 underline-offset-2 hover:underline disabled:opacity-50 dark:text-red-300"
          >
            {delPending ? "…" : "Supprimer"}
          </button>
        </form>
      </div>

      {delState?.ok === false && delState.error ? (
        <p className="mt-2 text-xs text-red-700 dark:text-red-300">{delState.error}</p>
      ) : null}

      <details className="mt-3 rounded-lg border border-ink/10 bg-canvas/60 p-3 dark:border-white/10 dark:bg-canvas-muted/30">
        <summary className="cursor-pointer text-xs font-semibold text-ink">Modifier</summary>
        <form action={updAction} className="mt-3 grid gap-3">
          <input type="hidden" name="id" value={item.id} />

          {updState?.ok === false && updState.error ? (
            <p className="rounded-lg border border-red-500/30 bg-red-500/10 px-3 py-2 text-xs text-red-900 dark:text-red-200">{updState.error}</p>
          ) : null}
          {updState?.ok === true ? (
            <p className="rounded-lg border border-emerald-500/30 bg-emerald-500/10 px-3 py-2 text-xs text-emerald-950 dark:text-emerald-100">
              Mis à jour.
            </p>
          ) : null}

          <div className="grid gap-3 sm:grid-cols-2">
            <label className="flex flex-col gap-1">
              <span className="text-[10px] font-semibold uppercase tracking-wider text-ink-soft">Type</span>
              <select
                name="kind"
                required
                defaultValue={kind}
                className="rounded-lg border border-ink/10 bg-canvas/80 px-2 py-1.5 text-sm text-ink dark:border-white/10 dark:bg-canvas-muted/40"
              >
                {PRO_CATALOG_KINDS.map((k) => (
                  <option key={k} value={k}>
                    {PRO_CATALOG_KIND_LABELS[k]}
                  </option>
                ))}
              </select>
            </label>
            <label className="flex flex-col gap-1">
              <span className="text-[10px] font-semibold uppercase tracking-wider text-ink-soft">Unité</span>
              <input
                name="unit"
                defaultValue={item.unit}
                className="rounded-lg border border-ink/10 bg-canvas/80 px-2 py-1.5 text-sm text-ink dark:border-white/10 dark:bg-canvas-muted/40"
              />
            </label>
          </div>
          <label className="flex flex-col gap-1">
            <span className="text-[10px] font-semibold uppercase tracking-wider text-ink-soft">Libellé</span>
            <input
              name="label"
              required
              minLength={2}
              defaultValue={item.label}
              className="rounded-lg border border-ink/10 bg-canvas/80 px-2 py-1.5 text-sm text-ink dark:border-white/10 dark:bg-canvas-muted/40"
            />
          </label>
          <label className="flex flex-col gap-1">
            <span className="text-[10px] font-semibold uppercase tracking-wider text-ink-soft">Description</span>
            <textarea
              name="description"
              rows={2}
              defaultValue={item.description ?? ""}
              className="rounded-lg border border-ink/10 bg-canvas/80 px-2 py-1.5 text-sm text-ink dark:border-white/10 dark:bg-canvas-muted/40"
            />
          </label>
          <div className="grid gap-3 sm:grid-cols-3">
            <label className="flex flex-col gap-1">
              <span className="text-[10px] font-semibold uppercase tracking-wider text-ink-soft">Achat (€)</span>
              <input
                name="purchaseEuros"
                inputMode="decimal"
                defaultValue={centsToInput(item.purchaseUnitPriceCents)}
                className="rounded-lg border border-ink/10 bg-canvas/80 px-2 py-1.5 text-sm text-ink dark:border-white/10 dark:bg-canvas-muted/40"
              />
            </label>
            <label className="flex flex-col gap-1">
              <span className="text-[10px] font-semibold uppercase tracking-wider text-ink-soft">Vente (€)</span>
              <input
                name="saleEuros"
                inputMode="decimal"
                defaultValue={centsToInput(item.saleUnitPriceCents)}
                className="rounded-lg border border-ink/10 bg-canvas/80 px-2 py-1.5 text-sm text-ink dark:border-white/10 dark:bg-canvas-muted/40"
              />
            </label>
            <label className="flex flex-col gap-1">
              <span className="text-[10px] font-semibold uppercase tracking-wider text-ink-soft">Ordre</span>
              <input
                name="sortOrder"
                type="number"
                min={0}
                defaultValue={item.sortOrder}
                className="rounded-lg border border-ink/10 bg-canvas/80 px-2 py-1.5 text-sm text-ink dark:border-white/10 dark:bg-canvas-muted/40"
              />
            </label>
          </div>
          <button
            type="submit"
            disabled={updPending}
            className="rounded-lg bg-teal-700 px-3 py-2 text-xs font-bold text-white transition hover:bg-teal-800 disabled:opacity-50 dark:bg-teal-600 dark:hover:bg-teal-500"
          >
            {updPending ? "…" : "Enregistrer"}
          </button>
        </form>
      </details>
    </li>
  );
}

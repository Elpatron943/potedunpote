"use client";

import { useMemo, useState } from "react";

import type { ProCatalogPickerItem } from "@/lib/pro-catalog-types";
import { PRO_CATALOG_KIND_LABELS } from "@/lib/pro-catalog-kinds";

type DraftLine = {
  key: string;
  label: string;
  qty: string;
  unit: string;
  unitPrice: string;
  catalogItemId?: string;
  purchaseUnitPrice?: number;
  kind?: string;
};

function newLineKey(): string {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

function centsToEurosInput(cents: number | null): string {
  if (cents == null) return "";
  return (cents / 100).toFixed(2);
}

function parseQty(raw: string): number {
  const n = Number(String(raw).replace(",", "."));
  if (!Number.isFinite(n) || n < 0) return 0;
  return n;
}

function parseUnitPriceEuros(raw: string): number {
  const n = Number(String(raw).trim().replace(/\s/g, "").replace(",", "."));
  if (!Number.isFinite(n) || n < 0) return 0;
  return n;
}

function buildPayload(lines: DraftLine[]): { linesJson: string; totalEuros: string } {
  const payload = lines.map((l) => {
    const qty = parseQty(l.qty);
    const unitPrice = parseUnitPriceEuros(l.unitPrice);
    const row: Record<string, unknown> = {
      label: l.label.trim() || "Ligne",
      qty: qty || 0,
      unit: l.unit.trim() || "forfait",
      unitPrice,
    };
    if (l.catalogItemId) row.catalogItemId = l.catalogItemId;
    if (l.purchaseUnitPrice != null && Number.isFinite(l.purchaseUnitPrice)) {
      row.purchaseUnitPrice = l.purchaseUnitPrice;
    }
    if (l.kind) row.kind = l.kind;
    return row;
  });

  let totalCents = 0;
  for (const l of lines) {
    const qty = parseQty(l.qty);
    const unitCents = Math.round(parseUnitPriceEuros(l.unitPrice) * 100);
    totalCents += Math.round(qty * unitCents);
  }

  const totalEuros = totalCents > 0 ? (totalCents / 100).toFixed(2) : "";

  return { linesJson: JSON.stringify(payload), totalEuros };
}

export function CatalogLinesEditor({ catalogItems }: { catalogItems: ProCatalogPickerItem[] }) {
  const [lines, setLines] = useState<DraftLine[]>([]);
  const [pickId, setPickId] = useState("");

  const { linesJson, totalEuros } = useMemo(() => buildPayload(lines), [lines]);

  const grouped = useMemo(() => {
    const m: Record<string, ProCatalogPickerItem[]> = { PRODUCT: [], LABOR: [], SUBCONTRACT: [] };
    for (const it of catalogItems) {
      if (m[it.kind]) m[it.kind].push(it);
    }
    return m;
  }, [catalogItems]);

  function addBlank() {
    setLines((prev) => [
      ...prev,
      { key: newLineKey(), label: "", qty: "1", unit: "forfait", unitPrice: "" },
    ]);
  }

  function addFromCatalog(id: string) {
    const it = catalogItems.find((x) => x.id === id);
    if (!it) return;
    const saleStr = centsToEurosInput(it.saleUnitPriceCents);
    const purchaseEur =
      it.purchaseUnitPriceCents != null ? Math.round(it.purchaseUnitPriceCents) / 100 : undefined;
    setLines((prev) => [
      ...prev,
      {
        key: newLineKey(),
        label: it.label,
        qty: "1",
        unit: it.unit,
        unitPrice: saleStr === "" ? "0" : saleStr,
        catalogItemId: it.id,
        purchaseUnitPrice: purchaseEur,
        kind: it.kind,
      },
    ]);
    setPickId("");
  }

  function removeAt(key: string) {
    setLines((prev) => prev.filter((l) => l.key !== key));
  }

  function updateLine(key: string, patch: Partial<DraftLine>) {
    setLines((prev) => prev.map((l) => (l.key === key ? { ...l, ...patch } : l)));
  }

  const totalDisplay = useMemo(() => {
    let totalCents = 0;
    for (const l of lines) {
      const qty = parseQty(l.qty);
      const unitCents = Math.round(parseUnitPriceEuros(l.unitPrice) * 100);
      totalCents += Math.round(qty * unitCents);
    }
    return totalCents / 100;
  }, [lines]);

  return (
    <div className="grid gap-3">
      <input type="hidden" name="linesJson" value={linesJson} readOnly />
      <input type="hidden" name="totalEuros" value={totalEuros} readOnly />

      <div className="flex flex-wrap items-end gap-2">
        <label className="flex min-w-[12rem] flex-1 flex-col gap-1">
          <span className="text-[11px] font-semibold uppercase tracking-wider text-ink-soft">Insérer depuis le catalogue</span>
          <select
            value={pickId}
            onChange={(e) => setPickId(e.target.value)}
            className="rounded-lg border border-ink/10 bg-canvas/80 px-3 py-2 text-sm text-ink dark:border-white/10 dark:bg-canvas-muted/40"
          >
            <option value="">— Choisir —</option>
            {(["PRODUCT", "LABOR", "SUBCONTRACT"] as const).map((k) =>
              grouped[k].length ? (
                <optgroup key={k} label={PRO_CATALOG_KIND_LABELS[k]}>
                  {grouped[k].map((it) => (
                    <option key={it.id} value={it.id}>
                      {it.label}
                      {it.unit ? ` (${it.unit})` : ""}
                    </option>
                  ))}
                </optgroup>
              ) : null,
            )}
          </select>
        </label>
        <button
          type="button"
          disabled={!pickId}
          onClick={() => pickId && addFromCatalog(pickId)}
          className="rounded-lg border border-ink/15 bg-canvas-muted/50 px-3 py-2 text-sm font-semibold text-ink transition hover:bg-canvas-muted/70 disabled:opacity-40 dark:border-white/15 dark:bg-white/5 dark:hover:bg-white/10"
        >
          Insérer
        </button>
        <button
          type="button"
          onClick={addBlank}
          className="rounded-lg border border-teal-600/40 bg-teal-500/10 px-3 py-2 text-sm font-semibold text-teal-900 transition hover:bg-teal-500/20 dark:text-teal-100"
        >
          Ligne libre
        </button>
      </div>

      {lines.length === 0 ? (
        <p className="text-xs text-ink-soft">Aucune ligne : le total du document sera 0 € (tu peux tout saisir à la main plus tard via export JSON si besoin).</p>
      ) : (
        <ul className="space-y-3">
          {lines.map((l) => (
            <li
              key={l.key}
              className="grid gap-2 rounded-lg border border-ink/10 bg-canvas/60 p-3 dark:border-white/10 dark:bg-canvas-muted/25 sm:grid-cols-12 sm:items-end"
            >
              <label className="sm:col-span-4">
                <span className="text-[10px] font-semibold uppercase tracking-wider text-ink-soft">Libellé</span>
                <input
                  value={l.label}
                  onChange={(e) => updateLine(l.key, { label: e.target.value })}
                  className="mt-1 w-full rounded-lg border border-ink/10 bg-canvas/80 px-2 py-1.5 text-sm text-ink dark:border-white/10 dark:bg-canvas-muted/40"
                />
              </label>
              <label className="sm:col-span-2">
                <span className="text-[10px] font-semibold uppercase tracking-wider text-ink-soft">Qté</span>
                <input
                  value={l.qty}
                  inputMode="decimal"
                  onChange={(e) => updateLine(l.key, { qty: e.target.value })}
                  className="mt-1 w-full rounded-lg border border-ink/10 bg-canvas/80 px-2 py-1.5 text-sm text-ink dark:border-white/10 dark:bg-canvas-muted/40"
                />
              </label>
              <label className="sm:col-span-2">
                <span className="text-[10px] font-semibold uppercase tracking-wider text-ink-soft">Unité</span>
                <input
                  value={l.unit}
                  onChange={(e) => updateLine(l.key, { unit: e.target.value })}
                  className="mt-1 w-full rounded-lg border border-ink/10 bg-canvas/80 px-2 py-1.5 text-sm text-ink dark:border-white/10 dark:bg-canvas-muted/40"
                  placeholder="jour, h, m²…"
                />
              </label>
              <label className="sm:col-span-3">
                <span className="text-[10px] font-semibold uppercase tracking-wider text-ink-soft">Prix unitaire (€)</span>
                <input
                  value={l.unitPrice}
                  inputMode="decimal"
                  onChange={(e) => updateLine(l.key, { unitPrice: e.target.value })}
                  className="mt-1 w-full rounded-lg border border-ink/10 bg-canvas/80 px-2 py-1.5 text-sm text-ink dark:border-white/10 dark:bg-canvas-muted/40"
                />
              </label>
              <div className="flex sm:col-span-1 sm:justify-end">
                <button
                  type="button"
                  onClick={() => removeAt(l.key)}
                  className="text-xs font-semibold text-red-700 underline-offset-2 hover:underline dark:text-red-300"
                >
                  Retirer
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}

      <p className="text-sm text-ink-soft">
        Total lignes (prix × quantité) :{" "}
        <span className="font-semibold text-ink">
          {new Intl.NumberFormat("fr-FR", { style: "currency", currency: "EUR" }).format(totalDisplay)}
        </span>{" "}
        — transmis comme total du document.
      </p>
    </div>
  );
}

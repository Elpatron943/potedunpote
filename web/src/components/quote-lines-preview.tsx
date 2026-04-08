import { formatEurFromCents } from "@/lib/format-money";

function normalizeLinesJson(raw: unknown): unknown {
  if (typeof raw === "string") {
    try {
      return JSON.parse(raw) as unknown;
    } catch {
      return [];
    }
  }
  return raw;
}

function lineSubtotalCents(row: Record<string, unknown>): number {
  const qty = typeof row.qty === "number" && Number.isFinite(row.qty) ? row.qty : 0;
  const unitEur = typeof row.unitPrice === "number" && Number.isFinite(row.unitPrice) ? row.unitPrice : 0;
  return Math.round(qty * unitEur * 100);
}

type DisplayRow = {
  label: string;
  qty: number;
  unit: string;
  unitPriceCents: number;
  subtotalCents: number;
};

function parseDisplayRows(linesJson: unknown): DisplayRow[] {
  const data = normalizeLinesJson(linesJson);
  if (!Array.isArray(data) || data.length === 0) return [];
  const out: DisplayRow[] = [];
  for (const x of data) {
    if (!x || typeof x !== "object") continue;
    const o = x as Record<string, unknown>;
    const label = typeof o.label === "string" ? o.label.trim() : "Ligne";
    const qty = typeof o.qty === "number" && Number.isFinite(o.qty) ? o.qty : 0;
    const unit = typeof o.unit === "string" ? o.unit.trim() : "";
    const unitEur = typeof o.unitPrice === "number" && Number.isFinite(o.unitPrice) ? o.unitPrice : 0;
    const unitPriceCents = Math.round(unitEur * 100);
    out.push({
      label: label || "Ligne",
      qty,
      unit,
      unitPriceCents,
      subtotalCents: lineSubtotalCents(o),
    });
  }
  return out;
}

type Props = {
  linesJson: unknown;
  /** ouvre le panneau par défaut (ex. brouillon à relire avant envoi) */
  defaultOpen?: boolean;
  className?: string;
};

/**
 * Aperçu lecture seule des postes du devis (même structure que l’e-mail client).
 */
export function QuoteLinesPreview({ linesJson, defaultOpen = false, className = "" }: Props) {
  const rows = parseDisplayRows(linesJson);
  if (rows.length === 0) {
    return (
      <p className={`text-xs text-ink-soft ${className}`.trim()}>
        Aucune ligne détaillée sur ce devis.
      </p>
    );
  }

  return (
    <details
      open={defaultOpen}
      className={`group rounded-lg border border-ink/10 bg-canvas/60 dark:border-white/10 dark:bg-canvas-muted/20 ${className}`.trim()}
    >
      <summary className="cursor-pointer list-none px-3 py-2 text-xs font-semibold text-teal-900 marker:hidden dark:text-teal-200 [&::-webkit-details-marker]:hidden">
        <span className="underline-offset-2 group-open:underline">Voir le détail du devis</span>
        <span className="ml-2 font-normal text-ink-soft">
          ({rows.length} ligne{rows.length > 1 ? "s" : ""})
        </span>
      </summary>
      <div className="border-t border-ink/10 px-2 pb-2 pt-1 dark:border-white/10">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[280px] border-collapse text-left text-[11px] text-ink">
            <thead>
              <tr className="border-b border-ink/10 text-[10px] font-semibold uppercase tracking-wide text-ink-soft dark:border-white/10">
                <th className="py-1.5 pl-1 pr-2">Désignation</th>
                <th className="py-1.5 pr-2 text-right">Qté</th>
                <th className="py-1.5 pr-2 text-right">P.U.</th>
                <th className="py-1.5 pr-1 text-right">Montant</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r, i) => (
                <tr key={i} className="border-b border-ink/5 last:border-0 dark:border-white/5">
                  <td className="max-w-[200px] py-1.5 pl-1 pr-2 align-top">{r.label}</td>
                  <td className="whitespace-nowrap py-1.5 pr-2 text-right align-top tabular-nums">
                    {r.qty}
                    {r.unit ? ` ${r.unit}` : ""}
                  </td>
                  <td className="whitespace-nowrap py-1.5 pr-2 text-right align-top tabular-nums">
                    {formatEurFromCents(r.unitPriceCents)}
                  </td>
                  <td className="whitespace-nowrap py-1.5 pr-1 text-right align-top tabular-nums font-medium">
                    {formatEurFromCents(r.subtotalCents)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </details>
  );
}

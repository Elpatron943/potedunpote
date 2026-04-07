import type { AiSuggestedLine, AiVigilancePoint } from "@/lib/lead-ai-draft";

function asStringArray(v: unknown): string[] {
  if (!Array.isArray(v)) return [];
  return v.map((x) => String(x)).filter(Boolean);
}

function asSuggestedLines(v: unknown): AiSuggestedLine[] {
  if (!Array.isArray(v)) return [];
  const out: AiSuggestedLine[] = [];
  for (const x of v) {
    if (!x || typeof x !== "object") continue;
    const o = x as Record<string, unknown>;
    const label = typeof o.label === "string" ? o.label : "";
    if (!label) continue;
    out.push({
      label,
      qty: typeof o.qty === "number" ? o.qty : 1,
      unit: typeof o.unit === "string" ? o.unit : "forfait",
      unitPrice: null,
      note: typeof o.note === "string" ? o.note : undefined,
    });
  }
  return out;
}

const NIVEAUX = new Set(["info", "attention", "prioritaire"]);

function asVigilancePoints(v: unknown): AiVigilancePoint[] {
  if (!Array.isArray(v)) return [];
  const out: AiVigilancePoint[] = [];
  for (const x of v) {
    if (!x || typeof x !== "object") continue;
    const o = x as Record<string, unknown>;
    const theme = typeof o.theme === "string" ? o.theme : "";
    const observation = typeof o.observation === "string" ? o.observation : "";
    const vigilance = typeof o.vigilance === "string" ? o.vigilance : "";
    const n = typeof o.niveau === "string" ? o.niveau.toLowerCase() : "info";
    const niveau = NIVEAUX.has(n) ? (n as AiVigilancePoint["niveau"]) : "info";
    if (!theme && !observation && !vigilance) continue;
    out.push({
      theme: theme || "Point de vigilance",
      observation: observation || "—",
      vigilance: vigilance || "—",
      niveau,
    });
  }
  return out;
}

function niveauStyles(n: AiVigilancePoint["niveau"]): string {
  switch (n) {
    case "prioritaire":
      return "border-red-500/35 bg-red-500/10 dark:border-red-400/30 dark:bg-red-950/30";
    case "attention":
      return "border-amber-500/35 bg-amber-500/10 dark:border-amber-400/30 dark:bg-amber-950/25";
    default:
      return "border-sky-500/25 bg-sky-500/5 dark:border-sky-400/20 dark:bg-sky-950/20";
  }
}

function niveauLabel(n: AiVigilancePoint["niveau"]): string {
  switch (n) {
    case "prioritaire":
      return "Prioritaire";
    case "attention":
      return "Attention";
    default:
      return "Info";
  }
}

export function LeadAiDraftSection({
  draft,
  attachments,
}: {
  draft: {
    status: string;
    summary: string | null;
    missingFields: unknown;
    suggestedLines: unknown;
    assumptions: unknown;
    vigilancePoints?: unknown;
    confidence: number | null;
    model: string | null;
  } | null;
  attachments: { id: string; storagePath: string }[];
}) {
  const vigilance = draft ? asVigilancePoints(draft.vigilancePoints) : [];

  return (
    <div className="mt-3 space-y-3">
      {attachments.length > 0 ? (
        <div className="rounded-xl border border-ink/10 bg-canvas/50 p-3 dark:border-white/10 dark:bg-canvas-muted/25">
          <p className="text-xs font-semibold uppercase tracking-wider text-ink-soft">Photos jointes</p>
          <ul className="mt-2 flex flex-wrap gap-2">
            {attachments.map((a) => (
              <li key={a.id} className="relative h-20 w-20 overflow-hidden rounded-lg border border-ink/10 dark:border-white/10">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={`/api/pro/lead-attachment?key=${encodeURIComponent(a.storagePath)}`}
                  alt=""
                  className="h-full w-full object-cover"
                />
              </li>
            ))}
          </ul>
        </div>
      ) : null}

      {draft ? (
        <div className="rounded-xl border border-violet-500/25 bg-violet-500/5 p-4 dark:border-violet-400/20 dark:bg-violet-950/25">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <p className="text-xs font-semibold uppercase tracking-wider text-violet-900 dark:text-violet-200">
              Brouillon IA (aide au devis)
            </p>
            <span className="text-[10px] font-mono text-ink-soft">
              {(draft.status as string) || "—"}
              {draft.model ? ` · ${draft.model}` : ""}
              {typeof draft.confidence === "number" ? ` · confiance ${draft.confidence}%` : ""}
            </span>
          </div>
          {draft.summary ? (
            <div className="mt-2">
              <p className="text-xs font-semibold uppercase tracking-wider text-ink-soft">Synthèse</p>
              <p className="mt-1 whitespace-pre-wrap text-sm leading-relaxed text-ink">{draft.summary as string}</p>
            </div>
          ) : null}

          {vigilance.length > 0 ? (
            <div className="mt-3 border-t border-ink/10 pt-3 dark:border-white/10">
              <p className="text-xs font-semibold uppercase tracking-wider text-violet-900 dark:text-violet-200">
                Points de vigilance (métier + analyse des photos / texte)
              </p>
              <ul className="mt-2 space-y-2">
                {vigilance.map((p, i) => (
                  <li
                    key={i}
                    className={`rounded-lg border px-3 py-2 text-sm ${niveauStyles(p.niveau)}`}
                  >
                    <div className="flex flex-wrap items-center justify-between gap-1">
                      <span className="font-semibold text-ink">{p.theme}</span>
                      <span className="text-[10px] font-bold uppercase tracking-wide text-ink-soft">
                        {niveauLabel(p.niveau)}
                      </span>
                    </div>
                    <p className="mt-1 text-xs text-ink-soft">
                      <span className="font-medium text-ink">Observation : </span>
                      {p.observation}
                    </p>
                    <p className="mt-1 text-xs text-ink">
                      <span className="font-medium">Vigilance : </span>
                      {p.vigilance}
                    </p>
                  </li>
                ))}
              </ul>
            </div>
          ) : null}

          {asStringArray(draft.missingFields).length > 0 ? (
            <div className="mt-3 border-t border-ink/10 pt-3 dark:border-white/10">
              <p className="text-xs font-semibold text-amber-900 dark:text-amber-200">Infos encore utiles</p>
              <ul className="mt-1 list-inside list-disc text-sm text-ink-soft">
                {asStringArray(draft.missingFields).map((t, i) => (
                  <li key={i}>{t}</li>
                ))}
              </ul>
            </div>
          ) : null}

          {asSuggestedLines(draft.suggestedLines).length > 0 ? (
            <div className="mt-3 border-t border-ink/10 pt-3 dark:border-white/10">
              <p className="text-xs font-semibold text-ink-soft">Postes suggérés (sans prix — à saisir)</p>
              <ul className="mt-2 space-y-2 text-sm">
                {asSuggestedLines(draft.suggestedLines).map((line, i) => (
                  <li key={i} className="rounded-lg border border-ink/10 bg-[var(--card)] px-3 py-2 dark:border-white/10">
                    <span className="font-medium text-ink">{line.label}</span>
                    <span className="text-ink-soft">
                      {" "}
                      · {line.qty} {line.unit}
                    </span>
                    {line.note ? <p className="mt-0.5 text-xs text-ink-soft">{line.note}</p> : null}
                  </li>
                ))}
              </ul>
            </div>
          ) : null}

          {asStringArray(draft.assumptions).length > 0 ? (
            <div className="mt-3 border-t border-ink/10 pt-3 dark:border-white/10">
              <p className="text-xs font-semibold text-ink-soft">Hypothèses</p>
              <ul className="mt-1 list-inside list-disc text-xs text-ink-soft">
                {asStringArray(draft.assumptions).map((t, i) => (
                  <li key={i}>{t}</li>
                ))}
              </ul>
            </div>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}

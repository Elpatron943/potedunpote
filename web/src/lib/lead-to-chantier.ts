import { quotePayloadToDisplayPairs } from "@/lib/quote-request";

/** Convertit les lignes suggérées par l’IA en lignes `linesJson` devis (prix unitaire 0 € à compléter). */
export function aiSuggestedLinesToQuoteLinesJson(raw: unknown): Record<string, unknown>[] {
  if (!Array.isArray(raw)) return [];
  const out: Record<string, unknown>[] = [];
  for (const x of raw) {
    if (!x || typeof x !== "object") continue;
    const o = x as Record<string, unknown>;
    const label = typeof o.label === "string" ? o.label.slice(0, 300) : "";
    if (!label) continue;
    const qty = typeof o.qty === "number" && Number.isFinite(o.qty) ? Math.max(0, o.qty) : 1;
    const unit = typeof o.unit === "string" ? o.unit.slice(0, 40) : "forfait";
    const note = typeof o.note === "string" ? o.note.slice(0, 500) : undefined;
    const row: Record<string, unknown> = {
      label,
      qty,
      unit,
      unitPrice: 0,
      source: "ai_draft",
    };
    if (note) row.note = note;
    out.push(row);
  }
  return out;
}

export function countAiSuggestedLines(raw: unknown): number {
  return aiSuggestedLinesToQuoteLinesJson(raw).length;
}

function formatVigilanceBlock(raw: unknown): string | null {
  if (!Array.isArray(raw) || raw.length === 0) return null;
  const blocks: string[] = [];
  for (const x of raw) {
    if (!x || typeof x !== "object") continue;
    const o = x as Record<string, unknown>;
    const theme = typeof o.theme === "string" ? o.theme.trim() : "";
    const obs = typeof o.observation === "string" ? o.observation.trim() : "";
    const vig = typeof o.vigilance === "string" ? o.vigilance.trim() : "";
    const niv = typeof o.niveau === "string" ? o.niveau.trim() : "";
    if (!theme && !obs && !vig) continue;
    const head = niv ? `[${niv}] ${theme || "Vigilance"}` : theme || "Vigilance";
    const body = [obs ? `Observation : ${obs}` : null, vig ? `Vigilance : ${vig}` : null].filter(Boolean).join("\n");
    if (body) blocks.push(`${head}\n${body}`);
    else blocks.push(head);
  }
  if (blocks.length === 0) return null;
  return "— Points de vigilance (analyse IA) —\n\n" + blocks.join("\n\n");
}

export function buildChantierNotesFromLead(params: {
  message: string | null;
  requestPayload: unknown;
  email: string | null;
  phone: string | null;
  leadId: string;
  aiSummary: string | null;
  aiVigilancePoints?: unknown;
}): string {
  const parts: string[] = [];
  if (params.message?.trim()) {
    parts.push("— Message —\n" + params.message.trim());
  }
  const pairs = quotePayloadToDisplayPairs(params.requestPayload);
  if (pairs.length > 0) {
    parts.push("— Dossier structuré —\n" + pairs.map((p) => `${p.label} : ${p.value}`).join("\n"));
  }
  const vig = formatVigilanceBlock(params.aiVigilancePoints);
  if (vig) parts.push(vig);
  if (params.aiSummary?.trim()) {
    parts.push("— Synthèse IA (brouillon) —\n" + params.aiSummary.trim());
  }
  const contact: string[] = [];
  if (params.email?.trim()) contact.push(`E-mail : ${params.email.trim()}`);
  if (params.phone?.trim()) contact.push(`Tél. : ${params.phone.trim()}`);
  if (contact.length) parts.push(contact.join("\n"));
  parts.push(`Réf. demande plateforme : ${params.leadId}`);
  return parts.join("\n\n").slice(0, 8000);
}

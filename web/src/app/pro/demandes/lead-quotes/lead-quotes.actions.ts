"use server";

import OpenAI from "openai";
import { createId } from "@paralleldrive/cuid2";
import { revalidatePath } from "next/cache";

import { requireProContext } from "@/lib/pro-auth";
import { hasPlanAtLeast } from "@/lib/pro-plan";
import { getSupabaseAdmin } from "@/lib/supabase/admin";
import { buildChantierNotesFromLead } from "@/lib/lead-to-chantier";
import { archiveLeadFromQuoteBinding } from "@/lib/pro-lead-pipeline";

type CatalogItem = {
  id: string;
  kind: string;
  label: string;
  unit: string | null;
  purchaseUnitPriceCents: number | null;
  saleUnitPriceCents: number | null;
};

type AiLine = {
  catalogItemId: string | null;
  label: string;
  qty: number;
  unit: string;
  /** euros */
  unitPrice: number;
  note?: string | null;
};

function safeTrim(x: unknown): string {
  return typeof x === "string" ? x.trim() : "";
}

function centsToEur(cents: number | null): number | null {
  if (cents == null || !Number.isFinite(cents)) return null;
  return Math.round(cents) / 100;
}

function systemPrompt(): string {
  return [
    "Tu es un assistant devis pour un artisan du BTP.",
    "Objectif: proposer des lignes de devis en réutilisant le catalogue fourni.",
    "",
    "Règles:",
    "- Utilise en priorité un item du catalogue (catalogItemId).",
    "- Si aucun item ne correspond, mets catalogItemId=null et une ligne libre.",
    "- unitPrice est en euros.",
    "- qty est un nombre > 0. unit est une chaîne (si doute: 'forfait').",
    "",
    "Réponds en JSON strict:",
    "{ \"lines\": [ {\"catalogItemId\": string|null, \"label\": string, \"qty\": number, \"unit\": string, \"unitPrice\": number, \"note\"?: string } ] }",
  ].join("\n");
}

function parseAiJson(raw: string): { ok: true; lines: AiLine[] } | { ok: false; error: string } {
  const t = raw.trim();
  if (!t) return { ok: false, error: "Réponse IA vide." };
  let jsonText = t;
  const fence = t.match(/```(?:json)?\\s*([\\s\\S]*?)\\s*```/i);
  if (fence?.[1]) jsonText = fence[1].trim();
  try {
    const parsed = JSON.parse(jsonText) as { lines?: unknown };
    if (!Array.isArray(parsed.lines)) return { ok: false, error: "Réponse IA invalide." };
    const out: AiLine[] = [];
    for (const x of parsed.lines) {
      if (!x || typeof x !== "object") continue;
      const o = x as Record<string, unknown>;
      const label = safeTrim(o.label).slice(0, 300) || "Ligne";
      const qtyRaw = typeof o.qty === "number" ? o.qty : Number(String(o.qty ?? "").replace(",", "."));
      const qty = Number.isFinite(qtyRaw) && qtyRaw > 0 ? qtyRaw : 1;
      const unit = safeTrim(o.unit).slice(0, 40) || "forfait";
      const upRaw =
        typeof o.unitPrice === "number" ? o.unitPrice : Number(String(o.unitPrice ?? "").replace(",", "."));
      const unitPrice = Number.isFinite(upRaw) && upRaw >= 0 ? upRaw : 0;
      const catalogItemId = o.catalogItemId == null ? null : safeTrim(o.catalogItemId).slice(0, 80) || null;
      const note = safeTrim(o.note).slice(0, 500) || null;
      out.push({ catalogItemId, label, qty, unit, unitPrice, note });
    }
    if (out.length === 0) return { ok: false, error: "Aucune ligne exploitable." };
    return { ok: true, lines: out };
  } catch {
    return { ok: false, error: "Réponse IA non JSON." };
  }
}

function computeTotalCents(lines: AiLine[]): number {
  let total = 0;
  for (const l of lines) total += Math.round(l.qty * l.unitPrice * 100);
  return Math.max(0, total);
}

export async function prepareQuoteFromLeadWithAiAction(
  _prev: { ok: boolean; error?: string; quoteId?: string } | null,
  formData: FormData,
): Promise<{ ok: boolean; error?: string; quoteId?: string }> {
  const ctx = await requireProContext();
  if (!ctx.artisanProfile) return { ok: false, error: "Profil requis." };
  const planId = ctx.subscription.planId;
  if (!ctx.subscription.isActive || !planId || !hasPlanAtLeast(planId, "pilotage")) {
    return { ok: false, error: "Pro Pilotage requis." };
  }

  const leadId = safeTrim(formData.get("leadId"));
  if (!leadId) return { ok: false, error: "Demande invalide." };

  const supabase = getSupabaseAdmin();
  const { data: lead, error: leadErr } = await supabase
    .from("ProLead")
    .select("id,siren,fullName,message,metierId,prestationId,requestPayload")
    .eq("id", leadId)
    .maybeSingle();
  if (leadErr || !lead || (lead.siren as string) !== ctx.artisanProfile.siren) {
    return { ok: false, error: "Demande introuvable." };
  }

  const { data: draft } = await supabase
    .from("ProLeadAiDraft")
    .select("summary,suggestedLines,status")
    .eq("leadId", leadId)
    .maybeSingle();

  const { data: catalogRows, error: catErr } = await supabase
    .from("ProCatalogItem")
    .select("id,kind,label,unit,purchaseUnitPriceCents,saleUnitPriceCents")
    .eq("siren", ctx.artisanProfile.siren)
    .order("sortOrder", { ascending: true })
    .order("createdAt", { ascending: false })
    .limit(500);
  if (catErr) return { ok: false, error: "Catalogue indisponible." };
  const catalog = (catalogRows ?? []) as CatalogItem[];

  const apiKey = process.env.OPENAI_API_KEY?.trim();
  if (!apiKey) return { ok: false, error: "OPENAI_API_KEY manquant (IA indisponible)." };

  const openai = new OpenAI({ apiKey });
  const model = (process.env.OPENAI_QUOTE_FROM_CATALOG_MODEL ?? "gpt-4o-mini").trim();

  const leadBlock = [
    `Client: ${safeTrim(lead.fullName) || "—"}`,
    `Message: ${safeTrim(lead.message) || "—"}`,
    `Dossier(JSON): ${lead.requestPayload ? JSON.stringify(lead.requestPayload) : "{}"}`,
    `Brouillon IA (summary): ${safeTrim(draft?.summary) || "—"}`,
    `Brouillon IA (suggestedLines JSON): ${draft?.suggestedLines ? JSON.stringify(draft.suggestedLines) : "[]"}`,
  ].join("\\n");

  const catalogBlock =
    catalog.length === 0
      ? "CATALOGUE: (vide)"
      : "CATALOGUE:\\n" +
        catalog
          .slice(0, 500)
          .map((it) => {
            const sale = centsToEur(it.saleUnitPriceCents);
            return `- id=${it.id} kind=${it.kind} unit=${it.unit ?? "forfait"} label=${it.label} saleEur=${sale ?? "null"}`;
          })
          .join("\\n");

  const completion = await openai.chat.completions.create({
    model,
    messages: [
      { role: "system", content: systemPrompt() },
      { role: "user", content: `${leadBlock}\\n\\n${catalogBlock}` },
    ],
    temperature: 0.2,
    max_tokens: 1800,
  });

  const text = completion.choices[0]?.message?.content?.trim() ?? "";
  const parsed = parseAiJson(text);
  if (!parsed.ok) return { ok: false, error: parsed.error };

  // Enrichit lignes avec données catalogue (kind + purchaseUnitPrice) si match.
  const catalogById = new Map(catalog.map((c) => [c.id, c]));
  const linesJson = parsed.lines.map((l) => {
    const row: Record<string, unknown> = {
      label: l.label,
      qty: l.qty,
      unit: l.unit,
      unitPrice: l.unitPrice,
    };
    if (l.catalogItemId && catalogById.has(l.catalogItemId)) {
      const c = catalogById.get(l.catalogItemId)!;
      row.catalogItemId = c.id;
      row.kind = c.kind;
      const purchaseEur = centsToEur(c.purchaseUnitPriceCents);
      if (purchaseEur != null) row.purchaseUnitPrice = purchaseEur;
    }
    if (l.note) row.note = l.note;
    return row;
  });

  const totalCents = computeTotalCents(parsed.lines);
  const day = new Date().toISOString().slice(0, 10).replace(/-/g, "");
  const number = `DEV-${day}-${createId().slice(0, 6)}`.slice(0, 40);
  const now = new Date().toISOString();
  const quoteId = createId();

  const { error: insErr } = await supabase.from("ProQuote").insert({
    id: quoteId,
    projectId: null,
    leadId,
    number,
    status: "DRAFT",
    source: "LEAD",
    currency: "EUR",
    totalCents,
    linesJson,
    issuedAt: null,
    sentAt: null,
    acceptedAt: null,
    createdAt: now,
    updatedAt: now,
  });
  if (insErr) return { ok: false, error: "Création devis impossible." };

  revalidatePath("/pro/demandes");
  return { ok: true, quoteId };
}

export async function acceptLeadQuoteAsOrderAction(
  _prev: { ok: boolean; error?: string } | null,
  formData: FormData,
): Promise<{ ok: boolean; error?: string }> {
  const ctx = await requireProContext();
  if (!ctx.artisanProfile) return { ok: false, error: "Profil requis." };
  const planId = ctx.subscription.planId;
  if (!ctx.subscription.isActive || !planId || !hasPlanAtLeast(planId, "pilotage")) {
    return { ok: false, error: "Pro Pilotage requis." };
  }

  const quoteId = safeTrim(formData.get("quoteId"));
  if (!quoteId) return { ok: false, error: "Devis invalide." };

  const supabase = getSupabaseAdmin();
  const { data: q, error: qErr } = await supabase
    .from("ProQuote")
    .select("id,leadId,projectId,status")
    .eq("id", quoteId)
    .maybeSingle();
  if (qErr || !q) return { ok: false, error: "Devis introuvable." };
  if (q.projectId) return { ok: false, error: "Ce devis est déjà rattaché à un chantier (valide depuis le chantier)." };
  if (!q.leadId) return { ok: false, error: "Ce devis n’est pas lié à une demande." };
  if ((q.status as string) !== "SENT") {
    return { ok: false, error: "Le devis doit d’abord être envoyé, puis validé (commande)." };
  }

  const { data: lead, error: leadErr } = await supabase.from("ProLead").select("id,siren").eq("id", q.leadId).maybeSingle();
  if (leadErr || !lead || (lead.siren as string) !== ctx.artisanProfile.siren) {
    return { ok: false, error: "Accès refusé." };
  }

  const now = new Date().toISOString();
  const { error } = await supabase.from("ProQuote").update({ status: "ACCEPTED", acceptedAt: now, updatedAt: now }).eq("id", quoteId);
  if (error) return { ok: false, error: "Mise à jour impossible." };

  await archiveLeadFromQuoteBinding(supabase, {
    leadId: q.leadId as string,
    projectId: null,
    siren: ctx.artisanProfile.siren,
  });

  revalidatePath("/pro/demandes");
  revalidatePath("/pro/tableau");
  return { ok: true };
}

export async function openOrAttachChantierForLeadOrderAction(
  _prev: { ok: boolean; error?: string; projectId?: string } | null,
  formData: FormData,
): Promise<{ ok: boolean; error?: string; projectId?: string }> {
  const ctx = await requireProContext();
  if (!ctx.artisanProfile) return { ok: false, error: "Profil requis." };
  const planId = ctx.subscription.planId;
  if (!ctx.subscription.isActive || !planId || !hasPlanAtLeast(planId, "pilotage")) {
    return { ok: false, error: "Pro Pilotage requis." };
  }

  const quoteId = safeTrim(formData.get("quoteId"));
  if (!quoteId) return { ok: false, error: "Commande invalide." };

  const supabase = getSupabaseAdmin();
  const { data: q, error: qErr } = await supabase
    .from("ProQuote")
    .select("id,leadId,projectId,status")
    .eq("id", quoteId)
    .maybeSingle();
  if (qErr || !q) return { ok: false, error: "Commande introuvable." };
  if (q.projectId) return { ok: true, projectId: String(q.projectId) };
  if (!q.leadId) return { ok: false, error: "Cette commande n’est pas liée à une demande." };
  if ((q.status as string) !== "ACCEPTED") return { ok: false, error: "La commande doit d’abord être validée." };

  const { data: lead, error: leadErr } = await supabase
    .from("ProLead")
    .select("id,siren,fullName,email,phone,message,metierId,prestationId,requestPayload,addressText,requestAddressCity,requestAddressPostcode")
    .eq("id", q.leadId)
    .maybeSingle();
  if (leadErr || !lead || (lead.siren as string) !== ctx.artisanProfile.siren) {
    return { ok: false, error: "Accès refusé." };
  }

  const { data: draft } = await supabase
    .from("ProLeadAiDraft")
    .select("summary,vigilancePoints")
    .eq("leadId", q.leadId)
    .maybeSingle();

  const now = new Date().toISOString();
  const projectId = createId();
  const title = `Chantier — ${safeTrim(lead.fullName) || "Client"}`.slice(0, 120);
  const notes = buildChantierNotesFromLead({
    message: (lead.message as string | null) ?? null,
    requestPayload: lead.requestPayload,
    email: (lead.email as string | null) ?? null,
    phone: (lead.phone as string | null) ?? null,
    leadId: String(lead.id),
    aiSummary: safeTrim(draft?.summary) || null,
    aiVigilancePoints: draft?.vigilancePoints,
  });

  const { error: insErr } = await supabase.from("ProProject").insert({
    id: projectId,
    siren: ctx.artisanProfile.siren,
    title,
    status: "OPEN",
    clientName: safeTrim(lead.fullName) || null,
    clientEmail: safeTrim(lead.email) || null,
    sourceLeadId: String(lead.id),
    notes: notes || null,
    createdAt: now,
    updatedAt: now,
  });
  if (insErr) return { ok: false, error: "Ouverture chantier impossible." };

  const { error: linkErr } = await supabase.from("ProQuote").update({ projectId, updatedAt: now }).eq("id", quoteId);
  if (linkErr) return { ok: false, error: "Rattachement commande→chantier impossible." };

  revalidatePath("/pro/demandes");
  revalidatePath(`/pro/chantiers/${projectId}`);
  revalidatePath("/pro/chantiers");
  return { ok: true, projectId };
}


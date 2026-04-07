"use server";

import { createId } from "@paralleldrive/cuid2";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import {
  getBtpMetierLabelFromRef,
  getBtpReferentiel,
  getPrestationActiviteLabel,
} from "@/lib/btp-referentiel";
import { aiSuggestedLinesToQuoteLinesJson, buildChantierNotesFromLead } from "@/lib/lead-to-chantier";
import { requireProContext } from "@/lib/pro-auth";
import { hasPlanAtLeast } from "@/lib/pro-plan";
import { parseOptionalAmountEurosToCents } from "@/lib/parse-amount-euros";
import { getSupabaseAdmin } from "@/lib/supabase/admin";

function requirePilotage(ctx: Awaited<ReturnType<typeof requireProContext>>) {
  if (!ctx.artisanProfile) redirect("/pro/onboarding");
  const planId = ctx.subscription.planId;
  if (!ctx.subscription.isActive || !planId || !hasPlanAtLeast(planId, "pilotage")) redirect("/pro/offre");
}

export async function createProjectAction(_prev: { ok: boolean; error?: string } | null, formData: FormData) {
  const ctx = await requireProContext();
  requirePilotage(ctx);
  const titleRaw = String(formData.get("title") ?? "").trim();
  const title = titleRaw.slice(0, 160);
  if (title.length < 2) return { ok: false, error: "Titre requis." };
  const clientNameRaw = String(formData.get("clientName") ?? "").trim();
  const clientName = clientNameRaw.length > 0 ? clientNameRaw.slice(0, 160) : null;
  const notesRaw = String(formData.get("notes") ?? "").trim();
  const notes = notesRaw.length > 0 ? notesRaw.slice(0, 8000) : null;

  const supabase = getSupabaseAdmin();
  const now = new Date().toISOString();
  const id = createId();
  const { error } = await supabase.from("ProProject").insert({
    id,
    siren: ctx.artisanProfile!.siren,
    title,
    clientName,
    status: "OPEN",
    notes,
    createdAt: now,
    updatedAt: now,
  });
  if (error) return { ok: false, error: "Création impossible." };
  revalidatePath("/pro/chantiers");
  redirect(`/pro/chantiers/${id}`);
}

/** Crée un chantier depuis une demande entrante ; optionnel : devis brouillon (lignes IA, total 0 €). */
export async function createChantierFromLeadAction(
  _prev: { ok: boolean; error?: string } | null,
  formData: FormData,
): Promise<{ ok: boolean; error?: string }> {
  const ctx = await requireProContext();
  requirePilotage(ctx);
  const leadId = String(formData.get("leadId") ?? "").trim();
  if (!leadId) return { ok: false, error: "Demande invalide." };
  const withDraftQuote = String(formData.get("withDraftQuote") ?? "").trim() === "1";

  const supabase = getSupabaseAdmin();
  const { data: lead, error: leadErr } = await supabase
    .from("ProLead")
    .select("id,siren,fullName,email,phone,message,metierId,prestationId,requestPayload")
    .eq("id", leadId)
    .maybeSingle();
  if (leadErr || !lead || (lead.siren as string) !== ctx.artisanProfile!.siren) {
    return { ok: false, error: "Demande introuvable." };
  }

  const ref = await getBtpReferentiel();
  const metierId = lead.metierId as string | null;
  const prestationId = lead.prestationId as string | null;
  const metierLabel = metierId ? getBtpMetierLabelFromRef(ref, metierId) : null;
  const prestLabel =
    metierId && prestationId ? getPrestationActiviteLabel(ref, metierId, prestationId) : null;

  const clientNameRaw = String(lead.fullName ?? "").trim();
  const clientName = clientNameRaw.length > 0 ? clientNameRaw.slice(0, 160) : null;
  const titleBase = prestLabel ?? metierLabel ?? "Demande client";
  const title = `${titleBase}${clientName ? ` — ${clientName}` : ""}`.slice(0, 160);

  const { data: draft } = await supabase
    .from("ProLeadAiDraft")
    .select("summary,suggestedLines,status,vigilancePoints")
    .eq("leadId", leadId)
    .maybeSingle();

  const aiSummary =
    typeof draft?.summary === "string" && draft.summary.trim().length > 0 ? draft.summary.trim() : null;

  const notes = buildChantierNotesFromLead({
    message: (lead.message as string | null) ?? null,
    requestPayload: lead.requestPayload,
    email: (lead.email as string | null) ?? null,
    phone: (lead.phone as string | null) ?? null,
    leadId,
    aiSummary,
    aiVigilancePoints: draft?.vigilancePoints,
  });

  const now = new Date().toISOString();
  const projectId = createId();
  const { error: projErr } = await supabase.from("ProProject").insert({
    id: projectId,
    siren: ctx.artisanProfile!.siren,
    title,
    clientName,
    status: "OPEN",
    notes: notes.length > 0 ? notes : null,
    createdAt: now,
    updatedAt: now,
  });
  if (projErr) return { ok: false, error: "Création chantier impossible." };

  if (withDraftQuote && draft) {
    const lines = aiSuggestedLinesToQuoteLinesJson(draft.suggestedLines);
    if (lines.length > 0) {
      const day = new Date().toISOString().slice(0, 10).replace(/-/g, "");
      const number = `BROUILLON-${day}-${createId().slice(0, 6)}`.slice(0, 40);
      const { error: qErr } = await supabase.from("ProQuote").insert({
        id: createId(),
        projectId,
        number,
        status: "DRAFT",
        currency: "EUR",
        totalCents: 0,
        linesJson: lines,
        issuedAt: null,
        createdAt: now,
        updatedAt: now,
      });
      if (qErr) {
        console.error("[createChantierFromLead] quote insert", qErr);
      }
    }
  }

  revalidatePath("/pro/chantiers");
  revalidatePath(`/pro/chantiers/${projectId}`);
  revalidatePath("/pro/demandes");
  redirect(`/pro/chantiers/${projectId}`);
}

function parseLinesJson(raw: string): { ok: true; value: unknown } | { ok: false; error: string } {
  const t = raw.trim();
  if (!t) return { ok: true, value: null };
  try {
    const v = JSON.parse(t);
    return { ok: true, value: v };
  } catch {
    return { ok: false, error: "Lignes JSON invalides." };
  }
}

export async function createQuoteAction(_prev: { ok: boolean; error?: string } | null, formData: FormData) {
  const ctx = await requireProContext();
  requirePilotage(ctx);
  const projectId = String(formData.get("projectId") ?? "").trim();
  if (!projectId) return { ok: false, error: "Projet invalide." };

  const number = String(formData.get("number") ?? "").trim().slice(0, 40);
  if (!number) return { ok: false, error: "Numéro de devis requis." };

  const totalParsed = parseOptionalAmountEurosToCents(formData.get("totalEuros"));
  if (!totalParsed.ok) return { ok: false, error: totalParsed.error };
  const totalCents = totalParsed.cents ?? 0;

  const linesParsed = parseLinesJson(String(formData.get("linesJson") ?? ""));
  if (!linesParsed.ok) return { ok: false, error: linesParsed.error };

  const supabase = getSupabaseAdmin();
  const { data: proj } = await supabase.from("ProProject").select("id,siren").eq("id", projectId).maybeSingle();
  if (!proj || (proj.siren as string) !== ctx.artisanProfile!.siren) return { ok: false, error: "Accès refusé." };

  const now = new Date().toISOString();
  const id = createId();
  const { error } = await supabase.from("ProQuote").insert({
    id,
    projectId,
    number,
    status: "DRAFT",
    currency: "EUR",
    totalCents,
    linesJson: linesParsed.value,
    issuedAt: null,
    createdAt: now,
    updatedAt: now,
  });
  if (error) return { ok: false, error: "Création devis impossible." };
  revalidatePath(`/pro/chantiers/${projectId}`);
  return { ok: true };
}

export async function createInvoiceAction(_prev: { ok: boolean; error?: string } | null, formData: FormData) {
  const ctx = await requireProContext();
  requirePilotage(ctx);
  const projectId = String(formData.get("projectId") ?? "").trim();
  if (!projectId) return { ok: false, error: "Projet invalide." };

  const number = String(formData.get("number") ?? "").trim().slice(0, 40);
  if (!number) return { ok: false, error: "Numéro de facture requis." };

  const totalParsed = parseOptionalAmountEurosToCents(formData.get("totalEuros"));
  if (!totalParsed.ok) return { ok: false, error: totalParsed.error };
  const totalCents = totalParsed.cents ?? 0;

  const linesParsed = parseLinesJson(String(formData.get("linesJson") ?? ""));
  if (!linesParsed.ok) return { ok: false, error: linesParsed.error };

  const supabase = getSupabaseAdmin();
  const { data: proj } = await supabase.from("ProProject").select("id,siren").eq("id", projectId).maybeSingle();
  if (!proj || (proj.siren as string) !== ctx.artisanProfile!.siren) return { ok: false, error: "Accès refusé." };

  const now = new Date().toISOString();
  const id = createId();
  const { error } = await supabase.from("ProInvoice").insert({
    id,
    projectId,
    number,
    status: "DRAFT",
    currency: "EUR",
    totalCents,
    linesJson: linesParsed.value,
    issuedAt: null,
    paidAt: null,
    createdAt: now,
    updatedAt: now,
  });
  if (error) return { ok: false, error: "Création facture impossible." };
  revalidatePath(`/pro/chantiers/${projectId}`);
  return { ok: true };
}

const INVOICE_STATUSES = ["DRAFT", "ISSUED", "SENT", "PAID"] as const;

export async function updateInvoiceStatusAction(
  _prev: { ok: boolean; error?: string } | null,
  formData: FormData,
): Promise<{ ok: boolean; error?: string }> {
  const ctx = await requireProContext();
  requirePilotage(ctx);
  const projectId = String(formData.get("projectId") ?? "").trim();
  const invoiceId = String(formData.get("invoiceId") ?? "").trim();
  const statusRaw = String(formData.get("status") ?? "").trim();
  if (!projectId || !invoiceId) return { ok: false, error: "Données invalides." };
  if (!INVOICE_STATUSES.includes(statusRaw as (typeof INVOICE_STATUSES)[number])) {
    return { ok: false, error: "Statut invalide." };
  }
  const status = statusRaw as (typeof INVOICE_STATUSES)[number];

  const supabase = getSupabaseAdmin();
  const { data: inv } = await supabase
    .from("ProInvoice")
    .select("id,projectId,issuedAt")
    .eq("id", invoiceId)
    .maybeSingle();
  if (!inv || (inv.projectId as string) !== projectId) return { ok: false, error: "Facture introuvable." };

  const { data: proj } = await supabase.from("ProProject").select("siren").eq("id", projectId).maybeSingle();
  if (!proj || (proj.siren as string) !== ctx.artisanProfile!.siren) return { ok: false, error: "Accès refusé." };

  const now = new Date().toISOString();
  const paidAt = status === "PAID" ? now : null;
  const prevIssued = inv.issuedAt as string | null | undefined;
  let issuedAt: string | null = prevIssued ?? null;
  if (status === "DRAFT") {
    issuedAt = null;
  } else if (!issuedAt) {
    issuedAt = now;
  }

  const { error } = await supabase
    .from("ProInvoice")
    .update({
      status,
      paidAt,
      issuedAt,
      updatedAt: now,
    })
    .eq("id", invoiceId);
  if (error) return { ok: false, error: "Mise à jour impossible." };
  revalidatePath(`/pro/chantiers/${projectId}`);
  return { ok: true };
}

export async function addTimeEntryAction(_prev: { ok: boolean; error?: string } | null, formData: FormData) {
  const ctx = await requireProContext();
  requirePilotage(ctx);
  const projectId = String(formData.get("projectId") ?? "").trim();
  const minutes = Number.parseInt(String(formData.get("minutes") ?? "0"), 10);
  const workDate = String(formData.get("workDate") ?? "").trim();
  const noteRaw = String(formData.get("note") ?? "").trim();
  const note = noteRaw ? noteRaw.slice(0, 2000) : null;
  if (!projectId) return { ok: false, error: "Projet invalide." };
  if (!Number.isInteger(minutes) || minutes <= 0 || minutes > 24 * 60) {
    return { ok: false, error: "Durée invalide (minutes)." };
  }
  if (!/^\d{4}-\d{2}-\d{2}$/.test(workDate)) return { ok: false, error: "Date invalide." };

  const supabase = getSupabaseAdmin();
  const { data: proj } = await supabase.from("ProProject").select("id,siren").eq("id", projectId).maybeSingle();
  if (!proj || (proj.siren as string) !== ctx.artisanProfile!.siren) return { ok: false, error: "Accès refusé." };

  const { error } = await supabase.from("ProTimeEntry").insert({
    id: createId(),
    projectId,
    minutes,
    workDate,
    note,
    createdAt: new Date().toISOString(),
  });
  if (error) return { ok: false, error: "Ajout temps impossible." };
  revalidatePath(`/pro/chantiers/${projectId}`);
  return { ok: true };
}

export async function addExpenseAction(_prev: { ok: boolean; error?: string } | null, formData: FormData) {
  const ctx = await requireProContext();
  requirePilotage(ctx);
  const projectId = String(formData.get("projectId") ?? "").trim();
  const label = String(formData.get("label") ?? "").trim().slice(0, 160);
  const category = String(formData.get("category") ?? "OTHER").trim().slice(0, 40) || "OTHER";
  const expenseDate = String(formData.get("expenseDate") ?? "").trim();
  const noteRaw = String(formData.get("note") ?? "").trim();
  const note = noteRaw ? noteRaw.slice(0, 2000) : null;

  if (!projectId) return { ok: false, error: "Projet invalide." };
  if (!label) return { ok: false, error: "Libellé requis." };
  if (!/^\d{4}-\d{2}-\d{2}$/.test(expenseDate)) return { ok: false, error: "Date invalide." };

  const amountParsed = parseOptionalAmountEurosToCents(formData.get("amountEuros"));
  if (!amountParsed.ok) return { ok: false, error: amountParsed.error };
  const amountCents = amountParsed.cents ?? 0;
  if (amountCents <= 0) return { ok: false, error: "Montant requis." };

  const supabase = getSupabaseAdmin();
  const { data: proj } = await supabase.from("ProProject").select("id,siren").eq("id", projectId).maybeSingle();
  if (!proj || (proj.siren as string) !== ctx.artisanProfile!.siren) return { ok: false, error: "Accès refusé." };

  const { error } = await supabase.from("ProExpense").insert({
    id: createId(),
    projectId,
    label,
    amountCents,
    expenseDate,
    category,
    note,
    createdAt: new Date().toISOString(),
  });
  if (error) return { ok: false, error: "Ajout dépense impossible." };
  revalidatePath(`/pro/chantiers/${projectId}`);
  return { ok: true };
}


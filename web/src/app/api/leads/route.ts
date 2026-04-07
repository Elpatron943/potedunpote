import { NextResponse, after } from "next/server";
import { createId } from "@paralleldrive/cuid2";

import {
  getBtpMetierLabelFromRef,
  getBtpMetierFromRef,
  getBtpReferentiel,
  getPrestationActiviteLabel,
  isValidPrestationPair,
} from "@/lib/btp-referentiel";
import { persistProLeadAiDraft, runLeadAiDraft } from "@/lib/lead-ai-draft";
import {
  getQuoteFieldDefsForPrestation,
  sanitizeQuoteRequestPayload,
  validateQuoteRequestFields,
} from "@/lib/quote-request";
import { finalizeQuoteLeadSession, isValidQuoteSessionId } from "@/lib/quote-lead-files";
import { parseQuoteVisionImagesFromFormData } from "@/lib/quote-vision-inline";
import { getSession } from "@/lib/auth-session";
import { getSupabaseAdmin } from "@/lib/supabase/admin";
import {
  getProUserEmailForSiren,
  sendProLeadNotificationEmail,
} from "@/lib/pro-lead-notification-email";
import { getPublicProPlanForSiren } from "@/lib/pro-plan-public";
import { hasPlanAtLeast } from "@/lib/pro-plan";

function asText(v: FormDataEntryValue | null): string {
  return typeof v === "string" ? v.trim() : "";
}

export async function POST(req: Request) {
  try {
  const fd = await req.formData();
  const siren = asText(fd.get("siren"));
  if (!/^\d{9}$/.test(siren)) {
    return NextResponse.json({ ok: false, error: "SIREN invalide." }, { status: 400 });
  }

  const plan = await getPublicProPlanForSiren(siren);
  if (!plan || !plan.active || !hasPlanAtLeast(plan.planId, "relation")) {
    return NextResponse.json({ ok: false, error: "Ce professionnel n’accepte pas les demandes via la plateforme." }, { status: 403 });
  }

  const fullName = asText(fd.get("fullName")).slice(0, 120);
  if (fullName.length < 2) {
    return NextResponse.json({ ok: false, error: "Nom requis." }, { status: 400 });
  }
  const email = asText(fd.get("email")).slice(0, 180) || null;
  const phone = asText(fd.get("phone")).slice(0, 60) || null;
  const message = asText(fd.get("message")).slice(0, 4000) || null;

  const metierIdRaw = asText(fd.get("metierId")).slice(0, 64);
  const prestationIdRaw = asText(fd.get("prestationId")).slice(0, 120);
  const metierId = metierIdRaw.length > 0 ? metierIdRaw : null;
  const prestationId = prestationIdRaw.length > 0 ? prestationIdRaw : null;

  const ref = await getBtpReferentiel();
  if (metierId && !getBtpMetierFromRef(ref, metierId)) {
    return NextResponse.json({ ok: false, error: "Métier invalide." }, { status: 400 });
  }
  if (prestationId) {
    if (!metierId || !isValidPrestationPair(ref, metierId, prestationId)) {
      return NextResponse.json({ ok: false, error: "Prestation invalide pour ce métier." }, { status: 400 });
    }
  }

  let requestPayload: ReturnType<typeof sanitizeQuoteRequestPayload> = null;
  const quoteJsonRaw = asText(fd.get("quoteRequestJson"));
  if (quoteJsonRaw.length > 0) {
    try {
      const parsed = JSON.parse(quoteJsonRaw) as unknown;
      requestPayload = sanitizeQuoteRequestPayload(parsed);
    } catch {
      return NextResponse.json({ ok: false, error: "Données devis invalides." }, { status: 400 });
    }
  }

  if (prestationId) {
    if (!requestPayload) {
      return NextResponse.json(
        { ok: false, error: "Merci de compléter le dossier pour cette prestation." },
        { status: 400 },
      );
    }
    if (requestPayload.aiConsent !== "true") {
      return NextResponse.json(
        {
          ok: false,
          error:
            "Pour une demande structurée, merci d’accepter l’analyse automatisée du dossier (résumé et brouillon de postes pour le professionnel).",
        },
        { status: 400 },
      );
    }
    const defs = getQuoteFieldDefsForPrestation(prestationId);
    const values: Record<string, string> = {};
    for (const d of defs) {
      const v = requestPayload[d.key];
      values[d.key] = typeof v === "string" ? v : "";
    }
    const check = validateQuoteRequestFields(defs, values);
    if (!check.ok) {
      return NextResponse.json({ ok: false, error: check.error }, { status: 400 });
    }
  }

  const uploadSessionIdRaw = asText(fd.get("uploadSessionId"));
  const uploadSessionId =
    uploadSessionIdRaw.length > 0 ? uploadSessionIdRaw : null;
  if (uploadSessionId && !isValidQuoteSessionId(uploadSessionId)) {
    return NextResponse.json({ ok: false, error: "Session d’upload invalide." }, { status: 400 });
  }

  const visionParsed = await parseQuoteVisionImagesFromFormData(fd);
  if (!visionParsed.ok) {
    return NextResponse.json({ ok: false, error: visionParsed.error }, { status: 400 });
  }
  const inlineVisionImages = visionParsed.images;

  const supabase = getSupabaseAdmin();
  const session = await getSession();
  let emailStored: string | null = email && email.trim() ? email.trim().toLowerCase() : null;
  let requesterUserId: string | null = null;
  if (session) {
    const { data: uRow } = await supabase.from("User").select("email").eq("id", session.userId).maybeSingle();
    const uEmail = typeof uRow?.email === "string" ? uRow.email.trim().toLowerCase() : "";
    if (uEmail) {
      emailStored = uEmail;
      requesterUserId = session.userId;
    }
  }

  const now = new Date().toISOString();
  const leadId = createId();

  const { error: insertErr } = await supabase.from("ProLead").insert({
    id: leadId,
    siren,
    status: "NEW",
    fullName,
    email: emailStored,
    phone,
    message,
    source: "entreprise",
    metierId,
    prestationId,
    requestPayload,
    requesterUserId,
    createdAt: now,
    updatedAt: now,
  });
  if (insertErr) {
    console.error("[leads] ProLead insert", insertErr);
    const hint =
      typeof insertErr.message === "string" &&
      (/column|schema|relation|does not exist/i.test(insertErr.message) ||
        String(insertErr.code ?? "").startsWith("PGRST"))
        ? " Base de données : exécute les migrations récentes (ProLead, requesterUserId, pièces jointes, brouillon IA)."
        : "";
    return NextResponse.json(
      { ok: false, error: `Impossible d’enregistrer la demande.${hint}` },
      { status: 500 },
    );
  }

  let attachmentCount = inlineVisionImages.length;
  let attachmentStoragePaths: string[] = [];
  /** Stockage Storage uniquement si aucune photo inline (rétrocompat / autres clients). */
  if (inlineVisionImages.length === 0 && uploadSessionId) {
    try {
      const finalized = await finalizeQuoteLeadSession(uploadSessionId, leadId);
      attachmentCount = finalized.length;
      attachmentStoragePaths = finalized.map((f) => f.storagePath);
      for (let i = 0; i < finalized.length; i++) {
        const a = finalized[i];
        const { error: aErr } = await supabase.from("ProLeadAttachment").insert({
          id: a.id,
          leadId,
          storagePath: a.storagePath,
          mimeType: a.mimeType,
          sortOrder: i,
          createdAt: now,
        });
        if (aErr) console.error("[leads] attachment insert", aErr);
      }
    } catch (e) {
      console.error("[leads] finalize session", e);
    }
  }

  const metierLabel = metierId ? getBtpMetierLabelFromRef(ref, metierId) : null;
  const prestationLabel =
    metierId && prestationId ? getPrestationActiviteLabel(ref, metierId, prestationId) : null;

  const { error: pendErr } = await supabase.from("ProLeadAiDraft").insert({
    id: createId(),
    leadId,
    status: "PENDING",
    model: null,
    summary: "Analyse du dossier en cours…",
    missingFields: [],
    suggestedLines: [],
    assumptions: [],
    vigilancePoints: [],
    confidence: null,
    rawResponse: null,
    createdAt: now,
    updatedAt: now,
  });
  if (pendErr) {
    console.error("[leads] ai draft pending", pendErr);
  }

  const proNotifyEmail = await getProUserEmailForSiren(siren);
  if (proNotifyEmail) {
    const prestationLine =
      metierLabel && prestationLabel
        ? `${metierLabel} — ${prestationLabel}`
        : metierLabel ?? prestationLabel ?? null;
    const messageExcerpt =
      message && message.length > 500 ? `${message.slice(0, 500)}…` : message;

    after(() => {
      void sendProLeadNotificationEmail({
        to: proNotifyEmail,
        clientName: fullName,
        prestationLine,
        demanderEmail: emailStored,
        demanderPhone: phone,
        messageExcerpt,
      }).then((r) => {
        if (!r.ok) console.error("[leads] notification pro", r.message);
      });
    });
  } else if (process.env.NODE_ENV === "development") {
    console.warn("[leads] Aucun e-mail compte pro pour ce SIREN — notification non envoyée.");
  }

  after(() => {
    void (async () => {
      try {
        const run = await runLeadAiDraft({
          prestationId,
          metierLabel,
          prestationLabel,
          message,
          requestPayload,
          attachmentCount,
          attachmentStoragePaths,
          inlineVisionImages: inlineVisionImages.length > 0 ? inlineVisionImages : undefined,
        });
        await persistProLeadAiDraft(leadId, run);
      } catch (e) {
        console.error("[leads] ai draft", e);
      }
    })();
  });

  return NextResponse.json({ ok: true, leadId });
  } catch (e) {
    console.error("[leads] POST", e);
    const msg =
      e && typeof e === "object" && "message" in e && typeof (e as { message: unknown }).message === "string"
        ? String((e as { message: string }).message)
        : e instanceof Error
          ? e.message
          : "";
    const hint = /column|schema|relation|does not exist/i.test(msg) ? " Vérifie que les migrations Prisma sont appliquées." : "";
    return NextResponse.json(
      { ok: false, error: `Erreur serveur lors de l’envoi.${hint || " Réessaie dans un instant."}` },
      { status: 500 },
    );
  }
}

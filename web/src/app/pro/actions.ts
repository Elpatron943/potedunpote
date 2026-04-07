"use server";

import { createId } from "@paralleldrive/cuid2";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";

import type { SupabaseClient } from "@supabase/supabase-js";

import { requireProContext } from "@/lib/pro-auth";
import { getSupabaseAdmin } from "@/lib/supabase/admin";
import { formatIsoDateForUser, isKbisExtractWithinThreeMonths } from "@/lib/kbis-freshness";
import { isValidSirenChecksum } from "@/lib/siren-insee";
import { extractSirenFromKbisImage } from "@/lib/verify-kbis-ai";

const KBIS_MAX_BYTES = 8 * 1024 * 1024;

function parseSiren(raw: FormDataEntryValue | null): string | null {
  const s = typeof raw === "string" ? raw.trim() : "";
  if (!/^\d{9}$/.test(s)) return null;
  return s;
}

function parseBool(raw: FormDataEntryValue | null): boolean {
  return raw === "on" || raw === "true" || raw === "1";
}

function visionMimeType(m: string): "image/jpeg" | "image/png" | "image/webp" | null {
  if (m === "image/jpeg" || m === "image/png" || m === "image/webp") return m;
  return null;
}

async function recordKbisRejection(params: {
  supabase: SupabaseClient;
  userId: string;
  declaredSiren: string;
  storagePath: string;
  aiExtractedSiren: string | null;
  aiConfidence: string | null;
  aiNotes: string | null;
  kbisExtractDate: string | null;
  rejectionReason: string;
}): Promise<void> {
  const now = new Date().toISOString();
  await params.supabase.from("ProKbisVerification").insert({
    id: createId(),
    userId: params.userId,
    declaredSiren: params.declaredSiren,
    storagePath: params.storagePath,
    status: "REJECTED",
    aiExtractedSiren: params.aiExtractedSiren,
    aiConfidence: params.aiConfidence,
    aiNotes: params.aiNotes,
    kbisExtractDate: params.kbisExtractDate,
    rejectionReason: params.rejectionReason.slice(0, 2000),
    createdAt: now,
    updatedAt: now,
  });
}

/**
 * Onboarding Pro : dépôt d’une image de Kbis + SIREN déclaré.
 * Une analyse IA extrait le SIREN du document ; le profil n’est créé qu’en cas de correspondance.
 */
export async function proOnboardingAction(_prev: { ok: boolean; error?: string } | null, formData: FormData) {
  const ctx = await requireProContext();
  if (ctx.artisanProfile) {
    redirect("/pro/tableau");
  }

  const siren = parseSiren(formData.get("siren"));
  if (!siren) return { ok: false, error: "SIREN invalide (9 chiffres)." };
  if (!isValidSirenChecksum(siren)) {
    return { ok: false, error: "SIREN invalide (clé de contrôle INSEE)." };
  }

  const file = formData.get("kbis");
  if (!file || typeof file === "string" || file.size === 0) {
    return { ok: false, error: "Ajoute une photo ou un scan de ton Kbis (JPG, PNG ou WebP)." };
  }
  if (file.size > KBIS_MAX_BYTES) {
    return { ok: false, error: "Fichier trop volumineux (max. 8 Mo)." };
  }

  const mime = (file.type || "").toLowerCase().split(";")[0].trim();
  const visionMime = visionMimeType(mime);
  if (!visionMime) {
    return {
      ok: false,
      error: "Format non pris en charge. Envoie une image JPG, PNG ou WebP (scan ou photo nette du Kbis).",
    };
  }

  const supabase = getSupabaseAdmin();
  const bucket = (process.env.SUPABASE_PRO_KBIS_BUCKET ?? "pro-kbis").trim() || "pro-kbis";
  const ext =
    visionMime === "image/png" ? "png" : visionMime === "image/webp" ? "webp" : "jpg";
  const objectPath = `${ctx.userId}/${createId()}.${ext}`;

  const buf = Buffer.from(await file.arrayBuffer());
  const { error: upErr } = await supabase.storage.from(bucket).upload(objectPath, buf, {
    contentType: visionMime,
    upsert: false,
  });

  if (upErr) {
    const msg = upErr.message ?? "";
    if (/bucket|not found|404/i.test(msg)) {
      return {
        ok: false,
        error:
          "Stockage Kbis indisponible : crée le bucket Storage « pro-kbis » (privé) dans Supabase, ou définis SUPABASE_PRO_KBIS_BUCKET.",
      };
    }
    console.error("[pro onboarding] storage upload", upErr);
    return { ok: false, error: "Envoi du document impossible. Réessaie dans quelques instants." };
  }

  const base64 = buf.toString("base64");

  const skipAi =
    process.env.PRO_KBIS_SKIP_AI_VERIFY === "1" && process.env.NODE_ENV !== "production";

  let extracted: string | null = null;
  let kbisValidityDateIso: string | null = null;
  let confidence: string | null = null;
  let notes: string | null = null;

  try {
    if (skipAi) {
      extracted = siren;
      const d = new Date();
      kbisValidityDateIso = `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}-${String(d.getUTCDate()).padStart(2, "0")}`;
      confidence = "high";
      notes = "Vérification IA désactivée (PRO_KBIS_SKIP_AI_VERIFY, hors production).";
    } else {
      const ai = await extractSirenFromKbisImage({
        imageBase64: base64,
        mimeType: visionMime,
      });
      extracted = ai.extractedSiren;
      kbisValidityDateIso = ai.kbisValidityDateIso;
      confidence = ai.confidence;
      notes = ai.notes;
    }
  } catch (e) {
    console.error("[pro onboarding] kbis ai", e);
    await supabase.storage.from(bucket).remove([objectPath]);
    const msg = e instanceof Error ? e.message : "";
    if (/OPENAI_API_KEY/i.test(msg)) {
      return {
        ok: false,
        error: "Vérification automatique indisponible (configuration serveur). Contacte le support.",
      };
    }
    return { ok: false, error: "Analyse du document impossible. Réessaie avec une image plus nette." };
  }

  const match = extracted === siren;

  if (!match) {
    await recordKbisRejection({
      supabase,
      userId: ctx.userId,
      declaredSiren: siren,
      storagePath: objectPath,
      aiExtractedSiren: extracted,
      aiConfidence: confidence,
      aiNotes: notes,
      kbisExtractDate: kbisValidityDateIso,
      rejectionReason:
        extracted == null
          ? "Le SIREN n’a pas pu être lu clairement sur le document, ou le document ne ressemble pas à un Kbis."
          : `Le SIREN lu sur le document (${extracted}) ne correspond pas au SIREN déclaré (${siren}).`,
    });

    return {
      ok: false,
      error:
        extracted == null
          ? "Nous n’avons pas pu lire un SIREN fiable sur ton document. Vérifie qu’il s’agit bien d’un Kbis lisible, puis réessaie."
          : `Le SIREN détecté sur le document (${extracted}) ne correspond pas au numéro saisi (${siren}). Corrige ta saisie ou envoie le bon extrait.`,
    };
  }

  if (kbisValidityDateIso == null) {
    await recordKbisRejection({
      supabase,
      userId: ctx.userId,
      declaredSiren: siren,
      storagePath: objectPath,
      aiExtractedSiren: extracted,
      aiConfidence: confidence,
      aiNotes: notes,
      kbisExtractDate: null,
      rejectionReason:
        "Date de l’extrait illisible : le Kbis doit comporter une mention du type « À jour au … » (ou équivalent).",
    });
    return {
      ok: false,
      error:
        "Nous n’avons pas pu lire la date de ton extrait (« À jour au … »). Assure-toi que le document est complet, lisible, et qu’il s’agit bien d’un Kbis récent.",
    };
  }

  if (!isKbisExtractWithinThreeMonths(kbisValidityDateIso)) {
    await recordKbisRejection({
      supabase,
      userId: ctx.userId,
      declaredSiren: siren,
      storagePath: objectPath,
      aiExtractedSiren: extracted,
      aiConfidence: confidence,
      aiNotes: notes,
      kbisExtractDate: kbisValidityDateIso,
      rejectionReason: `Extrait trop ancien : date « À jour au » ${kbisValidityDateIso} (exigence : moins de 3 mois).`,
    });
    return {
      ok: false,
      error: `Ton extrait Kbis doit dater de moins de 3 mois (mention « À jour au … »). Date détectée sur le document : ${formatIsoDateForUser(kbisValidityDateIso)}. Demande un nouvel extrait sur infogreffe.fr ou auprès de ton greffe.`,
    };
  }

  const now = new Date().toISOString();
  const profileId = createId();
  const verificationId = createId();

  const { error: profErr } = await supabase.from("ArtisanProfile").insert({
    id: profileId,
    userId: ctx.userId,
    siren,
    verifiedAt: now,
    phonePublic: null,
    contactLinks: null,
    premiumUntil: null,
    servesParticuliers: true,
    servesProfessionnels: false,
    sousActivitesSelection: null,
    createdAt: now,
    updatedAt: now,
  });

  if (profErr) {
    await supabase.storage.from(bucket).remove([objectPath]);
    if (profErr.code === "23505") {
      return { ok: false, error: "Ce SIREN est déjà associé à un compte." };
    }
    console.error("[pro onboarding] ArtisanProfile insert", profErr);
    return { ok: false, error: "Création du profil impossible après vérification." };
  }

  const { error: verErr } = await supabase.from("ProKbisVerification").insert({
    id: verificationId,
    userId: ctx.userId,
    declaredSiren: siren,
    storagePath: objectPath,
    status: "APPROVED",
    aiExtractedSiren: extracted,
    aiConfidence: confidence,
    aiNotes: notes,
    kbisExtractDate: kbisValidityDateIso,
    rejectionReason: null,
    createdAt: now,
    updatedAt: now,
  });

  if (verErr) {
    if (verErr.code === "42P01" || /does not exist/i.test(verErr.message ?? "")) {
      console.warn("[pro onboarding] ProKbisVerification absente — migration SQL à appliquer.");
    } else {
      console.error("[pro onboarding] ProKbisVerification insert", verErr);
    }
  }

  if (ctx.role === "CLIENT") {
    const { error: roleErr } = await supabase
      .from("User")
      .update({ role: "ARTISAN", updatedAt: now })
      .eq("id", ctx.userId);
    if (roleErr) {
      console.error("[pro onboarding] User role update", roleErr);
    }
  }

  revalidatePath("/pro");
  revalidatePath("/pro/tableau");
  revalidatePath("/compte");
  redirect("/pro/tableau");
}

export async function proSaveProfileAction(_prev: { ok: boolean; error?: string } | null, formData: FormData) {
  const ctx = await requireProContext();
  if (!ctx.artisanProfile) redirect("/pro/onboarding");

  const planId = ctx.subscription.planId;
  const canEditVitrine = ctx.subscription.isActive && planId != null && (planId === "vitrine" || planId === "pilotage");

  const vitrineHeadlineRaw = String(formData.get("vitrineHeadline") ?? "").trim();
  const vitrineBioRaw = String(formData.get("vitrineBio") ?? "").trim();
  const vitrineHeadline =
    canEditVitrine && vitrineHeadlineRaw.length > 0 ? vitrineHeadlineRaw.slice(0, 120) : null;
  const vitrineBio =
    canEditVitrine && vitrineBioRaw.length > 0 ? vitrineBioRaw.slice(0, 4000) : null;

  const phone = String(formData.get("phonePublic") ?? "").trim();
  const phonePublic = phone.length > 0 ? phone.slice(0, 30) : null;

  const website = String(formData.get("website") ?? "").trim();
  const instagram = String(formData.get("instagram") ?? "").trim();
  const facebook = String(formData.get("facebook") ?? "").trim();
  const linkedin = String(formData.get("linkedin") ?? "").trim();
  const contactLinks = {
    website: website || undefined,
    instagram: instagram || undefined,
    facebook: facebook || undefined,
    linkedin: linkedin || undefined,
  };
  const hasLinks = Object.values(contactLinks).some(Boolean);

  const servesParticuliers = parseBool(formData.get("servesParticuliers"));
  const servesProfessionnels = parseBool(formData.get("servesProfessionnels"));

  const sousActivitesSelectionRaw = String(formData.get("sousActivitesSelection") ?? "").trim();
  let sousActivitesSelection: unknown = null;
  if (sousActivitesSelectionRaw) {
    try {
      sousActivitesSelection = JSON.parse(sousActivitesSelectionRaw);
    } catch {
      return { ok: false, error: "Sélection prestations invalide." };
    }
  }

  const supabase = getSupabaseAdmin();
  const { error } = await supabase
    .from("ArtisanProfile")
    .update({
      vitrineHeadline,
      vitrineBio,
      phonePublic,
      contactLinks: hasLinks ? contactLinks : null,
      servesParticuliers,
      servesProfessionnels,
      sousActivitesSelection,
      updatedAt: new Date().toISOString(),
    })
    .eq("id", ctx.artisanProfile.id);

  if (error) return { ok: false, error: "Sauvegarde impossible." };

  revalidatePath("/pro");
  revalidatePath("/pro/tableau");
  revalidatePath("/pro/profil");
  return { ok: true };
}

export async function proSelectOfferAction(_prev: { ok: boolean; error?: string } | null, formData: FormData) {
  const ctx = await requireProContext();
  if (!ctx.artisanProfile) redirect("/pro/onboarding");

  const planId = String(formData.get("planId") ?? "").trim();
  const allowed = new Set(["essentiel", "relation", "vitrine", "pilotage"]);
  if (!allowed.has(planId)) return { ok: false, error: "Plan invalide." };

  const supabase = getSupabaseAdmin();
  const now = new Date();
  const nowIso = now.toISOString();
  const end = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000).toISOString();

  // Sans Stripe : activation immédiate "démonstration" (30 jours glissants).
  const subId = createId();
  const { data: existing } = await supabase
    .from("ProSubscription")
    .select("id")
    .eq("userId", ctx.userId)
    .maybeSingle();

  const upsertPayload = {
    id: existing?.id ? (existing.id as string) : subId,
    userId: ctx.userId,
    siren: ctx.artisanProfile.siren,
    planId,
    status: "ACTIVE",
    currentPeriodEnd: end,
    updatedAt: nowIso,
  };

  const { error } = existing?.id
    ? await supabase.from("ProSubscription").update(upsertPayload).eq("id", existing.id as string)
    : await supabase
        .from("ProSubscription")
        .insert({ ...upsertPayload, createdAt: nowIso });

  if (error) return { ok: false, error: "Enregistrement de l’offre impossible." };

  // Active le bouton "Contacter" via premiumUntil (utilisé par l’existant).
  const { error: profErr } = await supabase
    .from("ArtisanProfile")
    .update({ premiumUntil: end, updatedAt: nowIso })
    .eq("id", ctx.artisanProfile.id);
  if (profErr) return { ok: false, error: "Mise à jour profil impossible." };

  revalidatePath("/pro");
  revalidatePath("/pro/tableau");
  revalidatePath(`/entreprise/${ctx.artisanProfile.siren}`);
  return { ok: true };
}


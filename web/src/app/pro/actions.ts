"use server";

import { createId } from "@paralleldrive/cuid2";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";

import { requireProContext } from "@/lib/pro-auth";
import { getSupabaseAdmin } from "@/lib/supabase/admin";

function parseSiren(raw: FormDataEntryValue | null): string | null {
  const s = typeof raw === "string" ? raw.trim() : "";
  if (!/^\d{9}$/.test(s)) return null;
  return s;
}

function parseBool(raw: FormDataEntryValue | null): boolean {
  return raw === "on" || raw === "true" || raw === "1";
}

export async function proOnboardingAction(_prev: { ok: boolean; error?: string } | null, formData: FormData) {
  const ctx = await requireProContext();
  if (ctx.role !== "ARTISAN" && ctx.role !== "ADMIN") {
    return { ok: false, error: "Accès refusé." };
  }
  if (ctx.artisanProfile) {
    redirect("/pro");
  }

  const siren = parseSiren(formData.get("siren"));
  if (!siren) return { ok: false, error: "SIREN invalide (9 chiffres)." };

  const supabase = getSupabaseAdmin();
  const now = new Date().toISOString();
  const id = createId();

  const { error } = await supabase.from("ArtisanProfile").insert({
    id,
    userId: ctx.userId,
    siren,
    verifiedAt: null,
    phonePublic: null,
    contactLinks: null,
    premiumUntil: null,
    servesParticuliers: true,
    servesProfessionnels: false,
    sousActivitesSelection: null,
    createdAt: now,
    updatedAt: now,
  });

  if (error) {
    if (error.code === "23505") return { ok: false, error: "Ce SIREN est déjà associé à un compte." };
    return { ok: false, error: "Création du profil impossible." };
  }

  revalidatePath("/pro");
  redirect("/pro");
}

export async function proSaveProfileAction(_prev: { ok: boolean; error?: string } | null, formData: FormData) {
  const ctx = await requireProContext();
  if (!ctx.artisanProfile) redirect("/pro/onboarding");

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
  revalidatePath(`/entreprise/${ctx.artisanProfile.siren}`);
  return { ok: true };
}


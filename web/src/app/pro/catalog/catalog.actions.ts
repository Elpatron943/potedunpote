"use server";

import { createId } from "@paralleldrive/cuid2";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { isProCatalogKind } from "@/lib/pro-catalog-kinds";
import { parseOptionalEurosToCentsNonNegative } from "@/lib/parse-amount-euros";
import { requireProContext } from "@/lib/pro-auth";
import { hasPlanAtLeast } from "@/lib/pro-plan";
import { getSupabaseAdmin } from "@/lib/supabase/admin";

function requirePilotage(ctx: Awaited<ReturnType<typeof requireProContext>>) {
  if (!ctx.artisanProfile) redirect("/pro/onboarding");
  const planId = ctx.subscription.planId;
  if (!ctx.subscription.isActive || !planId || !hasPlanAtLeast(planId, "pilotage")) redirect("/pro/offre");
}

export async function createCatalogItemAction(
  _prev: { ok: boolean; error?: string } | null,
  formData: FormData,
): Promise<{ ok: boolean; error?: string }> {
  const ctx = await requireProContext();
  requirePilotage(ctx);
  const siren = ctx.artisanProfile!.siren;

  const kindRaw = String(formData.get("kind") ?? "").trim();
  if (!isProCatalogKind(kindRaw)) return { ok: false, error: "Type de ligne invalide." };

  const label = String(formData.get("label") ?? "").trim().slice(0, 200);
  if (label.length < 2) return { ok: false, error: "Libellé requis (2–200 caractères)." };

  const descriptionRaw = String(formData.get("description") ?? "").trim();
  const description = descriptionRaw.length > 0 ? descriptionRaw.slice(0, 4000) : null;

  const unit = String(formData.get("unit") ?? "forfait").trim().slice(0, 40) || "forfait";

  const sortParsed = Number.parseInt(String(formData.get("sortOrder") ?? "0"), 10);
  const sortOrder = Number.isFinite(sortParsed) ? Math.min(999_999, Math.max(0, sortParsed)) : 0;

  const purchaseParsed = parseOptionalEurosToCentsNonNegative(formData.get("purchaseEuros"));
  if (!purchaseParsed.ok) return { ok: false, error: purchaseParsed.error };
  const saleParsed = parseOptionalEurosToCentsNonNegative(formData.get("saleEuros"));
  if (!saleParsed.ok) return { ok: false, error: saleParsed.error };

  const supabase = getSupabaseAdmin();
  const now = new Date().toISOString();
  const id = createId();
  const { error } = await supabase.from("ProCatalogItem").insert({
    id,
    siren,
    kind: kindRaw,
    label,
    description,
    unit,
    purchaseUnitPriceCents: purchaseParsed.cents,
    saleUnitPriceCents: saleParsed.cents,
    sortOrder,
    createdAt: now,
    updatedAt: now,
  });
  if (error) return { ok: false, error: "Enregistrement impossible." };
  revalidatePath("/pro/catalog");
  revalidatePath("/pro/chantiers");
  return { ok: true };
}

export async function updateCatalogItemAction(
  _prev: { ok: boolean; error?: string } | null,
  formData: FormData,
): Promise<{ ok: boolean; error?: string }> {
  const ctx = await requireProContext();
  requirePilotage(ctx);
  const siren = ctx.artisanProfile!.siren;

  const id = String(formData.get("id") ?? "").trim();
  if (!id) return { ok: false, error: "Article invalide." };

  const kindRaw = String(formData.get("kind") ?? "").trim();
  if (!isProCatalogKind(kindRaw)) return { ok: false, error: "Type de ligne invalide." };

  const label = String(formData.get("label") ?? "").trim().slice(0, 200);
  if (label.length < 2) return { ok: false, error: "Libellé requis (2–200 caractères)." };

  const descriptionRaw = String(formData.get("description") ?? "").trim();
  const description = descriptionRaw.length > 0 ? descriptionRaw.slice(0, 4000) : null;

  const unit = String(formData.get("unit") ?? "forfait").trim().slice(0, 40) || "forfait";

  const sortParsed = Number.parseInt(String(formData.get("sortOrder") ?? "0"), 10);
  const sortOrder = Number.isFinite(sortParsed) ? Math.min(999_999, Math.max(0, sortParsed)) : 0;

  const purchaseParsed = parseOptionalEurosToCentsNonNegative(formData.get("purchaseEuros"));
  if (!purchaseParsed.ok) return { ok: false, error: purchaseParsed.error };
  const saleParsed = parseOptionalEurosToCentsNonNegative(formData.get("saleEuros"));
  if (!saleParsed.ok) return { ok: false, error: saleParsed.error };

  const supabase = getSupabaseAdmin();
  const { data: row } = await supabase.from("ProCatalogItem").select("id,siren").eq("id", id).maybeSingle();
  if (!row || (row.siren as string) !== siren) return { ok: false, error: "Article introuvable." };

  const now = new Date().toISOString();
  const { error } = await supabase
    .from("ProCatalogItem")
    .update({
      kind: kindRaw,
      label,
      description,
      unit,
      purchaseUnitPriceCents: purchaseParsed.cents,
      saleUnitPriceCents: saleParsed.cents,
      sortOrder,
      updatedAt: now,
    })
    .eq("id", id);
  if (error) return { ok: false, error: "Mise à jour impossible." };
  revalidatePath("/pro/catalog");
  revalidatePath("/pro/chantiers");
  return { ok: true };
}

export async function deleteCatalogItemAction(
  _prev: { ok: boolean; error?: string } | null,
  formData: FormData,
): Promise<{ ok: boolean; error?: string }> {
  const ctx = await requireProContext();
  requirePilotage(ctx);
  const siren = ctx.artisanProfile!.siren;

  const id = String(formData.get("id") ?? "").trim();
  if (!id) return { ok: false, error: "Article invalide." };

  const supabase = getSupabaseAdmin();
  const { data: row } = await supabase.from("ProCatalogItem").select("id,siren").eq("id", id).maybeSingle();
  if (!row || (row.siren as string) !== siren) return { ok: false, error: "Article introuvable." };

  const { error } = await supabase.from("ProCatalogItem").delete().eq("id", id);
  if (error) return { ok: false, error: "Suppression impossible." };
  revalidatePath("/pro/catalog");
  revalidatePath("/pro/chantiers");
  return { ok: true };
}

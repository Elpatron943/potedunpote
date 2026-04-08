"use server";

import { revalidatePath } from "next/cache";

import { requireProContext } from "@/lib/pro-auth";
import { hasPlanAtLeast } from "@/lib/pro-plan";
import { getSupabaseAdmin } from "@/lib/supabase/admin";

/** Refus explicite de la demande : archivage (sans action sur les devis existants). */
export async function declineIncomingLeadAction(
  _prev: { ok: boolean; error?: string } | null,
  formData: FormData,
): Promise<{ ok: boolean; error?: string }> {
  const ctx = await requireProContext();
  if (!ctx.artisanProfile) return { ok: false, error: "Profil requis." };
  const planId = ctx.subscription.planId;
  if (!ctx.subscription.isActive || !planId || !hasPlanAtLeast(planId, "relation")) {
    return { ok: false, error: "Formule Pro Relation requise." };
  }

  const leadId = String(formData.get("leadId") ?? "").trim();
  if (!leadId) return { ok: false, error: "Demande invalide." };

  const supabase = getSupabaseAdmin();
  const { data: lead, error: fetchErr } = await supabase
    .from("ProLead")
    .select("id,siren,status")
    .eq("id", leadId)
    .maybeSingle();
  if (fetchErr || !lead || (lead.siren as string) !== ctx.artisanProfile.siren) {
    return { ok: false, error: "Demande introuvable." };
  }

  const st = String((lead.status as string | undefined) ?? "NEW");
  if (st === "ARCHIVED") return { ok: true };

  const now = new Date().toISOString();
  const { error } = await supabase
    .from("ProLead")
    .update({ status: "ARCHIVED", updatedAt: now })
    .eq("id", leadId)
    .eq("siren", ctx.artisanProfile.siren);
  if (error) return { ok: false, error: "Mise à jour impossible." };

  revalidatePath("/pro/demandes");
  revalidatePath("/pro/tableau");
  return { ok: true };
}

"use server";

import { revalidatePath } from "next/cache";

import { requireProContext } from "@/lib/pro-auth";
import { hasPlanAtLeast } from "@/lib/pro-plan";
import { getSupabaseAdmin } from "@/lib/supabase/admin";

const LEAD_STATUSES = ["NEW", "IN_PROGRESS", "CLOSED", "ARCHIVED"] as const;
type LeadStatus = (typeof LEAD_STATUSES)[number];

function parseLeadStatus(raw: string): LeadStatus | null {
  return LEAD_STATUSES.includes(raw as LeadStatus) ? (raw as LeadStatus) : null;
}

export async function proUpdateLeadStatusAction(
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
  const status = parseLeadStatus(String(formData.get("status") ?? "").trim());
  if (!leadId || !status) return { ok: false, error: "Données invalides." };

  const supabase = getSupabaseAdmin();
  const { data: lead, error: fetchErr } = await supabase
    .from("ProLead")
    .select("id,siren")
    .eq("id", leadId)
    .maybeSingle();
  if (fetchErr || !lead || (lead.siren as string) !== ctx.artisanProfile.siren) {
    return { ok: false, error: "Demande introuvable." };
  }

  const now = new Date().toISOString();
  const { error } = await supabase
    .from("ProLead")
    .update({ status, updatedAt: now })
    .eq("id", leadId)
    .eq("siren", ctx.artisanProfile.siren);
  if (error) return { ok: false, error: "Mise à jour impossible." };

  revalidatePath("/pro/demandes");
  return { ok: true };
}

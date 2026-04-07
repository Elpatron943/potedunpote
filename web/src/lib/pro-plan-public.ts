import type { ProPlanId } from "@/lib/pro-plan";
import { getSupabaseAdmin } from "@/lib/supabase/admin";

export type PublicProPlan = {
  planId: ProPlanId;
  active: boolean;
};

function isProPlanId(x: string | null | undefined): x is ProPlanId {
  return x === "essentiel" || x === "relation" || x === "vitrine" || x === "pilotage";
}

/** Plan Pro d’une entreprise (SIREN) pour l’UX publique. */
export async function getPublicProPlanForSiren(siren: string): Promise<PublicProPlan | null> {
  if (!/^\d{9}$/.test(siren)) return null;
  const supabase = getSupabaseAdmin();
  const { data, error } = await supabase
    .from("ProSubscription")
    .select("planId,status,currentPeriodEnd")
    .eq("siren", siren)
    .maybeSingle();
  if (error) throw error;
  const planIdRaw = (data?.planId as string | null | undefined) ?? null;
  if (!isProPlanId(planIdRaw)) return null;
  const status = (data?.status as string | null | undefined) ?? null;
  if (status !== "ACTIVE") return { planId: planIdRaw, active: false };
  const end = (data?.currentPeriodEnd as string | null | undefined) ?? null;
  if (!end) return { planId: planIdRaw, active: true };
  const d = new Date(end);
  if (Number.isNaN(d.getTime())) return { planId: planIdRaw, active: true };
  return { planId: planIdRaw, active: d.getTime() > Date.now() };
}


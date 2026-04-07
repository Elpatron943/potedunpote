import type { ProPlanId } from "@/lib/pro-plan";
import { getSupabaseAdmin } from "@/lib/supabase/admin";

export type ProSubscriptionInfo = {
  planId: ProPlanId | null;
  status: "ACTIVE" | "INACTIVE" | null;
  currentPeriodEnd: string | null;
  isActive: boolean;
};

export async function getProSubscriptionForUser(userId: string): Promise<ProSubscriptionInfo> {
  const supabase = getSupabaseAdmin();
  const { data } = await supabase
    .from("ProSubscription")
    .select("planId,status,currentPeriodEnd")
    .eq("userId", userId)
    .maybeSingle();

  const planIdRaw = (data?.planId as string | null | undefined) ?? null;
  const planId =
    planIdRaw === "essentiel" ||
    planIdRaw === "relation" ||
    planIdRaw === "vitrine" ||
    planIdRaw === "pilotage"
      ? (planIdRaw as ProPlanId)
      : null;
  const statusRaw = (data?.status as string | null | undefined) ?? null;
  const status = statusRaw === "ACTIVE" || statusRaw === "INACTIVE" ? statusRaw : null;
  const currentPeriodEnd = (data?.currentPeriodEnd as string | null | undefined) ?? null;

  const isActive = (() => {
    if (status !== "ACTIVE") return false;
    if (!currentPeriodEnd) return true;
    const end = new Date(currentPeriodEnd);
    if (Number.isNaN(end.getTime())) return true;
    return end.getTime() > Date.now();
  })();

  return { planId, status, currentPeriodEnd, isActive };
}


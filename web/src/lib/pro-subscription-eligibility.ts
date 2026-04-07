import type { ProPlanId } from "@/lib/pro-plan";
import { hasPlanAtLeast } from "@/lib/pro-plan";
import { getSupabaseAdmin } from "@/lib/supabase/admin";

function isProPlanId(x: string | null | undefined): x is ProPlanId {
  return x === "essentiel" || x === "relation" || x === "vitrine" || x === "pilotage";
}

/**
 * SIRENs avec abonnement Pro payant actif (Essentiel ou au‑dessus), période non expirée.
 */
export async function getSirensWithActivePaidSubscription(sirens: string[]): Promise<Set<string>> {
  const unique = [...new Set(sirens.filter((s) => /^\d{9}$/.test(s)))];
  const out = new Set<string>();
  if (unique.length === 0) return out;

  const supabase = getSupabaseAdmin();
  const { data, error } = await supabase
    .from("ProSubscription")
    .select("siren, planId, status, currentPeriodEnd")
    .in("siren", unique);
  if (error) throw error;

  for (const row of data ?? []) {
    if ((row.status as string) !== "ACTIVE") continue;
    const planId = row.planId as string;
    if (!isProPlanId(planId)) continue;
    if (!hasPlanAtLeast(planId, "essentiel")) continue;
    const end = row.currentPeriodEnd as string | null | undefined;
    if (end) {
      const d = new Date(end);
      if (!Number.isNaN(d.getTime()) && d.getTime() <= Date.now()) continue;
    }
    out.add(row.siren as string);
  }
  return out;
}

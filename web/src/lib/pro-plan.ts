export type ProPlanId = "essentiel" | "relation" | "vitrine" | "pilotage";

const PLAN_RANK: Record<ProPlanId, number> = {
  essentiel: 10,
  relation: 20,
  vitrine: 30,
  pilotage: 40,
};

export function planRank(planId: ProPlanId | null | undefined): number {
  if (!planId) return 0;
  return PLAN_RANK[planId] ?? 0;
}

export function hasPlanAtLeast(planId: ProPlanId | null | undefined, min: ProPlanId): boolean {
  return planRank(planId) >= planRank(min);
}


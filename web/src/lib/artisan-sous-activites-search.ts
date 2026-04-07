import { getSirensWithActivePaidSubscription } from "@/lib/pro-subscription-eligibility";
import { getSupabaseAdmin } from "@/lib/supabase/admin";

/**
 * SIRENs des profils Pro (abonnement actif + `premiumUntil` futur) ayant déclaré au moins une des
 * sous-activités pour ce métier dans `sousActivitesSelection`.
 */
export async function getSirensWithDeclaredSousActivites(
  metierId: string,
  actIds: string[],
): Promise<Set<string>> {
  if (actIds.length === 0) return new Set();

  const supabase = getSupabaseAdmin();
  const now = new Date().toISOString();
  const { data: profs, error: profErr } = await supabase
    .from("ArtisanProfile")
    .select("siren, sousActivitesSelection")
    .gt("premiumUntil", now);

  if (profErr) throw profErr;
  const sirens = [...new Set((profs ?? []).map((r) => r.siren as string).filter((s) => /^\d{9}$/.test(s)))];
  const paid = await getSirensWithActivePaidSubscription(sirens);
  const rows = (profs ?? []).filter((r) => paid.has(r.siren as string));

  const matches = new Set<string>();
  for (const row of rows ?? []) {
    const raw = row.sousActivitesSelection;
    if (raw == null || typeof raw !== "object" || Array.isArray(raw)) continue;
    const obj = raw as Record<string, unknown>;
    const list = obj[metierId];
    if (!Array.isArray(list)) continue;
    const declared = new Set(list.filter((x): x is string => typeof x === "string"));
    if (actIds.some((id) => declared.has(id))) {
      matches.add(row.siren as string);
    }
  }
  return matches;
}

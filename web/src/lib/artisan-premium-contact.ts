import { getSupabaseAdmin } from "@/lib/supabase/admin";

export type PremiumContactLinks = {
  website?: string;
  instagram?: string;
  facebook?: string;
  linkedin?: string;
};

/** Coordonnées affichées via « Contacter » (abonnement premium actif). */
export type PremiumContactInfo = {
  phonePublic: string | null;
  contactLinks: PremiumContactLinks | null;
};

function normalizeLinks(raw: unknown): PremiumContactLinks | null {
  if (raw == null || typeof raw !== "object" || Array.isArray(raw)) return null;
  const o = raw as Record<string, unknown>;
  const pick = (k: string): string | undefined => {
    const v = o[k];
    if (typeof v !== "string") return undefined;
    const t = v.trim();
    return t.length > 0 ? t : undefined;
  };
  const out: PremiumContactLinks = {
    website: pick("website"),
    instagram: pick("instagram"),
    facebook: pick("facebook"),
    linkedin: pick("linkedin"),
  };
  const has = Object.values(out).some(Boolean);
  return has ? out : null;
}

/**
 * Profils avec `premiumUntil` dans le futur (abonnement actif), pour affichage du bouton Contacter.
 */
export async function getPremiumContactsBySirens(
  sirens: string[],
): Promise<Map<string, PremiumContactInfo>> {
  const unique = [...new Set(sirens.filter((s) => /^\d{9}$/.test(s)))];
  if (unique.length === 0) return new Map();

  const now = new Date().toISOString();
  const supabase = getSupabaseAdmin();
  const { data, error } = await supabase
    .from("ArtisanProfile")
    .select("siren, phonePublic, contactLinks, premiumUntil")
    .in("siren", unique)
    .gt("premiumUntil", now);

  if (error) throw error;

  const map = new Map<string, PremiumContactInfo>();
  for (const row of data ?? []) {
    const siren = row.siren as string;
    const phoneRaw = row.phonePublic;
    const phone =
      typeof phoneRaw === "string" && phoneRaw.trim().length > 0 ? phoneRaw.trim() : null;
    map.set(siren, {
      phonePublic: phone,
      contactLinks: normalizeLinks(row.contactLinks),
    });
  }
  return map;
}

export async function getPremiumContactForSiren(
  siren: string,
): Promise<PremiumContactInfo | null> {
  if (!/^\d{9}$/.test(siren)) return null;
  const m = await getPremiumContactsBySirens([siren]);
  return m.get(siren) ?? null;
}

const MAX_M2 = 50_000;

export type ParseSurfaceResult =
  | { ok: true; m2: null }
  | { ok: true; m2: number }
  | { ok: false; error: string };

/** Surface en m² (virgule ou point). Vide → null. */
export function parseOptionalSurfaceM2(raw: unknown): ParseSurfaceResult {
  if (raw == null) return { ok: true, m2: null };
  const s = String(raw).trim();
  if (s === "") return { ok: true, m2: null };

  const normalized = s.replace(/\s/g, "").replace(",", ".");
  const n = Number(normalized);
  if (!Number.isFinite(n)) {
    return { ok: false, error: "Surface invalide (utilise un nombre en m²)." };
  }
  if (n <= 0) {
    return { ok: false, error: "La surface doit être supérieure à 0 m²." };
  }
  if (n > MAX_M2) {
    return { ok: false, error: "Surface trop élevée pour être enregistrée." };
  }

  return { ok: true, m2: n };
}

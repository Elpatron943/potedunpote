const MAX_Q = 50_000;

export type ParseQuantityResult =
  | { ok: true; value: null }
  | { ok: true; value: number }
  | { ok: false; error: string };

/** Quantité positive (virgule ou point). Vide → null. */
export function parseOptionalPositiveQuantity(
  raw: unknown,
  label: string,
): ParseQuantityResult {
  if (raw == null) return { ok: true, value: null };
  const s = String(raw).trim();
  if (s === "") return { ok: true, value: null };

  const normalized = s.replace(/\s/g, "").replace(",", ".");
  const n = Number(normalized);
  if (!Number.isFinite(n)) {
    return { ok: false, error: `${label} : nombre invalide.` };
  }
  if (n <= 0) {
    return { ok: false, error: `${label} doit être supérieur à 0.` };
  }
  if (n > MAX_Q) {
    return { ok: false, error: `${label} : valeur trop élevée.` };
  }

  return { ok: true, value: n };
}

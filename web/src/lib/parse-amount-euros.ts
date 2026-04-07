const MAX_CENTS = 50_000_00; // 500 000 €

export type ParseAmountResult =
  | { ok: true; cents: null }
  | { ok: true; cents: number }
  | { ok: false; error: string };

/** Interprète un montant saisi en euros (virgule ou point, espaces ignorés). Vide → null. */
export function parseOptionalAmountEurosToCents(raw: unknown): ParseAmountResult {
  if (raw == null) return { ok: true, cents: null };
  const s = String(raw).trim();
  if (s === "") return { ok: true, cents: null };

  const normalized = s.replace(/\s/g, "").replace(",", ".");
  const n = Number(normalized);
  if (!Number.isFinite(n)) {
    return { ok: false, error: "Montant invalide." };
  }
  if (n <= 0) {
    return { ok: false, error: "Le montant doit être supérieur à 0 €." };
  }

  const cents = Math.round(n * 100);
  if (!Number.isSafeInteger(cents) || cents > MAX_CENTS) {
    return { ok: false, error: "Montant trop élevé ou non pris en charge." };
  }

  return { ok: true, cents };
}

/** Vide → null. Sinon montant en euros ≥ 0 (virgule ou point) → centimes. */
export function parseOptionalEurosToCentsNonNegative(raw: unknown): ParseAmountResult {
  if (raw == null) return { ok: true, cents: null };
  const s = String(raw).trim();
  if (s === "") return { ok: true, cents: null };

  const normalized = s.replace(/\s/g, "").replace(",", ".");
  const n = Number(normalized);
  if (!Number.isFinite(n)) {
    return { ok: false, error: "Montant invalide." };
  }
  if (n < 0) {
    return { ok: false, error: "Le montant ne peut pas être négatif." };
  }

  const cents = Math.round(n * 100);
  if (!Number.isSafeInteger(cents) || cents > MAX_CENTS) {
    return { ok: false, error: "Montant trop élevé ou non pris en charge." };
  }

  return { ok: true, cents };
}

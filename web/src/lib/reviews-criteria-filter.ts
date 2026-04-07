import type {
  AvailabilityRating,
  DeadlinesKept,
  PaymentType,
  PriceBracket,
  QuoteAccuracy,
} from "@/lib/db-enums";
import { getSupabaseAdmin } from "@/lib/supabase/admin";

export type ReviewSearchCriteria = {
  priceBracket: PriceBracket | null;
  deadlinesKept: DeadlinesKept | null;
  availability: AvailabilityRating | null;
  paymentType: PaymentType | null;
  quoteVsPaid: QuoteAccuracy | null;
};

const PRICE_SET = new Set<string>([
  "UNDER_EXPECTED",
  "AS_EXPECTED",
  "ABOVE_EXPECTED",
  "MUCH_ABOVE",
]);

const DEADLINE_SET = new Set<string>(["YES", "PARTIAL", "NO"]);

const AVAIL_SET = new Set<string>(["EASY", "OK", "DIFFICULT"]);

const PAYMENT_SET = new Set<string>([
  "BANK_TRANSFER",
  "CHECK",
  "CASH",
  "CARD",
  "INSTALLMENTS",
  "OTHER",
]);

const QUOTE_SET = new Set<string>([
  "MATCHED",
  "SLIGHTLY_OVER",
  "MUCH_OVER",
  "UNDER",
]);

function parseEnum<T extends string>(raw: string | undefined, allowed: Set<string>): T | null {
  const v = (raw ?? "").trim();
  if (!v || !allowed.has(v)) return null;
  return v as T;
}

export function parseReviewSearchCriteriaFromSearchParams(sp: {
  priceBracket?: string;
  deadlinesKept?: string;
  availability?: string;
  paymentType?: string;
  quoteVsPaid?: string;
}): ReviewSearchCriteria {
  return {
    priceBracket: parseEnum<PriceBracket>(sp.priceBracket, PRICE_SET),
    deadlinesKept: parseEnum<DeadlinesKept>(sp.deadlinesKept, DEADLINE_SET),
    availability: parseEnum<AvailabilityRating>(sp.availability, AVAIL_SET),
    paymentType: parseEnum<PaymentType>(sp.paymentType, PAYMENT_SET),
    quoteVsPaid: parseEnum<QuoteAccuracy>(sp.quoteVsPaid, QUOTE_SET),
  };
}

export function hasAnyReviewSearchCriteria(c: ReviewSearchCriteria): boolean {
  return (
    c.priceBracket != null ||
    c.deadlinesKept != null ||
    c.availability != null ||
    c.paymentType != null ||
    c.quoteVsPaid != null
  );
}

type ReviewCriteriaRow = {
  siren: string;
  priceBracket: string | null;
  deadlinesKept: string | null;
  availability: string | null;
  paymentType: string | null;
  quoteVsPaid: string | null;
};

type CriteriaCheck = {
  field: keyof Pick<
    ReviewCriteriaRow,
    "priceBracket" | "deadlinesKept" | "availability" | "paymentType" | "quoteVsPaid"
  >;
  wanted: string;
};

/**
 * Garde les SIREN pour lesquels, pour chaque critère demandé, au moins la moitié des avis
 * publiés ayant ce champ renseigné portent la valeur choisie (majorité simple, ≥ 50 %).
 */
export async function filterSirensByReviewCriteriaMajority(
  sirens: string[],
  criteria: ReviewSearchCriteria,
): Promise<Set<string>> {
  const checks: CriteriaCheck[] = [];
  if (criteria.priceBracket != null) {
    checks.push({ field: "priceBracket", wanted: criteria.priceBracket });
  }
  if (criteria.deadlinesKept != null) {
    checks.push({ field: "deadlinesKept", wanted: criteria.deadlinesKept });
  }
  if (criteria.availability != null) {
    checks.push({ field: "availability", wanted: criteria.availability });
  }
  if (criteria.paymentType != null) {
    checks.push({ field: "paymentType", wanted: criteria.paymentType });
  }
  if (criteria.quoteVsPaid != null) {
    checks.push({ field: "quoteVsPaid", wanted: criteria.quoteVsPaid });
  }

  if (checks.length === 0) return new Set(sirens);

  const unique = [...new Set(sirens.filter((s) => /^\d{9}$/.test(s)))];
  if (unique.length === 0) return new Set();

  const supabase = getSupabaseAdmin();
  const { data: rows, error } = await supabase
    .from("Review")
    .select("siren, priceBracket, deadlinesKept, availability, paymentType, quoteVsPaid")
    .eq("status", "PUBLISHED")
    .in("siren", unique);

  if (error) throw error;

  const bySiren = new Map<string, ReviewCriteriaRow[]>();
  for (const r of rows ?? []) {
    const row = r as ReviewCriteriaRow;
    const s = row.siren;
    if (!/^\d{9}$/.test(s)) continue;
    const list = bySiren.get(s) ?? [];
    list.push(row);
    bySiren.set(s, list);
  }

  const pass = new Set<string>();
  for (const siren of unique) {
    const list = bySiren.get(siren);
    if (!list || list.length === 0) continue;

    let ok = true;
    for (const { field, wanted } of checks) {
      const vals = list
        .map((rev) => rev[field])
        .filter((v): v is string => v != null && String(v).trim() !== "");
      if (vals.length === 0) {
        ok = false;
        break;
      }
      const match = vals.filter((v) => v === wanted).length;
      if (match * 2 < vals.length) {
        ok = false;
        break;
      }
    }
    if (ok) pass.add(siren);
  }

  return pass;
}

export function appendReviewCriteriaToSearchParams(
  q: URLSearchParams,
  c: ReviewSearchCriteria,
): void {
  if (c.priceBracket) q.set("priceBracket", c.priceBracket);
  if (c.deadlinesKept) q.set("deadlinesKept", c.deadlinesKept);
  if (c.availability) q.set("availability", c.availability);
  if (c.paymentType) q.set("paymentType", c.paymentType);
  if (c.quoteVsPaid) q.set("quoteVsPaid", c.quoteVsPaid);
}

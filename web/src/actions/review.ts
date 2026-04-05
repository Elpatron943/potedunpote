"use server";

import { createId } from "@paralleldrive/cuid2";
import { revalidatePath } from "next/cache";
import { getBtpMetier } from "@/lib/btp-metiers";
import { isPrestationPricedBySurface, isValidPrestationPair } from "@/lib/btp-sous-activites";
import type {
  AvailabilityRating,
  DeadlinesKept,
  PaymentType,
  PriceBracket,
  QuoteAccuracy,
} from "@/lib/db-enums";
import { getSession } from "@/lib/auth-session";
import { parseOptionalAmountEurosToCents } from "@/lib/parse-amount-euros";
import { parseOptionalSurfaceM2 } from "@/lib/parse-surface-m2";
import { getSupabaseAdmin } from "@/lib/supabase/admin";

const PRICE_SET = new Set<string>([
  "UNDER_EXPECTED",
  "AS_EXPECTED",
  "ABOVE_EXPECTED",
  "MUCH_ABOVE",
]);
const DEAD_SET = new Set<string>(["YES", "PARTIAL", "NO"]);
const AVAIL_SET = new Set<string>(["EASY", "OK", "DIFFICULT"]);
const PAY_SET = new Set<string>([
  "BANK_TRANSFER",
  "CHECK",
  "CASH",
  "CARD",
  "INSTALLMENTS",
  "OTHER",
]);
const QUOTE_SET = new Set<string>(["MATCHED", "SLIGHTLY_OVER", "MUCH_OVER", "UNDER"]);

function parseOptionalEnum<T extends string>(
  raw: FormDataEntryValue | null,
  allowed: Set<string>,
): T | undefined {
  if (raw == null) return undefined;
  const s = String(raw).trim();
  if (s === "") return undefined;
  if (!allowed.has(s)) return undefined;
  return s as T;
}

export type SubmitReviewState =
  | { ok: true }
  | { ok: false; error: string }
  | { ok: null };

export async function submitReview(
  _prev: SubmitReviewState,
  formData: FormData,
): Promise<SubmitReviewState> {
  const sirenRaw = formData.get("siren");
  const siren = typeof sirenRaw === "string" ? sirenRaw.trim() : "";
  if (!/^\d{9}$/.test(siren)) {
    return { ok: false, error: "SIREN invalide." };
  }

  const session = await getSession();
  if (!session) {
    return { ok: false, error: "Tu dois être connecté pour déposer un avis." };
  }

  const supabase = getSupabaseAdmin();
  const { data: artisan } = await supabase
    .from("ArtisanProfile")
    .select("siren")
    .eq("userId", session.userId)
    .maybeSingle();

  if (artisan?.siren === siren) {
    return {
      ok: false,
      error: "Tu ne peux pas noter ta propre entreprise avec ce compte.",
    };
  }

  const attest = formData.get("attest");
  if (attest !== "on" && attest !== "true" && attest !== "1") {
    return {
      ok: false,
      error: "Tu dois confirmer avoir fait appel à cette entreprise.",
    };
  }

  const ratingRaw = formData.get("ratingOverall");
  const rating =
    typeof ratingRaw === "string" ? Number.parseInt(ratingRaw, 10) : Number.NaN;
  if (!Number.isInteger(rating) || rating < 1 || rating > 5) {
    return { ok: false, error: "Choisis une note entre 1 et 5." };
  }

  const commentRaw = formData.get("comment");
  const comment =
    typeof commentRaw === "string" ? commentRaw.trim().slice(0, 4000) : "";
  const commentOut = comment.length > 0 ? comment : null;

  const priceBracket = parseOptionalEnum<PriceBracket>(formData.get("priceBracket"), PRICE_SET);
  const deadlinesKept = parseOptionalEnum<DeadlinesKept>(formData.get("deadlinesKept"), DEAD_SET);
  const availability = parseOptionalEnum<AvailabilityRating>(
    formData.get("availability"),
    AVAIL_SET,
  );
  const paymentType = parseOptionalEnum<PaymentType>(formData.get("paymentType"), PAY_SET);
  const quoteVsPaid = parseOptionalEnum<QuoteAccuracy>(formData.get("quoteVsPaid"), QUOTE_SET);

  const metierRaw = formData.get("prestationMetier");
  const activiteRaw = formData.get("prestationActivite");
  const metierStr = typeof metierRaw === "string" ? metierRaw.trim() : "";
  const activiteStr = typeof activiteRaw === "string" ? activiteRaw.trim() : "";

  if (metierStr !== activiteStr && (metierStr === "" || activiteStr === "")) {
    return {
      ok: false,
      error: "Choisis un métier et une prestation ensemble, ou laisse les deux champs vides.",
    };
  }

  let prestationMetierId: string | null = null;
  let prestationActiviteId: string | null = null;
  if (metierStr !== "" && activiteStr !== "") {
    if (!getBtpMetier(metierStr)) {
      return { ok: false, error: "Famille métier invalide." };
    }
    if (!isValidPrestationPair(metierStr, activiteStr)) {
      return { ok: false, error: "Cette prestation ne correspond pas au métier choisi." };
    }
    prestationMetierId = metierStr;
    prestationActiviteId = activiteStr;
  }

  const amountParsed = parseOptionalAmountEurosToCents(formData.get("amountPaidEuros"));
  if (!amountParsed.ok) {
    return { ok: false, error: amountParsed.error };
  }
  const amountPaidCents = amountParsed.cents;

  const surfaceParsed = parseOptionalSurfaceM2(formData.get("surfaceM2"));
  if (!surfaceParsed.ok) {
    return { ok: false, error: surfaceParsed.error };
  }
  let surfaceM2: number | null = surfaceParsed.m2;
  if (surfaceM2 != null) {
    if (prestationMetierId == null || prestationActiviteId == null) {
      return {
        ok: false,
        error: "Pour indiquer une surface, choisis d’abord une prestation (métier + type).",
      };
    }
    if (!isPrestationPricedBySurface(prestationMetierId, prestationActiviteId)) {
      return {
        ok: false,
        error: "Cette prestation n’est pas proposée au prix au m² : retire la surface ou change de prestation.",
      };
    }
  }

  const now = new Date().toISOString();
  const id = createId();

  const { error } = await supabase.from("Review").insert({
    id,
    siren,
    authorId: session.userId,
    ratingOverall: rating,
    comment: commentOut,
    priceBracket: priceBracket ?? null,
    deadlinesKept: deadlinesKept ?? null,
    availability: availability ?? null,
    paymentType: paymentType ?? null,
    quoteVsPaid: quoteVsPaid ?? null,
    prestationMetierId: prestationMetierId ?? null,
    prestationActiviteId: prestationActiviteId ?? null,
    amountPaidCents: amountPaidCents ?? null,
    surfaceM2: surfaceM2 ?? null,
    status: "PENDING",
    createdAt: now,
    updatedAt: now,
  });

  if (error) {
    if (error.code === "23505") {
      return {
        ok: false,
        error: "Tu as déjà déposé un avis pour cette entreprise.",
      };
    }
    throw error;
  }

  revalidatePath(`/entreprise/${siren}`);
  return { ok: true };
}

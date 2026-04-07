"use server";

import { createId } from "@paralleldrive/cuid2";
import { revalidatePath } from "next/cache";
import {
  getBtpMetierFromRef,
  getBtpReferentiel,
  getPrestationPriceUnit,
  isValidPrestationPair,
} from "@/lib/btp-referentiel";
import type {
  AvailabilityRating,
  DeadlinesKept,
  PaymentType,
  PriceBracket,
  QuoteAccuracy,
} from "@/lib/db-enums";
import { getSession } from "@/lib/auth-session";
import { parseOptionalAmountEurosToCents } from "@/lib/parse-amount-euros";
import type { BtpPriceUnit } from "@/lib/btp-price-unit";
import { btpPriceUnitRequiresQuantity } from "@/lib/btp-price-unit";
import { parseOptionalPositiveQuantity } from "@/lib/parse-optional-quantity";
import { parseOptionalSurfaceM2 } from "@/lib/parse-surface-m2";
import { getSupabaseAdmin } from "@/lib/supabase/admin";

const REVIEW_PHOTO_MAX_BYTES = 5 * 1024 * 1024;

function reviewPhotoMime(m: string): "image/jpeg" | "image/png" | "image/webp" | null {
  const x = m.toLowerCase().split(";")[0].trim();
  if (x === "image/jpeg" || x === "image/png" || x === "image/webp") return x;
  return null;
}

function parseAuthorPseudo(raw: FormDataEntryValue | null):
  | { ok: true; value: string }
  | { ok: false; error: string } {
  const s = typeof raw === "string" ? raw.trim() : "";
  if (s.length < 2) {
    return { ok: false, error: "Indique un pseudo d’au moins 2 caractères (affiché sur ton avis)." };
  }
  if (s.length > 48) {
    return { ok: false, error: "Pseudo trop long (48 caractères maximum)." };
  }
  return { ok: true, value: s.slice(0, 48) };
}

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

  const pseudoParsed = parseAuthorPseudo(formData.get("authorPseudo"));
  if (!pseudoParsed.ok) return { ok: false, error: pseudoParsed.error };

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
  const specialiteRaw = formData.get("specialiteId");
  const metierIdRaw = formData.get("metierId");
  const metierStr =
    typeof metierIdRaw === "string"
      ? metierIdRaw.trim()
      : typeof metierRaw === "string"
        ? metierRaw.trim()
        : "";
  const specialiteStr = typeof specialiteRaw === "string" ? specialiteRaw.trim() : "";

  if (metierStr !== specialiteStr && (metierStr === "" || specialiteStr === "")) {
    return {
      ok: false,
      error: "Choisis un métier et une spécialité ensemble, ou laisse les deux champs vides.",
    };
  }

  const btpRef = await getBtpReferentiel();

  let prestationMetierId: string | null = null;
  let prestationActiviteId: string | null = null;
  if (metierStr !== "" && specialiteStr !== "") {
    if (!getBtpMetierFromRef(btpRef, metierStr)) {
      return { ok: false, error: "Famille métier invalide." };
    }
    if (!isValidPrestationPair(btpRef, metierStr, specialiteStr)) {
      return { ok: false, error: "Cette prestation ne correspond pas au métier choisi." };
    }
    prestationMetierId = metierStr;
    prestationActiviteId = specialiteStr;
  }

  const amountParsed = parseOptionalAmountEurosToCents(formData.get("amountPaidEuros"));
  if (!amountParsed.ok) {
    return { ok: false, error: amountParsed.error };
  }
  const amountPaidCents = amountParsed.cents;

  let surfaceM2: number | null = null;
  let linearMl: number | null = null;
  let volumeM3: number | null = null;
  let quantityUnits: number | null = null;
  let reviewPriceUnit: BtpPriceUnit | null = null;

  if (prestationMetierId != null && prestationActiviteId != null) {
    const pu = getPrestationPriceUnit(btpRef, prestationMetierId, prestationActiviteId);
    reviewPriceUnit = pu ?? null;

    const sM2 = parseOptionalSurfaceM2(formData.get("surfaceM2"));
    if (!sM2.ok) return { ok: false, error: sM2.error };
    const sMl = parseOptionalPositiveQuantity(formData.get("linearMl"), "Mètre linéaire");
    if (!sMl.ok) return { ok: false, error: sMl.error };
    const sM3 = parseOptionalPositiveQuantity(formData.get("volumeM3"), "Volume (m³)");
    if (!sM3.ok) return { ok: false, error: sM3.error };
    const sU = parseOptionalPositiveQuantity(formData.get("quantityUnits"), "Quantité");
    if (!sU.ok) return { ok: false, error: sU.error };

    const filled = [
      sM2.m2 != null,
      sMl.value != null,
      sM3.value != null,
      sU.value != null,
    ].filter(Boolean).length;
    if (filled > 1) {
      return {
        ok: false,
        error: "Renseigne une seule mesure (surface, ml, m³ ou quantité) correspondant à la spécialité.",
      };
    }

    if (pu == null || !btpPriceUnitRequiresQuantity(pu)) {
      if (filled > 0) {
        return {
          ok: false,
          error:
            pu == null
              ? "Spécialité inconnue : retire la surface ou la quantité, ou choisis une autre ligne."
              : "Cette spécialité est au forfait : ne renseigne pas de surface ni de quantité.",
        };
      }
    } else {
      const need =
        pu === "M2"
          ? sM2.m2
          : pu === "ML"
            ? sMl.value
            : pu === "M3"
              ? sM3.value
              : sU.value;
      if (need == null && filled > 0) {
        return {
          ok: false,
          error: "La mesure saisie ne correspond pas à l’unité de prix de cette spécialité.",
        };
      }
      if (pu === "M2") surfaceM2 = sM2.m2 ?? null;
      else if (pu === "ML") linearMl = sMl.value ?? null;
      else if (pu === "M3") volumeM3 = sM3.value ?? null;
      else if (pu === "UNIT") quantityUnits = sU.value ?? null;
    }
  } else {
    const sM2 = parseOptionalSurfaceM2(formData.get("surfaceM2"));
    if (!sM2.ok) return { ok: false, error: sM2.error };
    const sMl = parseOptionalPositiveQuantity(formData.get("linearMl"), "Mètre linéaire");
    if (!sMl.ok) return { ok: false, error: sMl.error };
    const sM3 = parseOptionalPositiveQuantity(formData.get("volumeM3"), "Volume (m³)");
    if (!sM3.ok) return { ok: false, error: sM3.error };
    const sU = parseOptionalPositiveQuantity(formData.get("quantityUnits"), "Quantité");
    if (!sU.ok) return { ok: false, error: sU.error };
    if (sM2.m2 != null || sMl.value != null || sM3.value != null || sU.value != null) {
      return {
        ok: false,
        error: "Pour indiquer une surface ou une quantité, choisis d’abord un métier et une spécialité.",
      };
    }
  }

  const durationRaw = formData.get("durationMinutes");
  const durationStr = typeof durationRaw === "string" ? durationRaw.trim() : "";
  const durationMinutes =
    durationStr === ""
      ? null
      : (() => {
          const n = Number.parseInt(durationStr, 10);
          return Number.isInteger(n) && n > 0 && n <= 7 * 24 * 60 ? n : Number.NaN;
        })();
  if (durationMinutes !== null && Number.isNaN(durationMinutes)) {
    return { ok: false, error: "Durée invalide (minutes)." };
  }

  const pricePrestationOnlyRaw = formData.get("pricePrestationOnly");
  const pricePrestationOnly =
    pricePrestationOnlyRaw === "on" || pricePrestationOnlyRaw === "true" || pricePrestationOnlyRaw === "1"
      ? true
      : false;

  const now = new Date().toISOString();
  const id = createId();

  const bucket =
    (process.env.SUPABASE_REVIEW_PHOTOS_BUCKET ?? "review-photos").trim() || "review-photos";

  async function tryUploadReviewPhoto(
    fieldName: "photoBefore" | "photoAfter",
    fileName: "before" | "after",
  ): Promise<{ ok: true; path: string } | { ok: false; error: string }> {
    const file = formData.get(fieldName);
    if (file == null || typeof file === "string" || file.size === 0) {
      return { ok: true, path: "" };
    }
    if (file.size > REVIEW_PHOTO_MAX_BYTES) {
      return { ok: false, error: `Photo ${fileName === "before" ? "« avant »" : "« après »"} trop volumineuse (max. 5 Mo).` };
    }
    const mime = reviewPhotoMime(file.type || "");
    if (!mime) {
      return {
        ok: false,
        error: `Format de la photo ${fileName === "before" ? "« avant »" : "« après »"} non pris en charge (JPG, PNG ou WebP).`,
      };
    }
    const ext = mime === "image/png" ? "png" : mime === "image/webp" ? "webp" : "jpg";
    const objectPath = `reviews/${siren}/${id}/${fileName}.${ext}`;
    const buf = Buffer.from(await file.arrayBuffer());
    const { error: upErr } = await supabase.storage.from(bucket).upload(objectPath, buf, {
      contentType: mime,
      upsert: false,
    });
    if (upErr) {
      const msg = upErr.message ?? "";
      if (/bucket|not found|404/i.test(msg)) {
        return {
          ok: false,
          error:
            "Stockage photos indisponible : crée le bucket Storage public « review-photos » (voir .env.example), ou définis SUPABASE_REVIEW_PHOTOS_BUCKET.",
        };
      }
      return { ok: false, error: "Envoi des photos impossible. Réessaie dans quelques instants." };
    }
    return { ok: true, path: objectPath };
  }

  const upBefore = await tryUploadReviewPhoto("photoBefore", "before");
  if (!upBefore.ok) return { ok: false, error: upBefore.error };
  const upAfter = await tryUploadReviewPhoto("photoAfter", "after");
  if (!upAfter.ok) {
    if (upBefore.path) await supabase.storage.from(bucket).remove([upBefore.path]);
    return { ok: false, error: upAfter.error };
  }

  const photoBeforeStorageKey = upBefore.path || null;
  const photoAfterStorageKey = upAfter.path || null;

  const { error } = await supabase.from("Review").insert({
    id,
    siren,
    authorId: session.userId,
    authorPseudo: pseudoParsed.value,
    photoBeforeStorageKey,
    photoAfterStorageKey,
    ratingOverall: rating,
    comment: commentOut,
    priceBracket: priceBracket ?? null,
    deadlinesKept: deadlinesKept ?? null,
    availability: availability ?? null,
    paymentType: paymentType ?? null,
    quoteVsPaid: quoteVsPaid ?? null,
    prestationMetierId: prestationMetierId ?? null,
    prestationActiviteId: prestationActiviteId ?? null,
    metierId: prestationMetierId ?? null,
    specialiteId: prestationActiviteId ?? null,
    amountPaidCents: amountPaidCents ?? null,
    surfaceM2: surfaceM2 ?? null,
    linearMl: linearMl ?? null,
    volumeM3: volumeM3 ?? null,
    quantityUnits: quantityUnits ?? null,
    priceUnit: reviewPriceUnit,
    durationMinutes,
    pricePrestationOnly,
    status: "PUBLISHED",
    createdAt: now,
    updatedAt: now,
  });

  if (error) {
    const toRemove = [photoBeforeStorageKey, photoAfterStorageKey].filter(Boolean) as string[];
    if (toRemove.length > 0) await supabase.storage.from(bucket).remove(toRemove);

    if (error.code === "23505") {
      return {
        ok: false,
        error: "Tu as déjà déposé un avis pour cette entreprise.",
      };
    }
    if (error.code === "42703") {
      return {
        ok: false,
        error:
          "Sauvegarde impossible : la table Review en base n’a pas toutes les colonnes attendues. Dans Supabase → SQL, exécute les migrations prisma (ex. 20260408190000_review_pseudo_photos/migration.sql).",
      };
    }
    throw error;
  }

  revalidatePath(`/entreprise/${siren}`);
  return { ok: true };
}

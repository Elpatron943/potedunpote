import type {
  AvailabilityRating,
  DeadlinesKept,
  PaymentType,
  PriceBracket,
  QuoteAccuracy,
  ReviewStatus,
} from "@/lib/db-enums";
import { getSupabaseAdmin } from "@/lib/supabase/admin";

export type PublicReviewPayload = {
  id: string;
  siren: string;
  authorId: string;
  ratingOverall: number;
  comment: string | null;
  priceBracket: PriceBracket | null;
  deadlinesKept: DeadlinesKept | null;
  availability: AvailabilityRating | null;
  paymentType: PaymentType | null;
  quoteVsPaid: QuoteAccuracy | null;
  prestationMetierId: string | null;
  prestationActiviteId: string | null;
  metierId: string | null;
  specialiteId: string | null;
  amountPaidCents: number | null;
  surfaceM2: number | null;
  priceUnit: string | null;
  linearMl: number | null;
  volumeM3: number | null;
  quantityUnits: number | null;
  durationMinutes: number | null;
  pricePrestationOnly: boolean | null;
  status: ReviewStatus;
  createdAt: Date;
  updatedAt: Date;
  author: { name: string | null };
  response: { body: string; createdAt: Date } | null;
};

function toDate(v: string | null | undefined): Date {
  if (v == null || v === "") return new Date(0);
  const d = new Date(v);
  return Number.isNaN(d.getTime()) ? new Date(0) : d;
}

export async function getPublishedReviewsForSiren(siren: string): Promise<PublicReviewPayload[]> {
  const supabase = getSupabaseAdmin();
  const { data: reviews, error: rErr } = await supabase
    .from("Review")
    .select("*")
    .eq("siren", siren)
    .eq("status", "PUBLISHED")
    .order("createdAt", { ascending: false });

  if (rErr) throw rErr;
  if (!reviews?.length) return [];

  const authorIds = [...new Set(reviews.map((row) => row.authorId as string))];
  const { data: users, error: uErr } = await supabase
    .from("User")
    .select("id, name")
    .in("id", authorIds);
  if (uErr) throw uErr;
  const nameById = new Map((users ?? []).map((u) => [u.id as string, u.name as string | null]));

  const reviewIds = reviews.map((row) => row.id as string);
  const { data: responses, error: respErr } = await supabase
    .from("ReviewResponse")
    .select("reviewId, body, createdAt")
    .in("reviewId", reviewIds);
  if (respErr) throw respErr;
  const responseByReviewId = new Map(
    (responses ?? []).map((x) => [
      x.reviewId as string,
      { body: x.body as string, createdAt: toDate(x.createdAt as string) },
    ]),
  );

  return reviews.map((row) => {
    const response = responseByReviewId.get(row.id as string) ?? null;
    return {
      id: row.id as string,
      siren: row.siren as string,
      authorId: row.authorId as string,
      ratingOverall: row.ratingOverall as number,
      comment: (row.comment as string | null) ?? null,
      priceBracket: (row.priceBracket as PriceBracket | null) ?? null,
      deadlinesKept: (row.deadlinesKept as DeadlinesKept | null) ?? null,
      availability: (row.availability as AvailabilityRating | null) ?? null,
      paymentType: (row.paymentType as PaymentType | null) ?? null,
      quoteVsPaid: (row.quoteVsPaid as QuoteAccuracy | null) ?? null,
      prestationMetierId: (row.prestationMetierId as string | null) ?? null,
      prestationActiviteId: (row.prestationActiviteId as string | null) ?? null,
      metierId: (row.metierId as string | null) ?? null,
      specialiteId: (row.specialiteId as string | null) ?? null,
      amountPaidCents: (row.amountPaidCents as number | null) ?? null,
      surfaceM2: (row.surfaceM2 as number | null) ?? null,
      priceUnit: (row.priceUnit as string | null) ?? null,
      linearMl: (row.linearMl as number | null) ?? null,
      volumeM3: (row.volumeM3 as number | null) ?? null,
      quantityUnits: (row.quantityUnits as number | null) ?? null,
      durationMinutes: (row.durationMinutes as number | null) ?? null,
      pricePrestationOnly: (row.pricePrestationOnly as boolean | null) ?? null,
      status: row.status as ReviewStatus,
      createdAt: toDate(row.createdAt as string),
      updatedAt: toDate(row.updatedAt as string),
      author: { name: nameById.get(row.authorId as string) ?? null },
      response,
    };
  });
}

/** Avis déposés par un utilisateur (tous statuts), pour l’espace membre. */
export type AuthorReviewSummary = {
  id: string;
  siren: string;
  status: ReviewStatus;
  ratingOverall: number;
  comment: string | null;
  createdAt: Date;
  metierId: string | null;
  specialiteId: string | null;
  amountPaidCents: number | null;
  surfaceM2: number | null;
};

export async function getReviewsByAuthorId(userId: string): Promise<AuthorReviewSummary[]> {
  const supabase = getSupabaseAdmin();
  const { data: rows, error } = await supabase
    .from("Review")
    .select(
      "id, siren, status, ratingOverall, comment, createdAt, metierId, specialiteId, amountPaidCents, surfaceM2",
    )
    .eq("authorId", userId)
    .order("createdAt", { ascending: false });

  if (error) throw error;
  return (rows ?? []).map((row) => ({
    id: row.id as string,
    siren: row.siren as string,
    status: row.status as ReviewStatus,
    ratingOverall: row.ratingOverall as number,
    comment: (row.comment as string | null) ?? null,
    createdAt: toDate(row.createdAt as string),
    metierId: (row.metierId as string | null) ?? null,
    specialiteId: (row.specialiteId as string | null) ?? null,
    amountPaidCents: (row.amountPaidCents as number | null) ?? null,
    surfaceM2: (row.surfaceM2 as number | null) ?? null,
  }));
}

export async function getUserReviewForSiren(userId: string, siren: string) {
  const supabase = getSupabaseAdmin();
  const { data, error } = await supabase
    .from("Review")
    .select("id, status")
    .eq("authorId", userId)
    .eq("siren", siren)
    .maybeSingle();

  if (error) throw error;
  if (!data) return null;
  return { id: data.id as string, status: data.status as ReviewStatus };
}

export function authorDisplayName(name: string | null): string {
  const t = name?.trim();
  if (t) return t;
  return "Client";
}

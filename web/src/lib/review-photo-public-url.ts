/**
 * URL publique d’un objet dans le bucket photos d’avis (bucket Storage **public**).
 * Voir SUPABASE_REVIEW_PHOTOS_BUCKET / NEXT_PUBLIC_SUPABASE_REVIEW_PHOTOS_BUCKET dans `.env.example`.
 */
export function publicReviewPhotoUrl(storageKey: string | null | undefined): string | null {
  const key = (storageKey ?? "").trim();
  if (!key) return null;
  const base = (process.env.NEXT_PUBLIC_SUPABASE_URL ?? "").replace(/\/$/, "");
  if (!base) return null;
  const bucket =
    (process.env.NEXT_PUBLIC_SUPABASE_REVIEW_PHOTOS_BUCKET ??
      process.env.SUPABASE_REVIEW_PHOTOS_BUCKET ??
      "review-photos"
    )
      .trim() || "review-photos";
  const encoded = key
    .split("/")
    .map((seg) => encodeURIComponent(seg))
    .join("/");
  return `${base}/storage/v1/object/public/${bucket}/${encoded}`;
}

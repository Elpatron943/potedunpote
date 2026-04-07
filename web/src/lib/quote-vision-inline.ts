/** Photos « vision » : transmises avec la demande, analysées par l’IA, non stockées dans Supabase Storage. */

export const QUOTE_VISION_MAX_FILES = 6;
export const QUOTE_VISION_MAX_BYTES = 4 * 1024 * 1024;
export const QUOTE_VISION_FORM_FIELD = "quoteVisionPhoto";

export type QuoteVisionInlineImage = { base64: string; mime: string };

export async function parseQuoteVisionImagesFromFormData(
  fd: FormData,
): Promise<{ ok: true; images: QuoteVisionInlineImage[] } | { ok: false; error: string }> {
  const entries = fd.getAll(QUOTE_VISION_FORM_FIELD);
  const files = entries.filter((v): v is File => v instanceof File && v.size > 0);
  if (files.length > QUOTE_VISION_MAX_FILES) {
    return { ok: false, error: `Trop de photos (max ${QUOTE_VISION_MAX_FILES}).` };
  }
  const images: QuoteVisionInlineImage[] = [];
  for (const file of files) {
    if (file.size > QUOTE_VISION_MAX_BYTES) {
      return {
        ok: false,
        error: `Chaque photo doit faire au plus ${QUOTE_VISION_MAX_BYTES / (1024 * 1024)} Mo.`,
      };
    }
    const mime = (file.type || "").trim().toLowerCase();
    if (!/^image\/(jpeg|png|webp)$/.test(mime)) {
      return { ok: false, error: "Photos : JPEG, PNG ou WebP uniquement." };
    }
    const buf = Buffer.from(await file.arrayBuffer());
    images.push({ base64: buf.toString("base64"), mime });
  }
  return { ok: true, images };
}

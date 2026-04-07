/** Photos jointes à la demande de devis (multipart) — upload Storage dans POST /api/leads. */

export const QUOTE_VISION_MAX_FILES = 6;
export const QUOTE_VISION_MAX_BYTES = 4 * 1024 * 1024;
export const QUOTE_VISION_FORM_FIELD = "quoteVisionPhoto";

/** Fichiers validés depuis le FormData (sans lecture buffer côté validation). */
export function extractQuoteVisionFilesFromFormData(
  fd: FormData,
): { ok: true; files: File[] } | { ok: false; error: string } {
  const entries = fd.getAll(QUOTE_VISION_FORM_FIELD);
  const files = entries.filter((v): v is File => v instanceof File && v.size > 0);
  if (files.length > QUOTE_VISION_MAX_FILES) {
    return { ok: false, error: `Trop de photos (max ${QUOTE_VISION_MAX_FILES}).` };
  }
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
  }
  return { ok: true, files };
}

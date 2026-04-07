-- Avis : pseudo affiché publiquement + photos avant / après (clés Storage).
ALTER TABLE "Review" ADD COLUMN IF NOT EXISTS "authorPseudo" TEXT;
ALTER TABLE "Review" ADD COLUMN IF NOT EXISTS "photoBeforeStorageKey" TEXT;
ALTER TABLE "Review" ADD COLUMN IF NOT EXISTS "photoAfterStorageKey" TEXT;

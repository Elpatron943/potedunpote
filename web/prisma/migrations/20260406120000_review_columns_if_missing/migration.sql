-- Colonnes avis (prestation, montant, surface) — à exécuter si la base n’a que la table Review d’origine.
-- Corrige l’erreur PostgreSQL 42703 (colonne inexistante) à la soumission d’un avis.
ALTER TABLE "Review" ADD COLUMN IF NOT EXISTS "prestationMetierId" TEXT;
ALTER TABLE "Review" ADD COLUMN IF NOT EXISTS "prestationActiviteId" TEXT;
ALTER TABLE "Review" ADD COLUMN IF NOT EXISTS "amountPaidCents" INTEGER;
ALTER TABLE "Review" ADD COLUMN IF NOT EXISTS "surfaceM2" DOUBLE PRECISION;

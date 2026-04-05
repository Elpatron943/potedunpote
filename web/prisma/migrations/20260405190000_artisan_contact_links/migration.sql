-- Liens web / réseaux pour le bouton « Contacter » (offres Pro).
ALTER TABLE "ArtisanProfile" ADD COLUMN IF NOT EXISTS "contactLinks" JSONB;

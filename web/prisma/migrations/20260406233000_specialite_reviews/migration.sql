-- Référentiel "Spécialité" (liée aux métiers) + enrichissement des avis clients.
-- - Spécialité : déclinaison de prestation / type d’intervention pour un métier.
-- - Review : prix unique (prestation), durée, surface (pour €/m²), et indicateur "prestation seule".

CREATE TABLE IF NOT EXISTS "Specialite" (
    "id" TEXT NOT NULL,
    "metierId" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "active" BOOLEAN NOT NULL DEFAULT TRUE,
    "createdAt" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Specialite_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "Specialite_metierId_label_key" UNIQUE ("metierId", "label"),
    CONSTRAINT "Specialite_metierId_fkey" FOREIGN KEY ("metierId") REFERENCES "BtpMetier"("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE INDEX IF NOT EXISTS "Specialite_metierId_idx" ON "Specialite"("metierId");
CREATE INDEX IF NOT EXISTS "Specialite_active_idx" ON "Specialite"("active");

-- Seed : si BtpPrestation existe, on la copie comme "Specialite" (id conservé).
INSERT INTO "Specialite" ("id", "metierId", "label", "active")
SELECT p."id", p."metierId", p."label", TRUE
FROM "BtpPrestation" p
ON CONFLICT ("id") DO NOTHING;

-- Review : nouvelles colonnes (on garde les anciennes pour compat / historique).
ALTER TABLE "Review" ADD COLUMN IF NOT EXISTS "metierId" TEXT;
ALTER TABLE "Review" ADD COLUMN IF NOT EXISTS "specialiteId" TEXT;
ALTER TABLE "Review" ADD COLUMN IF NOT EXISTS "durationMinutes" INTEGER;
ALTER TABLE "Review" ADD COLUMN IF NOT EXISTS "pricePrestationOnly" BOOLEAN;

-- Migration douce des anciennes colonnes vers les nouvelles.
UPDATE "Review"
SET "metierId" = COALESCE("metierId", "prestationMetierId")
WHERE "prestationMetierId" IS NOT NULL AND "metierId" IS NULL;

UPDATE "Review"
SET "specialiteId" = COALESCE("specialiteId", "prestationActiviteId")
WHERE "prestationActiviteId" IS NOT NULL AND "specialiteId" IS NULL;

-- FKs (idempotent via DROP/ADD IF NOT EXISTS pattern sur constraint name).
ALTER TABLE "Review" DROP CONSTRAINT IF EXISTS "Review_metierId_fkey";
ALTER TABLE "Review" ADD CONSTRAINT "Review_metierId_fkey"
  FOREIGN KEY ("metierId") REFERENCES "BtpMetier"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "Review" DROP CONSTRAINT IF EXISTS "Review_specialiteId_fkey";
ALTER TABLE "Review" ADD CONSTRAINT "Review_specialiteId_fkey"
  FOREIGN KEY ("specialiteId") REFERENCES "Specialite"("id") ON DELETE SET NULL ON UPDATE CASCADE;

CREATE INDEX IF NOT EXISTS "Review_metierId_idx" ON "Review"("metierId");
CREATE INDEX IF NOT EXISTS "Review_specialiteId_idx" ON "Review"("specialiteId");


-- Profils main d’œuvre personnalisables par artisan (TJM interne coût/jour)
CREATE TABLE IF NOT EXISTS "ProLaborProfile" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "siren" TEXT NOT NULL,
  "label" TEXT NOT NULL,
  "internalTjmCents" INTEGER NOT NULL,
  "sortOrder" INTEGER NOT NULL DEFAULT 0,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "ProLaborProfile_siren_fkey" FOREIGN KEY ("siren") REFERENCES "ArtisanProfile"("siren") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE INDEX IF NOT EXISTS "ProLaborProfile_siren_idx" ON "ProLaborProfile"("siren");

ALTER TABLE "ProTimeEntry" ADD COLUMN IF NOT EXISTS "laborProfileId" TEXT;

ALTER TABLE "ProTimeEntry" DROP CONSTRAINT IF EXISTS "ProTimeEntry_laborProfileId_fkey";
ALTER TABLE "ProTimeEntry"
  ADD CONSTRAINT "ProTimeEntry_laborProfileId_fkey"
  FOREIGN KEY ("laborProfileId") REFERENCES "ProLaborProfile"("id") ON DELETE SET NULL ON UPDATE CASCADE;

CREATE INDEX IF NOT EXISTS "ProTimeEntry_laborProfileId_idx" ON "ProTimeEntry"("laborProfileId");

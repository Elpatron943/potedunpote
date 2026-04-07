-- Acheteur connecté : rattache la demande au compte User pour la liste /compte/demandes
ALTER TABLE "ProLead" ADD COLUMN IF NOT EXISTS "requesterUserId" TEXT;

ALTER TABLE "ProLead" DROP CONSTRAINT IF EXISTS "ProLead_requesterUserId_fkey";
ALTER TABLE "ProLead"
  ADD CONSTRAINT "ProLead_requesterUserId_fkey"
  FOREIGN KEY ("requesterUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

CREATE INDEX IF NOT EXISTS "ProLead_requesterUserId_idx" ON "ProLead"("requesterUserId");

-- Demande de devis structurée (métier / prestation + dossier client JSON).

ALTER TABLE "ProLead" ADD COLUMN IF NOT EXISTS "metierId" TEXT;
ALTER TABLE "ProLead" ADD COLUMN IF NOT EXISTS "prestationId" TEXT;
ALTER TABLE "ProLead" ADD COLUMN IF NOT EXISTS "requestPayload" JSONB;

CREATE INDEX IF NOT EXISTS "ProLead_prestationId_idx" ON "ProLead"("prestationId");

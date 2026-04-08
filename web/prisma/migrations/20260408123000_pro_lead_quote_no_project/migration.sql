-- Devis lié à une demande entrante sans chantier (pas de ProProject avant commande)
ALTER TABLE "ProQuote" ADD COLUMN IF NOT EXISTS "leadId" TEXT;

-- Un devis peut exister avant l’ouverture d’un chantier : projectId devient nullable.
ALTER TABLE "ProQuote" ALTER COLUMN "projectId" DROP NOT NULL;

ALTER TABLE "ProQuote" DROP CONSTRAINT IF EXISTS "ProQuote_leadId_fkey";
ALTER TABLE "ProQuote"
  ADD CONSTRAINT "ProQuote_leadId_fkey"
  FOREIGN KEY ("leadId") REFERENCES "ProLead"("id") ON DELETE SET NULL ON UPDATE CASCADE;

CREATE INDEX IF NOT EXISTS "ProQuote_leadId_idx" ON "ProQuote"("leadId");

-- Ressources internes : TJM (coût / jour) au niveau chantier
ALTER TABLE "ProProject" ADD COLUMN IF NOT EXISTS "internalTjmCents" INT;


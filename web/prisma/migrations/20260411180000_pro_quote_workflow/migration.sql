-- Chantier lié à une demande entrante + e-mail client pour envoi devis
ALTER TABLE "ProProject" ADD COLUMN IF NOT EXISTS "sourceLeadId" TEXT;
ALTER TABLE "ProProject" ADD COLUMN IF NOT EXISTS "clientEmail" TEXT;

CREATE UNIQUE INDEX IF NOT EXISTS "ProProject_sourceLeadId_key" ON "ProProject"("sourceLeadId") WHERE "sourceLeadId" IS NOT NULL;

ALTER TABLE "ProProject" DROP CONSTRAINT IF EXISTS "ProProject_sourceLeadId_fkey";
ALTER TABLE "ProProject"
  ADD CONSTRAINT "ProProject_sourceLeadId_fkey"
  FOREIGN KEY ("sourceLeadId") REFERENCES "ProLead"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- Devis : origine demande vs manuel + suivi envoi / commande
ALTER TABLE "ProQuote" ADD COLUMN IF NOT EXISTS "source" TEXT NOT NULL DEFAULT 'MANUAL';
ALTER TABLE "ProQuote" ADD COLUMN IF NOT EXISTS "sentAt" TIMESTAMPTZ;
ALTER TABLE "ProQuote" ADD COLUMN IF NOT EXISTS "acceptedAt" TIMESTAMPTZ;

-- Facture créée depuis un devis
ALTER TABLE "ProInvoice" ADD COLUMN IF NOT EXISTS "sourceQuoteId" TEXT;

ALTER TABLE "ProInvoice" DROP CONSTRAINT IF EXISTS "ProInvoice_sourceQuoteId_fkey";
ALTER TABLE "ProInvoice"
  ADD CONSTRAINT "ProInvoice_sourceQuoteId_fkey"
  FOREIGN KEY ("sourceQuoteId") REFERENCES "ProQuote"("id") ON DELETE SET NULL ON UPDATE CASCADE;

CREATE INDEX IF NOT EXISTS "ProInvoice_sourceQuoteId_idx" ON "ProInvoice"("sourceQuoteId");

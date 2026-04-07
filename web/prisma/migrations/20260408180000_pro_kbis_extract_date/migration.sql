-- Date « À jour au » lue sur le Kbis (YYYY-MM-DD) pour audit et contrôle « moins de 3 mois ».

ALTER TABLE "ProKbisVerification" ADD COLUMN IF NOT EXISTS "kbisExtractDate" TEXT;

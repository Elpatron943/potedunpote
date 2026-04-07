-- Vérification Pro : dépôt Kbis + analyse (SIREN document vs SIREN déclaré) avant création de ArtisanProfile.
-- Supabase Storage : créer un bucket **privé** nommé `pro-kbis` (Dashboard → Storage → New bucket → désactiver l’accès public).
-- Les uploads passent par la service role côté serveur.

CREATE TABLE IF NOT EXISTS "ProKbisVerification" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "declaredSiren" TEXT NOT NULL,
    "storagePath" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "aiExtractedSiren" TEXT,
    "aiConfidence" TEXT,
    "aiNotes" TEXT,
    "rejectionReason" TEXT,
    "createdAt" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    "updatedAt" TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    CONSTRAINT "ProKbisVerification_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "ProKbisVerification_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE INDEX IF NOT EXISTS "ProKbisVerification_userId_idx" ON "ProKbisVerification"("userId");
CREATE INDEX IF NOT EXISTS "ProKbisVerification_createdAt_idx" ON "ProKbisVerification"("createdAt");

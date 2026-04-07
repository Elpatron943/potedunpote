-- Pièces jointes demande de devis + brouillon IA (résumé, lignes suggérées, manques).

CREATE TABLE IF NOT EXISTS "ProLeadAttachment" (
  "id" TEXT NOT NULL,
  "leadId" TEXT NOT NULL,
  "storagePath" TEXT NOT NULL,
  "mimeType" TEXT NOT NULL,
  "sortOrder" INTEGER NOT NULL DEFAULT 0,
  "createdAt" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "ProLeadAttachment_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "ProLeadAttachment_leadId_fkey" FOREIGN KEY ("leadId") REFERENCES "ProLead"("id") ON DELETE CASCADE ON UPDATE CASCADE
);
CREATE INDEX IF NOT EXISTS "ProLeadAttachment_leadId_idx" ON "ProLeadAttachment"("leadId");

CREATE TABLE IF NOT EXISTS "ProLeadAiDraft" (
  "id" TEXT NOT NULL,
  "leadId" TEXT NOT NULL,
  "status" TEXT NOT NULL DEFAULT 'PENDING',
  "model" TEXT,
  "summary" TEXT,
  "missingFields" JSONB,
  "suggestedLines" JSONB,
  "assumptions" JSONB,
  "confidence" INTEGER,
  "rawResponse" JSONB,
  "createdAt" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "ProLeadAiDraft_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "ProLeadAiDraft_leadId_key" UNIQUE ("leadId"),
  CONSTRAINT "ProLeadAiDraft_leadId_fkey" FOREIGN KEY ("leadId") REFERENCES "ProLead"("id") ON DELETE CASCADE ON UPDATE CASCADE
);
CREATE INDEX IF NOT EXISTS "ProLeadAiDraft_leadId_idx" ON "ProLeadAiDraft"("leadId");

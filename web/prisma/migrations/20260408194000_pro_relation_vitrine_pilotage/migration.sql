-- Portail Pro : modules Relation / Vitrine / Pilotage (MVP) — sans Stripe.
-- Dépend de la migration pro_subscriptions (plans).

-- --- Relation : demandes entrantes ---
CREATE TABLE IF NOT EXISTS "ProLead" (
  "id" TEXT NOT NULL,
  "siren" TEXT NOT NULL,
  "status" TEXT NOT NULL DEFAULT 'NEW', -- NEW | IN_PROGRESS | CLOSED
  "fullName" TEXT,
  "email" TEXT,
  "phone" TEXT,
  "message" TEXT,
  "source" TEXT NOT NULL DEFAULT 'entreprise', -- entreprise | autre
  "createdAt" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "ProLead_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "ProLead_siren_fkey" FOREIGN KEY ("siren") REFERENCES "ArtisanProfile"("siren") ON DELETE CASCADE ON UPDATE CASCADE
);
CREATE INDEX IF NOT EXISTS "ProLead_siren_idx" ON "ProLead"("siren");
CREATE INDEX IF NOT EXISTS "ProLead_status_idx" ON "ProLead"("status");
CREATE INDEX IF NOT EXISTS "ProLead_createdAt_idx" ON "ProLead"("createdAt");

-- --- Vitrine : champs éditables sur le profil ---
ALTER TABLE "ArtisanProfile" ADD COLUMN IF NOT EXISTS "vitrineHeadline" TEXT;
ALTER TABLE "ArtisanProfile" ADD COLUMN IF NOT EXISTS "vitrineBio" TEXT;

-- --- Pilotage : chantiers, devis, factures, temps, dépenses ---
CREATE TABLE IF NOT EXISTS "ProProject" (
  "id" TEXT NOT NULL,
  "siren" TEXT NOT NULL,
  "title" TEXT NOT NULL,
  "clientName" TEXT,
  "status" TEXT NOT NULL DEFAULT 'OPEN', -- OPEN | WON | LOST | ARCHIVED
  "notes" TEXT,
  "createdAt" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "ProProject_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "ProProject_siren_fkey" FOREIGN KEY ("siren") REFERENCES "ArtisanProfile"("siren") ON DELETE CASCADE ON UPDATE CASCADE
);
CREATE INDEX IF NOT EXISTS "ProProject_siren_idx" ON "ProProject"("siren");
CREATE INDEX IF NOT EXISTS "ProProject_status_idx" ON "ProProject"("status");

CREATE TABLE IF NOT EXISTS "ProQuote" (
  "id" TEXT NOT NULL,
  "projectId" TEXT NOT NULL,
  "number" TEXT NOT NULL,
  "status" TEXT NOT NULL DEFAULT 'DRAFT', -- DRAFT | SENT | ACCEPTED | REJECTED
  "currency" TEXT NOT NULL DEFAULT 'EUR',
  "totalCents" INTEGER NOT NULL DEFAULT 0,
  "linesJson" JSONB,
  "issuedAt" TIMESTAMPTZ,
  "createdAt" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "ProQuote_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "ProQuote_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "ProProject"("id") ON DELETE CASCADE ON UPDATE CASCADE
);
CREATE INDEX IF NOT EXISTS "ProQuote_projectId_idx" ON "ProQuote"("projectId");

CREATE TABLE IF NOT EXISTS "ProInvoice" (
  "id" TEXT NOT NULL,
  "projectId" TEXT NOT NULL,
  "number" TEXT NOT NULL,
  "status" TEXT NOT NULL DEFAULT 'DRAFT', -- DRAFT | SENT | PAID | VOID
  "currency" TEXT NOT NULL DEFAULT 'EUR',
  "totalCents" INTEGER NOT NULL DEFAULT 0,
  "linesJson" JSONB,
  "issuedAt" TIMESTAMPTZ,
  "paidAt" TIMESTAMPTZ,
  "createdAt" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "ProInvoice_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "ProInvoice_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "ProProject"("id") ON DELETE CASCADE ON UPDATE CASCADE
);
CREATE INDEX IF NOT EXISTS "ProInvoice_projectId_idx" ON "ProInvoice"("projectId");

CREATE TABLE IF NOT EXISTS "ProTimeEntry" (
  "id" TEXT NOT NULL,
  "projectId" TEXT NOT NULL,
  "minutes" INTEGER NOT NULL,
  "workDate" DATE NOT NULL,
  "note" TEXT,
  "createdAt" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "ProTimeEntry_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "ProTimeEntry_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "ProProject"("id") ON DELETE CASCADE ON UPDATE CASCADE
);
CREATE INDEX IF NOT EXISTS "ProTimeEntry_projectId_idx" ON "ProTimeEntry"("projectId");
CREATE INDEX IF NOT EXISTS "ProTimeEntry_workDate_idx" ON "ProTimeEntry"("workDate");

CREATE TABLE IF NOT EXISTS "ProExpense" (
  "id" TEXT NOT NULL,
  "projectId" TEXT NOT NULL,
  "label" TEXT NOT NULL,
  "amountCents" INTEGER NOT NULL,
  "expenseDate" DATE NOT NULL,
  "category" TEXT NOT NULL DEFAULT 'OTHER', -- MATERIAL | SUBCONTRACT | TRAVEL | OTHER
  "note" TEXT,
  "createdAt" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "ProExpense_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "ProExpense_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "ProProject"("id") ON DELETE CASCADE ON UPDATE CASCADE
);
CREATE INDEX IF NOT EXISTS "ProExpense_projectId_idx" ON "ProExpense"("projectId");
CREATE INDEX IF NOT EXISTS "ProExpense_expenseDate_idx" ON "ProExpense"("expenseDate");


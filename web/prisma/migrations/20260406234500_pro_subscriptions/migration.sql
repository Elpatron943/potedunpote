-- Portail Pro (sans Stripe) : référentiel plans/options + souscriptions.
-- Objectif : activer/désactiver des fonctionnalités Pro côté app via des enregistrements en base.

DO $$
BEGIN
  CREATE TYPE "ProSubscriptionStatus" AS ENUM ('ACTIVE', 'INACTIVE');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

CREATE TABLE IF NOT EXISTS "ProPlan" (
    "id" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "priceEuros" INTEGER NOT NULL,
    "rank" INTEGER NOT NULL,
    "active" BOOLEAN NOT NULL DEFAULT TRUE,
    "createdAt" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ProPlan_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "ProPlan_label_key" UNIQUE ("label")
);

CREATE INDEX IF NOT EXISTS "ProPlan_active_idx" ON "ProPlan"("active");

CREATE TABLE IF NOT EXISTS "ProOption" (
    "id" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "active" BOOLEAN NOT NULL DEFAULT TRUE,
    "createdAt" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ProOption_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "ProOption_label_key" UNIQUE ("label")
);

CREATE INDEX IF NOT EXISTS "ProOption_active_idx" ON "ProOption"("active");

CREATE TABLE IF NOT EXISTS "ProSubscription" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "siren" TEXT NOT NULL,
    "planId" TEXT NOT NULL,
    "status" "ProSubscriptionStatus" NOT NULL DEFAULT 'ACTIVE',
    -- Sans Stripe : date d’expiration / fin de période (utilisée pour activer/désactiver).
    "currentPeriodEnd" TIMESTAMPTZ,
    "createdAt" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ProSubscription_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "ProSubscription_userId_key" UNIQUE ("userId"),
    CONSTRAINT "ProSubscription_siren_key" UNIQUE ("siren"),
    CONSTRAINT "ProSubscription_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "ProSubscription_siren_fkey" FOREIGN KEY ("siren") REFERENCES "ArtisanProfile"("siren") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "ProSubscription_planId_fkey" FOREIGN KEY ("planId") REFERENCES "ProPlan"("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

CREATE INDEX IF NOT EXISTS "ProSubscription_planId_idx" ON "ProSubscription"("planId");
CREATE INDEX IF NOT EXISTS "ProSubscription_status_idx" ON "ProSubscription"("status");

CREATE TABLE IF NOT EXISTS "ProSubscriptionOption" (
    "subscriptionId" TEXT NOT NULL,
    "optionId" TEXT NOT NULL,
    "createdAt" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ProSubscriptionOption_pkey" PRIMARY KEY ("subscriptionId", "optionId"),
    CONSTRAINT "ProSubscriptionOption_subscriptionId_fkey" FOREIGN KEY ("subscriptionId") REFERENCES "ProSubscription"("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "ProSubscriptionOption_optionId_fkey" FOREIGN KEY ("optionId") REFERENCES "ProOption"("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE INDEX IF NOT EXISTS "ProSubscriptionOption_optionId_idx" ON "ProSubscriptionOption"("optionId");

-- Seed plans (ids stables) : aligné sur la page /artisan/abonnement
INSERT INTO "ProPlan" ("id", "label", "priceEuros", "rank")
VALUES
  ('essentiel', 'Pro Essentiel', 10, 10),
  ('relation', 'Pro Relation', 20, 20),
  ('vitrine', 'Pro Vitrine', 30, 30),
  ('pilotage', 'Pro Pilotage', 50, 40)
ON CONFLICT ("id") DO NOTHING;

-- Seed options (pour évoluer ensuite sans changer les plans)
INSERT INTO "ProOption" ("id", "label")
VALUES
  ('contact', 'Bouton Contacter (téléphone + liens)'),
  ('sous-activites', 'Sous-activités détaillées (prestations cochées)'),
  ('serves', 'Particuliers & pros (ciblage)'),
  ('gallery', 'Visuels chantiers'),
  ('inbox', 'Gestion des demandes entrantes'),
  ('vitrine-web', 'Vitrine web personnalisée'),
  ('pilotage', 'Pilotage (devis, factures, temps, marge)')
ON CONFLICT ("id") DO NOTHING;


-- Catalogue Pilotage : articles, main d'œuvre (TJM / h), sous-traitance — par entreprise (SIREN).

CREATE TABLE IF NOT EXISTS "ProCatalogItem" (
  "id" TEXT NOT NULL,
  "siren" TEXT NOT NULL,
  "kind" TEXT NOT NULL,
  "label" TEXT NOT NULL,
  "description" TEXT,
  "unit" TEXT NOT NULL DEFAULT 'forfait',
  "purchaseUnitPriceCents" INTEGER,
  "saleUnitPriceCents" INTEGER,
  "sortOrder" INTEGER NOT NULL DEFAULT 0,
  "createdAt" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "ProCatalogItem_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "ProCatalogItem_siren_fkey" FOREIGN KEY ("siren") REFERENCES "ArtisanProfile"("siren") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE INDEX IF NOT EXISTS "ProCatalogItem_siren_idx" ON "ProCatalogItem"("siren");
CREATE INDEX IF NOT EXISTS "ProCatalogItem_siren_kind_idx" ON "ProCatalogItem"("siren", "kind");

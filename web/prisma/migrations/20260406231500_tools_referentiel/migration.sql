-- Référentiel outils : lister les outils et lier aux articles Conseils.
-- Objectif : pouvoir compter le nombre d’articles par outil (via requêtes ou vue).

CREATE TABLE "ToolReferential" (
    "id" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "category" TEXT,
    "synonyms" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
    "active" BOOLEAN NOT NULL DEFAULT TRUE,
    "createdAt" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ToolReferential_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "ToolReferential_label_key" UNIQUE ("label")
);

CREATE INDEX "ToolReferential_active_idx" ON "ToolReferential"("active");
CREATE INDEX "ToolReferential_category_idx" ON "ToolReferential"("category");

-- Liaison outil -> article Conseils (un article peut référencer plusieurs outils, et inversement).
CREATE TABLE "ToolArticle" (
    "toolId" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "createdAt" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ToolArticle_pkey" PRIMARY KEY ("toolId", "slug"),
    CONSTRAINT "ToolArticle_toolId_fkey" FOREIGN KEY ("toolId") REFERENCES "ToolReferential"("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "ToolArticle_slug_fkey" FOREIGN KEY ("slug") REFERENCES "DiyKnowledgeArticle"("slug") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE INDEX "ToolArticle_slug_idx" ON "ToolArticle"("slug");

-- Vue pratique : comptage d’articles par outil.
CREATE VIEW "ToolReferentialStats" AS
SELECT
  t."id",
  t."label",
  t."category",
  t."active",
  COUNT(ta."slug")::INT AS "articleCount"
FROM "ToolReferential" t
LEFT JOIN "ToolArticle" ta
  ON ta."toolId" = t."id"
GROUP BY t."id", t."label", t."category", t."active";


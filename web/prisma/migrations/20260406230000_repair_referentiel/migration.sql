-- Référentiel réparation : équipements, problèmes, liens et fiches associées.
-- Objectif : permettre de réutiliser / suggérer une fiche existante plutôt que régénérer.

CREATE TABLE "RepairEquipment" (
    "id" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "room" TEXT,
    "category" TEXT,
    "synonyms" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
    "active" BOOLEAN NOT NULL DEFAULT TRUE,
    "createdAt" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "RepairEquipment_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "RepairEquipment_label_key" UNIQUE ("label")
);

CREATE INDEX "RepairEquipment_active_idx" ON "RepairEquipment"("active");
CREATE INDEX "RepairEquipment_room_idx" ON "RepairEquipment"("room");

CREATE TABLE "RepairProblem" (
    "id" TEXT NOT NULL,
    -- Clé stable utilisée par le bot/API (kebab-case), ex: fuite-siphon-lavabo
    "problemKey" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "description" TEXT,
    "severity" TEXT,
    "synonyms" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
    "active" BOOLEAN NOT NULL DEFAULT TRUE,
    "createdAt" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "RepairProblem_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "RepairProblem_problemKey_key" UNIQUE ("problemKey")
);

CREATE INDEX "RepairProblem_active_idx" ON "RepairProblem"("active");

-- Table de liaison : quels problèmes sont typiquement liés à quels équipements
CREATE TABLE "RepairEquipmentProblem" (
    "equipmentId" TEXT NOT NULL,
    "problemId" TEXT NOT NULL,
    "confidence" INTEGER,
    "notes" TEXT,
    "createdAt" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "RepairEquipmentProblem_pkey" PRIMARY KEY ("equipmentId", "problemId"),
    CONSTRAINT "RepairEquipmentProblem_equipmentId_fkey" FOREIGN KEY ("equipmentId") REFERENCES "RepairEquipment"("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "RepairEquipmentProblem_problemId_fkey" FOREIGN KEY ("problemId") REFERENCES "RepairProblem"("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE INDEX "RepairEquipmentProblem_problemId_idx" ON "RepairEquipmentProblem"("problemId");

-- Réutilisation de fiches : map explicite problème -> article Conseils (slug)
CREATE TABLE "RepairProblemArticle" (
    "problemId" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "createdAt" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "RepairProblemArticle_pkey" PRIMARY KEY ("problemId", "slug"),
    CONSTRAINT "RepairProblemArticle_slug_key" UNIQUE ("slug"),
    CONSTRAINT "RepairProblemArticle_problemId_fkey" FOREIGN KEY ("problemId") REFERENCES "RepairProblem"("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "RepairProblemArticle_slug_fkey" FOREIGN KEY ("slug") REFERENCES "DiyKnowledgeArticle"("slug") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE INDEX "RepairProblemArticle_problemId_idx" ON "RepairProblemArticle"("problemId");


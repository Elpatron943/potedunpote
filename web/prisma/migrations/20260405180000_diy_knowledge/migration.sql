-- Guides bricolage DIY (contenu SEO + chatbot).
CREATE TABLE "DiyKnowledgeArticle" (
    "id" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "metierId" TEXT NOT NULL,
    "prestationId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "excerpt" TEXT,
    "bodyMarkdown" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "DiyKnowledgeArticle_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "DiyKnowledgeArticle_slug_key" UNIQUE ("slug"),
    CONSTRAINT "DiyKnowledgeArticle_metier_prestation_key" UNIQUE ("metierId", "prestationId")
);

CREATE INDEX "DiyKnowledgeArticle_metierId_idx" ON "DiyKnowledgeArticle"("metierId");
CREATE INDEX "DiyKnowledgeArticle_createdAt_idx" ON "DiyKnowledgeArticle"("createdAt");

-- Journal chatbot : étape guide DIY
ALTER TABLE "ChatbotLog" DROP CONSTRAINT IF EXISTS "ChatbotLog_step_check";
ALTER TABLE "ChatbotLog" ADD CONSTRAINT "ChatbotLog_step_check" CHECK ("step" IN ('simple', 'repair_ack', 'repair_text', 'repair_vision', 'diy_guide'));

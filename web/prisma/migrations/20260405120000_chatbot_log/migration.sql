-- Journal des échanges « Bot de ton pote » (texte + réponse ; pas d’image stockée).
-- À exécuter dans Supabase → SQL Editor si la table n’existe pas encore.

CREATE TABLE "ChatbotLog" (
    "id" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "clientSessionId" TEXT,
    "userId" TEXT,
    "choiceId" TEXT NOT NULL,
    "step" TEXT NOT NULL,
    "userText" TEXT,
    "assistantText" TEXT NOT NULL,
    "usedVision" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "ChatbotLog_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "ChatbotLog_choiceId_check" CHECK ("choiceId" IN ('artisan', 'diy', 'repair')),
    CONSTRAINT "ChatbotLog_step_check" CHECK ("step" IN ('simple', 'repair_ack', 'repair_text', 'repair_vision'))
);

CREATE INDEX "ChatbotLog_createdAt_idx" ON "ChatbotLog"("createdAt");
CREATE INDEX "ChatbotLog_userId_idx" ON "ChatbotLog"("userId");
CREATE INDEX "ChatbotLog_clientSessionId_idx" ON "ChatbotLog"("clientSessionId");

ALTER TABLE "ChatbotLog" ADD CONSTRAINT "ChatbotLog_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

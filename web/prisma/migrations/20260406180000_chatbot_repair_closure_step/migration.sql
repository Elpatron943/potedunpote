-- Journal chatbot : étape clôture parcours réparation (DIY / artisan / SAV)
ALTER TABLE "ChatbotLog" DROP CONSTRAINT IF EXISTS "ChatbotLog_step_check";
ALTER TABLE "ChatbotLog" ADD CONSTRAINT "ChatbotLog_step_check" CHECK ("step" IN ('simple', 'repair_ack', 'repair_text', 'repair_vision', 'diy_guide', 'repair_closure'));

import { createId } from "@paralleldrive/cuid2";

import { getSupabaseAdmin } from "@/lib/supabase/admin";

export type ChatbotStep = "simple" | "repair_ack" | "repair_text" | "repair_vision" | "diy_guide";

const MAX_USER_TEXT = 6000;
const MAX_ASSISTANT_TEXT = 50000;

/**
 * Enregistre un échange réussi dans Supabase. Ne doit pas faire échouer la route API.
 */
export async function logChatbotExchange(params: {
  clientSessionId: string | null;
  userId: string | null;
  choiceId: "artisan" | "diy" | "repair";
  step: ChatbotStep;
  userText: string | null;
  assistantText: string;
  usedVision: boolean;
}): Promise<void> {
  const userText =
    params.userText != null && params.userText.length > 0
      ? params.userText.slice(0, MAX_USER_TEXT)
      : null;
  const assistantText = params.assistantText.slice(0, MAX_ASSISTANT_TEXT);
  if (!assistantText) return;

  try {
    const supabase = getSupabaseAdmin();
    const { error } = await supabase.from("ChatbotLog").insert({
      id: createId(),
      createdAt: new Date().toISOString(),
      clientSessionId: params.clientSessionId,
      userId: params.userId,
      choiceId: params.choiceId,
      step: params.step,
      userText,
      assistantText,
      usedVision: params.usedVision,
    });
    if (error) console.error("[chatbot-log]", error.message);
  } catch (e) {
    console.error("[chatbot-log]", e);
  }
}

import type { SupabaseClient } from "@supabase/supabase-js";

/** E-mail destinataire pour l’envoi de devis (validation légère). */
export function parseClientEmailField(raw: unknown): string | null {
  const s = String(raw ?? "").trim();
  if (s.length < 3 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(s)) return null;
  return s.slice(0, 320);
}

type ProjRow = { sourceLeadId?: string | null; clientEmail?: string | null };

/**
 * Priorité : e-mail du compte User ayant passé la demande → e-mail saisi sur le lead → e-mail enregistré sur le chantier.
 */
export async function resolveQuoteRecipientEmail(supabase: SupabaseClient, proj: ProjRow): Promise<string | null> {
  const leadId = proj.sourceLeadId != null ? String(proj.sourceLeadId).trim() : "";
  if (leadId) {
    const { data: lead } = await supabase.from("ProLead").select("email,requesterUserId").eq("id", leadId).maybeSingle();
    if (lead) {
      const uid = lead.requesterUserId as string | null | undefined;
      if (uid) {
        const { data: user } = await supabase.from("User").select("email").eq("id", uid).maybeSingle();
        const fromUser = parseClientEmailField(user?.email);
        if (fromUser) return fromUser;
      }
      const fromLead = parseClientEmailField(lead.email);
      if (fromLead) return fromLead;
    }
  }
  return parseClientEmailField(proj.clientEmail);
}

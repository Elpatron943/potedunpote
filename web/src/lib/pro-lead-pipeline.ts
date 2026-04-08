import { getSupabaseAdmin } from "@/lib/supabase/admin";

type AdminClient = ReturnType<typeof getSupabaseAdmin>;

async function resolveLeadIdForQuoteContext(
  supabase: AdminClient,
  leadId: string | null | undefined,
  projectId: string | null | undefined,
): Promise<string> {
  let id = leadId ? String(leadId).trim() : "";
  if (!id && projectId) {
    const { data: proj } = await supabase
      .from("ProProject")
      .select("sourceLeadId")
      .eq("id", projectId)
      .maybeSingle();
    const sl = proj?.sourceLeadId;
    id = typeof sl === "string" && sl.length > 0 ? sl : "";
  }
  return id;
}

/** Après envoi e-mail du devis : demande « en cours » si encore dans le pipeline actif. */
export async function markLeadInProgressAfterQuoteSent(
  supabase: AdminClient,
  params: { leadId: string | null | undefined; projectId: string | null | undefined; siren: string },
): Promise<void> {
  const leadId = await resolveLeadIdForQuoteContext(supabase, params.leadId, params.projectId);
  if (!leadId) return;
  const now = new Date().toISOString();
  const { data: row } = await supabase
    .from("ProLead")
    .select("status")
    .eq("id", leadId)
    .eq("siren", params.siren)
    .maybeSingle();
  if (!row) return;
  const st = String((row as { status?: string }).status ?? "NEW");
  if (st !== "NEW" && st !== "IN_PROGRESS") return;
  await supabase
    .from("ProLead")
    .update({ status: "IN_PROGRESS", updatedAt: now })
    .eq("id", leadId)
    .eq("siren", params.siren);
}

/** Commande validée, devis archivé sans suite, ou déclin explicite : demande en archives. */
export async function archiveLeadFromQuoteBinding(
  supabase: AdminClient,
  params: { leadId: string | null | undefined; projectId: string | null | undefined; siren: string },
): Promise<void> {
  const leadId = await resolveLeadIdForQuoteContext(supabase, params.leadId, params.projectId);
  if (!leadId) return;
  const now = new Date().toISOString();
  await supabase
    .from("ProLead")
    .update({ status: "ARCHIVED", updatedAt: now })
    .eq("id", leadId)
    .eq("siren", params.siren);
}

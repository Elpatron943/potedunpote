import { getSupabaseAdmin } from "@/lib/supabase/admin";

export type BuyerProLeadRow = {
  id: string;
  siren: string;
  status: string;
  fullName: string | null;
  message: string | null;
  metierId: string | null;
  prestationId: string | null;
  createdAt: string;
};

/** Échappe %, _ et \ pour un filtre ilike « égalité » sensible à la casse côté PG. */
function escapeForIlikeExact(s: string): string {
  return s.replace(/\\/g, "\\\\").replace(/%/g, "\\%").replace(/_/g, "\\_");
}

/** Demandes de devis visibles par l’acheteur : compte lié ou anciennes lignes sans lien mais même e-mail. */
export async function getMyProLeadsForBuyer(userId: string, userEmail: string): Promise<BuyerProLeadRow[]> {
  const supabase = getSupabaseAdmin();
  const emailTrim = userEmail.trim();
  if (!emailTrim) {
    const { data, error } = await supabase
      .from("ProLead")
      .select("id,siren,status,fullName,message,metierId,prestationId,createdAt")
      .eq("requesterUserId", userId)
      .order("createdAt", { ascending: false })
      .limit(100);
    if (error) throw error;
    return (data ?? []) as BuyerProLeadRow[];
  }

  const emailPattern = escapeForIlikeExact(emailTrim);

  const [byUserRes, byEmailRes] = await Promise.all([
    supabase
      .from("ProLead")
      .select("id,siren,status,fullName,message,metierId,prestationId,createdAt")
      .eq("requesterUserId", userId)
      .order("createdAt", { ascending: false })
      .limit(100),
    supabase
      .from("ProLead")
      .select("id,siren,status,fullName,message,metierId,prestationId,createdAt")
      .is("requesterUserId", null)
      .ilike("email", emailPattern)
      .order("createdAt", { ascending: false })
      .limit(100),
  ]);

  if (byUserRes.error) throw byUserRes.error;
  if (byEmailRes.error) throw byEmailRes.error;

  const map = new Map<string, BuyerProLeadRow>();
  for (const row of [...(byUserRes.data ?? []), ...(byEmailRes.data ?? [])] as BuyerProLeadRow[]) {
    map.set(row.id, row);
  }
  return [...map.values()].sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
  );
}

export function leadStatusLabelForBuyer(status: string): string {
  switch (status) {
    case "NEW":
      return "Envoyée — en attente";
    case "IN_PROGRESS":
      return "En cours côté pro";
    case "CLOSED":
      return "Clôturée";
    case "ARCHIVED":
      return "Archivée";
    default:
      return status || "—";
  }
}

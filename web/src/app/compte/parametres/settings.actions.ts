"use server";

import { revalidatePath } from "next/cache";

import { requireClientAccountPage } from "@/lib/client-account";
import { getSupabaseAdmin } from "@/lib/supabase/admin";

function parseOptionalDisplayName(raw: FormDataEntryValue | null): string | null {
  const s = typeof raw === "string" ? raw.trim() : "";
  if (!s) return null;
  const clean = s.replace(/\s+/g, " ").slice(0, 80);
  return clean.length > 0 ? clean : null;
}

export async function updateBuyerAccountAction(
  _prev: { ok: boolean; error?: string } | null,
  formData: FormData,
): Promise<{ ok: boolean; error?: string }> {
  const user = await requireClientAccountPage();
  const name = parseOptionalDisplayName(formData.get("name"));

  const supabase = getSupabaseAdmin();
  const now = new Date().toISOString();
  const { error } = await supabase.from("User").update({ name, updatedAt: now }).eq("id", user.userId);
  if (error) return { ok: false, error: "Enregistrement impossible." };

  revalidatePath("/compte");
  revalidatePath("/compte/parametres");
  return { ok: true };
}

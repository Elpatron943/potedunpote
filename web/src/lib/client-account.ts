import { cache } from "react";
import { redirect } from "next/navigation";

import { getSession } from "@/lib/auth-session";
import type { UserRole } from "@/lib/db-enums";
import { getSupabaseAdmin } from "@/lib/supabase/admin";

export type ClientAccountUser = {
  userId: string;
  email: string;
  name: string | null;
  role: UserRole;
};

async function loadClientAccountUser(): Promise<ClientAccountUser | null> {
  const session = await getSession();
  if (!session) return null;
  const supabase = getSupabaseAdmin();
  const { data: user, error } = await supabase
    .from("User")
    .select("id,email,name,role")
    .eq("id", session.userId)
    .single();
  if (error || !user) return null;
  return {
    userId: user.id as string,
    email: user.email as string,
    name: (user.name as string | null) ?? null,
    role: user.role as UserRole,
  };
}

/** Une seule requête utilisateur par rendu (layout + page). */
export const getClientAccountUser = cache(loadClientAccountUser);

/** Page `/compte` : session obligatoire, les comptes artisan sont renvoyés vers l’espace Pro. */
export async function requireClientAccountPage(): Promise<ClientAccountUser> {
  const u = await getClientAccountUser();
  if (!u) redirect("/connexion?next=/compte");
  if (u.role === "ARTISAN") redirect("/pro/tableau");
  return u;
}

import { cache } from "react";

import { getSession } from "@/lib/auth-session";
import type { UserRole } from "@/lib/db-enums";
import { getSupabaseAdmin } from "@/lib/supabase/admin";

export type PortalSessionInfo = {
  userId: string;
  email: string;
  name: string | null;
  role: UserRole;
  hasArtisanProfile: boolean;
};

async function loadPortalSessionInfo(): Promise<PortalSessionInfo | null> {
  const session = await getSession();
  if (!session) return null;
  const supabase = getSupabaseAdmin();
  const { data: user, error: uErr } = await supabase
    .from("User")
    .select("id,email,name,role")
    .eq("id", session.userId)
    .single();
  if (uErr || !user) return null;
  const { data: ap } = await supabase.from("ArtisanProfile").select("id").eq("userId", session.userId).maybeSingle();
  return {
    userId: session.userId,
    email: user.email as string,
    name: (user.name as string | null) ?? null,
    role: user.role as UserRole,
    hasArtisanProfile: Boolean(ap?.id),
  };
}

/** Infos portail (connecté) — une requête par rendu via cache React. */
export const getPortalSessionInfo = cache(loadPortalSessionInfo);

import { redirect } from "next/navigation";

import { getSession } from "@/lib/auth-session";
import type { UserRole } from "@/lib/db-enums";
import { getSupabaseAdmin } from "@/lib/supabase/admin";

export type ProContext = {
  userId: string;
  role: UserRole;
  email: string;
  name: string | null;
  artisanProfile: {
    id: string;
    siren: string;
    verifiedAt: string | null;
    phonePublic: string | null;
    contactLinks: unknown;
    premiumUntil: string | null;
    servesParticuliers: boolean;
    servesProfessionnels: boolean;
    sousActivitesSelection: unknown;
  } | null;
};

export async function requireAuth(): Promise<{ userId: string }> {
  const session = await getSession();
  if (!session) redirect("/pro/connexion");
  return session;
}

export async function requireProContext(): Promise<ProContext> {
  const { userId } = await requireAuth();
  const supabase = getSupabaseAdmin();
  const { data: user, error: uErr } = await supabase
    .from("User")
    .select("id,email,name,role")
    .eq("id", userId)
    .single();
  if (uErr || !user) redirect("/pro/connexion");
  const role = user.role as UserRole;
  if (role !== "ARTISAN" && role !== "ADMIN") redirect("/connexion");

  const { data: prof } = await supabase
    .from("ArtisanProfile")
    .select(
      "id,siren,verifiedAt,phonePublic,contactLinks,premiumUntil,servesParticuliers,servesProfessionnels,sousActivitesSelection",
    )
    .eq("userId", userId)
    .maybeSingle();

  return {
    userId,
    role,
    email: user.email as string,
    name: (user.name as string | null) ?? null,
    artisanProfile: prof
      ? {
          id: prof.id as string,
          siren: prof.siren as string,
          verifiedAt: (prof.verifiedAt as string | null) ?? null,
          phonePublic: (prof.phonePublic as string | null) ?? null,
          contactLinks: (prof.contactLinks as unknown) ?? null,
          premiumUntil: (prof.premiumUntil as string | null) ?? null,
          servesParticuliers: (prof.servesParticuliers as boolean) ?? true,
          servesProfessionnels: (prof.servesProfessionnels as boolean) ?? false,
          sousActivitesSelection: (prof.sousActivitesSelection as unknown) ?? null,
        }
      : null,
  };
}


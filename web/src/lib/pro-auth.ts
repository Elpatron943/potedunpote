import { redirect } from "next/navigation";

import { getSession } from "@/lib/auth-session";
import type { UserRole } from "@/lib/db-enums";
import { getSupabaseAdmin } from "@/lib/supabase/admin";

export type ProContext = {
  userId: string;
  role: UserRole;
  email: string;
  name: string | null;
  subscription: {
    planId: "essentiel" | "relation" | "vitrine" | "pilotage" | null;
    status: "ACTIVE" | "INACTIVE" | null;
    currentPeriodEnd: string | null;
    /** Abonnement actif côté app (sans Stripe) : ACTIVE + non expiré si une date est présente. */
    isActive: boolean;
  };
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

/** Comptes autorisés sur les routes /pro (onboarding Kbis inclus). Le statut « pro vérifié » = `ArtisanProfile` avec `verifiedAt`. */
const PRO_PORTAL_ALLOWED_ROLES: UserRole[] = ["CLIENT", "ARTISAN", "ADMIN"];

async function loadProContext(userId: string): Promise<ProContext | null> {
  const supabase = getSupabaseAdmin();
  const { data: user, error: uErr } = await supabase
    .from("User")
    .select("id,email,name,role")
    .eq("id", userId)
    .single();
  if (uErr || !user) return null;
  const role = user.role as UserRole;
  if (!PRO_PORTAL_ALLOWED_ROLES.includes(role)) return null;

  const { data: prof } = await supabase
    .from("ArtisanProfile")
    .select(
      "id,siren,verifiedAt,phonePublic,contactLinks,premiumUntil,servesParticuliers,servesProfessionnels,sousActivitesSelection",
    )
    .eq("userId", userId)
    .maybeSingle();

  const { data: sub } = await supabase
    .from("ProSubscription")
    .select("planId,status,currentPeriodEnd")
    .eq("userId", userId)
    .maybeSingle();

  const planIdRaw = (sub?.planId as string | null | undefined) ?? null;
  const planId =
    planIdRaw === "essentiel" ||
    planIdRaw === "relation" ||
    planIdRaw === "vitrine" ||
    planIdRaw === "pilotage"
      ? planIdRaw
      : null;
  const statusRaw = (sub?.status as string | null | undefined) ?? null;
  const status = statusRaw === "ACTIVE" || statusRaw === "INACTIVE" ? statusRaw : null;
  const currentPeriodEnd = (sub?.currentPeriodEnd as string | null | undefined) ?? null;
  const isActive = (() => {
    if (status !== "ACTIVE") return false;
    if (!currentPeriodEnd) return true;
    const end = new Date(currentPeriodEnd);
    if (Number.isNaN(end.getTime())) return true;
    return end.getTime() > Date.now();
  })();

  return {
    userId,
    role,
    email: user.email as string,
    name: (user.name as string | null) ?? null,
    subscription: { planId, status, currentPeriodEnd, isActive },
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

/** Session connectée avec accès portail Pro (CLIENT peut compléter le Kbis ; pas de profil vérifié tant que `ArtisanProfile` absent). */
export async function getOptionalProContext(): Promise<ProContext | null> {
  const session = await getSession();
  if (!session) return null;
  return loadProContext(session.userId);
}

export async function requireAuth(): Promise<{ userId: string }> {
  const session = await getSession();
  if (!session) redirect("/pro/connexion");
  return session;
}

export async function requireProContext(): Promise<ProContext> {
  const { userId } = await requireAuth();
  const ctx = await loadProContext(userId);
  if (!ctx) redirect("/pro/connexion");
  return ctx;
}

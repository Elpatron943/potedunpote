import { PORTAIL_PRO_CONNEXION } from "@/lib/auth-portals";

/** Retour après connexion Pro par défaut (tableau de bord). */
export const ARTISAN_SUBSCRIBE_NEXT = "/pro/tableau";

/** Lien vers la page de connexion Pro avec redirection vers les forfaits (souscription). */
export function artisanSubscribeConnexionHref(): string {
  return `${PORTAIL_PRO_CONNEXION}?next=${encodeURIComponent("/pro/forfaits#offres")}`;
}

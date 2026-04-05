import { PORTAIL_PRO_CONNEXION } from "@/lib/auth-portals";

/** Retour après connexion pour enchaîner vers la souscription Pro. */
export const ARTISAN_SUBSCRIBE_NEXT = "/artisan/abonnement#offres";

/** Lien vers le portail Pro (inscription artisan + redirection offres). */
export function artisanSubscribeConnexionHref(): string {
  return `${PORTAIL_PRO_CONNEXION}?next=${encodeURIComponent(ARTISAN_SUBSCRIBE_NEXT)}`;
}

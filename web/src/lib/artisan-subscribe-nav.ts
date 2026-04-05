/** Retour après connexion pour enchaîner vers la souscription Pro. */
export const ARTISAN_SUBSCRIBE_NEXT = "/artisan/abonnement#offres";

export function artisanSubscribeConnexionHref(): string {
  return `/connexion?next=${encodeURIComponent(ARTISAN_SUBSCRIBE_NEXT)}`;
}

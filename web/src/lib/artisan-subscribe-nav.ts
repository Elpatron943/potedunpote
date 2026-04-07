import { PORTAIL_PRO_CONNEXION } from "@/lib/auth-portals";

/** Retour après connexion Pro par défaut (tableau de bord). */
/** Après connexion / inscription portail Pro : étape vérification Kbis (le tableau n’est accessible qu’avec un profil entreprise validé). */
export const PRO_PORTAL_POST_LOGIN_NEXT = "/pro/onboarding";

/** @deprecated Préférer `PRO_PORTAL_POST_LOGIN_NEXT` pour l’auth ; le tableau nécessite un `ArtisanProfile`. */
export const ARTISAN_SUBSCRIBE_NEXT = "/pro/tableau";

/** Lien vers la page de connexion Pro avec redirection vers les forfaits (souscription). */
export function artisanSubscribeConnexionHref(): string {
  return `${PORTAIL_PRO_CONNEXION}?next=${encodeURIComponent("/pro/forfaits#offres")}`;
}

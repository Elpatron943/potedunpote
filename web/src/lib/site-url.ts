/** URL publique (defaut production : https://potedunpote.fr). Surcharge : NEXT_PUBLIC_SITE_URL. */
export function getSiteUrl(): string {
  const raw = process.env.NEXT_PUBLIC_SITE_URL?.trim();
  if (raw) return raw.replace(/\/$/, "");
  return "https://potedunpote.fr";
}

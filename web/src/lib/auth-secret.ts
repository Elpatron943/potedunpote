const DEV_FALLBACK = "dev-only-change-me-in-production-lpdp-auth";

export function getAuthSecret(): Uint8Array {
  const raw = process.env.AUTH_SECRET?.trim();
  if (!raw) {
    if (process.env.NODE_ENV === "production") {
      throw new Error("AUTH_SECRET doit être défini en production.");
    }
    console.warn(
      "[auth] AUTH_SECRET manquant — utilisation d’un secret de développement. Définis AUTH_SECRET dans .env",
    );
    return new TextEncoder().encode(DEV_FALLBACK);
  }
  return new TextEncoder().encode(raw);
}

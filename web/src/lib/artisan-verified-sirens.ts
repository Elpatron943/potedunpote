import { prisma } from "@/lib/db";

/**
 * SIRENs pour lesquels un compte artisan a revendiqué l’entreprise et la vérification est validée (`verifiedAt`).
 */
export async function getVerifiedRegisteredSirens(sirens: string[]): Promise<Set<string>> {
  const unique = [...new Set(sirens.filter((s) => /^\d{9}$/.test(s)))];
  if (unique.length === 0) return new Set();

  const rows = await prisma.artisanProfile.findMany({
    where: {
      siren: { in: unique },
      verifiedAt: { not: null },
    },
    select: { siren: true },
  });

  return new Set(rows.map((r) => r.siren));
}

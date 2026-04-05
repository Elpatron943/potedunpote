import { PrismaClient } from "@prisma/client";

const globalForPrisma = globalThis as unknown as { prisma: PrismaClient | undefined };

/**
 * En dev, ne pas figer Prisma sur `globalThis` : après `prisma generate`, un serveur déjà lancé
 * gardait une instance sans les nouveaux champs (ex. `amountPaidCents`), d’où des erreurs de validation.
 */
export const prisma =
  process.env.NODE_ENV === "production"
    ? (globalForPrisma.prisma ??= new PrismaClient())
    : new PrismaClient();

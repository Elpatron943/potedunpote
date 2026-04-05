import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/db";

const publicReviewInclude = {
  author: { select: { name: true } },
  response: { select: { body: true, createdAt: true } },
} satisfies Prisma.ReviewInclude;

export type PublicReviewPayload = Prisma.ReviewGetPayload<{
  include: typeof publicReviewInclude;
}>;

export async function getPublishedReviewsForSiren(siren: string): Promise<PublicReviewPayload[]> {
  return prisma.review.findMany({
    where: { siren, status: "PUBLISHED" },
    orderBy: { createdAt: "desc" },
    include: publicReviewInclude,
  });
}

export async function getUserReviewForSiren(userId: string, siren: string) {
  return prisma.review.findUnique({
    where: {
      authorId_siren: { authorId: userId, siren },
    },
    select: { id: true, status: true },
  });
}

export function authorDisplayName(name: string | null): string {
  const t = name?.trim();
  if (t) return t;
  return "Client";
}

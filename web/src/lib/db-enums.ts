/** Aligné sur les enums Postgres / ancien schéma Prisma. */

export type UserRole = "CLIENT" | "ARTISAN" | "ADMIN";

export type ReviewStatus = "PENDING" | "PUBLISHED" | "REJECTED";

export type PriceBracket = "UNDER_EXPECTED" | "AS_EXPECTED" | "ABOVE_EXPECTED" | "MUCH_ABOVE";

export type DeadlinesKept = "YES" | "PARTIAL" | "NO";

export type AvailabilityRating = "EASY" | "OK" | "DIFFICULT";

export type PaymentType = "BANK_TRANSFER" | "CHECK" | "CASH" | "CARD" | "INSTALLMENTS" | "OTHER";

export type QuoteAccuracy = "MATCHED" | "SLIGHTLY_OVER" | "MUCH_OVER" | "UNDER";

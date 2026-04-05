import type {
  AvailabilityRating,
  DeadlinesKept,
  PaymentType,
  PriceBracket,
  QuoteAccuracy,
} from "@prisma/client";

export const PRICE_BRACKET_LABELS: Record<PriceBracket, string> = {
  UNDER_EXPECTED: "Moins cher que prévu",
  AS_EXPECTED: "Conforme au prévu",
  ABOVE_EXPECTED: "Un peu au-dessus",
  MUCH_ABOVE: "Nettement au-dessus",
};

export const DEADLINES_LABELS: Record<DeadlinesKept, string> = {
  YES: "Respectées",
  PARTIAL: "Partiellement",
  NO: "Non respectées",
};

export const AVAILABILITY_LABELS: Record<AvailabilityRating, string> = {
  EASY: "Facile à joindre",
  OK: "Correct",
  DIFFICULT: "Difficile",
};

export const PAYMENT_TYPE_LABELS: Record<PaymentType, string> = {
  BANK_TRANSFER: "Virement",
  CHECK: "Chèque",
  CASH: "Espèces",
  CARD: "Carte",
  INSTALLMENTS: "Échelonné",
  OTHER: "Autre",
};

export const QUOTE_ACCURACY_LABELS: Record<QuoteAccuracy, string> = {
  MATCHED: "Conforme au devis",
  SLIGHTLY_OVER: "Légèrement au-dessus",
  MUCH_OVER: "Très au-dessus",
  UNDER: "En dessous du devis",
};

export function reviewStatusLabel(status: string): string {
  switch (status) {
    case "PENDING":
      return "En modération";
    case "PUBLISHED":
      return "Publié";
    case "REJECTED":
      return "Non retenu";
    default:
      return status;
  }
}

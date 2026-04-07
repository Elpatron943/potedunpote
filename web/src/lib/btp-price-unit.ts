/**
 * Unité de mesure du prix pour une spécialité (prestation) BTP.
 * Aligné sur la colonne `priceUnit` de `BtpPrestation` / `Specialite`.
 */
export const BTP_PRICE_UNITS = ["M2", "ML", "M3", "UNIT", "FORFAIT"] as const;

export type BtpPriceUnit = (typeof BTP_PRICE_UNITS)[number];

export function isBtpPriceUnit(s: string): s is BtpPriceUnit {
  return (BTP_PRICE_UNITS as readonly string[]).includes(s);
}

/** Libellé court pour l'interface (filtres recherche, formulaire avis). */
export function btpPriceUnitShortLabel(unit: BtpPriceUnit): string {
  switch (unit) {
    case "M2":
      return "m²";
    case "ML":
      return "ml";
    case "M3":
      return "m³";
    case "UNIT":
      return "unité";
    case "FORFAIT":
      return "forfait";
    default:
      return unit;
  }
}

/** Phrase pour expliquer la quantité à saisir. */
export function btpPriceUnitQuantityHint(unit: BtpPriceUnit): string | null {
  switch (unit) {
    case "M2":
      return "Surface concernée (m²)";
    case "ML":
      return "Longueur / développé (mètre linéaire)";
    case "M3":
      return "Volume (m³)";
    case "UNIT":
      return "Quantité (nombre d'unités : ouvertures, points, pièces, etc.)";
    case "FORFAIT":
      return null;
    default:
      return null;
  }
}

export function btpPriceUnitRequiresQuantity(unit: BtpPriceUnit): boolean {
  return unit !== "FORFAIT";
}

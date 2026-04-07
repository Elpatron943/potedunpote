export const PRO_CATALOG_KINDS = ["PRODUCT", "LABOR", "SUBCONTRACT"] as const;
export type ProCatalogKind = (typeof PRO_CATALOG_KINDS)[number];

export function isProCatalogKind(s: string): s is ProCatalogKind {
  return (PRO_CATALOG_KINDS as readonly string[]).includes(s);
}

export const PRO_CATALOG_KIND_LABELS: Record<ProCatalogKind, string> = {
  PRODUCT: "Produit / fourniture",
  LABOR: "Main d’œuvre",
  SUBCONTRACT: "Sous-traitance",
};

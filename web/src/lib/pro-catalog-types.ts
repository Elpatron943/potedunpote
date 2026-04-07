import type { ProCatalogKind } from "@/lib/pro-catalog-kinds";

/** Données catalogue pour les sélecteurs de lignes (devis / factures). */
export type ProCatalogPickerItem = {
  id: string;
  kind: ProCatalogKind;
  label: string;
  unit: string;
  purchaseUnitPriceCents: number | null;
  saleUnitPriceCents: number | null;
};

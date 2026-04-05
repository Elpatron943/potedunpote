/** Affichage EUR à partir de centimes (entier). */
export function formatEurFromCents(cents: number): string {
  return new Intl.NumberFormat("fr-FR", {
    style: "currency",
    currency: "EUR",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(cents / 100);
}

/** Prix au m² à partir du total (centimes) et de la surface (m²). */
export function formatEurPerSquareMeterFromCents(amountPaidCents: number, surfaceM2: number): string {
  if (!(surfaceM2 > 0) || !Number.isFinite(surfaceM2)) return "—";
  const eurPerM2 = amountPaidCents / 100 / surfaceM2;
  return formatEurPerSquareMeter(eurPerM2);
}

/** Valeur déjà en €/m² (agrégats, prévisualisations). */
export function formatEurPerSquareMeter(eurPerM2: number): string {
  return new Intl.NumberFormat("fr-FR", {
    style: "currency",
    currency: "EUR",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(eurPerM2);
}

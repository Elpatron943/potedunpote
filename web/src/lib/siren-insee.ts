/**
 * Clé de contrôle du SIREN (9 chiffres) — algorithme de Luhn utilisé par l’INSEE.
 * @see https://www.insee.fr/fr/metadonnees/definition/c1027
 */
export function isValidSirenChecksum(siren: string): boolean {
  if (!/^\d{9}$/.test(siren)) return false;
  let sum = 0;
  for (let i = 0; i < 9; i++) {
    let digit = Number(siren[i]);
    if (i % 2 === 1) {
      digit *= 2;
      if (digit > 9) digit -= 9;
    }
    sum += digit;
  }
  return sum % 10 === 0;
}

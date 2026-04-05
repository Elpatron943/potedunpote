/** Libellés indicatifs des codes de domaine RGE (ex. "21", "41"). */
export const RGE_DOMAINE_LABELS: Record<string, string> = {
  "1": "Audits énergétiques",
  "2": "Études thermiques réglementaires",
  "11": "Monuments historiques (travaux spécifiques)",
  "12": "Installations de génération électrique (ENR)",
  "13": "Rénovation lourde / globale",
  "14": "Rénovation d’ampleur",
  "15": "Accompagnement rénovation",
  "16": "Contrôle des installations",
  "17": "Ingénierie / maîtrise d’œuvre",
  "18": "Autres qualifications liées à la rénovation",
  "21": "Chauffage, climatisation et eau chaude (équipements performants)",
  "22": "Eau chaude sanitaire (solaire thermique, etc.)",
  "23": "Ventilation mécanique",
  "24": "Pompes à chaleur (autres cas)",
  "31": "Menuiseries extérieures isolantes",
  "32": "Volets / brise-soleil",
  "41": "Isolation des combles / toitures",
  "42": "Isolation des murs par l’intérieur",
  "43": "Isolation thermique par l’extérieur (ITE)",
  "44": "Isolation des planchers bas",
  "45": "Isolation des toitures terrasses",
  "51": "Énergies renouvelables (autres)",
  "61": "Réseaux de chaleur / froid",
};

export function formatRgeDomaineCode(code: string): { code: string; label: string } {
  const trimmed = code.trim();
  const label = RGE_DOMAINE_LABELS[trimmed] ?? "Domaine RGE (libellé non répertorié en local)";
  return { code: trimmed, label };
}

import type { BtpPriceUnit } from "@/lib/btp-price-unit";

/**
 * Unité de prix par id de spécialité (`BtpPrestation.id` / `Specialite.id`).
 * Règles : m² (surfaces, revêtements, isolation plane…), ml (linéaire : gouttières, clôtures, plinthes…),
 * m³ (terrassement, gros béton volumique…), unité (fenêtre, porte, point, carottage…), forfait (ensemble défini).
 */
export const BTP_PRESTATION_PRICE_UNIT: Record<string, BtpPriceUnit> = {
  // Plomberie
  "sd-bain-complete": "FORFAIT",
  "douche-baignoire": "FORFAIT",
  "wc-suspendu-broyeur": "UNIT",
  "evier-lave-vaisselle": "FORFAIT",
  robinetterie: "UNIT",
  "fuites-recherche": "FORFAIT",
  "canalisation-engorgee": "FORFAIT",
  "ballon-ecs": "UNIT",
  "chauffage-emitters": "UNIT",
  "plan-chauffage-pac": "M2",
  "adoucisseur-filtre": "UNIT",
  "vmc-piquage": "FORFAIT",

  // Électricité
  "mise-normes-tableau": "FORFAIT",
  "nouveau-tableau": "FORFAIT",
  "prises-interrupteurs": "UNIT",
  "eclairage-encastre": "UNIT",
  "depannage-pannes": "FORFAIT",
  "installation-neuf": "FORFAIT",
  "renovation-secondaire": "FORFAIT",
  domotique: "FORFAIT",
  "borne-recharge": "UNIT",
  "mise-terre-liaison": "FORFAIT",
  "courant-faible": "FORFAIT",

  // Maçonnerie
  "extension-gros-oeuvre": "M3",
  "murs-clotures": "ML",
  "ouvertures-baies": "UNIT",
  "dalle-chape": "M2",
  "terrasse-exterieure": "M2",
  "reprises-fissures": "ML",
  "enduits-facade": "M2",
  "escaliers-beton": "UNIT",

  // Menuiserie
  "fenetres-pvc-bois-alu": "UNIT",
  "portes-entree": "UNIT",
  "portes-interieures": "UNIT",
  volets: "UNIT",
  "garde-corps": "ML",
  "cuisine-meuble": "FORFAIT",
  "placards-dressing": "FORFAIT",
  "parquet-stratifie": "M2",
  "lambourdes-ossature-bois": "M2",

  // Peinture
  "peinture-interieure": "M2",
  "peinture-facade": "M2",
  "vitrerie-simple": "M2",
  "papier-peint-toile": "M2",
  "preparation-supports": "M2",
  "laques-batiments": "M2",

  // Carrelage
  "carrelage-sdb": "M2",
  "carrelage-cuisine": "M2",
  "carrelage-sol-sejour": "M2",
  "carrelage-exterieur": "M2",
  "mosaique-faience": "M2",
  "chape-ragreage": "M2",
  "joints-hydrofuge": "M2",

  // Plâtrerie
  "cloisons-ba13": "M2",
  "doublages-isolation": "M2",
  "faux-plafonds": "M2",
  "enduits-lisses": "M2",
  "trous-ouvertures": "FORFAIT",
  "corniches-decor": "ML",

  // Couverture
  "tuiles-ardoises": "M2",
  "etancheite-toiture": "M2",
  zinguerie: "ML",
  "velux-fenetres-toit": "UNIT",
  "isolation-combles": "M2",
  "demoussage-hydrofuge": "M2",
  "charpente-legere-reparation": "FORFAIT",

  // Démolition / terrassement
  "demolition-maison": "FORFAIT",
  "demolition-interieure": "M2",
  "terrassement-tranchee": "M3",
  "evacuation-dechets": "FORFAIT",
  "curage-locaux": "M2",
  "sciage-carottage": "UNIT",

  // Autres BTP
  "second-oeuvre-divers": "FORFAIT",
  "etancheite-sou-sol": "M2",
  "isolation-acoustique": "M2",
  "nettoyage-haute-pression": "M2",
  "autre-sur-devis": "FORFAIT",
};

export function priceUnitForPrestationId(id: string): BtpPriceUnit {
  return BTP_PRESTATION_PRICE_UNIT[id] ?? "FORFAIT";
}

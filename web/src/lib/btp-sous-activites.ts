/**
 * Sous-activités affichables sur la fiche Pro (cases à cocher par famille métier).
 * Les `id` sont stables pour persistance (ex. en JSON côté ArtisanProfile).
 */

import { BTP_METIERS } from "@/lib/btp-metiers";

export type SousActivite = { id: string; label: string };

/** Liste par identifiant métier (aligné sur `BTP_METIERS` / recherche). */
export const BTP_SOUS_ACTIVITES: Record<string, SousActivite[]> = {
  plomberie: [
    { id: "sd-bain-complete", label: "Salle de bain complète (création / rénovation)" },
    { id: "douche-baignoire", label: "Douche, baignoire, receveur, paroi" },
    { id: "wc-suspendu-broyeur", label: "WC, WC suspendu, broyeur sanitaire" },
    { id: "evier-lave-vaisselle", label: "Évier cuisine, lave-vaisselle, raccordements" },
    { id: "robinetterie", label: "Robinetterie (remplacement, mitigeur, mélangeur)" },
    { id: "fuites-recherche", label: "Fuites — recherche et réparation" },
    { id: "canalisation-engorgee", label: "Canalisations engorgées / débouchage" },
    { id: "ballon-ecs", label: "Ballon d’eau chaude, cumulus, surcumulateur" },
    { id: "chauffage-emitters", label: "Radiateurs, sèche-serviettes, robinets thermostatiques" },
    { id: "plan-chauffage-pac", label: "Raccordements pompe à chaleur / plancher chauffant (hydraulique)" },
    { id: "adoucisseur-filtre", label: "Adoucisseur, filtration, traitement d’eau" },
    { id: "vmc-piquage", label: "Piquages VMC / extracteurs (eau usées liées à l’équipement)" },
  ],
  electricite: [
    { id: "mise-normes-tableau", label: "Mise aux normes du tableau électrique" },
    { id: "nouveau-tableau", label: "Nouveau tableau / réagencement des circuits" },
    { id: "prises-interrupteurs", label: "Prises, interrupteurs, points lumineux" },
    { id: "eclairage-encastre", label: "Spots, rails, éclairage LED intérieur / extérieur" },
    { id: "depannage-pannes", label: "Dépannage, recherche de panne" },
    { id: "installation-neuf", label: "Installation neuve (logement, extension)" },
    { id: "renovation-secondaire", label: "Rénovation tertiaire / locaux pros" },
    { id: "domotique", label: "Domotique, volets roulants électriques, programmation" },
    { id: "borne-recharge", label: "Borne de recharge véhicule électrique" },
    { id: "mise-terre-liaison", label: "Mise à la terre, liaisons équipotentielles" },
    { id: "courant-faible", label: "Courant faible (RJ45, antenne, interphone basique)" },
  ],
  maconnerie: [
    { id: "extension-gros-oeuvre", label: "Extension, surélévation — gros œuvre" },
    { id: "murs-clotures", label: "Murs, clôtures, murets, soubassements" },
    { id: "ouvertures-baies", label: "Ouverture / création de baies, linteaux" },
    { id: "dalle-chape", label: "Dalle béton, chape" },
    { id: "terrasse-exterieure", label: "Terrasse portée, plots, maçonnerie extérieure" },
    { id: "reprises-fissures", label: "Reprises de fissures, scellements" },
    { id: "enduits-facade", label: "Enduits façade / reprises maçonnage" },
    { id: "escaliers-beton", label: "Escaliers béton, rampes d’accès" },
  ],
  menuiserie: [
    { id: "fenetres-pvc-bois-alu", label: "Fenêtres PVC, bois, alu — pose / remplacement" },
    { id: "portes-entree", label: "Portes d’entrée, portes blindées" },
    { id: "portes-interieures", label: "Portes intérieures, portes coulissantes" },
    { id: "volets", label: "Volets roulants, battants, persiennes" },
    { id: "garde-corps", label: "Garde-corps, tringles rideaux intégrées (menuiserie)" },
    { id: "cuisine-meuble", label: "Pose cuisine équipée (meubles, plans de travail bois)" },
    { id: "placards-dressing", label: "Placards, dressings sur mesure" },
    { id: "parquet-stratifie", label: "Parquet, stratifié, lame PVC clipsée" },
    { id: "lambourdes-ossature-bois", label: "Ossature bois légère, lambourdes (hors charpente lourde)" },
  ],
  peinture: [
    { id: "peinture-interieure", label: "Peinture intérieure murs / plafonds / boiseries" },
    { id: "peinture-facade", label: "Peinture façade, ravalement léger" },
    { id: "vitrerie-simple", label: "Vitrerie simple (petits carreaux, doubles vitrages accessibles)" },
    { id: "papier-peint-toile", label: "Papier peint, toile de verre, revêtements muraux" },
    { id: "preparation-supports", label: "Préparation des supports (rebouchage, ponçage)" },
    { id: "laques-batiments", label: "Laques, peintures sols (locaux secs)" },
  ],
  carrelage: [
    { id: "carrelage-sdb", label: "Carrelage salle de bain, douche à l’italienne" },
    { id: "carrelage-cuisine", label: "Carrelage cuisine, crédence" },
    { id: "carrelage-sol-sejour", label: "Carrelage sol séjour, entrée, couloir" },
    { id: "carrelage-exterieur", label: "Carrelage / grès cérame extérieur, terrasse" },
    { id: "mosaique-faience", label: "Faïence, mosaïque, bordures" },
    { id: "chape-ragreage", label: "Chape, ragréage avant pose" },
    { id: "joints-hydrofuge", label: "Joints hydrofuges, traitement des angles" },
  ],
  platrerie: [
    { id: "cloisons-ba13", label: "Cloisons en plaques de plâtre (BA13)" },
    { id: "doublages-isolation", label: "Doublages collés / sur ossature + isolation" },
    { id: "faux-plafonds", label: "Faux plafonds suspendus, dalles acoustiques" },
    { id: "enduits-lisses", label: "Enduits lissés, bandes à joints" },
    { id: "trous-ouvertures", label: "Reprises après ouvertures, trous, saignées" },
    { id: "corniches-decor", label: "Corniches, éléments décoratifs plâtre / staff (léger)" },
  ],
  couverture: [
    { id: "tuiles-ardoises", label: "Tuiles, ardoises — pose et réparation" },
    { id: "etancheite-toiture", label: "Étanchéité toiture-terrasse, relevés" },
    { id: "zinguerie", label: "Zinguerie, gouttières, chéneaux, descentes" },
    { id: "velux-fenetres-toit", label: "Fenêtres de toit, Velux — entourage" },
    { id: "isolation-combles", label: "Isolation de combles (soufflage, rouleaux, panneaux)" },
    { id: "demoussage-hydrofuge", label: "Démoussage, traitement hydrofuge toiture" },
    { id: "charpente-legere-reparation", label: "Petites réparations charpente accessible (liteaux, voliges)" },
  ],
  demolition: [
    { id: "demolition-maison", label: "Démolition maison / bâtiment léger" },
    { id: "demolition-interieure", label: "Dépose cloisons, sanitaires, cuisines" },
    { id: "terrassement-tranchee", label: "Terrassement, tranchées, fouilles" },
    { id: "evacuation-dechets", label: "Évacuation gravats, bennes, tri" },
    { id: "curage-locaux", label: "Curage de locaux, débarras chantier" },
    { id: "sciage-carottage", label: "Sciage, carottage (accès sous-traitance possible)" },
  ],
  "autres-btp": [
    { id: "second-oeuvre-divers", label: "Second œuvre divers (pose accessoires, petits travaux)" },
    { id: "etancheite-sou-sol", label: "Étanchéité sous-sol, cuvelage léger" },
    { id: "isolation-acoustique", label: "Isolation acoustique ponctuelle (complément)" },
    { id: "nettoyage-haute-pression", label: "Nettoyage façade / toiture haute pression" },
    { id: "autre-sur-devis", label: "Autre — précisé au devis" },
  ],
};

export function getSousActivitesForMetier(metierId: string): SousActivite[] {
  return BTP_SOUS_ACTIVITES[metierId] ?? [];
}

/** Garde uniquement les ids connus pour ce métier (URL / query). */
export function filterSousActiviteIdsForMetier(metierId: string, ids: string[]): string[] {
  const allowed = new Set(getSousActivitesForMetier(metierId).map((a) => a.id));
  return [...new Set(ids.filter((id) => allowed.has(id)))];
}

export function isValidPrestationPair(metierId: string, activiteId: string): boolean {
  return getSousActivitesForMetier(metierId).some((a) => a.id === activiteId);
}

export function getPrestationActiviteLabel(metierId: string, activiteId: string): string | null {
  return getSousActivitesForMetier(metierId).find((a) => a.id === activiteId)?.label ?? null;
}

export function getAllMetiersWithActivites(): {
  metierId: string;
  label: string;
  items: SousActivite[];
}[] {
  return BTP_METIERS.map((m) => ({
    metierId: m.id,
    label: m.label,
    items: getSousActivitesForMetier(m.id),
  }));
}

/**
 * Prestations pour lesquelles un montant « au m² » est courant (surface de chantier saisie par le client).
 */
const SURFACE_PRICED_ACTIVITE_IDS = new Set<string>([
  // Plomberie / chauffage
  "sd-bain-complete",
  "plan-chauffage-pac",
  // Maçonnerie
  "extension-gros-oeuvre",
  "murs-clotures",
  "dalle-chape",
  "terrasse-exterieure",
  "enduits-facade",
  // Menuiserie / sols
  "fenetres-pvc-bois-alu",
  "parquet-stratifie",
  "placards-dressing",
  // Peinture / revêtements murs
  "peinture-interieure",
  "peinture-facade",
  "vitrerie-simple",
  "papier-peint-toile",
  "preparation-supports",
  "laques-batiments",
  // Carrelage
  "carrelage-sdb",
  "carrelage-cuisine",
  "carrelage-sol-sejour",
  "carrelage-exterieur",
  "mosaique-faience",
  "chape-ragreage",
  "joints-hydrofuge",
  // Plâtrerie
  "cloisons-ba13",
  "doublages-isolation",
  "faux-plafonds",
  "enduits-lisses",
  "trous-ouvertures",
  "corniches-decor",
  // Couverture / toiture
  "tuiles-ardoises",
  "etancheite-toiture",
  "isolation-combles",
  "demoussage-hydrofuge",
  // Démolition / terrassement
  "demolition-maison",
  "demolition-interieure",
  "terrassement-tranchee",
  // Autres
  "etancheite-sou-sol",
  "isolation-acoustique",
  "nettoyage-haute-pression",
]);

export function isPrestationPricedBySurface(metierId: string, activiteId: string): boolean {
  if (!isValidPrestationPair(metierId, activiteId)) return false;
  return SURFACE_PRICED_ACTIVITE_IDS.has(activiteId);
}

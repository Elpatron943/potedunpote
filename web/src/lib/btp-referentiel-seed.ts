/**
 * Copie de secours du référentiel BTP (alignée sur la migration SQL Supabase).
 * Utilisée si la base est vide ou injoignable.
 *
 * Chaque prestation est dédoublée : remplacement / réfection sur l’existant vs nouvelle installation / création.
 */
import type { BtpMetier } from "./btp-referentiel-types";

type SeedSousActiviteRow = { id: string; label: string };

const S_REM =
  " — remplacement / réfection sur l’existant";
const S_NEUF = " — nouvelle installation / création";

function pair(id: string, label: string): SeedSousActiviteRow[] {
  return [
    { id: `${id}-remplacement`, label: `${label}${S_REM}` },
    { id: `${id}-neuf`, label: `${label}${S_NEUF}` },
  ];
}

export const SEED_BTP_METIERS: BtpMetier[] = [
  { id: "plomberie", label: "Plomberie & chauffage", codeNaf: "43.22A,43.22B" },
  { id: "electricite", label: "Électricité (installations)", codeNaf: "43.21A" },
  { id: "maconnerie", label: "Maçonnerie & gros œuvre", codeNaf: "43.99A" },
  { id: "menuiserie", label: "Menuiserie, bois & PVC", codeNaf: "43.32A" },
  { id: "peinture", label: "Peinture & vitrerie", codeNaf: "43.34Z" },
  { id: "carrelage", label: "Carrelage & revêtements sols/murs", codeNaf: "43.33Z" },
  { id: "platrerie", label: "Plâtrerie & plaques de plâtre", codeNaf: "43.31Z" },
  { id: "couverture", label: "Couverture & étanchéité toiture", codeNaf: "43.91A,43.91B" },
  { id: "demolition", label: "Démolition & terrassement", codeNaf: "43.11Z,43.12A,43.12B" },
  { id: "autres-btp", label: "Autres travaux spécialisés BTP", codeNaf: "43.99C" },
];

export const SEED_BTP_SOUS_ACTIVITES: Record<string, SeedSousActiviteRow[]> = {
  plomberie: [
    ...pair("sd-bain-complete", "Salle de bain complète (création / rénovation)"),
    ...pair("douche-baignoire", "Douche, baignoire, receveur, paroi"),
    ...pair("wc-suspendu-broyeur", "WC, WC suspendu, broyeur sanitaire"),
    ...pair("evier-lave-vaisselle", "Évier cuisine, lave-vaisselle, raccordements"),
    ...pair("robinetterie", "Robinetterie (mitigeur, mélangeur, colonne)"),
    ...pair("fuites-recherche", "Fuites — recherche et réparation"),
    ...pair("canalisation-engorgee", "Canalisations engorgées / débouchage"),
    ...pair("ballon-ecs", "Ballon d’eau chaude, cumulus, surcumulateur"),
    ...pair("chauffage-emitters", "Radiateurs, sèche-serviettes, robinets thermostatiques"),
    ...pair("plan-chauffage-pac", "Raccordements pompe à chaleur / plancher chauffant (hydraulique)"),
    ...pair("adoucisseur-filtre", "Adoucisseur, filtration, traitement d’eau"),
    ...pair("vmc-piquage", "Piquages VMC / extracteurs (eau usées liées à l’équipement)"),
  ],
  electricite: [
    ...pair("mise-normes-tableau", "Mise aux normes du tableau électrique"),
    ...pair("nouveau-tableau", "Nouveau tableau / réagencement des circuits"),
    ...pair("prises-interrupteurs", "Prises, interrupteurs, points lumineux"),
    ...pair("eclairage-encastre", "Spots, rails, éclairage LED intérieur / extérieur"),
    ...pair("depannage-pannes", "Dépannage, recherche de panne"),
    ...pair("installation-neuf", "Installation électrique (logement, extension)"),
    ...pair("renovation-secondaire", "Rénovation tertiaire / locaux pros"),
    ...pair("domotique", "Domotique, volets roulants électriques, programmation"),
    ...pair("borne-recharge", "Borne de recharge véhicule électrique"),
    ...pair("mise-terre-liaison", "Mise à la terre, liaisons équipotentielles"),
    ...pair("courant-faible", "Courant faible (RJ45, antenne, interphone basique)"),
  ],
  maconnerie: [
    ...pair("extension-gros-oeuvre", "Extension, surélévation — gros œuvre"),
    ...pair("murs-clotures", "Murs, clôtures, murets, soubassements"),
    ...pair("ouvertures-baies", "Ouverture / création de baies, linteaux"),
    ...pair("dalle-chape", "Dalle béton, chape"),
    ...pair("terrasse-exterieure", "Terrasse portée, plots, maçonnerie extérieure"),
    ...pair("reprises-fissures", "Reprises de fissures, scellements"),
    ...pair("enduits-facade", "Enduits façade / reprises maçonnage"),
    ...pair("escaliers-beton", "Escaliers béton, rampes d’accès"),
  ],
  menuiserie: [
    ...pair("fenetres-pvc-bois-alu", "Fenêtres PVC, bois, alu"),
    ...pair("portes-entree", "Portes d’entrée, portes blindées"),
    ...pair("portes-interieures", "Portes intérieures, portes coulissantes"),
    ...pair("volets", "Volets roulants, battants, persiennes"),
    ...pair("garde-corps", "Garde-corps, tringles rideaux intégrées (menuiserie)"),
    ...pair("cuisine-meuble", "Pose cuisine équipée (meubles, plans de travail bois)"),
    ...pair("placards-dressing", "Placards, dressings sur mesure"),
    ...pair("parquet-stratifie", "Parquet, stratifié, lame PVC clipsée"),
    ...pair("lambourdes-ossature-bois", "Ossature bois légère, lambourdes (hors charpente lourde)"),
  ],
  peinture: [
    ...pair("peinture-interieure", "Peinture intérieure murs / plafonds / boiseries"),
    ...pair("peinture-facade", "Peinture façade, ravalement léger"),
    ...pair("vitrerie-simple", "Vitrerie simple (petits carreaux, doubles vitrages accessibles)"),
    ...pair("papier-peint-toile", "Papier peint, toile de verre, revêtements muraux"),
    ...pair("preparation-supports", "Préparation des supports (rebouchage, ponçage)"),
    ...pair("laques-batiments", "Laques, peintures sols (locaux secs)"),
  ],
  carrelage: [
    ...pair("carrelage-sdb", "Carrelage salle de bain, douche à l’italienne"),
    ...pair("carrelage-cuisine", "Carrelage cuisine, crédence"),
    ...pair("carrelage-sol-sejour", "Carrelage sol séjour, entrée, couloir"),
    ...pair("carrelage-exterieur", "Carrelage / grès cérame extérieur, terrasse"),
    ...pair("mosaique-faience", "Faïence, mosaïque, bordures"),
    ...pair("chape-ragreage", "Chape, ragréage avant pose"),
    ...pair("joints-hydrofuge", "Joints hydrofuges, traitement des angles"),
  ],
  platrerie: [
    ...pair("cloisons-ba13", "Cloisons en plaques de plâtre (BA13)"),
    ...pair("doublages-isolation", "Doublages collés / sur ossature + isolation"),
    ...pair("faux-plafonds", "Faux plafonds suspendus, dalles acoustiques"),
    ...pair("enduits-lisses", "Enduits lissés, bandes à joints"),
    ...pair("trous-ouvertures", "Reprises après ouvertures, trous, saignées"),
    ...pair("corniches-decor", "Corniches, éléments décoratifs plâtre / staff (léger)"),
  ],
  couverture: [
    ...pair("tuiles-ardoises", "Tuiles, ardoises — pose et réparation"),
    ...pair("etancheite-toiture", "Étanchéité toiture-terrasse, relevés"),
    ...pair("zinguerie", "Zinguerie, gouttières, chéneaux, descentes"),
    ...pair("velux-fenetres-toit", "Fenêtres de toit, Velux — entourage"),
    ...pair("isolation-combles", "Isolation de combles (soufflage, rouleaux, panneaux)"),
    ...pair("demoussage-hydrofuge", "Démoussage, traitement hydrofuge toiture"),
    ...pair("charpente-legere-reparation", "Petites réparations charpente accessible (liteaux, voliges)"),
  ],
  demolition: [
    ...pair("demolition-maison", "Démolition maison / bâtiment léger"),
    ...pair("demolition-interieure", "Dépose cloisons, sanitaires, cuisines"),
    ...pair("terrassement-tranchee", "Terrassement, tranchées, fouilles"),
    ...pair("evacuation-dechets", "Évacuation gravats, bennes, tri"),
    ...pair("curage-locaux", "Curage de locaux, débarras chantier"),
    ...pair("sciage-carottage", "Sciage, carottage (accès sous-traitance possible)"),
  ],
  "autres-btp": [
    ...pair("second-oeuvre-divers", "Second œuvre divers (pose accessoires, petits travaux)"),
    ...pair("etancheite-sou-sol", "Étanchéité sous-sol, cuvelage léger"),
    ...pair("isolation-acoustique", "Isolation acoustique ponctuelle (complément)"),
    ...pair("nettoyage-haute-pression", "Nettoyage façade / toiture haute pression"),
    ...pair("autre-sur-devis", "Autre — précisé au devis"),
  ],
};

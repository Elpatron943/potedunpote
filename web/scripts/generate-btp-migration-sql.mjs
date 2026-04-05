/**
 * Génère les INSERT pour BtpPrestation à partir des structures en dur
 * (alignées sur btp-sous-activites.ts et SURFACE_PRICED_ACTIVITE_IDS).
 * Usage : node scripts/generate-btp-migration-sql.mjs
 */
import { writeFileSync } from "fs";
import { fileURLToPath } from "url";
import { dirname, join } from "path";

const __dirname = dirname(fileURLToPath(import.meta.url));

const BTP_SOUS_ACTIVITES = {
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

const SURFACE_PRICED = new Set([
  "sd-bain-complete",
  "plan-chauffage-pac",
  "extension-gros-oeuvre",
  "murs-clotures",
  "dalle-chape",
  "terrasse-exterieure",
  "enduits-facade",
  "fenetres-pvc-bois-alu",
  "parquet-stratifie",
  "placards-dressing",
  "peinture-interieure",
  "peinture-facade",
  "vitrerie-simple",
  "papier-peint-toile",
  "preparation-supports",
  "laques-batiments",
  "carrelage-sdb",
  "carrelage-cuisine",
  "carrelage-sol-sejour",
  "carrelage-exterieur",
  "mosaique-faience",
  "chape-ragreage",
  "joints-hydrofuge",
  "cloisons-ba13",
  "doublages-isolation",
  "faux-plafonds",
  "enduits-lisses",
  "trous-ouvertures",
  "corniches-decor",
  "tuiles-ardoises",
  "etancheite-toiture",
  "isolation-combles",
  "demoussage-hydrofuge",
  "demolition-maison",
  "demolition-interieure",
  "terrassement-tranchee",
  "etancheite-sou-sol",
  "isolation-acoustique",
  "nettoyage-haute-pression",
]);

function esc(s) {
  return s.replace(/'/g, "''");
}

const lines = [];
lines.push('-- Fragment généré pour BtpPrestation (à coller dans migration.sql si besoin)');
lines.push('');

for (const [metierId, items] of Object.entries(BTP_SOUS_ACTIVITES)) {
  items.forEach((item, idx) => {
    const priced = SURFACE_PRICED.has(item.id) ? "true" : "false";
    lines.push(
      `  ('${esc(item.id)}', '${esc(metierId)}', '${esc(item.label)}', ${priced}, ${idx}),`,
    );
  });
}

const out = join(__dirname, "..", "prisma", "migrations", "_generated_btp_prestations.sql.txt");
writeFileSync(out, lines.join("\n"), "utf8");
console.log("Wrote", out);

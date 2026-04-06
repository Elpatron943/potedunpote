/**
 * Parcours DIY en QCM (9 niveaux après nature + corps de métier).
 * Niveaux 1–2 sont gérés dans le widget (nature + liste référentiel).
 */

export type DiyProjectKind = "travaux" | "installation" | "renovation" | "reparation";

const WIZARD_LEVEL_ORDER_BASE = ["l3", "l4", "l5", "l6", "l7", "l8", "l9"] as const;
export type WizardLevelId = (typeof WIZARD_LEVEL_ORDER_BASE)[number] | "l3room" | "l3eq";

export function wizardLevelOrder(kind: DiyProjectKind): WizardLevelId[] {
  if (kind === "installation") return ["l3room", "l3eq", ...WIZARD_LEVEL_ORDER_BASE];
  return [...WIZARD_LEVEL_ORDER_BASE];
}

export type WizardOption = { id: string; label: string };

export type WizardQuestion = {
  levelId: WizardLevelId;
  sectionTitle: string;
  question: string;
  options: WizardOption[];
};

const METIER_EXTERIEUR_FORT = new Set(["couverture", "demolition"]);

function perimeterQuestionSuffix(metierId: string): string {
  if (METIER_EXTERIEUR_FORT.has(metierId)) {
    return " Ton domaine concerne souvent l’extérieur ou des ouvrages lourds : choisis la situation la plus proche.";
  }
  return "";
}

function questionL3(metierId: string): WizardQuestion {
  return {
    levelId: "l3",
    sectionTitle: "Niveau 3 — Périmètre",
    question:
      "Quel périmètre correspond le mieux à ton projet ? (pièces, surface, intérieur / extérieur, copropriété)" +
      perimeterQuestionSuffix(metierId),
    options: [
      { id: "l3-int-1", label: "Intérieur — une pièce ou petite zone (< 15 m² environ)" },
      { id: "l3-int-m", label: "Intérieur — plusieurs pièces ou volume moyen (≈ 15 à 40 m²)" },
      { id: "l3-int-l", label: "Intérieur — grand volume ou logement entier (> 40 m²)" },
      { id: "l3-ext", label: "Extérieur — façade, toiture, terrasse, clôture, cour…" },
      { id: "l3-mix", label: "Intérieur et extérieur sur le même chantier" },
      { id: "l3-copro", label: "Majoritairement parties communes (copropriété)" },
      { id: "l3-prive", label: "Privatif uniquement (maison ou appartement), sans gros parties communes" },
    ],
  };
}

function questionL3room(): WizardQuestion {
  return {
    levelId: "l3room",
    sectionTitle: "Niveau 3 — Pièce concernée",
    question: "Dans quelle zone se passe l’installation ?",
    options: [
      { id: "l3room-wc", label: "WC" },
      { id: "l3room-sdb", label: "Salle de bain / buanderie" },
      { id: "l3room-cuisine", label: "Cuisine" },
      { id: "l3room-sejour", label: "Séjour / chambre / bureau" },
      { id: "l3room-exterieur", label: "Extérieur" },
      { id: "l3room-autre", label: "Autre / plusieurs zones" },
    ],
  };
}

function equipmentOptionsForRoom(roomId: string | undefined): WizardOption[] {
  // Liste volontairement “boutons” orientée équipement, pas métier.
  // Les IDs servent de clé stable (dédup, contexte IA).
  if (roomId === "l3room-wc") {
    return [
      { id: "l3eq-chasse", label: "Chasse d’eau / mécanisme WC" },
      { id: "l3eq-wc", label: "WC complet (pose / remplacement)" },
      { id: "l3eq-lave-mains", label: "Lave-mains / petit lavabo" },
      { id: "l3eq-accessoire", label: "Accessoire (abattant, bâti, fixation…)" },
      { id: "l3eq-autre", label: "Autre / je ne sais pas" },
    ];
  }
  if (roomId === "l3room-sdb") {
    return [
      { id: "l3eq-douche", label: "Douche / colonne / paroi" },
      { id: "l3eq-baignoire", label: "Baignoire" },
      { id: "l3eq-vasque", label: "Meuble vasque / lavabo" },
      { id: "l3eq-robinet", label: "Robinetterie (mitigeur, douchette…)" },
      { id: "l3eq-seche-serviette", label: "Sèche-serviettes" },
      { id: "l3eq-vmc", label: "VMC / extraction" },
      { id: "l3eq-autre", label: "Autre / je ne sais pas" },
    ];
  }
  if (roomId === "l3room-cuisine") {
    return [
      { id: "l3eq-evier", label: "Évier / siphon / évacuation" },
      { id: "l3eq-robinet", label: "Robinetterie cuisine" },
      { id: "l3eq-hotte", label: "Hotte / extraction" },
      { id: "l3eq-lv", label: "Lave-vaisselle (raccordement / pose)" },
      { id: "l3eq-plaques", label: "Plaque / four (pose / raccordement)" },
      { id: "l3eq-autre", label: "Autre / je ne sais pas" },
    ];
  }
  if (roomId === "l3room-sejour") {
    return [
      { id: "l3eq-luminaire", label: "Luminaire / plafonnier / applique" },
      { id: "l3eq-prise", label: "Prise / interrupteur / petite élect. (hors tableau)" },
      { id: "l3eq-radiateur", label: "Radiateur / thermostat" },
      { id: "l3eq-autre", label: "Autre / je ne sais pas" },
    ];
  }
  if (roomId === "l3room-exterieur") {
    return [
      { id: "l3eq-luminaire", label: "Luminaire extérieur" },
      { id: "l3eq-portail", label: "Portail / motorisation / gâche" },
      { id: "l3eq-prise-ext", label: "Prise extérieure / éclairage" },
      { id: "l3eq-autre", label: "Autre / je ne sais pas" },
    ];
  }
  return [
    { id: "l3eq-chasse", label: "Chasse d’eau / mécanisme WC" },
    { id: "l3eq-luminaire", label: "Luminaire / électricité légère" },
    { id: "l3eq-robinet", label: "Robinetterie / raccordement eau" },
    { id: "l3eq-radiateur", label: "Radiateur / thermostat" },
    { id: "l3eq-autre", label: "Autre / je ne sais pas" },
  ];
}

function questionL3eq(roomId: string | undefined): WizardQuestion {
  return {
    levelId: "l3eq",
    sectionTitle: "Niveau 3 — Équipement à installer",
    question:
      "Quel équipement veux-tu installer ? (la liste dépend de la pièce choisie)",
    options: equipmentOptionsForRoom(roomId),
  };
}

function questionL4(kind: DiyProjectKind): WizardQuestion {
  if (kind === "installation") {
    return {
      levelId: "l4",
      sectionTitle: "Niveau 4 — Contraintes techniques (support & contexte)",
      question: "Comment décrirais-tu le support et le contexte avant de poser ou de raccorder ?",
      options: [
        { id: "l4i-nu", label: "Support nu ou à créer (neuf, dalle, ossature, cloison à monter…)" },
        { id: "l4i-stable", label: "Support existant sain, prêt à recevoir une pose ou un recouvrement" },
        { id: "l4i-mix", label: "Mix selon les zones (certaines nues, d’autres à reprendre)" },
        { id: "l4i-unknown", label: "Je ne maîtrise pas encore l’état des supports" },
      ],
    };
  }
  if (kind === "reparation") {
    return {
      levelId: "l4",
      sectionTitle: "Niveau 4 — Nature de la réparation",
      question: "Qu’est-ce qui caractérise le mieux ton besoin de réparation ou de dépannage ?",
      options: [
        { id: "l4p-local", label: "Panne ou casse localisée (un équipement, une zone précise)" },
        { id: "l4p-leak", label: "Fuite, humidité ou étanchéité à traiter" },
        { id: "l4p-degrade", label: "Usure ou dégradation progressive sans urgence immédiate" },
        { id: "l4p-multi", label: "Plusieurs défauts ou postes sur le même logement" },
        { id: "l4p-doubt", label: "Cause ou périmètre encore flous — diagnostic à préciser avant d’agir" },
      ],
    };
  }
  return {
    levelId: "l4",
    sectionTitle: "Niveau 4 — Contraintes techniques (bâti & risques)",
    question: "Quel est l’état du bâti existant et les points de vigilance ?",
    options: [
      { id: "l4r-sain", label: "Globalement sain — surtout finitions, équipements ou esthétique" },
      { id: "l4r-leger", label: "Désordres légers (fissures, joints, traces d’humidité localisées)" },
      { id: "l4r-fort", label: "Désordres marqués ou doute sur la structure / l’étanchéité" },
      { id: "l4r-ancien", label: "Bâtiment ancien — anticiper plomb, amiante ou mises aux normes" },
      { id: "l4r-unknown", label: "État global inconnu — diagnostic ou avis pro à prévoir" },
    ],
  };
}

const Q_L5: WizardQuestion = {
  levelId: "l5",
  sectionTitle: "Niveau 5 — Matériaux",
  question: "Où en sont les matériaux et quelle approche qualité / budget ?",
  options: [
    { id: "l5-deja-std", label: "Déjà achetés — entrée de gamme / standard" },
    { id: "l5-deja-mid", label: "Déjà achetés — milieu ou premium, specs déjà définies" },
    { id: "l5-src-eco", label: "À sourcer — priorité éco et budget contenu" },
    { id: "l5-src-mid", label: "À sourcer — bon rapport qualité-prix, compatible chantier classique" },
    { id: "l5-src-tech", label: "À sourcer — forte contrainte technique (normes, compatibilité chauffant, etc.)" },
    { id: "l5-recup", label: "Intégrer au maximum récupération, réemploi ou matériaux déjà sur place" },
  ],
};

const Q_L6: WizardQuestion = {
  levelId: "l6",
  sectionTitle: "Niveau 6 — Outillage & logistique",
  question: "Quel outillage et quels moyens lourds peux-tu mobiliser ?",
  options: [
    { id: "l6-base", label: "Outillage grand public classique (perceuse, mètre, scie, niveau…)" },
    { id: "l6-btp", label: "Outillage plus poussé déjà dispo (meuleuse, scie circulaire, aspirateur à poussières…)" },
    { id: "l6-loc-petit", label: "Location possible (petit échafaudage, aspirateur industriel, outil spécifique)" },
    { id: "l6-loc-gros", label: "Location engins, benne, nacelle ou accès difficile à compenser" },
    { id: "l6-peu", label: "Peu d’outils sur place — achats ou locations à prévoir en grande partie" },
  ],
};

function questionL7(kind: DiyProjectKind): WizardQuestion {
  const coproNote =
    kind === "renovation"
      ? " (souvent plus sensible en rénovation)"
      : kind === "reparation"
        ? " (sinistre, garantie, assurance ou copropriété peuvent s’appliquer)"
        : "";
  return {
    levelId: "l7",
    sectionTitle: "Niveau 7 — Contexte réglementaire",
    question: `Quelles démarches ou cadres identifie-tu déjà ?${coproNote}`,
    options: [
      { id: "l7-simple", label: "Travaux courants — pas de démarche lourde identifiée" },
      { id: "l7-dp", label: "Déclaration préalable, permis ou autorisations à prévoir / en cours" },
      { id: "l7-copro-ok", label: "Copropriété — cadre ou accord déjà clair pour ce type de travaux" },
      { id: "l7-copro-non", label: "Copropriété — pas encore d’accord formalisé (AG, syndic…)" },
      { id: "l7-abf", label: "Zone ou bâtiment protégé (ABF, monument, PLU strict…)" },
      { id: "l7-maison", label: "Maison ou terrain individuel — cadre habituel sans particularité identifiée" },
    ],
  };
}

const Q_L8: WizardQuestion = {
  levelId: "l8",
  sectionTitle: "Niveau 8 — Budget & calendrier",
  question: "Quelle enveloppe et quel calendrier te correspondent le mieux (indicatif) ?",
  options: [
    { id: "l8-low-flex", label: "Budget serré — délai flexible" },
    { id: "l8-low-fast", label: "Budget serré — besoin d’avancer vite" },
    { id: "l8-mid-flex", label: "Budget confortable — délai souple" },
    { id: "l8-mid-fast", label: "Budget confortable — échéance ou occupation à gérer" },
    { id: "l8-high", label: "Large enveloppe — planification longue acceptable" },
    { id: "l8-na", label: "Je préfère ne pas chiffrer ni dater ici" },
  ],
};

const Q_L9: WizardQuestion = {
  levelId: "l9",
  sectionTitle: "Niveau 9 — Profil & décision",
  question: "Quel est ton profil et où en est la décision d’achat / de travaux ?",
  options: [
    { id: "l9-prop-occ", label: "Propriétaire occupant" },
    { id: "l9-prop-bail", label: "Propriétaire bailleur" },
    { id: "l9-loc-ok", label: "Locataire — accord ou démarche côté bailleur en bonne voie" },
    { id: "l9-loc-nc", label: "Locataire — autorisations ou cadre à clarifier" },
    { id: "l9-pro", label: "Usage professionnel (local, commerce, bureaux…)" },
    { id: "l9-devis", label: "Au moins un devis ou une offre chiffrée en main" },
    { id: "l9-nodevis", label: "Pas encore de devis — phase d’étude ou de comparaison" },
  ],
};

export function getWizardQuestion(
  kind: DiyProjectKind,
  levelId: WizardLevelId,
  metierId: string,
  answers?: Record<string, string>,
): WizardQuestion {
  switch (levelId) {
    case "l3room":
      return questionL3room();
    case "l3eq":
      return questionL3eq(answers?.l3room);
    case "l3":
      return questionL3(metierId);
    case "l4":
      return questionL4(kind);
    case "l5":
      return Q_L5;
    case "l6":
      return Q_L6;
    case "l7":
      return questionL7(kind);
    case "l8":
      return Q_L8;
    case "l9":
      return Q_L9;
  }
}

export function isValidOptionForLevel(
  kind: DiyProjectKind,
  levelId: WizardLevelId,
  metierId: string,
  optionId: string,
  answers: Record<string, string>,
): boolean {
  const q = getWizardQuestion(kind, levelId, metierId, answers);
  return q.options.some((o) => o.id === optionId);
}

export function validateWizardAnswers(
  kind: DiyProjectKind,
  metierId: string,
  answers: Record<string, string>,
): boolean {
  // Pour "installation", on peut générer une fiche sans choisir un domaine BTP :
  // la qualification pièce + équipement remplit déjà le rôle de cadrage initial.
  if (kind !== "installation" && !metierId.trim()) return false;
  for (const levelId of wizardLevelOrder(kind)) {
    const picked = answers[levelId];
    if (typeof picked !== "string" || !picked) return false;
    if (!isValidOptionForLevel(kind, levelId, metierId, picked, answers)) return false;
  }
  return true;
}

function kindLabelFr(kind: DiyProjectKind): string {
  if (kind === "travaux") return "Travaux (création / modification — ex : cloison, mur, ouverture, maçonnerie…)";
  if (kind === "installation") return "Installation (pose / ajout d’équipement — ex : chasse d’eau, luminaire…)";
  if (kind === "renovation") return "Rénovation (reprise de l’existant)";
  return "Réparation / dépannage / remise en état";
}

export function formatWizardAnswersForPrompt(
  kind: DiyProjectKind,
  metierId: string,
  metierLabel: string,
  answers: Record<string, string>,
): string {
  const lines: string[] = [];
  lines.push(`Nature du projet : ${kindLabelFr(kind)}`);
  if (kind !== "installation") {
    lines.push(`Corps de métier (référentiel) : « ${metierLabel} » (id ${metierId})`);
  }
  for (const levelId of wizardLevelOrder(kind)) {
    const q = getWizardQuestion(kind, levelId, metierId, answers);
    const optId = answers[levelId];
    const opt = q.options.find((o) => o.id === optId);
    lines.push(`\n${q.sectionTitle}`);
    lines.push(`Question : ${q.question}`);
    lines.push(`Réponse choisie : « ${opt?.label ?? optId} »`);
  }
  return lines.join("\n");
}

export function stableWizardKey(kind: DiyProjectKind, answers: Record<string, string>): string {
  const o: Record<string, string> = {};
  for (const k of wizardLevelOrder(kind)) {
    o[k] = answers[k] ?? "";
  }
  return JSON.stringify(o);
}

/** Clé catégorie pour filtrer les articles conseils (slug `kind-…` ou metierId = kind). */
export function diyArticleCategoryKey(metierId: string, slug: string): DiyProjectKind | null {
  if (metierId === "travaux" || slug.startsWith("travaux-")) return "travaux";
  if (metierId === "installation" || slug.startsWith("installation-")) return "installation";
  if (metierId === "renovation" || slug.startsWith("renovation-")) return "renovation";
  if (metierId === "reparation" || slug.startsWith("reparation-")) return "reparation";
  return null;
}

/** Filtres affichés sur /conseils (?categorie=…) — même vocabulaire que le parcours DIY. */
export const DIY_CONSEILS_CATEGORY_FILTERS: { param: DiyProjectKind; label: string }[] = [
  { param: "travaux", label: "Travaux" },
  { param: "installation", label: "Installation" },
  { param: "renovation", label: "Rénovation" },
  { param: "reparation", label: "Réparation" },
];

/** Libellé catégorie pour la liste Conseils (slug QCM `kind-hash` ou ancienne ligne métier/prestation). */
export function diyListCategoryLabel(
  metierId: string,
  slug: string,
): "Travaux" | "Installation" | "Rénovation" | "Réparation" | null {
  const k = diyArticleCategoryKey(metierId, slug);
  if (k === "travaux") return "Travaux";
  if (k === "installation") return "Installation";
  if (k === "renovation") return "Rénovation";
  if (k === "reparation") return "Réparation";
  return null;
}

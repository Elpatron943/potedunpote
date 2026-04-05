/**
 * Parcours « réparation » en QCM : graphe conditionnel entièrement défini ici (pas de génération par l’IA).
 * Branches : précision métier (eau / élec / chauffage), parcours urgence sécurité (questions raccourcies).
 */

export type RepairWizardStepId =
  | "r1_what"
  | "r1_when"
  | "r1_symptom"
  | "r1_prior"
  | "r1b_plom"
  | "r1b_elec"
  | "r1b_chauf"
  | "r2_urgency"
  | "r2b_safety"
  | "r3_cause"
  | "r3_warranty"
  | "r3_liability"
  | "r4_parts"
  | "r4_economics"
  | "r4_diypro";

export type RepairWizardOption = { id: string; label: string };

export type RepairWizardQuestion = {
  stepId: RepairWizardStepId;
  parcoursTitle: string;
  question: string;
  options: RepairWizardOption[];
};

function domainBranchStep(r1what: string | undefined): RepairWizardStepId | null {
  if (r1what === "r1w-plom") return "r1b_plom";
  if (r1what === "r1w-elec") return "r1b_elec";
  if (r1what === "r1w-chauf") return "r1b_chauf";
  return null;
}

/** Séquence applicable selon les réponses déjà connues (les étapes après une réponse manquante ne sont pas ajoutées). */
export function expandRepairSequence(answers: Record<string, string>): RepairWizardStepId[] {
  const seq: RepairWizardStepId[] = ["r1_what", "r1_when", "r1_symptom", "r1_prior"];
  const rw = answers["r1_what"];
  const branch = domainBranchStep(rw);
  if (branch) seq.push(branch);
  seq.push("r2_urgency");
  const urg = answers["r2_urgency"];
  if (!urg) return seq;

  if (urg === "r2u-danger") {
    seq.push("r2b_safety", "r3_cause", "r4_parts", "r4_diypro");
  } else {
    seq.push("r3_cause", "r3_warranty", "r3_liability", "r4_parts", "r4_economics", "r4_diypro");
  }
  return seq;
}

/** Première étape sans réponse = question affichée. `null` si questionnaire terminé pour cette branche. */
export function getCurrentRepairStepId(answers: Record<string, string>): RepairWizardStepId | null {
  const seq = expandRepairSequence(answers);
  for (const id of seq) {
    if (!answers[id]) return id;
  }
  return null;
}

/** Supprime les clés qui ne font plus partie de la séquence (changement de branche en revenant en arrière). */
export function pruneRepairAnswers(answers: Record<string, string>): Record<string, string> {
  const seq = expandRepairSequence(answers);
  const out: Record<string, string> = {};
  for (const id of seq) {
    if (answers[id]) out[id] = answers[id];
  }
  return out;
}

/** Retire la dernière réponse donnée (ordre du parcours courant). */
export function repairWizardGoBack(answers: Record<string, string>): Record<string, string> {
  const seq = expandRepairSequence(answers);
  const answered = seq.filter((s) => answers[s]);
  if (answered.length === 0) return answers;
  const last = answered[answered.length - 1];
  const next = { ...answers };
  delete next[last];
  return pruneRepairAnswers(next);
}

function domainHint(answers: Record<string, string>): string {
  const w = answers["r1_what"];
  const labels: Record<string, string> = {
    "r1w-plom": "eau / plomberie / sanitaire",
    "r1w-elec": "électricité",
    "r1w-chauf": "chauffage / clim / ventilation",
    "r1w-menu": "menuiserie / bois",
    "r1w-gros": "gros œuvre / maçonnerie",
    "r1w-revet": "revêtements",
    "r1w-autre": "ton périmètre",
  };
  return labels[w ?? ""] ?? "ton périmètre";
}

const Q_R1_WHAT: RepairWizardQuestion = {
  stepId: "r1_what",
  parcoursTitle: "Parcours 1 — Diagnostic",
  question: "Qu’est-ce qui est concerné en priorité ?",
  options: [
    { id: "r1w-plom", label: "Eau / plomberie / sanitaire (fuite, WC, robinet, chauffe-eau…)" },
    { id: "r1w-elec", label: "Électricité / éclairage / tableau / appareil branché" },
    { id: "r1w-chauf", label: "Chauffage / climatisation / ventilation" },
    { id: "r1w-menu", label: "Menuiserie (fenêtre, porte, parquet, placard…)" },
    { id: "r1w-gros", label: "Gros œuvre / maçonnerie / structure apparente" },
    { id: "r1w-revet", label: "Revêtement (sol, mur, carrelage, peinture qui se dégrade)" },
    { id: "r1w-autre", label: "Autre ou plusieurs zones en même temps" },
  ],
};

function qR1When(answers: Record<string, string>): RepairWizardQuestion {
  return {
    stepId: "r1_when",
    parcoursTitle: "Parcours 1 — Diagnostic",
    question: `Depuis quand le problème sur ${domainHint(answers)} est-il apparu ou s’est-il aggravé ?`,
    options: [
      { id: "r1t-sudden", label: "Très soudain (quelques heures à un jour)" },
      { id: "r1t-short", label: "Depuis quelques jours" },
      { id: "r1t-weeks", label: "Depuis quelques semaines" },
      { id: "r1t-months", label: "Depuis plusieurs mois" },
      { id: "r1t-progress", label: "Dégradation progressive sur longue période" },
      { id: "r1t-unknown", label: "Je ne sais pas / difficile à dire" },
    ],
  };
}

function qR1Symptom(answers: Record<string, string>): RepairWizardQuestion {
  return {
    stepId: "r1_symptom",
    parcoursTitle: "Parcours 1 — Diagnostic",
    question: `Pour ${domainHint(answers)}, quels signes observes-tu en premier lieu ?`,
    options: [
      { id: "r1s-leak", label: "Fuite, humidité, traces d’eau" },
      { id: "r1s-noise", label: "Bruit anormal (moteur, coups, grincements…)" },
      { id: "r1s-smell", label: "Odeur (brûlé, gaz, égouts, moisi…)" },
      { id: "r1s-elec", label: "Coupure, disjonctions, étincelles, pas de courant" },
      { id: "r1s-visual", label: "Fissure, déformation, pièce cassée visible" },
      { id: "r1s-func", label: "Ne fonctionne plus / fonctionne mal sans fuite visible" },
      { id: "r1s-mix", label: "Plusieurs symptômes en même temps" },
    ],
  };
}

const Q_R1_PRIOR: RepairWizardQuestion = {
  stepId: "r1_prior",
  parcoursTitle: "Parcours 1 — Diagnostic",
  question: "Quelqu’un est-il déjà intervenu sur ce problème ?",
  options: [
    { id: "r1p-no", label: "Non, première prise en charge" },
    { id: "r1p-self", label: "Oui — moi-même (bricolage)" },
    { id: "r1p-pro", label: "Oui — un professionnel" },
    { id: "r1p-sav", label: "Oui — SAV fabricant / installateur d’origine" },
    { id: "r1p-other", label: "Oui — proche / voisin / autre non pro" },
    { id: "r1p-twice", label: "Plusieurs interventions successives" },
  ],
};

const Q_R1B_PLOM: RepairWizardQuestion = {
  stepId: "r1b_plom",
  parcoursTitle: "Parcours 1 — Précision plomberie",
  question: "Où se situe le problème en priorité ?",
  options: [
    { id: "r1bp-san", label: "Sanitaire fixe (lavabo, douche, WC, baignoire)" },
    { id: "r1bp-robin", label: "Robinetterie apparente ou flexibles" },
    { id: "r1bp-enc", label: "Réseau encastré / cloison — canalisation peu visible" },
    { id: "r1bp-ces", label: "Chauffe-eau / ballon / cumulus" },
    { id: "r1bp-eva", label: "Évacuation, canalisation bouchée ou refoulement" },
    { id: "r1bp-cherche", label: "Fuite ou humidité pas encore localisée" },
  ],
};

const Q_R1B_ELEC: RepairWizardQuestion = {
  stepId: "r1b_elec",
  parcoursTitle: "Parcours 1 — Précision électricité",
  question: "Quel volet concerne l’électricité ?",
  options: [
    { id: "r1be-tab", label: "Tableau / disjoncteur / différentiel" },
    { id: "r1be-pri", label: "Prises et circuits prises" },
    { id: "r1be-lum", label: "Éclairage" },
    { id: "r1be-gros", label: "Gros appareil branché (four, plaque, lave-linge…)" },
    { id: "r1be-part", label: "Pas de courant sur une partie du logement" },
    { id: "r1be-brule", label: "Odeur de brûlé, étincelles ou surchauffe d’un point" },
  ],
};

const Q_R1B_CHAUF: RepairWizardQuestion = {
  stepId: "r1b_chauf",
  parcoursTitle: "Parcours 1 — Précision chauffage / clim",
  question: "Sur quoi porte le souci ?",
  options: [
    { id: "r1bc-chaud", label: "Chaudière gaz / fioul" },
    { id: "r1bc-pac", label: "Pompe à chaleur ou climatisation" },
    { id: "r1bc-rad", label: "Radiateurs / sèche-serviettes (circuit eau)" },
    { id: "r1bc-poele", label: "Poêle / insert / conduit" },
    { id: "r1bc-vmc", label: "VMC (simple ou double flux)" },
    { id: "r1bc-reg", label: "Thermostat / régulation / sonde" },
  ],
};

const Q_R2_URGENCY: RepairWizardQuestion = {
  stepId: "r2_urgency",
  parcoursTitle: "Parcours 2 — Urgence",
  question: "Comment situes-tu la gravité et l’urgence ?",
  options: [
    {
      id: "r2u-danger",
      label:
        "Risque sécurité (eau qui court, odeur gaz, électrocution, effondrement suspect) — arrêt / coupure si possible et aide pro immédiate",
    },
    { id: "r2u-uninhab", label: "Logement inutilisable ou très dégradé (pas d’eau, pas de chauffage en hiver, etc.)" },
    { id: "r2u-partial", label: "Gêne importante mais on peut encore vivre / utiliser la pièce" },
    { id: "r2u-minor", label: "Gêne modérée — peut attendre quelques jours / semaines" },
    { id: "r2u-wait", label: "Peu gênant — pas de contrainte de délai" },
  ],
};

const Q_R2B_SAFETY: RepairWizardQuestion = {
  stepId: "r2b_safety",
  parcoursTitle: "Parcours 2 — Sécurité immédiate",
  question: "Que peux-tu ou as-tu déjà fait en priorité ? (situation la plus proche)",
  options: [
    { id: "r2bs-eau", label: "Coupure eau (générale ou robinet d’arrêt local)" },
    { id: "r2bs-elec", label: "Coupure électricité / débranchement de l’appareil concerné" },
    { id: "r2bs-aer", label: "Aération forte (fenêtres, ventilation)" },
    { id: "r2bs-eva", label: "Évacuation des personnes — ne pas rester sur place si danger majeur" },
    { id: "r2bs-na", label: "Rien de tout ça pour l’instant / situation non applicable" },
    { id: "r2bs-urg", label: "Urgences (18 / pompiers) contactées ou clairement conseillées" },
  ],
};

const R3_CAUSE_OPTIONS_NORMAL: RepairWizardOption[] = [
  { id: "r3c-wear", label: "Usure normale / vieillissement du matériel" },
  { id: "r3c-misuse", label: "Mauvaise utilisation ou choc accidentel" },
  { id: "r3c-install", label: "Défaut ou négligence à l’installation / travaux antérieurs" },
  { id: "r3c-disaster", label: "Sinistre (dégât des eaux, incendie, tempête…)" },
  { id: "r3c-unknown", label: "Je n’en sais rien / besoin d’un diagnostic" },
];

const R3_CAUSE_OPTIONS_DANGER: RepairWizardOption[] = [
  { id: "r3c-disaster", label: "Événement brutal ou accidentel récent" },
  { id: "r3c-install", label: "Défaut de pose, matériel inadapté ou dégradation liée à des travaux" },
  { id: "r3c-wear", label: "Usure ou défaut matériel sans cause évidente" },
  { id: "r3c-unknown", label: "Inconnu — priorité à la mise en sécurité et au pro" },
];

function qR3Cause(answers: Record<string, string>): RepairWizardQuestion {
  const danger = answers["r2_urgency"] === "r2u-danger";
  const leak = answers["r1_symptom"] === "r1s-leak";
  let question = "À ton avis, d’où peut venir le problème ?";
  if (danger) {
    question =
      "Sans prendre de risque : quelle piste te semble la plus vraisemblable pour orienter la suite (hors diagnostic technique) ?";
  } else if (leak && answers["r1_what"] === "r1w-plom") {
    question = "Vu l’eau / l’humidité et la plomberie, d’où penses-tu que ça peut venir ?";
  } else if (answers["r1_symptom"] === "r1s-elec" || answers["r1_what"] === "r1w-elec") {
    question = "Côté électricité, quelle origine te paraît la plus plausible (sans toucher aux installations) ?";
  }
  return {
    stepId: "r3_cause",
    parcoursTitle: danger ? "Parcours 3 — Cause (après urgence)" : "Parcours 3 — Cause probable",
    question,
    options: danger ? R3_CAUSE_OPTIONS_DANGER : R3_CAUSE_OPTIONS_NORMAL,
  };
}

const Q_R3_WARRANTY: RepairWizardQuestion = {
  stepId: "r3_warranty",
  parcoursTitle: "Parcours 3 — Cause probable",
  question: "Garantie constructeur / assurance habitation : où en es-tu ?",
  options: [
    { id: "r3w-guar", label: "Encore sous garantie (appareil neuf ou récent)" },
    { id: "r3w-ins", label: "Hors garantie mais sinistre / assurance habitation mobilisable" },
    { id: "r3w-both", label: "Garantie + assurance à croiser" },
    { id: "r3w-none", label: "Ni garantie ni sinistre déclarable identifié" },
    { id: "r3w-unsure", label: "Je ne sais pas encore" },
  ],
};

function qR3Liability(answers: Record<string, string>): RepairWizardQuestion {
  const copro =
    answers["r1_what"] === "r1w-gros" || answers["r1_prior"] === "r1p-pro"
      ? " (copro / assurance pro / décennale peuvent entrer en ligne de compte)"
      : "";
  return {
    stepId: "r3_liability",
    parcoursTitle: "Parcours 3 — Cause probable",
    question: `Dans quel cadre responsable te situes-tu ?${copro}`,
    options: [
      { id: "r3l-owner", label: "Propriétaire occupant — à ma charge" },
      { id: "r3l-land", label: "Propriétaire bailleur" },
      { id: "r3l-tenant", label: "Locataire" },
      { id: "r3l-builder", label: "Logement neuf / VEFA — constructeur ou garanties décennale / biennale" },
      { id: "r3l-copro", label: "Partie commune copropriété / syndic" },
      { id: "r3l-na", label: "Autre / je ne sais pas" },
    ],
  };
}

function qR4Parts(answers: Record<string, string>): RepairWizardQuestion {
  const menu = answers["r1_what"] === "r1w-menu";
  return {
    stepId: "r4_parts",
    parcoursTitle: "Parcours 4 — Réparabilité",
    question: menu
      ? "Pièces, quincaillerie ou matériau de remplacement : où en es-tu ?"
      : "Pièces détachées ou consommables : où en es-tu ?",
    options: [
      { id: "r4p-yes", label: "Référence connue / pièce déjà en ma possession" },
      { id: "r4p-order", label: "Trouvable en commande (site fabricant, distributeur…)" },
      { id: "r4p-rare", label: "Appareil ancien ou pièce difficile à trouver" },
      { id: "r4p-none", label: "Pas de pièce identifiée / tout est intégré ou sur mesure" },
      { id: "r4p-unsure", label: "Je ne sais pas" },
    ],
  };
}

const Q_R4_ECONOMICS: RepairWizardQuestion = {
  stepId: "r4_economics",
  parcoursTitle: "Parcours 4 — Réparabilité",
  question: "Réparer ou remplacer : quelle logique te semble la plus proche ?",
  options: [
    { id: "r4e-repair", label: "Réparation clairement rentable (appareil récent ou cher)" },
    { id: "r4e-replace", label: "Remplacement plus cohérent (appareil vieux, réparation > moitié du neuf)" },
    { id: "r4e-balanced", label: "Serré — il faut comparer devis vs neuf" },
    { id: "r4e-na", label: "Pas un équipement « remplaçable » type gros électro — plutôt ouvrage" },
  ],
};

function qR4Diypro(answers: Record<string, string>): RepairWizardQuestion {
  const danger = answers["r2_urgency"] === "r2u-danger";
  return {
    stepId: "r4_diypro",
    parcoursTitle: danger ? "Parcours 4 — Après mise en sécurité" : "Parcours 4 — Réparabilité",
    question: danger
      ? "Une fois la situation sécurisée ou prise en charge par les secours / un pro, comment envisages-tu la suite des travaux ?"
      : "Niveau d’intervention envisagé ?",
    options: danger
      ? [
          { id: "r4d-pro", label: "Uniquement un professionnel habilité pour la suite (gaz, élec, structure…)" },
          { id: "r4d-mixed", label: "Pro pour la partie réglementée, puis bricolage léger possible" },
          { id: "r4d-diy", label: "Je veux quand même des pistes DIY pour la suite (hors zones interdites)" },
          { id: "r4d-unsure", label: "Je ne sais pas encore" },
        ]
      : [
          { id: "r4d-diy", label: "Je veux tenter le DIY encadré (sécurité OK)" },
          { id: "r4d-mixed", label: "Je peux diagnostiquer / démontager mais pas tout refaire" },
          { id: "r4d-pro", label: "Pro obligatoire (gaz, élec réglementée, structure, garantie…)" },
          { id: "r4d-unsure", label: "Je ne sais pas encore — besoin d’avis" },
        ],
  };
}

export function getRepairWizardQuestion(
  stepId: RepairWizardStepId,
  answers: Record<string, string>,
): RepairWizardQuestion {
  switch (stepId) {
    case "r1_what":
      return Q_R1_WHAT;
    case "r1_when":
      return qR1When(answers);
    case "r1_symptom":
      return qR1Symptom(answers);
    case "r1_prior":
      return Q_R1_PRIOR;
    case "r1b_plom":
      return Q_R1B_PLOM;
    case "r1b_elec":
      return Q_R1B_ELEC;
    case "r1b_chauf":
      return Q_R1B_CHAUF;
    case "r2_urgency":
      return Q_R2_URGENCY;
    case "r2b_safety":
      return Q_R2B_SAFETY;
    case "r3_cause":
      return qR3Cause(answers);
    case "r3_warranty":
      return Q_R3_WARRANTY;
    case "r3_liability":
      return qR3Liability(answers);
    case "r4_parts":
      return qR4Parts(answers);
    case "r4_economics":
      return Q_R4_ECONOMICS;
    case "r4_diypro":
      return qR4Diypro(answers);
  }
}

export function isValidRepairOption(
  stepId: RepairWizardStepId,
  optionId: string,
  answers: Record<string, string>,
): boolean {
  const q = getRepairWizardQuestion(stepId, answers);
  return q.options.some((o) => o.id === optionId);
}

export function validateRepairWizardAnswers(answers: Record<string, string>): boolean {
  const seq = expandRepairSequence(answers);
  for (const stepId of seq) {
    const v = answers[stepId];
    if (typeof v !== "string" || !v) return false;
    if (!isValidRepairOption(stepId, v, answers)) return false;
  }
  return true;
}

export function formatRepairWizardForPrompt(answers: Record<string, string>): string {
  const seq = expandRepairSequence(answers);
  const lines: string[] = ["=== Questionnaire réparation (QCM, branche dynamique) ===\n"];
  for (const stepId of seq) {
    const optId = answers[stepId];
    if (!optId) continue;
    const q = getRepairWizardQuestion(stepId, answers);
    const opt = q.options.find((o) => o.id === optId);
    lines.push(`${q.parcoursTitle}`);
    lines.push(`Q : ${q.question}`);
    lines.push(`R : « ${opt?.label ?? optId} »\n`);
  }
  return lines.join("\n");
}

export type RepairInterventionChoice = "artisan" | "sav";

export const REPAIR_INTERVENTION_OPTIONS: {
  id: RepairInterventionChoice;
  label: string;
}[] = [
  { id: "artisan", label: "Mise en relation — recherche d’un artisan sur le site" },
  { id: "sav", label: "Déclaration sinistre / SAV fabricant — quelles démarches" },
];

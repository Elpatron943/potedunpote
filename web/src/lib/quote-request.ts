/** Dossier « demande de devis » joint à un ProLead (champs selon la prestation + enrichissement IA v2). */

export const QUOTE_REQUEST_VERSION = 2 as const;
export const QUOTE_REQUEST_VERSION_LEGACY = 1 as const;

export type QuoteRequestProfile = "fuites" | "peinture" | "sdb" | "generic";

export type QuoteFieldDef = {
  key: string;
  label: string;
  type: "text" | "textarea" | "select" | "number";
  placeholder?: string;
  required?: boolean;
  options?: { value: string; label: string }[];
  maxLength?: number;
};

const AI_TIMELINE_FIELD: QuoteFieldDef = {
  key: "timeline",
  label: "Quand souhaites-tu démarrer ?",
  type: "select",
  required: true,
  options: [
    { value: "ASAP", label: "Le plus tôt possible" },
    { value: "WEEK", label: "Dans la semaine" },
    { value: "MONTH", label: "Dans le mois" },
    { value: "FLEX", label: "Pas pressé" },
  ],
};

/** Champs transverses pour IA / chiffrage (hors « urgence fuite » déjà couverte par le profil fuites). */
const AI_ENRICHMENT_FIELDS: QuoteFieldDef[] = [
  {
    key: "propertyType",
    label: "Type de bien",
    type: "select",
    required: true,
    options: [
      { value: "HOUSE", label: "Maison" },
      { value: "APARTMENT", label: "Appartement" },
      { value: "PRO", label: "Local professionnel" },
      { value: "OUTDOOR", label: "Extérieur / dépendance" },
      { value: "OTHER", label: "Autre" },
    ],
  },
  {
    key: "buildingDecade",
    label: "Âge approximatif du bien (optionnel)",
    type: "select",
    options: [
      { value: "", label: "— Je ne sais pas —" },
      { value: "NEW", label: "Neuf / moins de 5 ans" },
      { value: "D90_00", label: "Années 90 – 2000" },
      { value: "D70_90", label: "Années 70 – 90" },
      { value: "OLD", label: "Avant 1970" },
    ],
  },
  {
    key: "occupation",
    label: "Occupation pendant les travaux",
    type: "select",
    required: true,
    options: [
      { value: "EMPTY", label: "Logement / local vide" },
      { value: "INHABITED", label: "Habité / activité en cours" },
      { value: "LIMITED", label: "Accès limité (créneaux courts)" },
    ],
  },
  {
    key: "budgetBracket",
    label: "Budget indicatif (fourchette)",
    type: "select",
    options: [
      { value: "UNKNOWN", label: "Je ne sais pas" },
      { value: "UNDER_1K", label: "Moins de 1 000 €" },
      { value: "1K_5K", label: "1 000 € à 5 000 €" },
      { value: "5K_15K", label: "5 000 € à 15 000 €" },
      { value: "15K_PLUS", label: "Plus de 15 000 €" },
    ],
  },
  {
    key: "supplyWho",
    label: "Fourniture des matériaux",
    type: "select",
    options: [
      { value: "UNKNOWN", label: "À définir avec le pro" },
      { value: "PRO", label: "Préférence : le professionnel fournit" },
      { value: "CLIENT", label: "Je fournis une partie / la totalité" },
      { value: "MIX", label: "Mix (certaines choses par moi)" },
    ],
  },
  {
    key: "includedScope",
    label: "Ce qui est inclus pour toi dans le projet (optionnel)",
    type: "textarea",
    placeholder: "Ex. dépose ancien carrelage, évacuation gravats, peinture plafond…",
    maxLength: 2000,
  },
  {
    key: "excludedScope",
    label: "Ce que tu exclus explicitement (optionnel)",
    type: "textarea",
    placeholder: "Ex. pas d’électricité, pas de plomberie encastrée…",
    maxLength: 2000,
  },
  {
    key: "detailLevel",
    label: "Niveau de détail souhaité pour le devis",
    type: "select",
    required: true,
    options: [
      { value: "QUICK", label: "Estimation rapide (peu de lignes)" },
      { value: "DETAILED", label: "Devis détaillé (plus de postes)" },
    ],
  },
  {
    key: "clientConcerns",
    label: "Ce qui t’inquiète ou points de vigilance (optionnel)",
    type: "textarea",
    placeholder: "Ex. humidité, ancienne installation, délais serrés…",
    maxLength: 2000,
  },
];

const COMMON_FIELDS: QuoteFieldDef[] = [
  {
    key: "postalCode",
    label: "Code postal",
    type: "text",
    placeholder: "ex. 75011",
    maxLength: 12,
  },
  {
    key: "city",
    label: "Ville",
    type: "text",
    placeholder: "ex. Paris",
    maxLength: 120,
  },
  {
    key: "photoLinks",
    label: "Liens vers tes photos (Drive, WeTransfer…) — optionnel si tu uploades ci‑dessous",
    type: "textarea",
    placeholder: "Un lien par ligne — vues d’ensemble + détails.",
    maxLength: 4000,
  },
];

const FUITES_PROFILE_FIELDS: QuoteFieldDef[] = [
  {
    key: "situation",
    label: "Où vois-tu le problème ? (traces, goutte, humidité…)",
    type: "textarea",
    required: true,
    placeholder: "Ex. trace au plafond salon, sous la salle de bain du voisin du dessus…",
    maxLength: 2000,
  },
  {
    key: "urgency",
    label: "Urgence",
    type: "select",
    required: true,
    options: [
      { value: "URGENT", label: "Assez urgent (sous 48 h)" },
      { value: "WEEK", label: "Cette semaine" },
      { value: "FLEX", label: "Je peux attendre un peu" },
    ],
  },
  {
    key: "floor",
    label: "Étage / accès (optionnel)",
    type: "text",
    placeholder: "ex. 3ᵉ étage sans ascenseur",
    maxLength: 200,
  },
  {
    key: "accessNote",
    label: "Contraintes d’accès (créneaux, digicode…)",
    type: "textarea",
    placeholder: "Optionnel",
    maxLength: 1000,
  },
];

const PEINTURE_PROFILE_FIELDS: QuoteFieldDef[] = [
  {
    key: "surfaceM2",
    label: "Surface à peindre (m² approximatif)",
    type: "number",
    required: true,
    placeholder: "ex. 45",
    maxLength: 20,
  },
  {
    key: "ceilingHeightM",
    label: "Hauteur sous plafond (m, optionnel)",
    type: "text",
    placeholder: "ex. 2,5",
    maxLength: 10,
  },
  {
    key: "pieceCount",
    label: "Nombre de pièces concernées (optionnel)",
    type: "number",
    placeholder: "ex. 3",
    maxLength: 10,
  },
  {
    key: "preparation",
    label: "État des supports (trous, papier à enlever, humidité…)",
    type: "textarea",
    placeholder: "Plus c’est précis, plus le devis est fiable.",
    maxLength: 2000,
  },
  {
    key: "gamme",
    label: "Gamme souhaitée",
    type: "select",
    options: [
      { value: "ENTRY", label: "Entrée de gamme (économique)" },
      { value: "MID", label: "Milieu de gamme" },
      { value: "PREMIUM", label: "Haut de gamme" },
      { value: "UNKNOWN", label: "Je ne sais pas / à conseiller" },
    ],
  },
];

const SDB_PROFILE_FIELDS: QuoteFieldDef[] = [
  {
    key: "scope",
    label: "Que veux-tu faire ? (douche, baignoire, carrelage, meuble vasque…)",
    type: "textarea",
    required: true,
    placeholder: "Décris le projet : remplacement, création, rénovation complète…",
    maxLength: 2000,
  },
  {
    key: "surfaceM2",
    label: "Surface approximative de la pièce (m², optionnel)",
    type: "number",
    placeholder: "ex. 6",
    maxLength: 20,
  },
  {
    key: "gamme",
    label: "Gamme souhaitée",
    type: "select",
    options: [
      { value: "ENTRY", label: "Entrée de gamme" },
      { value: "MID", label: "Milieu de gamme" },
      { value: "PREMIUM", label: "Haut de gamme" },
      { value: "UNKNOWN", label: "À conseiller" },
    ],
  },
];

const GENERIC_PROFILE_FIELDS: QuoteFieldDef[] = [
  {
    key: "surfaceM2",
    label: "Surface ou quantité (si tu connais, m² ou précise)",
    type: "text",
    placeholder: "ex. 12 m² ou « 2 fenêtres »",
    maxLength: 120,
  },
  {
    key: "accessNote",
    label: "Lieu, accès, contraintes",
    type: "textarea",
    placeholder: "Adresse approximative, étage, créneaux…",
    maxLength: 1500,
  },
];

export function matchQuoteRequestProfile(prestationId: string): QuoteRequestProfile {
  const p = prestationId.toLowerCase();
  if (p.includes("fuites-recherche")) return "fuites";
  if (p.includes("peinture-interieure")) return "peinture";
  if (p.includes("sd-bain-complete")) return "sdb";
  return "generic";
}

function profileFieldsOnly(profile: QuoteRequestProfile): QuoteFieldDef[] {
  switch (profile) {
    case "fuites":
      return FUITES_PROFILE_FIELDS;
    case "peinture":
      return PEINTURE_PROFILE_FIELDS;
    case "sdb":
      return SDB_PROFILE_FIELDS;
    default:
      return GENERIC_PROFILE_FIELDS;
  }
}

/** Ordre : champs métier → planning (sauf fuites) → enrichissement IA → localisation & liens. */
export function getQuoteFieldDefsForPrestation(prestationId: string): QuoteFieldDef[] {
  const profile = matchQuoteRequestProfile(prestationId);
  const core = profileFieldsOnly(profile);
  const timeline = profile === "fuites" ? [] : [AI_TIMELINE_FIELD];
  return [...core, ...timeline, ...AI_ENRICHMENT_FIELDS, ...COMMON_FIELDS];
}

export function getQuoteFieldDefs(profile: QuoteRequestProfile): QuoteFieldDef[] {
  const prestationId =
    profile === "fuites"
      ? "fuites-recherche-remplacement"
      : profile === "peinture"
        ? "peinture-interieure-remplacement"
        : profile === "sdb"
          ? "sd-bain-complete-remplacement"
          : "generic";
  return getQuoteFieldDefsForPrestation(prestationId);
}

const PAYLOAD_KEY_WHITELIST = new Set<string>([
  "v",
  "postalCode",
  "city",
  "photoLinks",
  "situation",
  "urgency",
  "floor",
  "accessNote",
  "surfaceM2",
  "ceilingHeightM",
  "pieceCount",
  "preparation",
  "gamme",
  "scope",
  "timeline",
  "propertyType",
  "buildingDecade",
  "occupation",
  "budgetBracket",
  "supplyWho",
  "includedScope",
  "excludedScope",
  "detailLevel",
  "clientConcerns",
  "aiConsent",
]);

const MAX_LEN: Record<string, number> = {
  postalCode: 12,
  city: 120,
  photoLinks: 4000,
  situation: 2000,
  urgency: 32,
  floor: 200,
  accessNote: 1500,
  surfaceM2: 40,
  ceilingHeightM: 10,
  pieceCount: 10,
  preparation: 2000,
  gamme: 32,
  scope: 2000,
  timeline: 32,
  propertyType: 32,
  buildingDecade: 32,
  occupation: 32,
  budgetBracket: 32,
  supplyWho: 32,
  includedScope: 2000,
  excludedScope: 2000,
  detailLevel: 32,
  clientConcerns: 2000,
  aiConsent: 8,
};

export type SanitizedQuoteRequestPayload = {
  v: number;
  [key: string]: string | number | undefined;
};

export function sanitizeQuoteRequestPayload(raw: unknown): SanitizedQuoteRequestPayload | null {
  if (raw == null) return null;
  if (typeof raw !== "object" || Array.isArray(raw)) return null;
  const o = raw as Record<string, unknown>;
  const out: SanitizedQuoteRequestPayload = { v: QUOTE_REQUEST_VERSION };

  const rawV = o.v;
  if (rawV === QUOTE_REQUEST_VERSION_LEGACY || rawV === QUOTE_REQUEST_VERSION) {
    out.v = Number(rawV);
  }

  for (const [key, val] of Object.entries(o)) {
    if (key === "v") continue;
    if (!PAYLOAD_KEY_WHITELIST.has(key)) continue;
    if (typeof val !== "string") continue;
    const max = MAX_LEN[key] ?? 2000;
    let s = val.trim().slice(0, max);
    if (key === "buildingDecade" && s === "") continue;
    if (s.length > 0) out[key] = s;
  }

  out.v = QUOTE_REQUEST_VERSION;

  if (Object.keys(out).length <= 1) return null;
  return out;
}

const DISPLAY_LABELS: Record<string, string> = {
  postalCode: "Code postal",
  city: "Ville",
  photoLinks: "Liens photos",
  situation: "Symptômes / lieu du problème",
  urgency: "Urgence",
  floor: "Étage / accès",
  accessNote: "Accès & contraintes",
  surfaceM2: "Surface (m²) / quantité",
  ceilingHeightM: "Hauteur sous plafond (m)",
  pieceCount: "Nombre de pièces",
  preparation: "État des supports",
  gamme: "Gamme souhaitée",
  scope: "Périmètre du projet",
  timeline: "Délai de démarrage souhaité",
  propertyType: "Type de bien",
  buildingDecade: "Âge du bien",
  occupation: "Occupation pendant travaux",
  budgetBracket: "Budget indicatif",
  supplyWho: "Fourniture matériaux",
  includedScope: "Inclus (côté client)",
  excludedScope: "Exclu explicitement",
  detailLevel: "Détail du devis souhaité",
  clientConcerns: "Points de vigilance",
  aiConsent: "Consentement analyse automatisée",
};

const URGENCY_LABELS: Record<string, string> = {
  URGENT: "Assez urgent (sous 48 h)",
  WEEK: "Cette semaine",
  FLEX: "Peut attendre",
};

const TIMELINE_LABELS: Record<string, string> = {
  ASAP: "Le plus tôt possible",
  WEEK: "Dans la semaine",
  MONTH: "Dans le mois",
  FLEX: "Pas pressé",
};

const GAMME_LABELS: Record<string, string> = {
  ENTRY: "Entrée de gamme",
  MID: "Milieu de gamme",
  PREMIUM: "Haut de gamme",
  UNKNOWN: "À conseiller",
};

const PROPERTY_LABELS: Record<string, string> = {
  HOUSE: "Maison",
  APARTMENT: "Appartement",
  PRO: "Local professionnel",
  OUTDOOR: "Extérieur / dépendance",
  OTHER: "Autre",
};

const OCCUPATION_LABELS: Record<string, string> = {
  EMPTY: "Vide",
  INHABITED: "Habité / activité",
  LIMITED: "Accès limité",
};

const BUDGET_LABELS: Record<string, string> = {
  UNKNOWN: "Non précisé",
  UNDER_1K: "Moins de 1 000 €",
  "1K_5K": "1 000 € à 5 000 €",
  "5K_15K": "5 000 € à 15 000 €",
  "15K_PLUS": "Plus de 15 000 €",
};

const SUPPLY_LABELS: Record<string, string> = {
  UNKNOWN: "À définir",
  PRO: "Fourni par le pro",
  CLIENT: "Fourni par le client",
  MIX: "Mix",
};

const DETAIL_LABELS: Record<string, string> = {
  QUICK: "Estimation rapide",
  DETAILED: "Devis détaillé",
};

const DECADE_LABELS: Record<string, string> = {
  NEW: "Neuf / récent",
  D90_00: "Années 90 – 2000",
  D70_90: "Années 70 – 90",
  OLD: "Ancien",
};

export function formatQuotePayloadValue(key: string, value: string): string {
  if (key === "urgency") return URGENCY_LABELS[value] ?? value;
  if (key === "timeline") return TIMELINE_LABELS[value] ?? value;
  if (key === "gamme") return GAMME_LABELS[value] ?? value;
  if (key === "propertyType") return PROPERTY_LABELS[value] ?? value;
  if (key === "occupation") return OCCUPATION_LABELS[value] ?? value;
  if (key === "budgetBracket") return BUDGET_LABELS[value] ?? value;
  if (key === "supplyWho") return SUPPLY_LABELS[value] ?? value;
  if (key === "detailLevel") return DETAIL_LABELS[value] ?? value;
  if (key === "buildingDecade") return DECADE_LABELS[value] ?? value;
  if (key === "aiConsent") return value === "true" ? "Oui" : value;
  return value;
}

/** Paires libellé / valeur pour affichage pro (hors consentement brut si tu préfères le masquer). */
export function quotePayloadToDisplayPairs(payload: unknown): { label: string; value: string }[] {
  if (payload == null || typeof payload !== "object" || Array.isArray(payload)) return [];
  const o = payload as Record<string, unknown>;
  const keys = Object.keys(o).filter((k) => k !== "v" && PAYLOAD_KEY_WHITELIST.has(k) && k !== "aiConsent");
  keys.sort();
  const pairs: { label: string; value: string }[] = [];
  for (const key of keys) {
    const val = o[key];
    if (typeof val !== "string" || !val.trim()) continue;
    const label = DISPLAY_LABELS[key] ?? key;
    pairs.push({ label, value: formatQuotePayloadValue(key, val) });
  }
  const consent = o.aiConsent;
  if (typeof consent === "string" && consent === "true") {
    pairs.push({
      label: DISPLAY_LABELS.aiConsent,
      value: "Oui — analyse automatisée autorisée sur le dossier",
    });
  }
  return pairs;
}

export function validateQuoteRequestFields(
  defs: QuoteFieldDef[],
  values: Record<string, string>,
): { ok: true } | { ok: false; error: string } {
  for (const d of defs) {
    if (!d.required) continue;
    const v = (values[d.key] ?? "").trim();
    if (!v) {
      return { ok: false, error: `Le champ « ${d.label} » est requis.` };
    }
  }
  return { ok: true };
}

/** Score 0–100 pour inciter à compléter le dossier (UI acheteur). */
export function quoteCompletenessScore(defs: QuoteFieldDef[], values: Record<string, string>): number {
  const required = defs.filter((d) => d.required);
  const optional = defs.filter((d) => !d.required);
  let pts = 0;
  const max = 100;
  const reqW = required.length ? 55 / required.length : 0;
  for (const d of required) {
    if ((values[d.key] ?? "").trim()) pts += reqW;
  }
  const optW = optional.length ? 35 / optional.length : 0;
  for (const d of optional) {
    if ((values[d.key] ?? "").trim()) pts += optW;
  }
  if ((values.photoLinks ?? "").trim()) pts += 5;
  return Math.min(max, Math.round(pts));
}

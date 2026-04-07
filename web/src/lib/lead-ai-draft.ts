import { createId } from "@paralleldrive/cuid2";
import OpenAI from "openai";
import type { ChatCompletionContentPart } from "openai/resources/chat/completions";

import { matchQuoteRequestProfile, type SanitizedQuoteRequestPayload } from "@/lib/quote-request";
import { quoteLeadsBucket } from "@/lib/quote-lead-files";
import { getSupabaseAdmin } from "@/lib/supabase/admin";

const MAX_IMAGE_BYTES = 4 * 1024 * 1024;
const MAX_IMAGES_VISION = 4;

export type AiSuggestedLine = {
  label: string;
  qty: number;
  unit: string;
  unitPrice: number | null;
  note?: string;
};

/** Point de vigilance contextualisé (métier + constat visuel ou textuel). */
export type AiVigilancePoint = {
  theme: string;
  observation: string;
  vigilance: string;
  niveau: "info" | "attention" | "prioritaire";
};

export type LeadAiDraftOutput = {
  summary: string;
  missingFields: string[];
  suggestedLines: AiSuggestedLine[];
  assumptions: string[];
  vigilancePoints: AiVigilancePoint[];
  confidence: number;
};

export type LeadAiDraftRunResult = {
  status: "OK" | "STUB" | "ERROR";
  model?: string | null;
  output: LeadAiDraftOutput;
  raw?: unknown;
  error?: string;
};

const SYSTEM_PROMPT = `Tu es un assistant pour artisans du bâtiment en France. Tu produis un BROUILLON d'analyse pour aider à chiffrer un devis.

Réponds UNIQUEMENT par un JSON valide UTF-8 (aucun markdown, aucun texte hors JSON) avec exactement ces clés :
{
  "summary": "string, 3 à 10 phrases en français : synthèse globale du dossier pour le pro (croiser texte + images si fournies)",
  "missingFields": ["infos manquantes pour un devis fiable"],
  "suggestedLines": [
    { "label": "libellé poste", "qty": 1, "unit": "forfait|h|jour|m²|ml|unité", "unitPrice": null, "note": "optionnel" }
  ],
  "assumptions": ["hypothèses explicites"],
  "vigilancePoints": [
    {
      "theme": "courte catégorie métier (ex. Étanchéité / humidité, Support peinture, Accès chantier, Réseaux apparents, Structure)",
      "observation": "ce qui est visible sur la photo OU déduit du texte avec précision",
      "vigilance": "risque, précaution ou impact sur le devis / la visite (une phrase)",
      "niveau": "info|attention|prioritaire"
    }
  ],
  "confidence": nombre entier 0 à 100 (cohérence du dossier, pas la précision des prix)
}

Règles strictes :
- Français, professionnel.
- Ne invente PAS de prix : unitPrice toujours null.
- vigilancePoints : au moins 2 entrées si le métier / la prestation sont connus ; chaque point doit être SPÉCIFIQUE au contexte (pas de généralités vagues). Varie les "theme" selon le corps de métier (plomberie : fuites, remontées capillaires, état des joints ; peinture : fissures, humidité, anciennes couches, pièces humides ; salle de bain : étanchéité, ventilation, ancien carrelage, etc.).
- Si des IMAGES sont fournies : au moins la moitié des vigilancePoints doit s'appuyer sur ce que tu VOIS (matière, défauts, contexte). Reste prudent : pas de mesures précises sans repère d'échelle.
- Si AUCUNE image : vigilancePoints basés sur le questionnaire et le message ; indique dans observation quand l'info est uniquement textuelle.
- summary : intègre en priorité les éléments visuels importants quand il y a des photos.
- Niveau "prioritaire" = sécurité, dégâts des eaux actifs, risque électrique apparent, structure douteuse, urgence fuite.`;

async function downloadLeadImages(storagePaths: string[]): Promise<{ base64: string; mime: string }[]> {
  const bucket = quoteLeadsBucket();
  const supabase = getSupabaseAdmin();
  const out: { base64: string; mime: string }[] = [];
  for (const path of storagePaths.slice(0, MAX_IMAGES_VISION)) {
    if (!path.startsWith("quote-leads/leads/")) continue;
    const { data, error } = await supabase.storage.from(bucket).download(path);
    if (error || !data) continue;
    const buf = Buffer.from(await data.arrayBuffer());
    if (buf.length > MAX_IMAGE_BYTES) continue;
    const mime = (data as Blob & { type?: string }).type || "image/jpeg";
    if (!mime.startsWith("image/")) continue;
    out.push({ base64: buf.toString("base64"), mime });
  }
  return out;
}

function normalizeLines(raw: unknown): AiSuggestedLine[] {
  if (!Array.isArray(raw)) return [];
  const out: AiSuggestedLine[] = [];
  for (const x of raw) {
    if (!x || typeof x !== "object") continue;
    const o = x as Record<string, unknown>;
    const label = typeof o.label === "string" ? o.label.slice(0, 300) : "";
    if (!label) continue;
    const qty = typeof o.qty === "number" && Number.isFinite(o.qty) ? Math.max(0, o.qty) : 1;
    const unit = typeof o.unit === "string" ? o.unit.slice(0, 40) : "forfait";
    const note = typeof o.note === "string" ? o.note.slice(0, 500) : undefined;
    out.push({ label, qty, unit, unitPrice: null, note });
  }
  return out;
}

const NIVEAUX = new Set(["info", "attention", "prioritaire"]);

function normalizeVigilancePoints(raw: unknown): AiVigilancePoint[] {
  if (!Array.isArray(raw)) return [];
  const out: AiVigilancePoint[] = [];
  for (const x of raw) {
    if (!x || typeof x !== "object") continue;
    const o = x as Record<string, unknown>;
    const theme = typeof o.theme === "string" ? o.theme.slice(0, 120).trim() : "";
    const observation = typeof o.observation === "string" ? o.observation.slice(0, 800).trim() : "";
    const vigilance = typeof o.vigilance === "string" ? o.vigilance.slice(0, 500).trim() : "";
    const nivRaw = typeof o.niveau === "string" ? o.niveau.toLowerCase().trim() : "info";
    const niveau = NIVEAUX.has(nivRaw) ? (nivRaw as AiVigilancePoint["niveau"]) : "info";
    if (!theme && !observation && !vigilance) continue;
    out.push({
      theme: theme || "Point de vigilance",
      observation: observation || "—",
      vigilance: vigilance || "À clarifier sur place.",
      niveau,
    });
  }
  return out.slice(0, 20);
}

function heuristicDraft(
  prestationId: string | null,
  payload: SanitizedQuoteRequestPayload | null,
  attachmentCount: number,
  imageCount: number,
): LeadAiDraftOutput {
  const missing: string[] = [];
  const lines: AiSuggestedLine[] = [];
  const assumptions: string[] = [
    "Brouillon automatique (sans appel modèle ou repli sur heuristique) — validation sur place indispensable.",
  ];
  const vigilancePoints: AiVigilancePoint[] = [];

  if (!attachmentCount && !(payload?.photoLinks && String(payload.photoLinks).trim())) {
    missing.push("Photos du chantier ou du problème (upload ou liens)");
  }
  if (!payload?.postalCode && !payload?.city) {
    missing.push("Localisation plus précise (code postal / ville)");
  }

  if (prestationId && payload) {
    const prof = matchQuoteRequestProfile(prestationId);
    if (prof === "fuites") {
      vigilancePoints.push({
        theme: "Fuites / humidité",
        observation: "Analyse photo non disponible en mode brouillon automatique.",
        vigilance: "Vérifier l’origine (appareil, jointure, étage supérieur) et l’état des parties communes avant devis.",
        niveau: "attention",
      });
    }
    if (prof === "peinture") {
      vigilancePoints.push({
        theme: "Supports",
        observation: "État des supports non vu par l’outil automatique.",
        vigilance: "Prévoir reprises (fissures, humidité, décollage) après visite.",
        niveau: "info",
      });
    }
    if (prof === "sdb") {
      vigilancePoints.push({
        theme: "Étanchéité & ventilation",
        observation: "Dossier sans analyse visuelle intégrée ici.",
        vigilance: "Contrôler VMC, angles carrelage et ancienne étanchéité avant engagement.",
        niveau: "attention",
      });
    }
  }

  if (imageCount > 0 && vigilancePoints.length === 0) {
    vigilancePoints.push({
      theme: "Photos reçues",
      observation: `${imageCount} image(s) jointe(s).`,
      vigilance: "Analyse visuelle détaillée nécessite le modèle IA (clé OpenAI) ; à compléter à la lecture des clichés.",
      niveau: "info",
    });
  }

  lines.push({
    label: "Déplacement / mise en relation & reprise d’informations",
    qty: 1,
    unit: "forfait",
    unitPrice: null,
    note: "Si visite nécessaire avant devis ferme",
  });
  lines.push({
    label: "Main d’œuvre — prestation décrite",
    qty: 1,
    unit: "forfait",
    unitPrice: null,
    note: "À détailler après visite ou plans",
  });
  lines.push({
    label: "Fournitures & consommables",
    qty: 1,
    unit: "forfait",
    unitPrice: null,
    note: "Selon gamme et périmètre validés",
  });

  let confidence = 40;
  if (attachmentCount > 0) confidence += 15;
  if (payload?.detailLevel === "DETAILED") confidence += 5;
  if (missing.length === 0) confidence += 20;
  confidence = Math.min(95, Math.max(15, confidence));

  return {
    summary:
      imageCount > 0
        ? `Dossier avec ${imageCount} photo(s) : une synthèse visuelle détaillée sera produite lorsque l’analyse IA est active. Les postes ci-dessous sont indicatifs ; le professionnel doit valider sur place.`
        : "Le dossier client a été enregistré. Les informations structurées permettent d’esquisser des postes de devis ; les montants doivent être saisis par le professionnel après validation du périmètre et éventuellement visite sur place.",
    missingFields: missing,
    suggestedLines: lines,
    assumptions,
    vigilancePoints,
    confidence,
  };
}

function parseAiJson(text: string): LeadAiDraftOutput {
  let t = text.trim();
  if (t.startsWith("```")) {
    t = t.replace(/^```(?:json)?\s*/i, "").replace(/\s*```\s*$/i, "");
  }
  const start = t.indexOf("{");
  const end = t.lastIndexOf("}");
  if (start < 0 || end < start) throw new Error("JSON introuvable");
  const parsed = JSON.parse(t.slice(start, end + 1)) as Record<string, unknown>;
  const summary = typeof parsed.summary === "string" ? parsed.summary.slice(0, 8000) : "";
  if (!summary) throw new Error("summary manquant");
  const missingFields = Array.isArray(parsed.missingFields)
    ? parsed.missingFields.map((x) => String(x).slice(0, 500)).filter(Boolean)
    : [];
  const assumptions = Array.isArray(parsed.assumptions)
    ? parsed.assumptions.map((x) => String(x).slice(0, 500)).filter(Boolean)
    : [];
  const suggestedLines = normalizeLines(parsed.suggestedLines);
  let vigilancePoints = normalizeVigilancePoints(parsed.vigilancePoints);
  if (vigilancePoints.length === 0) {
    vigilancePoints.push({
      theme: "Relecture",
      observation: "Le modèle n’a pas renvoyé de points de vigilance structurés.",
      vigilance: "Contrôler manuellement le dossier et les photos.",
      niveau: "info",
    });
  }
  const confidence =
    typeof parsed.confidence === "number" && Number.isFinite(parsed.confidence)
      ? Math.min(100, Math.max(0, Math.round(parsed.confidence)))
      : 50;
  return { summary, missingFields, suggestedLines, assumptions, vigilancePoints, confidence };
}

export async function runLeadAiDraft(params: {
  prestationId: string | null;
  metierLabel: string | null;
  prestationLabel: string | null;
  message: string | null;
  requestPayload: SanitizedQuoteRequestPayload | null;
  attachmentCount: number;
  attachmentStoragePaths: string[];
}): Promise<LeadAiDraftRunResult> {
  const images = await downloadLeadImages(params.attachmentStoragePaths);
  const stub = heuristicDraft(
    params.prestationId,
    params.requestPayload,
    params.attachmentCount,
    images.length,
  );
  const apiKey = process.env.OPENAI_API_KEY?.trim();
  if (!apiKey) {
    return { status: "STUB", output: stub };
  }

  const textBlock = [
    `Métier : ${params.metierLabel ?? "—"}`,
    `Prestation : ${params.prestationLabel ?? "—"}`,
    `Message libre client : ${params.message ?? "—"}`,
    `Nombre de photos uploadées : ${params.attachmentCount} (dont ${images.length} analysées ici, max ${MAX_IMAGES_VISION})`,
    `Dossier structuré (JSON) : ${params.requestPayload ? JSON.stringify(params.requestPayload) : "{}"}`,
    images.length > 0
      ? "Les images suivantes sont celles du client : décris ce que tu observes et en déduis des vigilancePoints précis (thème métier + observation visuelle + vigilance)."
      : "Aucune image fournie pour analyse visuelle : vigilancePoints à tirer du texte et du questionnaire, en restant spécifique au métier.",
  ].join("\n");

  const userContent: ChatCompletionContentPart[] = [{ type: "text", text: textBlock }];
  for (const img of images) {
    userContent.push({
      type: "image_url",
      image_url: {
        url: `data:${img.mime};base64,${img.base64}`,
        detail: "low",
      },
    });
  }

  try {
    const openai = new OpenAI({ apiKey });
    const model = (process.env.OPENAI_QUOTE_DRAFT_MODEL ?? "gpt-4o-mini").trim();
    const completion = await openai.chat.completions.create({
      model,
      messages: [
        { role: "system", content: SYSTEM_PROMPT },
        { role: "user", content: userContent },
      ],
      temperature: 0.25,
      max_tokens: 3500,
    });
    const text = completion.choices[0]?.message?.content?.trim() ?? "";
    if (!text) throw new Error("Réponse vide");
    const output = parseAiJson(text);
    for (const line of output.suggestedLines) {
      line.unitPrice = null;
    }
    return {
      status: "OK",
      model: completion.model,
      output,
      raw: output,
    };
  } catch (e) {
    const err = e instanceof Error ? e.message : String(e);
    return { status: "ERROR", error: err, output: stub };
  }
}

export async function persistProLeadAiDraft(leadId: string, result: LeadAiDraftRunResult): Promise<void> {
  const supabase = getSupabaseAdmin();
  const now = new Date().toISOString();
  const out = result.output;
  const status = result.status === "OK" ? "OK" : result.status === "ERROR" ? "ERROR" : "STUB";

  const { data: existing } = await supabase.from("ProLeadAiDraft").select("id").eq("leadId", leadId).maybeSingle();

  const base = {
    leadId,
    status,
    model: result.model ?? null,
    summary: out.summary,
    missingFields: out.missingFields,
    suggestedLines: out.suggestedLines,
    assumptions: out.assumptions,
    vigilancePoints: out.vigilancePoints,
    confidence: out.confidence,
    rawResponse: result.raw ?? (result.error ? { error: result.error } : null),
    updatedAt: now,
  };

  if (existing?.id) {
    const { error } = await supabase.from("ProLeadAiDraft").update(base).eq("leadId", leadId);
    if (error) throw error;
  } else {
    const { error } = await supabase.from("ProLeadAiDraft").insert({
      id: createId(),
      ...base,
      createdAt: now,
    });
    if (error) throw error;
  }
}

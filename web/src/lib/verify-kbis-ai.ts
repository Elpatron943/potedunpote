import OpenAI from "openai";

export type KbisExtractionResult = {
  extractedSiren: string | null;
  /** Date lue sur la ligne du type « À jour au … » (YYYY-MM-DD), pour contrôle « moins de 3 mois ». */
  kbisValidityDateIso: string | null;
  confidence: "high" | "medium" | "low" | null;
  notes: string | null;
  rawAssistantText: string;
};

function parseAssistantJson(content: string): {
  siren?: unknown;
  kbisValidityDate?: unknown;
  confidence?: unknown;
  notes?: unknown;
} {
  const t = content.trim();
  const start = t.indexOf("{");
  const end = t.lastIndexOf("}");
  if (start === -1 || end <= start) {
    throw new Error("Réponse modèle sans JSON.");
  }
  return JSON.parse(t.slice(start, end + 1)) as {
    siren?: unknown;
    kbisValidityDate?: unknown;
    confidence?: unknown;
    notes?: unknown;
  };
}

function normalizeSirenFromAi(raw: unknown): string | null {
  if (raw == null) return null;
  const s = String(raw).replace(/\s/g, "").replace(/\u00a0/g, "");
  const digits = s.replace(/\D/g, "");
  if (digits.length === 9) return digits;
  if (digits.length === 14) return digits.slice(0, 9);
  return null;
}

function normalizeKbisValidityDateIso(raw: unknown): string | null {
  if (raw == null) return null;
  const s = String(raw).trim();
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(s);
  if (!m) return null;
  const y = Number(m[1]);
  const mo = Number(m[2]);
  const d = Number(m[3]);
  if (mo < 1 || mo > 12 || d < 1 || d > 31) return null;
  const dt = new Date(Date.UTC(y, mo - 1, d));
  if (
    Number.isNaN(dt.getTime()) ||
    dt.getUTCFullYear() !== y ||
    dt.getUTCMonth() !== mo - 1 ||
    dt.getUTCDate() !== d
  ) {
    return null;
  }
  return `${m[1]}-${m[2]}-${m[3]}`;
}

/**
 * Lit un Kbis / extrait K (image) et extrait le SIREN déclaré sur le document.
 */
export async function extractSirenFromKbisImage(params: {
  imageBase64: string;
  mimeType: "image/jpeg" | "image/png" | "image/webp";
}): Promise<KbisExtractionResult> {
  const apiKey = process.env.OPENAI_API_KEY?.trim();
  if (!apiKey) {
    throw new Error("OPENAI_API_KEY manquant pour la vérification du Kbis.");
  }

  const model =
    process.env.OPENAI_VISION_MODEL?.trim() ||
    process.env.OPENAI_MODEL?.trim() ||
    "gpt-4o-mini";

  const openai = new OpenAI({ apiKey });
  const dataUrl = `data:${params.mimeType};base64,${params.imageBase64}`;

  const completion = await openai.chat.completions.create({
    model,
    max_tokens: 500,
    temperature: 0.1,
    messages: [
      {
        role: "system",
        content: `Tu analyses des documents administratifs français (Kbis, extrait Kbis, extrait d’immatriculation au RCS).
Ta mission :
1) Identifier le numéro SIREN de l’entreprise (9 chiffres), tel qu’imprimé pour l’entreprise concernée (ligne du type « Immatriculation au RCS » / SIREN — pas un numéro sans lien).
2) Identifier la date de fraîcheur de l’extrait : en général la mention **« À jour au »** suivie d’une date (ex. « À jour au 8 février 2023 »). Si tu vois une formulation équivalente (« extrait établi le », « date de l’extrait »), utilise cette date. C’est la date à laquelle l’extrait était à jour.

Réponds UNIQUEMENT par un JSON valide, sans bloc markdown :
{"siren":"123456789" ou null,"kbisValidityDate":"YYYY-MM-DD" ou null,"confidence":"high"|"medium"|"low","notes":"court texte en français si utile"}

- siren : exactement 9 chiffres si tu le lis clairement, sinon null.
- kbisValidityDate : date convertie au format **YYYY-MM-DD** (calendrier grégorien) pour la ligne « À jour au … » (ou équivalent). Si absente, illisible ou document non reconnu comme extrait RCS/Kbis, mets null.
- confidence : high si SIREN + date de fraîcheur lisibles et cohérents avec un Kbis ; medium si une des deux est fragile ; low si document douteux ou illisible.`,
      },
      {
        role: "user",
        content: [
          {
            type: "text",
            text: "Extrait le SIREN et la date « À jour au » (ou équivalent) de ce document.",
          },
          {
            type: "image_url",
            image_url: { url: dataUrl, detail: "high" },
          },
        ],
      },
    ],
  });

  const text = completion.choices[0]?.message?.content?.trim() ?? "";
  if (!text) {
    return {
      extractedSiren: null,
      kbisValidityDateIso: null,
      confidence: "low",
      notes: "Réponse vide du modèle.",
      rawAssistantText: "",
    };
  }

  try {
    const obj = parseAssistantJson(text);
    const extractedSiren = normalizeSirenFromAi(obj.siren);
    const kbisValidityDateIso = normalizeKbisValidityDateIso(obj.kbisValidityDate);
    const c = obj.confidence;
    const confidence =
      c === "high" || c === "medium" || c === "low" ? c : null;
    const notes = obj.notes != null ? String(obj.notes).slice(0, 500) : null;
    return {
      extractedSiren,
      kbisValidityDateIso,
      confidence,
      notes,
      rawAssistantText: text.slice(0, 2000),
    };
  } catch {
    return {
      extractedSiren: null,
      kbisValidityDateIso: null,
      confidence: "low",
      notes: "Impossible d’interpréter la réponse du modèle.",
      rawAssistantText: text.slice(0, 2000),
    };
  }
}

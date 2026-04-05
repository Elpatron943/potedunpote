import { NextResponse } from "next/server";
import OpenAI from "openai";

import { getSession } from "@/lib/auth-session";
import { logChatbotExchange } from "@/lib/chatbot-log";
import type { RepairInterventionChoice } from "@/lib/repair-wizard-qcm";

export const runtime = "nodejs";

const CHOICE_LABELS: Record<"artisan" | "diy" | "repair", string> = {
  artisan: "Je cherche un artisan",
  diy: "Je veux faire les travaux tout seul",
  repair: "J’ai quelque chose à réparer",
};

const SYSTEM_PROMPT = `Tu es « Bot de ton pote », l’assistant du site « Le pote d'un pote », qui aide à choisir un artisan du bâtiment grâce à des fiches entreprise, des avis clients et des repères de prix.

Règles :
- Réponds toujours en français.
- Reste court : 2 à 5 phrases.
- Oriente vers la recherche par métier et lieu (ou SIREN / raison sociale) sur la page d'accueil du site quand c'est pertinent.
- N’invente pas de noms d'entreprises, SIREN ni chiffres précis sur des prix réels.`;

const SYSTEM_REPAIR_ACK = `Tu es « Bot de ton pote », assistant pour le dépannage et les petites réparations (bricolage, habitat).

Règles :
- Réponds en français, ton convivial.
- L’utilisateur vient de décrire un problème à réparer.
- Remercie et résume brièvement ce que tu as compris (1 phrase).
- Demande ensuite s’il peut envoyer une photo pour affiner l’analyse.
- Indique clairement que la photo n’est pas enregistrée sur le site : elle sert uniquement à l’analyse en direct pour l’aider.
- 3 à 6 phrases au total.`;

const SYSTEM_REPAIR_TEXT = `Tu es « Bot de ton pote », assistant pour la phase « synthèse » avant rédaction d’une fiche réparation sur le site.

Règles :
- Réponds en français, ton clair et factuel.
- L’utilisateur a rempli un questionnaire (diagnostic, urgence, cause, réparabilité) : il est dans le message. Tu n’as PAS de photo.
- Ne rédige PAS un tutoriel pas-à-pas ni un long guide : uniquement une SYNTHÈSE structurée et courte pour alimenter une fiche ensuite.
- Couvre sous forme de listes ou courts paragraphes : zone / objet concerné, symptômes ou indices principaux, hypothèses prudentes, rappel urgence-sécurité si pertinent, ce qui manque encore pour conclure.
- Longueur cible : environ 120 à 280 mots. Pas de liste d’étapes numérotées de réparation détaillée.`;

const SYSTEM_REPAIR_VISION = `Tu es « Bot de ton pote », assistant pour la phase « synthèse » après lecture d’une photo (non stockée) dans un cas de réparation / bricolage.

Règles :
- Réponds en français.
- L’utilisateur a rempli un questionnaire structuré : croise-le avec ce que tu VOIS sur la photo.
- Ne rédige PAS un tutoriel pas-à-pas : uniquement une SYNTHÈSE pour alimenter une fiche réparation complète ailleurs sur le site.
- Extrais : type d’objet ou zone visible, éléments identifiables, signes de défaut ou d’usure visibles, cohérence avec le questionnaire, limites de ce qu’on peut affirmer depuis l’image.
- Rappel bref : ce n’est pas un diagnostic de sécurité garanti ; gaz / électricité / structure → pro si doute.
- Longueur cible : environ 120 à 280 mots.`;

const SYSTEM_REPAIR_CLOSURE_ARTISAN = `Tu es « Bot de ton pote ». L’utilisateur veut être orienté vers un professionnel.

Règles :
- Réponds en français.
- Résume ce qu’un artisan devra savoir (sans inventer de devis ni d’entreprise).
- Indique comment utiliser le site : recherche par métier et lieu sur la page d’accueil, lecture des fiches et avis.
- Suggère le type de corps de métier le plus probable d’après le questionnaire (sans nom d’entreprise).`;

const SYSTEM_REPAIR_CLOSURE_SAV = `Tu es « Bot de ton pote ». L’utilisateur s’oriente vers sinistre / SAV fabricant.

Règles :
- Réponds en français.
- Rappelle les grandes étapes : contacter assureur ou SAV, numéro de série / facture si utile, photos pour dossier, délais types (sans chiffres inventés).
- Ne remplace pas les conditions du contrat ou de la garantie ; reste général et prudent.`;

const MAX_EXPLANATION = 6000;
const MAX_PRIOR_ANALYSIS = 8000;
const MAX_IMAGE_BYTES = 4 * 1024 * 1024;

function parseBody(body: unknown): {
  choiceId: "artisan" | "diy" | "repair";
  explanation: string;
  skipPhoto: boolean;
  imageBase64: string;
  mimeType: string;
  clientSessionId: string | null;
  repairClosure: boolean;
  interventionChoice: RepairInterventionChoice | null;
  priorAnalysis: string;
} | null {
  if (typeof body !== "object" || body === null) return null;
  const o = body as Record<string, unknown>;
  const raw = o.choiceId;
  const choiceId =
    raw === "artisan" || raw === "diy" || raw === "repair" ? raw : null;
  if (!choiceId) return null;
  const explanation =
    typeof o.explanation === "string" ? o.explanation.trim() : "";
  const skipPhoto = o.skipPhoto === true;
  const imageBase64 =
    typeof o.imageBase64 === "string" ? o.imageBase64.trim() : "";
  const mimeType = typeof o.mimeType === "string" ? o.mimeType.trim() : "";
  const rawSession = o.clientSessionId;
  const clientSessionId =
    typeof rawSession === "string" && rawSession.trim().length > 0
      ? rawSession.trim().slice(0, 80)
      : null;
  const repairClosure = o.repairClosure === true;
  const ic = o.interventionChoice;
  const interventionChoice = ic === "artisan" || ic === "sav" ? ic : null;
  const priorAnalysis =
    typeof o.priorAnalysis === "string" ? o.priorAnalysis.trim() : "";
  return {
    choiceId,
    explanation,
    skipPhoto,
    imageBase64,
    mimeType,
    clientSessionId,
    repairClosure,
    interventionChoice,
    priorAnalysis,
  };
}

export async function POST(request: Request) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Corps JSON invalide" }, { status: 400 });
  }

  const parsed = parseBody(body);
  if (!parsed) {
    return NextResponse.json({ error: "choiceId requis (artisan, diy ou repair)" }, { status: 400 });
  }

  const {
    choiceId,
    explanation,
    skipPhoto,
    imageBase64,
    mimeType,
    clientSessionId,
    repairClosure,
    interventionChoice,
    priorAnalysis,
  } = parsed;

  const apiKey = process.env.OPENAI_API_KEY?.trim();
  if (!apiKey) {
    return NextResponse.json({ configured: false }, { status: 503 });
  }

  const model = process.env.OPENAI_MODEL?.trim() || "gpt-4o-mini";
  const openai = new OpenAI({ apiKey });

  try {
    const session = await getSession();

    if (choiceId === "repair") {
      if (explanation.length > MAX_EXPLANATION) {
        return NextResponse.json({ error: "Texte trop long" }, { status: 400 });
      }

      if (repairClosure) {
        if (!interventionChoice) {
          return NextResponse.json(
            { error: "interventionChoice requis (artisan ou sav)" },
            { status: 400 },
          );
        }
        if (!explanation) {
          return NextResponse.json({ error: "explanation requis pour la clôture" }, { status: 400 });
        }
        const priorSlice = priorAnalysis.slice(0, MAX_PRIOR_ANALYSIS);
        const closureSystem: Record<RepairInterventionChoice, string> = {
          artisan: SYSTEM_REPAIR_CLOSURE_ARTISAN,
          sav: SYSTEM_REPAIR_CLOSURE_SAV,
        };
        const orientationLabel =
          interventionChoice === "artisan"
            ? "Mise en relation / recherche d’un artisan sur le site"
            : "Déclaration sinistre / SAV fabricant";
        const userBlock =
          priorSlice.length > 0
            ? `Réponses au questionnaire structuré :\n\n${explanation}\n\n---\nAnalyse déjà communiquée (texte ou photo) :\n"""${priorSlice}"""\n\nOrientation finale demandée par l’utilisateur : ${orientationLabel}.`
            : `Réponses au questionnaire structuré :\n\n${explanation}\n\nOrientation finale demandée par l’utilisateur : ${orientationLabel}.`;

        const completion = await openai.chat.completions.create({
          model,
          messages: [
            { role: "system", content: closureSystem[interventionChoice] },
            { role: "user", content: userBlock },
          ],
          max_tokens: 700,
          temperature: 0.45,
        });

        const text = completion.choices[0]?.message?.content?.trim() ?? "";
        if (!text) {
          return NextResponse.json({ error: "Réponse vide", fallback: true }, { status: 502 });
        }
        await logChatbotExchange({
          clientSessionId,
          userId: session?.userId ?? null,
          choiceId: "repair",
          step: "repair_closure",
          userText: `[${interventionChoice}]\n${explanation.slice(0, 4000)}`,
          assistantText: text,
          usedVision: false,
        });
        return NextResponse.json({ reply: text, configured: true });
      }

      if (imageBase64) {
        if (!explanation) {
          return NextResponse.json({ error: "explanation requis avec l’image" }, { status: 400 });
        }
        if (!/^image\/(jpeg|png|webp|gif)$/i.test(mimeType)) {
          return NextResponse.json({ error: "Format d’image non pris en charge" }, { status: 400 });
        }
        let buffer: Buffer;
        try {
          buffer = Buffer.from(imageBase64, "base64");
        } catch {
          return NextResponse.json({ error: "Image invalide" }, { status: 400 });
        }
        if (buffer.length > MAX_IMAGE_BYTES) {
          return NextResponse.json({ error: "Image trop volumineuse (max 4 Mo)" }, { status: 400 });
        }

        const dataUrl = `data:${mimeType};base64,${imageBase64}`;
        const userText = `Voici le questionnaire et le contexte :\n\n"""${explanation}"""\n\nDécris ce que tu observes sur la photo pour une synthèse courte (pas de tutoriel pas-à-pas dans ta réponse).`;

        const completion = await openai.chat.completions.create({
          model,
          messages: [
            { role: "system", content: SYSTEM_REPAIR_VISION },
            {
              role: "user",
              content: [
                { type: "text", text: userText },
                { type: "image_url", image_url: { url: dataUrl, detail: "auto" } },
              ],
            },
          ],
          max_tokens: 550,
          temperature: 0.4,
        });

        const text = completion.choices[0]?.message?.content?.trim() ?? "";
        if (!text) {
          return NextResponse.json({ error: "Réponse vide", fallback: true }, { status: 502 });
        }
        await logChatbotExchange({
          clientSessionId,
          userId: session?.userId ?? null,
          choiceId: "repair",
          step: "repair_vision",
          userText: explanation,
          assistantText: text,
          usedVision: true,
        });
        return NextResponse.json({ reply: text, configured: true });
      }

      if (skipPhoto) {
        if (!explanation) {
          return NextResponse.json({ error: "explanation requis" }, { status: 400 });
        }

        const completion = await openai.chat.completions.create({
          model,
          messages: [
            { role: "system", content: SYSTEM_REPAIR_TEXT },
            {
              role: "user",
              content: `Questionnaire et contexte (pas de photo) :\n\n"""${explanation}"""`,
            },
          ],
          max_tokens: 550,
          temperature: 0.4,
        });

        const text = completion.choices[0]?.message?.content?.trim() ?? "";
        if (!text) {
          return NextResponse.json({ error: "Réponse vide", fallback: true }, { status: 502 });
        }
        await logChatbotExchange({
          clientSessionId,
          userId: session?.userId ?? null,
          choiceId: "repair",
          step: "repair_text",
          userText: explanation,
          assistantText: text,
          usedVision: false,
        });
        return NextResponse.json({ reply: text, configured: true });
      }

      if (!explanation) {
        return NextResponse.json({ error: "explanation requis pour une réparation" }, { status: 400 });
      }

      const completion = await openai.chat.completions.create({
        model,
        messages: [
          { role: "system", content: SYSTEM_REPAIR_ACK },
          {
            role: "user",
            content: `Description du problème :\n\n"""${explanation}"""`,
          },
        ],
        max_tokens: 450,
        temperature: 0.5,
      });

      const text = completion.choices[0]?.message?.content?.trim() ?? "";
      if (!text) {
        return NextResponse.json({ error: "Réponse vide", fallback: true }, { status: 502 });
      }
      await logChatbotExchange({
        clientSessionId,
        userId: session?.userId ?? null,
        choiceId: "repair",
        step: "repair_ack",
        userText: explanation,
        assistantText: text,
        usedVision: false,
      });
      return NextResponse.json({ reply: text, configured: true });
    }

    const userContent = `L'utilisateur a répondu à la question initiale en choisissant : « ${CHOICE_LABELS[choiceId]} ». Explique comment le site peut l'aider et ce qu'il peut faire ensuite.`;

    const completion = await openai.chat.completions.create({
      model,
      messages: [
        { role: "system", content: SYSTEM_PROMPT },
        { role: "user", content: userContent },
      ],
      max_tokens: 450,
      temperature: 0.55,
    });

    const text = completion.choices[0]?.message?.content?.trim() ?? "";
    if (!text) {
      return NextResponse.json({ error: "Réponse vide", fallback: true }, { status: 502 });
    }

    await logChatbotExchange({
      clientSessionId,
      userId: session?.userId ?? null,
      choiceId,
      step: "simple",
      userText: null,
      assistantText: text,
      usedVision: false,
    });
    return NextResponse.json({ reply: text, configured: true });
  } catch (e) {
    console.error("[api/chat]", e);
    const message = e instanceof Error ? e.message : "Erreur OpenAI";
    return NextResponse.json({ error: message, fallback: true }, { status: 502 });
  }
}

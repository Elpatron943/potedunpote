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

const SYSTEM_REPAIR_TEXT = `Tu es « Bot de ton pote », assistant pour identifier des pannes et proposer des pistes de réparation (bricolage, habitat).

Règles :
- Réponds en français.
- L’utilisateur a rempli un questionnaire structuré (diagnostic, urgence, cause, réparabilité) : tu le trouveras dans le message utilisateur.
- Tu n’as pas de photo à ce stade (analyse texte seule). Croise le questionnaire avec des hypothèses prudentes, des étapes de vérif, et quand appeler un pro.
- Rappelle les limites du conseil à distance ; pas de diagnostic médical ni gaz / électricité dangereuse sans professionnel si doute.
- Structure en court paragraphes ou puces si utile.`;

const SYSTEM_REPAIR_VISION = `Tu es « Bot de ton pote », assistant pour analyser une photo dans le cadre d’un problème de réparation / bricolage.

Règles :
- Réponds en français.
- L’utilisateur a aussi rempli un questionnaire structuré : intègre-le avec ce que tu vois sur la photo.
- Décris ce que tu vois en lien avec le problème, ce qui semble plausible comme cause, et des pistes concrètes (outils, étapes, précautions).
- Si la photo ne permet pas de conclure, dis-le honnêtement.
- Rappelle que ce n’est pas un diagnostic de sécurité garanti ; pour gaz, électricité haute tension ou structure, oriente vers un pro.
- La photo n’est pas stockée ; elle sert uniquement à cette analyse.`;

const SYSTEM_REPAIR_CLOSURE_DIY = `Tu es « Bot de ton pote ». L’utilisateur a choisi un guidage DIY après diagnostic.

Règles :
- Réponds en français, ton clair.
- Tu reçois le questionnaire + une analyse intermédiaire déjà donnée : donne une clôture orientée « pas-à-pas » DIY : ordre des vérifications, précautions sécurité, quand s’arrêter et appeler un pro.
- Ne promets pas que la réparation suffira ; reste prudent sur gaz, électricité, structure, étanchéité critique.
- Court à moyen : listes courtes possibles.`;

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
  const interventionChoice =
    ic === "diy" || ic === "artisan" || ic === "sav" ? ic : null;
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
            { error: "interventionChoice requis (diy, artisan ou sav)" },
            { status: 400 },
          );
        }
        if (!explanation) {
          return NextResponse.json({ error: "explanation requis pour la clôture" }, { status: 400 });
        }
        const priorSlice = priorAnalysis.slice(0, MAX_PRIOR_ANALYSIS);
        const closureSystem: Record<RepairInterventionChoice, string> = {
          diy: SYSTEM_REPAIR_CLOSURE_DIY,
          artisan: SYSTEM_REPAIR_CLOSURE_ARTISAN,
          sav: SYSTEM_REPAIR_CLOSURE_SAV,
        };
        const orientationLabel =
          interventionChoice === "diy"
            ? "Guidage pas-à-pas DIY"
            : interventionChoice === "artisan"
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
        const userText = `Voici la description du problème par l’utilisateur :\n\n"""${explanation}"""\n\nAnalyse la photo fournie pour l’aider à identifier le problème et comment réparer ou quoi faire ensuite.`;

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
          max_tokens: 900,
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
              content: `Problème décrit (pas de photo) :\n\n"""${explanation}"""`,
            },
          ],
          max_tokens: 900,
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

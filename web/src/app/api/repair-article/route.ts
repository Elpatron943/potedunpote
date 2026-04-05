import { createHash } from "node:crypto";

import { createId } from "@paralleldrive/cuid2";
import { NextResponse } from "next/server";
import OpenAI from "openai";

import { getSession } from "@/lib/auth-session";
import { logChatbotExchange } from "@/lib/chatbot-log";
import {
  formatRepairWizardForPrompt,
  validateRepairWizardAnswers,
} from "@/lib/repair-wizard-qcm";
import { getSupabaseAdmin } from "@/lib/supabase/admin";

export const runtime = "nodejs";

const MAX_PRIOR = 8000;

type ArticleJson = {
  title?: string;
  excerpt?: string;
  bodyMarkdown?: string;
};

function parseArticleJson(raw: string): ArticleJson | null {
  try {
    const o = JSON.parse(raw) as unknown;
    if (typeof o !== "object" || o === null) return null;
    return o as ArticleJson;
  } catch {
    return null;
  }
}

function hash16(input: string): string {
  return createHash("sha256").update(input).digest("hex").slice(0, 16);
}

export async function POST(request: Request) {
  let body: {
    wizardAnswers?: unknown;
    priorAnalysis?: string;
    usedVision?: boolean;
    clientSessionId?: string;
  };
  try {
    body = (await request.json()) as typeof body;
  } catch {
    return NextResponse.json({ error: "Corps JSON invalide" }, { status: 400 });
  }

  const clientSessionId =
    typeof body.clientSessionId === "string" && body.clientSessionId.trim().length > 0
      ? body.clientSessionId.trim().slice(0, 80)
      : null;

  const wizardAnswers =
    typeof body.wizardAnswers === "object" &&
    body.wizardAnswers !== null &&
    !Array.isArray(body.wizardAnswers)
      ? (body.wizardAnswers as Record<string, string>)
      : null;

  if (!wizardAnswers || !validateRepairWizardAnswers(wizardAnswers)) {
    return NextResponse.json({ error: "Questionnaire réparation incomplet ou invalide." }, { status: 400 });
  }

  const priorAnalysis =
    typeof body.priorAnalysis === "string" ? body.priorAnalysis.trim().slice(0, MAX_PRIOR) : "";
  if (!priorAnalysis) {
    return NextResponse.json(
      { error: "Synthèse d’analyse (priorAnalysis) requise pour rédiger la fiche." },
      { status: 400 },
    );
  }

  const usedVision = body.usedVision === true;

  const qcmBlock = formatRepairWizardForPrompt(wizardAnswers);
  const fpPayload = [
    "repair-bot-article-v1",
    qcmBlock,
    "---",
    priorAnalysis,
    usedVision ? "photo" : "sans-photo",
  ].join("\n");
  const h = hash16(fpPayload);
  const metierId = "reparation";
  const prestationId = `fp-rb-${h}`;
  const slug = `reparation-rb-${h}`;

  const supabase = getSupabaseAdmin();
  const { data: existing } = await supabase
    .from("DiyKnowledgeArticle")
    .select("slug,title,excerpt,bodyMarkdown")
    .eq("slug", slug)
    .maybeSingle();

  if (existing) {
    const session = await getSession();
    void logChatbotExchange({
      clientSessionId,
      userId: session?.userId ?? null,
      choiceId: "repair",
      step: "diy_guide",
      userText: `[repair-article existant] ${slug}`,
      assistantText: `[base] ${(existing.title as string) ?? ""} — /conseils/${existing.slug as string}`,
      usedVision,
    });
    return NextResponse.json({
      slug: existing.slug as string,
      title: existing.title as string,
      excerpt: (existing.excerpt as string | null) ?? null,
      bodyMarkdown: existing.bodyMarkdown as string,
      source: "database" as const,
    });
  }

  const apiKey = process.env.OPENAI_API_KEY?.trim();
  if (!apiKey) {
    return NextResponse.json({ error: "Génération indisponible (configuration)" }, { status: 503 });
  }

  const model = process.env.OPENAI_MODEL?.trim() || "gpt-4o-mini";
  const openai = new OpenAI({ apiKey });

  const userPrompt = `Tu rédiges une fiche « réparation / dépannage » complète pour le site « Le pote d'un pote », à destination d'un particulier.

CONTEXTE — Questionnaire (parcours diagnostic, urgence, cause, réparabilité) :
${qcmBlock}

CONTEXTE — Synthèse de l’analyse (texte seul ou appuyée sur une photo analysée en direct, non stockée) :
"""${priorAnalysis}"""

${usedVision ? "La synthèse ci-dessus intègre ce qui a été vu sur une photo fournie par l’utilisateur." : "Aucune photo : la synthèse repose sur le questionnaire et les éléments textuels."}

EXIGENCES pour le corps de l’article (bodyMarkdown) :
- Article complet et autonome : pas un simple rappel du chat.
- Structure claire en Markdown (## sections, listes, paragraphes).
- Inclure : rappel du contexte et du symptôme, pistes de diagnostic, précautions de sécurité (eau, électricité, gaz, structure), matériel/outillage courant, étapes de réparation ou de vérification ordonnées, limites du DIY, quand faire appel à un professionnel, garantie / assurance / responsabilité si pertinent d’après le questionnaire.
- Ton pédagogique, français, sans inventer de marques ni de prix chiffrés.
- Ne pas prétendre à un diagnostic de sécurité garanti.

Réponds UNIQUEMENT avec un JSON valide contenant exactement les clés : "title", "excerpt", "bodyMarkdown".`;

  let title = "Fiche réparation";
  let excerpt = "";
  let bodyMarkdown = "";

  try {
    const completion = await openai.chat.completions.create({
      model,
      response_format: { type: "json_object" },
      messages: [
        {
          role: "system",
          content: `Tu es un expert travaux du bâtiment et dépannage habitat pour particuliers.
Réponds UNIQUEMENT avec un JSON valide : "title" (court), "excerpt" (1–2 phrases SEO), "bodyMarkdown" (article complet en Markdown, ## pour sections, pas de HTML).`,
        },
        { role: "user", content: userPrompt },
      ],
      max_tokens: 4500,
      temperature: 0.45,
    });

    const raw = completion.choices[0]?.message?.content?.trim() ?? "";
    const parsed = parseArticleJson(raw);
    if (parsed?.bodyMarkdown && parsed.bodyMarkdown.trim().length > 0) {
      title = typeof parsed.title === "string" && parsed.title.trim() ? parsed.title.trim() : title;
      excerpt =
        typeof parsed.excerpt === "string" && parsed.excerpt.trim()
          ? parsed.excerpt.trim().slice(0, 500)
          : "";
      bodyMarkdown = parsed.bodyMarkdown.trim();
    } else {
      return NextResponse.json({ error: "Réponse modèle invalide" }, { status: 502 });
    }
  } catch (e) {
    console.error("[repair-article]", e);
    return NextResponse.json({ error: "Génération impossible pour le moment" }, { status: 502 });
  }

  const now = new Date().toISOString();
  const id = createId();

  const { error: insErr } = await supabase.from("DiyKnowledgeArticle").insert({
    id,
    slug,
    metierId,
    prestationId,
    title,
    excerpt: excerpt || null,
    bodyMarkdown,
    createdAt: now,
    updatedAt: now,
  });

  if (insErr) {
    const pgCode = String(insErr.code ?? "");
    if (pgCode === "23505") {
      const { data: bySlug } = await supabase
        .from("DiyKnowledgeArticle")
        .select("slug,title,excerpt,bodyMarkdown")
        .eq("slug", slug)
        .maybeSingle();
      if (bySlug) {
        return NextResponse.json({
          slug: bySlug.slug as string,
          title: bySlug.title as string,
          excerpt: (bySlug.excerpt as string | null) ?? null,
          bodyMarkdown: bySlug.bodyMarkdown as string,
          source: "database" as const,
        });
      }
    }
    console.error("[repair-article] insert", insErr);
    return NextResponse.json({ error: "Enregistrement de la fiche impossible." }, { status: 500 });
  }

  const session = await getSession();
  void logChatbotExchange({
    clientSessionId,
    userId: session?.userId ?? null,
    choiceId: "repair",
    step: "diy_guide",
    userText: `[repair-article] ${slug}`.slice(0, 6000),
    assistantText: `[généré] ${title} — /conseils/${slug}`,
    usedVision,
  });

  return NextResponse.json({
    slug,
    title,
    excerpt: excerpt || null,
    bodyMarkdown,
    source: "generated" as const,
  });
}

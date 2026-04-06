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
const MAX_CTX = 12000;
const MAX_IMAGE_BYTES = 4 * 1024 * 1024;

type IssueJson = {
  problemKey?: string;
  title?: string;
  excerpt?: string;
  bodyMarkdown?: string;
};

type IssuesEnvelope = { issues?: IssueJson[] };

function parseIssuesJson(raw: string): IssuesEnvelope | null {
  try {
    const o = JSON.parse(raw) as unknown;
    if (typeof o !== "object" || o === null) return null;
    return o as IssuesEnvelope;
  } catch {
    return null;
  }
}

function hash16(input: string): string {
  return createHash("sha256").update(input).digest("hex").slice(0, 16);
}

function normalizeProblemKey(raw: string): string {
  const s = raw
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 60);
  return s || "probleme";
}

export async function POST(request: Request) {
  let body: {
    wizardAnswers?: unknown;
    priorAnalysis?: string;
    usedVision?: boolean;
    imageBase64?: string;
    mimeType?: string;
    conversationContext?: string;
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
  const imageBase64 = typeof body.imageBase64 === "string" ? body.imageBase64.trim() : "";
  const mimeType = typeof body.mimeType === "string" ? body.mimeType.trim() : "";
  const conversationContext =
    typeof body.conversationContext === "string" ? body.conversationContext.trim().slice(0, MAX_CTX) : "";

  if (usedVision && !imageBase64) {
    // On accepte usedVision=true si la synthèse provient déjà d’une analyse photo,
    // mais pour « s’appuyer sur la photo » lors de la rédaction multi-problèmes,
    // il faut la retransmettre.
    // On ne bloque pas : on dégrade en “sans image” tout en gardant le flag usedVision.
  }

  let dataUrl: string | null = null;
  if (imageBase64) {
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
    dataUrl = `data:${mimeType};base64,${imageBase64}`;
  }

  const qcmBlock = formatRepairWizardForPrompt(wizardAnswers);
  const supabase = getSupabaseAdmin();

  const apiKey = process.env.OPENAI_API_KEY?.trim();
  if (!apiKey) {
    return NextResponse.json({ error: "Génération indisponible (configuration)" }, { status: 503 });
  }

  const model = process.env.OPENAI_MODEL?.trim() || "gpt-4o-mini";
  const openai = new OpenAI({ apiKey });

  const userPrompt = `Tu rédiges des fiches « réparation / dépannage » complètes pour le site « Le pote d'un pote », à destination d'un particulier.

CONTEXTE — Questionnaire (parcours diagnostic, urgence, cause, réparabilité) :
${qcmBlock}

CONTEXTE — Synthèse de l’analyse (texte seul ou appuyée sur une photo analysée en direct, non stockée) :
"""${priorAnalysis}"""

${conversationContext ? `\nCONTEXTE — Historique utile (extraits conversation) :\n"""${conversationContext}"""\n` : ""}

${usedVision ? "Une photo a été fournie ; si l’image est jointe à ce message, tu peux t’y appuyer pour identifier des failles visibles et contextualiser." : "Aucune photo : la synthèse repose sur le questionnaire et les éléments textuels."}

OBJECTIF :
- Identifier 1 à 4 PROBLÈMES DISTINCTS maximum (si plusieurs défauts sont plausibles) à partir du contexte et éventuellement de ce qui est visible sur la photo.
- Produire AUTANT de fiches que de problèmes distincts (une fiche = un problème principal).
- Si un problème n’est pas suffisamment étayé, ne le crée pas.

EXIGENCES POUR CHAQUE FICHE :
- Article complet et autonome : pas un simple rappel du chat.
- Structure claire en Markdown (## sections, listes, paragraphes).
- Inclure : rappel du contexte et du symptôme, pistes de diagnostic, précautions de sécurité (eau, électricité, gaz, structure), matériel/outillage courant, étapes de réparation ou de vérification ordonnées, limites du DIY, quand faire appel à un professionnel, garantie / assurance / responsabilité si pertinent d’après le questionnaire.
- Ton pédagogique, français, sans inventer de marques ni de prix chiffrés.
- Ne pas prétendre à un diagnostic de sécurité garanti.

FORMAT DE RÉPONSE (JSON UNIQUEMENT) :
{"issues":[{"problemKey":"kebab-case-stable","title":"…","excerpt":"…","bodyMarkdown":"…"}]}

Règles problemKey :
- stable, en kebab-case, sans accents
- décrit le PROBLÈME (ex: "fuite-siphon-lavabo", "joint-silicone-degrade", "fuite-robinet-ecrou")
- pas d’identifiants uniques ni de variables aléatoires`;

  const metierId = "reparation";

  try {
    const userMessage = dataUrl
      ? {
          role: "user" as const,
          content: [
            { type: "text" as const, text: userPrompt },
            { type: "image_url" as const, image_url: { url: dataUrl, detail: "auto" as const } },
          ],
        }
      : { role: "user" as const, content: userPrompt };

    const completion = await openai.chat.completions.create({
      model,
      response_format: { type: "json_object" },
      messages: [
        {
          role: "system",
          content: `Tu es un expert travaux du bâtiment et dépannage habitat pour particuliers.
Réponds UNIQUEMENT avec un JSON valide, sans texte autour, et respecte le format {"issues":[...]}.
Chaque issue DOIT contenir "problemKey", "title", "excerpt", "bodyMarkdown" (Markdown, ## pour sections, pas de HTML).`,
        },
        userMessage,
      ],
      max_tokens: 4500,
      temperature: 0.45,
    });

    const raw = completion.choices[0]?.message?.content?.trim() ?? "";
    const env = parseIssuesJson(raw);
    const issuesRaw = Array.isArray(env?.issues) ? env!.issues : [];
    const issues = issuesRaw
      .map((it) => {
        const problemKey =
          typeof it.problemKey === "string" && it.problemKey.trim()
            ? normalizeProblemKey(it.problemKey)
            : null;
        const title =
          typeof it.title === "string" && it.title.trim() ? it.title.trim().slice(0, 160) : null;
        const excerpt =
          typeof it.excerpt === "string" && it.excerpt.trim()
            ? it.excerpt.trim().slice(0, 500)
            : "";
        const bodyMarkdown =
          typeof it.bodyMarkdown === "string" && it.bodyMarkdown.trim() ? it.bodyMarkdown.trim() : null;
        if (!problemKey || !title || !bodyMarkdown) return null;
        return { problemKey, title, excerpt, bodyMarkdown };
      })
      .filter((x): x is { problemKey: string; title: string; excerpt: string; bodyMarkdown: string } => !!x)
      .slice(0, 4);

    if (issues.length === 0) {
      return NextResponse.json({ error: "Aucun problème exploitable identifié" }, { status: 502 });
    }

    // 1) Référentiel : si un problème est déjà mappé vers une fiche, on la suggère directement.
    // (On ne force pas : si les tables ne sont pas présentes, on continue sans référentiel.)
    const problemKeys = issues.map((i) => i.problemKey);
    const suggested: {
      problemKey: string;
      slug: string;
      title: string;
      excerpt: string | null;
      bodyMarkdown: string;
    }[] = [];

    let remainingIssues = [...issues];
    try {
      const { data: probRows } = await supabase
        .from("RepairProblem")
        .select("id,problemKey,active")
        .in("problemKey", problemKeys);
      const activeProblems = (probRows ?? []).filter((r) => (r as { active?: boolean }).active !== false);

      const ids = activeProblems.map((p) => (p as { id: string }).id);
      if (ids.length > 0) {
        const { data: mapRows } = await supabase
          .from("RepairProblemArticle")
          .select("problemId,slug")
          .in("problemId", ids);
        const slugs = (mapRows ?? []).map((m) => (m as { slug: string }).slug);
        if (slugs.length > 0) {
          const { data: artRows } = await supabase
            .from("DiyKnowledgeArticle")
            .select("slug,title,excerpt,bodyMarkdown")
            .in("slug", slugs);
          const articleBySlug = new Map<string, { slug: string; title: string; excerpt: string | null; bodyMarkdown: string }>();
          for (const row of artRows ?? []) {
            articleBySlug.set(row.slug as string, {
              slug: row.slug as string,
              title: row.title as string,
              excerpt: (row.excerpt as string | null) ?? null,
              bodyMarkdown: row.bodyMarkdown as string,
            });
          }

          const problemKeyById = new Map<string, string>();
          for (const p of activeProblems) {
            problemKeyById.set((p as { id: string }).id, (p as { problemKey: string }).problemKey);
          }

          for (const m of mapRows ?? []) {
            const pid = (m as { problemId: string }).problemId;
            const pk = problemKeyById.get(pid);
            const s = (m as { slug: string }).slug;
            const art = articleBySlug.get(s);
            if (pk && art) {
              suggested.push({ problemKey: pk, ...art });
            }
          }
        }
      }

      const suggestedKeys = new Set(suggested.map((s) => s.problemKey));
      remainingIssues = remainingIssues.filter((i) => !suggestedKeys.has(i.problemKey));
    } catch {
      // Référentiel non disponible : on ignore.
      remainingIssues = [...issues];
    }

    const articlePlans = remainingIssues.map((iss) => {
      const fpPayload = [
        "repair-bot-article-v2",
        iss.problemKey,
        qcmBlock,
        "---",
        priorAnalysis,
        usedVision ? "photo" : "sans-photo",
      ].join("\n");
      const h = hash16(fpPayload);
      return {
        h,
        slug: `reparation-rb-${h}`,
        prestationId: `fp-rb-${h}`,
        ...iss,
      };
    });

    const slugs = articlePlans.map((p) => p.slug);
    const { data: existingMany } = await supabase
      .from("DiyKnowledgeArticle")
      .select("slug,title,excerpt,bodyMarkdown")
      .in("slug", slugs);
    const existingBySlug = new Map<string, { slug: string; title: string; excerpt: string | null; bodyMarkdown: string }>();
    for (const row of existingMany ?? []) {
      existingBySlug.set(row.slug as string, {
        slug: row.slug as string,
        title: row.title as string,
        excerpt: (row.excerpt as string | null) ?? null,
        bodyMarkdown: row.bodyMarkdown as string,
      });
    }

    const now = new Date().toISOString();
    const toInsert = articlePlans
      .filter((p) => !existingBySlug.has(p.slug))
      .map((p) => ({
        id: createId(),
        slug: p.slug,
        metierId,
        prestationId: p.prestationId,
        title: p.title,
        excerpt: p.excerpt || null,
        bodyMarkdown: p.bodyMarkdown,
        createdAt: now,
        updatedAt: now,
      }));

    if (toInsert.length > 0) {
      const { error: insErr } = await supabase.from("DiyKnowledgeArticle").insert(toInsert);
      if (insErr) {
        const pgCode = String(insErr.code ?? "");
        if (pgCode !== "23505") {
          console.error("[repair-article] insert", insErr);
          return NextResponse.json({ error: "Enregistrement des fiches impossible." }, { status: 500 });
        }
      }
    }

    // Re-fetch to ensure we return canonical stored versions (and handle conflict races).
    const { data: storedMany } = await supabase
      .from("DiyKnowledgeArticle")
      .select("slug,title,excerpt,bodyMarkdown")
      .in("slug", slugs);

    const storedBySlug = new Map<string, { slug: string; title: string; excerpt: string | null; bodyMarkdown: string }>();
    for (const row of storedMany ?? []) {
      storedBySlug.set(row.slug as string, {
        slug: row.slug as string,
        title: row.title as string,
        excerpt: (row.excerpt as string | null) ?? null,
        bodyMarkdown: row.bodyMarkdown as string,
      });
    }

    const resultArticles = articlePlans
      .map((p) => {
        const stored = storedBySlug.get(p.slug) ?? existingBySlug.get(p.slug);
        if (!stored) return null;
        return {
          slug: stored.slug,
          title: stored.title,
          excerpt: stored.excerpt,
          bodyMarkdown: stored.bodyMarkdown,
          source: existingBySlug.has(p.slug) ? ("database" as const) : ("generated" as const),
          problemKey: p.problemKey,
        };
      })
      .filter((x): x is NonNullable<typeof x> => !!x);

    // 2) Ajout des suggestions du référentiel (toujours “database”).
    const suggestedArticles = suggested.map((a) => ({
      slug: a.slug,
      title: a.title,
      excerpt: a.excerpt,
      bodyMarkdown: a.bodyMarkdown,
      source: "database" as const,
      problemKey: a.problemKey,
    }));

    const mergedBySlug = new Map<string, (typeof resultArticles)[number]>();
    for (const a of [...suggestedArticles, ...resultArticles]) {
      mergedBySlug.set(a.slug, a);
    }
    const finalArticles = Array.from(mergedBySlug.values());

    const session = await getSession();
    const summary = finalArticles.map((a) => `${a.problemKey}:${a.slug}`).join(", ").slice(0, 6000);
    void logChatbotExchange({
      clientSessionId,
      userId: session?.userId ?? null,
      choiceId: "repair",
      step: "diy_guide",
      userText: `[repair-articles] ${summary}`,
      assistantText: `[fiches] ${finalArticles.map((a) => a.title).join(" | ").slice(0, 6000)}`,
      usedVision: usedVision || !!dataUrl,
    });

    return NextResponse.json({ articles: finalArticles });
  } catch (e) {
    console.error("[repair-article]", e);
    return NextResponse.json({ error: "Génération impossible pour le moment" }, { status: 502 });
  }
}

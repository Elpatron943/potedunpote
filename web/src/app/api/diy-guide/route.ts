import { createId } from "@paralleldrive/cuid2";
import { NextResponse } from "next/server";
import OpenAI from "openai";

import { getSession } from "@/lib/auth-session";
import { logChatbotExchange } from "@/lib/chatbot-log";
import {
  getBtpMetierLabelFromRef,
  getBtpReferentiel,
  getPrestationActiviteLabel,
  isValidPrestationPair,
} from "@/lib/btp-referentiel";
import { getSupabaseAdmin } from "@/lib/supabase/admin";

export const runtime = "nodejs";

type GuideJson = {
  title?: string;
  excerpt?: string;
  bodyMarkdown?: string;
};

function parseGuideJson(raw: string): GuideJson | null {
  try {
    const o = JSON.parse(raw) as unknown;
    if (typeof o !== "object" || o === null) return null;
    return o as GuideJson;
  } catch {
    return null;
  }
}

export async function POST(request: Request) {
  let body: { metierId?: string; prestationId?: string; clientSessionId?: string };
  try {
    body = (await request.json()) as typeof body;
  } catch {
    return NextResponse.json({ error: "Corps JSON invalide" }, { status: 400 });
  }

  const metierId = typeof body.metierId === "string" ? body.metierId.trim() : "";
  const prestationId = typeof body.prestationId === "string" ? body.prestationId.trim() : "";
  const clientSessionId =
    typeof body.clientSessionId === "string" && body.clientSessionId.trim().length > 0
      ? body.clientSessionId.trim().slice(0, 80)
      : null;

  if (!metierId || !prestationId) {
    return NextResponse.json({ error: "metierId et prestationId requis" }, { status: 400 });
  }

  const ref = await getBtpReferentiel();
  if (!isValidPrestationPair(ref, metierId, prestationId)) {
    return NextResponse.json({ error: "Combinaison métier / prestation invalide" }, { status: 400 });
  }

  const slug = `${metierId}-${prestationId}`;
  const metierLabel = getBtpMetierLabelFromRef(ref, metierId) ?? metierId;
  const prestationLabel = getPrestationActiviteLabel(ref, metierId, prestationId) ?? prestationId;

  const supabase = getSupabaseAdmin();
  const { data: existing } = await supabase
    .from("DiyKnowledgeArticle")
    .select("slug,title,excerpt,bodyMarkdown,metierId,prestationId")
    .eq("slug", slug)
    .maybeSingle();

  if (existing) {
    const session = await getSession();
    void logChatbotExchange({
      clientSessionId,
      userId: session?.userId ?? null,
      choiceId: "diy",
      step: "diy_guide",
      userText: `${metierId} / ${prestationId}`,
      assistantText: `[base] ${(existing.title as string) ?? ""} — /conseils/${existing.slug as string}`,
      usedVision: false,
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
    return NextResponse.json({ error: "Guide indisponible (configuration)" }, { status: 503 });
  }

  const model = process.env.OPENAI_MODEL?.trim() || "gpt-4o-mini";
  const openai = new OpenAI({ apiKey });

  const userPrompt = `Métier BTP : « ${metierLabel} »
Prestation / type d’intervention : « ${prestationLabel} »

Le lecteur est un particulier qui veut réaliser ou préparer lui-même les travaux (bricolage / autoconstruction raisonnable).
Rédige un guide structuré : matériel courant, étapes ordonnées, précautions de sécurité, limites du DIY, quand faire appel à un professionnel.
Ton : clair, pédagogique, en français.`;

  let title = `Guide : ${prestationLabel} (${metierLabel})`;
  let excerpt = "";
  let bodyMarkdown = "";

  try {
    const completion = await openai.chat.completions.create({
      model,
      response_format: { type: "json_object" },
      messages: [
        {
          role: "system",
          content: `Tu es un expert pédagogique en travaux du bâtiment pour particuliers.
Réponds UNIQUEMENT avec un JSON valide contenant exactement ces clés :
- "title" : titre court et descriptif (sans guillemets imbriqués problématiques)
- "excerpt" : 1 à 2 phrases pour un aperçu SEO
- "bodyMarkdown" : contenu complet en Markdown (utilise ## pour les sections, listes à puces, paragraphes). Pas de HTML.`,
        },
        { role: "user", content: userPrompt },
      ],
      max_tokens: 4000,
      temperature: 0.45,
    });

    const raw = completion.choices[0]?.message?.content?.trim() ?? "";
    const parsed = parseGuideJson(raw);
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
    console.error("[diy-guide]", e);
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
    if (insErr.code === "23505") {
      const { data: again } = await supabase
        .from("DiyKnowledgeArticle")
        .select("slug,title,excerpt,bodyMarkdown")
        .eq("slug", slug)
        .maybeSingle();
      if (again) {
        return NextResponse.json({
          slug: again.slug as string,
          title: again.title as string,
          excerpt: (again.excerpt as string | null) ?? null,
          bodyMarkdown: again.bodyMarkdown as string,
          source: "database" as const,
        });
      }
    }
    console.error("[diy-guide]", insErr);
    return NextResponse.json({ error: "Enregistrement impossible" }, { status: 500 });
  }

  const session = await getSession();
  void logChatbotExchange({
    clientSessionId,
    userId: session?.userId ?? null,
    choiceId: "diy",
    step: "diy_guide",
    userText: `${metierId} / ${prestationId}`,
    assistantText: `[généré] ${title} — /conseils/${slug}`,
    usedVision: false,
  });

  return NextResponse.json({
    slug,
    title,
    excerpt: excerpt || null,
    bodyMarkdown,
    source: "generated" as const,
  });
}

import { createHash } from "node:crypto";

import { createId } from "@paralleldrive/cuid2";
import { NextResponse } from "next/server";
import OpenAI from "openai";

import { getSession } from "@/lib/auth-session";
import { logChatbotExchange } from "@/lib/chatbot-log";
import {
  formatWizardAnswersForPrompt,
  stableWizardKey,
  validateWizardAnswers,
  type DiyProjectKind,
} from "@/lib/diy-wizard-qcm";
import {
  getBtpMetierFromRef,
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

const DIY_KIND_VALUES = new Set(["travaux", "installation", "renovation", "reparation"]);

function parseGuideJson(raw: string): GuideJson | null {
  try {
    const o = JSON.parse(raw) as unknown;
    if (typeof o !== "object" || o === null) return null;
    return o as GuideJson;
  } catch {
    return null;
  }
}

function normalizeDescription(raw: string): string {
  return raw.trim().replace(/\s+/g, " ").slice(0, 2000);
}

function hash16(input: string): string {
  return createHash("sha256").update(input).digest("hex").slice(0, 16);
}

/** Ancien flux : seulement texte + type. */
function fingerprintTextOnly(kind: string, normalizedDesc: string): { slug: string; prestationId: string } {
  const h = hash16(`${kind}\n${normalizedDesc}`);
  return { slug: `${kind}-${h}`, prestationId: `fp-${h}` };
}

function kindPromptLabel(kind: string): string {
  if (kind === "travaux") {
    return "Travaux — création ou modification d’ouvrage (ex : poser une cloison, créer une ouverture, monter un mur, maçonnerie, structure légère). Ce n’est pas une simple pose d’équipement ni une réparation ciblée.";
  }
  if (kind === "installation") {
    return "Installation — pose / ajout d’équipement (ex : chasse d’eau, robinetterie, luminaire, VMC, radiateur), avec raccordements et contraintes de support.";
  }
  if (kind === "renovation") {
    return "Rénovation / réfection — reprise de l’existant, remplacement, mise à jour, remise en état.";
  }
  if (kind === "reparation") {
    return "Réparation / dépannage — remise en service, correction d’une panne ou d’un défaut ciblé (pas un chantier neuf ni une rénovation globale).";
  }
  return kind;
}

function defaultTitleKindFragment(kind: string): string {
  if (kind === "travaux") return "travaux";
  if (kind === "installation") return "installation";
  if (kind === "renovation") return "rénovation";
  if (kind === "reparation") return "réparation";
  return kind;
}

export async function POST(request: Request) {
  let body: {
    metierId?: string;
    prestationId?: string;
    projectKind?: string;
    projectDescription?: string;
    wizardAnswers?: unknown;
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

  const btpMetier = typeof body.metierId === "string" ? body.metierId.trim() : "";
  const btpPresta = typeof body.prestationId === "string" ? body.prestationId.trim() : "";
  const projectKindRaw = typeof body.projectKind === "string" ? body.projectKind.trim() : "";
  const projectDescriptionRaw =
    typeof body.projectDescription === "string" ? body.projectDescription : "";

  let metierId: string;
  let prestationId: string;
  let slug: string;
  let contextLabelForAi: string;
  let logUserSummary: string;
  let titleHintUsesKind: boolean;

  const ref = await getBtpReferentiel();

  const hasWizardObject =
    typeof body.wizardAnswers === "object" &&
    body.wizardAnswers !== null &&
    !Array.isArray(body.wizardAnswers);

  const kindRawIsInstallation = projectKindRaw === "installation";
  const isQcmWizard =
    DIY_KIND_VALUES.has(projectKindRaw) &&
    hasWizardObject &&
    (btpMetier.length > 0 || kindRawIsInstallation);

  if (isQcmWizard) {
    const kind = projectKindRaw as DiyProjectKind;
    if (kind !== "installation") {
      if (!getBtpMetierFromRef(ref, btpMetier)) {
        return NextResponse.json({ error: "Domaine (corps de métier) inconnu ou invalide." }, { status: 400 });
      }
    }
    const wizardAnswers = body.wizardAnswers as Record<string, string>;
    const metierForWizard = kind === "installation" ? "" : btpMetier;
    if (!validateWizardAnswers(kind, metierForWizard, wizardAnswers)) {
      return NextResponse.json(
        { error: "Réponses QCM incomplètes ou invalides (niveaux 3 à 9 requis)." },
        { status: 400 },
      );
    }
    const metierLabel =
      kind === "installation" ? "—" : (getBtpMetierLabelFromRef(ref, btpMetier) ?? btpMetier);
    const wizardBlock = formatWizardAnswersForPrompt(kind, metierForWizard, metierLabel, wizardAnswers);
    const fpPayload = [projectKindRaw, metierForWizard, stableWizardKey(kind, wizardAnswers)].join("\n");
    const h = hash16(fpPayload);
    metierId = projectKindRaw;
    prestationId = `fp-${h}`;
    slug = `${projectKindRaw}-${h}`;
    contextLabelForAi = `${kindPromptLabel(projectKindRaw)}

Parcours guidé (QCM) — à exploiter pour personnaliser le guide :

${wizardBlock}`;
    logUserSummary = `${projectKindRaw} | ${metierLabel} | ${stableWizardKey(kind, wizardAnswers)}`;
    titleHintUsesKind = true;
  } else if (projectKindRaw.length > 0 || projectDescriptionRaw.trim().length > 0) {
    if (!DIY_KIND_VALUES.has(projectKindRaw)) {
      return NextResponse.json(
        { error: "projectKind doit être « travaux », « installation », « renovation » ou « reparation »." },
        { status: 400 },
      );
    }
    if (btpMetier || btpPresta) {
      return NextResponse.json(
        {
          error:
            "Après le domaine (corps de métier), envoie l’objet wizardAnswers avec les niveaux 3 à 9 complétés.",
        },
        { status: 400 },
      );
    }
    const normalized = normalizeDescription(projectDescriptionRaw);
    if (normalized.length < 15) {
      return NextResponse.json(
        { error: "Décris ton projet en au moins quelques mots (15 caractères minimum)." },
        { status: 400 },
      );
    }
    const fp = fingerprintTextOnly(projectKindRaw, normalized);
    metierId = projectKindRaw;
    prestationId = fp.prestationId;
    slug = fp.slug;
    contextLabelForAi = `${kindPromptLabel(projectKindRaw)}\n\nProjet décrit par le particulier :\n« ${normalized} »`;
    logUserSummary = `${projectKindRaw}: ${normalized.slice(0, 500)}`;
    titleHintUsesKind = true;
  } else if (btpMetier && btpPresta) {
    if (!isValidPrestationPair(ref, btpMetier, btpPresta)) {
      return NextResponse.json({ error: "Combinaison métier / prestation invalide" }, { status: 400 });
    }
    metierId = btpMetier;
    prestationId = btpPresta;
    slug = `${btpMetier}-${btpPresta}`;
    const metierLabel = getBtpMetierLabelFromRef(ref, btpMetier) ?? btpMetier;
    const prestationLabel = getPrestationActiviteLabel(ref, btpMetier, btpPresta) ?? btpPresta;
    contextLabelForAi = `Métier BTP : « ${metierLabel} »\nPrestation / type d’intervention : « ${prestationLabel} »`;
    logUserSummary = `${metierId} / ${prestationId}`;
    titleHintUsesKind = false;
  } else {
    return NextResponse.json(
      {
        error:
          "Indique installation, rénovation ou réparation + domaine + QCM (wizardAnswers), ou une description seule (15 caractères min.), ou l’ancien couple métier / prestation.",
      },
      { status: 400 },
    );
  }

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

  const userPrompt = `${contextLabelForAi}

Le lecteur est un particulier qui veut réaliser ou préparer lui-même les travaux (bricolage / autoconstruction raisonnable).
Rédige un guide structuré adapté à SON projet décrit : matériel courant, étapes ordonnées, précautions de sécurité, limites du DIY, quand faire appel à un professionnel.
Intègre explicitement les réponses de l’arbre de décision (quand il y en a) dans tes recommandations.
Ton : clair, pédagogique, en français.`;

  let title = titleHintUsesKind
    ? `Guide DIY : ${defaultTitleKindFragment(projectKindRaw)}`
    : "Guide DIY";
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
    const pgCode = String(insErr.code ?? "");

    /** Doublon : une autre requête a pu insérer entre le SELECT et l’INSERT, ou contrainte unique sur (metierId, prestationId). */
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
      const { data: byPair } = await supabase
        .from("DiyKnowledgeArticle")
        .select("slug,title,excerpt,bodyMarkdown")
        .eq("metierId", metierId)
        .eq("prestationId", prestationId)
        .maybeSingle();
      if (byPair) {
        return NextResponse.json({
          slug: byPair.slug as string,
          title: byPair.title as string,
          excerpt: (byPair.excerpt as string | null) ?? null,
          bodyMarkdown: byPair.bodyMarkdown as string,
          source: "database" as const,
        });
      }
    }

    if (pgCode === "42703") {
      console.error("[diy-guide]", insErr);
      return NextResponse.json(
        {
          error:
            "Table DiyKnowledgeArticle incomplète en base. Exécute la migration SQL diy_knowledge sur Supabase.",
        },
        { status: 500 },
      );
    }

    if (pgCode === "42P01" || /relation.*does not exist/i.test(insErr.message ?? "")) {
      console.error("[diy-guide]", insErr);
      return NextResponse.json(
        {
          error:
            "La table DiyKnowledgeArticle est absente : exécute le SQL de la migration prisma/migrations/20260405180000_diy_knowledge/migration.sql dans Supabase (SQL Editor).",
        },
        { status: 500 },
      );
    }

    console.error("[diy-guide] insert failed", {
      code: insErr.code,
      message: insErr.message,
      details: insErr.details,
      hint: insErr.hint,
    });

    const hint =
      pgCode === "42501" || /permission denied|RLS/i.test(insErr.message ?? "")
        ? " Vérifie que SUPABASE_SERVICE_ROLE_KEY est bien la clé « service_role » du projet Supabase (pas la clé anon)."
        : "";

    const devTail =
      process.env.NODE_ENV === "development"
        ? ` — ${insErr.message || ""} (${pgCode})`
        : " Consulte les logs serveur (terminal ou hébergeur) pour le détail.";

    return NextResponse.json(
      {
        error: `Enregistrement du guide impossible.${hint}${devTail}`,
      },
      { status: 500 },
    );
  }

  const session = await getSession();
  void logChatbotExchange({
    clientSessionId,
    userId: session?.userId ?? null,
    choiceId: "diy",
    step: "diy_guide",
    userText: logUserSummary.slice(0, 6000),
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

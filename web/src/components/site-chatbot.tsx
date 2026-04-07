"use client";

import Link from "next/link";
import {
  useCallback,
  useId,
  useState,
  type ChangeEvent,
  type ReactNode,
  type SVGProps,
} from "react";
import type { SerializedBtpReferentiel } from "@/lib/btp-referentiel-types";
import {
  getWizardQuestion,
  validateWizardAnswers,
  wizardLevelOrder,
  type DiyProjectKind,
  type WizardLevelId,
} from "@/lib/diy-wizard-qcm";
import { CHATBOT_ARTISAN_STATIC_REPLY } from "@/lib/chatbot-artisan-static";
import {
  expandRepairSequence,
  formatRepairWizardForPrompt,
  getCurrentRepairStepId,
  getRepairWizardQuestion,
  pruneRepairAnswers,
  REPAIR_INTERVENTION_OPTIONS,
  repairWizardGoBack,
  validateRepairWizardAnswers,
  type RepairInterventionChoice,
} from "@/lib/repair-wizard-qcm";

function newClientSessionId(): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }
  return `sess-${Date.now()}-${Math.random().toString(36).slice(2, 12)}`;
}

type ChoiceId = "artisan" | "diy" | "repair";

type Phase =
  | "intro"
  | "loading_simple"
  | "diy_kind"
  | "diy_install_room"
  | "diy_install_equipment"
  | "diy_loading_ref"
  | "diy_domaine"
  | "diy_wizard"
  | "loading_diy_guide"
  | "diy_done"
  | "diy_error"
  | "repair_wizard"
  | "repair_photo"
  | "loading_repair_mid"
  | "loading_repair_article"
  | "repair_intervention"
  | "loading_repair_closure"
  | "done";

const CHOICES: { id: ChoiceId; label: string }[] = [
  { id: "artisan", label: "Je cherche un artisan" },
  { id: "diy", label: "Je veux faire les travaux tout seul" },
  { id: "repair", label: "J’ai quelque chose à réparer" },
];

const FALLBACK_REPAIR_MID =
  "Synthèse (fallback) : contexte issu du questionnaire uniquement — zone / symptômes à préciser sur place ; coupure eau ou électricité si danger évident ; faire appel à un pro pour gaz, structure ou doute sérieux. Une fiche complète est générée sur Conseils quand c’est possible.";

const DIY_KIND_OPTIONS: { id: DiyProjectKind; label: string; hint: string }[] = [
  {
    id: "travaux",
    label: "Travaux",
    hint: "Créer ou modifier un ouvrage (cloison, mur, ouverture, petit gros-œuvre…)",
  },
  {
    id: "installation",
    label: "Installation",
    hint: "Pose / ajout d’équipement (chasse d’eau, luminaire, VMC, radiateur…)",
  },
  {
    id: "renovation",
    label: "Rénovation",
    hint: "Reprise de l’existant, réfection, remplacement, remise en état",
  },
  {
    id: "reparation",
    label: "Réparation",
    hint: "Dépannage, panne, petite réfection ciblée, remise en service",
  },
];

function replyForChoice(id: ChoiceId): { paragraphs: string[]; cta?: { href: string; label: string } } {
  switch (id) {
    case "artisan":
      return {
        paragraphs: [CHATBOT_ARTISAN_STATIC_REPLY],
        cta: { href: "/", label: "Aller à la recherche" },
      };
    case "diy":
      return {
        paragraphs: [
          "Le parcours DIY : nature du projet (installation, rénovation ou réparation), corps de métier (référentiel), puis 7 niveaux de QCM (périmètre, contraintes, matériaux, outillage, réglementation, budget, profil). Même parcours = même fiche conseil ; un choix différent = nouvel article.",
          "Le parcours « J’ai quelque chose à réparer » : synthèse dans le bot et fiche réparation enregistrée sur Conseils (même principe de déduplication que le DIY).",
          "Tu peux aussi t’inspirer des avis et des fiches pros sur le site pour comparer avant de te lancer.",
        ],
        cta: { href: "/", label: "Parcourir le site" },
      };
    case "repair":
      return {
        paragraphs: [
          "Le parcours réparation : QCM dynamique, photo optionnelle, synthèse courte dans le bot puis fiche réparation complète sur Conseils ; ensuite orientation artisan ou SAV.",
          "Pour dépannage d’urgence (eau, gaz, électricité dangereuse), privilégie toujours la sécurité et un professionnel.",
        ],
        cta: { href: "/", label: "Trouver un artisan" },
      };
  }
}

async function parseReply(res: Response): Promise<string | null> {
  const data: unknown = await res.json();
  if (
    typeof data === "object" &&
    data !== null &&
    "reply" in data &&
    typeof (data as { reply: unknown }).reply === "string"
  ) {
    const t = (data as { reply: string }).reply.trim();
    return t.length > 0 ? t : null;
  }
  return null;
}

function fileToBase64Payload(file: File): Promise<{ base64: string; mimeType: string }> {
  return new Promise((resolve, reject) => {
    const r = new FileReader();
    r.onload = () => {
      const d = r.result as string;
      const i = d.indexOf("base64,");
      const base64 = i >= 0 ? d.slice(i + 7) : "";
      resolve({ base64, mimeType: file.type || "image/jpeg" });
    };
    r.onerror = () => reject(new Error("Lecture fichier"));
    r.readAsDataURL(file);
  });
}

const INSTALL_ROOM_OPTIONS: { id: string; label: string }[] = [
  { id: "l3room-wc", label: "WC" },
  { id: "l3room-sdb", label: "Salle de bain / buanderie" },
  { id: "l3room-cuisine", label: "Cuisine" },
  { id: "l3room-sejour", label: "Séjour / chambre / bureau" },
  { id: "l3room-exterieur", label: "Extérieur" },
  { id: "l3room-autre", label: "Autre / plusieurs zones" },
];

function installEquipmentOptions(roomId: string): { id: string; label: string }[] {
  if (roomId === "l3room-wc") {
    return [
      { id: "l3eq-chasse", label: "Chasse d’eau / mécanisme WC" },
      { id: "l3eq-wc", label: "WC complet (pose / remplacement)" },
      { id: "l3eq-lave-mains", label: "Lave-mains / petit lavabo" },
      { id: "l3eq-accessoire", label: "Accessoire (abattant, bâti, fixation…)" },
      { id: "l3eq-autre", label: "Autre / je ne sais pas" },
    ];
  }
  if (roomId === "l3room-sdb") {
    return [
      { id: "l3eq-douche", label: "Douche / colonne / paroi" },
      { id: "l3eq-baignoire", label: "Baignoire" },
      { id: "l3eq-vasque", label: "Meuble vasque / lavabo" },
      { id: "l3eq-robinet", label: "Robinetterie (mitigeur, douchette…)" },
      { id: "l3eq-seche-serviette", label: "Sèche-serviettes" },
      { id: "l3eq-vmc", label: "VMC / extraction" },
      { id: "l3eq-autre", label: "Autre / je ne sais pas" },
    ];
  }
  if (roomId === "l3room-cuisine") {
    return [
      { id: "l3eq-evier", label: "Évier / siphon / évacuation" },
      { id: "l3eq-robinet", label: "Robinetterie cuisine" },
      { id: "l3eq-hotte", label: "Hotte / extraction" },
      { id: "l3eq-lv", label: "Lave-vaisselle (raccordement / pose)" },
      { id: "l3eq-plaques", label: "Plaque / four (pose / raccordement)" },
      { id: "l3eq-autre", label: "Autre / je ne sais pas" },
    ];
  }
  if (roomId === "l3room-sejour") {
    return [
      { id: "l3eq-luminaire", label: "Luminaire / plafonnier / applique" },
      { id: "l3eq-prise", label: "Prise / interrupteur (hors tableau)" },
      { id: "l3eq-radiateur", label: "Radiateur / thermostat" },
      { id: "l3eq-autre", label: "Autre / je ne sais pas" },
    ];
  }
  if (roomId === "l3room-exterieur") {
    return [
      { id: "l3eq-luminaire", label: "Luminaire extérieur" },
      { id: "l3eq-portail", label: "Portail / motorisation / gâche" },
      { id: "l3eq-prise-ext", label: "Prise extérieure / éclairage" },
      { id: "l3eq-autre", label: "Autre / je ne sais pas" },
    ];
  }
  return [
    { id: "l3eq-chasse", label: "Chasse d’eau / mécanisme WC" },
    { id: "l3eq-luminaire", label: "Luminaire / électricité légère" },
    { id: "l3eq-robinet", label: "Robinetterie / raccordement eau" },
    { id: "l3eq-radiateur", label: "Radiateur / thermostat" },
    { id: "l3eq-autre", label: "Autre / je ne sais pas" },
  ];
}

export function SiteChatbot() {
  const titleId = useId();
  const photoInputId = useId();
  const [open, setOpen] = useState(false);
  const [phase, setPhase] = useState<Phase>("intro");
  const [choice, setChoice] = useState<ChoiceId | null>(null);
  const [aiReply, setAiReply] = useState<string | null>(null);
  const [repairWizardAnswers, setRepairWizardAnswers] = useState<Record<string, string>>({});
  const [repairMidReply, setRepairMidReply] = useState<string | null>(null);
  const [repairArticles, setRepairArticles] = useState<{ slug: string; title: string; problemKey?: string }[] | null>(
    null,
  );
  const [repairArticleError, setRepairArticleError] = useState<string | null>(null);
  const [repairClosureChoice, setRepairClosureChoice] =
    useState<RepairInterventionChoice | null>(null);
  const [finalReply, setFinalReply] = useState<string | null>(null);
  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const [photoError, setPhotoError] = useState<string | null>(null);
  const [clientSessionId, setClientSessionId] = useState(newClientSessionId);
  const [diyProjectKind, setDiyProjectKind] = useState<DiyProjectKind | "">("");
  const [diyRef, setDiyRef] = useState<SerializedBtpReferentiel | null>(null);
  const [diyDomaineId, setDiyDomaineId] = useState("");
  const [diyWizardLevel, setDiyWizardLevel] = useState<WizardLevelId | null>(null);
  const [diyWizardAnswers, setDiyWizardAnswers] = useState<Record<string, string>>({});
  const [diyInstallRoom, setDiyInstallRoom] = useState<string>("");
  const [diyInstallEquipment, setDiyInstallEquipment] = useState<string>("");
  const [diyResult, setDiyResult] = useState<{
    slug: string;
    title: string;
    excerpt: string | null;
    bodyMarkdown: string;
    source: string;
  } | null>(null);
  const [diyError, setDiyError] = useState<string | null>(null);

  const reset = useCallback(() => {
    setPhase("intro");
    setChoice(null);
    setAiReply(null);
    setRepairWizardAnswers({});
    setRepairMidReply(null);
    setRepairArticles(null);
    setRepairArticleError(null);
    setRepairClosureChoice(null);
    setFinalReply(null);
    setPhotoFile(null);
    setPhotoError(null);
    setDiyProjectKind("");
    setDiyRef(null);
    setDiyDomaineId("");
    setDiyWizardLevel(null);
    setDiyWizardAnswers({});
    setDiyInstallRoom("");
    setDiyInstallEquipment("");
    setDiyResult(null);
    setDiyError(null);
    setClientSessionId(newClientSessionId());
  }, []);

  const pick = useCallback(async (id: ChoiceId) => {
    if (id === "repair") {
      setChoice("repair");
      setRepairWizardAnswers({});
      setRepairMidReply(null);
      setRepairArticles(null);
      setRepairArticleError(null);
      setRepairClosureChoice(null);
      setFinalReply(null);
      setPhotoFile(null);
      setPhotoError(null);
      setPhase("repair_wizard");
      return;
    }

    if (id === "diy") {
      setChoice("diy");
      setDiyError(null);
      setDiyProjectKind("");
      setDiyRef(null);
      setDiyDomaineId("");
      setDiyWizardLevel(null);
      setDiyWizardAnswers({});
      setDiyResult(null);
      setPhase("diy_kind");
      return;
    }

    setChoice(id);
    setAiReply(null);
    setPhase("loading_simple");
    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ choiceId: id, clientSessionId }),
      });
      const reply = await parseReply(res);
      setAiReply(reply);
    } catch {
      setAiReply(null);
    } finally {
      setPhase("done");
    }
  }, [clientSessionId]);

  const startDiyAfterKindPick = useCallback(async (kind: DiyProjectKind) => {
    setDiyProjectKind(kind);
    setDiyError(null);
    setDiyRef(null);
    setDiyDomaineId("");
    setDiyWizardLevel(null);
    setDiyWizardAnswers({});
    setDiyInstallRoom("");
    setDiyInstallEquipment("");
    if (kind === "installation") {
      setPhase("diy_install_room");
      return;
    }
    setPhase("diy_loading_ref");
    try {
      const res = await fetch("/api/referentiel-btp");
      if (!res.ok) throw new Error("ref");
      const data = (await res.json()) as SerializedBtpReferentiel;
      if (!data.metiers?.length) throw new Error("ref");
      setDiyRef(data);
      setPhase("diy_domaine");
    } catch {
      setDiyError("Impossible de charger les domaines. Réessaie plus tard.");
      setPhase("diy_error");
    }
  }, []);

  const loadDiyReferentielAfterInstallQualif = useCallback(async () => {
    setPhase("diy_loading_ref");
    try {
      const res = await fetch("/api/referentiel-btp");
      if (!res.ok) throw new Error("ref");
      const data = (await res.json()) as SerializedBtpReferentiel;
      if (!data.metiers?.length) throw new Error("ref");
      setDiyRef(data);
      setPhase("diy_domaine");
    } catch {
      setDiyError("Impossible de charger les domaines. Réessaie plus tard.");
      setPhase("diy_error");
    }
  }, []);

  const loadDiyGuide = useCallback(
    async (answersOverride?: Record<string, string>) => {
      const finalAnswers = answersOverride ?? diyWizardAnswers;
      if (!diyProjectKind) return;
      if (diyProjectKind !== "installation" && !diyDomaineId) return;
      if (!validateWizardAnswers(diyProjectKind, diyDomaineId, finalAnswers)) {
        setDiyError("Le questionnaire est incomplet.");
        setPhase("diy_wizard");
        return;
      }
      setDiyWizardAnswers(finalAnswers);
      setPhase("loading_diy_guide");
      setDiyError(null);
      try {
        const res = await fetch("/api/diy-guide", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            projectKind: diyProjectKind,
            metierId: diyDomaineId || undefined,
            wizardAnswers: finalAnswers,
            clientSessionId,
          }),
        });
        const data = (await res.json()) as {
          error?: string;
          slug?: string;
          title?: string;
          excerpt?: string | null;
          bodyMarkdown?: string;
          source?: string;
        };
        if (!res.ok || !data.slug || !data.bodyMarkdown) {
          setDiyError(data.error ?? "Génération impossible pour le moment.");
          setPhase("diy_wizard");
          setDiyWizardLevel("l9");
          return;
        }
        setDiyResult({
          slug: data.slug,
          title: data.title ?? "Guide",
          excerpt: data.excerpt ?? null,
          bodyMarkdown: data.bodyMarkdown,
          source: data.source ?? "unknown",
        });
        setPhase("diy_done");
      } catch {
        setDiyError("Erreur réseau. Réessaie.");
        setPhase("diy_wizard");
        setDiyWizardLevel("l9");
      }
    },
    [diyProjectKind, diyDomaineId, diyWizardAnswers, clientSessionId],
  );

  const handleWizardBack = useCallback(() => {
    if (!diyWizardLevel) {
      setPhase("diy_domaine");
      setDiyWizardAnswers({});
      setDiyError(null);
      return;
    }
    if (!diyProjectKind) return;
    const order = wizardLevelOrder(diyProjectKind);
    const idx = order.indexOf(diyWizardLevel);
    if (idx <= 0) {
      setPhase("diy_domaine");
      setDiyWizardLevel(null);
      setDiyWizardAnswers({});
      setDiyError(null);
      return;
    }
    const prev = order[idx - 1];
    const next = { ...diyWizardAnswers };
    for (let j = idx; j < order.length; j++) {
      delete next[order[j]];
    }
    setDiyWizardAnswers(next);
    setDiyWizardLevel(prev);
    setDiyError(null);
  }, [diyWizardLevel, diyWizardAnswers, diyProjectKind]);

  const repairWizardExplanation = useCallback(() => {
    if (!validateRepairWizardAnswers(repairWizardAnswers)) return "";
    return formatRepairWizardForPrompt(repairWizardAnswers);
  }, [repairWizardAnswers]);

  const handleRepairWizardBack = useCallback(() => {
    const seq = expandRepairSequence(repairWizardAnswers);
    const answered = seq.filter((s) => repairWizardAnswers[s]);
    if (answered.length === 0) {
      reset();
      return;
    }
    setRepairWizardAnswers(repairWizardGoBack(repairWizardAnswers));
  }, [repairWizardAnswers, reset]);

  const finishRepairSkipPhoto = useCallback(async () => {
    const t = repairWizardExplanation();
    if (!t) return;
    setPhase("loading_repair_mid");
    setRepairMidReply(null);
    setRepairArticles(null);
    setRepairArticleError(null);
    let mid = FALLBACK_REPAIR_MID;
    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          choiceId: "repair",
          explanation: t,
          skipPhoto: true,
          clientSessionId,
        }),
      });
      const reply = await parseReply(res);
      mid = reply ?? FALLBACK_REPAIR_MID;
      setRepairMidReply(mid);
    } catch {
      setRepairMidReply(FALLBACK_REPAIR_MID);
      mid = FALLBACK_REPAIR_MID;
    }
    setPhase("loading_repair_article");
    try {
      const artRes = await fetch("/api/repair-article", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          wizardAnswers: repairWizardAnswers,
          priorAnalysis: mid,
          usedVision: false,
          conversationContext: `Parcours réparation (sans photo) — QCM + synthèse.\n\nSynthèse:\n${mid}`.slice(0, 12000),
          clientSessionId,
        }),
      });
      const artData = (await artRes.json()) as
        | { error?: string; slug?: string; title?: string }
        | { error?: string; articles?: { slug: string; title: string; problemKey?: string }[] };
      const articles =
        "articles" in artData && Array.isArray((artData as { articles?: unknown }).articles)
          ? ((artData as { articles: { slug: string; title: string; problemKey?: string }[] }).articles ?? [])
          : null;
      if (artRes.ok && articles && articles.length > 0) {
        setRepairArticles(articles);
        setRepairArticleError(null);
      } else if (artRes.ok && "slug" in artData && (artData as { slug?: string }).slug && (artData as { title?: string }).title) {
        setRepairArticles([
          {
            slug: (artData as { slug: string }).slug,
            title: (artData as { title: string }).title,
          },
        ]);
        setRepairArticleError(null);
      } else {
        setRepairArticles(null);
        setRepairArticleError(artData.error ?? "Fiche Conseils non créée pour le moment.");
      }
    } catch {
      setRepairArticles(null);
      setRepairArticleError("Erreur réseau lors de la création de la fiche.");
    } finally {
      setPhase("repair_intervention");
    }
  }, [repairWizardExplanation, repairWizardAnswers, clientSessionId]);

  const finishRepairWithPhoto = useCallback(async () => {
    const t = repairWizardExplanation();
    if (!t || !photoFile) return;
    setPhotoError(null);
    if (photoFile.size > 4 * 1024 * 1024) {
      setPhotoError("Image trop volumineuse (max 4 Mo).");
      return;
    }
    setPhase("loading_repair_mid");
    setRepairMidReply(null);
    setRepairArticles(null);
    setRepairArticleError(null);
    let mid = FALLBACK_REPAIR_MID;
    let photoPayload: { base64: string; mimeType: string } | null = null;
    try {
      photoPayload = await fileToBase64Payload(photoFile);
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          choiceId: "repair",
          explanation: t,
          imageBase64: photoPayload.base64,
          mimeType: photoPayload.mimeType,
          clientSessionId,
        }),
      });
      const reply = await parseReply(res);
      mid = reply ?? FALLBACK_REPAIR_MID;
      setRepairMidReply(mid);
    } catch {
      setRepairMidReply(FALLBACK_REPAIR_MID);
      mid = FALLBACK_REPAIR_MID;
    }
    setPhase("loading_repair_article");
    try {
      const artRes = await fetch("/api/repair-article", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          wizardAnswers: repairWizardAnswers,
          priorAnalysis: mid,
          usedVision: true,
          imageBase64: photoPayload?.base64,
          mimeType: photoPayload?.mimeType,
          conversationContext: `Parcours réparation (avec photo) — QCM + synthèse.\n\nSynthèse:\n${mid}`.slice(0, 12000),
          clientSessionId,
        }),
      });
      const artData = (await artRes.json()) as
        | { error?: string; slug?: string; title?: string }
        | { error?: string; articles?: { slug: string; title: string; problemKey?: string }[] };
      const articles =
        "articles" in artData && Array.isArray((artData as { articles?: unknown }).articles)
          ? ((artData as { articles: { slug: string; title: string; problemKey?: string }[] }).articles ?? [])
          : null;
      if (artRes.ok && articles && articles.length > 0) {
        setRepairArticles(articles);
        setRepairArticleError(null);
      } else if (artRes.ok && "slug" in artData && (artData as { slug?: string }).slug && (artData as { title?: string }).title) {
        setRepairArticles([
          {
            slug: (artData as { slug: string }).slug,
            title: (artData as { title: string }).title,
          },
        ]);
        setRepairArticleError(null);
      } else {
        setRepairArticles(null);
        setRepairArticleError(artData.error ?? "Fiche Conseils non créée pour le moment.");
      }
    } catch {
      setRepairArticles(null);
      setRepairArticleError("Erreur réseau lors de la création de la fiche.");
    } finally {
      setPhase("repair_intervention");
    }
  }, [repairWizardExplanation, repairWizardAnswers, photoFile, clientSessionId]);

  const submitRepairClosure = useCallback(
    async (ic: RepairInterventionChoice) => {
      const t = repairWizardExplanation();
      const prior = repairMidReply?.trim() ?? "";
      if (!t) return;
      setRepairClosureChoice(ic);
      setPhase("loading_repair_closure");
      setFinalReply(null);
      try {
        const res = await fetch("/api/chat", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            choiceId: "repair",
            explanation: t,
            repairClosure: true,
            interventionChoice: ic,
            priorAnalysis: prior,
            clientSessionId,
          }),
        });
        const reply = await parseReply(res);
        if (reply) {
          setFinalReply(reply);
          setPhase("done");
        } else {
          setRepairClosureChoice(null);
          setPhase("repair_intervention");
        }
      } catch {
        setRepairClosureChoice(null);
        setPhase("repair_intervention");
      }
    },
    [repairWizardExplanation, repairMidReply, clientSessionId],
  );

  const onPhotoChange = useCallback((e: ChangeEvent<HTMLInputElement>) => {
    setPhotoError(null);
    const f = e.target.files?.[0];
    if (!f) {
      setPhotoFile(null);
      return;
    }
    if (!/^image\/(jpeg|png|webp|gif)$/i.test(f.type)) {
      setPhotoError("Formats acceptés : JPEG, PNG, WebP, GIF.");
      setPhotoFile(null);
      e.target.value = "";
      return;
    }
    if (f.size > 4 * 1024 * 1024) {
      setPhotoError("Image trop volumineuse (max 4 Mo).");
      setPhotoFile(null);
      e.target.value = "";
      return;
    }
    setPhotoFile(f);
  }, []);

  const repairLabel = CHOICES.find((c) => c.id === "repair")?.label ?? "";

  const repairCurrentStepId =
    phase === "repair_wizard" ? getCurrentRepairStepId(repairWizardAnswers) : null;
  const repairSeq =
    phase === "repair_wizard" ? expandRepairSequence(repairWizardAnswers) : [];
  const repairWizardPayload =
    phase === "repair_wizard" && repairCurrentStepId
      ? {
          wq: getRepairWizardQuestion(repairCurrentStepId, repairWizardAnswers),
          idx: repairSeq.indexOf(repairCurrentStepId),
          total: repairSeq.length,
        }
      : null;

  const diyWizardPayload =
    phase === "diy_wizard" && diyProjectKind && diyWizardLevel
      ? {
          wq: getWizardQuestion(diyProjectKind, diyWizardLevel, diyDomaineId, diyWizardAnswers),
          idx: wizardLevelOrder(diyProjectKind).indexOf(diyWizardLevel),
          total: wizardLevelOrder(diyProjectKind).length,
        }
      : null;

  return (
    <div className="fixed bottom-4 right-4 z-50 flex flex-col items-end gap-3 sm:bottom-6 sm:right-6">
      {open && (
        <section
          role="dialog"
          aria-modal="true"
          aria-labelledby={titleId}
          className="flex w-[min(100vw-2rem,22rem)] max-h-[min(70vh,32rem)] flex-col overflow-hidden rounded-2xl border border-[var(--card-border)] bg-[var(--card)] shadow-[0_24px_80px_-20px_rgba(28,25,23,0.22)] backdrop-blur-xl dark:shadow-[0_24px_80px_-20px_rgba(0,0,0,0.55)]"
        >
          <header className="flex shrink-0 items-center justify-between border-b border-ink/10 px-4 py-3 dark:border-white/10">
            <h2 id={titleId} className="text-sm font-semibold text-ink">
              Bot de ton pote
            </h2>
            <button
              type="button"
              onClick={() => setOpen(false)}
              className="rounded-lg p-1 text-ink-soft transition hover:bg-canvas-muted/80 hover:text-ink dark:hover:bg-white/5"
              aria-label="Fermer le Bot de ton pote"
            >
              <CloseIcon className="h-5 w-5" />
            </button>
          </header>

          <div className="min-h-0 flex-1 overflow-y-auto px-4 py-3">
            <div className="space-y-3 text-sm leading-relaxed text-ink">
              <Bubble role="assistant">
                <p>Salut, je suis le bot de ton pote, dis-moi ce que tu veux faire ?</p>
              </Bubble>

              {phase === "intro" && (
                <div className="flex flex-col gap-2 pt-1">
                  {CHOICES.map(({ id, label }) => (
                    <button
                      key={id}
                      type="button"
                      onClick={() => pick(id)}
                      className="rounded-xl border border-ink/10 bg-canvas-muted/50 px-3 py-2.5 text-left text-sm font-medium text-ink transition hover:border-accent/40 hover:bg-accent/5 dark:border-white/10 dark:hover:bg-white/5"
                    >
                      {label}
                    </button>
                  ))}
                </div>
              )}

              {choice === "repair" && phase !== "intro" && (
                <>
                  <Bubble role="user">
                    <p>{repairLabel}</p>
                  </Bubble>

                  {repairWizardPayload && (
                    <>
                      <Bubble role="assistant">
                        <p className="text-xs font-semibold text-ink">{repairWizardPayload.wq.parcoursTitle}</p>
                        <p className="mt-1 text-[10px] text-ink-soft">
                          Question {repairWizardPayload.idx + 1} / {repairWizardPayload.total}
                        </p>
                        <p className="mt-2">{repairWizardPayload.wq.question}</p>
                      </Bubble>
                      <div className="flex flex-col gap-2 pt-0.5">
                        {repairWizardPayload.wq.options.map((opt) => (
                          <button
                            key={opt.id}
                            type="button"
                            onClick={() => {
                              const sid = getCurrentRepairStepId(repairWizardAnswers);
                              if (!sid) return;
                              const merged = pruneRepairAnswers({
                                ...repairWizardAnswers,
                                [sid]: opt.id,
                              });
                              setRepairWizardAnswers(merged);
                              if (validateRepairWizardAnswers(merged)) {
                                setPhase("repair_photo");
                              }
                            }}
                            className="rounded-xl border border-ink/10 bg-canvas-muted/50 px-3 py-2.5 text-left text-sm font-medium text-ink transition hover:border-accent/40 hover:bg-accent/5 dark:border-white/10 dark:hover:bg-white/5"
                          >
                            {opt.label}
                          </button>
                        ))}
                        <button
                          type="button"
                          onClick={() => handleRepairWizardBack()}
                          className="text-xs font-medium text-accent hover:underline"
                        >
                          {repairWizardPayload.idx <= 0 ? "← Changer d’option" : "← Question précédente"}
                        </button>
                      </div>
                    </>
                  )}

                  {phase === "loading_repair_mid" && (
                    <Bubble role="assistant">
                      <LoadingLine />
                      <p className="mt-2 text-xs text-ink-soft">Analyse du parcours (et de la photo si envoyée)…</p>
                    </Bubble>
                  )}

                  {[
                    "repair_photo",
                    "repair_intervention",
                    "loading_repair_closure",
                    "loading_repair_article",
                  ].includes(phase) &&
                    validateRepairWizardAnswers(repairWizardAnswers) && (
                      <>
                        <Bubble role="user">
                          <p className="text-xs text-ink-soft">
                            Parcours 1 à 4 complétés (diagnostic, urgence, cause, réparabilité).
                          </p>
                        </Bubble>

                        {phase === "repair_photo" && (
                          <>
                            <Bubble role="assistant">
                              <p>
                                Tu peux <strong className="font-medium text-ink">ajouter une photo</strong> pour
                                affiner la synthèse — c’est optionnel. La photo sert à l’analyse et à la fiche
                                Conseils ; elle n’est pas conservée comme fichier après l’échange.
                              </p>
                            </Bubble>
                            <div className="space-y-2 rounded-xl border border-dashed border-ink/15 bg-canvas-muted/20 p-3 dark:border-white/15">
                              <label htmlFor={photoInputId} className="block text-xs font-medium text-ink">
                                Ajouter une photo
                              </label>
                              <input
                                id={photoInputId}
                                type="file"
                                accept="image/jpeg,image/png,image/webp,image/gif"
                                onChange={onPhotoChange}
                                className="block w-full text-xs text-ink file:mr-2 file:rounded-lg file:border-0 file:bg-teal-700 file:px-2 file:py-1.5 file:text-xs file:font-medium file:text-white disabled:opacity-50"
                              />
                              {photoFile && (
                                <p className="text-xs text-ink-soft">
                                  {photoFile.name} ({Math.round(photoFile.size / 1024)} Ko)
                                </p>
                              )}
                              {photoError && <p className="text-xs text-warm">{photoError}</p>}
                              <div className="flex flex-col gap-2 pt-1">
                                <button
                                  type="button"
                                  onClick={() => void finishRepairWithPhoto()}
                                  disabled={!photoFile}
                                  className="rounded-xl bg-teal-700 px-3 py-2 text-xs font-bold text-white shadow-md transition enabled:hover:bg-teal-800 disabled:cursor-not-allowed disabled:opacity-50 dark:bg-teal-600 enabled:dark:hover:bg-teal-500"
                                >
                                  Analyser la photo
                                </button>
                                <button
                                  type="button"
                                  onClick={() => void finishRepairSkipPhoto()}
                                  className="text-xs font-medium text-accent hover:underline enabled:cursor-pointer disabled:opacity-50"
                                >
                                  Pas de photo — analyse avec le questionnaire seulement
                                </button>
                                <button
                                  type="button"
                                  onClick={() => {
                                    setRepairWizardAnswers(repairWizardGoBack(repairWizardAnswers));
                                    setPhotoFile(null);
                                    setPhotoError(null);
                                    setPhase("repair_wizard");
                                  }}
                                  className="text-left text-xs font-medium text-ink-soft hover:text-accent hover:underline"
                                >
                                  ← Modifier une réponse du questionnaire
                                </button>
                              </div>
                            </div>
                          </>
                        )}

                        {phase === "loading_repair_article" && (
                          <Bubble role="assistant">
                            <LoadingLine />
                            <p className="mt-2 text-xs text-ink-soft">
                              Rédaction de la fiche réparation sur Conseils (contexte complet)…
                            </p>
                          </Bubble>
                        )}

                        {(phase === "repair_intervention" || phase === "loading_repair_closure") && (
                          <>
                            <Bubble role="assistant">
                              <>
                                {splitParagraphs(repairMidReply ?? FALLBACK_REPAIR_MID).map((p, i) => (
                                  <p
                                    key={i}
                                    className={i > 0 ? "mt-2 whitespace-pre-line" : "whitespace-pre-line"}
                                  >
                                    {p}
                                  </p>
                                ))}
                                {repairArticles && repairArticles.length > 0 && (
                                  <div className="mt-3 rounded-lg border border-teal-700/20 bg-teal-700/5 px-2.5 py-2 text-xs dark:border-teal-500/25 dark:bg-teal-500/10">
                                    <p className="font-semibold text-ink">
                                      {repairArticles.length === 1 ? "Fiche complète :" : "Fiches complètes :"}
                                    </p>
                                    <ul className="mt-1 space-y-1">
                                      {repairArticles.map((a) => (
                                        <li key={a.slug}>
                                          <Link
                                            href={`/conseils/${a.slug}`}
                                            className="font-medium text-accent underline-offset-2 hover:underline"
                                            onClick={() => setOpen(false)}
                                          >
                                            {a.title}
                                          </Link>
                                        </li>
                                      ))}
                                    </ul>
                                  </div>
                                )}
                                {repairArticleError && (
                                  <p className="mt-2 text-xs text-warm">{repairArticleError}</p>
                                )}
                                <p className="mt-3 text-xs font-semibold text-ink">
                                  Parcours 5 — Comment veux-tu poursuivre ?
                                </p>
                                <p className="mt-1.5 text-xs leading-relaxed text-ink-soft">
                                  La fiche sur Conseils (générée ou déjà présente) reprend le diagnostic ; tu peux
                                  te faire aider par un pro sur le site, ou tenter le DIY en connaissance des
                                  risques.
                                </p>
                                {phase === "loading_repair_closure" && (
                                  <div className="mt-2 flex items-center gap-2 border-t border-ink/10 pt-2 text-xs text-ink-soft dark:border-white/10">
                                    <span
                                      className="inline-block h-3.5 w-3.5 shrink-0 animate-spin rounded-full border-2 border-accent border-t-transparent"
                                      aria-hidden
                                    />
                                    Génération de la clôture…
                                  </div>
                                )}
                              </>
                            </Bubble>
                            <div className="flex flex-col gap-2 pt-0.5">
                              {REPAIR_INTERVENTION_OPTIONS.map((opt) => (
                                <button
                                  key={opt.id}
                                  type="button"
                                  disabled={phase === "loading_repair_closure"}
                                  onClick={() => void submitRepairClosure(opt.id)}
                                  className={
                                    opt.id === "diy"
                                      ? "rounded-xl border border-amber-500/35 bg-amber-500/[0.08] px-3 py-2.5 text-left text-sm font-medium text-ink transition hover:border-amber-500/55 hover:bg-amber-500/15 disabled:cursor-not-allowed disabled:opacity-50 dark:border-amber-500/30 dark:bg-amber-950/20 dark:hover:bg-amber-950/35"
                                      : "rounded-xl border border-ink/10 bg-canvas-muted/50 px-3 py-2.5 text-left text-sm font-medium text-ink transition hover:border-accent/40 hover:bg-accent/5 disabled:cursor-not-allowed disabled:opacity-50 dark:border-white/10 dark:hover:bg-white/5"
                                  }
                                >
                                  {opt.label}
                                </button>
                              ))}
                            </div>
                          </>
                        )}
                      </>
                    )}

                  {phase === "done" && finalReply != null && (
                    <>
                      <Bubble role="assistant">
                        {splitParagraphs(finalReply).map((p, i) => (
                          <p key={i} className={i > 0 ? "mt-2 whitespace-pre-line" : "whitespace-pre-line"}>
                            {p}
                          </p>
                        ))}
                      </Bubble>
                      {repairClosureChoice === "artisan" && (
                        <p className="mt-2">
                          <Link
                            href="/"
                            className="inline-flex items-center justify-center rounded-xl bg-teal-700 px-3 py-2 text-xs font-bold text-white shadow-md shadow-teal-950/25 transition hover:bg-teal-800 focus:outline-none focus-visible:ring-2 focus-visible:ring-teal-500 dark:bg-teal-600 dark:hover:bg-teal-500"
                            onClick={() => setOpen(false)}
                          >
                            Recherche d’artisan
                          </Link>
                        </p>
                      )}
                      {repairClosureChoice === "diy" && (
                        <div className="mt-3 space-y-3">
                          <div
                            className="rounded-xl border border-amber-500/35 bg-amber-500/[0.12] px-3 py-2.5 text-xs leading-relaxed text-amber-950 dark:border-amber-500/30 dark:bg-amber-950/30 dark:text-amber-50"
                            role="note"
                          >
                            <p className="font-semibold text-amber-900 dark:text-amber-100">
                              Réparer seul : évalue les risques avant d’agir
                            </p>
                            <p className="mt-1.5 text-amber-950/95 dark:text-amber-100/90">
                              Électricité, gaz, eau sous pression, étanchéité ou éléments porteurs : une mauvaise
                              manip peut blesser, aggraver les dégâts ou faire sauter des garanties. Coupe les
                              arrivées (eau, gaz, courant) si besoin ; si tu as un doute, fais appel à un
                              professionnel.
                            </p>
                          </div>
                          {repairArticles && repairArticles.length > 0 ? (
                            <div className="space-y-2">
                              <p className="text-xs font-semibold text-ink">Fiche conseil (stockée ou générée) :</p>
                              <ul className="space-y-2">
                                {repairArticles.map((a) => (
                                  <li key={a.slug}>
                                    <Link
                                      href={`/conseils/${a.slug}`}
                                      className="inline-flex w-full items-center justify-center rounded-xl border border-teal-700/45 bg-teal-700/12 px-3 py-2.5 text-center text-xs font-bold text-teal-950 transition hover:bg-teal-700/20 dark:border-teal-500/40 dark:text-teal-50 dark:hover:bg-teal-500/20"
                                      onClick={() => setOpen(false)}
                                    >
                                      Ouvrir : {a.title}
                                    </Link>
                                  </li>
                                ))}
                              </ul>
                            </div>
                          ) : (
                            <p className="text-xs text-ink-soft">
                              Aucun lien direct vers une fiche : parcours la rubrique{" "}
                              <Link
                                href="/conseils"
                                className="font-semibold text-accent underline-offset-2 hover:underline"
                                onClick={() => setOpen(false)}
                              >
                                Conseils DIY
                              </Link>
                              .
                              {repairArticleError ? (
                                <span className="block pt-1 text-warm">({repairArticleError})</span>
                              ) : null}
                            </p>
                          )}
                        </div>
                      )}
                      <button
                        type="button"
                        onClick={reset}
                        className="text-xs font-medium text-accent hover:underline"
                      >
                        Recommencer
                      </button>
                    </>
                  )}

                  {phase === "done" && finalReply == null && choice === "repair" && (
                    <>
                      <Bubble role="assistant">
                        {splitParagraphs(replyForChoice("repair").paragraphs.join("\n\n")).map((p, i) => (
                          <p key={i} className={i > 0 ? "mt-2" : undefined}>
                            {p}
                          </p>
                        ))}
                      </Bubble>
                      {replyForChoice("repair").cta && (
                        <p className="mt-2">
                          <Link
                            href={replyForChoice("repair").cta!.href}
                            className="inline-flex items-center justify-center rounded-xl bg-teal-700 px-3 py-2 text-xs font-bold text-white shadow-md shadow-teal-950/25 transition hover:bg-teal-800 dark:bg-teal-600 dark:hover:bg-teal-500"
                            onClick={() => setOpen(false)}
                          >
                            {replyForChoice("repair").cta!.label}
                          </Link>
                        </p>
                      )}
                      <button
                        type="button"
                        onClick={reset}
                        className="text-xs font-medium text-accent hover:underline"
                      >
                        Recommencer
                      </button>
                    </>
                  )}
                </>
              )}

              {choice === "diy" && phase !== "intro" && (
                <>
                  <Bubble role="user">
                    <p>{CHOICES.find((c) => c.id === "diy")?.label ?? ""}</p>
                  </Bubble>

                  {phase === "diy_kind" && (
                    <>
                      <Bubble role="assistant">
                        <p>
                          Choisis la catégorie qui correspond le mieux :{" "}
                          <strong className="font-medium text-ink">travaux</strong>,{" "}
                          <strong className="font-medium text-ink">installation</strong>,{" "}
                          <strong className="font-medium text-ink">rénovation</strong> ou{" "}
                          <strong className="font-medium text-ink">réparation</strong> (dépannage ciblé). Ensuite on
                          prendra ton corps de métier et le questionnaire.
                        </p>
                      </Bubble>
                      <div className="flex flex-col gap-2 pt-0.5">
                        {DIY_KIND_OPTIONS.map((opt) => (
                          <button
                            key={opt.id}
                            type="button"
                            onClick={() => void startDiyAfterKindPick(opt.id)}
                            className="rounded-xl border border-ink/10 bg-canvas-muted/50 px-3 py-2.5 text-left text-sm font-medium text-ink transition hover:border-accent/40 hover:bg-accent/5 dark:border-white/10 dark:hover:bg-white/5"
                          >
                            <span className="block">{opt.label}</span>
                            <span className="mt-0.5 block text-xs font-normal text-ink-soft">{opt.hint}</span>
                          </button>
                        ))}
                      </div>
                    </>
                  )}

                  {phase === "diy_install_room" && diyProjectKind === "installation" && (
                    <>
                      <Bubble role="assistant">
                        <p>
                          Avant de choisir le domaine, on qualifie rapidement l’installation.{" "}
                          <strong className="font-medium text-ink">Dans quelle pièce / zone</strong> se passe la pose ?
                        </p>
                      </Bubble>
                      <div className="flex flex-col gap-2 pt-0.5">
                        {INSTALL_ROOM_OPTIONS.map((opt) => (
                          <button
                            key={opt.id}
                            type="button"
                            onClick={() => {
                              setDiyInstallRoom(opt.id);
                              setDiyInstallEquipment("");
                              setPhase("diy_install_equipment");
                            }}
                            className="rounded-xl border border-ink/10 bg-canvas-muted/50 px-3 py-2.5 text-left text-sm font-medium text-ink transition hover:border-accent/40 hover:bg-accent/5 dark:border-white/10 dark:hover:bg-white/5"
                          >
                            {opt.label}
                          </button>
                        ))}
                        <button
                          type="button"
                          onClick={() => {
                            setDiyProjectKind("");
                            setPhase("diy_kind");
                          }}
                          className="text-xs font-medium text-accent hover:underline"
                        >
                          ← Changer de catégorie
                        </button>
                      </div>
                    </>
                  )}

                  {phase === "diy_install_equipment" && diyProjectKind === "installation" && (
                    <>
                      <Bubble role="assistant">
                        <p>
                          Ok. Maintenant,{" "}
                          <strong className="font-medium text-ink">quel équipement</strong> veux-tu installer ?
                        </p>
                      </Bubble>
                      <div className="flex flex-col gap-2 pt-0.5">
                        {installEquipmentOptions(diyInstallRoom).map((opt) => (
                          <button
                            key={opt.id}
                            type="button"
                            onClick={() => {
                              setDiyInstallEquipment(opt.id);
                              setDiyWizardAnswers({ l3room: diyInstallRoom, l3eq: opt.id });
                              setDiyDomaineId("");
                              setDiyWizardLevel("l3");
                              setDiyError(null);
                              setPhase("diy_wizard");
                            }}
                            className="rounded-xl border border-ink/10 bg-canvas-muted/50 px-3 py-2.5 text-left text-sm font-medium text-ink transition hover:border-accent/40 hover:bg-accent/5 dark:border-white/10 dark:hover:bg-white/5"
                          >
                            {opt.label}
                          </button>
                        ))}
                        <button
                          type="button"
                          onClick={() => setPhase("diy_install_room")}
                          className="text-xs font-medium text-accent hover:underline"
                        >
                          ← Modifier la pièce
                        </button>
                      </div>
                    </>
                  )}

                  {phase === "diy_loading_ref" && (
                    <Bubble role="assistant">
                      <LoadingLine />
                      <p className="mt-2 text-xs text-ink-soft">Chargement des domaines…</p>
                    </Bubble>
                  )}

                  {phase === "diy_domaine" && diyRef && diyProjectKind && (
                    <>
                      <Bubble role="assistant">
                        <p>
                          <span className="text-xs font-semibold uppercase tracking-wide text-ink-soft">
                            Niveau 1 — Nature du projet :{" "}
                          </span>
                          <strong className="font-medium text-ink">
                            {DIY_KIND_OPTIONS.find((o) => o.id === diyProjectKind)?.label ?? diyProjectKind}
                          </strong>
                        </p>
                        <p className="mt-2">
                          <strong className="font-medium text-ink">Niveau 2 — Corps de métier</strong> : choisis le
                          domaine le plus proche (référentiel identique à la recherche du site).
                        </p>
                      </Bubble>
                      <div className="space-y-2 pt-0.5">
                        <label className="text-xs font-semibold uppercase tracking-wide text-ink-soft">
                          Domaine
                        </label>
                        <select
                          value={diyDomaineId}
                          onChange={(e) => setDiyDomaineId(e.target.value)}
                          className="w-full rounded-xl border border-ink/15 bg-canvas-muted/30 px-3 py-2 text-sm text-ink focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent/25 dark:border-white/15 dark:bg-white/5"
                        >
                          <option value="">— Choisis un domaine —</option>
                          {diyRef.metiers.map((m) => (
                            <option key={m.id} value={m.id}>
                              {m.label}
                            </option>
                          ))}
                        </select>
                        <button
                          type="button"
                          disabled={!diyDomaineId}
                          onClick={() => {
                            setDiyWizardLevel("l3");
                            setDiyWizardAnswers(diyWizardAnswers);
                            setDiyError(null);
                            setPhase("diy_wizard");
                          }}
                          className="w-full rounded-xl bg-teal-700 px-3 py-2.5 text-sm font-bold text-white shadow-md shadow-teal-950/25 transition enabled:hover:bg-teal-800 disabled:cursor-not-allowed disabled:opacity-50 dark:bg-teal-600 enabled:dark:hover:bg-teal-500"
                        >
                          Continuer — questionnaire (niveaux 3 à 9)
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            setDiyProjectKind("");
                            setDiyRef(null);
                            setDiyError(null);
                            setPhase("diy_kind");
                          }}
                          className="w-full text-xs font-medium text-accent hover:underline"
                        >
                          Changer la catégorie (installation / rénovation / réparation)
                        </button>
                      </div>
                    </>
                  )}

                  {diyWizardPayload && diyProjectKind && diyWizardLevel ? (
                    <>
                      <Bubble role="assistant">
                        <p className="text-xs text-ink-soft">
                          Niveau 1 :{" "}
                          {DIY_KIND_OPTIONS.find((o) => o.id === diyProjectKind)?.label ?? diyProjectKind}
                          {diyProjectKind === "installation" ? (
                            <>
                              {" "}
                              · Équipement :{" "}
                              <span className="font-medium text-ink">
                                {installEquipmentOptions(diyInstallRoom).find((o) => o.id === diyInstallEquipment)
                                  ?.label ?? "—"}
                              </span>
                            </>
                          ) : (
                            <>
                              {" "}
                              · Niveau 2 :{" "}
                              {diyRef?.metiers.find((m) => m.id === diyDomaineId)?.label ?? diyDomaineId}
                            </>
                          )}
                        </p>
                        <p className="mt-2 text-xs font-semibold text-ink">{diyWizardPayload.wq.sectionTitle}</p>
                        <p className="mt-1">{diyWizardPayload.wq.question}</p>
                      </Bubble>
                      <div className="flex flex-col gap-2 pt-0.5">
                        {diyWizardPayload.wq.options.map((opt) => (
                          <button
                            key={opt.id}
                            type="button"
                            onClick={() => {
                              setDiyError(null);
                              const level = diyWizardLevel;
                              if (!level) return;
                              if (!diyProjectKind) return;
                              const order = wizardLevelOrder(diyProjectKind);
                              const i = order.indexOf(level);
                              const nextAnswers = { ...diyWizardAnswers, [level]: opt.id };
                              if (i >= order.length - 1) {
                                void loadDiyGuide(nextAnswers);
                              } else {
                                setDiyWizardAnswers(nextAnswers);
                                setDiyWizardLevel(order[i + 1]);
                              }
                            }}
                            className="rounded-xl border border-ink/10 bg-canvas-muted/50 px-3 py-2.5 text-left text-sm font-medium text-ink transition hover:border-accent/40 hover:bg-accent/5 dark:border-white/10 dark:hover:bg-white/5"
                          >
                            {opt.label}
                          </button>
                        ))}
                        {diyWizardPayload.idx === diyWizardPayload.total - 1 ? (
                          <p className="text-[10px] text-ink-soft">
                            Dernière réponse : envoi automatique du guide (même parcours = fiche existante).
                          </p>
                        ) : null}
                        {diyError ? (
                          <p className="text-xs text-amber-800 dark:text-amber-200">{diyError}</p>
                        ) : null}
                        <button
                          type="button"
                          onClick={() => handleWizardBack()}
                          className="text-xs font-medium text-accent hover:underline"
                        >
                          {diyWizardPayload.idx <= 0 ? "← Modifier le domaine" : "← Niveau précédent"}
                        </button>
                        <p className="text-[10px] leading-snug text-ink-soft">
                          Fiches enregistrées sur{" "}
                          <Link href="/conseils" className="font-medium text-accent underline" onClick={() => setOpen(false)}>
                            Conseils DIY
                          </Link>
                          .
                        </p>
                      </div>
                    </>
                  ) : null}

                  {phase === "loading_diy_guide" && (
                    <Bubble role="assistant">
                      <LoadingLine />
                      <p className="mt-2 text-xs text-ink-soft">
                        Recherche dans la base ou rédaction du guide…
                      </p>
                    </Bubble>
                  )}

                  {phase === "diy_done" && diyResult && (
                    <>
                      <Bubble role="assistant">
                        <p className="font-semibold text-ink">{diyResult.title}</p>
                        {diyResult.excerpt ? (
                          <p className="mt-2 text-xs leading-relaxed text-ink-soft">{diyResult.excerpt}</p>
                        ) : null}
                        <p className="mt-2 text-[10px] text-ink-soft">
                          {diyResult.source === "database"
                            ? "Fiche déjà présente dans notre base conseils."
                            : "Nouvelle fiche ajoutée aux conseils du site."}
                        </p>
                      </Bubble>
                      <p className="mt-2">
                        <Link
                          href={`/conseils/${diyResult.slug}`}
                          className="inline-flex items-center justify-center rounded-xl bg-teal-700 px-3 py-2 text-xs font-bold text-white shadow-md shadow-teal-950/25 transition hover:bg-teal-800 dark:bg-teal-600 dark:hover:bg-teal-500"
                          onClick={() => setOpen(false)}
                        >
                          Lire le guide complet
                        </Link>
                      </p>
                      <button
                        type="button"
                        onClick={reset}
                        className="text-xs font-medium text-accent hover:underline"
                      >
                        Recommencer
                      </button>
                    </>
                  )}

                  {phase === "diy_error" && (
                    <>
                      <Bubble role="assistant">
                        <p className="text-sm text-amber-900 dark:text-amber-100">{diyError}</p>
                      </Bubble>
                      <button
                        type="button"
                        onClick={reset}
                        className="text-xs font-medium text-accent hover:underline"
                      >
                        Recommencer
                      </button>
                    </>
                  )}
                </>
              )}

              {choice === "artisan" && (phase === "loading_simple" || phase === "done") && (
                <AnsweredBlock
                  choice={choice}
                  loading={phase === "loading_simple"}
                  aiReply={aiReply}
                  onClose={() => setOpen(false)}
                  onReset={reset}
                />
              )}
            </div>
          </div>
        </section>
      )}

      <div className="flex max-w-[min(100vw-1.5rem,calc(100vw-2rem))] flex-row items-end justify-end gap-2">
        {!open && (
          <button
            type="button"
            onClick={() => setOpen(true)}
            className="mb-1 max-w-[min(15rem,calc(100vw-5.5rem))] rounded-2xl rounded-br-sm border border-ink/10 bg-[var(--card)] px-3.5 py-2.5 text-left text-sm font-medium leading-snug text-ink shadow-md backdrop-blur-md transition hover:border-accent/30 hover:bg-canvas-muted/50 dark:border-white/10 dark:hover:bg-white/5"
            aria-label="Pose la question au bot de ton pote — ouvrir"
          >
            Pose la question au bot de ton pote
          </button>
        )}
        <button
          type="button"
          onClick={() => setOpen((v) => !v)}
          className="relative z-[1] flex h-14 w-14 shrink-0 items-center justify-center rounded-full bg-teal-700 text-white shadow-lg shadow-teal-950/30 transition hover:bg-teal-800 focus:outline-none focus-visible:ring-2 focus-visible:ring-teal-500 focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--canvas)] dark:bg-teal-600 dark:hover:bg-teal-500 dark:shadow-black/40"
          aria-expanded={open}
          aria-label={open ? "Fermer le Bot de ton pote" : "Ouvrir le Bot de ton pote"}
        >
          {open ? <CloseIcon className="h-6 w-6" /> : <ChatIcon className="h-6 w-6" />}
        </button>
      </div>
    </div>
  );
}

function splitParagraphs(text: string): string[] {
  return text
    .split(/\n\n+/)
    .map((p) => p.trim())
    .filter(Boolean);
}

function LoadingLine() {
  return (
    <p className="flex items-center gap-2 text-ink-soft">
      <span
        className="inline-block h-4 w-4 animate-spin rounded-full border-2 border-accent border-t-transparent"
        aria-hidden
      />
      Réponse en cours…
    </p>
  );
}

function AnsweredBlock({
  choice,
  loading,
  aiReply,
  onClose,
  onReset,
}: {
  choice: ChoiceId;
  loading: boolean;
  aiReply: string | null;
  onClose: () => void;
  onReset: () => void;
}) {
  const fallback = replyForChoice(choice);
  const label = CHOICES.find((c) => c.id === choice)?.label ?? "";
  const useAi = !loading && aiReply != null && aiReply.length > 0;
  const paragraphs = useAi
    ? splitParagraphs(aiReply)
    : fallback.paragraphs;

  return (
    <>
      <Bubble role="user">
        <p>{label}</p>
      </Bubble>
      <Bubble role="assistant">
        {loading ? (
          <LoadingLine />
        ) : (
          <>
            {paragraphs.map((p, i) => (
              <p key={i} className={i > 0 ? "mt-2 whitespace-pre-line" : "whitespace-pre-line"}>
                {p}
              </p>
            ))}
            {fallback.cta && (
              <p className="mt-3">
                <Link
                  href={fallback.cta.href}
                  className="inline-flex items-center justify-center rounded-xl bg-teal-700 px-3 py-2 text-xs font-bold text-white shadow-md shadow-teal-950/25 transition hover:bg-teal-800 focus:outline-none focus-visible:ring-2 focus-visible:ring-teal-500 dark:bg-teal-600 dark:hover:bg-teal-500"
                  onClick={onClose}
                >
                  {fallback.cta.label}
                </Link>
              </p>
            )}
          </>
        )}
      </Bubble>
      {!loading && (
        <button type="button" onClick={onReset} className="text-xs font-medium text-accent hover:underline">
          Recommencer
        </button>
      )}
    </>
  );
}

function Bubble({
  role,
  children,
}: {
  role: "assistant" | "user";
  children: ReactNode;
}) {
  return (
    <div
      className={
        role === "assistant"
          ? "rounded-2xl rounded-tl-sm border border-ink/10 bg-canvas-muted/40 px-3 py-2 dark:border-white/10 dark:bg-white/5"
          : "ml-4 rounded-2xl rounded-tr-sm border border-accent/25 bg-accent/10 px-3 py-2 dark:border-accent/30"
      }
    >
      {children}
    </div>
  );
}

function ChatIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden {...props}>
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"
      />
    </svg>
  );
}

function CloseIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden {...props}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
    </svg>
  );
}

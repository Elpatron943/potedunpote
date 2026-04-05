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
  | "diy_loading_ref"
  | "diy_metier"
  | "diy_prestation"
  | "loading_diy_guide"
  | "diy_done"
  | "diy_error"
  | "repair_explain"
  | "loading_repair_ack"
  | "repair_photo"
  | "loading_repair_final"
  | "done";

const CHOICES: { id: ChoiceId; label: string }[] = [
  { id: "artisan", label: "Je cherche un artisan" },
  { id: "diy", label: "Je veux faire les travaux tout seul" },
  { id: "repair", label: "J’ai quelque chose à réparer" },
];

const FALLBACK_REPAIR_ACK =
  "Merci pour les précisions, j’ai bien noté. As-tu une photo à partager ? Tu peux l’ajouter ci-dessous : elle sert uniquement à l’analyse en direct pour t’aider à identifier le souci et les pistes de réparation — rien n’est enregistré sur nos serveurs.";

function replyForChoice(id: ChoiceId): { paragraphs: string[]; cta?: { href: string; label: string } } {
  switch (id) {
    case "artisan":
      return {
        paragraphs: [
          "Tu es au bon endroit : lance une recherche par métier et lieu (ou par SIREN / raison sociale), puis compare les fiches, les avis et les repères de prix laissés par d’autres clients.",
        ],
        cta: { href: "/", label: "Aller à la recherche" },
      };
    case "diy":
      return {
        paragraphs: [
          "Tu peux t’inspirer des fiches et des avis pour estimer la difficulté et les budgets, et repérer les bons réflexes avant de te lancer.",
          "Si un jour tu préfères faire appel à un pro, la recherche reste disponible.",
        ],
        cta: { href: "/", label: "Parcourir le site" },
      };
    case "repair":
      return {
        paragraphs: [
          "Pour une réparation, un artisan ciblé sur ton type de panne ou d’ouvrage est souvent le plus sûr : renseigne le métier et ta zone pour voir les entreprises et les retours clients.",
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

export function SiteChatbot() {
  const titleId = useId();
  const explainId = useId();
  const photoInputId = useId();
  const [open, setOpen] = useState(false);
  const [phase, setPhase] = useState<Phase>("intro");
  const [choice, setChoice] = useState<ChoiceId | null>(null);
  const [aiReply, setAiReply] = useState<string | null>(null);
  const [repairExplanation, setRepairExplanation] = useState("");
  const [repairAckReply, setRepairAckReply] = useState<string | null>(null);
  const [finalReply, setFinalReply] = useState<string | null>(null);
  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const [photoError, setPhotoError] = useState<string | null>(null);
  const [clientSessionId, setClientSessionId] = useState(newClientSessionId);
  const [diyRef, setDiyRef] = useState<SerializedBtpReferentiel | null>(null);
  const [diyMetierId, setDiyMetierId] = useState("");
  const [diyPrestationId, setDiyPrestationId] = useState("");
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
    setRepairExplanation("");
    setRepairAckReply(null);
    setFinalReply(null);
    setPhotoFile(null);
    setPhotoError(null);
    setDiyRef(null);
    setDiyMetierId("");
    setDiyPrestationId("");
    setDiyResult(null);
    setDiyError(null);
    setClientSessionId(newClientSessionId());
  }, []);

  const pick = useCallback(async (id: ChoiceId) => {
    if (id === "repair") {
      setChoice("repair");
      setRepairExplanation("");
      setRepairAckReply(null);
      setFinalReply(null);
      setPhotoFile(null);
      setPhotoError(null);
      setPhase("repair_explain");
      return;
    }

    if (id === "diy") {
      setChoice("diy");
      setDiyError(null);
      setDiyMetierId("");
      setDiyPrestationId("");
      setDiyResult(null);
      setDiyRef(null);
      setPhase("diy_loading_ref");
      try {
        const res = await fetch("/api/referentiel-btp");
        if (!res.ok) throw new Error("ref");
        const data = (await res.json()) as SerializedBtpReferentiel;
        setDiyRef(data);
        setPhase("diy_metier");
      } catch {
        setDiyError("Impossible de charger le référentiel métiers. Réessaie plus tard.");
        setPhase("diy_error");
      }
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

  const loadDiyGuide = useCallback(async () => {
    if (!diyMetierId || !diyPrestationId) return;
    setPhase("loading_diy_guide");
    setDiyError(null);
    try {
      const res = await fetch("/api/diy-guide", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          metierId: diyMetierId,
          prestationId: diyPrestationId,
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
        setPhase("diy_prestation");
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
      setPhase("diy_prestation");
    }
  }, [diyMetierId, diyPrestationId, clientSessionId]);

  const submitRepairExplanation = useCallback(async () => {
    const t = repairExplanation.trim();
    if (!t) return;
    setPhase("loading_repair_ack");
    setRepairAckReply(null);
    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ choiceId: "repair", explanation: t, clientSessionId }),
      });
      const reply = await parseReply(res);
      setRepairAckReply(reply ?? FALLBACK_REPAIR_ACK);
    } catch {
      setRepairAckReply(FALLBACK_REPAIR_ACK);
    } finally {
      setPhase("repair_photo");
    }
  }, [repairExplanation, clientSessionId]);

  const finishRepairSkipPhoto = useCallback(async () => {
    const t = repairExplanation.trim();
    if (!t) return;
    setPhase("loading_repair_final");
    setFinalReply(null);
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
      setFinalReply(reply);
    } catch {
      setFinalReply(null);
    } finally {
      setPhase("done");
    }
  }, [repairExplanation, clientSessionId]);

  const finishRepairWithPhoto = useCallback(async () => {
    const t = repairExplanation.trim();
    if (!t || !photoFile) return;
    setPhotoError(null);
    if (photoFile.size > 4 * 1024 * 1024) {
      setPhotoError("Image trop volumineuse (max 4 Mo).");
      return;
    }
    setPhase("loading_repair_final");
    setFinalReply(null);
    try {
      const { base64, mimeType } = await fileToBase64Payload(photoFile);
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          choiceId: "repair",
          explanation: t,
          imageBase64: base64,
          mimeType,
          clientSessionId,
        }),
      });
      const reply = await parseReply(res);
      setFinalReply(reply);
    } catch {
      setFinalReply(null);
    } finally {
      setPhase("done");
    }
  }, [repairExplanation, photoFile, clientSessionId]);

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

                  {(phase === "repair_explain" || phase === "loading_repair_ack") && (
                    <>
                      <Bubble role="assistant">
                        <p>
                          Explique-moi ce qu’il faut réparer : matériau, symptômes, depuis quand… Plus c’est
                          précis, mieux je peux t’aider ensuite.
                        </p>
                      </Bubble>
                      <div className="space-y-2 pt-0.5">
                        <label htmlFor={explainId} className="sr-only">
                          Description du problème à réparer
                        </label>
                        <textarea
                          id={explainId}
                          value={repairExplanation}
                          onChange={(e) => setRepairExplanation(e.target.value)}
                          readOnly={phase === "loading_repair_ack"}
                          rows={4}
                          placeholder="Ex. : joint de douche qui fuit depuis une semaine…"
                          className="w-full resize-y rounded-xl border border-ink/15 bg-canvas-muted/30 px-3 py-2 text-sm text-ink placeholder:text-ink-soft/70 read-only:opacity-80 focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent/25 dark:border-white/15 dark:bg-white/5"
                        />
                        <button
                          type="button"
                          onClick={() => void submitRepairExplanation()}
                          disabled={repairExplanation.trim().length === 0 || phase === "loading_repair_ack"}
                          className="w-full rounded-xl bg-teal-700 px-3 py-2.5 text-sm font-bold text-white shadow-md shadow-teal-950/25 transition enabled:hover:bg-teal-800 disabled:cursor-not-allowed disabled:opacity-50 dark:bg-teal-600 enabled:dark:hover:bg-teal-500"
                        >
                          {phase === "loading_repair_ack" ? "Envoi…" : "Continuer"}
                        </button>
                      </div>
                    </>
                  )}

                  {choice === "repair" &&
                    repairExplanation.trim() &&
                    ["repair_photo", "loading_repair_final", "done"].includes(phase) && (
                      <>
                        <Bubble role="user">
                          <p className="whitespace-pre-wrap">{repairExplanation.trim()}</p>
                        </Bubble>
                        <Bubble role="assistant">
                          <>
                            {splitParagraphs(repairAckReply ?? FALLBACK_REPAIR_ACK).map((p, i) => (
                              <p
                                key={i}
                                className={i > 0 ? "mt-2 whitespace-pre-line" : "whitespace-pre-line"}
                              >
                                {p}
                              </p>
                            ))}
                            {phase === "loading_repair_final" && (
                              <div className="mt-2 flex items-center gap-2 border-t border-ink/10 pt-2 text-xs text-ink-soft dark:border-white/10">
                                <span
                                  className="inline-block h-3.5 w-3.5 shrink-0 animate-spin rounded-full border-2 border-accent border-t-transparent"
                                  aria-hidden
                                />
                                Analyse en cours…
                              </div>
                            )}
                          </>
                        </Bubble>

                        {(phase === "repair_photo" || phase === "loading_repair_final") && (
                          <div className="space-y-2 rounded-xl border border-dashed border-ink/15 bg-canvas-muted/20 p-3 dark:border-white/15">
                            <p className="text-xs text-ink-soft">
                              Photo optionnelle — analyse uniquement dans cette fenêtre,{" "}
                              <strong className="font-medium text-ink">aucun fichier n’est stocké</strong> sur nos
                              serveurs.
                            </p>
                            <label htmlFor={photoInputId} className="block text-xs font-medium text-ink">
                              Ajouter une photo
                            </label>
                            <input
                              id={photoInputId}
                              type="file"
                              accept="image/jpeg,image/png,image/webp,image/gif"
                              onChange={onPhotoChange}
                              disabled={phase === "loading_repair_final"}
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
                                disabled={!photoFile || phase === "loading_repair_final"}
                                className="rounded-xl bg-teal-700 px-3 py-2 text-xs font-bold text-white shadow-md transition enabled:hover:bg-teal-800 disabled:cursor-not-allowed disabled:opacity-50 dark:bg-teal-600 enabled:dark:hover:bg-teal-500"
                              >
                                Analyser la photo
                              </button>
                              <button
                                type="button"
                                onClick={() => void finishRepairSkipPhoto()}
                                disabled={phase === "loading_repair_final"}
                                className="text-xs font-medium text-accent hover:underline enabled:cursor-pointer disabled:opacity-50"
                              >
                                Pas de photo — conseils avec mon texte seulement
                              </button>
                            </div>
                          </div>
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
                      <p className="mt-2">
                        <Link
                          href="/"
                          className="inline-flex items-center justify-center rounded-xl bg-teal-700 px-3 py-2 text-xs font-bold text-white shadow-md shadow-teal-950/25 transition hover:bg-teal-800 focus:outline-none focus-visible:ring-2 focus-visible:ring-teal-500 dark:bg-teal-600 dark:hover:bg-teal-500"
                          onClick={() => setOpen(false)}
                        >
                          Recherche d’artisan
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

                  {(phase === "diy_loading_ref" || phase === "diy_metier") && (
                    <>
                      <Bubble role="assistant">
                        <p>
                          D’abord choisis le <strong className="font-medium text-ink">métier</strong> (comme sur
                          le site), puis tu pourras préciser la prestation.
                        </p>
                      </Bubble>
                      {phase === "diy_loading_ref" ? (
                        <LoadingLine />
                      ) : (
                        diyRef && (
                          <div className="space-y-2 pt-0.5">
                            <label className="text-xs font-medium text-ink-soft">Type d’artisan / métier</label>
                            <select
                              value={diyMetierId}
                              onChange={(e) => {
                                setDiyMetierId(e.target.value);
                                setDiyPrestationId("");
                              }}
                              className="w-full rounded-xl border border-ink/15 bg-canvas-muted/30 px-3 py-2 text-sm text-ink focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent/25 dark:border-white/15 dark:bg-white/5"
                            >
                              <option value="">— Choisis un métier —</option>
                              {diyRef.metiers.map((m) => (
                                <option key={m.id} value={m.id}>
                                  {m.label}
                                </option>
                              ))}
                            </select>
                            <button
                              type="button"
                              disabled={!diyMetierId}
                              onClick={() => setPhase("diy_prestation")}
                              className="w-full rounded-xl bg-teal-700 px-3 py-2.5 text-sm font-bold text-white shadow-md shadow-teal-950/25 transition enabled:hover:bg-teal-800 disabled:cursor-not-allowed disabled:opacity-50 dark:bg-teal-600 enabled:dark:hover:bg-teal-500"
                            >
                              Continuer
                            </button>
                          </div>
                        )
                      )}
                    </>
                  )}

                  {phase === "diy_prestation" && diyRef && diyMetierId && (
                    <>
                      <Bubble role="assistant">
                        <p>
                          Métier :{" "}
                          <strong className="font-medium text-ink">
                            {diyRef.metiers.find((m) => m.id === diyMetierId)?.label ?? diyMetierId}
                          </strong>
                          . Choisis maintenant la <strong className="font-medium text-ink">prestation</strong> la
                          plus proche de ton projet.
                        </p>
                      </Bubble>
                      <div className="space-y-2 pt-0.5">
                        <label className="text-xs font-medium text-ink-soft">Prestation</label>
                        <select
                          value={diyPrestationId}
                          onChange={(e) => setDiyPrestationId(e.target.value)}
                          className="w-full rounded-xl border border-ink/15 bg-canvas-muted/30 px-3 py-2 text-sm text-ink focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent/25 dark:border-white/15 dark:bg-white/5"
                        >
                          <option value="">— Choisis une prestation —</option>
                          {(diyRef.prestationsByMetierId[diyMetierId] ?? []).map((a) => (
                            <option key={a.id} value={a.id}>
                              {a.label}
                            </option>
                          ))}
                        </select>
                        {diyError ? <p className="text-xs text-amber-800 dark:text-amber-200">{diyError}</p> : null}
                        <button
                          type="button"
                          disabled={!diyPrestationId}
                          onClick={() => void loadDiyGuide()}
                          className="w-full rounded-xl bg-teal-700 px-3 py-2.5 text-sm font-bold text-white shadow-md shadow-teal-950/25 transition enabled:hover:bg-teal-800 disabled:cursor-not-allowed disabled:opacity-50 dark:bg-teal-600 enabled:dark:hover:bg-teal-500"
                        >
                          Voir le guide
                        </button>
                        <p className="text-[10px] leading-snug text-ink-soft">
                          Le guide est enregistré sur la page{" "}
                          <Link href="/conseils" className="font-medium text-accent underline" onClick={() => setOpen(false)}>
                            Conseils DIY
                          </Link>{" "}
                          pour le référencement (nouvelle fiche si besoin).
                        </p>
                      </div>
                    </>
                  )}

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
            aria-label="T’as une question mon pote? Ouvrir le Bot de ton pote"
          >
            T&apos;as une question mon pote?
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

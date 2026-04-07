"use client";

import { useCallback, useEffect, useId, useMemo, useState } from "react";

import type { SerializedBtpReferentiel } from "@/lib/btp-referentiel-types";
import {
  QUOTE_REQUEST_VERSION,
  getQuoteFieldDefsForPrestation,
  quoteCompletenessScore,
  validateQuoteRequestFields,
  type QuoteFieldDef,
} from "@/lib/quote-request";

type Props = {
  siren: string;
  raisonSociale: string;
  open: boolean;
  onClose: () => void;
};

export function RequestProLeadDialog({ siren, raisonSociale, open, onClose }: Props) {
  const titleId = useId();
  const [ref, setRef] = useState<SerializedBtpReferentiel | null>(null);
  const [refErr, setRefErr] = useState<string | null>(null);
  const [metierId, setMetierId] = useState("");
  const [prestationId, setPrestationId] = useState("");
  const [fieldValues, setFieldValues] = useState<Record<string, string>>({});
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [sessionErr, setSessionErr] = useState<string | null>(null);
  const [uploadedCount, setUploadedCount] = useState(0);
  const [uploadBusy, setUploadBusy] = useState(false);
  const [uploadErr, setUploadErr] = useState<string | null>(null);
  const [aiConsent, setAiConsent] = useState(false);
  const [pending, setPending] = useState(false);
  const [ok, setOk] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    if (!open) {
      setMetierId("");
      setPrestationId("");
      setFieldValues({});
      setSessionId(null);
      setSessionErr(null);
      setUploadedCount(0);
      setUploadErr(null);
      setAiConsent(false);
      setOk(false);
      setErr(null);
      return;
    }
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch("/api/referentiel-btp");
        const data = (await res.json()) as SerializedBtpReferentiel & { error?: string };
        if (!res.ok || (data as { error?: string }).error) {
          if (!cancelled) setRefErr("Référentiel indisponible — tu peux quand même envoyer un message libre.");
          return;
        }
        if (!cancelled) {
          setRef(data);
          setRefErr(null);
        }
      } catch {
        if (!cancelled) setRefErr("Référentiel indisponible — tu peux quand même envoyer un message libre.");
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [open]);

  useEffect(() => {
    if (!open) return;
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch("/api/quote-request/session", { method: "POST" });
        const data = (await res.json()) as { sessionId?: string };
        if (!res.ok || !data.sessionId) {
          if (!cancelled) setSessionErr("Session photo indisponible (tu peux quand même envoyer des liens).");
          return;
        }
        if (!cancelled) {
          setSessionId(data.sessionId);
          setSessionErr(null);
        }
      } catch {
        if (!cancelled) setSessionErr("Session photo indisponible (tu peux quand même envoyer des liens).");
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [open]);

  const prestations = useMemo(() => {
    if (!ref || !metierId) return [];
    return ref.prestationsByMetierId[metierId] ?? [];
  }, [ref, metierId]);

  const fieldDefs: QuoteFieldDef[] = useMemo(() => {
    if (!prestationId) return [];
    return getQuoteFieldDefsForPrestation(prestationId);
  }, [prestationId]);

  const completeness = useMemo(() => {
    if (!prestationId || fieldDefs.length === 0) return null;
    return quoteCompletenessScore(fieldDefs, fieldValues);
  }, [prestationId, fieldDefs, fieldValues]);

  const resetQuoteFields = useCallback(() => {
    setPrestationId("");
    setFieldValues({});
    setAiConsent(false);
  }, []);

  const onMetierChange = (id: string) => {
    setMetierId(id);
    resetQuoteFields();
  };

  const onPrestationChange = (id: string) => {
    setPrestationId(id);
    setFieldValues({});
    setAiConsent(false);
  };

  const setField = (key: string, value: string) => {
    setFieldValues((prev) => ({ ...prev, [key]: value }));
  };

  const onPickFiles = async (e: React.ChangeEvent<HTMLInputElement>) => {
    setUploadErr(null);
    const files = e.target.files;
    if (!files?.length) return;
    if (!sessionId) {
      setUploadErr("Session non prête — réessaie dans un instant.");
      e.target.value = "";
      return;
    }
    setUploadBusy(true);
    try {
      for (const file of Array.from(files)) {
        const fd = new FormData();
        fd.set("sessionId", sessionId);
        fd.set("file", file);
        const res = await fetch("/api/quote-request/upload", { method: "POST", body: fd });
        const data = (await res.json()) as { ok?: boolean; error?: string };
        if (!res.ok || !data.ok) {
          setUploadErr(data.error ?? "Upload impossible.");
          break;
        }
        setUploadedCount((c) => c + 1);
      }
    } catch {
      setUploadErr("Upload impossible.");
    } finally {
      setUploadBusy(false);
      e.target.value = "";
    }
  };

  async function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setErr(null);
    setPending(true);
    setOk(false);

    if (prestationId) {
      const check = validateQuoteRequestFields(fieldDefs, fieldValues);
      if (!check.ok) {
        setErr(check.error);
        setPending(false);
        return;
      }
      if (!aiConsent) {
        setErr("Merci d’accepter l’analyse automatisée du dossier pour une demande structurée.");
        setPending(false);
        return;
      }
    }

    try {
      const fd = new FormData(e.currentTarget);
      fd.set("siren", siren);
      if (metierId) fd.set("metierId", metierId);
      else fd.delete("metierId");
      if (prestationId) fd.set("prestationId", prestationId);
      else fd.delete("prestationId");
      if (sessionId) fd.set("uploadSessionId", sessionId);
      else fd.delete("uploadSessionId");

      if (prestationId && fieldDefs.length > 0) {
        const payload: Record<string, unknown> = { v: QUOTE_REQUEST_VERSION };
        for (const d of fieldDefs) {
          const v = (fieldValues[d.key] ?? "").trim();
          if (v) payload[d.key] = v;
        }
        payload.aiConsent = "true";
        fd.set("quoteRequestJson", JSON.stringify(payload));
      }

      const res = await fetch("/api/leads", { method: "POST", body: fd });
      const data = (await res.json()) as { ok?: boolean; error?: string };
      if (!res.ok || !data.ok) {
        setErr(data.error ?? "Impossible d’envoyer la demande.");
        setPending(false);
        return;
      }
      setOk(true);
      setPending(false);
    } catch {
      setErr("Impossible d’envoyer la demande.");
      setPending(false);
    }
  }

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-[80] flex items-end justify-center bg-black/50 p-4 sm:items-center"
      role="presentation"
      onMouseDown={(ev) => {
        if (ev.target === ev.currentTarget) onClose();
      }}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        className="max-h-[min(92vh,820px)] w-full max-w-2xl overflow-y-auto rounded-2xl border border-[var(--card-border)] bg-[var(--card)] p-6 shadow-xl backdrop-blur-md"
      >
        <h2 id={titleId} className="font-[family-name:var(--font-display)] text-xl text-ink">
          Demande à {raisonSociale}
        </h2>
        <p className="mt-2 text-sm text-ink-soft">
          Plus le dossier est complet (photos, surfaces, périmètre), plus le professionnel peut préparer un devis. Les
          photos sont analysées pour une synthèse et des points de vigilance contextualisés (métier + clichés), sans prix
          imposés.
        </p>

        {ok ? (
          <p className="mt-4 rounded-xl border border-emerald-500/30 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-950 dark:text-emerald-100">
            Demande envoyée. Le professionnel reçoit ton dossier ; un brouillon d’analyse peut apparaître sous peu dans son
            espace.
          </p>
        ) : (
          <form onSubmit={submit} className="mt-4 space-y-4">
            {err ? (
              <p className="rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-900 dark:text-red-200">
                {err}
              </p>
            ) : null}
            {refErr ? <p className="text-xs text-amber-800 dark:text-amber-200">{refErr}</p> : null}

            <label className="block">
              <span className="text-xs font-semibold uppercase tracking-wider text-ink-soft">Nom</span>
              <input
                name="fullName"
                required
                className="mt-1 w-full rounded-xl border border-ink/15 bg-[var(--card)] px-3 py-2 text-sm text-ink outline-none focus:border-teal-500/60 dark:border-white/10"
                placeholder="Ex. Camille"
              />
            </label>
            <div className="grid gap-3 sm:grid-cols-2">
              <label className="block">
                <span className="text-xs font-semibold uppercase tracking-wider text-ink-soft">E-mail</span>
                <input
                  name="email"
                  type="email"
                  className="mt-1 w-full rounded-xl border border-ink/15 bg-[var(--card)] px-3 py-2 text-sm text-ink outline-none focus:border-teal-500/60 dark:border-white/10"
                  placeholder="ex. camille@mail.com"
                />
              </label>
              <label className="block">
                <span className="text-xs font-semibold uppercase tracking-wider text-ink-soft">Téléphone</span>
                <input
                  name="phone"
                  className="mt-1 w-full rounded-xl border border-ink/15 bg-[var(--card)] px-3 py-2 text-sm text-ink outline-none focus:border-teal-500/60 dark:border-white/10"
                  placeholder="ex. 06 12 34 56 78"
                />
              </label>
            </div>

            <div className="rounded-xl border border-teal-500/25 bg-teal-500/5 p-4 dark:border-teal-400/20 dark:bg-teal-950/15">
              <p className="text-xs font-semibold uppercase tracking-wider text-teal-900 dark:text-teal-200">
                Dossier pour devis (recommandé)
              </p>
              <p className="mt-1 text-xs text-ink-soft">
                Choisis métier puis prestation : champs adaptés (fuites, peinture, salle de bain, ou générique). Tu peux
                aussi n’envoyer qu’un message libre sans prestation.
              </p>

              <label className="mt-3 block">
                <span className="text-xs font-semibold uppercase tracking-wider text-ink-soft">Métier</span>
                <select
                  value={metierId}
                  onChange={(e) => onMetierChange(e.target.value)}
                  disabled={!ref}
                  className="mt-1 w-full rounded-xl border border-ink/15 bg-[var(--card)] px-3 py-2 text-sm text-ink outline-none focus:border-teal-500/60 disabled:opacity-50 dark:border-white/10"
                >
                  <option value="">— Optionnel —</option>
                  {(ref?.metiers ?? []).map((m) => (
                    <option key={m.id} value={m.id}>
                      {m.label}
                    </option>
                  ))}
                </select>
              </label>

              <label className="mt-3 block">
                <span className="text-xs font-semibold uppercase tracking-wider text-ink-soft">Prestation</span>
                <select
                  value={prestationId}
                  onChange={(e) => onPrestationChange(e.target.value)}
                  disabled={!metierId}
                  className="mt-1 w-full rounded-xl border border-ink/15 bg-[var(--card)] px-3 py-2 text-sm text-ink outline-none focus:border-teal-500/60 disabled:opacity-50 dark:border-white/10"
                >
                  <option value="">{metierId ? "— Choisis une prestation —" : "— D’abord un métier —"}</option>
                  {prestations.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.label}
                    </option>
                  ))}
                </select>
              </label>

              {completeness != null ? (
                <p className="mt-2 text-xs text-ink-soft">
                  Complétude du dossier : <span className="font-semibold text-teal-800 dark:text-teal-200">{completeness}%</span>{" "}
                  — ajoute photos et détails pour un brouillon plus fiable.
                </p>
              ) : null}

              <div className="mt-3 rounded-lg border border-ink/10 bg-[var(--card)]/80 p-3 dark:border-white/10">
                <p className="text-xs font-semibold uppercase tracking-wider text-ink-soft">Photos (jusqu’à 6, max 4 Mo)</p>
                {sessionErr ? <p className="mt-1 text-xs text-amber-800 dark:text-amber-200">{sessionErr}</p> : null}
                {uploadErr ? <p className="mt-1 text-xs text-red-700 dark:text-red-300">{uploadErr}</p> : null}
                <input
                  type="file"
                  accept="image/jpeg,image/png,image/webp"
                  multiple
                  disabled={!sessionId || uploadBusy}
                  onChange={onPickFiles}
                  className="mt-2 block w-full text-xs text-ink-soft file:mr-2 file:rounded-lg file:border-0 file:bg-teal-700 file:px-3 file:py-1.5 file:text-xs file:font-semibold file:text-white"
                />
                {uploadedCount > 0 ? (
                  <p className="mt-1 text-xs text-emerald-800 dark:text-emerald-200">{uploadedCount} fichier(s) prêt(s).</p>
                ) : null}
              </div>

              {fieldDefs.length > 0 ? (
                <div className="mt-4 space-y-3 border-t border-ink/10 pt-4 dark:border-white/10">
                  {fieldDefs.map((d) => (
                    <div key={d.key}>
                      <label className="block">
                        <span className="text-xs font-semibold uppercase tracking-wider text-ink-soft">
                          {d.label}
                          {d.required ? " *" : ""}
                        </span>
                        {d.type === "textarea" ? (
                          <textarea
                            value={fieldValues[d.key] ?? ""}
                            onChange={(e) => setField(d.key, e.target.value)}
                            rows={3}
                            maxLength={d.maxLength}
                            placeholder={d.placeholder}
                            required={d.required}
                            className="mt-1 w-full rounded-xl border border-ink/15 bg-[var(--card)] px-3 py-2 text-sm text-ink outline-none focus:border-teal-500/60 dark:border-white/10"
                          />
                        ) : d.type === "select" ? (
                          <select
                            value={fieldValues[d.key] ?? ""}
                            onChange={(e) => setField(d.key, e.target.value)}
                            required={d.required}
                            className="mt-1 w-full rounded-xl border border-ink/15 bg-[var(--card)] px-3 py-2 text-sm text-ink outline-none focus:border-teal-500/60 dark:border-white/10"
                          >
                            {(d.options ?? []).map((o) => (
                              <option key={o.value === "" ? "_empty" : o.value} value={o.value}>
                                {o.label}
                              </option>
                            ))}
                          </select>
                        ) : (
                          <input
                            value={fieldValues[d.key] ?? ""}
                            onChange={(e) => setField(d.key, e.target.value)}
                            type="text"
                            inputMode={d.type === "number" ? "decimal" : undefined}
                            maxLength={d.maxLength}
                            placeholder={d.placeholder}
                            required={d.required}
                            className="mt-1 w-full rounded-xl border border-ink/15 bg-[var(--card)] px-3 py-2 text-sm text-ink outline-none focus:border-teal-500/60 dark:border-white/10"
                          />
                        )}
                      </label>
                    </div>
                  ))}
                </div>
              ) : null}

              {prestationId ? (
                <label className="mt-4 flex cursor-pointer gap-3 rounded-lg border border-violet-500/25 bg-violet-500/5 p-3 dark:border-violet-400/20 dark:bg-violet-950/20">
                  <input
                    type="checkbox"
                    checked={aiConsent}
                    onChange={(e) => setAiConsent(e.target.checked)}
                    className="mt-1 h-4 w-4 shrink-0 rounded border-ink/20 text-teal-700"
                  />
                  <span className="text-xs leading-relaxed text-ink">
                    J’accepte qu’une analyse automatisée (IA) soit réalisée sur les informations et images que j’envoie,
                    uniquement pour produire un brouillon d’aide au devis côté professionnel. Aucun prix définitif n’est
                    imposé ; le pro valide toujours le devis.
                  </span>
                </label>
              ) : null}
            </div>

            <label className="block">
              <span className="text-xs font-semibold uppercase tracking-wider text-ink-soft">Message libre</span>
              <textarea
                name="message"
                rows={4}
                className="mt-1 w-full rounded-xl border border-ink/15 bg-[var(--card)] px-3 py-2 text-sm text-ink outline-none focus:border-teal-500/60 dark:border-white/10"
                placeholder="Tout ce qui complète ta demande : délais, marques, contraintes…"
              />
            </label>
            <button
              type="submit"
              disabled={pending}
              className="w-full rounded-xl bg-teal-700 px-4 py-2.5 text-sm font-bold text-white transition hover:bg-teal-800 disabled:opacity-50 dark:bg-teal-600 dark:hover:bg-teal-500"
            >
              {pending ? "Envoi…" : "Envoyer"}
            </button>
          </form>
        )}

        <button
          type="button"
          onClick={onClose}
          className="mt-5 w-full rounded-xl border border-ink/15 px-4 py-2.5 text-sm font-semibold text-ink transition hover:bg-ink/5 dark:border-white/15 dark:hover:bg-white/5"
        >
          Fermer
        </button>
      </div>
    </div>
  );
}

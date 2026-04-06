"use client";

import { useActionState, useEffect, useMemo, useState } from "react";

import type { SerializedBtpReferentiel } from "@/lib/btp-referentiel-types";
import { getSousActivitesForMetier } from "@/lib/btp-referentiel";
import { proSaveProfileAction } from "@/app/pro/actions";

const initial: { ok: boolean; error?: string } | null = null;

export function ProProfileForm({
  initialProfile,
  referentiel,
}: {
  initialProfile: {
    id: string;
    siren: string;
    verifiedAt: string | null;
    phonePublic: string | null;
    contactLinks: unknown;
    premiumUntil: string | null;
    servesParticuliers: boolean;
    servesProfessionnels: boolean;
    sousActivitesSelection: unknown;
  };
  referentiel: SerializedBtpReferentiel;
}) {
  const [state, formAction, pending] = useActionState(proSaveProfileAction, initial);

  const links = (initialProfile.contactLinks ?? {}) as Record<string, unknown>;
  const [phonePublic, setPhonePublic] = useState(initialProfile.phonePublic ?? "");
  const [website, setWebsite] = useState(typeof links.website === "string" ? links.website : "");
  const [instagram, setInstagram] = useState(typeof links.instagram === "string" ? links.instagram : "");
  const [facebook, setFacebook] = useState(typeof links.facebook === "string" ? links.facebook : "");
  const [linkedin, setLinkedin] = useState(typeof links.linkedin === "string" ? links.linkedin : "");
  const [servesParticuliers, setServesParticuliers] = useState(Boolean(initialProfile.servesParticuliers));
  const [servesProfessionnels, setServesProfessionnels] = useState(Boolean(initialProfile.servesProfessionnels));

  const initialSel =
    initialProfile.sousActivitesSelection && typeof initialProfile.sousActivitesSelection === "object"
      ? (initialProfile.sousActivitesSelection as Record<string, unknown>)
      : {};

  const [metierId, setMetierId] = useState(referentiel.metiers[0]?.id ?? "");
  const [picked, setPicked] = useState<Set<string>>(() => {
    const v = initialSel[metierId];
    return new Set(Array.isArray(v) ? v.filter((x): x is string => typeof x === "string") : []);
  });

  useEffect(() => {
    const v = initialSel[metierId];
    setPicked(new Set(Array.isArray(v) ? v.filter((x): x is string => typeof x === "string") : []));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [metierId]);

  const acts = useMemo(() => getSousActivitesForMetier(referentiel, metierId), [referentiel, metierId]);

  const serializedSelection = useMemo(() => {
    const out: Record<string, string[]> = {};
    for (const m of referentiel.metiers) {
      const v = initialSel[m.id];
      const list = Array.isArray(v) ? v.filter((x): x is string => typeof x === "string") : [];
      if (list.length > 0) out[m.id] = list;
    }
    // On ne merge pas metierId/picked ici, on fait un merge au submit via hidden input.
    return out;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const currentSelectionJson = useMemo(() => {
    const merged = { ...serializedSelection, [metierId]: Array.from(picked.values()) };
    // Nettoyage (évite de stocker des clés vides)
    for (const k of Object.keys(merged)) {
      if (!Array.isArray(merged[k]) || merged[k].length === 0) delete merged[k];
    }
    return JSON.stringify(merged);
  }, [serializedSelection, metierId, picked]);

  return (
    <form action={formAction} className="space-y-6 rounded-2xl border border-[var(--card-border)] bg-[var(--card)] p-6 shadow-sm dark:border-white/10">
      {state?.ok === true ? (
        <p className="rounded-xl border border-emerald-500/30 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-950 dark:text-emerald-100" role="status">
          Profil enregistré.
        </p>
      ) : null}
      {state?.ok === false && state.error ? (
        <p className="rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-900 dark:text-red-200" role="alert">
          {state.error}
        </p>
      ) : null}

      <p className="text-sm text-ink-soft">
        SIREN : <span className="font-medium text-ink">{initialProfile.siren}</span>
      </p>

      <div className="grid gap-4 sm:grid-cols-2">
        <label className="flex flex-col gap-2">
          <span className="text-xs font-semibold uppercase tracking-wider text-ink-soft">Téléphone (public)</span>
          <input
            name="phonePublic"
            value={phonePublic}
            onChange={(e) => setPhonePublic(e.target.value)}
            className="rounded-2xl border border-ink/10 bg-canvas/80 px-4 py-3 text-sm text-ink dark:border-white/10 dark:bg-canvas-muted/40"
            placeholder="ex. 06 12 34 56 78"
          />
        </label>
        <div className="rounded-2xl border border-ink/10 bg-canvas/40 p-4 text-xs text-ink-soft dark:border-white/10 dark:bg-canvas-muted/25">
          Le bouton <strong className="text-ink">Contacter</strong> est visible si ton offre Pro est active (champ{" "}
          <code className="font-mono text-[11px] text-ink">premiumUntil</code> dans le futur).
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <label className="flex flex-col gap-2">
          <span className="text-xs font-semibold uppercase tracking-wider text-ink-soft">Site web</span>
          <input
            name="website"
            value={website}
            onChange={(e) => setWebsite(e.target.value)}
            className="rounded-2xl border border-ink/10 bg-canvas/80 px-4 py-3 text-sm text-ink dark:border-white/10 dark:bg-canvas-muted/40"
            placeholder="https://…"
          />
        </label>
        <label className="flex flex-col gap-2">
          <span className="text-xs font-semibold uppercase tracking-wider text-ink-soft">Instagram</span>
          <input
            name="instagram"
            value={instagram}
            onChange={(e) => setInstagram(e.target.value)}
            className="rounded-2xl border border-ink/10 bg-canvas/80 px-4 py-3 text-sm text-ink dark:border-white/10 dark:bg-canvas-muted/40"
            placeholder="https://instagram.com/…"
          />
        </label>
        <label className="flex flex-col gap-2">
          <span className="text-xs font-semibold uppercase tracking-wider text-ink-soft">Facebook</span>
          <input
            name="facebook"
            value={facebook}
            onChange={(e) => setFacebook(e.target.value)}
            className="rounded-2xl border border-ink/10 bg-canvas/80 px-4 py-3 text-sm text-ink dark:border-white/10 dark:bg-canvas-muted/40"
            placeholder="https://facebook.com/…"
          />
        </label>
        <label className="flex flex-col gap-2">
          <span className="text-xs font-semibold uppercase tracking-wider text-ink-soft">LinkedIn</span>
          <input
            name="linkedin"
            value={linkedin}
            onChange={(e) => setLinkedin(e.target.value)}
            className="rounded-2xl border border-ink/10 bg-canvas/80 px-4 py-3 text-sm text-ink dark:border-white/10 dark:bg-canvas-muted/40"
            placeholder="https://linkedin.com/…"
          />
        </label>
      </div>

      <div className="rounded-2xl border border-ink/10 bg-canvas/40 p-4 dark:border-white/10 dark:bg-canvas-muted/25">
        <p className="text-xs font-semibold uppercase tracking-wider text-ink-soft">Ciblage</p>
        <div className="mt-3 flex flex-wrap gap-4 text-sm text-ink">
          <label className="flex items-center gap-2">
            <input
              type="checkbox"
              name="servesParticuliers"
              checked={servesParticuliers}
              onChange={(e) => setServesParticuliers(e.target.checked)}
              className="text-teal-700 focus:ring-teal-600"
            />
            Particuliers
          </label>
          <label className="flex items-center gap-2">
            <input
              type="checkbox"
              name="servesProfessionnels"
              checked={servesProfessionnels}
              onChange={(e) => setServesProfessionnels(e.target.checked)}
              className="text-teal-700 focus:ring-teal-600"
            />
            Professionnels
          </label>
        </div>
      </div>

      <div className="rounded-2xl border border-ink/10 bg-canvas/40 p-4 dark:border-white/10 dark:bg-canvas-muted/25">
        <p className="text-xs font-semibold uppercase tracking-wider text-ink-soft">Prestations cochées (sous-activités)</p>
        <p className="mt-1 text-xs text-ink-soft">
          Choisis un métier puis coche les prestations que tu assures vraiment. (Stocké dans{" "}
          <code className="font-mono text-[11px] text-ink">sousActivitesSelection</code>)
        </p>

        <div className="mt-4 grid gap-3 sm:grid-cols-2">
          <label className="flex flex-col gap-2">
            <span className="text-xs font-medium text-ink-soft">Métier</span>
            <select
              value={metierId}
              onChange={(e) => setMetierId(e.target.value)}
              className="rounded-xl border border-ink/10 bg-canvas/80 px-3 py-2.5 text-sm text-ink dark:border-white/10 dark:bg-canvas-muted/40"
            >
              {referentiel.metiers.map((m) => (
                <option key={m.id} value={m.id}>
                  {m.label}
                </option>
              ))}
            </select>
          </label>
          <div className="text-xs text-ink-soft">
            {acts.length === 0 ? "Aucune prestation dans ce métier." : `${acts.length} prestations disponibles.`}
          </div>
        </div>

        <div className="mt-4 grid gap-2 sm:grid-cols-2">
          {acts.map((a) => {
            const on = picked.has(a.id);
            return (
              <label
                key={a.id}
                className="flex cursor-pointer items-start gap-2 rounded-xl border border-ink/10 bg-canvas/60 px-3 py-2 text-xs text-ink dark:border-white/10 dark:bg-canvas-muted/35"
              >
                <input
                  type="checkbox"
                  checked={on}
                  onChange={(e) => {
                    const next = new Set(picked);
                    if (e.target.checked) next.add(a.id);
                    else next.delete(a.id);
                    setPicked(next);
                  }}
                  className="mt-0.5 text-teal-700 focus:ring-teal-600"
                />
                <span>{a.label}</span>
              </label>
            );
          })}
        </div>

        <input type="hidden" name="sousActivitesSelection" value={currentSelectionJson} />
      </div>

      <button
        type="submit"
        disabled={pending}
        className="w-full rounded-2xl bg-teal-700 px-4 py-3 text-sm font-bold text-white shadow-md shadow-teal-950/25 transition enabled:hover:bg-teal-800 disabled:cursor-not-allowed disabled:opacity-50 dark:bg-teal-600 enabled:dark:hover:bg-teal-500"
      >
        {pending ? "Sauvegarde…" : "Enregistrer"}
      </button>
    </form>
  );
}


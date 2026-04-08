"use client";

import { useActionState, useEffect, useState } from "react";

import { deleteLaborProfileAction, updateLaborProfileAction } from "@/app/pro/chantiers/pilotage.actions";

const initial: { ok: boolean; error?: string } | null = null;

export function LaborProfileRow({
  profileId,
  label: initialLabel,
  internalTjmCents,
}: {
  profileId: string;
  label: string;
  internalTjmCents: number;
}) {
  const [updState, updateAction, updPending] = useActionState(updateLaborProfileAction, initial);
  const [delState, deleteAction, delPending] = useActionState(deleteLaborProfileAction, initial);
  const [label, setLabel] = useState(initialLabel);
  const [tjm, setTjm] = useState(String(Math.round(internalTjmCents) / 100));

  useEffect(() => {
    setLabel(initialLabel);
    setTjm(String(Math.round(internalTjmCents) / 100));
  }, [initialLabel, internalTjmCents]);

  return (
    <li className="rounded-xl border border-ink/10 bg-canvas/40 p-4 dark:border-white/10 dark:bg-canvas-muted/20">
      <form action={updateAction} className="grid gap-3 sm:grid-cols-[1fr_1fr_auto] sm:items-end">
        <input type="hidden" name="profileId" value={profileId} />
        <label className="flex flex-col gap-1">
          <span className="text-[11px] font-semibold uppercase tracking-wider text-ink-soft">Libellé</span>
          <input
            name="label"
            value={label}
            onChange={(e) => setLabel(e.target.value)}
            maxLength={80}
            className="rounded-lg border border-ink/10 bg-canvas/80 px-3 py-2 text-sm text-ink dark:border-white/10 dark:bg-canvas-muted/40"
          />
        </label>
        <label className="flex flex-col gap-1">
          <span className="text-[11px] font-semibold uppercase tracking-wider text-ink-soft">TJM (€/jour)</span>
          <input
            name="internalTjmEuros"
            inputMode="decimal"
            value={tjm}
            onChange={(e) => setTjm(e.target.value)}
            className="rounded-lg border border-ink/10 bg-canvas/80 px-3 py-2 text-sm text-ink dark:border-white/10 dark:bg-canvas-muted/40"
          />
        </label>
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="submit"
            disabled={updPending}
            className="rounded-lg bg-slate-900 px-3 py-2 text-sm font-bold text-white transition hover:bg-slate-800 disabled:opacity-50 dark:bg-white dark:text-slate-950 dark:hover:bg-slate-100"
          >
            {updPending ? "…" : "Enregistrer"}
          </button>
        </div>
        {updState?.ok === false && updState.error ? (
          <p className="text-xs text-red-700 dark:text-red-300 sm:col-span-3">{updState.error}</p>
        ) : null}
        {updState?.ok === true ? <p className="text-xs text-emerald-800 dark:text-emerald-200 sm:col-span-3">Enregistré.</p> : null}
      </form>
      <form action={deleteAction} className="mt-3 flex items-center gap-2 border-t border-ink/10 pt-3 dark:border-white/10">
        <input type="hidden" name="profileId" value={profileId} />
        <button
          type="submit"
          disabled={delPending}
          className="text-xs font-semibold text-red-700 underline-offset-2 hover:underline dark:text-red-300"
        >
          {delPending ? "Suppression…" : "Supprimer ce profil"}
        </button>
        {delState?.ok === false && delState.error ? <span className="text-xs text-red-700 dark:text-red-300">{delState.error}</span> : null}
      </form>
    </li>
  );
}

"use client";

import Link from "next/link";
import { useActionState, useEffect, useState } from "react";

import { updateProjectInternalTjmAction } from "../pilotage.actions";

const initial: { ok: boolean; error?: string } | null = null;

export function InternalTjmForm({
  projectId,
  defaultInternalTjmCents,
}: {
  projectId: string;
  defaultInternalTjmCents: number | null;
}) {
  const [state, formAction, pending] = useActionState(updateProjectInternalTjmAction, initial);
  const [val, setVal] = useState<string>(() =>
    typeof defaultInternalTjmCents === "number" ? String(Math.round(defaultInternalTjmCents) / 100) : "",
  );

  useEffect(() => {
    setVal(typeof defaultInternalTjmCents === "number" ? String(Math.round(defaultInternalTjmCents) / 100) : "");
  }, [defaultInternalTjmCents]);

  return (
    <form action={formAction} className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
      <input type="hidden" name="projectId" value={projectId} />
      <label className="flex flex-1 flex-col gap-1">
        <span className="text-[11px] font-semibold uppercase tracking-wider text-ink-soft">TJM interne (€/jour)</span>
        <input
          name="internalTjmEuros"
          inputMode="decimal"
          value={val}
          onChange={(e) => setVal(e.target.value)}
          placeholder="ex. 450"
          className="rounded-lg border border-ink/10 bg-canvas/80 px-3 py-2 text-sm text-ink dark:border-white/10 dark:bg-canvas-muted/40"
        />
        <span className="text-xs text-ink-soft">
          Repli si aucun profil n’est choisi sur une saisie de temps (8 h = 1 jour). Les profils et TJM par métier se gèrent dans{" "}
          <Link href="/pro/profils-mo" className="font-medium text-teal-700 underline-offset-2 hover:underline dark:text-teal-400">
            Profils temps
          </Link>
          .
        </span>
      </label>

      <div className="flex items-center gap-2">
        <button
          type="submit"
          disabled={pending}
          className="rounded-lg bg-slate-900 px-3 py-2 text-sm font-bold text-white transition hover:bg-slate-800 disabled:opacity-50 dark:bg-white dark:text-slate-950 dark:hover:bg-slate-100"
        >
          {pending ? "Enregistrement…" : "Enregistrer"}
        </button>
        {state?.ok === false && state.error ? <span className="text-xs text-red-700 dark:text-red-300">{state.error}</span> : null}
        {state?.ok === true ? <span className="text-xs text-emerald-800 dark:text-emerald-200">OK</span> : null}
      </div>
    </form>
  );
}


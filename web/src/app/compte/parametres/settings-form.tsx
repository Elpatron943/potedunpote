"use client";

import { useActionState, useEffect, useState } from "react";

import { updateBuyerAccountAction } from "./settings.actions";

const initial: { ok: boolean; error?: string } | null = null;

export function BuyerSettingsForm({ initialName, email }: { initialName: string | null; email: string }) {
  const [state, formAction, pending] = useActionState(updateBuyerAccountAction, initial);
  const [name, setName] = useState((initialName ?? "").trim());

  useEffect(() => {
    setName((initialName ?? "").trim());
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [email]);

  return (
    <form
      action={formAction}
      className="space-y-4 rounded-2xl border border-[var(--card-border)] bg-[var(--card)] p-6 shadow-sm dark:border-white/10"
    >
      {state?.ok === true ? (
        <p
          className="rounded-xl border border-emerald-500/30 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-950 dark:text-emerald-100"
          role="status"
        >
          Paramètres enregistrés.
        </p>
      ) : null}
      {state?.ok === false && state.error ? (
        <p
          className="rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-900 dark:text-red-200"
          role="alert"
        >
          {state.error}
        </p>
      ) : null}

      <div className="grid gap-4 sm:grid-cols-2">
        <label className="flex flex-col gap-1">
          <span className="text-[11px] font-semibold uppercase tracking-wider text-ink-soft">Nom affiché</span>
          <input
            name="name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            maxLength={80}
            className="rounded-xl border border-ink/10 bg-canvas/80 px-4 py-3 text-sm text-ink dark:border-white/10 dark:bg-canvas-muted/40"
            placeholder="Ex. Camille"
          />
          <span className="text-xs text-ink-soft">Optionnel. Utilisé dans le portail et certaines vues.</span>
        </label>

        <div className="rounded-xl border border-ink/10 bg-canvas/40 p-4 text-sm dark:border-white/10 dark:bg-canvas-muted/25">
          <p className="text-[11px] font-semibold uppercase tracking-wider text-ink-soft">E-mail de connexion</p>
          <p className="mt-2 font-mono text-sm text-ink">{email}</p>
          <p className="mt-2 text-xs text-ink-soft">
            La modification de l’e-mail n’est pas encore disponible (elle sera ajoutée avec une vérification par code).
          </p>
        </div>
      </div>

      <button
        type="submit"
        disabled={pending}
        className="rounded-xl bg-teal-700 px-4 py-3 text-sm font-bold text-white transition hover:bg-teal-800 disabled:opacity-50 dark:bg-teal-600 dark:hover:bg-teal-500"
      >
        {pending ? "Enregistrement…" : "Enregistrer"}
      </button>
    </form>
  );
}

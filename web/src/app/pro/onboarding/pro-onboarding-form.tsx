"use client";

import { useActionState } from "react";

import { proOnboardingAction } from "@/app/pro/actions";

const initial: { ok: boolean; error?: string } | null = null;

export function ProOnboardingForm() {
  const [state, formAction, pending] = useActionState(proOnboardingAction, initial);

  return (
    <form action={formAction} className="space-y-5 rounded-2xl border border-ink/10 bg-[var(--card)] p-6 shadow-sm dark:border-white/10">
      {state?.ok === false && state.error ? (
        <p className="rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-900 dark:text-red-200" role="alert">
          {state.error}
        </p>
      ) : null}

      <label className="flex flex-col gap-2 text-left">
        <span className="text-xs font-semibold uppercase tracking-wider text-ink-soft">
          SIREN <span className="text-red-600">*</span>
        </span>
        <input
          name="siren"
          inputMode="numeric"
          autoComplete="off"
          placeholder="9 chiffres (ex. 123456789)"
          required
          className="rounded-2xl border border-ink/10 bg-canvas/80 px-4 py-3 text-sm text-ink placeholder:text-ink-soft/60 focus:border-teal-600 focus:outline-none focus:ring-2 focus:ring-teal-500/30 dark:border-white/10 dark:bg-canvas-muted/40"
        />
        <span className="text-xs text-ink-soft">
          On l’utilise pour relier ton profil Pro à ta fiche entreprise (et pour éviter les doublons).
        </span>
      </label>

      <button
        type="submit"
        disabled={pending}
        className="w-full rounded-2xl bg-teal-700 px-4 py-3 text-sm font-bold text-white shadow-md shadow-teal-950/25 transition enabled:hover:bg-teal-800 disabled:cursor-not-allowed disabled:opacity-50 dark:bg-teal-600 enabled:dark:hover:bg-teal-500"
      >
        {pending ? "Création…" : "Créer mon profil"}
      </button>
    </form>
  );
}


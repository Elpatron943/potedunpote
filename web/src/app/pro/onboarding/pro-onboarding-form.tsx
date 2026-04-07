"use client";

import { useActionState } from "react";

import { proOnboardingAction } from "@/app/pro/actions";

const initial: { ok: boolean; error?: string } | null = null;

export function ProOnboardingForm() {
  const [state, formAction, pending] = useActionState(proOnboardingAction, initial);

  return (
    <form
      action={formAction}
      encType="multipart/form-data"
      className="space-y-5 rounded-2xl border border-ink/10 bg-[var(--card)] p-6 shadow-sm dark:border-white/10"
    >
      {state?.ok === false && state.error ? (
        <p
          className="rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-900 dark:text-red-200"
          role="alert"
        >
          {state.error}
        </p>
      ) : null}

      <label className="flex flex-col gap-2 text-left">
        <span className="text-xs font-semibold uppercase tracking-wider text-ink-soft">
          SIREN de ton entreprise <span className="text-red-600">*</span>
        </span>
        <input
          name="siren"
          inputMode="numeric"
          autoComplete="off"
          placeholder="9 chiffres (ex. 123456789)"
          required
          maxLength={9}
          className="rounded-2xl border border-ink/10 bg-canvas/80 px-4 py-3 text-sm text-ink placeholder:text-ink-soft/60 focus:border-teal-600 focus:outline-none focus:ring-2 focus:ring-teal-500/30 dark:border-white/10 dark:bg-canvas-muted/40"
        />
        <span className="text-xs text-ink-soft">
          Doit correspondre exactement au SIREN figurant sur ton Kbis (9 chiffres, clé INSEE valide).
        </span>
      </label>

      <label className="flex flex-col gap-2 text-left">
        <span className="text-xs font-semibold uppercase tracking-wider text-ink-soft">
          Kbis (scan ou photo) <span className="text-red-600">*</span>
        </span>
        <input
          name="kbis"
          type="file"
          accept="image/jpeg,image/png,image/webp"
          required
          className="rounded-2xl border border-dashed border-ink/20 bg-canvas/50 px-4 py-3 text-sm text-ink file:mr-3 file:rounded-lg file:border-0 file:bg-teal-700 file:px-3 file:py-2 file:text-xs file:font-semibold file:text-white hover:file:bg-teal-800 dark:border-white/15 dark:bg-canvas-muted/30 dark:file:bg-teal-600"
        />
        <span className="text-xs leading-relaxed text-ink-soft">
          Fichier <strong className="font-medium text-ink">JPG, PNG ou WebP</strong>, max. 8&nbsp;Mo. L’extrait
          doit être <strong className="font-medium text-ink">à jour (moins de 3 mois)</strong> : la mention{" "}
          <strong className="font-medium text-ink">« À jour au … »</strong> doit être visible et récente. Le
          SIREN lu sur le document doit correspondre au numéro saisi.
        </span>
      </label>

      <button
        type="submit"
        disabled={pending}
        className="w-full rounded-2xl bg-teal-700 px-4 py-3 text-sm font-bold text-white shadow-md shadow-teal-950/25 transition enabled:hover:bg-teal-800 disabled:cursor-not-allowed disabled:opacity-50 dark:bg-teal-600 enabled:dark:hover:bg-teal-500"
      >
        {pending ? "Vérification en cours…" : "Envoyer pour vérification"}
      </button>
    </form>
  );
}

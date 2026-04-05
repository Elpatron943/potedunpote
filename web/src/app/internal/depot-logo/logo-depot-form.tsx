"use client";

import { useActionState, useCallback, useState } from "react";
import type { LogoDepotState } from "./actions";
import { saveSiteLogo } from "./actions";

const initial: LogoDepotState = { ok: false };

export function LogoDepotForm({ showSecretField }: { showSecretField: boolean }) {
  const [state, formAction, pending] = useActionState(saveSiteLogo, initial);
  const [dragOver, setDragOver] = useState(false);

  const onDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(true);
  }, []);

  const onDragLeave = useCallback(() => setDragOver(false), []);

  const onDrop = useCallback((e: React.DragEvent<HTMLLabelElement>) => {
    e.preventDefault();
    setDragOver(false);
    const input = document.getElementById("logo-file") as HTMLInputElement | null;
    const f = e.dataTransfer.files?.[0];
    if (input && f?.type === "image/png") {
      const dt = new DataTransfer();
      dt.items.add(f);
      input.files = dt.files;
    }
  }, []);

  return (
    <form action={formAction} className="space-y-6">
      {showSecretField ? (
        <div>
          <label htmlFor="depot-secret" className="mb-2 block text-sm font-medium text-ink">
            Secret (LOGO_DEPOT_SECRET)
          </label>
          <input
            id="depot-secret"
            name="secret"
            type="password"
            autoComplete="off"
            required
            className="w-full max-w-md rounded-xl border border-ink/15 bg-card px-4 py-2.5 text-ink outline-none focus:ring-2 focus:ring-teal-600/40 dark:border-white/15"
          />
        </div>
      ) : null}

      <div>
        <label
          htmlFor="logo-file"
          onDragOver={onDragOver}
          onDragLeave={onDragLeave}
          onDrop={onDrop}
          className={`flex cursor-pointer flex-col items-center justify-center rounded-2xl border-2 border-dashed px-6 py-14 text-center transition ${
            dragOver
              ? "border-teal-600 bg-teal-600/5"
              : "border-ink/20 bg-canvas-muted/40 dark:border-white/20"
          }`}
        >
          <span className="text-sm font-medium text-ink">Glisse un fichier PNG ici</span>
          <span className="mt-2 text-xs text-ink-soft">ou clique pour choisir — max. 2 Mo</span>
          <input
            id="logo-file"
            name="logo"
            type="file"
            accept="image/png"
            required
            className="sr-only"
          />
        </label>
      </div>

      <button
        type="submit"
        disabled={pending}
        className="rounded-xl bg-teal-700 px-5 py-2.5 text-sm font-semibold text-white shadow-md transition hover:bg-teal-800 disabled:opacity-60 dark:bg-teal-600 dark:hover:bg-teal-500"
      >
        {pending ? "Enregistrement…" : "Enregistrer comme logo du site"}
      </button>

      {state.error ? (
        <p className="text-sm text-red-700 dark:text-red-400" role="alert">
          {state.error}
        </p>
      ) : null}
      {state.ok ? (
        <p className="text-sm font-medium text-teal-800 dark:text-teal-300" role="status">
          Logo enregistré sous <code className="rounded bg-canvas-muted px-1">public/brand/logo.png</code>
          . Il apparaît dans l’en-tête après rechargement.
        </p>
      ) : null}
    </form>
  );
}

"use client";

import { useActionState } from "react";

import { addVitrinePhotoAction, removeVitrinePhotoAction } from "@/app/pro/vitrine/vitrine.actions";

const initial: { ok: boolean; error?: string } | null = null;

export function VitrinePhotosForm({
  siren,
  photos,
}: {
  siren: string;
  photos: { id: string; storageKey: string; caption: string | null; createdAt: string }[];
}) {
  const [stateAdd, addAction, pendingAdd] = useActionState(addVitrinePhotoAction, initial);
  const [stateRm, rmAction, pendingRm] = useActionState(removeVitrinePhotoAction, initial);

  return (
    <div className="space-y-6">
      {stateAdd?.ok === false && stateAdd.error ? (
        <p className="rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-900 dark:text-red-200">
          {stateAdd.error}
        </p>
      ) : null}
      {stateAdd?.ok === true ? (
        <p className="rounded-xl border border-emerald-500/30 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-950 dark:text-emerald-100">
          Photo ajoutée.
        </p>
      ) : null}

      <form action={addAction} className="space-y-4 rounded-2xl border border-[var(--card-border)] bg-[var(--card)] p-6 shadow-sm dark:border-white/10" encType="multipart/form-data">
        <input type="hidden" name="siren" value={siren} />
        <h2 className="text-lg font-semibold text-ink">Ajouter une photo</h2>
        <label className="flex flex-col gap-2">
          <span className="text-xs font-semibold uppercase tracking-wider text-ink-soft">Image</span>
          <input
            type="file"
            name="photo"
            required
            accept="image/jpeg,image/png,image/webp"
            className="text-sm text-ink file:mr-3 file:rounded-lg file:border-0 file:bg-teal-700 file:px-3 file:py-2 file:text-sm file:font-semibold file:text-white hover:file:bg-teal-800 dark:file:bg-teal-600"
          />
          <span className="text-xs text-ink-soft">JPG, PNG ou WebP — max. 8 Mo.</span>
        </label>
        <label className="flex flex-col gap-2">
          <span className="text-xs font-semibold uppercase tracking-wider text-ink-soft">Légende (optionnel)</span>
          <input
            name="caption"
            className="rounded-xl border border-ink/10 bg-canvas/80 px-3 py-2.5 text-sm text-ink dark:border-white/10 dark:bg-canvas-muted/40"
            placeholder="Ex. Rénovation salle de bain"
            maxLength={140}
          />
        </label>
        <button
          type="submit"
          disabled={pendingAdd}
          className="w-full rounded-xl bg-teal-700 px-4 py-2.5 text-sm font-bold text-white transition hover:bg-teal-800 disabled:opacity-50 dark:bg-teal-600 dark:hover:bg-teal-500"
        >
          {pendingAdd ? "Envoi…" : "Ajouter"}
        </button>
      </form>

      <section className="rounded-2xl border border-[var(--card-border)] bg-[var(--card)] p-6 shadow-sm dark:border-white/10">
        <h2 className="text-lg font-semibold text-ink">Galerie</h2>
        {stateRm?.ok === false && stateRm.error ? (
          <p className="mt-3 rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-900 dark:text-red-200">
            {stateRm.error}
          </p>
        ) : null}
        {photos.length === 0 ? (
          <p className="mt-3 text-sm text-ink-soft">Aucune photo.</p>
        ) : (
          <ul className="mt-4 grid gap-4 sm:grid-cols-2">
            {photos.map((p) => (
              <li key={p.id} className="overflow-hidden rounded-xl border border-ink/10 dark:border-white/10">
                <div className="border-b border-ink/10 bg-canvas-muted/30 px-3 py-2 text-xs text-ink-soft dark:border-white/10">
                  {p.caption ?? "Photo"}
                </div>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={`/api/pro/vitrine/photo?key=${encodeURIComponent(p.storageKey)}`}
                  alt={p.caption ?? "Photo chantier"}
                  className="h-auto max-h-64 w-full object-cover"
                  loading="lazy"
                />
                <form action={rmAction} className="p-3">
                  <input type="hidden" name="photoId" value={p.id} />
                  <button
                    type="submit"
                    disabled={pendingRm}
                    className="w-full rounded-xl border border-red-500/30 bg-red-500/10 px-3 py-2 text-xs font-semibold text-red-900 transition hover:bg-red-500/15 disabled:opacity-50 dark:text-red-200"
                  >
                    Supprimer
                  </button>
                </form>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}


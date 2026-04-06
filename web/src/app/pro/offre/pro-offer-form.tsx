"use client";

import { useActionState } from "react";

import { proSelectOfferAction } from "@/app/pro/actions";

const initial: { ok: boolean; error?: string } | null = null;

const PLANS: { id: string; label: string; price: string; desc: string }[] = [
  { id: "essentiel", label: "Pro Essentiel", price: "10 € / mois", desc: "Bouton Contacter + crédibilité." },
  { id: "relation", label: "Pro Relation", price: "20 € / mois", desc: "Gestion des demandes entrantes." },
  { id: "vitrine", label: "Pro Vitrine", price: "30 € / mois", desc: "Vitrine web + photos chantiers." },
  { id: "pilotage", label: "Pro Pilotage", price: "50 € / mois", desc: "Devis, factures, temps, marge (à venir)." },
];

export function ProOfferForm({ disabled }: { disabled: boolean }) {
  const [state, formAction, pending] = useActionState(proSelectOfferAction, initial);

  return (
    <form action={formAction} className="space-y-6">
      {state?.ok === false && state.error ? (
        <p className="rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-900 dark:text-red-200" role="alert">
          {state.error}
        </p>
      ) : null}
      {state?.ok === true ? (
        <p className="rounded-xl border border-emerald-500/30 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-950 dark:text-emerald-100" role="status">
          Offre enregistrée. Les options Pro sont actives (mode démo).
        </p>
      ) : null}

      <div className="grid gap-4 sm:grid-cols-2">
        {PLANS.map((p) => (
          <label
            key={p.id}
            className="cursor-pointer rounded-2xl border border-[var(--card-border)] bg-[var(--card)] p-5 shadow-sm transition hover:border-accent/35 dark:border-white/10"
          >
            <div className="flex items-start gap-3">
              <input
                type="radio"
                name="planId"
                value={p.id}
                required
                disabled={disabled || pending}
                className="mt-1 text-teal-700 focus:ring-teal-600"
              />
              <div>
                <p className="text-sm font-semibold text-ink">{p.label}</p>
                <p className="mt-1 text-xs text-ink-soft">{p.desc}</p>
                <p className="mt-2 text-sm font-bold text-ink">{p.price}</p>
              </div>
            </div>
          </label>
        ))}
      </div>

      <button
        type="submit"
        disabled={disabled || pending}
        className="w-full rounded-2xl bg-teal-700 px-4 py-3 text-sm font-bold text-white shadow-md shadow-teal-950/25 transition enabled:hover:bg-teal-800 disabled:cursor-not-allowed disabled:opacity-50 dark:bg-teal-600 enabled:dark:hover:bg-teal-500"
      >
        {pending ? "Enregistrement…" : "Activer cette offre"}
      </button>
    </form>
  );
}


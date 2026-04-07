"use client";

import { useActionState, useEffect, useMemo, useState } from "react";
import type { SubmitReviewState } from "@/actions/review";
import { submitReview } from "@/actions/review";
import type { SerializedBtpReferentiel } from "@/lib/btp-referentiel-types";
import {
  getPrestationPriceUnit,
  getSousActivitesForMetier,
} from "@/lib/btp-referentiel";
import {
  btpPriceUnitQuantityHint,
  btpPriceUnitRequiresQuantity,
  btpPriceUnitShortLabel,
} from "@/lib/btp-price-unit";
import {
  formatEurPerCountableUnitFromCents,
  formatEurPerCubicMeterFromCents,
  formatEurPerLinearMeterFromCents,
  formatEurPerSquareMeterFromCents,
} from "@/lib/format-money";

const initial: SubmitReviewState = { ok: null };

function parsePreviewEurosToCents(s: string): number | null {
  const t = s.trim().replace(/\s/g, "").replace(",", ".");
  if (t === "") return null;
  const n = Number(t);
  if (!Number.isFinite(n) || n <= 0) return null;
  const cents = Math.round(n * 100);
  return Number.isSafeInteger(cents) ? cents : null;
}

function parsePreviewPositiveNumber(s: string): number | null {
  const t = s.trim().replace(/\s/g, "").replace(",", ".");
  if (t === "") return null;
  const n = Number(t);
  if (!Number.isFinite(n) || n <= 0) return null;
  return n;
}

export function ReviewForm({
  siren,
  referentiel,
}: {
  siren: string;
  referentiel: SerializedBtpReferentiel;
}) {
  const [state, formAction, pending] = useActionState(submitReview, initial);
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [metierId, setMetierId] = useState("");
  const [specialiteId, setSpecialiteId] = useState("");
  const [amountPaidEuros, setAmountPaidEuros] = useState("");
  const [quantityInput, setQuantityInput] = useState("");
  const [durationMinutes, setDurationMinutes] = useState("");

  const sousActivites = getSousActivitesForMetier(referentiel, metierId);
  const priceUnit =
    metierId !== "" && specialiteId !== ""
      ? getPrestationPriceUnit(referentiel, metierId, specialiteId)
      : null;
  const showQuantity =
    priceUnit != null && btpPriceUnitRequiresQuantity(priceUnit);

  useEffect(() => {
    setSpecialiteId("");
  }, [metierId]);

  useEffect(() => {
    setQuantityInput("");
  }, [priceUnit]);

  const previewPerDenom = useMemo(() => {
    if (!showQuantity || priceUnit == null) return null;
    const cents = parsePreviewEurosToCents(amountPaidEuros);
    if (cents == null) return null;
    if (priceUnit === "M2") {
      const m2 = parsePreviewPositiveNumber(quantityInput);
      if (m2 == null) return null;
      return formatEurPerSquareMeterFromCents(cents, m2);
    }
    if (priceUnit === "ML") {
      const ml = parsePreviewPositiveNumber(quantityInput);
      if (ml == null) return null;
      return formatEurPerLinearMeterFromCents(cents, ml);
    }
    if (priceUnit === "M3") {
      const m3 = parsePreviewPositiveNumber(quantityInput);
      if (m3 == null) return null;
      return formatEurPerCubicMeterFromCents(cents, m3);
    }
    const u = parsePreviewPositiveNumber(quantityInput);
    if (u == null) return null;
    return formatEurPerCountableUnitFromCents(cents, u);
  }, [
    showQuantity,
    priceUnit,
    amountPaidEuros,
    quantityInput,
  ]);

  return (
    <form action={formAction} className="space-y-5">
      <input type="hidden" name="siren" value={siren} />

      {state.ok === true && (
        <p
          className="rounded-xl border border-emerald-500/30 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-950 dark:text-emerald-100"
          role="status"
        >
          Merci ! Ton avis est publié sur cette fiche.
        </p>
      )}
      {state.ok === false && state.error ? (
        <p
          className="rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-900 dark:text-red-200"
          role="alert"
        >
          {state.error}
        </p>
      ) : null}

      <div className="grid gap-3 sm:grid-cols-2">
        <label className="block">
          <span className="text-xs font-semibold uppercase tracking-wider text-ink-soft">
            Prénom <span className="text-red-600">*</span>
          </span>
          <input
            name="firstName"
            autoComplete="given-name"
            required
            value={firstName}
            onChange={(e) => setFirstName(e.target.value)}
            className="mt-1 w-full rounded-xl border border-ink/15 bg-[var(--card)] px-3 py-2 text-sm text-ink outline-none ring-0 focus:border-teal-500/60 dark:border-white/10"
            placeholder="Ex. Camille"
          />
        </label>
        <label className="block">
          <span className="text-xs font-semibold uppercase tracking-wider text-ink-soft">
            Nom <span className="text-red-600">*</span>
          </span>
          <input
            name="lastName"
            autoComplete="family-name"
            required
            value={lastName}
            onChange={(e) => setLastName(e.target.value)}
            className="mt-1 w-full rounded-xl border border-ink/15 bg-[var(--card)] px-3 py-2 text-sm text-ink outline-none ring-0 focus:border-teal-500/60 dark:border-white/10"
            placeholder="Ex. Martin"
          />
        </label>
      </div>

      <p className="rounded-xl border border-ink/10 bg-canvas/50 px-4 py-3 text-xs leading-relaxed text-ink-soft dark:border-white/10 dark:bg-canvas-muted/30">
        Tu peux détailler la <strong className="font-medium text-ink">prestation</strong> et le{" "}
        <strong className="font-medium text-ink">montant payé</strong> pour{" "}
        <strong className="font-medium text-ink">n’importe quelle entreprise</strong> : l’artisan n’a pas
        besoin d’être inscrit ni vérifié sur la plateforme, et aucun abonnement n’est requis de ta part.
      </p>

      <div>
        <span className="text-xs font-semibold uppercase tracking-wider text-ink-soft">
          Note globale <span className="text-red-600">*</span>
        </span>
        <div className="mt-2 flex flex-wrap gap-3">
          {[1, 2, 3, 4, 5].map((n) => (
            <label
              key={n}
              className="flex cursor-pointer items-center gap-2 rounded-xl border border-ink/10 bg-canvas/50 px-3 py-2 text-sm has-[:checked]:border-teal-600 has-[:checked]:bg-teal-500/10 dark:border-white/10 dark:bg-canvas-muted/30 dark:has-[:checked]:border-teal-400"
            >
              <input
                type="radio"
                name="ratingOverall"
                value={String(n)}
                required
                className="text-teal-700 focus:ring-teal-600"
              />
              {n}/5
            </label>
          ))}
        </div>
      </div>

      <div className="rounded-2xl border border-ink/10 bg-canvas/40 p-4 dark:border-white/10 dark:bg-canvas-muted/25">
        <p className="text-xs font-semibold uppercase tracking-wider text-ink-soft">
          Prestation réalisée <span className="font-normal normal-case text-ink-soft/80">(optionnel)</span>
        </p>
        <p className="mt-1 text-xs leading-relaxed text-ink-soft">
          Aide les visiteurs à comparer les prix pour une intervention comparable. Selon la spécialité, tu
          peux indiquer une surface (m²), un linéaire (ml), un volume (m³), une quantité (unités) ou laisser
          vide pour un forfait — le prix par unité adaptée est calculé automatiquement quand c’est pertinent.
        </p>
        <div className="mt-3 grid gap-3 sm:grid-cols-2">
          <label className="flex flex-col gap-2">
            <span className="text-xs font-medium text-ink-soft">Métier</span>
            <select
              name="metierId"
              value={metierId}
              onChange={(e) => setMetierId(e.target.value)}
              className="rounded-xl border border-ink/10 bg-canvas/80 px-3 py-2.5 text-sm text-ink dark:border-white/10 dark:bg-canvas-muted/40"
            >
              <option value="">—</option>
              {referentiel.metiers.map((m) => (
                <option key={m.id} value={m.id}>
                  {m.label}
                </option>
              ))}
            </select>
          </label>
          <label className="flex flex-col gap-2">
            <span className="text-xs font-medium text-ink-soft">Spécialité</span>
            <select
              name="specialiteId"
              value={specialiteId}
              onChange={(e) => setSpecialiteId(e.target.value)}
              disabled={!metierId}
              className="rounded-xl border border-ink/10 bg-canvas/80 px-3 py-2.5 text-sm text-ink disabled:opacity-50 dark:border-white/10 dark:bg-canvas-muted/40"
            >
              <option value="">
                {metierId ? "— Choisis une spécialité —" : "— Choisis d’abord un métier —"}
              </option>
              {sousActivites.map((a) => (
                <option key={a.id} value={a.id}>
                  {a.label} ({btpPriceUnitShortLabel(a.priceUnit)})
                </option>
              ))}
            </select>
          </label>
        </div>
        {priceUnit != null ? (
          <p className="mt-2 text-xs text-ink-soft">
            Unité de comparaison des prix pour cette spécialité :{" "}
            <strong className="text-ink">{btpPriceUnitShortLabel(priceUnit)}</strong>
            {priceUnit === "FORFAIT"
              ? " — indique uniquement le montant total si tu veux."
              : null}
          </p>
        ) : null}
        <label className="mt-3 flex flex-col gap-2">
          <span className="text-xs font-medium text-ink-soft">
            Durée de la prestation (minutes) <span className="font-normal text-ink-soft/75">optionnel</span>
          </span>
          <input
            name="durationMinutes"
            type="text"
            inputMode="numeric"
            autoComplete="off"
            placeholder="ex. 45, 90, 240"
            value={durationMinutes}
            onChange={(e) => setDurationMinutes(e.target.value)}
            className="rounded-xl border border-ink/10 bg-canvas/80 px-3 py-2.5 text-sm text-ink placeholder:text-ink-soft/50 dark:border-white/10 dark:bg-canvas-muted/40"
          />
          <span className="text-xs text-ink-soft">
            Temps réellement passé sur la prestation (hors échanges avant/après si tu ne veux pas compter).
          </span>
        </label>
        <label className="mt-3 flex flex-col gap-2">
          <span className="text-xs font-medium text-ink-soft">
            Montant payé (€) <span className="font-normal text-ink-soft/75">optionnel</span>
          </span>
          <input
            name="amountPaidEuros"
            type="text"
            inputMode="decimal"
            autoComplete="off"
            placeholder="ex. 850 ou 1250,50"
            value={amountPaidEuros}
            onChange={(e) => setAmountPaidEuros(e.target.value)}
            className="rounded-xl border border-ink/10 bg-canvas/80 px-3 py-2.5 text-sm text-ink placeholder:text-ink-soft/50 dark:border-white/10 dark:bg-canvas-muted/40"
          />
          <span className="text-xs text-ink-soft">
            Montant payé pour <strong className="font-medium text-ink">la prestation</strong>. Tu peux préciser ci-dessous
            si ce prix correspondait uniquement à la main d’œuvre / prestation, sans matériel ni outillage.
          </span>
        </label>

        <label className="mt-3 flex items-start gap-2 rounded-xl border border-ink/10 bg-canvas/50 px-3 py-2.5 text-xs text-ink-soft dark:border-white/10 dark:bg-canvas-muted/30">
          <input
            type="checkbox"
            name="pricePrestationOnly"
            defaultChecked
            className="mt-0.5 text-teal-700 focus:ring-teal-600"
          />
          <span>
            Le montant indiqué concerne <strong className="font-medium text-ink">uniquement la prestation</strong> (sans
            fourniture de matériaux, outillage, consommables, gros équipements).
          </span>
        </label>

        {showQuantity && priceUnit != null ? (
          <label className="mt-3 flex flex-col gap-2">
            <span className="text-xs font-medium text-ink-soft">
              {btpPriceUnitQuantityHint(priceUnit)}{" "}
              <span className="font-normal text-ink-soft/75">optionnel</span>
            </span>
            {priceUnit === "M2" ? (
              <input type="hidden" name="surfaceM2" value={quantityInput} />
            ) : priceUnit === "ML" ? (
              <input type="hidden" name="linearMl" value={quantityInput} />
            ) : priceUnit === "M3" ? (
              <input type="hidden" name="volumeM3" value={quantityInput} />
            ) : (
              <input type="hidden" name="quantityUnits" value={quantityInput} />
            )}
            <input
              type="text"
              inputMode="decimal"
              autoComplete="off"
              placeholder={priceUnit === "UNIT" ? "ex. 3 ou 12" : "ex. 12 ou 35,5"}
              value={quantityInput}
              onChange={(e) => setQuantityInput(e.target.value)}
              className="rounded-xl border border-ink/10 bg-canvas/80 px-3 py-2.5 text-sm text-ink placeholder:text-ink-soft/50 dark:border-white/10 dark:bg-canvas-muted/40"
            />
            {previewPerDenom ? (
              <p className="text-sm font-semibold tabular-nums text-teal-800 dark:text-teal-200">
                Prix calculé : {previewPerDenom}
              </p>
            ) : (
              <span className="text-xs text-ink-soft">
                Renseigne le montant payé et {btpPriceUnitShortLabel(priceUnit)} pour afficher le prix par unité.
              </span>
            )}
          </label>
        ) : null}
      </div>

      <label className="flex flex-col gap-2">
        <span className="text-xs font-semibold uppercase tracking-wider text-ink-soft">
          Commentaire
        </span>
        <textarea
          name="comment"
          rows={4}
          maxLength={4000}
          placeholder="Contexte du chantier, sérieux, qualité… (optionnel mais utile)"
          className="w-full rounded-2xl border border-ink/10 bg-canvas/80 px-4 py-3 text-sm text-ink placeholder:text-ink-soft/60 focus:border-teal-600 focus:outline-none focus:ring-2 focus:ring-teal-500/30 dark:border-white/10 dark:bg-canvas-muted/40"
        />
      </label>

      <div className="grid gap-4 sm:grid-cols-2">
        <label className="flex flex-col gap-2">
          <span className="text-xs font-semibold uppercase tracking-wider text-ink-soft">
            Rapport qualité / prix (ressenti)
          </span>
          <select
            name="priceBracket"
            className="rounded-2xl border border-ink/10 bg-canvas/80 px-4 py-3 text-sm text-ink dark:border-white/10 dark:bg-canvas-muted/40"
            defaultValue=""
          >
            <option value="">—</option>
            <option value="UNDER_EXPECTED">Moins cher que prévu</option>
            <option value="AS_EXPECTED">Conforme au prévu</option>
            <option value="ABOVE_EXPECTED">Un peu au-dessus</option>
            <option value="MUCH_ABOVE">Nettement au-dessus</option>
          </select>
        </label>
        <label className="flex flex-col gap-2">
          <span className="text-xs font-semibold uppercase tracking-wider text-ink-soft">
            Délais annoncés
          </span>
          <select
            name="deadlinesKept"
            className="rounded-2xl border border-ink/10 bg-canvas/80 px-4 py-3 text-sm text-ink dark:border-white/10 dark:bg-canvas-muted/40"
            defaultValue=""
          >
            <option value="">—</option>
            <option value="YES">Respectées</option>
            <option value="PARTIAL">Partiellement</option>
            <option value="NO">Non respectées</option>
          </select>
        </label>
        <label className="flex flex-col gap-2">
          <span className="text-xs font-semibold uppercase tracking-wider text-ink-soft">
            Disponibilité / réactivité
          </span>
          <select
            name="availability"
            className="rounded-2xl border border-ink/10 bg-canvas/80 px-4 py-3 text-sm text-ink dark:border-white/10 dark:bg-canvas-muted/40"
            defaultValue=""
          >
            <option value="">—</option>
            <option value="EASY">Facile à joindre</option>
            <option value="OK">Correct</option>
            <option value="DIFFICULT">Difficile</option>
          </select>
        </label>
        <label className="flex flex-col gap-2">
          <span className="text-xs font-semibold uppercase tracking-wider text-ink-soft">
            Mode de paiement principal
          </span>
          <select
            name="paymentType"
            className="rounded-2xl border border-ink/10 bg-canvas/80 px-4 py-3 text-sm text-ink dark:border-white/10 dark:bg-canvas-muted/40"
            defaultValue=""
          >
            <option value="">—</option>
            <option value="BANK_TRANSFER">Virement</option>
            <option value="CHECK">Chèque</option>
            <option value="CASH">Espèces</option>
            <option value="CARD">Carte</option>
            <option value="INSTALLMENTS">Échelonné</option>
            <option value="OTHER">Autre</option>
          </select>
        </label>
        <label className="flex flex-col gap-2 sm:col-span-2">
          <span className="text-xs font-semibold uppercase tracking-wider text-ink-soft">
            Montant payé vs devis initial
          </span>
          <select
            name="quoteVsPaid"
            className="rounded-2xl border border-ink/10 bg-canvas/80 px-4 py-3 text-sm text-ink dark:border-white/10 dark:bg-canvas-muted/40"
            defaultValue=""
          >
            <option value="">—</option>
            <option value="MATCHED">Conforme au devis</option>
            <option value="SLIGHTLY_OVER">Légèrement au-dessus</option>
            <option value="MUCH_OVER">Très au-dessus</option>
            <option value="UNDER">En dessous du devis</option>
          </select>
        </label>
      </div>

      <label className="flex cursor-pointer items-start gap-3 rounded-2xl border border-ink/10 bg-canvas/40 p-4 dark:border-white/10 dark:bg-canvas-muted/25">
        <input
          type="checkbox"
          name="attest"
          value="on"
          required
          className="mt-1 h-4 w-4 rounded border-ink/20 text-teal-700 focus:ring-teal-600"
        />
        <span className="text-sm leading-relaxed text-ink">
          J’atteste sur l’honneur avoir fait appel à cette entreprise pour des travaux ou une prestation
          (informations sincères et conformes à ma connaissance).
        </span>
      </label>

      <button
        type="submit"
        disabled={pending || state.ok === true}
        className="w-full min-h-[3rem] rounded-2xl bg-teal-700 px-6 py-3 text-sm font-bold text-white shadow-md transition hover:bg-teal-800 disabled:pointer-events-none disabled:opacity-50 dark:bg-teal-600 dark:hover:bg-teal-500"
      >
        {pending ? "Envoi…" : state.ok === true ? "Avis envoyé" : "Envoyer mon avis"}
      </button>
    </form>
  );
}

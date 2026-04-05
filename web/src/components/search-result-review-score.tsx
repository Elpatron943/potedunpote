/** Affichage note moyenne + étoiles (résultats recherche). `compact` pour la barre d’action en bas de carte. */
export function SearchResultReviewScore({
  avg,
  count,
  compact,
}: {
  avg: number;
  count: number;
  compact?: boolean;
}) {
  const label = avg.toFixed(1).replace(".", ",");
  const full = Math.min(5, Math.max(0, Math.round(avg)));
  const empty = 5 - full;

  return (
    <p
      className={`flex flex-wrap items-center gap-x-2 gap-y-0.5 ${compact ? "text-xs sm:text-sm" : "mt-2 text-sm"}`}
      aria-label={`Note moyenne ${label} sur 5, ${count} avis`}
    >
      <span className="text-amber-600 dark:text-amber-400" aria-hidden>
        {"★".repeat(full)}
        <span className="text-ink/25 dark:text-white/25">{"★".repeat(empty)}</span>
      </span>
      <span className="font-semibold tabular-nums text-ink">{label}/5</span>
      <span className="text-ink-soft">· {count} avis</span>
    </p>
  );
}

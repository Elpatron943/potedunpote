"use client";

import { useCallback, useEffect, useId, useMemo, useRef, useState } from "react";
import { getSousActivitesForMetier } from "@/lib/btp-sous-activites";

type MetierOpt = { id: string; label: string };

type BanMunicipalityProperties = {
  label?: string;
  city?: string;
  postcode?: string;
  context?: string;
};

type Suggestion = {
  key: string;
  label: string;
  /** Valeur envoyée dans `loc` (code postal prioritaire quand disponible) */
  locValue: string;
};

function parseBanFeatures(data: unknown): Suggestion[] {
  if (!data || typeof data !== "object" || !("features" in data)) return [];
  const features = (data as { features: unknown[] }).features;
  if (!Array.isArray(features)) return [];

  const out: Suggestion[] = [];
  for (const f of features) {
    if (!f || typeof f !== "object" || !("properties" in f)) continue;
    const p = (f as { properties: BanMunicipalityProperties & { id?: string } }).properties;
    const city = (p.city ?? "").trim();
    const postcode = (p.postcode ?? "").trim();
    const rawLabel = (p.label ?? "").trim();
    const context = (p.context ?? "").trim();

    const title =
      postcode && city
        ? `${postcode} ${city}`
        : rawLabel || [postcode, city].filter(Boolean).join(" ") || "Commune";

    const label = context ? `${title} · ${context}` : title;

    let locValue: string;
    if (/^\d{5}$/.test(postcode)) {
      locValue = postcode;
    } else if (city) {
      locValue = city;
    } else {
      locValue = rawLabel || title;
    }

    const key = `${p.id ?? ""}-${postcode}-${city}-${out.length}`;
    out.push({ key, label, locValue });
  }
  return out;
}

function asStringArray(v: string[] | undefined): string[] {
  return Array.isArray(v) ? v : [];
}

export function HomeSearchForm({
  metiers,
  defaultMetier,
  defaultLoc,
  defaultRge,
  defaultActs,
  defaultMinStars,
  defaultEntreprise,
}: {
  metiers: MetierOpt[];
  defaultMetier: string;
  defaultLoc: string;
  defaultRge: boolean;
  /** Sous-activités cochées (ids valides pour le métier courant), depuis l’URL. */
  defaultActs?: string[];
  /** Moyenne minimale des avis publiés (1–5), depuis l’URL (`stars`). */
  defaultMinStars?: number | null;
  /** Recherche directe SIREN / SIRET / raison sociale (`entreprise`). */
  defaultEntreprise?: string;
}) {
  const [searchMode, setSearchMode] = useState<"metier" | "direct">(() =>
    (defaultEntreprise ?? "").trim().length > 0 ? "direct" : "metier",
  );
  const [entrepriseDirect, setEntrepriseDirect] = useState(() =>
    (defaultEntreprise ?? "").trim(),
  );

  const [metier, setMetier] = useState(defaultMetier);
  const [acts, setActs] = useState<string[]>(() => asStringArray(defaultActs));

  const sousActivites = useMemo(() => getSousActivitesForMetier(metier), [metier]);

  const [locDisplay, setLocDisplay] = useState(defaultLoc);
  const [locSubmit, setLocSubmit] = useState(defaultLoc);
  const [suggestions, setSuggestions] = useState<Suggestion[]>([]);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const wrapRef = useRef<HTMLDivElement>(null);
  const listId = useId();
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    function onDocMouseDown(e: MouseEvent) {
      if (!wrapRef.current?.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", onDocMouseDown);
    return () => document.removeEventListener("mousedown", onDocMouseDown);
  }, []);

  const fetchSuggestions = useCallback(async (query: string) => {
    const q = query.trim();
    if (q.length < 2) {
      setSuggestions([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      const url = new URL("https://api-adresse.data.gouv.fr/search/");
      url.searchParams.set("q", q);
      url.searchParams.set("type", "municipality");
      url.searchParams.set("limit", "10");
      const res = await fetch(url.toString());
      if (!res.ok) {
        setSuggestions([]);
        return;
      }
      const data = await res.json();
      setSuggestions(parseBanFeatures(data));
    } catch {
      setSuggestions([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    const q = locDisplay.trim();
    if (q.length < 2) {
      setSuggestions([]);
      setLoading(false);
      return;
    }
    debounceRef.current = setTimeout(() => {
      void fetchSuggestions(q);
    }, 300);
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [locDisplay, fetchSuggestions]);

  function pickSuggestion(s: Suggestion) {
    setLocDisplay(s.label);
    setLocSubmit(s.locValue);
    setOpen(false);
    setSuggestions([]);
  }

  function handleLocKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === "Enter") {
      e.preventDefault();
      if (open && suggestions.length > 0) {
        pickSuggestion(suggestions[0]);
      }
    }
    if (e.key === "Escape") setOpen(false);
  }

  const inputClass =
    "w-full rounded-2xl border border-ink/10 bg-canvas/80 px-4 py-3.5 text-base text-ink shadow-sm transition placeholder:text-ink-soft/70 focus:border-accent focus:outline-none focus:ring-4 focus:ring-[var(--accent-glow)] dark:border-white/10 dark:bg-canvas-muted/50";

  const modeBtnClass = (active: boolean) =>
    `flex-1 rounded-xl px-4 py-3 text-sm font-semibold transition sm:flex-none ${
      active
        ? "bg-teal-700 text-white shadow-sm dark:bg-teal-600"
        : "text-ink-soft hover:bg-canvas-muted/70 hover:text-ink dark:hover:bg-white/5"
    }`;

  return (
    <form method="get" action="/" className="space-y-5">
      <div
        className="flex flex-col gap-2 rounded-2xl border border-ink/10 bg-canvas/40 p-1.5 dark:border-white/10 dark:bg-canvas-muted/25"
        role="group"
        aria-label="Mode de recherche"
      >
        <div className="flex flex-col gap-1 sm:flex-row">
          <button
            type="button"
            className={modeBtnClass(searchMode === "metier")}
            onClick={() => setSearchMode("metier")}
          >
            Métier & lieu
          </button>
          <button
            type="button"
            className={modeBtnClass(searchMode === "direct")}
            onClick={() => setSearchMode("direct")}
          >
            SIREN, SIRET ou raison sociale
          </button>
        </div>
        <p className="px-2 pb-1 text-xs text-ink-soft">
          {searchMode === "metier"
            ? "Filtre par famille BTP et zone (codes NAF du site)."
            : "Sans filtre par famille BTP — toute activité peut apparaître."}
        </p>
      </div>

      {searchMode === "direct" ? (
        <>
          <input type="hidden" name="metier" value="" />
          <input type="hidden" name="loc" value="" />
          <label className="flex flex-col gap-2">
            <span className="text-xs font-semibold uppercase tracking-wider text-ink-soft">
              SIREN, SIRET ou dénomination sociale
            </span>
            <input
              name="entreprise"
              type="search"
              required
              value={entrepriseDirect}
              onChange={(e) => setEntrepriseDirect(e.target.value)}
              placeholder="ex. 817844012, 81784401200015 ou OK PLOMBERIE…"
              autoComplete="off"
              className={inputClass}
            />
            <span className="text-xs text-ink-soft">
              9 chiffres (SIREN), 14 chiffres (SIRET) ou texte pour la raison sociale (min. 2 caractères).
            </span>
          </label>
        </>
      ) : (
        <>
          <input type="hidden" name="entreprise" value="" />
          <input type="hidden" name="loc" value={locSubmit} />

          <div className="grid gap-4 sm:grid-cols-2">
            <label className="group flex flex-col gap-2">
              <span className="text-xs font-semibold uppercase tracking-wider text-ink-soft">
                Type d&apos;artisan
              </span>
              <div className="relative">
                <select
                  name="metier"
                  required
                  value={metier}
                  onChange={(e) => {
                    const next = e.target.value;
                    setMetier(next);
                    const allowed = new Set(getSousActivitesForMetier(next).map((a) => a.id));
                    setActs((prev) => asStringArray(prev).filter((id) => allowed.has(id)));
                  }}
                  className="select-home w-full cursor-pointer rounded-2xl border border-ink/10 bg-canvas/80 py-3.5 pl-4 pr-4 text-base text-ink shadow-sm transition focus:border-accent focus:outline-none focus:ring-4 focus:ring-[var(--accent-glow)] dark:border-white/10 dark:bg-canvas-muted/50"
                >
                  <option value="" disabled>
                    Choisis un métier…
                  </option>
                  {metiers.map((m) => (
                    <option key={m.id} value={m.id}>
                      {m.label}
                    </option>
                  ))}
                </select>
              </div>
            </label>

            <div ref={wrapRef} className="relative flex flex-col gap-2">
              <label
                htmlFor={listId + "-input"}
                className="text-xs font-semibold uppercase tracking-wider text-ink-soft"
              >
                Où ?{" "}
                <span className="font-normal normal-case text-ink-soft/80">(ville ou code postal)</span>
              </label>
              <input
                id={listId + "-input"}
                type="text"
                required
                autoComplete="off"
                value={locDisplay}
                onChange={(e) => {
                  setLocDisplay(e.target.value);
                  setLocSubmit(e.target.value);
                  setOpen(true);
                }}
                onFocus={() => setOpen(true)}
                onKeyDown={handleLocKeyDown}
                placeholder="Tape pour voir des suggestions…"
                aria-expanded={open}
                aria-controls={listId}
                aria-autocomplete="list"
                role="combobox"
                className={inputClass}
              />
              {open && (suggestions.length > 0 || loading) && (
                <ul
                  id={listId}
                  role="listbox"
                  className="absolute left-0 right-0 top-full z-[200] mt-1 max-h-64 overflow-auto rounded-2xl border border-ink/15 bg-white py-1 shadow-2xl ring-1 ring-black/5 dark:border-zinc-600 dark:bg-zinc-900 dark:ring-white/10"
                >
                  {loading && suggestions.length === 0 && (
                    <li className="px-4 py-3 text-sm text-ink-soft">Recherche…</li>
                  )}
                  {suggestions.map((s) => (
                    <li key={s.key} role="option">
                      <button
                        type="button"
                        className="w-full px-4 py-2.5 text-left text-sm text-ink transition hover:bg-teal-50 dark:hover:bg-teal-950/60"
                        onMouseDown={(e) => e.preventDefault()}
                        onClick={() => pickSuggestion(s)}
                      >
                        <span className="block font-medium">{s.label}</span>
                        <span className="mt-0.5 block font-mono text-xs text-ink-soft">
                          critère localisation : {s.locValue}
                        </span>
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>
        </>
      )}

      {searchMode === "metier" && sousActivites.length > 0 && (
        <fieldset className="rounded-2xl border border-ink/10 bg-canvas/40 p-4 dark:border-white/10 dark:bg-canvas-muted/25">
          <legend className="px-1 text-xs font-semibold uppercase tracking-wider text-ink-soft">
            Prestations précises <span className="font-normal normal-case text-ink-soft/80">(optionnel)</span>
          </legend>
          <p className="mb-3 text-xs leading-relaxed text-ink-soft">
            Coche ce que tu cherches : le type d’artisan est filtré par code d’activité (NAF), pas par mots
            dans le nom. Les artisans Pro ayant indiqué la même prestation sur la plateforme sont mis en
            tête des résultats.
          </p>
          {asStringArray(acts).map((id) => (
            <input key={id} type="hidden" name="act" value={id} />
          ))}
          <ul className="max-h-52 space-y-2 overflow-y-auto pr-1 sm:max-h-none sm:columns-2 sm:gap-x-6 sm:[&>li]:break-inside-avoid">
            {sousActivites.map((a) => {
              const checked = asStringArray(acts).includes(a.id);
              return (
                <li key={a.id}>
                  <label className="flex cursor-pointer items-start gap-2.5 rounded-xl py-1.5 pl-1 transition hover:bg-ink/[0.03] dark:hover:bg-white/[0.04]">
                    <input
                      type="checkbox"
                      checked={checked}
                      onChange={() => {
                        setActs((prev) => {
                          const p = asStringArray(prev);
                          return checked ? p.filter((x) => x !== a.id) : [...p, a.id];
                        });
                      }}
                      className="mt-0.5 h-4 w-4 shrink-0 rounded border-ink/20 text-teal-700 focus:ring-teal-600 dark:text-teal-500"
                    />
                    <span className="text-sm leading-snug text-ink">{a.label}</span>
                  </label>
                </li>
              );
            })}
          </ul>
        </fieldset>
      )}

      <label className="flex flex-col gap-2 rounded-2xl border border-ink/10 bg-canvas/50 p-4 dark:border-white/10 dark:bg-canvas-muted/30">
        <span className="text-xs font-semibold uppercase tracking-wider text-ink-soft">
          Note minimale (avis clients publiés)
        </span>
        <select
          name="stars"
          defaultValue={defaultMinStars != null ? String(defaultMinStars) : ""}
          className="w-full cursor-pointer rounded-xl border border-ink/10 bg-canvas/80 py-3 pl-3 pr-3 text-sm text-ink dark:border-white/10 dark:bg-canvas-muted/40"
        >
          <option value="">Toutes (pas de filtre par note)</option>
          <option value="5">5★ et plus (moyenne ≥ 5)</option>
          <option value="4">4★ et plus</option>
          <option value="3">3★ et plus</option>
          <option value="2">2★ et plus</option>
          <option value="1">1★ et plus</option>
        </select>
        <span className="text-xs leading-relaxed text-ink-soft">
          Basé sur la moyenne des avis <strong className="font-medium text-ink">publiés</strong> sur
          la plateforme. Les entreprises sans avis ne s’affichent pas si tu filtres. Le filtre
          s’applique à chaque page de résultats (échantillon élargi à 25 lignes).
        </span>
      </label>

      <label className="flex cursor-pointer items-start gap-3 rounded-2xl border border-ink/10 bg-canvas/50 p-4 transition hover:border-accent/25 dark:border-white/10 dark:bg-canvas-muted/30">
        <input
          type="checkbox"
          name="rge"
          value="1"
          defaultChecked={defaultRge}
          className="mt-1 h-4 w-4 shrink-0 rounded border-ink/20 text-accent focus:ring-accent"
        />
        <span>
          <span className="block text-sm font-semibold text-ink">
            Uniquement des entreprises RGE
          </span>
          <span className="mt-0.5 block text-xs leading-relaxed text-ink-soft">
            N’affiche que les entreprises pour lesquelles un statut RGE est signalé dans les données
            (rénovation énergétique, etc.).
          </span>
        </span>
      </label>

      <div className="pt-1">
        <button
          type="submit"
          aria-label="Lancer la recherche d’artisans"
          className="group relative flex w-full min-h-[3.25rem] items-center justify-center gap-2 rounded-2xl border-2 border-teal-900/40 bg-teal-700 px-6 py-4 text-lg font-bold tracking-tight text-white shadow-lg shadow-teal-950/35 transition hover:bg-teal-800 focus:outline-none focus-visible:ring-4 focus-visible:ring-teal-600/50 focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--canvas)] dark:border-teal-300/35 dark:bg-teal-600 dark:text-white dark:hover:bg-teal-500 dark:shadow-black/50 dark:focus-visible:ring-teal-400/40 dark:ring-offset-[var(--canvas)]"
        >
          Rechercher
          <span
            className="text-xl transition-transform group-hover:translate-x-1"
            aria-hidden
          >
            →
          </span>
        </button>
      </div>
    </form>
  );
}

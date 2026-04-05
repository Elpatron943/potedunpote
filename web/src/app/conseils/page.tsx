import type { Metadata } from "next";
import Link from "next/link";
import { listDiyArticles } from "@/lib/diy-articles";
import type { DiyProjectKind } from "@/lib/diy-wizard-qcm";
import {
  DIY_CONSEILS_CATEGORY_FILTERS,
  diyArticleCategoryKey,
  diyListCategoryLabel,
} from "@/lib/diy-wizard-qcm";

export const metadata: Metadata = {
  title: "Conseils bricolage & travaux",
  description:
    "Guides pratiques pour réaliser ou préparer vos travaux du bâtiment en autonomie : étapes, sécurité, limites du fait-maison.",
};

function formatDate(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  return new Intl.DateTimeFormat("fr-FR", {
    day: "numeric",
    month: "long",
    year: "numeric",
  }).format(d);
}

const CATEGORY_PARAM_SET = new Set<DiyProjectKind>(["installation", "renovation", "reparation"]);

type PageProps = {
  searchParams: Promise<{ categorie?: string }>;
};

export default async function ConseilsIndexPage({ searchParams }: PageProps) {
  const sp = await searchParams;
  const raw = (sp.categorie ?? "").toLowerCase().trim();
  const activeFilter: DiyProjectKind | null = CATEGORY_PARAM_SET.has(raw as DiyProjectKind)
    ? (raw as DiyProjectKind)
    : null;

  const articles = await listDiyArticles();
  const filtered = activeFilter
    ? articles.filter((a) => diyArticleCategoryKey(a.metierId, a.slug) === activeFilter)
    : articles;

  return (
    <div className="min-h-screen bg-canvas px-4 py-10 sm:px-6">
      <div className="mx-auto max-w-3xl">
        <header className="mb-10 border-b border-ink/10 pb-8 dark:border-white/10">
          <h1 className="font-[family-name:var(--font-display)] text-3xl text-ink sm:text-4xl">
            Conseils bricolage & travaux
          </h1>
          <p className="mt-3 text-lg text-ink-soft">
            Guides pour t’aider à préparer ou réaliser des travaux toi-même : outillage, étapes, précautions et
            quand faire appel à un pro. Les fiches sont complétées au fil des demandes sur le site.
          </p>
        </header>

        {articles.length > 0 ? (
          <nav
            className="mb-8 flex flex-wrap items-center gap-2"
            aria-label="Filtrer par type de projet"
          >
            <span className="mr-1 text-xs font-semibold uppercase tracking-wide text-ink-soft">Catégorie</span>
            <Link
              href="/conseils"
              className={`rounded-full border px-3 py-1.5 text-sm font-medium transition ${
                activeFilter === null
                  ? "border-teal-600 bg-teal-700 text-white dark:border-teal-500 dark:bg-teal-600"
                  : "border-ink/15 bg-canvas-muted/40 text-ink hover:border-accent/40 dark:border-white/15 dark:bg-white/5"
              }`}
            >
              Toutes
            </Link>
            {DIY_CONSEILS_CATEGORY_FILTERS.map(({ param, label }) => (
              <Link
                key={param}
                href={`/conseils?categorie=${param}`}
                className={`rounded-full border px-3 py-1.5 text-sm font-medium transition ${
                  activeFilter === param
                    ? "border-teal-600 bg-teal-700 text-white dark:border-teal-500 dark:bg-teal-600"
                    : "border-ink/15 bg-canvas-muted/40 text-ink hover:border-accent/40 dark:border-white/15 dark:bg-white/5"
                }`}
              >
                {label}
              </Link>
            ))}
          </nav>
        ) : null}

        {articles.length === 0 ? (
          <p className="rounded-2xl border border-dashed border-ink/15 bg-canvas-muted/30 px-6 py-10 text-center text-sm text-ink-soft dark:border-white/15">
            Aucun guide publié pour le moment. Utilise le{" "}
            <strong className="font-medium text-ink">Bot de ton pote</strong> (parcours « Je veux faire les
            travaux tout seul ») : <strong className="font-medium text-ink">installation</strong>,{" "}
            <strong className="font-medium text-ink">rénovation</strong> ou{" "}
            <strong className="font-medium text-ink">réparation</strong>,{" "}
            <strong className="font-medium text-ink">corps de métier</strong>, puis un questionnaire en QCM (niveaux 3 à
            9) pour générer une fiche — même parcours = même article.
          </p>
        ) : filtered.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-ink/15 bg-canvas-muted/30 px-6 py-10 text-center dark:border-white/15">
            <p className="text-sm text-ink-soft">
              Aucun guide dans cette catégorie pour le moment.
            </p>
            <p className="mt-3">
              <Link
                href="/conseils"
                className="text-sm font-semibold text-teal-700 hover:underline dark:text-teal-400"
              >
                Afficher toutes les catégories
              </Link>
            </p>
          </div>
        ) : (
          <ul className="space-y-4">
            {filtered.map((a) => {
              const cat = diyListCategoryLabel(a.metierId, a.slug);
              return (
                <li key={a.slug}>
                  <Link
                    href={`/conseils/${a.slug}`}
                    className="block rounded-2xl border border-[var(--card-border)] bg-[var(--card)] p-5 shadow-sm transition hover:border-accent/35 hover:shadow-md"
                  >
                    {cat ? (
                      <p className="mb-2">
                        <span className="inline-block rounded-full border border-ink/10 bg-canvas-muted/50 px-2.5 py-0.5 text-[11px] font-semibold uppercase tracking-wide text-ink-soft dark:border-white/10 dark:bg-white/5">
                          {cat}
                        </span>
                      </p>
                    ) : null}
                    <h2 className="text-lg font-semibold text-ink">{a.title}</h2>
                    {a.excerpt ? (
                      <p className="mt-2 line-clamp-2 text-sm text-ink-soft">{a.excerpt}</p>
                    ) : null}
                    <p className="mt-3 text-xs text-ink-soft">
                      Mis à jour le {formatDate(a.updatedAt)}
                    </p>
                  </Link>
                </li>
              );
            })}
          </ul>
        )}

        <p className="mt-10 text-center text-sm text-ink-soft">
          <Link href="/" className="font-medium text-teal-700 hover:underline dark:text-teal-400">
            ← Accueil & recherche d’artisans
          </Link>
        </p>
      </div>
    </div>
  );
}

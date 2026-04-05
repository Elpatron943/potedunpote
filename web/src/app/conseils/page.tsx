import type { Metadata } from "next";
import Link from "next/link";
import { listDiyArticles } from "@/lib/diy-articles";

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

export default async function ConseilsIndexPage() {
  const articles = await listDiyArticles();

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

        {articles.length === 0 ? (
          <p className="rounded-2xl border border-dashed border-ink/15 bg-canvas-muted/30 px-6 py-10 text-center text-sm text-ink-soft dark:border-white/15">
            Aucun guide publié pour le moment. Utilise le{" "}
            <strong className="font-medium text-ink">Bot de ton pote</strong> (parcours « Je veux faire les
            travaux tout seul ») pour générer une première fiche à partir d’un métier et d’une prestation.
          </p>
        ) : (
          <ul className="space-y-4">
            {articles.map((a) => (
              <li key={a.slug}>
                <Link
                  href={`/conseils/${a.slug}`}
                  className="block rounded-2xl border border-[var(--card-border)] bg-[var(--card)] p-5 shadow-sm transition hover:border-accent/35 hover:shadow-md"
                >
                  <h2 className="text-lg font-semibold text-ink">{a.title}</h2>
                  {a.excerpt ? (
                    <p className="mt-2 line-clamp-2 text-sm text-ink-soft">{a.excerpt}</p>
                  ) : null}
                  <p className="mt-3 text-xs text-ink-soft">
                    Mis à jour le {formatDate(a.updatedAt)}
                  </p>
                </Link>
              </li>
            ))}
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

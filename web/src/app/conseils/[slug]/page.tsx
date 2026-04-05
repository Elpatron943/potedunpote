import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { MarkdownProse } from "@/components/markdown-prose";
import { getDiyArticleBySlug } from "@/lib/diy-articles";

type PageProps = { params: Promise<{ slug: string }> };

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug } = await params;
  const article = await getDiyArticleBySlug(slug);
  if (!article) {
    return { title: "Guide introuvable" };
  }
  return {
    title: article.title,
    description: article.excerpt ?? article.title,
  };
}

export default async function ConseilArticlePage({ params }: PageProps) {
  const { slug } = await params;
  const article = await getDiyArticleBySlug(slug);
  if (!article) notFound();

  const updated = new Date(article.updatedAt);
  const dateLabel = Number.isNaN(updated.getTime())
    ? null
    : new Intl.DateTimeFormat("fr-FR", {
        day: "numeric",
        month: "long",
        year: "numeric",
      }).format(updated);

  return (
    <div className="min-h-screen bg-canvas px-4 py-10 sm:px-6">
      <article className="mx-auto max-w-3xl">
        <p className="mb-6 text-sm text-ink-soft">
          <Link
            href="/conseils"
            className="font-medium text-teal-700 hover:underline dark:text-teal-400"
          >
            ← Tous les conseils
          </Link>
          {" · "}
          <Link href="/" className="font-medium text-teal-700 hover:underline dark:text-teal-400">
            Accueil
          </Link>
        </p>

        <header className="border-b border-ink/10 pb-8 dark:border-white/10">
          <h1 className="font-[family-name:var(--font-display)] text-3xl text-ink sm:text-4xl">
            {article.title}
          </h1>
          {article.excerpt ? (
            <p className="mt-4 text-lg text-ink-soft">{article.excerpt}</p>
          ) : null}
          {dateLabel ? (
            <p className="mt-4 text-xs text-ink-soft">Dernière mise à jour : {dateLabel}</p>
          ) : null}
        </header>

        <div className="pt-8">
          <MarkdownProse markdown={article.bodyMarkdown} />
        </div>

        <footer className="mt-12 border-t border-ink/10 pt-8 text-sm text-ink-soft dark:border-white/10">
          <p>
            Ces conseils visent un bricolage raisonnable. Pour les risques (gaz, électricité, structure,
            étanchéité critique), fais appel à un professionnel qualifié.
          </p>
          <p className="mt-4">
            <Link href="/" className="font-medium text-teal-700 hover:underline dark:text-teal-400">
              Trouver un artisan sur Le pote d&apos;un pote
            </Link>
          </p>
        </footer>
      </article>
    </div>
  );
}

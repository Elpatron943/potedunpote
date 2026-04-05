import Link from "next/link";
import Image from "next/image";
import { logoutAction } from "@/app/auth-actions";
import { getSession } from "@/lib/auth-session";
import { artisanSubscribeConnexionHref } from "@/lib/artisan-subscribe-nav";
import { SITE_LOGO_PUBLIC_PATH, siteLogoExists } from "@/lib/site-logo";

export async function SiteHeader() {
  const session = await getSession();
  const hasLogo = siteLogoExists();

  return (
    <header className="sticky top-0 z-40 border-b border-ink/10 bg-[var(--card)]/92 backdrop-blur-md dark:border-white/10">
      <div className="mx-auto flex max-w-5xl items-center justify-between gap-3 px-4 py-3 sm:px-6 lg:px-8">
        <Link
          href="/"
          className={
            hasLogo
              ? "inline-flex min-h-16 items-center sm:min-h-[4.5rem]"
              : "font-[family-name:var(--font-display)] text-lg font-medium tracking-tight text-ink sm:text-xl"
          }
          aria-label="Le pote d'un pote — accueil"
        >
          {hasLogo ? (
            <Image
              src={SITE_LOGO_PUBLIC_PATH}
              alt="Le pote d'un pote"
              width={400}
              height={96}
              className="h-16 w-auto max-h-16 max-w-[22rem] object-contain object-left sm:h-[4.5rem] sm:max-h-[4.5rem] sm:max-w-[26rem]"
              priority
            />
          ) : (
            <>Le pote d&apos;un pote</>
          )}
        </Link>

        <nav
          className="flex flex-wrap items-center justify-end gap-2 sm:gap-3"
          aria-label="Navigation principale"
        >
          <Link
            href="/"
            className="hidden rounded-lg px-3 py-2 text-sm font-medium text-ink-soft transition hover:bg-canvas-muted/80 hover:text-ink sm:inline-block dark:hover:bg-white/5"
          >
            Recherche
          </Link>
          {session ? (
            <form action={logoutAction}>
              <button
                type="submit"
                className="rounded-lg px-3 py-2 text-sm font-medium text-ink-soft transition hover:bg-canvas-muted/80 hover:text-ink dark:hover:bg-white/5"
              >
                Déconnexion
              </button>
            </form>
          ) : (
            <Link
              href="/connexion"
              className="rounded-lg px-3 py-2 text-sm font-medium text-ink-soft transition hover:bg-canvas-muted/80 hover:text-ink dark:hover:bg-white/5"
            >
              Connexion
            </Link>
          )}
          <Link
            href="/artisan/abonnement"
            className="rounded-lg px-3 py-2 text-sm font-medium text-ink-soft transition hover:bg-canvas-muted/80 hover:text-ink dark:hover:bg-white/5"
          >
            <span className="hidden sm:inline">Espace Pro</span>
            <span className="sm:hidden">Pro</span>
          </Link>
          <Link
            href={
              session ? "/artisan/abonnement#offres" : artisanSubscribeConnexionHref()
            }
            className="inline-flex items-center justify-center rounded-xl bg-teal-700 px-4 py-2.5 text-sm font-bold text-white shadow-md shadow-teal-950/25 transition hover:bg-teal-800 focus:outline-none focus-visible:ring-2 focus-visible:ring-teal-500 focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--canvas)] dark:bg-teal-600 dark:hover:bg-teal-500 dark:shadow-black/40"
          >
            <span className="hidden sm:inline">Booster ma fiche Pro</span>
            <span className="sm:hidden">Offre Pro</span>
          </Link>
        </nav>
      </div>
    </header>
  );
}

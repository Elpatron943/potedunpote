import type { ReactNode } from "react";
import Link from "next/link";
import Image from "next/image";
import { logoutAction } from "@/app/auth-actions";
import { getSession } from "@/lib/auth-session";
import { SITE_LOGO_PUBLIC_PATH, siteLogoExists } from "@/lib/site-logo";

function NavGroup({
  label,
  labelClassName,
  borderClassName,
  bgClassName,
  children,
}: {
  label: string;
  labelClassName: string;
  borderClassName: string;
  bgClassName: string;
  children: ReactNode;
}) {
  return (
    <div
      className={`flex min-w-0 flex-col gap-1.5 rounded-xl border px-2.5 py-2 sm:px-3 sm:py-2.5 ${borderClassName} ${bgClassName}`}
    >
      <p
        className={`px-0.5 text-[0.62rem] font-semibold uppercase leading-none tracking-[0.14em] sm:text-[0.65rem] ${labelClassName}`}
      >
        {label}
      </p>
      <div className="flex flex-wrap items-center gap-1 sm:gap-1.5">{children}</div>
    </div>
  );
}

function NavLink({
  href,
  children,
  className = "",
}: {
  href: string;
  children: ReactNode;
  className?: string;
}) {
  return (
    <Link
      href={href}
      className={`rounded-lg px-2 py-1.5 text-sm font-medium transition sm:px-2.5 ${className}`}
    >
      {children}
    </Link>
  );
}

export async function SiteHeader() {
  const session = await getSession();
  const hasLogo = siteLogoExists();

  return (
    <header className="sticky top-0 z-40 border-b border-ink/10 bg-[var(--card)]/92 backdrop-blur-md dark:border-white/10">
      <div className="mx-auto flex max-w-6xl flex-col gap-3 px-4 py-3 sm:flex-row sm:items-center sm:justify-between sm:gap-4 sm:px-6 lg:px-8">
        <Link
          href="/"
          className={
            hasLogo
              ? "inline-flex min-h-14 shrink-0 items-center self-start sm:min-h-[4.5rem]"
              : "shrink-0 font-[family-name:var(--font-display)] text-lg font-medium tracking-tight text-ink sm:text-xl"
          }
          aria-label="Le pote d'un pote — accueil"
        >
          {hasLogo ? (
            <Image
              src={SITE_LOGO_PUBLIC_PATH}
              alt="Le pote d'un pote"
              width={400}
              height={96}
              className="h-14 w-auto max-h-14 max-w-[min(100%,22rem)] object-contain object-left sm:h-[4.5rem] sm:max-h-[4.5rem] sm:max-w-[26rem]"
              priority
            />
          ) : (
            <>Le pote d&apos;un pote</>
          )}
        </Link>

        <nav
          className="flex min-w-0 flex-wrap items-stretch justify-end gap-2 sm:gap-2.5 lg:gap-3"
          aria-label="Navigation principale"
        >
          <NavGroup
            label="Clients"
            labelClassName="text-teal-800 dark:text-teal-200"
            borderClassName="border-teal-600/25 dark:border-teal-500/30"
            bgClassName="bg-teal-500/[0.07] dark:bg-teal-950/35"
          >
            {session ? (
              <>
                <NavLink
                  href="/compte"
                  className="font-semibold text-ink hover:bg-teal-600/10 dark:hover:bg-white/5"
                >
                  Mon compte
                </NavLink>
                <form action={logoutAction} className="inline">
                  <button
                    type="submit"
                    className="rounded-lg px-2 py-1.5 text-sm font-medium text-ink-soft transition hover:bg-teal-600/10 hover:text-ink sm:px-2.5 dark:hover:bg-white/5"
                  >
                    Déconnexion
                  </button>
                </form>
              </>
            ) : (
              <NavLink
                href="/connexion"
                className="text-ink-soft hover:bg-teal-600/10 hover:text-ink dark:hover:bg-white/5"
              >
                Connexion
              </NavLink>
            )}
          </NavGroup>

          <NavGroup
            label="Conseils DIY"
            labelClassName="text-amber-900 dark:text-amber-100"
            borderClassName="border-amber-600/30 dark:border-amber-500/35"
            bgClassName="bg-amber-500/[0.09] dark:bg-amber-950/40"
          >
            <NavLink
              href="/conseils"
              className="font-medium text-amber-950 hover:bg-amber-600/15 dark:text-amber-50 dark:hover:bg-amber-500/15"
            >
              Guides & bricolage
            </NavLink>
          </NavGroup>

          <NavGroup
            label="Professionnels"
            labelClassName="text-slate-600 dark:text-slate-300"
            borderClassName="border-slate-400/35 dark:border-slate-500/40"
            bgClassName="bg-slate-500/[0.08] dark:bg-slate-900/50"
          >
            <Link
              href="/pro"
              className="inline-flex items-center justify-center rounded-lg bg-teal-700 px-3 py-1.5 text-sm font-bold text-white shadow-sm shadow-teal-950/20 transition hover:bg-teal-800 focus:outline-none focus-visible:ring-2 focus-visible:ring-teal-500 dark:bg-teal-600 dark:hover:bg-teal-500"
            >
              <span className="hidden sm:inline">Espace Pro</span>
              <span className="sm:hidden">Pro</span>
            </Link>
          </NavGroup>
        </nav>
      </div>
    </header>
  );
}

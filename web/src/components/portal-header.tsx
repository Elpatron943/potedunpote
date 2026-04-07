import Link from "next/link";

import { logoutAction } from "@/app/auth-actions";
import type { PortalSessionInfo } from "@/lib/portal-session";

const navLink =
  "rounded-lg px-2.5 py-1.5 text-sm font-medium text-white/80 transition hover:bg-white/10 hover:text-white";

const menuItem =
  "block w-full px-3 py-2.5 text-left text-sm text-white/90 transition hover:bg-white/10";

const menuSection = "border-t border-white/10 px-1 py-1";

export function PortalHeader({ info }: { info: PortalSessionInfo }) {
  const displayName = info.name?.trim() || info.email.split("@")[0] || "Compte";
  const portailHome = info.hasArtisanProfile ? "/pro/tableau" : "/compte";

  return (
    <header className="sticky top-0 z-50 border-b border-white/10 bg-slate-950 text-white shadow-sm">
      <div className="mx-auto flex max-w-6xl items-center justify-between gap-3 px-4 py-2 sm:px-6 lg:px-8">
        <div className="flex min-w-0 items-center gap-3">
          <Link
            href={portailHome}
            className="truncate text-sm font-semibold tracking-tight text-white hover:text-teal-200"
            title="Accueil du portail"
          >
            Portail <span className="text-white/50">·</span> Le pote d&apos;un pote
          </Link>
        </div>

        <nav className="flex min-w-0 flex-1 flex-wrap items-center justify-end gap-0.5 sm:gap-1" aria-label="Portail connecté">
          <Link href="/" className={navLink}>
            Recherche
          </Link>
          <Link href="/compte" className={navLink}>
            Mon compte
          </Link>
          <Link href="/pro/tableau" className={navLink}>
            Espace pro
          </Link>
          {info.hasArtisanProfile ? (
            <Link href="/pro/profil" className={`${navLink} hidden sm:inline-flex`}>
              Profil
            </Link>
          ) : null}

          <details className="relative ml-0.5 sm:ml-1">
            <summary
              className={`${navLink} flex cursor-pointer list-none items-center gap-1 [&::-webkit-details-marker]:hidden`}
              aria-label="Menu compte"
            >
              <span className="max-w-[9rem] truncate sm:max-w-[12rem]">{displayName}</span>
              <span className="text-xs text-white/50" aria-hidden>
                ▾
              </span>
            </summary>
            <div className="absolute right-0 top-full z-[60] mt-1 w-[min(100vw-2rem,16rem)] rounded-xl border border-white/10 bg-slate-900 py-1 shadow-xl">
              <p className="px-3 py-2 text-xs text-white/50">{info.email}</p>
              <div className={menuSection}>
                <Link href="/compte" className={menuItem}>
                  Mon compte acheteur
                </Link>
                <Link href="/pro/tableau" className={menuItem}>
                  Tableau de bord pro
                </Link>
                {info.hasArtisanProfile ? (
                  <Link href="/pro/profil" className={menuItem}>
                    Profil &amp; paramètres
                  </Link>
                ) : (
                  <Link href="/pro/onboarding" className={menuItem}>
                    Profil artisan (à compléter)
                  </Link>
                )}
                <Link href="/pro/offre" className={menuItem}>
                  Offre &amp; abonnement
                </Link>
              </div>
              <div className={menuSection}>
                <form action={logoutAction}>
                  <button type="submit" className={`${menuItem} font-medium text-red-200 hover:text-red-100`}>
                    Déconnexion
                  </button>
                </form>
              </div>
            </div>
          </details>
        </nav>
      </div>
    </header>
  );
}

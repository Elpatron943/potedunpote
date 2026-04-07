"use client";

import Link from "next/link";
import { logoutAction } from "@/app/auth-actions";

const summaryBtn =
  "flex cursor-pointer list-none items-center gap-1 rounded-lg px-3 py-2 text-sm font-semibold text-ink transition hover:bg-canvas-muted/80 dark:hover:bg-white/5 [&::-webkit-details-marker]:hidden";

const panel =
  "absolute left-0 top-full z-50 mt-1 min-w-[13.5rem] rounded-xl border border-ink/10 bg-[var(--card)] py-1.5 shadow-lg dark:border-white/10";

const item =
  "block px-4 py-2.5 text-sm text-ink transition hover:bg-canvas-muted/70 dark:hover:bg-white/5";

export function SiteHeaderNav({ isLoggedIn }: { isLoggedIn: boolean }) {
  return (
    <nav
      className="flex flex-wrap items-center justify-end gap-1 sm:gap-2"
      aria-label="Navigation principale"
    >
      <details className="relative">
        <summary className={summaryBtn}>
          Recherche professionnel
          <span className="text-xs text-ink-soft" aria-hidden>
            ▾
          </span>
        </summary>
        <div className={panel}>
          <Link href="/" className={item}>
            Recherche
          </Link>
          {isLoggedIn ? (
            <>
              <Link href="/compte" className={item}>
                Mon compte
              </Link>
              <form action={logoutAction} className="border-t border-ink/10 px-2 pt-1 dark:border-white/10">
                <button
                  type="submit"
                  className="w-full rounded-lg px-2 py-2 text-left text-sm text-ink-soft transition hover:bg-canvas-muted/70 hover:text-ink dark:hover:bg-white/5"
                >
                  Déconnexion
                </button>
              </form>
            </>
          ) : (
            <Link href="/connexion" className={item}>
              Connexion
            </Link>
          )}
        </div>
      </details>

      <details className="relative">
        <summary className={summaryBtn}>
          Espace Pro
          <span className="text-xs text-ink-soft" aria-hidden>
            ▾
          </span>
        </summary>
        <div className={`${panel} left-auto right-0 sm:left-0 sm:right-auto`}>
          <Link href="/pro/forfaits" className={item}>
            Découvrir les forfaits
          </Link>
          <Link href="/pro/connexion" className={item}>
            Connexion Pro
          </Link>
        </div>
      </details>

      <Link
        href="/conseils"
        className="rounded-lg px-3 py-2 text-sm font-semibold text-ink transition hover:bg-canvas-muted/80 dark:hover:bg-white/5"
      >
        Conseils DIY
      </Link>
    </nav>
  );
}

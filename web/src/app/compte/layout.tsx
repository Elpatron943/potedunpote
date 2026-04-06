import Link from "next/link";
import { logoutAction } from "@/app/auth-actions";
import { requireClientAccountPage } from "@/lib/client-account";

export default async function CompteLayout({ children }: { children: React.ReactNode }) {
  const user = await requireClientAccountPage();

  return (
    <div className="min-h-screen bg-[#0f172a] text-ink">
      <div className="mx-auto flex max-w-6xl flex-col gap-0 md:min-h-screen md:flex-row">
        <aside className="shrink-0 border-b border-white/10 bg-gradient-to-b from-teal-950 to-[#0f172a] px-4 py-6 md:w-60 md:border-b-0 md:border-r md:px-5 md:py-10">
          <p className="text-[0.65rem] font-semibold uppercase tracking-[0.2em] text-teal-200/80">
            Espace membre
          </p>
          <h1 className="mt-1 font-[family-name:var(--font-display)] text-lg font-semibold text-white">
            Mon compte
          </h1>
          <p className="mt-2 truncate text-xs text-white/65" title={user?.email}>
            {user?.name?.trim() ? (
              <>
                <span className="font-medium text-white/90">{user.name}</span>
                <br />
              </>
            ) : null}
            {user?.email}
          </p>
          <nav className="mt-8 flex flex-col gap-1 text-sm" aria-label="Espace membre">
            <Link
              href="/compte"
              className="rounded-lg px-3 py-2 font-medium text-white/90 transition hover:bg-white/10"
            >
              Vue d’ensemble
            </Link>
            <Link
              href="/compte#mes-avis"
              className="rounded-lg px-3 py-2 text-white/75 transition hover:bg-white/10 hover:text-white"
            >
              Mes avis
            </Link>
            <Link
              href="/"
              className="rounded-lg px-3 py-2 text-white/75 transition hover:bg-white/10 hover:text-white"
            >
              Recherche d’artisans
            </Link>
            <Link
              href="/conseils"
              className="rounded-lg px-3 py-2 text-white/75 transition hover:bg-white/10 hover:text-white"
            >
              Conseils DIY
            </Link>
          </nav>
          <form action={logoutAction} className="mt-8">
            <button
              type="submit"
              className="w-full rounded-lg border border-white/15 bg-white/5 px-3 py-2 text-left text-sm font-medium text-white/85 transition hover:bg-white/10"
            >
              Déconnexion
            </button>
          </form>
        </aside>
        <div className="min-w-0 flex-1 bg-canvas px-4 py-8 sm:px-8 md:py-10">{children}</div>
      </div>
    </div>
  );
}

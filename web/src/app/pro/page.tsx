import type { Metadata } from "next";
import Link from "next/link";
import { getOptionalProContext } from "@/lib/pro-auth";

export const metadata: Metadata = {
  title: "Espace professionnel",
  description:
    "Artisans du bâtiment : visibilité, fiche entreprise enrichie, contact clients et formules Pro sur Le pote d'un pote.",
};

export default async function ProLandingPage() {
  const ctx = await getOptionalProContext();
  const hasVerifiedPro = ctx?.artisanProfile != null;
  const isLoggedIn = ctx != null;

  return (
    <div className="min-h-screen bg-[#0f172a]">
      <div className="mx-auto max-w-3xl px-4 py-12 sm:px-6 lg:max-w-4xl lg:px-8">
        <p className="text-sm text-white/60">
          <Link href="/" className="font-medium text-teal-300 hover:underline">
            ← Accueil & recherche
          </Link>
        </p>

        <header className="mt-8 text-center lg:text-left">
          <p className="text-[0.65rem] font-semibold uppercase tracking-[0.2em] text-teal-300/90">
            Professionnels du bâtiment
          </p>
          <h1 className="mt-3 font-[family-name:var(--font-display)] text-3xl font-semibold leading-tight text-white sm:text-4xl md:text-5xl">
            Sois visible là où les clients cherchent un artisan
          </h1>
          <p className="mx-auto mt-5 max-w-2xl text-lg leading-relaxed text-white/75 lg:mx-0">
            <strong className="font-semibold text-white">Le pote d&apos;un pote</strong> met en avant des
            entreprises du BTP avec des fiches claires, des avis et des critères de recherche par métier et
            zone. Les formules Pro permettent d&apos;activer le contact, d&apos;affiner ta prestation et,
            selon le niveau, d&apos;aller plus loin (demandes, vitrine, pilotage).
          </p>
        </header>

        <ul className="mx-auto mt-10 max-w-2xl space-y-4 text-left text-white/85 lg:mx-0">
          <li className="flex gap-3">
            <span className="mt-0.5 shrink-0 text-teal-400" aria-hidden>
              ✓
            </span>
            <span>
              <strong className="text-white">Fiche liée à ton SIREN</strong> — cohérence métier / entreprise,
              compléments utiles pour les particuliers.
            </span>
          </li>
          <li className="flex gap-3">
            <span className="mt-0.5 shrink-0 text-teal-400" aria-hidden>
              ✓
            </span>
            <span>
              <strong className="text-white">Contact & crédibilité</strong> — bouton « Contacter », liens site,
              réseaux, prestations déclarées.
            </span>
          </li>
          <li className="flex gap-3">
            <span className="mt-0.5 shrink-0 text-teal-400" aria-hidden>
              ✓
            </span>
            <span>
              <strong className="text-white">Formules adaptées</strong> — de l&apos;essentiel au pilotage
              chantier ; détail et tarifs sur la page dédiée.
            </span>
          </li>
        </ul>

        <div className="mt-12 flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:justify-center lg:justify-start">
          {hasVerifiedPro ? (
            <Link
              href="/pro/tableau"
              className="inline-flex min-h-[3rem] flex-1 items-center justify-center rounded-xl bg-teal-500 px-6 py-3 text-center text-base font-bold text-white shadow-lg shadow-teal-950/40 transition hover:bg-teal-400 sm:flex-none dark:bg-teal-600 dark:hover:bg-teal-500"
            >
              Tableau de bord
            </Link>
          ) : null}
          {isLoggedIn && !hasVerifiedPro ? (
            <Link
              href="/pro/onboarding"
              className="inline-flex min-h-[3rem] flex-1 items-center justify-center rounded-xl bg-teal-500 px-6 py-3 text-center text-base font-bold text-white shadow-lg shadow-teal-950/40 transition hover:bg-teal-400 sm:flex-none dark:bg-teal-600 dark:hover:bg-teal-500"
            >
              Vérifier mon entreprise (Kbis)
            </Link>
          ) : null}
          {isLoggedIn ? (
            <Link
              href="/compte"
              className="inline-flex min-h-[3rem] flex-1 items-center justify-center rounded-xl border-2 border-white/25 bg-white/10 px-6 py-3 text-center text-base font-semibold text-white transition hover:bg-white/15 sm:flex-none"
            >
              Mon espace membre (avis)
            </Link>
          ) : null}
          <Link
            href="/pro/forfaits"
            className="inline-flex min-h-[3rem] flex-1 items-center justify-center rounded-xl border-2 border-white/20 bg-white/5 px-6 py-3 text-center text-base font-semibold text-white transition hover:bg-white/10 sm:flex-none"
          >
            Voir les forfaits & tarifs
          </Link>
          {!isLoggedIn ? (
            <Link
              href="/pro/connexion"
              className="inline-flex min-h-[3rem] flex-1 items-center justify-center rounded-xl border-2 border-teal-500/50 bg-teal-950/40 px-6 py-3 text-center text-base font-semibold text-teal-100 transition hover:bg-teal-900/60 sm:flex-none"
            >
              Connexion Pro
            </Link>
          ) : null}
        </div>

        <p className="mt-10 text-center text-sm text-white/50 lg:text-left">
          Tu veux seulement laisser un avis en tant que particulier ?{" "}
          <Link href="/connexion" className="font-medium text-teal-300 underline-offset-2 hover:underline">
            Espace clients
          </Link>
        </p>
      </div>
    </div>
  );
}

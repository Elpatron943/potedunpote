import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { Suspense } from "react";
import { ConnexionForm } from "@/components/connexion-form";
import { getClientAccountUser } from "@/lib/client-account";
import { PORTAIL_PRO_CONNEXION } from "@/lib/auth-portals";

export const metadata: Metadata = {
  title: "Connexion",
  description: "Connexion ou inscription pour laisser un avis sur une entreprise du BTP.",
};

function ConnexionFallback() {
  return (
    <div className="mx-auto max-w-md animate-pulse rounded-2xl border border-ink/10 bg-canvas-muted/40 p-8 dark:border-white/10">
      <div className="h-10 rounded-xl bg-ink/10 dark:bg-white/10" />
      <div className="mt-6 h-12 rounded-2xl bg-ink/10 dark:bg-white/10" />
      <div className="mt-4 h-12 rounded-2xl bg-ink/10 dark:bg-white/10" />
    </div>
  );
}

export default async function ConnexionPage() {
  const user = await getClientAccountUser();
  if (user?.role === "CLIENT" || user?.role === "ARTISAN" || user?.role === "ADMIN") {
    redirect("/compte");
  }

  return (
    <div className="min-h-[85vh] bg-[#0f172a]">
      <div className="mx-auto grid min-h-[85vh] max-w-6xl lg:grid-cols-[minmax(0,1fr)_minmax(0,26rem)]">
        <aside className="relative hidden flex-col justify-between border-r border-white/10 bg-gradient-to-br from-teal-950 via-[#0c4c4a]/80 to-[#0f172a] px-10 py-12 text-white lg:flex">
          <div>
            <p className="text-[0.65rem] font-semibold uppercase tracking-[0.25em] text-teal-200/90">
              Espace membre
            </p>
            <h1 className="mt-3 font-[family-name:var(--font-display)] text-3xl font-semibold leading-tight">
              Ton compte pour suivre tes avis
            </h1>
            <p className="mt-4 max-w-md text-sm leading-relaxed text-white/75">
              Une fois connecté, accède à ton <strong className="font-medium text-white">tableau de bord</strong>{" "}
              : liste des avis publiés, lien vers chaque fiche entreprise, statut et détails de prestation.
            </p>
            <ul className="mt-8 space-y-3 text-sm text-white/85">
              <li className="flex gap-2">
                <span className="text-teal-300" aria-hidden>
                  ✓
                </span>
                Historique des avis laissés sur la plateforme
              </li>
              <li className="flex gap-2">
                <span className="text-teal-300" aria-hidden>
                  ✓
                </span>
                Accès direct à la recherche d’artisans
              </li>
              <li className="flex gap-2">
                <span className="text-teal-300" aria-hidden>
                  ✓
                </span>
                Compte gratuit, sans engagement
              </li>
            </ul>
          </div>
          <p className="text-xs text-white/50">
            Tu es artisan ?{" "}
            <a href={PORTAIL_PRO_CONNEXION} className="font-medium text-teal-200 underline-offset-2 hover:underline">
              Espace professionnel
            </a>
          </p>
        </aside>

        <main className="flex flex-col justify-center bg-canvas px-4 py-12 sm:px-8">
          <div className="mx-auto w-full max-w-md">
            <p className="text-center text-xs font-semibold uppercase tracking-wider text-ink-soft lg:text-left">
              Particuliers & avis
            </p>
            <h2 className="mt-2 text-center font-[family-name:var(--font-display)] text-2xl text-ink sm:text-3xl lg:text-left">
              Connexion ou inscription
            </h2>
            <p className="mt-2 text-center text-sm text-ink-soft lg:text-left">
              Compte gratuit pour déposer un avis. L’inscription envoie un{" "}
              <strong className="font-medium text-ink">code par e-mail</strong> ; après validation, tu es
              redirigé vers ton espace membre.
            </p>
            <div className="mt-8">
              <Suspense fallback={<ConnexionFallback />}>
                <ConnexionForm portal="acheteur" />
              </Suspense>
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}

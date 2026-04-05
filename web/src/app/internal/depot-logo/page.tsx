import type { Metadata } from "next";
import { LogoDepotForm } from "./logo-depot-form";

export const metadata: Metadata = {
  title: "Dépôt logo",
  robots: { index: false, follow: false },
};

export default function DepotLogoPage() {
  const isDev = process.env.NODE_ENV === "development";
  const hasSecret =
    typeof process.env.LOGO_DEPOT_SECRET === "string" &&
    process.env.LOGO_DEPOT_SECRET.length >= 8;
  const canUpload = isDev || hasSecret;

  return (
    <div className="mx-auto max-w-xl px-4 py-16 sm:px-6">
      <h1 className="font-[family-name:var(--font-display)] text-2xl text-ink sm:text-3xl">
        Dépôt du logo PNG
      </h1>
      <p className="mt-3 text-sm leading-relaxed text-ink-soft">
        Le fichier est enregistré sous{" "}
        <code className="rounded bg-canvas-muted px-1 text-ink">web/public/brand/logo.png</code> et
        utilisé automatiquement dans l’en-tête du site lorsqu’il est présent.
      </p>
      <p className="mt-2 text-xs text-ink-soft">
        Sur un hébergement sans disque persistant (ex. Vercel), l’upload peut ne pas survivre au
        déploiement : en général il faut commiter le PNG dans le dépôt après l’avoir posé en local.
      </p>

      {!canUpload ? (
        <div className="mt-8 rounded-2xl border border-ink/10 bg-card p-6 text-sm text-ink-soft dark:border-white/10">
          <p>
            En environnement de production sans <code className="text-ink">LOGO_DEPOT_SECRET</code>
            , ajoute le PNG à la main dans le dépôt (
            <code className="text-ink">public/brand/logo.png</code>) puis redéploie, ou lance{" "}
            <code className="text-ink">npm run dev</code> en local et reviens sur cette page.
          </p>
        </div>
      ) : (
        <div className="mt-8">
          {isDev ? (
            <p className="mb-4 rounded-xl border border-teal-600/25 bg-teal-600/5 px-4 py-3 text-xs text-ink-soft">
              Mode développement : dépôt autorisé sans secret. En prod, définis une variable{" "}
              <code className="text-ink">LOGO_DEPOT_SECRET</code> d’au moins 8 caractères.
            </p>
          ) : null}
          <LogoDepotForm showSecretField={!isDev && hasSecret} />
        </div>
      )}
    </div>
  );
}

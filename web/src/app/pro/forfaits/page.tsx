import type { Metadata } from "next";
import Link from "next/link";
import { getSession } from "@/lib/auth-session";
import { artisanSubscribeConnexionHref } from "@/lib/artisan-subscribe-nav";

export const metadata: Metadata = {
  title: "Forfaits & offres Pro",
  description:
    "Formules pour les pros du bâtiment : Essentiel 10 €, Relation 20 €, Vitrine 30 €, Pilotage 50 €. Sans engagement.",
};

type PlanDef = {
  id: string;
  name: string;
  priceEuros: string;
  tagline: string;
  features: string[];
  highlight?: boolean;
};

const plans: PlanDef[] = [
  {
    id: "essentiel",
    name: "Pro Essentiel",
    priceEuros: "10",
    tagline: "Fiche complète pour être joignable et crédible.",
    features: [
      "Bouton « Contacter » visible par les clients sur ta fiche : ton numéro de téléphone, ton site web et tes réseaux sociaux",
    ],
  },
  {
    id: "relation",
    name: "Pro Relation",
    priceEuros: "20",
    tagline: "Tu gères les sollicitations qui arrivent sur la plateforme.",
    features: [
      "Tout Pro Essentiel",
      "Gestion des demandes entrantes : centraliser, suivre et traiter les demandes depuis la plateforme",
    ],
    highlight: true,
  },
  {
    id: "vitrine",
    name: "Pro Vitrine",
    priceEuros: "30",
    tagline: "Ta présence en ligne au-delà de la fiche annuaire.",
    features: [
      "Tout Pro Relation",
      "Vitrine web personnalisée : page de présentation aux couleurs de ton entreprise — tu y ajoutes les photos de tes chantiers",
    ],
  },
  {
    id: "pilotage",
    name: "Pro Pilotage",
    priceEuros: "50",
    tagline: "Piloter devis, achats, facturation et marge par chantier.",
    features: [
      "Tout Pro Vitrine",
      "Gestion des devis",
      "Gestion des commandes",
      "Gestion des factures",
      "Gestion du temps",
      "Rentabilité par chantier",
    ],
  },
];

function mailtoSouscription(formule: string, prixEuros: string): string {
  const subject = `Souscription ${formule} (${prixEuros} € HT/mois)`;
  const body = `Bonjour,\n\nJe souhaite souscrire à la formule ${formule} (${prixEuros} € HT / mois, sans engagement).\n\nSIREN : \nNom de l'entreprise : \n\nCordialement`;
  return `mailto:contact@lepotedunpote.fr?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
}

export default async function ProForfaitsPage() {
  const session = await getSession();

  return (
    <div className="min-h-screen bg-canvas">
      <div className="mx-auto max-w-3xl px-4 py-10 sm:px-6 lg:max-w-6xl lg:px-8">
        <div className="flex flex-wrap items-center justify-between gap-3 text-sm text-ink-soft">
          <Link href="/pro" className="font-medium text-teal-700 hover:underline dark:text-teal-400">
            ← Espace Pro
          </Link>
          <Link href="/" className="font-medium text-teal-700 hover:underline dark:text-teal-400">
            Recherche clients
          </Link>
        </div>

        <header className="mt-8 text-center">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-warm">Offre Pro</p>
          <h1 className="mt-3 font-[family-name:var(--font-display)] text-3xl text-ink sm:text-4xl md:text-5xl">
            Passe ta fiche en <span className="italic text-warm">mode Pro</span>
          </h1>
          <p className="mx-auto mt-4 max-w-2xl text-lg text-ink-soft">
            Réservé aux <strong className="text-ink">professionnels du bâtiment</strong> : à
            l’inscription tu renseignes ton <strong className="text-ink">SIREN</strong> et ton{" "}
            <strong className="text-ink">Kbis</strong> — la cohérence est vérifiée et ton{" "}
            <strong className="text-ink">métier</strong> est rattaché à ton entreprise. Choisis la
            formule qui correspond à ton activité :{" "}
            <strong className="text-ink">Essentiel</strong>, <strong className="text-ink">Relation</strong>,{" "}
            <strong className="text-ink">Vitrine</strong> ou <strong className="text-ink">Pilotage</strong>.
          </p>
          <p className="mt-5">
            <a
              href="#offres"
              className="inline-flex items-center justify-center rounded-xl bg-teal-700 px-5 py-2.5 text-sm font-bold text-white shadow-md transition hover:bg-teal-800 dark:bg-teal-600 dark:hover:bg-teal-500"
            >
              Voir les 4 formules et les tarifs
            </a>
          </p>
        </header>

        <section id="offres" className="mt-12 scroll-mt-24">
          <h2 className="text-center font-[family-name:var(--font-display)] text-2xl text-ink sm:text-3xl">
            Nos formules Pro
          </h2>
          <p className="mx-auto mt-3 max-w-2xl text-center text-sm text-ink-soft">
            Paiement en ligne et activation automatique :{" "}
            <strong className="text-ink">bientôt disponible</strong> — tarifs annoncés ci-dessous. Sans
            engagement, résiliable à tout moment.
          </p>

          <div className="mt-10 grid gap-6 sm:grid-cols-2 xl:grid-cols-4">
            {plans.map((plan) => (
              <article
                key={plan.id}
                className={`flex flex-col rounded-[1.5rem] border-2 bg-[var(--card)] p-6 text-left shadow-md dark:shadow-black/30 ${
                  plan.highlight
                    ? "border-teal-600 shadow-lg shadow-teal-950/15 ring-2 ring-teal-600/20 dark:border-teal-500 dark:ring-teal-500/20"
                    : "border-[var(--card-border)] dark:border-white/10"
                }`}
              >
                {plan.highlight ? (
                  <p className="mb-2 text-center text-xs font-bold uppercase tracking-wider text-teal-800 dark:text-teal-300">
                    Le plus demandé
                  </p>
                ) : null}
                <h3 className="font-[family-name:var(--font-display)] text-xl font-semibold text-ink">
                  {plan.name}
                </h3>
                <p className="mt-2 text-sm text-ink-soft">{plan.tagline}</p>
                <p className="mt-4 text-3xl font-bold tracking-tight text-ink">
                  {plan.priceEuros}&nbsp;€ HT
                  <span className="ml-1 text-base font-semibold text-ink-soft">/ mois</span>
                </p>
                <ul className="mt-6 flex-1 space-y-2.5 text-sm text-ink-soft">
                  {plan.features.map((f) => (
                    <li key={f} className="flex gap-2">
                      <span className="shrink-0 text-teal-700 dark:text-teal-400">✓</span>
                      <span>{f}</span>
                    </li>
                  ))}
                </ul>
                <div className="mt-8">
                  {session ? (
                    <a
                      href={mailtoSouscription(plan.name, plan.priceEuros)}
                      className="flex min-h-[2.75rem] w-full items-center justify-center rounded-xl bg-teal-700 px-4 py-2.5 text-center text-sm font-bold text-white transition hover:bg-teal-800 dark:bg-teal-600 dark:hover:bg-teal-500"
                    >
                      Choisir {plan.name.replace(/^Pro /, "")}
                    </a>
                  ) : (
                    <Link
                      href={artisanSubscribeConnexionHref()}
                      className="flex min-h-[2.75rem] w-full items-center justify-center rounded-xl bg-teal-700 px-4 py-2.5 text-center text-sm font-bold text-white transition hover:bg-teal-800 dark:bg-teal-600 dark:hover:bg-teal-500"
                    >
                      Se connecter pour souscrire
                    </Link>
                  )}
                </div>
              </article>
            ))}
          </div>

          {!session ? (
            <p className="mx-auto mt-8 max-w-lg rounded-xl border border-ink/10 bg-canvas-muted/50 px-4 py-3 text-center text-sm text-ink-soft dark:border-white/10 dark:bg-canvas-muted/30">
              Tu dois être <strong className="text-ink">connecté</strong> pour lancer une souscription
              — on associe la demande à ton compte (SIREN / Kbis dans le parcours).
            </p>
          ) : (
            <p className="mx-auto mt-8 max-w-lg text-center text-sm text-ink-soft">
              Tu es connecté : choisis une formule ci-dessus pour nous écrire (paiement en ligne bientôt
              disponible).
            </p>
          )}

          <div className="mt-8 flex flex-wrap justify-center gap-3">
            <Link
              href="/pro"
              className="inline-flex min-h-[3rem] items-center justify-center rounded-xl border-2 border-ink/15 px-6 py-3 text-sm font-semibold text-ink transition hover:bg-canvas-muted/60 dark:border-white/15 dark:hover:bg-white/5"
            >
              Retour présentation Pro
            </Link>
            <Link
              href="/"
              className="inline-flex min-h-[3rem] items-center justify-center rounded-xl border-2 border-ink/15 px-6 py-3 text-sm font-semibold text-ink transition hover:bg-canvas-muted/60 dark:border-white/15 dark:hover:bg-white/5"
            >
              Retour à l’accueil
            </Link>
          </div>
        </section>
      </div>
    </div>
  );
}

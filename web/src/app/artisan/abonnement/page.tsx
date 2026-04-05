import type { Metadata } from "next";
import Link from "next/link";
import { getSession } from "@/lib/auth-session";
import { artisanSubscribeConnexionHref } from "@/lib/artisan-subscribe-nav";

export const metadata: Metadata = {
  title: "Abonnements Pro",
  description:
    "Formules pour les pros du bâtiment : Essentiel 10 €, Relation 20 €, Vitrine 30 €, Pilotage 50 € (devis, factures, temps, rentabilité par chantier). Sans engagement.",
};

const perks = [
  {
    title: "Bouton Contacter",
    body: "Les clients potentiels voient un bouton Contacter sur ta fiche : accès à ton numéro de téléphone, ton site web et tes réseaux sociaux.",
    icon: PhoneGlyph,
  },
  {
    title: "Ton site & tes réseaux",
    body: "Lien vers ton site, Instagram, Facebook, LinkedIn… mis en avant sur ta fiche, comme des CTA commerciaux.",
    icon: LinkGlyph,
  },
  {
    title: "Sous-activités détaillées",
    body: "Tu coches les prestations que tu assures vraiment : ton métier est aligné sur ton entreprise (SIREN + vérification documentaire).",
    icon: ListChecksGlyph,
  },
  {
    title: "Particuliers & pros",
    body: "Indique si tu travailles pour des particuliers, des professionnels, ou les deux — les bons profils te contactent.",
    icon: UsersGlyph,
  },
  {
    title: "Visuels chantiers",
    body: "Galerie photos pour montrer ton savoir-faire — idéal RGE, réno, second œuvre.",
    icon: ImageGlyph,
  },
];

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

export default async function ArtisanAbonnementPage() {
  const session = await getSession();

  return (
    <div className="min-h-screen bg-canvas">
      <div className="mx-auto max-w-3xl px-4 py-10 sm:px-6 lg:max-w-6xl lg:px-8">
        <p className="text-sm text-ink-soft">
          <Link href="/" className="font-medium text-teal-700 hover:underline dark:text-teal-400">
            ← Retour à la recherche
          </Link>
        </p>

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

          <div className="mt-8 flex justify-center">
            <Link
              href="/"
              className="inline-flex min-h-[3rem] items-center justify-center rounded-xl border-2 border-ink/15 px-6 py-3 text-sm font-semibold text-ink transition hover:bg-canvas-muted/60 dark:border-white/15 dark:hover:bg-white/5"
            >
              Retour à l’accueil
            </Link>
          </div>
        </section>

        <section className="mt-20" aria-labelledby="avantages-pro">
          <h2
            id="avantages-pro"
            className="text-center font-[family-name:var(--font-display)] text-xl text-ink sm:text-2xl"
          >
            Ce que débloque la fiche Pro
          </h2>
          <p className="mx-auto mt-2 max-w-xl text-center text-sm text-ink-soft">
            Détail des options visibles sur ta fiche publique une fois abonné.
          </p>
          <div className="mt-10 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {perks.map((p) => (
              <article
                key={p.title}
                className="rounded-2xl border border-[var(--card-border)] bg-[var(--card)] p-6 shadow-sm backdrop-blur-sm dark:border-white/10"
              >
                <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-teal-700/12 text-teal-800 dark:bg-teal-500/15 dark:text-teal-300">
                  <p.icon />
                </div>
                <h3 className="mt-4 text-lg font-semibold text-ink">{p.title}</h3>
                <p className="mt-2 text-sm leading-relaxed text-ink-soft">{p.body}</p>
              </article>
            ))}
          </div>
        </section>
      </div>
    </div>
  );
}

function PhoneGlyph() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
      <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z" />
    </svg>
  );
}

function LinkGlyph() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
      <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71" />
      <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71" />
    </svg>
  );
}

function ListChecksGlyph() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
      <path d="M9 11l3 3L22 4" />
      <path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11" />
    </svg>
  );
}

function UsersGlyph() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
      <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
      <circle cx="9" cy="7" r="4" />
      <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
      <path d="M16 3.13a4 4 0 0 1 0 7.75" />
    </svg>
  );
}

function ImageGlyph() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
      <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
      <circle cx="8.5" cy="8.5" r="1.5" />
      <path d="M21 15l-5-5L5 21" />
    </svg>
  );
}

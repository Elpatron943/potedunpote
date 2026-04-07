import type { Metadata } from "next";
import Link from "next/link";
import { requireClientAccountPage } from "@/lib/client-account";
import { getMyProLeadsForBuyer, leadStatusLabelForBuyer } from "@/lib/buyer-quote-requests";
import {
  getBtpMetierLabelFromRef,
  getBtpReferentiel,
  getPrestationActiviteLabel,
  serializeBtpReferentiel,
} from "@/lib/btp-referentiel";
import { getEntrepriseDetail } from "@/lib/entreprise-detail";

export const metadata: Metadata = {
  title: "Mes demandes de devis",
  description: "Suivi des demandes envoyées aux professionnels depuis les fiches entreprise.",
};

function formatDateFr(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return new Intl.DateTimeFormat("fr-FR", {
    day: "numeric",
    month: "long",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(d);
}

export default async function CompteDemandesPage() {
  const user = await requireClientAccountPage();
  const leads = await getMyProLeadsForBuyer(user.userId, user.email);
  const btpRef = await getBtpReferentiel();
  const ref = serializeBtpReferentiel(btpRef);

  const sirens = [...new Set(leads.map((l) => l.siren))];
  const details = await Promise.all(sirens.map((s) => getEntrepriseDetail(s)));
  const nomBySiren = new Map(sirens.map((s, i) => [s, details[i]?.nom ?? `Entreprise ${s}`]));

  function prestationLine(metierId: string | null, prestationId: string | null): string | null {
    if (!metierId || !prestationId) return null;
    const metier = getBtpMetierLabelFromRef(ref, metierId);
    const act = getPrestationActiviteLabel(ref, metierId, prestationId);
    if (!act) return metier;
    return metier ? `${metier} — ${act}` : act;
  }

  return (
    <div className="mx-auto max-w-2xl space-y-8">
      <header>
        <p className="text-sm text-ink-soft">
          <Link href="/compte" className="font-medium text-teal-700 hover:underline dark:text-teal-400">
            ← Mon compte
          </Link>
        </p>
        <h2 className="mt-4 font-[family-name:var(--font-display)] text-2xl font-semibold text-ink sm:text-3xl">
          Mes demandes de devis
        </h2>
        <p className="mt-2 text-sm text-ink-soft">
          Demandes envoyées depuis une fiche entreprise (bouton « Demander un devis »). Le professionnel te
          recontacte selon ses disponibilités ; le statut indique où en est le traitement côté pro.
        </p>
      </header>

      {leads.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-ink/15 bg-canvas-muted/30 px-6 py-10 text-center text-sm text-ink-soft dark:border-white/10">
          Tu n’as pas encore de demande enregistrée.{" "}
          <Link href="/" className="font-semibold text-teal-700 underline-offset-2 hover:underline dark:text-teal-400">
            Recherche un artisan
          </Link>
          , ouvre sa fiche et utilise « Demander un devis ».
        </div>
      ) : (
        <ul className="space-y-4">
          {leads.map((lead) => {
            const nom = nomBySiren.get(lead.siren) ?? lead.siren;
            const presta = prestationLine(lead.metierId, lead.prestationId);
            const msg = lead.message?.trim();
            return (
              <li
                key={lead.id}
                className="rounded-2xl border border-[var(--card-border)] bg-[var(--card)] p-5 backdrop-blur-md"
              >
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div>
                    <p className="font-semibold text-ink">
                      <Link
                        href={`/entreprise/${lead.siren}`}
                        className="text-teal-800 hover:underline dark:text-teal-300"
                      >
                        {nom}
                      </Link>
                    </p>
                    <p className="mt-0.5 font-mono text-xs text-ink-soft">SIREN {lead.siren}</p>
                  </div>
                  <div className="text-right text-xs text-ink-soft">
                    <time dateTime={lead.createdAt}>{formatDateFr(lead.createdAt)}</time>
                    <p className="mt-1">
                      <span className="rounded-full bg-teal-500/15 px-2 py-0.5 font-medium text-teal-950 dark:text-teal-200">
                        {leadStatusLabelForBuyer(lead.status)}
                      </span>
                    </p>
                  </div>
                </div>
                {lead.fullName ? (
                  <p className="mt-2 text-xs text-ink-soft">
                    Envoyée sous le nom : <span className="font-medium text-ink">{lead.fullName}</span>
                  </p>
                ) : null}
                {presta ? (
                  <p className="mt-2 text-sm text-ink">
                    <span className="font-medium text-ink-soft">Prestation : </span>
                    {presta}
                  </p>
                ) : null}
                {msg ? (
                  <p className="mt-2 line-clamp-4 whitespace-pre-wrap text-sm leading-relaxed text-ink">{msg}</p>
                ) : null}
                <p className="mt-4">
                  <Link
                    href={`/entreprise/${lead.siren}`}
                    className="text-sm font-semibold text-teal-700 underline-offset-2 hover:underline dark:text-teal-400"
                  >
                    Voir la fiche entreprise →
                  </Link>
                </p>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}

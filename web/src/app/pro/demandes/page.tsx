import Link from "next/link";
import { redirect } from "next/navigation";

import { requireProContext } from "@/lib/pro-auth";
import { getBtpMetierLabelFromRef, getBtpReferentiel, getPrestationActiviteLabel } from "@/lib/btp-referentiel";
import { quotePayloadToDisplayPairs } from "@/lib/quote-request";
import { countAiSuggestedLines } from "@/lib/lead-to-chantier";
import { getSupabaseAdmin } from "@/lib/supabase/admin";
import { hasPlanAtLeast } from "@/lib/pro-plan";

import { DeclineLeadButton } from "./decline-lead-button";
import { LeadAiDraftSection } from "./lead-dossier-panel";
import { LeadQuoteAiForm } from "./lead-quotes/lead-quote-ai-form";
import { LeadQuotesList } from "./lead-quotes/lead-quotes-list";

function formatDateFr(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return new Intl.DateTimeFormat("fr-FR", { day: "numeric", month: "long", year: "numeric" }).format(d);
}

const LEAD_STATUS_FILTER = new Set(["NEW", "IN_PROGRESS", "CLOSED", "ARCHIVED"]);

const LEAD_STATUS_LABEL: Record<string, string> = {
  NEW: "Nouveau",
  IN_PROGRESS: "En cours",
  CLOSED: "Clôturé",
  ARCHIVED: "Archivé",
};

export default async function ProDemandesPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string; quotes?: string }>;
}) {
  const ctx = await requireProContext();
  if (!ctx.artisanProfile) redirect("/pro/onboarding");
  const planId = ctx.subscription.planId;
  if (!ctx.subscription.isActive || !planId || !hasPlanAtLeast(planId, "relation")) {
    redirect("/pro/offre");
  }

  const sp = await searchParams;
  const statusFilter = typeof sp.status === "string" && LEAD_STATUS_FILTER.has(sp.status) ? sp.status : null;
  const quotesArchivedOnly = sp.quotes === "archived";

  const hasPilotage = hasPlanAtLeast(planId, "pilotage");

  const supabase = getSupabaseAdmin();
  const siren = ctx.artisanProfile.siren;

  let leadIdsForQuoteFilter: string[] | null = null;
  if (quotesArchivedOnly) {
    const { data: allLeadRows } = await supabase.from("ProLead").select("id").eq("siren", siren).limit(2000);
    const allIds = (allLeadRows ?? []).map((r) => String((r as { id?: unknown }).id ?? "")).filter(Boolean);
    if (allIds.length === 0) {
      leadIdsForQuoteFilter = [];
    } else {
      const { data: archQ } = await supabase
        .from("ProQuote")
        .select("leadId")
        .in("leadId", allIds)
        .in("status", ["CANCELLED", "ARCHIVED"]);
      leadIdsForQuoteFilter = [...new Set((archQ ?? []).map((r) => String((r as { leadId?: unknown }).leadId ?? "")).filter(Boolean))];
    }
  }

  let leads: {
    id: unknown;
    status: unknown;
    fullName: unknown;
    email: unknown;
    phone: unknown;
    message: unknown;
    metierId: unknown;
    prestationId: unknown;
    requestPayload: unknown;
    createdAt: unknown;
  }[];

  if (quotesArchivedOnly && leadIdsForQuoteFilter !== null && leadIdsForQuoteFilter.length === 0) {
    leads = [];
  } else {
    let leadsQuery = supabase
      .from("ProLead")
      .select("id,status,fullName,email,phone,message,metierId,prestationId,requestPayload,createdAt")
      .eq("siren", siren)
      .order("createdAt", { ascending: false })
      .limit(200);
    if (statusFilter) leadsQuery = leadsQuery.eq("status", statusFilter);
    if (quotesArchivedOnly && leadIdsForQuoteFilter !== null && leadIdsForQuoteFilter.length > 0) {
      leadsQuery = leadsQuery.in("id", leadIdsForQuoteFilter);
    }
    const { data, error } = await leadsQuery;
    if (error) throw error;
    leads = data ?? [];
  }

  const btpRef = await getBtpReferentiel();

  const leadIds = (leads ?? []).map((l) => l.id as string);
  const draftByLead: Record<
    string,
    {
      status: string;
      summary: string | null;
      missingFields: unknown;
      suggestedLines: unknown;
      assumptions: unknown;
      vigilancePoints: unknown;
      confidence: number | null;
      model: string | null;
    }
  > = {};
  const attachmentsByLead: Record<string, { id: string; storagePath: string }[]> = {};
  const quotesByLead: Record<
    string,
    {
      id: string;
      leadId: string | null;
      projectId: string | null;
      number: string;
      status: string;
      totalCents: number;
      sentAt: string | null;
      acceptedAt: string | null;
      createdAt: string;
    }[]
  > = {};

  if (leadIds.length > 0) {
    const [draftsRes, attRes, qRes] = await Promise.all([
      supabase
        .from("ProLeadAiDraft")
        .select("leadId,status,summary,missingFields,suggestedLines,assumptions,vigilancePoints,confidence,model")
        .in("leadId", leadIds),
      supabase.from("ProLeadAttachment").select("id,leadId,storagePath,sortOrder").in("leadId", leadIds),
      supabase
        .from("ProQuote")
        .select("id,leadId,projectId,number,status,totalCents,sentAt,acceptedAt,createdAt")
        .in("leadId", leadIds)
        .order("createdAt", { ascending: false }),
    ]);
    if (!draftsRes.error && draftsRes.data) {
      for (const row of draftsRes.data as Record<string, unknown>[]) {
        const lid = row.leadId as string;
        draftByLead[lid] = {
          status: String(row.status ?? ""),
          summary: (row.summary as string | null) ?? null,
          missingFields: row.missingFields,
          suggestedLines: row.suggestedLines,
          assumptions: row.assumptions,
          vigilancePoints: row.vigilancePoints,
          confidence: typeof row.confidence === "number" ? row.confidence : null,
          model: (row.model as string | null) ?? null,
        };
      }
    }
    if (!attRes.error && attRes.data) {
      const rows = [...(attRes.data as { id: string; leadId: string; storagePath: string; sortOrder: number }[])].sort(
        (a, b) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0),
      );
      for (const row of rows) {
        if (!attachmentsByLead[row.leadId]) attachmentsByLead[row.leadId] = [];
        attachmentsByLead[row.leadId].push({ id: row.id, storagePath: row.storagePath });
      }
    }
    if (!qRes.error && qRes.data) {
      for (const row of qRes.data as Record<string, unknown>[]) {
        const lid = String(row.leadId ?? "");
        if (!lid) continue;
        if (!quotesByLead[lid]) quotesByLead[lid] = [];
        quotesByLead[lid].push({
          id: String(row.id ?? ""),
          leadId: typeof row.leadId === "string" ? row.leadId : null,
          projectId: typeof row.projectId === "string" ? row.projectId : null,
          number: String(row.number ?? "—"),
          status: String(row.status ?? "DRAFT"),
          totalCents: typeof row.totalCents === "number" ? row.totalCents : 0,
          sentAt: typeof row.sentAt === "string" ? row.sentAt : null,
          acceptedAt: typeof row.acceptedAt === "string" ? row.acceptedAt : null,
          createdAt: String(row.createdAt ?? ""),
        });
      }
    }
  }

  return (
    <div className="min-h-screen bg-canvas px-4 py-10 sm:px-6">
      <div className="mx-auto max-w-3xl">
        <p className="text-sm text-ink-soft">
          <Link href="/pro/tableau" className="font-medium text-teal-700 hover:underline dark:text-teal-400">
            ← Retour au tableau de bord
          </Link>
        </p>

        <header className="mt-6 border-b border-ink/10 pb-6 dark:border-white/10">
          <p className="text-xs font-semibold uppercase tracking-wider text-teal-800 dark:text-teal-300">
            Pro Relation
          </p>
          <h1 className="mt-2 font-[family-name:var(--font-display)] text-3xl text-ink">
            Demandes entrantes
          </h1>
          {statusFilter || quotesArchivedOnly ? (
            <div
              className="mt-4 rounded-xl border border-amber-500/35 bg-amber-500/10 px-4 py-3 text-sm text-amber-950 dark:border-amber-500/25 dark:bg-amber-950/30 dark:text-amber-100"
              role="status"
            >
              {statusFilter ? (
                <span>
                  Filtre statut demande : <strong>{LEAD_STATUS_LABEL[statusFilter] ?? statusFilter}</strong>
                  {quotesArchivedOnly ? " · " : ""}
                </span>
              ) : null}
              {quotesArchivedOnly ? (
                <span>Demandes avec au moins un devis refusé ou archivé (statuts annulé / archivé).</span>
              ) : null}{" "}
              <Link href="/pro/demandes" className="font-semibold text-teal-800 underline-offset-2 hover:underline dark:text-teal-300">
                Tout afficher
              </Link>
            </div>
          ) : null}
          <p className="mt-2 text-sm text-ink-soft">
            Les demandes envoyées depuis ta fiche entreprise apparaissent ici : dossier structuré (surfaces, budget,
            périmètre…), photos uploadées, et un brouillon IA (résumé + postes suggérés sans prix) lorsque
            le client a accepté l’analyse automatisée. Le statut de chaque demande se met à jour tout seul : nouveau
            tant qu’aucune action n’est faite, en cours après l’envoi d’un devis par e-mail, archivé après validation
            de la commande, archivage « sans suite » sur un devis, ou si tu déclines la demande.
            {hasPilotage
              ? " Avec Pro Pilotage, tu peux créer un chantier (et un devis brouillon) directement depuis chaque demande."
              : " Avec Pro Pilotage, tu pourras créer un chantier et un devis brouillon depuis une demande."}
          </p>
        </header>

        {(!leads || leads.length === 0) ? (
          <p className="mt-8 rounded-2xl border border-dashed border-ink/15 bg-canvas-muted/30 px-6 py-10 text-center text-sm text-ink-soft dark:border-white/10">
            Aucune demande pour l’instant.
          </p>
        ) : (
          <ul className="mt-8 space-y-4">
            {leads.map((l) => {
              const payloadPairs = quotePayloadToDisplayPairs(l.requestPayload);
              const d = draftByLead[l.id as string] ?? null;
              const aiLineCount = countAiSuggestedLines(d?.suggestedLines);
              const defaultDraftQuote =
                aiLineCount > 0 && d != null && d.status !== "PENDING" && d.status !== "";
              return (
              <li key={l.id as string} className="rounded-2xl border border-[var(--card-border)] bg-[var(--card)] p-5 shadow-sm dark:border-white/10">
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div>
                    <p className="font-semibold text-ink">{(l.fullName as string) || "Client"}</p>
                    <p className="mt-0.5 text-xs text-ink-soft">
                      {formatDateFr(l.createdAt as string)}
                    </p>
                    <div className="mt-3 space-y-1">
                      <p className="text-xs text-ink-soft">
                        Statut :{" "}
                        <span className="font-semibold text-ink">
                          {LEAD_STATUS_LABEL[(l.status as string) || "NEW"] ?? (l.status as string) ?? "—"}
                        </span>
                      </p>
                      {(l.status as string) !== "ARCHIVED" ? (
                        <DeclineLeadButton leadId={l.id as string} />
                      ) : null}
                    </div>
                  </div>
                  <div className="flex flex-wrap gap-2 text-xs">
                    {(l.email as string | null) ? (
                      <a className="rounded-full bg-teal-500/10 px-3 py-1 font-semibold text-teal-900 dark:text-teal-200" href={`mailto:${l.email as string}`}>
                        {l.email as string}
                      </a>
                    ) : null}
                    {(l.phone as string | null) ? (
                      <a className="rounded-full bg-teal-500/10 px-3 py-1 font-semibold text-teal-900 dark:text-teal-200" href={`tel:${(l.phone as string).replace(/\s/g, "")}`}>
                        {l.phone as string}
                      </a>
                    ) : null}
                  </div>
                </div>
                {(l.metierId as string | null) || (l.prestationId as string | null) ? (
                  <div className="mt-3 rounded-xl border border-teal-500/20 bg-teal-500/5 px-4 py-3 text-sm dark:border-teal-400/15 dark:bg-teal-950/20">
                    <p className="text-xs font-semibold uppercase tracking-wider text-teal-900 dark:text-teal-200">
                      Demande structurée (devis)
                    </p>
                    <ul className="mt-2 space-y-1 text-ink">
                      {(l.metierId as string | null) ? (
                        <li>
                          <span className="text-ink-soft">Métier : </span>
                          {getBtpMetierLabelFromRef(btpRef, l.metierId as string) ?? (l.metierId as string)}
                        </li>
                      ) : null}
                      {(l.prestationId as string | null) && (l.metierId as string | null) ? (
                        <li>
                          <span className="text-ink-soft">Prestation : </span>
                          {getPrestationActiviteLabel(btpRef, l.metierId as string, l.prestationId as string) ??
                            (l.prestationId as string)}
                        </li>
                      ) : null}
                    </ul>
                    {payloadPairs.length > 0 ? (
                      <dl className="mt-3 grid gap-2 border-t border-ink/10 pt-3 text-sm dark:border-white/10">
                        {payloadPairs.map((row, idx) => (
                          <div key={`${row.label}-${idx}`}>
                            <dt className="text-xs font-semibold text-ink-soft">{row.label}</dt>
                            <dd className="mt-0.5 whitespace-pre-wrap text-ink">{row.value}</dd>
                          </div>
                        ))}
                      </dl>
                    ) : null}
                  </div>
                ) : null}
                <LeadAiDraftSection draft={d} attachments={attachmentsByLead[l.id as string] ?? []} />
                {(l.message as string | null) ? (
                  <p className="mt-3 whitespace-pre-wrap text-sm leading-relaxed text-ink">
                    {l.message as string}
                  </p>
                ) : (
                  <p className="mt-3 text-sm text-ink-soft">Aucun message.</p>
                )}
                {hasPilotage ? (
                  <>
                    <LeadQuoteAiForm leadId={l.id as string} />
                    <LeadQuotesList
                      leadId={l.id as string}
                      quotes={quotesByLead[l.id as string] ?? []}
                    />
                  </>
                ) : null}
              </li>
            );
            })}
          </ul>
        )}
      </div>
    </div>
  );
}


import Link from "next/link";
import { redirect } from "next/navigation";

import { requireProContext } from "@/lib/pro-auth";
import { getBtpMetierLabelFromRef, getBtpReferentiel, getPrestationActiviteLabel } from "@/lib/btp-referentiel";
import { quotePayloadToDisplayPairs } from "@/lib/quote-request";
import { countAiSuggestedLines } from "@/lib/lead-to-chantier";
import { getSupabaseAdmin } from "@/lib/supabase/admin";
import { hasPlanAtLeast } from "@/lib/pro-plan";

import { LeadAiDraftSection } from "./lead-dossier-panel";
import { LeadStatusForm } from "./lead-status-form";
import { LeadToChantierForm } from "./lead-to-chantier-form";

function formatDateFr(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return new Intl.DateTimeFormat("fr-FR", { day: "numeric", month: "long", year: "numeric" }).format(d);
}

export default async function ProDemandesPage() {
  const ctx = await requireProContext();
  if (!ctx.artisanProfile) redirect("/pro/onboarding");
  const planId = ctx.subscription.planId;
  if (!ctx.subscription.isActive || !planId || !hasPlanAtLeast(planId, "relation")) {
    redirect("/pro/offre");
  }

  const hasPilotage = hasPlanAtLeast(planId, "pilotage");

  const supabase = getSupabaseAdmin();
  const { data: leads, error } = await supabase
    .from("ProLead")
    .select("id,status,fullName,email,phone,message,metierId,prestationId,requestPayload,createdAt")
    .eq("siren", ctx.artisanProfile.siren)
    .order("createdAt", { ascending: false })
    .limit(200);
  if (error) throw error;

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

  if (leadIds.length > 0) {
    const [draftsRes, attRes] = await Promise.all([
      supabase
        .from("ProLeadAiDraft")
        .select("leadId,status,summary,missingFields,suggestedLines,assumptions,vigilancePoints,confidence,model")
        .in("leadId", leadIds),
      supabase.from("ProLeadAttachment").select("id,leadId,storagePath,sortOrder").in("leadId", leadIds),
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
          <p className="mt-2 text-sm text-ink-soft">
            Les demandes envoyées depuis ta fiche entreprise apparaissent ici : dossier structuré (surfaces, budget,
            périmètre…), photos uploadées, et un brouillon IA (résumé + postes suggérés sans prix) lorsque
            le client a accepté l’analyse automatisée.
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
                    <div className="mt-3">
                      <LeadStatusForm leadId={l.id as string} currentStatus={(l.status as string) || "NEW"} />
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
                  <LeadToChantierForm
                    leadId={l.id as string}
                    defaultWithDraftQuote={defaultDraftQuote}
                    aiLineCount={aiLineCount}
                  />
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


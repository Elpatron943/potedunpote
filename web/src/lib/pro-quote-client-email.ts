import { formatEurFromCents } from "@/lib/format-money";

type SendResult = { ok: true } | { ok: false; message: string };

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function lineTotalCents(row: Record<string, unknown>): number {
  const qty = typeof row.qty === "number" && Number.isFinite(row.qty) ? row.qty : 0;
  const unitEur = typeof row.unitPrice === "number" && Number.isFinite(row.unitPrice) ? row.unitPrice : 0;
  return Math.round(qty * unitEur * 100);
}

/** Texte + HTML des lignes devis (unitPrice en euros dans le JSON). */
export function formatQuoteLinesForClientEmail(linesJson: unknown): { text: string; html: string } {
  if (!Array.isArray(linesJson) || linesJson.length === 0) {
    return { text: "(détail des lignes non renseigné)", html: "<p><em>Détail des lignes non renseigné.</em></p>" };
  }
  const textLines: string[] = [];
  const htmlRows: string[] = [];
  for (const x of linesJson) {
    if (!x || typeof x !== "object") continue;
    const o = x as Record<string, unknown>;
    const label = typeof o.label === "string" ? o.label.trim() : "Ligne";
    const qty = typeof o.qty === "number" && Number.isFinite(o.qty) ? o.qty : 0;
    const unit = typeof o.unit === "string" ? o.unit.trim() : "";
    const unitEur = typeof o.unitPrice === "number" && Number.isFinite(o.unitPrice) ? o.unitPrice : 0;
    const sub = lineTotalCents(o);
    const unitStr = formatEurFromCents(Math.round(unitEur * 100));
    const subStr = formatEurFromCents(sub);
    const u = unit ? ` ${unit}` : "";
    textLines.push(`- ${label} : ${qty}${u} × ${unitStr} = ${subStr}`);
    htmlRows.push(
      `<tr><td style="padding:6px 8px;border-bottom:1px solid #e5e7eb;">${escapeHtml(label)}</td>` +
        `<td style="padding:6px 8px;border-bottom:1px solid #e5e7eb;text-align:right;">${escapeHtml(String(qty))}${u ? ` ${escapeHtml(unit)}` : ""}</td>` +
        `<td style="padding:6px 8px;border-bottom:1px solid #e5e7eb;text-align:right;">${escapeHtml(unitStr)}</td>` +
        `<td style="padding:6px 8px;border-bottom:1px solid #e5e7eb;text-align:right;">${escapeHtml(subStr)}</td></tr>`,
    );
  }
  const text = textLines.join("\n");
  const html =
    "<table style=\"border-collapse:collapse;width:100%;max-width:560px;font-size:14px;\">" +
    "<thead><tr>" +
    "<th align=\"left\" style=\"padding:6px 8px;border-bottom:2px solid #0d9488;\">Désignation</th>" +
    "<th align=\"right\" style=\"padding:6px 8px;border-bottom:2px solid #0d9488;\">Qté</th>" +
    "<th align=\"right\" style=\"padding:6px 8px;border-bottom:2px solid #0d9488;\">P.U.</th>" +
    "<th align=\"right\" style=\"padding:6px 8px;border-bottom:2px solid #0d9488;\">Montant</th>" +
    "</tr></thead><tbody>" +
    htmlRows.join("") +
    "</tbody></table>";
  return { text, html };
}

/**
 * Envoie le récapitulatif devis au client (Resend, ou log en dev sans clé).
 */
export async function sendProQuoteToClientEmail(params: {
  to: string;
  artisanLabel: string;
  clientName: string | null;
  quoteNumber: string;
  totalCents: number;
  linesJson: unknown;
}): Promise<SendResult> {
  const { to, artisanLabel, clientName, quoteNumber, totalCents, linesJson } = params;
  const apiKey = process.env.RESEND_API_KEY?.trim();
  const from = process.env.RESEND_FROM_EMAIL?.trim() || "onboarding@resend.dev";
  const subject = `Devis ${quoteNumber} — ${artisanLabel.slice(0, 50)}`;
  const totalStr = formatEurFromCents(totalCents);
  const { text: linesText, html: linesHtml } = formatQuoteLinesForClientEmail(linesJson);

  const greet = clientName?.trim() ? `Bonjour ${clientName.trim()},` : "Bonjour,";
  const text = [
    greet,
    "",
    `${artisanLabel} vous transmet son devis ${quoteNumber}.`,
    "",
    `Montant total indiqué : ${totalStr}`,
    "",
    "Détail :",
    linesText,
    "",
    "Merci de contacter l’artisan pour toute question ou validation.",
    "",
    "— Le pote d'un pote (message envoyé depuis la plateforme)",
  ].join("\n");

  const html =
    `<p>${escapeHtml(greet)}</p>` +
    `<p><strong>${escapeHtml(artisanLabel)}</strong> vous transmet son devis <strong>${escapeHtml(quoteNumber)}</strong>.</p>` +
    `<p>Montant total indiqué : <strong>${escapeHtml(totalStr)}</strong></p>` +
    `<h3 style="font-size:15px;margin:16px 0 8px;">Détail</h3>` +
    linesHtml +
    `<p style="margin-top:16px;font-size:13px;color:#6b7280;">Merci de contacter l’artisan pour toute question ou validation.</p>` +
    `<p style="font-size:12px;color:#9ca3af;">— Le pote d'un pote</p>`;

  if (!apiKey) {
    if (process.env.NODE_ENV === "development") {
      console.info(`[pro-quote-client-email] to=${to} subject=${subject}`);
      return { ok: true };
    }
    return { ok: false, message: "RESEND_API_KEY manquante (production)." };
  }

  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from,
      to: [to],
      subject,
      text,
      html,
    }),
  });

  if (!res.ok) {
    const errText = await res.text().catch(() => "");
    console.error("[pro-quote-client-email]", res.status, errText);
    return { ok: false, message: "Échec envoi e-mail (Resend)." };
  }

  return { ok: true };
}

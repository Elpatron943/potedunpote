import { getSiteUrl } from "@/lib/site-url";
import { getSupabaseAdmin } from "@/lib/supabase/admin";

type SendResult = { ok: true } | { ok: false; message: string };

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

/** E-mail du compte User lié au profil artisan pour ce SIREN. */
export async function getProUserEmailForSiren(siren: string): Promise<string | null> {
  if (!/^\d{9}$/.test(siren)) return null;
  const supabase = getSupabaseAdmin();
  const { data: profile, error: pErr } = await supabase
    .from("ArtisanProfile")
    .select("userId")
    .eq("siren", siren)
    .maybeSingle();
  if (pErr || !profile?.userId) return null;
  const { data: user, error: uErr } = await supabase
    .from("User")
    .select("email")
    .eq("id", profile.userId as string)
    .maybeSingle();
  if (uErr || !user?.email || typeof user.email !== "string") return null;
  const e = user.email.trim();
  return e.includes("@") ? e : null;
}

/**
 * Notifie le professionnel d’une nouvelle demande (fiche entreprise / devis).
 * Même transport que l’OTP : Resend, ou log en dev sans clé.
 */
export async function sendProLeadNotificationEmail(params: {
  to: string;
  clientName: string;
  prestationLine: string | null;
  demanderEmail: string | null;
  demanderPhone: string | null;
  messageExcerpt: string | null;
}): Promise<SendResult> {
  const { to, clientName, prestationLine, demanderEmail, demanderPhone, messageExcerpt } = params;
  const apiKey = process.env.RESEND_API_KEY?.trim();
  const from = process.env.RESEND_FROM_EMAIL?.trim() || "onboarding@resend.dev";
  const base = getSiteUrl();
  const demandesUrl = `${base}/pro/demandes`;

  const subject = `Nouvelle demande — ${clientName.slice(0, 60)}`;

  const lines: string[] = [
    "Bonjour,",
    "",
    "Tu as reçu une nouvelle demande depuis ta fiche sur Le pote d'un pote.",
    "",
    `Demandeur : ${clientName}`,
  ];
  if (prestationLine) lines.push(`Prestation indiquée : ${prestationLine}`);
  if (demanderEmail) lines.push(`E-mail : ${demanderEmail}`);
  if (demanderPhone) lines.push(`Téléphone : ${demanderPhone}`);
  if (messageExcerpt) {
    lines.push("");
    lines.push("Message (extrait) :");
    lines.push(messageExcerpt);
  }
  lines.push("");
  lines.push(`Consulte la demande et le brouillon d’analyse dans ton espace pro :`);
  lines.push(demandesUrl);
  lines.push("");
  lines.push("— Le pote d'un pote");

  const text = lines.join("\n");

  const htmlParts: string[] = [
    "<p>Bonjour,</p>",
    "<p>Tu as reçu une <strong>nouvelle demande</strong> depuis ta fiche sur Le pote d'un pote.</p>",
    "<ul>",
    `<li><strong>Demandeur :</strong> ${escapeHtml(clientName)}</li>`,
  ];
  if (prestationLine) {
    htmlParts.push(`<li><strong>Prestation :</strong> ${escapeHtml(prestationLine)}</li>`);
  }
  if (demanderEmail) htmlParts.push(`<li><strong>E-mail :</strong> ${escapeHtml(demanderEmail)}</li>`);
  if (demanderPhone) htmlParts.push(`<li><strong>Téléphone :</strong> ${escapeHtml(demanderPhone)}</li>`);
  htmlParts.push("</ul>");
  if (messageExcerpt) {
    htmlParts.push("<p><strong>Message (extrait)</strong></p>");
    htmlParts.push(`<p style="white-space:pre-wrap;">${escapeHtml(messageExcerpt)}</p>`);
  }
  htmlParts.push(
    `<p><a href="${escapeHtml(demandesUrl)}">Ouvrir mes demandes</a> dans l’espace professionnel.</p>`,
    "<p>— Le pote d'un pote</p>",
  );
  const html = htmlParts.join("\n");

  if (!apiKey) {
    if (process.env.NODE_ENV === "development") {
      console.info(`[pro-lead-notification-email] to=${to} subject=${subject}`);
      return { ok: true };
    }
    return {
      ok: false,
      message: "RESEND_API_KEY manquante (production).",
    };
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
    console.error("[pro-lead-notification-email]", res.status, errText);
    return { ok: false, message: "Échec envoi e-mail (Resend)." };
  }

  return { ok: true };
}

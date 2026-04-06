type SendResult = { ok: true } | { ok: false; message: string };

/**
 * Envoie le code OTP via Resend. Sans `RESEND_API_KEY` : en dev uniquement, log console.
 */
export async function sendSignupOtpEmail(params: {
  to: string;
  code: string;
  isPro: boolean;
}): Promise<SendResult> {
  const { to, code, isPro } = params;
  const apiKey = process.env.RESEND_API_KEY?.trim();
  const from =
    process.env.RESEND_FROM_EMAIL?.trim() || "Inscription <noreply@potedunpote.fr>";

  const subject = "Votre code de vérification — Le pote d'un pote";
  const portal = isPro ? "espace professionnel" : "espace particulier";
  const text = [
    `Bonjour,`,
    ``,
    `Voici votre code de vérification pour finaliser votre inscription (${portal}) :`,
    ``,
    `  ${code}`,
    ``,
    `Ce code expire dans 15 minutes. Si vous n'êtes pas à l'origine de cette demande, ignorez ce message.`,
    ``,
    `— Le pote d'un pote`,
  ].join("\n");

  const html = `
<p>Bonjour,</p>
<p>Voici votre code de vérification pour finaliser votre inscription <strong>(${portal})</strong> :</p>
<p style="font-size:1.5rem;font-weight:bold;letter-spacing:0.2em;">${code}</p>
<p>Ce code expire dans <strong>15 minutes</strong>. Si vous n'êtes pas à l'origine de cette demande, ignorez ce message.</p>
<p>— Le pote d'un pote</p>
`.trim();

  if (!apiKey) {
    if (process.env.NODE_ENV === "development") {
      console.info(`[send-signup-otp-email] to=${to} code=${code} (${portal})`);
      return { ok: true };
    }
    return {
      ok: false,
      message:
        "Envoi d'e-mails non configuré (RESEND_API_KEY). En production, ajoutez la clé Resend.",
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
    console.error("[send-signup-otp-email]", res.status, errText);
    return { ok: false, message: "Impossible d'envoyer l'e-mail pour le moment." };
  }

  return { ok: true };
}

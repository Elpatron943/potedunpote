import { createId } from "@paralleldrive/cuid2";
import { NextResponse } from "next/server";
import { hashPassword } from "@/lib/auth-password";
import { sendSignupOtpEmail } from "@/lib/send-signup-otp-email";
import {
  generateSignupOtpCode,
  hashSignupOtpCode,
  SIGNUP_OTP_EXPIRY_MS,
  SIGNUP_OTP_RESEND_COOLDOWN_MS,
} from "@/lib/signup-otp-code";
import { getSupabaseAdmin } from "@/lib/supabase/admin";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export async function POST(req: Request) {
  let body: { email?: string; password?: string; name?: string; portal?: string };
  try {
    body = (await req.json()) as typeof body;
  } catch {
    return NextResponse.json({ error: "Corps JSON invalide." }, { status: 400 });
  }

  const email = (body.email ?? "").trim().toLowerCase();
  const password = body.password ?? "";
  const name = (body.name ?? "").trim() || null;
  const portalRaw = (body.portal ?? "acheteur").trim().toLowerCase();
  /** Tous les comptes sont des comptes « membre » ; le statut pro vient uniquement du Kbis + `ArtisanProfile`. */
  const role = "CLIENT";
  if (portalRaw !== "pro" && portalRaw !== "acheteur") {
    return NextResponse.json({ error: "Portail d'inscription invalide." }, { status: 400 });
  }

  if (!EMAIL_RE.test(email)) {
    return NextResponse.json({ error: "Adresse e-mail invalide." }, { status: 400 });
  }
  if (password.length < 8) {
    return NextResponse.json(
      { error: "Le mot de passe doit contenir au moins 8 caractères." },
      { status: 400 },
    );
  }

  const supabase = getSupabaseAdmin();

  const { data: existingUser } = await supabase.from("User").select("id").eq("email", email).maybeSingle();
  if (existingUser) {
    return NextResponse.json({ error: "Un compte existe déjà avec cet e-mail." }, { status: 409 });
  }

  const { data: pending } = await supabase.from("SignupOtp").select("lastSentAt").eq("email", email).maybeSingle();

  if (pending?.lastSentAt) {
    const elapsed = Date.now() - new Date(pending.lastSentAt as string).getTime();
    if (elapsed < SIGNUP_OTP_RESEND_COOLDOWN_MS) {
      const waitSec = Math.ceil((SIGNUP_OTP_RESEND_COOLDOWN_MS - elapsed) / 1000);
      return NextResponse.json(
        { error: `Attends encore ${waitSec} s avant de redemander un code.` },
        { status: 429 },
      );
    }
  }

  const plainOtp = generateSignupOtpCode();
  let codeHash: string;
  try {
    codeHash = hashSignupOtpCode(plainOtp);
  } catch {
    return NextResponse.json({ error: "Configuration serveur incomplète." }, { status: 500 });
  }

  const passwordHash = await hashPassword(password);
  const now = new Date();
  const expiresAt = new Date(now.getTime() + SIGNUP_OTP_EXPIRY_MS);
  const id = createId();
  const nowIso = now.toISOString();

  await supabase.from("SignupOtp").delete().eq("email", email);

  const { error: insErr } = await supabase.from("SignupOtp").insert({
    id,
    email,
    codeHash,
    expiresAt: expiresAt.toISOString(),
    attempts: 0,
    name,
    passwordHash,
    role,
    lastSentAt: nowIso,
    createdAt: nowIso,
  });

  if (insErr) {
    if (insErr.code === "42P01" || /relation.*does not exist/i.test(insErr.message ?? "")) {
      return NextResponse.json(
        {
          error:
            "Table SignupOtp absente : exécute la migration SQL prisma/migrations/20260406200000_signup_otp dans Supabase.",
        },
        { status: 500 },
      );
    }
    console.error("[register/request]", insErr);
    return NextResponse.json({ error: "Enregistrement du code impossible." }, { status: 500 });
  }

  const sent = await sendSignupOtpEmail({
    to: email,
    code: plainOtp,
    isPro: portalRaw === "pro",
  });

  if (!sent.ok) {
    await supabase.from("SignupOtp").delete().eq("email", email);
    return NextResponse.json({ error: sent.message }, { status: 503 });
  }

  return NextResponse.json({
    ok: true,
    email,
    expiresInSeconds: Math.floor(SIGNUP_OTP_EXPIRY_MS / 1000),
  });
}

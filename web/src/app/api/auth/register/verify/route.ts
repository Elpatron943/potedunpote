import { createId } from "@paralleldrive/cuid2";
import { NextResponse } from "next/server";
import { sessionCookieOptions, SESSION_COOKIE, signSessionToken } from "@/lib/auth-session";
import {
  SIGNUP_OTP_MAX_ATTEMPTS,
  verifySignupOtpCode,
} from "@/lib/signup-otp-code";
import { getSupabaseAdmin } from "@/lib/supabase/admin";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export async function POST(req: Request) {
  let body: { email?: string; code?: string };
  try {
    body = (await req.json()) as typeof body;
  } catch {
    return NextResponse.json({ error: "Corps JSON invalide." }, { status: 400 });
  }

  const email = (body.email ?? "").trim().toLowerCase();
  const code = String(body.code ?? "").replace(/\D/g, "").trim();

  if (!EMAIL_RE.test(email)) {
    return NextResponse.json({ error: "Adresse e-mail invalide." }, { status: 400 });
  }
  if (code.length !== 6) {
    return NextResponse.json({ error: "Saisis le code à 6 chiffres reçu par e-mail." }, { status: 400 });
  }

  const supabase = getSupabaseAdmin();

  const { data: row, error: fetchErr } = await supabase
    .from("SignupOtp")
    .select("id, codeHash, expiresAt, attempts, name, passwordHash, role")
    .eq("email", email)
    .maybeSingle();

  if (fetchErr) {
    console.error("[register/verify]", fetchErr);
    return NextResponse.json({ error: "Erreur serveur." }, { status: 500 });
  }

  if (!row) {
    return NextResponse.json(
      { error: "Aucune inscription en cours pour cet e-mail. Recommence depuis le formulaire." },
      { status: 404 },
    );
  }

  if (new Date(row.expiresAt as string).getTime() < Date.now()) {
    await supabase.from("SignupOtp").delete().eq("email", email);
    return NextResponse.json({ error: "Code expiré. Demande un nouveau code." }, { status: 410 });
  }

  const attempts = (row.attempts as number) ?? 0;
  if (attempts >= SIGNUP_OTP_MAX_ATTEMPTS) {
    await supabase.from("SignupOtp").delete().eq("email", email);
    return NextResponse.json(
      { error: "Trop de tentatives. Recommence l'inscription depuis le début." },
      { status: 429 },
    );
  }

  const ok = verifySignupOtpCode(code, row.codeHash as string);
  if (!ok) {
    await supabase
      .from("SignupOtp")
      .update({ attempts: attempts + 1 })
      .eq("email", email);
    return NextResponse.json({ error: "Code incorrect." }, { status: 401 });
  }

  const { data: existingUser } = await supabase.from("User").select("id").eq("email", email).maybeSingle();
  if (existingUser) {
    await supabase.from("SignupOtp").delete().eq("email", email);
    return NextResponse.json({ error: "Un compte existe déjà avec cet e-mail." }, { status: 409 });
  }

  const now = new Date().toISOString();
  const userId = createId();

  const { data: user, error: userErr } = await supabase
    .from("User")
    .insert({
      id: userId,
      email,
      name: (row.name as string | null) ?? null,
      role: row.role as string,
      passwordHash: row.passwordHash as string,
      emailVerified: now,
      createdAt: now,
      updatedAt: now,
    })
    .select("id, email, name")
    .single();

  if (userErr) {
    console.error("[register/verify] insert User", userErr);
    return NextResponse.json({ error: "Création du compte impossible." }, { status: 500 });
  }

  await supabase.from("SignupOtp").delete().eq("email", email);

  const token = await signSessionToken(user.id as string);
  const res = NextResponse.json({ ok: true, user });
  res.cookies.set(SESSION_COOKIE, token, sessionCookieOptions());
  return res;
}

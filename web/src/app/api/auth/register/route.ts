import { createId } from "@paralleldrive/cuid2";
import { NextResponse } from "next/server";
import { hashPassword } from "@/lib/auth-password";
import { sessionCookieOptions, SESSION_COOKIE, signSessionToken } from "@/lib/auth-session";
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
  const role =
    portalRaw === "pro" ? ("ARTISAN" as const) : ("CLIENT" as const);
  if (portalRaw !== "pro" && portalRaw !== "acheteur") {
    return NextResponse.json({ error: "Portail d’inscription invalide." }, { status: 400 });
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
  const { data: existing } = await supabase.from("User").select("id").eq("email", email).maybeSingle();
  if (existing) {
    return NextResponse.json({ error: "Un compte existe déjà avec cet e-mail." }, { status: 409 });
  }

  const passwordHash = await hashPassword(password);
  const now = new Date().toISOString();
  const id = createId();

  const { data: user, error } = await supabase
    .from("User")
    .insert({
      id,
      email,
      name,
      role,
      passwordHash,
      emailVerified: now,
      createdAt: now,
      updatedAt: now,
    })
    .select("id, email, name")
    .single();

  if (error) throw error;
  if (!user) {
    return NextResponse.json({ error: "Création du compte impossible." }, { status: 500 });
  }

  const token = await signSessionToken(user.id as string);
  const res = NextResponse.json({ ok: true, user });
  res.cookies.set(SESSION_COOKIE, token, sessionCookieOptions());
  return res;
}

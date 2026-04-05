import { NextResponse } from "next/server";
import { hashPassword } from "@/lib/auth-password";
import { sessionCookieOptions, SESSION_COOKIE, signSessionToken } from "@/lib/auth-session";
import { prisma } from "@/lib/db";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export async function POST(req: Request) {
  let body: { email?: string; password?: string; name?: string };
  try {
    body = (await req.json()) as typeof body;
  } catch {
    return NextResponse.json({ error: "Corps JSON invalide." }, { status: 400 });
  }

  const email = (body.email ?? "").trim().toLowerCase();
  const password = body.password ?? "";
  const name = (body.name ?? "").trim() || null;

  if (!EMAIL_RE.test(email)) {
    return NextResponse.json({ error: "Adresse e-mail invalide." }, { status: 400 });
  }
  if (password.length < 8) {
    return NextResponse.json(
      { error: "Le mot de passe doit contenir au moins 8 caractères." },
      { status: 400 },
    );
  }

  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) {
    return NextResponse.json({ error: "Un compte existe déjà avec cet e-mail." }, { status: 409 });
  }

  const passwordHash = await hashPassword(password);
  const now = new Date();
  const user = await prisma.user.create({
    data: {
      email,
      name,
      passwordHash,
      emailVerified: now,
    },
    select: { id: true, email: true, name: true },
  });

  const token = await signSessionToken(user.id);
  const res = NextResponse.json({ ok: true, user });
  res.cookies.set(SESSION_COOKIE, token, sessionCookieOptions());
  return res;
}

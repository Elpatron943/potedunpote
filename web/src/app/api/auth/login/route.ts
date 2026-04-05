import { NextResponse } from "next/server";
import { verifyPassword } from "@/lib/auth-password";
import { sessionCookieOptions, SESSION_COOKIE, signSessionToken } from "@/lib/auth-session";
import { prisma } from "@/lib/db";

export async function POST(req: Request) {
  let body: { email?: string; password?: string };
  try {
    body = (await req.json()) as typeof body;
  } catch {
    return NextResponse.json({ error: "Corps JSON invalide." }, { status: 400 });
  }

  const email = (body.email ?? "").trim().toLowerCase();
  const password = body.password ?? "";

  if (!email || !password) {
    return NextResponse.json({ error: "E-mail et mot de passe requis." }, { status: 400 });
  }

  const user = await prisma.user.findUnique({
    where: { email },
    select: { id: true, email: true, name: true, passwordHash: true },
  });

  if (!user?.passwordHash) {
    return NextResponse.json({ error: "Identifiants incorrects." }, { status: 401 });
  }

  const ok = await verifyPassword(password, user.passwordHash);
  if (!ok) {
    return NextResponse.json({ error: "Identifiants incorrects." }, { status: 401 });
  }

  const token = await signSessionToken(user.id);
  const res = NextResponse.json({
    ok: true,
    user: { id: user.id, email: user.email, name: user.name },
  });
  res.cookies.set(SESSION_COOKIE, token, sessionCookieOptions());
  return res;
}

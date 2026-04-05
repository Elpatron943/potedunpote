import { SignJWT, jwtVerify } from "jose";
import { cookies } from "next/headers";
import { getAuthSecret } from "@/lib/auth-secret";

export const SESSION_COOKIE = "lpdp_session";
const SESSION_MAX_AGE_SEC = 60 * 60 * 24 * 30; // 30 j

export async function signSessionToken(userId: string): Promise<string> {
  const secret = getAuthSecret();
  return new SignJWT({})
    .setProtectedHeader({ alg: "HS256" })
    .setSubject(userId)
    .setIssuedAt()
    .setExpirationTime("30d")
    .sign(secret);
}

export async function getSession(): Promise<{ userId: string } | null> {
  const store = await cookies();
  const token = store.get(SESSION_COOKIE)?.value;
  if (!token) return null;
  try {
    const { payload } = await jwtVerify(token, getAuthSecret());
    const sub = payload.sub;
    if (typeof sub !== "string" || !sub) return null;
    return { userId: sub };
  } catch {
    return null;
  }
}

export function sessionCookieOptions() {
  return {
    httpOnly: true as const,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax" as const,
    path: "/",
    maxAge: SESSION_MAX_AGE_SEC,
  };
}

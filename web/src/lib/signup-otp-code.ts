import { createHmac, randomInt, timingSafeEqual } from "crypto";

const OTP_LEN = 6;

export function generateSignupOtpCode(): string {
  const min = 10 ** (OTP_LEN - 1);
  const max = 10 ** OTP_LEN - 1;
  return String(randomInt(min, max + 1));
}

export function hashSignupOtpCode(code: string): string {
  const secret = process.env.AUTH_SECRET?.trim();
  if (!secret) throw new Error("AUTH_SECRET manquant");
  return createHmac("sha256", secret).update(`signup-otp-v1:${code.trim()}`).digest("hex");
}

export function verifySignupOtpCode(code: string, storedHash: string): boolean {
  try {
    const h = hashSignupOtpCode(code);
    const a = Buffer.from(h, "utf8");
    const b = Buffer.from(storedHash, "utf8");
    if (a.length !== b.length) return false;
    return timingSafeEqual(a, b);
  } catch {
    return false;
  }
}

export const SIGNUP_OTP_EXPIRY_MS = 15 * 60 * 1000;
export const SIGNUP_OTP_RESEND_COOLDOWN_MS = 60 * 1000;
export const SIGNUP_OTP_MAX_ATTEMPTS = 5;

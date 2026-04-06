"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useState } from "react";
import Link from "next/link";
import { ARTISAN_SUBSCRIBE_NEXT } from "@/lib/artisan-subscribe-nav";
import { PORTAIL_ACHETEUR_CONNEXION, PORTAIL_PRO_CONNEXION } from "@/lib/auth-portals";

export type ConnexionPortal = "acheteur" | "pro";

type RegisterStep = "credentials" | "otp";

export function ConnexionForm({ portal }: { portal: ConnexionPortal }) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const defaultNext = portal === "pro" ? ARTISAN_SUBSCRIBE_NEXT : "/compte";
  const nextUrl = searchParams.get("next") ?? defaultNext;

  const [mode, setMode] = useState<"login" | "register">("login");
  const [registerStep, setRegisterStep] = useState<RegisterStep>("credentials");
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  /** Données inscription entre demande OTP et vérification (mot de passe uniquement en mémoire). */
  const [registerDraft, setRegisterDraft] = useState<{
    email: string;
    password: string;
    name: string;
  } | null>(null);
  const [otpCode, setOtpCode] = useState("");

  function resetRegisterFlow() {
    setRegisterStep("credentials");
    setRegisterDraft(null);
    setOtpCode("");
  }

  async function postRegisterRequest(email: string, password: string, name: string) {
    const res = await fetch("/api/auth/register/request", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        email,
        password,
        name: name || undefined,
        portal,
      }),
    });
    const data = (await res.json()) as { error?: string };
    if (!res.ok) {
      setError(data.error ?? "Une erreur est survenue.");
      return false;
    }
    return true;
  }

  async function handleLoginOrRegisterCredentials(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    setPending(true);
    const fd = new FormData(e.currentTarget);
    const email = String(fd.get("email") ?? "").trim();
    const password = String(fd.get("password") ?? "");
    const name = String(fd.get("name") ?? "").trim();

    try {
      if (mode === "login") {
        const res = await fetch("/api/auth/login", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ email, password }),
        });
        const data = (await res.json()) as { error?: string };
        if (!res.ok) {
          setError(data.error ?? "Une erreur est survenue.");
          setPending(false);
          return;
        }
        const safe =
          nextUrl.startsWith("/") && !nextUrl.startsWith("//") ? nextUrl : "/";
        router.push(safe);
        router.refresh();
        return;
      }

      const ok = await postRegisterRequest(email, password, name);
      if (!ok) {
        setPending(false);
        return;
      }
      setRegisterDraft({ email, password, name });
      setRegisterStep("otp");
      setOtpCode("");
    } catch {
      setError("Impossible de contacter le serveur.");
    } finally {
      setPending(false);
    }
  }

  async function handleVerifyOtp(e: React.FormEvent) {
    e.preventDefault();
    if (!registerDraft) return;
    setError(null);
    setPending(true);
    const code = otpCode.replace(/\D/g, "");
    try {
      const res = await fetch("/api/auth/register/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: registerDraft.email, code }),
      });
      const data = (await res.json()) as { error?: string };
      if (!res.ok) {
        setError(data.error ?? "Une erreur est survenue.");
        setPending(false);
        return;
      }
      resetRegisterFlow();
      const safe =
        nextUrl.startsWith("/") && !nextUrl.startsWith("//") ? nextUrl : "/";
      router.push(safe);
      router.refresh();
    } catch {
      setError("Impossible de contacter le serveur.");
    } finally {
      setPending(false);
    }
  }

  async function handleResendOtp() {
    if (!registerDraft) return;
    setError(null);
    setPending(true);
    try {
      const ok = await postRegisterRequest(
        registerDraft.email,
        registerDraft.password,
        registerDraft.name,
      );
      if (ok) setOtpCode("");
    } catch {
      setError("Impossible de contacter le serveur.");
    } finally {
      setPending(false);
    }
  }

  const otherPortalHref =
    portal === "acheteur" ? PORTAIL_PRO_CONNEXION : PORTAIL_ACHETEUR_CONNEXION;
  const otherPortalLabel =
    portal === "acheteur" ? "Espace professionnel →" : "← Portail particuliers (avis)";

  return (
    <div className="mx-auto max-w-md space-y-6">
      <div className="flex rounded-2xl border border-ink/10 p-1 dark:border-white/10">
        <button
          type="button"
          onClick={() => {
            setMode("login");
            setError(null);
            resetRegisterFlow();
          }}
          className={`flex-1 rounded-xl py-2.5 text-sm font-semibold transition ${
            mode === "login"
              ? "bg-teal-700 text-white dark:bg-teal-600"
              : "text-ink-soft hover:text-ink"
          }`}
        >
          Connexion
        </button>
        <button
          type="button"
          onClick={() => {
            setMode("register");
            setError(null);
            resetRegisterFlow();
          }}
          className={`flex-1 rounded-xl py-2.5 text-sm font-semibold transition ${
            mode === "register"
              ? "bg-teal-700 text-white dark:bg-teal-600"
              : "text-ink-soft hover:text-ink"
          }`}
        >
          Créer un compte
        </button>
      </div>

      {error ? (
        <p
          className="rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-900 dark:text-red-200"
          role="alert"
        >
          {error}
        </p>
      ) : null}

      {mode === "register" && registerStep === "otp" && registerDraft ? (
        <div className="space-y-4">
          <p className="text-sm text-ink-soft">
            Nous avons envoyé un <strong className="font-medium text-ink">code à 6 chiffres</strong> à{" "}
            <strong className="font-medium text-ink">{registerDraft.email}</strong>. Saisis-le ci-dessous pour
            activer ton compte ({portal === "pro" ? "professionnel" : "particulier"}).
          </p>
          <form onSubmit={handleVerifyOtp} className="space-y-4">
            <label className="flex flex-col gap-2">
              <span className="text-xs font-semibold uppercase tracking-wider text-ink-soft">
                Code de vérification
              </span>
              <input
                type="text"
                inputMode="numeric"
                autoComplete="one-time-code"
                maxLength={6}
                value={otpCode}
                onChange={(ev) => setOtpCode(ev.target.value.replace(/\D/g, "").slice(0, 6))}
                placeholder="000000"
                className="rounded-2xl border border-ink/10 bg-canvas/80 px-4 py-3 text-center font-mono text-xl tracking-[0.35em] text-ink dark:border-white/10 dark:bg-canvas-muted/40"
                required
              />
            </label>
            <button
              type="submit"
              disabled={pending || otpCode.length !== 6}
              className="w-full min-h-[3rem] rounded-2xl bg-teal-700 py-3 text-sm font-bold text-white shadow-md transition hover:bg-teal-800 disabled:opacity-50 dark:bg-teal-600 dark:hover:bg-teal-500"
            >
              {pending ? "Vérification…" : "Valider et ouvrir ma session"}
            </button>
          </form>
          <div className="flex flex-col gap-2 text-center text-sm">
            <button
              type="button"
              disabled={pending}
              onClick={() => void handleResendOtp()}
              className="font-medium text-teal-700 hover:underline disabled:opacity-50 dark:text-teal-400"
            >
              Renvoyer le code
            </button>
            <button
              type="button"
              disabled={pending}
              onClick={() => {
                resetRegisterFlow();
                setError(null);
              }}
              className="text-ink-soft hover:text-ink hover:underline disabled:opacity-50"
            >
              ← Modifier e-mail ou mot de passe
            </button>
          </div>
        </div>
      ) : (
        <form onSubmit={handleLoginOrRegisterCredentials} className="space-y-4">
          {mode === "register" ? (
            <label className="flex flex-col gap-2">
              <span className="text-xs font-semibold uppercase tracking-wider text-ink-soft">
                Prénom ou pseudo <span className="font-normal normal-case">(optionnel)</span>
              </span>
              <input
                name="name"
                type="text"
                autoComplete="nickname"
                className="rounded-2xl border border-ink/10 bg-canvas/80 px-4 py-3 text-ink dark:border-white/10 dark:bg-canvas-muted/40"
              />
            </label>
          ) : null}

          <label className="flex flex-col gap-2">
            <span className="text-xs font-semibold uppercase tracking-wider text-ink-soft">
              E-mail
            </span>
            <input
              name="email"
              type="email"
              required
              autoComplete="email"
              className="rounded-2xl border border-ink/10 bg-canvas/80 px-4 py-3 text-ink dark:border-white/10 dark:bg-canvas-muted/40"
            />
          </label>

          <label className="flex flex-col gap-2">
            <span className="text-xs font-semibold uppercase tracking-wider text-ink-soft">
              Mot de passe
              {mode === "register" ? (
                <span className="ml-1 font-normal normal-case text-ink-soft/80">
                  (min. 8 caractères)
                </span>
              ) : null}
            </span>
            <input
              name="password"
              type="password"
              required
              minLength={mode === "register" ? 8 : undefined}
              autoComplete={mode === "login" ? "current-password" : "new-password"}
              className="rounded-2xl border border-ink/10 bg-canvas/80 px-4 py-3 text-ink dark:border-white/10 dark:bg-canvas-muted/40"
            />
          </label>

          {mode === "register" ? (
            <p className="text-xs text-ink-soft">
              Un code de vérification sera envoyé à ton adresse e-mail (particulier ou pro selon ce portail).
            </p>
          ) : null}

          <button
            type="submit"
            disabled={pending}
            className="w-full min-h-[3rem] rounded-2xl bg-teal-700 py-3 text-sm font-bold text-white shadow-md transition hover:bg-teal-800 disabled:opacity-50 dark:bg-teal-600 dark:hover:bg-teal-500"
          >
            {pending
              ? "Patience…"
              : mode === "login"
                ? "Se connecter"
                : "Recevoir le code par e-mail"}
          </button>
        </form>
      )}

      <div className="space-y-2 text-center text-sm text-ink-soft">
        <p>
          <Link href="/" className="font-medium text-teal-700 hover:underline dark:text-teal-400">
            ← Retour à l’accueil
          </Link>
        </p>
        <p>
          <Link
            href={otherPortalHref}
            className="font-medium text-ink-soft underline decoration-ink/20 underline-offset-2 hover:text-ink hover:decoration-ink/40"
          >
            {otherPortalLabel}
          </Link>
        </p>
      </div>
    </div>
  );
}

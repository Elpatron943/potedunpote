"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useState } from "react";
import Link from "next/link";

export function ConnexionForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const nextUrl = searchParams.get("next") ?? "/";

  const [mode, setMode] = useState<"login" | "register">("login");
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    setPending(true);
    const fd = new FormData(e.currentTarget);
    const email = String(fd.get("email") ?? "").trim();
    const password = String(fd.get("password") ?? "");
    const name = String(fd.get("name") ?? "").trim();

    try {
      const path = mode === "login" ? "/api/auth/login" : "/api/auth/register";
      const body =
        mode === "login"
          ? { email, password }
          : { email, password, name: name || undefined };

      const res = await fetch(path, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
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
    } catch {
      setError("Impossible de contacter le serveur.");
      setPending(false);
    }
  }

  return (
    <div className="mx-auto max-w-md space-y-6">
      <div className="flex rounded-2xl border border-ink/10 p-1 dark:border-white/10">
        <button
          type="button"
          onClick={() => {
            setMode("login");
            setError(null);
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

      <form onSubmit={handleSubmit} className="space-y-4">
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

        <button
          type="submit"
          disabled={pending}
          className="w-full min-h-[3rem] rounded-2xl bg-teal-700 py-3 text-sm font-bold text-white shadow-md transition hover:bg-teal-800 disabled:opacity-50 dark:bg-teal-600 dark:hover:bg-teal-500"
        >
          {pending ? "Patience…" : mode === "login" ? "Se connecter" : "Créer mon compte"}
        </button>
      </form>

      <p className="text-center text-sm text-ink-soft">
        <Link href="/" className="font-medium text-teal-700 hover:underline dark:text-teal-400">
          ← Retour à l’accueil
        </Link>
      </p>
    </div>
  );
}

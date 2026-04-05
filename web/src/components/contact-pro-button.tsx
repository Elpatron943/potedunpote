"use client";

import { useCallback, useEffect, useId, useState, type ReactNode } from "react";

import type { PremiumContactInfo, PremiumContactLinks } from "@/lib/artisan-premium-contact";

function safeExternalUrl(raw: string): string | null {
  const t = raw.trim();
  if (!t) return null;
  try {
    const u = new URL(t.startsWith("http://") || t.startsWith("https://") ? t : `https://${t}`);
    if (u.protocol !== "http:" && u.protocol !== "https:") return null;
    return u.href;
  } catch {
    return null;
  }
}

function linkRow(label: string, href: string) {
  const safe = safeExternalUrl(href);
  if (!safe) return null;
  return (
    <a
      href={safe}
      target="_blank"
      rel="noopener noreferrer"
      className="inline-flex min-h-[2.75rem] w-full items-center justify-center rounded-xl border border-accent/40 bg-accent/10 px-4 py-2.5 text-sm font-semibold text-accent transition hover:bg-accent/20 dark:border-teal-400/40 dark:text-teal-200"
    >
      {label}
    </a>
  );
}

function linksContent(links: PremiumContactLinks | null) {
  if (!links) return null;
  const rows: ReactNode[] = [];
  const w = linkRow("Site web", links.website ?? "");
  if (w) rows.push(<div key="web">{w}</div>);
  const ig = linkRow("Instagram", links.instagram ?? "");
  if (ig) rows.push(<div key="ig">{ig}</div>);
  const fb = linkRow("Facebook", links.facebook ?? "");
  if (fb) rows.push(<div key="fb">{fb}</div>);
  const li = linkRow("LinkedIn", links.linkedin ?? "");
  if (li) rows.push(<div key="li">{li}</div>);
  return rows.length > 0 ? <div className="mt-4 space-y-2">{rows}</div> : null;
}

export function ContactProButton({
  raisonSociale,
  contact,
  className = "",
}: {
  raisonSociale: string;
  contact: PremiumContactInfo;
  className?: string;
}) {
  const [open, setOpen] = useState(false);
  const titleId = useId();
  const descId = useId();

  const close = useCallback(() => setOpen(false), []);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") close();
    };
    document.addEventListener("keydown", onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = prev;
    };
  }, [open, close]);

  const phone = contact.phonePublic?.trim() ?? "";
  const telHref = phone ? `tel:${phone.replace(/\s/g, "")}` : null;
  const extra = linksContent(contact.contactLinks);
  const hasAny = Boolean(telHref || extra);

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className={`inline-flex min-h-[2.75rem] w-full items-center justify-center rounded-xl border border-accent/50 bg-accent/15 px-4 py-2.5 text-center text-sm font-bold text-accent shadow-sm transition hover:bg-accent/25 dark:border-teal-400/50 dark:text-teal-200 dark:hover:bg-teal-500/20 sm:w-auto sm:min-w-[140px] sm:flex-none ${className}`}
      >
        Contacter
      </button>
      {open ? (
        <div
          className="fixed inset-0 z-[80] flex items-end justify-center bg-black/50 p-4 sm:items-center"
          role="presentation"
          onMouseDown={(e) => {
            if (e.target === e.currentTarget) close();
          }}
        >
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby={titleId}
            aria-describedby={descId}
            className="max-h-[min(90vh,32rem)] w-full max-w-md overflow-y-auto rounded-2xl border border-[var(--card-border)] bg-[var(--card)] p-6 shadow-xl backdrop-blur-md"
          >
            <h2 id={titleId} className="font-[family-name:var(--font-display)] text-xl text-ink">
              Contacter {raisonSociale}
            </h2>
            <p id={descId} className="mt-2 text-sm text-ink-soft">
              Coordonnées mises à disposition par le professionnel (abonnement Pro actif).
            </p>
            {hasAny ? (
              <div className="mt-5 space-y-3">
                {telHref ? (
                  <a
                    href={telHref}
                    className="inline-flex min-h-[2.75rem] w-full items-center justify-center rounded-xl bg-teal-700 px-4 py-2.5 text-center text-sm font-bold text-white shadow-sm transition hover:bg-teal-800 dark:bg-teal-600 dark:hover:bg-teal-500"
                  >
                    Appeler {phone}
                  </a>
                ) : null}
                {extra}
              </div>
            ) : (
              <p className="mt-5 rounded-xl border border-ink/10 bg-canvas-muted/50 p-4 text-sm text-ink-soft dark:border-white/10">
                Ce professionnel a activé la visibilité Pro ; il peut compléter son téléphone et ses liens
                depuis son espace artisan.
              </p>
            )}
            <button
              type="button"
              onClick={close}
              className="mt-6 w-full rounded-xl border border-ink/15 px-4 py-2.5 text-sm font-semibold text-ink transition hover:bg-ink/5 dark:border-white/15 dark:hover:bg-white/5"
            >
              Fermer
            </button>
          </div>
        </div>
      ) : null}
    </>
  );
}

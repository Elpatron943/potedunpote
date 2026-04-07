import Link from "next/link";

const TABS = [
  { id: "devis" as const, label: "Devis" },
  { id: "commande" as const, label: "Commande" },
  { id: "facture" as const, label: "Facture" },
];

export type ChantierTabId = (typeof TABS)[number]["id"];

export function parseChantierTab(raw: string | undefined): ChantierTabId {
  if (raw === "commande" || raw === "facture") return raw;
  return "devis";
}

export function ChantierTabsNav({ projectId, active }: { projectId: string; active: ChantierTabId }) {
  return (
    <nav
      className="flex flex-wrap gap-1 rounded-2xl border border-[var(--card-border)] bg-[var(--card)] p-1.5 shadow-sm dark:border-white/10"
      aria-label="Sections chantier"
    >
      {TABS.map((t) => {
        const isActive = t.id === active;
        return (
          <Link
            key={t.id}
            href={`/pro/chantiers/${projectId}?tab=${t.id}`}
            scroll={false}
            className={
              isActive
                ? "min-h-[2.5rem] flex-1 rounded-xl bg-teal-700 px-4 py-2 text-center text-sm font-semibold text-white sm:flex-none dark:bg-teal-600"
                : "min-h-[2.5rem] flex-1 rounded-xl px-4 py-2 text-center text-sm font-medium text-ink-soft transition hover:bg-canvas-muted/50 hover:text-ink dark:hover:bg-white/10"
            }
          >
            {t.label}
          </Link>
        );
      })}
    </nav>
  );
}

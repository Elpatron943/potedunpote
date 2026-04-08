import type { Metadata } from "next";
import Link from "next/link";

import { requireClientAccountPage } from "@/lib/client-account";
import { BuyerSettingsForm } from "./settings-form";

export const metadata: Metadata = {
  title: "Paramètres",
  description: "Paramètres du compte acheteur.",
};

export default async function CompteParametresPage() {
  const user = await requireClientAccountPage();
  return (
    <div className="mx-auto max-w-2xl space-y-8">
      <header>
        <p className="text-sm text-ink-soft">
          <Link href="/compte" className="font-medium text-teal-700 hover:underline dark:text-teal-400">
            ← Mon compte
          </Link>
        </p>
        <h2 className="mt-4 font-[family-name:var(--font-display)] text-2xl font-semibold text-ink sm:text-3xl">
          Paramètres
        </h2>
        <p className="mt-2 text-sm text-ink-soft">Gère tes informations de portail (acheteur).</p>
      </header>

      <BuyerSettingsForm initialName={user.name} email={user.email} />
    </div>
  );
}

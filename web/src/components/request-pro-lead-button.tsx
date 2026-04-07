"use client";

import { useCallback, useState } from "react";

import { RequestProLeadDialog } from "@/components/request-pro-lead-dialog";

export function RequestProLeadButton({
  siren,
  raisonSociale,
}: {
  siren: string;
  raisonSociale: string;
}) {
  const [open, setOpen] = useState(false);

  const close = useCallback(() => {
    setOpen(false);
  }, []);

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="inline-flex min-h-[2.75rem] items-center justify-center rounded-xl bg-teal-700 px-4 py-2.5 text-sm font-bold text-white shadow-sm transition hover:bg-teal-800 dark:bg-teal-600 dark:hover:bg-teal-500"
      >
        Demander un devis
      </button>
      <RequestProLeadDialog siren={siren} raisonSociale={raisonSociale} open={open} onClose={close} />
    </>
  );
}

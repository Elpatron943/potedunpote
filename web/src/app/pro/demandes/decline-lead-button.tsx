"use client";

import { useActionState } from "react";

import { declineIncomingLeadAction } from "@/app/pro/leads.actions";

type Props = {
  leadId: string;
};

export function DeclineLeadButton({ leadId }: Props) {
  const [state, action, pending] = useActionState(declineIncomingLeadAction, null);

  return (
    <form
      action={action}
      className="mt-2 inline-flex flex-wrap items-center gap-2"
      onSubmit={(e) => {
        if (!window.confirm("Décliner cette demande ? Elle sera archivée et sortira des demandes actives.")) {
          e.preventDefault();
        }
      }}
    >
      <input type="hidden" name="leadId" value={leadId} />
      <button
        type="submit"
        disabled={pending}
        className="rounded-full border border-ink/20 bg-transparent px-3 py-1 text-xs font-medium text-ink-soft hover:border-red-500/40 hover:text-red-700 disabled:opacity-50 dark:border-white/15 dark:hover:border-red-400/35 dark:hover:text-red-300"
      >
        {pending ? "…" : "Décliner la demande"}
      </button>
      {state?.ok === false && state.error ? (
        <span className="text-xs text-red-600 dark:text-red-400">{state.error}</span>
      ) : null}
    </form>
  );
}

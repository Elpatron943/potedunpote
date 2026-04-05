export type BtpMetier = {
  id: string;
  label: string;
  /** Code(s) NAF / APE (activité principale), séparés par des virgules si besoin */
  codeNaf: string;
};

/** Métiers BTP fréquents — codes NAF révisés. */
export const BTP_METIERS: BtpMetier[] = [
  {
    id: "plomberie",
    label: "Plomberie & chauffage",
    codeNaf: "43.22A,43.22B",
  },
  {
    id: "electricite",
    label: "Électricité (installations)",
    codeNaf: "43.21A",
  },
  {
    id: "maconnerie",
    label: "Maçonnerie & gros œuvre",
    codeNaf: "43.99A",
  },
  {
    id: "menuiserie",
    label: "Menuiserie, bois & PVC",
    codeNaf: "43.32A",
  },
  {
    id: "peinture",
    label: "Peinture & vitrerie",
    codeNaf: "43.34Z",
  },
  {
    id: "carrelage",
    label: "Carrelage & revêtements sols/murs",
    codeNaf: "43.33Z",
  },
  {
    id: "platrerie",
    label: "Plâtrerie & plaques de plâtre",
    codeNaf: "43.31Z",
  },
  {
    id: "couverture",
    label: "Couverture & étanchéité toiture",
    codeNaf: "43.91A,43.91B",
  },
  {
    id: "demolition",
    label: "Démolition & terrassement",
    codeNaf: "43.11Z,43.12A,43.12B",
  },
  {
    id: "autres-btp",
    label: "Autres travaux spécialisés BTP",
    codeNaf: "43.99C",
  },
];

export function getBtpMetier(id: string): BtpMetier | undefined {
  return BTP_METIERS.find((m) => m.id === id);
}

export function getBtpMetierLabel(id: string): string | null {
  return getBtpMetier(id)?.label ?? null;
}

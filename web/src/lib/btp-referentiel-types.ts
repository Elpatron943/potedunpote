export type BtpMetier = {
  id: string;
  label: string;
  /** Code(s) NAF / APE pour la recherche entreprise */
  codeNaf: string;
};

export type SousActivite = { id: string; label: string };

export type BtpReferentiel = {
  metiers: BtpMetier[];
  prestationsByMetierId: Record<string, SousActivite[]>;
  surfacePricedActiviteIds: Set<string>;
};

/** Version JSON pour les composants client (formulaires). */
export type SerializedBtpReferentiel = {
  metiers: { id: string; label: string }[];
  prestationsByMetierId: Record<string, SousActivite[]>;
  surfacePricedActiviteIds: string[];
};

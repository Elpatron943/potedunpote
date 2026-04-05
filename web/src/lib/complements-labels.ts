/** Libellés FR pour les champs du bloc `complements`. */
export const COMPLEMENT_LABELS: Record<string, string> = {
  collectivite_territoriale: "Collectivité territoriale",
  convention_collective_renseignee: "Convention collective renseignée",
  liste_idcc: "Liste IDCC (conventions collectives)",
  liste_finess_juridique: "Liste FINESS juridique",
  egapro_renseignee: "Index égalité pro (Egapro) renseigné",
  est_achats_responsables: "Achats responsables",
  est_alim_confiance: "Alim’confiance",
  est_association: "Association",
  est_bio: "Bio",
  est_entrepreneur_individuel: "Entrepreneur individuel",
  est_entrepreneur_spectacle: "Entrepreneur du spectacle",
  est_ess: "Économie sociale et solidaire (ESS)",
  est_finess: "FINESS",
  est_organisme_formation: "Organisme de formation",
  est_qualiopi: "Certification Qualiopi",
  liste_id_organisme_formation: "Liste ID organismes de formation",
  est_rge: "Reconnu garant de l’environnement (RGE)",
  est_service_public: "Service public",
  est_l100_3: "L100-3 (sociétés à mission)",
  est_siae: "SIAE",
  est_societe_mission: "Société à mission",
  est_uai: "UAI",
  est_patrimoine_vivant: "Entreprise du patrimoine vivant",
  bilan_ges_renseigne: "Bilan GES renseigné",
  identifiant_association: "Identifiant association (RNA)",
  statut_entrepreneur_spectacle: "Statut entrepreneur du spectacle",
  type_siae: "Type SIAE",
  aide_minimis_renseignee: "Aides de minimis renseignées",
};

export function complementKeyLabel(key: string): string {
  return COMPLEMENT_LABELS[key] ?? key.replaceAll("_", " ");
}

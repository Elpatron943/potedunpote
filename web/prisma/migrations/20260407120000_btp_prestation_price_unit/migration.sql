-- Unité de prix par spécialité + champs avis pour comparer montant / quantité (ml, m³, unité, m², forfait).

ALTER TABLE "BtpPrestation" ADD COLUMN IF NOT EXISTS "priceUnit" TEXT NOT NULL DEFAULT 'FORFAIT';

UPDATE "BtpPrestation" SET "priceUnit" = CASE "id"
  WHEN 'sd-bain-complete' THEN 'FORFAIT'
  WHEN 'douche-baignoire' THEN 'FORFAIT'
  WHEN 'wc-suspendu-broyeur' THEN 'UNIT'
  WHEN 'evier-lave-vaisselle' THEN 'FORFAIT'
  WHEN 'robinetterie' THEN 'UNIT'
  WHEN 'fuites-recherche' THEN 'FORFAIT'
  WHEN 'canalisation-engorgee' THEN 'FORFAIT'
  WHEN 'ballon-ecs' THEN 'UNIT'
  WHEN 'chauffage-emitters' THEN 'UNIT'
  WHEN 'plan-chauffage-pac' THEN 'M2'
  WHEN 'adoucisseur-filtre' THEN 'UNIT'
  WHEN 'vmc-piquage' THEN 'FORFAIT'
  WHEN 'mise-normes-tableau' THEN 'FORFAIT'
  WHEN 'nouveau-tableau' THEN 'FORFAIT'
  WHEN 'prises-interrupteurs' THEN 'UNIT'
  WHEN 'eclairage-encastre' THEN 'UNIT'
  WHEN 'depannage-pannes' THEN 'FORFAIT'
  WHEN 'installation-neuf' THEN 'FORFAIT'
  WHEN 'renovation-secondaire' THEN 'FORFAIT'
  WHEN 'domotique' THEN 'FORFAIT'
  WHEN 'borne-recharge' THEN 'UNIT'
  WHEN 'mise-terre-liaison' THEN 'FORFAIT'
  WHEN 'courant-faible' THEN 'FORFAIT'
  WHEN 'extension-gros-oeuvre' THEN 'M3'
  WHEN 'murs-clotures' THEN 'ML'
  WHEN 'ouvertures-baies' THEN 'UNIT'
  WHEN 'dalle-chape' THEN 'M2'
  WHEN 'terrasse-exterieure' THEN 'M2'
  WHEN 'reprises-fissures' THEN 'ML'
  WHEN 'enduits-facade' THEN 'M2'
  WHEN 'escaliers-beton' THEN 'UNIT'
  WHEN 'fenetres-pvc-bois-alu' THEN 'UNIT'
  WHEN 'portes-entree' THEN 'UNIT'
  WHEN 'portes-interieures' THEN 'UNIT'
  WHEN 'volets' THEN 'UNIT'
  WHEN 'garde-corps' THEN 'ML'
  WHEN 'cuisine-meuble' THEN 'FORFAIT'
  WHEN 'placards-dressing' THEN 'FORFAIT'
  WHEN 'parquet-stratifie' THEN 'M2'
  WHEN 'lambourdes-ossature-bois' THEN 'M2'
  WHEN 'peinture-interieure' THEN 'M2'
  WHEN 'peinture-facade' THEN 'M2'
  WHEN 'vitrerie-simple' THEN 'M2'
  WHEN 'papier-peint-toile' THEN 'M2'
  WHEN 'preparation-supports' THEN 'M2'
  WHEN 'laques-batiments' THEN 'M2'
  WHEN 'carrelage-sdb' THEN 'M2'
  WHEN 'carrelage-cuisine' THEN 'M2'
  WHEN 'carrelage-sol-sejour' THEN 'M2'
  WHEN 'carrelage-exterieur' THEN 'M2'
  WHEN 'mosaique-faience' THEN 'M2'
  WHEN 'chape-ragreage' THEN 'M2'
  WHEN 'joints-hydrofuge' THEN 'M2'
  WHEN 'cloisons-ba13' THEN 'M2'
  WHEN 'doublages-isolation' THEN 'M2'
  WHEN 'faux-plafonds' THEN 'M2'
  WHEN 'enduits-lisses' THEN 'M2'
  WHEN 'trous-ouvertures' THEN 'FORFAIT'
  WHEN 'corniches-decor' THEN 'ML'
  WHEN 'tuiles-ardoises' THEN 'M2'
  WHEN 'etancheite-toiture' THEN 'M2'
  WHEN 'zinguerie' THEN 'ML'
  WHEN 'velux-fenetres-toit' THEN 'UNIT'
  WHEN 'isolation-combles' THEN 'M2'
  WHEN 'demoussage-hydrofuge' THEN 'M2'
  WHEN 'charpente-legere-reparation' THEN 'FORFAIT'
  WHEN 'demolition-maison' THEN 'FORFAIT'
  WHEN 'demolition-interieure' THEN 'M2'
  WHEN 'terrassement-tranchee' THEN 'M3'
  WHEN 'evacuation-dechets' THEN 'FORFAIT'
  WHEN 'curage-locaux' THEN 'M2'
  WHEN 'sciage-carottage' THEN 'UNIT'
  WHEN 'second-oeuvre-divers' THEN 'FORFAIT'
  WHEN 'etancheite-sou-sol' THEN 'M2'
  WHEN 'isolation-acoustique' THEN 'M2'
  WHEN 'nettoyage-haute-pression' THEN 'M2'
  WHEN 'autre-sur-devis' THEN 'FORFAIT'
  ELSE "priceUnit"
END;

UPDATE "BtpPrestation" SET "pricedBySurface" = ("priceUnit" = 'M2');

ALTER TABLE "Specialite" ADD COLUMN IF NOT EXISTS "priceUnit" TEXT;
UPDATE "Specialite" s SET "priceUnit" = p."priceUnit" FROM "BtpPrestation" p WHERE s."id" = p."id";

ALTER TABLE "Review" ADD COLUMN IF NOT EXISTS "priceUnit" TEXT;
ALTER TABLE "Review" ADD COLUMN IF NOT EXISTS "linearMl" DOUBLE PRECISION;
ALTER TABLE "Review" ADD COLUMN IF NOT EXISTS "volumeM3" DOUBLE PRECISION;
ALTER TABLE "Review" ADD COLUMN IF NOT EXISTS "quantityUnits" DOUBLE PRECISION;

UPDATE "Review" SET "priceUnit" = 'M2'
WHERE "surfaceM2" IS NOT NULL AND ("priceUnit" IS NULL OR TRIM("priceUnit") = '');

-- Chaque prestation est scindée en deux lignes : `-remplacement` et `-neuf` (même unité de prix).
-- Les avis / spécialités / articles DIY existants sont rattachés par défaut à `-remplacement`.

INSERT INTO "BtpPrestation" ("id", "metierId", "label", "pricedBySurface", "priceUnit", "sortOrder")
SELECT
  p.id || '-remplacement',
  p."metierId",
  p.label || ' — remplacement / réfection sur l’existant',
  (COALESCE(p."priceUnit", 'FORFAIT') = 'M2'),
  COALESCE(NULLIF(TRIM(p."priceUnit"), ''), 'FORFAIT'),
  p."sortOrder" * 2
FROM "BtpPrestation" p
WHERE p.id !~ '-(remplacement|neuf)$'
  AND NOT EXISTS (SELECT 1 FROM "BtpPrestation" x WHERE x.id = p.id || '-remplacement');

INSERT INTO "BtpPrestation" ("id", "metierId", "label", "pricedBySurface", "priceUnit", "sortOrder")
SELECT
  p.id || '-neuf',
  p."metierId",
  p.label || ' — nouvelle installation / création',
  (COALESCE(p."priceUnit", 'FORFAIT') = 'M2'),
  COALESCE(NULLIF(TRIM(p."priceUnit"), ''), 'FORFAIT'),
  p."sortOrder" * 2 + 1
FROM "BtpPrestation" p
WHERE p.id !~ '-(remplacement|neuf)$'
  AND NOT EXISTS (SELECT 1 FROM "BtpPrestation" x WHERE x.id = p.id || '-neuf');

-- Table Specialite (si présente) : nouvelles lignes alignées sur BtpPrestation
DO $$
BEGIN
  IF to_regclass('public."Specialite"') IS NOT NULL THEN
    INSERT INTO "Specialite" ("id", "metierId", "label", "active", "priceUnit")
    SELECT p.id, p."metierId", p.label, TRUE, p."priceUnit"
    FROM "BtpPrestation" p
    WHERE (p.id LIKE '%-remplacement' OR p.id LIKE '%-neuf')
    ON CONFLICT ("id") DO UPDATE SET
      "label" = EXCLUDED."label",
      "priceUnit" = EXCLUDED."priceUnit";
  END IF;
END $$;

-- Avis : ancien id -> variante remplacement (cohérent avec travaux sur existant le plus fréquent)
UPDATE "Review"
SET "prestationActiviteId" = "prestationActiviteId" || '-remplacement'
WHERE "prestationActiviteId" IS NOT NULL
  AND "prestationActiviteId" !~ '-(remplacement|neuf)$'
  AND EXISTS (SELECT 1 FROM "BtpPrestation" n WHERE n.id = "Review"."prestationActiviteId" || '-remplacement');

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'Review' AND column_name = 'specialiteId'
  ) THEN
    EXECUTE $q$
      UPDATE "Review"
      SET "specialiteId" = "specialiteId" || '-remplacement'
      WHERE "specialiteId" IS NOT NULL
        AND "specialiteId" !~ '-(remplacement|neuf)$'
        AND EXISTS (SELECT 1 FROM "BtpPrestation" n WHERE n.id = "Review"."specialiteId" || '-remplacement')
    $q$;
  END IF;
END $$;

DO $$
BEGIN
  IF to_regclass('public."DiyKnowledgeArticle"') IS NOT NULL THEN
    UPDATE "DiyKnowledgeArticle"
    SET "prestationId" = "prestationId" || '-remplacement'
    WHERE "prestationId" IS NOT NULL
      AND "prestationId" !~ '-(remplacement|neuf)$'
      AND "prestationId" NOT LIKE 'fp-%'
      AND EXISTS (SELECT 1 FROM "BtpPrestation" n WHERE n.id = "DiyKnowledgeArticle"."prestationId" || '-remplacement');
  END IF;
END $$;

-- Profils Pro : remplacer chaque ancien id JSON par la variante `-remplacement`
DO $$
DECLARE
  old_id text;
  ids text[] := ARRAY[
    'sd-bain-complete','douche-baignoire','wc-suspendu-broyeur','evier-lave-vaisselle','robinetterie',
    'fuites-recherche','canalisation-engorgee','ballon-ecs','chauffage-emitters','plan-chauffage-pac',
    'adoucisseur-filtre','vmc-piquage',
    'mise-normes-tableau','nouveau-tableau','prises-interrupteurs','eclairage-encastre','depannage-pannes',
    'installation-neuf','renovation-secondaire','domotique','borne-recharge','mise-terre-liaison','courant-faible',
    'extension-gros-oeuvre','murs-clotures','ouvertures-baies','dalle-chape','terrasse-exterieure',
    'reprises-fissures','enduits-facade','escaliers-beton',
    'fenetres-pvc-bois-alu','portes-entree','portes-interieures','volets','garde-corps','cuisine-meuble',
    'placards-dressing','parquet-stratifie','lambourdes-ossature-bois',
    'peinture-interieure','peinture-facade','vitrerie-simple','papier-peint-toile','preparation-supports','laques-batiments',
    'carrelage-sdb','carrelage-cuisine','carrelage-sol-sejour','carrelage-exterieur','mosaique-faience','chape-ragreage','joints-hydrofuge',
    'cloisons-ba13','doublages-isolation','faux-plafonds','enduits-lisses','trous-ouvertures','corniches-decor',
    'tuiles-ardoises','etancheite-toiture','zinguerie','velux-fenetres-toit','isolation-combles','demoussage-hydrofuge','charpente-legere-reparation',
    'demolition-maison','demolition-interieure','terrassement-tranchee','evacuation-dechets','curage-locaux','sciage-carottage',
    'second-oeuvre-divers','etancheite-sou-sol','isolation-acoustique','nettoyage-haute-pression','autre-sur-devis'
  ];
BEGIN
  IF to_regclass('public."ArtisanProfile"') IS NULL THEN
    RETURN;
  END IF;
  FOREACH old_id IN ARRAY ids
  LOOP
    UPDATE "ArtisanProfile"
    SET "sousActivitesSelection" = replace(
      "sousActivitesSelection"::text,
      '"' || old_id || '"',
      '"' || old_id || '-remplacement"'
    )::jsonb
    WHERE "sousActivitesSelection"::text LIKE '%"' || old_id || '"%';
  END LOOP;
END $$;

DO $$
BEGIN
  IF to_regclass('public."Specialite"') IS NOT NULL THEN
    DELETE FROM "Specialite" WHERE "id" IN (
      'sd-bain-complete','douche-baignoire','wc-suspendu-broyeur','evier-lave-vaisselle','robinetterie',
      'fuites-recherche','canalisation-engorgee','ballon-ecs','chauffage-emitters','plan-chauffage-pac',
      'adoucisseur-filtre','vmc-piquage',
      'mise-normes-tableau','nouveau-tableau','prises-interrupteurs','eclairage-encastre','depannage-pannes',
      'installation-neuf','renovation-secondaire','domotique','borne-recharge','mise-terre-liaison','courant-faible',
      'extension-gros-oeuvre','murs-clotures','ouvertures-baies','dalle-chape','terrasse-exterieure',
      'reprises-fissures','enduits-facade','escaliers-beton',
      'fenetres-pvc-bois-alu','portes-entree','portes-interieures','volets','garde-corps','cuisine-meuble',
      'placards-dressing','parquet-stratifie','lambourdes-ossature-bois',
      'peinture-interieure','peinture-facade','vitrerie-simple','papier-peint-toile','preparation-supports','laques-batiments',
      'carrelage-sdb','carrelage-cuisine','carrelage-sol-sejour','carrelage-exterieur','mosaique-faience','chape-ragreage','joints-hydrofuge',
      'cloisons-ba13','doublages-isolation','faux-plafonds','enduits-lisses','trous-ouvertures','corniches-decor',
      'tuiles-ardoises','etancheite-toiture','zinguerie','velux-fenetres-toit','isolation-combles','demoussage-hydrofuge','charpente-legere-reparation',
      'demolition-maison','demolition-interieure','terrassement-tranchee','evacuation-dechets','curage-locaux','sciage-carottage',
      'second-oeuvre-divers','etancheite-sou-sol','isolation-acoustique','nettoyage-haute-pression','autre-sur-devis'
    );
  END IF;
END $$;

DELETE FROM "BtpPrestation" WHERE "id" IN (
  'sd-bain-complete','douche-baignoire','wc-suspendu-broyeur','evier-lave-vaisselle','robinetterie',
  'fuites-recherche','canalisation-engorgee','ballon-ecs','chauffage-emitters','plan-chauffage-pac',
  'adoucisseur-filtre','vmc-piquage',
  'mise-normes-tableau','nouveau-tableau','prises-interrupteurs','eclairage-encastre','depannage-pannes',
  'installation-neuf','renovation-secondaire','domotique','borne-recharge','mise-terre-liaison','courant-faible',
  'extension-gros-oeuvre','murs-clotures','ouvertures-baies','dalle-chape','terrasse-exterieure',
  'reprises-fissures','enduits-facade','escaliers-beton',
  'fenetres-pvc-bois-alu','portes-entree','portes-interieures','volets','garde-corps','cuisine-meuble',
  'placards-dressing','parquet-stratifie','lambourdes-ossature-bois',
  'peinture-interieure','peinture-facade','vitrerie-simple','papier-peint-toile','preparation-supports','laques-batiments',
  'carrelage-sdb','carrelage-cuisine','carrelage-sol-sejour','carrelage-exterieur','mosaique-faience','chape-ragreage','joints-hydrofuge',
  'cloisons-ba13','doublages-isolation','faux-plafonds','enduits-lisses','trous-ouvertures','corniches-decor',
  'tuiles-ardoises','etancheite-toiture','zinguerie','velux-fenetres-toit','isolation-combles','demoussage-hydrofuge','charpente-legere-reparation',
  'demolition-maison','demolition-interieure','terrassement-tranchee','evacuation-dechets','curage-locaux','sciage-carottage',
  'second-oeuvre-divers','etancheite-sou-sol','isolation-acoustique','nettoyage-haute-pression','autre-sur-devis'
);

-- Publie tous les avis historiques encore en attente de modération.
-- (Le produit ne fait plus passer les avis en modération.)

UPDATE "Review"
SET "status" = 'PUBLISHED', "updatedAt" = NOW()
WHERE "status" = 'PENDING';


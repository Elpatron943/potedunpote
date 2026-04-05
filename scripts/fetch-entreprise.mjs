/**
 * Exemple : récupération de fiches entreprise (recherche par SIREN ou requête texte).
 * Usage : node scripts/fetch-entreprise.mjs <SIREN>
 *         node scripts/fetch-entreprise.mjs --q "nom ou activité"
 */

const BASE = "https://recherche-entreprises.api.gouv.fr";

function mapUniteLegale(hit) {
  const siege = hit.siege ?? {};
  const active =
    hit.etat_administratif === "A" &&
    (siege.etat_administratif == null || siege.etat_administratif === "A");
  return {
    siren: hit.siren,
    raisonSociale: hit.nom_raison_sociale ?? hit.nom_complet,
    active,
    etatAdministratif: hit.etat_administratif,
    dateCreation: hit.date_creation ?? null,
    dateFermeture: hit.date_fermeture ?? siege.date_fermeture ?? null,
    adressePostale: siege.adresse ?? null,
    codePostal: siege.code_postal ?? null,
    commune: siege.libelle_commune ?? null,
    codeNaf: hit.activite_principale ?? null,
  };
}

async function bySiren(siren) {
  const url = `${BASE}/search?q=${encodeURIComponent(siren)}&per_page=5`;
  const res = await fetch(url);
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const data = await res.json();
  const exact = (data.results ?? []).find((r) => String(r.siren) === String(siren));
  return exact ? mapUniteLegale(exact) : null;
}

async function byQuery(q) {
  const url = `${BASE}/search?q=${encodeURIComponent(q)}&per_page=10`;
  const res = await fetch(url);
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const data = await res.json();
  return (data.results ?? []).map(mapUniteLegale);
}

const arg = process.argv.slice(2);
if (arg[0] === "--q") {
  const q = arg.slice(1).join(" ");
  if (!q) {
    console.error('Usage: node scripts/fetch-entreprise.mjs --q "recherche"');
    process.exit(1);
  }
  const rows = await byQuery(q);
  console.log(JSON.stringify(rows, null, 2));
} else {
  const siren = arg[0];
  if (!siren || !/^\d{9}$/.test(siren)) {
    console.error("Usage: node scripts/fetch-entreprise.mjs <SIREN_9_CHIFFRES>");
    process.exit(1);
  }
  const row = await bySiren(siren);
  console.log(JSON.stringify(row, null, 2));
}

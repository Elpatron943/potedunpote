# Fichier `.env` — liens et texte à copier-coller

**Ouvrir le fichier dans Cursor :** [**`web/.env`**](.env) → **Ctrl+clic** (ou **Cmd+clic**) sur le lien.

*(Raccourci à la racine du dépôt : [`OPEN_ENV.md`](../OPEN_ENV.md).)*

## 1. Où configurer les variables

| Où | Lien (cliquable) |
|----|------------------|
| **Fichier local** | [**`web/.env`**](.env) *(Ctrl+clic)* — sinon modèle : [`.env.example`](./.env.example) |
| **Supabase** (mot de passe base, chaînes de connexion) | [Tableau de bord Supabase](https://supabase.com/dashboard) → choisis ton projet → menu **Project Settings** (engrenage) → [**Database**](https://supabase.com/dashboard/project/_/settings/database) |
| **Documentation connexion Postgres / Prisma** | [Connecting to Postgres (Supabase)](https://supabase.com/docs/guides/database/connecting-to-postgres) |
| **Netlify** (production) | [Applications Netlify](https://app.netlify.com) → ton site → **Site configuration** → [**Environment variables**](https://docs.netlify.com/environment-variables/overview/) |

> Sur la page **Database** Supabase, section **Connection string** : choisis l’onglet **URI**, puis copie **Transaction pooler** pour `DATABASE_URL` et **Direct connection** (ou port `5432`) pour `DIRECT_URL`.

---

## 2. Contenu exact à mettre dans `web/.env`

### Méthode recommandée (copier-coller depuis Supabase)

1. Ouvre [**Database → Connection string**](https://supabase.com/dashboard/project/_/settings/database) (choisis ton projet si besoin).
2. Onglet **URI**, mode **Transaction pooler** → copie la chaîne → colle-la après `DATABASE_URL=` dans ton `.env` (entre guillemets).  
   - Si la fin de l’URL n’a pas `?pgbouncer=true`, ajoute **`?pgbouncer=true`** (ou `&pgbouncer=true` s’il y a déjà des paramètres).
3. Même page, mode **Direct connection** (port **5432**) → copie → colle après `DIRECT_URL=`.

Modèle à compléter **tel quel** dans `web/.env` (remplace les trois lignes de valeurs par tes collages) :

```env
DATABASE_URL="⟨COLLER_URI_TRANSACTION_POOLER_ICI⟩"
DIRECT_URL="⟨COLLER_URI_DIRECT_CONNECTION_5432_ICI⟩"
AUTH_SECRET="⟨COLLE_UNE_PHRASE_SECRETE_ALEATOIRE_MIN_32_CARACTERES⟩"
```

Exemple de forme (à ne pas recopier à la main : utilise **toujours** les URI du dashboard) :

```env
DATABASE_URL="postgresql://postgres.xxxxxxxxxxxx:MON_MOT_DE_PASSE@aws-0-eu-central-1.pooler.supabase.com:6543/postgres?pgbouncer=true"
DIRECT_URL="postgresql://postgres:MON_MOT_DE_PASSE@db.xxxxxxxxxxxx.supabase.co:5432/postgres"
AUTH_SECRET="remplace-par-une-tres-longue-chaine-aleatoire-au-moins-32-caracteres"
```

- **Mot de passe** : page **Database** → *Database password* (réinitialisable). Caractères spéciaux dans l’URL : les URI copiées depuis Supabase sont en général déjà correctes.
- **`AUTH_SECRET`** : en terminal, tu peux générer une valeur avec `openssl rand -base64 32` (puis coller le résultat entre guillemets).

---

## 3. Même chose sur Netlify (production)

Dans **Site configuration → Environment variables**, crée **exactement** les mêmes clés :

- `DATABASE_URL`
- `DIRECT_URL`
- `AUTH_SECRET`

avec les **mêmes valeurs** que dans ton `.env` local (adaptées à la prod si tu utilises une autre base).

---

## 4. Vérification rapide

```bash
cd web
npx prisma validate
```

Si une variable manque, Prisma l’indiquera. Ensuite :

```bash
npx prisma migrate deploy
```

pour appliquer les migrations sur la base Supabase.

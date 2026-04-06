# Fichier `.env` — liens et texte à copier-coller

**Ouvrir le fichier dans Cursor :** [**`web/.env`**](.env) → **Ctrl+clic** (ou **Cmd+clic**) sur le lien.

*(Raccourci à la racine du dépôt : [`OPEN_ENV.md`](../OPEN_ENV.md).)*

## 1. Où configurer les variables

| Où | Lien (cliquable) |
|----|------------------|
| **Fichier local** | [**`web/.env`**](.env) — modèle : [`.env.example`](./.env.example) |
| **Supabase (clés API)** | [Project Settings → API](https://supabase.com/dashboard/project/_/settings/api) |
| **Netlify** (production) | [Applications Netlify](https://app.netlify.com) → **Site configuration** → [**Environment variables**](https://docs.netlify.com/environment-variables/overview/) |

L’app utilise **uniquement les clés Supabase** (plus de `DATABASE_URL` / Prisma au runtime).

---

## 2. Contenu à mettre dans `web/.env`

Dans [**Project Settings → API**](https://supabase.com/dashboard/project/_/settings/api) :

1. **Project URL** → `NEXT_PUBLIC_SUPABASE_URL` (ex. `https://xxxxx.supabase.co`).
2. Clé **`anon` `public`** → `NEXT_PUBLIC_SUPABASE_ANON_KEY` (client navigateur + `createClient` SSR).
3. Clé **`service_role` `secret`** → `SUPABASE_SERVICE_ROLE_KEY` : **réservée au serveur** (routes API, Server Actions). Elle remplace l’accès direct Postgres / Prisma. **Ne jamais** la préfixer par `NEXT_PUBLIC_` ni l’exposer au front.

```env
NEXT_PUBLIC_SUPABASE_URL="https://xxxxx.supabase.co"
NEXT_PUBLIC_SUPABASE_ANON_KEY="⟨clé anon⟩"
SUPABASE_SERVICE_ROLE_KEY="⟨clé service_role⟩"
AUTH_SECRET="⟨phrase secrète longue, ex. openssl rand -base64 32⟩"
# Canonique SEO / sitemap (optionnel, défaut https://potedunpote.fr dans le code)
# NEXT_PUBLIC_SITE_URL="https://potedunpote.fr"
```

**OpenAI (chat « Bot de ton pote »)** — optionnel :

```env
OPENAI_API_KEY="⟨clé⟩"
```

**Inscription avec code OTP (e-mail)** — obligatoire en production pour envoyer le code :

```env
RESEND_API_KEY="⟨clé API Resend⟩"
# Optionnel : expéditeur (défaut : "Inscription <noreply@potedunpote.fr>")
# IMPORTANT : l’adresse doit être autorisée (domaine vérifié dans Resend)
RESEND_FROM_EMAIL="Inscription <noreply@potedunpote.fr>"
```

Sans `RESEND_API_KEY`, en **développement** le code OTP est **journalisé dans le terminal** du serveur (`npm run dev`). Sans clé en **production**, l’inscription échoue avec un message d’erreur explicite.

---

## 3. Netlify (production)

Déclare les **mêmes** variables : `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`, `AUTH_SECRET`, `RESEND_API_KEY` (inscription), et si besoin `OPENAI_API_KEY`.

---

## 4. Schéma base de données

Les fichiers SQL historiques restent dans **`web/prisma/migrations/`** (référence). Les nouvelles évolutions se font dans le **SQL Editor** Supabase ou via le dashboard. Plus besoin de `npx prisma migrate` pour l’app.

**Table `ChatbotLog`** (journal du widget « Bot de ton pote ») : appliquer le script  
[`web/prisma/migrations/20260405120000_chatbot_log/migration.sql`](./prisma/migrations/20260405120000_chatbot_log/migration.sql) dans Supabase → **SQL Editor** si elle n’existe pas encore. Aucune image n’est stockée ; le texte utilisateur et la réponse du modèle sont enregistrés pour analyse / stats.

**Tables `BtpMetier` et `BtpPrestation`** (référentiel « type d’artisan » + prestations précises, utilisé par la recherche, les avis et les filtres) : appliquer  
[`web/prisma/migrations/20260405140000_btp_referentiel/migration.sql`](./prisma/migrations/20260405140000_btp_referentiel/migration.sql). L’app lit ces tables via `getBtpReferentiel()` (cache ~1 h) ; si elles sont absentes ou vides, une **copie embarquée** (`btp-referentiel-seed.ts`) prend le relais avec un avertissement dans les logs serveur.

**Table `DiyKnowledgeArticle` + contrainte `ChatbotLog`** (guides bricolage « Conseils DIY », parcours chatbot) : appliquer  
[`web/prisma/migrations/20260405180000_diy_knowledge/migration.sql`](./prisma/migrations/20260405180000_diy_knowledge/migration.sql). Les fiches sont listées sur **`/conseils`** ; le chatbot (option « Je veux faire les travaux tout seul ») lit d’abord la base, sinon génère un guide via **OpenAI** et l’enregistre. Les nouvelles étapes journalisées utilisent `step = diy_guide`.

**Table `SignupOtp`** (inscription client & pro : code à 6 chiffres par e-mail avant création du compte) : appliquer  
[`web/prisma/migrations/20260406200000_signup_otp/migration.sql`](./prisma/migrations/20260406200000_signup_otp/migration.sql).

---

## 5. RLS (Row Level Security)

Le client serveur utilise **`service_role`**, qui **contourne** les politiques RLS : l’app se comporte comme avant (contrôles dans le code). Si tu passes plus tard à la clé **`anon`** côté serveur avec RLS, il faudra définir les politiques dans Supabase.

# actubet — 🔮 PronoLeague

Marché de pronostics entre amis : les **ligues privées** de *Mon Petit Prono* + les **sujets universels** de *Polymarket*
(macro, droit public, sport, pop culture, absurdités du quotidien). Crédits virtuels uniquement.

**Stack** : Next.js 16 (App Router, export statique) · Tailwind CSS v4 · shadcn/ui · Supabase (Postgres + Auth + Realtime)

🌐 **Site en ligne** : https://mvppronos.vercel.app

Le site est en **français**, avec un réglage pour passer en **anglais** (page Réglages).
**Chaque joueur a son compte** (email + mot de passe, Google en option) : solde, paris et ligues sont enregistrés
dans Supabase et partagés entre amis.

## Mise en service (une seule fois)

### 1. Créer la base Supabase (gratuit)

1. Crée un compte sur https://supabase.com puis **New project** (région Europe, note bien le mot de passe).
2. **SQL Editor → New query** : colle et exécute, dans l'ordre, le contenu de :
   - `supabase/migrations/0001_init.sql` (tables, sécurité, comptes, ligues, paris, temps réel)
   - `supabase/migrations/0002_polymarket.sql` (questions Polymarket, résolution automatique)
   - `supabase/migrations/0003_hardening.sql` (rien n'est appelable sans être connecté)
   - `supabase/migrations/0004_admin_cancel.sql` (annulation d'une question par un admin)
   - `supabase/migrations/0005_shop.sql` (boutique : objets, achats, déblocage par Stripe)
   - `supabase/migrations/0006_shop_v2.sql` (cadres, badges, packs, abonnement Club)
   - `supabase/migrations/0007_live_odds_account_deletion.sql` (cotes en direct, suppression de compte)
   - `supabase/seed.sql` (deux questions « maison » absurdes, facultatif)
3. **Authentication → URL Configuration** :
   - *Site URL* : `https://mvppronos.vercel.app`
   - *Redirect URLs* : ajoute `https://mvppronos.vercel.app/auth/callback/`
4. **Authentication → Sign In / Providers → Email** : pour démarrer, désactive **Confirm email**. Le service d'email
   intégré de Supabase n'envoie que quelques emails par heure ; pour garder la confirmation, configure un SMTP
   (*Authentication → Emails → SMTP Settings*).
5. **Project Settings → API** : note l'**URL du projet**, la clé **anon public** et la clé **service_role**
   (cette dernière est secrète : ne la mets jamais dans le site).

### 2. Relier le site (Vercel)

Déjà fait pour le projet `pronoleague` : l'URL et la clé anon sont dans `.env.production`, lu par `next build`.
Pour un autre projet Supabase, modifie ce fichier, ou définis ces variables dans
**Vercel → projet → Settings → Environment Variables** (elles ont priorité sur le fichier), puis redéploie :

| Nom | Valeur |
|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | URL du projet Supabase |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | clé **anon public** (publique par conception) |
| `NEXT_PUBLIC_GOOGLE_AUTH` | `true` seulement si le fournisseur Google est activé dans Supabase |

Sans ces variables, le site affiche « Le site n'est pas encore configuré ».

### 3. Importer les questions d'actualité (GitHub)

**GitHub → Settings → Secrets and variables → Actions** :
- onglet *Variables* : `NEXT_PUBLIC_SUPABASE_URL` = URL du projet Supabase ;
- onglet *Secrets* : `SUPABASE_SERVICE_ROLE_KEY` = clé **service_role**.

Puis **Actions → Actualité Polymarket → Run workflow** pour le premier import. Ensuite, le workflow tourne tout seul
toutes les heures : il ajoute de nouveaux marchés et paie les gagnants des marchés terminés.

### Développement local

```bash
cp .env.example .env.local   # renseigner les deux variables Supabase
npm install
npm run dev                  # http://localhost:3000
npm test                     # tests de la conversion Polymarket
```

## Boutique (paiement Stripe)

**100 % cosmétique** : aucun crédit n'est vendu, aucun objet ne donne d'avantage au jeu. Catalogue, prix (en
centimes) et textes FR/EN : table `shop_items`. Rendu des objets : `src/lib/cosmetics.ts` et `globals.css`.

- **Club PronoLeague** (abonnement mensuel, 2,99 €) : toutes les couleurs de pseudo et tous les cadres
  (`club_included`), plus le badge Club. Résiliable en un clic via le portail client Stripe.
- **Couleurs de pseudo**, **cadres d'avatar**, **badges** (dont une édition limitée, `available_until`), **packs**
  (`bundle_items`).

Fonctions Edge :
- `create-checkout` : ouvre un paiement Stripe Checkout (achat ou abonnement ; prix lu en base, jamais dans le
  navigateur).
- `stripe-webhook` : vérifie la signature Stripe, débloque les achats (`grant_purchase`) et recopie l'état de
  l'abonnement (`apply_subscription`, qui retire les objets du Club à la fin de l'abonnement).
- `confirm-checkout` : filet de sécurité appelé par la boutique (à l'ouverture et au retour du paiement) : vérifie
  auprès de Stripe les achats en attente et l'état de l'abonnement.
- `billing-portal` : ouvre le portail client Stripe (gérer / résilier l'abonnement).
- Page `/shop` (onglet Boutique).

## Légal

CGU, CGV, politique de confidentialité et mentions légales : `src/lib/legal.ts` (textes et informations de l'éditeur,
les champs entre crochets sont à compléter), affichés sur `/legal`. L'inscription exige d'accepter les CGU (version et
date gardées dans les métadonnées du compte). Les Réglages permettent de supprimer son compte (fonction Edge
`delete-account` : résilie le Club, confie les ligues à un autre membre, puis efface le compte).

Activation :
1. Compte Stripe → **Développeurs → Clés API** : copier la clé secrète (`sk_test_…` pour tester).
2. Stripe → **Développeurs → Webhooks → Ajouter un endpoint** :
   `https://<projet>.supabase.co/functions/v1/stripe-webhook`, événements `checkout.session.completed`,
   `checkout.session.async_payment_succeeded`, `customer.subscription.updated`, `customer.subscription.deleted`
   et `invoice.paid`. Copier le secret de signature (`whsec_…`).
3. Supabase → **Edge Functions → Secrets** : `STRIPE_SECRET_KEY` et `STRIPE_WEBHOOK_SECRET`.
4. Stripe → **Paramètres → Billing → Portail client** : activer (enregistrer) le portail, pour la résiliation.
5. Tester avec la carte `4242 4242 4242 4242`, puis refaire 1 à 4 avec les clés live.

Tant que `STRIPE_SECRET_KEY` manque, la boutique affiche « Le paiement n'est pas encore activé ».

## Questions d'actualité (Polymarket)

Les questions d'actu viennent des marchés publics de [Polymarket](https://polymarket.com) (API Gamma, gratuite, sans clé) :
vraies questions, vraies dates limites, et les probabilités Polymarket comme cotes de départ.
Elles sont **traduites automatiquement en français** (`src/lib/translate.ts`, service public de Google Traduction,
sans clé) ; le texte anglais d'origine est conservé pour le réglage « English ». Si la traduction échoue, le texte
anglais s'affiche.

- **Conversion** : `src/lib/polymarket.ts` (catégories, Oui/Non, QCM, cotes, résolution). Tests : `npm test`.
- **Cotes en direct** : `.github/workflows/refresh-odds.yml` lance `sync-polymarket.ts --odds` toutes les 5 minutes :
  les probabilités Polymarket du moment sont recopiées dans `seed_pools` (les options ne changent jamais). Le site
  relit les données chaque minute tant que la page est ouverte.
- **Import et résolution** : `scripts/sync-polymarket.ts`, lancé toutes les heures par `.github/workflows/sync-markets.yml`.
  Il interroge les marchés les plus actifs, ceux qui se terminent dans les 3 jours et une quinzaine de thèmes
  (cinéma, musique, célébrités, tribunaux, météo…), écarte les paris de spécialistes (écarts de points, totaux…),
  puis complète chaque catégorie jusqu'à 40 questions ouvertes (15 nouvelles max par passage), en privilégiant
  celles qui se terminent dans la semaine.
  Question annulée et mises remboursées si l'issue gagnante ne faisait pas partie des réponses proposées.
- **Questions maison** : un admin les crée, les règle ou les annule (mises remboursées) depuis la page **Admin**
  (Réglages → Espace admin). Pour nommer un admin :
  `update public.users set is_admin = true where username = 'ton_pseudo';`

Les cotes de départ (`seed_pools`) comptent comme une cagnotte virtuelle : la cote affichée au moment du pari est
celle utilisée pour le paiement (aux mises des autres joueurs près).

## Identité visuelle

Direction « Nuit », dans l'esprit des marchés de prédiction (type Polymarket) : un fil de questions sur fond sombre,
le pourcentage de chance en gros, des boutons Oui/Non immédiatement lisibles. Thème sombre unique.

- **Couleurs** : fond `#111418`, cartes `#1A1F25` bordées `#262C33`, texte `#E8ECF1`, gris `#8A94A3`, bleu `#4C8DFF`
  (`primary`) pour l'action, Oui vert `#6EE7A0` sur `#173628`, Non rouge `#FF8A8A` sur `#3A1D20`. Jetons dans
  `src/app/globals.css`.
- **Typographie** : Plus Jakarta Sans partout, gras pour les titres, chiffres en tabulaires.
- **Formes** : cartes arrondies (14 px), puces de catégorie en pilule, onglets soulignés.
- **Carte question** : icône de catégorie (ou image), titre, pourcentage de chance à droite
  (`src/components/questions/chance-gauge.tsx`), boutons « Oui 62 % » / « Non 38 % », pied avec mises, joueurs,
  échéance et source.
- **Logo** : une courbe montante en creux dans un disque bleu (`src/components/brand/logo.tsx`, favicon
  `src/app/icon.svg`).

Les maquettes des 10 directions étudiées sont sur la planche https://claude.ai/artifact/NyL9g4WK2irBXrYa3sWhQQ (privée).

## Langues

- Textes de l'interface : `src/lib/i18n/dictionaries.ts` (français par défaut, anglais).
- `useI18n()` donne `t("clé", { variables })`, la langue choisie et `setLang`. Le choix est mémorisé sur l'appareil.
- Les erreurs renvoyées par la base sont des clés de traduction (`error.insufficient`…).
- Questions : `title` / `description` en français, `title_en` / `description_en` pour l'anglais ; libellés d'options
  dans `option_labels` (les valeurs stockées des options ne changent pas avec la langue).

## Sécurité

- Le site est statique : `AuthGuard` renvoie vers `/login` les visiteurs non connectés, dans le navigateur.
- La vraie protection est côté base : règles RLS (chacun ne voit que ses paris et ses ligues) et fonctions
  `security definer` pour parier, créer/rejoindre une ligue et résoudre une question. Les crédits ne sont pas
  modifiables via l'API ; seul le pseudo l'est.

## Ouvert au grand public

- Adresse publique : le domaine de production Vercel. Les adresses d'aperçu des PR peuvent demander une connexion
  Vercel : réglage **Vercel → Settings → Deployment Protection**.
- Référencement : `robots.txt`, `sitemap.xml` et métadonnées Open Graph générés au build. Pour un nom de domaine
  personnalisé, définir `NEXT_PUBLIC_SITE_URL` (et mettre à jour les URL d'authentification Supabase).

## GitHub Pages (optionnel)

Le site est 100 % statique (`next build` produit `out/`). `.github/workflows/deploy-pages.yml` le publie sur GitHub
Pages quand on le lance à la main (Actions → Run workflow), une fois **Settings → Pages → Source : GitHub Actions** activé (ajouter alors aussi
`NEXT_PUBLIC_SUPABASE_ANON_KEY` dans les *Variables* GitHub et l'adresse Pages dans les Redirect URLs Supabase).

## Modèle de données

| Table | Colonnes clés |
|---|---|
| `users` | `id` (= `auth.users.id`), `username`, `total_credits` (1000 au départ), `is_admin` |
| `leagues` | `id`, `name`, `invite_code` (6 caractères, unique), `admin_id` |
| `league_members` | `league_id`, `user_id`, `current_credits` |
| `questions` | `id`, `title`, `category`, `options[]` (Oui/Non ou QCM), `deadline`, `status`, `correct_answer` |
| `predictions` | `id`, `user_id`, `question_id`, `chosen_answer`, `wagered_amount`, `payout` |

Choix de conception :
- **Paris globaux, classement par ligue.** Un joueur a un seul solde (`users.total_credits`).
  `league_members.current_credits` en est une copie synchronisée par trigger : le classement se trie facilement
  et se diffuse en **Realtime**.
- **Pari mutuel.** À la résolution (`resolve_question`), la cagnotte est répartie entre les gagnants au prorata
  de leur mise. Si personne n'a trouvé, tout le monde est remboursé. Les cotes affichées en découlent.
- **Aucune écriture sensible côté client.** Paris, création et adhésion de ligue, résolution : tout passe par des RPC
  `security definer` qui vérifient le solde, la deadline et les droits. Les crédits ne sont pas modifiables via l'API.
- **Un pari par joueur et par question** (contrainte `unique`).

## Arborescence

```
scripts/
  sync-polymarket.ts         import / résolution des marchés dans Supabase
supabase/
  migrations/0001_init.sql   schéma, RLS, triggers, RPC, realtime
  migrations/0002_polymarket.sql  colonnes source / seed_pools, résolution interne
  migrations/0003_hardening.sql   droits d'exécution réservés aux joueurs connectés
  migrations/0004_admin_cancel.sql  annulation d'une question (admin), mises remboursées
  migrations/0005_shop.sql   boutique : shop_items, purchases, user_items, grant_purchase
  functions/create-checkout/ ouvre un paiement Stripe (Edge Function)
  functions/stripe-webhook/  confirme le paiement et débloque l'objet (Edge Function)
  functions/confirm-checkout/  vérifie les achats en attente auprès de Stripe (filet de sécurité)
  functions/billing-portal/  portail client Stripe (gérer / résilier le Club)
  functions/delete-account/  suppression de compte (RGPD)
  migrations/0007_live_odds_account_deletion.sql  cotes en direct, suppression de compte
  migrations/0006_shop_v2.sql  cadres, badges, packs, abonnement Club
  seed.sql                   questions « maison »
src/
  app/
    page.tsx                 landing
    login/page.tsx           connexion email / Google
    auth/callback/page.tsx   retour OAuth (côté navigateur)
    (app)/layout.tsx         AuthGuard + header (solde) + nav du bas + StoreProvider
    (app)/dashboard/         feed des questions + mes paris
    (app)/leagues/           mes ligues, créer / rejoindre
    (app)/leagues/view/      classement live + code d'invitation (?id=…)
    (app)/join/              lien d'invitation (?code=…)
    (app)/settings/          réglages
    (app)/admin/             espace admin : créer, régler, annuler les questions maison
    (app)/shop/              boutique (objets cosmétiques, paiement Stripe)
    legal/                   CGU, CGV, confidentialité, mentions légales (/legal/[slug])
    robots.ts, sitemap.ts    référencement
  components/
    ui/                      primitives shadcn/ui (button, card, dialog, input…)
    questions/               question-card, bet-dialog (modale de pari), my-bets, time-left
    leagues/                 leaderboard, invite-card, league-view, leagues-list, join-league
    dashboard/               dashboard-view
    layout/                  app-header, bottom-nav, credits-pill
    auth/                    login-form, auth-guard, setup-notice
    admin/                   admin-view (questions maison)
    settings/                settings-view (langue, pseudo, remise à zéro)
  hooks/use-leaderboard.ts   classement trié + mouvements (simulation ou realtime)
  lib/
    types.ts  store.tsx  odds.ts  categories.ts  option-tones.ts  paths.ts  utils.ts
    polymarket.ts            questions d'actu Polymarket (+ polymarket.test.ts)
    translate.ts             traduction automatique anglais → français
    i18n/                    dictionnaires FR/EN, provider, libellés des questions
    supabase/                config, client, queries (requêtes, RPC, temps réel)
```

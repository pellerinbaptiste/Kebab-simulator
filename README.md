# actubet — 🔮 PronoLeague

Marché de pronostics entre amis : les **ligues privées** de *Mon Petit Prono* + les **sujets universels** de *Polymarket*
(macro, droit public, sport, pop culture, absurdités du quotidien). Crédits virtuels uniquement.

**Stack** : Next.js 16 (App Router, export statique) · Tailwind CSS v4 · shadcn/ui · Supabase (Postgres + Auth + Realtime)

🌐 **Site en ligne** : https://mvppronos.vercel.app (Vercel) — ou https://pellerinbaptiste.github.io/Kebab-simulator/ si GitHub Pages est activé.

Le site est en **français**, avec un réglage pour passer en **anglais** (page Réglages). En mode démo, la partie
de chaque visiteur (solde, paris, ligues, pseudo) est enregistrée dans son navigateur.

## Démarrage rapide (mode démo, sans Supabase)

```bash
npm install
npm run dev        # http://localhost:3000
```

Sans variables d'environnement, l'app tourne en **mode démo** avec des données mock
(`src/lib/mock-data.ts`). Tu peux parier, créer une ligue, rejoindre la ligue de démo avec le code **`KEBAB1`**
et voir le classement « live » (l'activité des autres joueurs est simulée).

## Questions d'actualité (Polymarket)

Les questions d'actu viennent des marchés publics de [Polymarket](https://polymarket.com) (API Gamma, gratuite, sans clé) :
vraies questions, vraies dates limites, et les probabilités Polymarket comme cotes de départ.
Les questions Polymarket sont en anglais : elles sont **traduites automatiquement en français** au moment du build
(`src/lib/translate.ts`, service public de Google Traduction, sans clé). Le texte anglais d'origine est conservé et
affiché quand on choisit « English » dans les réglages. Si la traduction échoue, le texte anglais s'affiche.
À côté, quelques questions « maison » (absurdités du quotidien) restent dans `src/lib/mock-data.ts`.

- **Conversion** : `src/lib/polymarket.ts` (catégories, Oui/Non, QCM, cotes, résolution). Tests : `npm test`.
- **Au build** : le site statique embarque les marchés du moment. Si Polymarket est injoignable, des questions
  d'exemple s'affichent avec un bandeau d'avertissement.
- **Dans le navigateur** : les cotes sont rafraîchies au chargement de la page.
- **Toutes les 3 h** (`.github/workflows/sync-markets.yml`) :
  - si le secret `VERCEL_DEPLOY_HOOK_URL` existe, le site Vercel est reconstruit
    (créer le hook dans Vercel → Settings → Git → Deploy Hooks) ;
  - si Supabase est configuré (variable `NEXT_PUBLIC_SUPABASE_URL` et secret `SUPABASE_SERVICE_ROLE_KEY`),
    `scripts/sync-polymarket.ts` importe les nouveaux marchés dans `questions` et résout ceux qui sont terminés
    (gagnants payés automatiquement, question annulée et remboursée si l'issue gagnante n'était pas proposée).

Les cotes de départ (`seed_pools`) comptent comme une cagnotte virtuelle : la cote affichée au moment du pari est
celle utilisée pour le paiement (aux mises des autres joueurs près).

## Langues

- Textes de l'interface : `src/lib/i18n/dictionaries.ts` (français par défaut, anglais).
- `useI18n()` donne `t("clé", { variables })`, la langue choisie et `setLang`. Le choix est mémorisé sur l'appareil.
- Questions : `title` / `description` en français, `translations.en` pour l'anglais ; libellés d'options dans
  `optionLabels` (les valeurs stockées des options ne changent pas avec la langue).

## Ouvert au grand public

- Adresse publique : le domaine de production Vercel (`https://mvppronos.vercel.app`). Les adresses d'aperçu des PR
  peuvent demander une connexion Vercel : c'est le réglage **Vercel → Settings → Deployment Protection**.
- Référencement : `robots.txt`, `sitemap.xml` et métadonnées Open Graph sont générés au build. L'adresse utilisée vient
  de Vercel automatiquement ; pour un nom de domaine personnalisé, définir `NEXT_PUBLIC_SITE_URL`.
- En mode démo, chaque visiteur joue sur son appareil : les ligues ne sont pas partagées entre personnes. Pour de vraies
  ligues entre amis, brancher Supabase (section ci-dessous).

## Mise en ligne (GitHub Pages)

Le site est 100 % statique (`next build` produit le dossier `out/`). Le workflow
`.github/workflows/deploy-pages.yml` le construit et le publie à chaque push sur `main`.

Réglage à faire une seule fois : **Settings → Pages → Build and deployment → Source : GitHub Actions**.

Le même dossier `out/` peut aussi être déployé tel quel sur Vercel, Netlify, etc.

## Brancher Supabase

1. Crée un projet Supabase, puis exécute dans **SQL Editor** :
   - `supabase/migrations/0001_init.sql` (tables, RLS, triggers, RPC, Realtime)
   - `supabase/migrations/0002_polymarket.sql` (questions Polymarket, résolution automatique)
   - `supabase/seed.sql` (questions de démo, facultatif)
2. **Auth → Providers** : active Email et Google. Ajoute
   `https://pellerinbaptiste.github.io/Kebab-simulator/auth/callback/` aux Redirect URLs.
3. En local : copie `.env.example` en `.env.local` et renseigne `NEXT_PUBLIC_SUPABASE_URL` et
   `NEXT_PUBLIC_SUPABASE_ANON_KEY`. Pour le site en ligne : ajoute ces deux noms dans
   **Settings → Secrets and variables → Actions → Variables** (la clé anon est publique par conception).
4. Pour te donner les droits admin (créer et résoudre des questions) :
   `update public.users set is_admin = true where username = 'ton_pseudo';`

Dès que les variables sont présentes, `AuthGuard` renvoie vers `/login` les visiteurs non connectés sur
`/dashboard`, `/leagues` et `/join`. Comme le site est statique, cette protection se fait dans le navigateur :
la vraie sécurité des données repose sur les règles RLS de Supabase.
Le store mock (`src/lib/store.tsx`) expose la même interface que les fonctions de `src/lib/supabase/queries.ts` :
il suffit de remplacer le corps de chaque action par l'appel Supabase correspondant.

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
  seed.sql                   questions de démo
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
    robots.ts, sitemap.ts    référencement
  components/
    ui/                      primitives shadcn/ui (button, card, dialog, input…)
    questions/               question-card, bet-dialog (modale de pari), my-bets, time-left
    leagues/                 leaderboard, invite-card, league-view, leagues-list, join-league
    dashboard/               dashboard-view
    layout/                  app-header, bottom-nav, credits-pill
    auth/                    login-form, auth-guard
    settings/                settings-view (langue, pseudo, remise à zéro)
  hooks/use-leaderboard.ts   classement trié + mouvements (simulation ou realtime)
  lib/
    types.ts  mock-data.ts  store.tsx  odds.ts  categories.ts  option-tones.ts  paths.ts  utils.ts
    polymarket.ts            questions d'actu Polymarket (+ polymarket.test.ts)
    translate.ts             traduction automatique anglais → français
    news.ts                  questions d'actu traduites, récupérées une fois par build
    i18n/                    dictionnaires FR/EN, provider, libellés des questions
    supabase/                config, client, queries (requêtes + realtime)
```

# actubet — 🔮 PronoLeague

Marché de pronostics entre amis : les **ligues privées** de *Mon Petit Prono* + les **sujets universels** de *Polymarket*
(macro, droit public, sport, pop culture, absurdités du quotidien). Crédits virtuels uniquement.

**Stack** : Next.js 16 (App Router, export statique) · Tailwind CSS v4 · shadcn/ui · Supabase (Postgres + Auth + Realtime)

🌐 **Site en ligne** : https://pellerinbaptiste.github.io/Kebab-simulator/

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
Les questions sont en anglais (telles que publiées par Polymarket).
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
  components/
    ui/                      primitives shadcn/ui (button, card, dialog, input…)
    questions/               question-card, bet-dialog (modale de pari), my-bets, time-left
    leagues/                 leaderboard, invite-card, league-view, leagues-list, join-league
    dashboard/               dashboard-view
    layout/                  app-header, bottom-nav, credits-pill
    auth/                    login-form, auth-guard
  hooks/use-leaderboard.ts   classement trié + mouvements (simulation ou realtime)
  lib/
    types.ts  mock-data.ts  store.tsx  odds.ts  categories.ts  option-tones.ts  paths.ts  utils.ts
    polymarket.ts            questions d'actu Polymarket (+ polymarket.test.ts)
    supabase/                config, client, queries (requêtes + realtime)
```

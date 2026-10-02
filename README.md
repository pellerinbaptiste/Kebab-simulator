# actubet — 🔮 PronoLeague

Marché de pronostics entre amis : les **ligues privées** de *Mon Petit Prono* + les **sujets universels** de *Polymarket*
(macro, droit public, sport, pop culture, absurdités du quotidien). Crédits virtuels uniquement.

**Stack** : Next.js 16 (App Router) · Tailwind CSS v4 · shadcn/ui · Supabase (Postgres + Auth + Realtime) · Vercel

## Démarrage rapide (mode démo, sans Supabase)

```bash
npm install
npm run dev        # http://localhost:3000
```

Sans variables d'environnement, l'app tourne en **mode démo** avec des données mock
(`src/lib/mock-data.ts`). Tu peux parier, créer une ligue, rejoindre la ligue de démo avec le code **`KEBAB1`**
et voir le classement « live » (l'activité des autres joueurs est simulée).

## Brancher Supabase

1. Crée un projet Supabase, puis exécute dans **SQL Editor** :
   - `supabase/migrations/0001_init.sql` (tables, RLS, triggers, RPC, Realtime)
   - `supabase/seed.sql` (questions de démo)
2. **Auth → Providers** : active Email et Google. Ajoute `https://<ton-domaine>/auth/callback` aux Redirect URLs.
3. Copie `.env.example` en `.env.local` et renseigne `NEXT_PUBLIC_SUPABASE_URL` et `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   (mêmes variables sur Vercel).
4. Pour te donner les droits admin (créer et résoudre des questions) :
   `update public.users set is_admin = true where username = 'ton_pseudo';`

Dès que les variables sont présentes, `src/proxy.ts` rafraîchit la session et protège `/dashboard`, `/leagues` et `/join`.
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
supabase/
  migrations/0001_init.sql   schéma, RLS, triggers, RPC, realtime
  seed.sql                   questions de démo
src/
  proxy.ts                   session Supabase + protection des routes (ex-middleware)
  app/
    page.tsx                 landing
    login/page.tsx           connexion email / Google
    auth/callback/route.ts   retour OAuth
    (app)/layout.tsx         header (solde) + nav du bas + StoreProvider
    (app)/dashboard/         feed des questions + mes paris
    (app)/leagues/           mes ligues, créer / rejoindre
    (app)/leagues/[id]/      classement live + code d'invitation
    (app)/join/[code]/       lien d'invitation
  components/
    ui/                      primitives shadcn/ui (button, card, dialog, input…)
    questions/               question-card, bet-dialog (modale de pari), my-bets, time-left
    leagues/                 leaderboard, invite-card, league-view, leagues-list, join-league
    dashboard/               dashboard-view
    layout/                  app-header, bottom-nav, credits-pill
    auth/                    login-form
  hooks/use-leaderboard.ts   classement trié + mouvements (simulation ou realtime)
  lib/
    types.ts  mock-data.ts  store.tsx  odds.ts  categories.ts  option-tones.ts  utils.ts
    supabase/                client, server, session (proxy), queries (requêtes + realtime)
```

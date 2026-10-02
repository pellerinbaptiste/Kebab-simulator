-- =====================================================================
--  Prono League — schéma initial (Supabase / PostgreSQL)
--  À coller dans Supabase > SQL Editor, ou `supabase db push`.
--
--  Modèle économique (MVP) :
--  * Chaque joueur démarre avec 1000 crédits (users.total_credits).
--  * Les paris sont globaux (une question = un marché commun à tous).
--  * league_members.current_credits est une copie dénormalisée de
--    users.total_credits, synchronisée par trigger. Elle sert au
--    classement de ligue et au temps réel (Supabase Realtime).
--  * Paiement « parimutuel » : à la résolution, la cagnotte totale de la
--    question est répartie entre les gagnants au prorata de leur mise.
--    S'il n'y a aucun gagnant, tout le monde est remboursé.
-- =====================================================================

create extension if not exists pgcrypto;

-- ---------------------------------------------------------------------
--  Types
-- ---------------------------------------------------------------------
create type question_status as enum ('open', 'resolved', 'cancelled');
create type question_category as enum (
  'Macroéconomie', 'Droit public', 'Sport', 'Pop culture', 'Absurde'
);

-- ---------------------------------------------------------------------
--  users (profil public, 1-1 avec auth.users)
-- ---------------------------------------------------------------------
create table public.users (
  id            uuid primary key references auth.users (id) on delete cascade,
  username      text not null unique
                check (char_length(username) between 3 and 24),
  total_credits integer not null default 1000 check (total_credits >= 0),
  is_admin      boolean not null default false,
  created_at    timestamptz not null default now()
);

-- ---------------------------------------------------------------------
--  leagues
-- ---------------------------------------------------------------------
create table public.leagues (
  id          uuid primary key default gen_random_uuid(),
  name        text not null check (char_length(name) between 2 and 40),
  invite_code text not null unique default upper(substr(md5(random()::text), 1, 6)),
  admin_id    uuid not null references public.users (id) on delete cascade,
  created_at  timestamptz not null default now()
);

-- ---------------------------------------------------------------------
--  league_members
-- ---------------------------------------------------------------------
create table public.league_members (
  league_id       uuid not null references public.leagues (id) on delete cascade,
  user_id         uuid not null references public.users (id) on delete cascade,
  current_credits integer not null default 1000,
  joined_at       timestamptz not null default now(),
  primary key (league_id, user_id)
);
create index league_members_user_idx on public.league_members (user_id);
create index league_members_rank_idx on public.league_members (league_id, current_credits desc);

-- ---------------------------------------------------------------------
--  questions
--  options : ['Oui','Non'] pour un binaire, ou N choix pour un QCM.
-- ---------------------------------------------------------------------
create table public.questions (
  id             uuid primary key default gen_random_uuid(),
  title          text not null,
  description    text,
  category       question_category not null,
  options        text[] not null default array['Oui', 'Non']
                 check (cardinality(options) >= 2),
  deadline       timestamptz not null,
  status         question_status not null default 'open',
  correct_answer text,
  created_at     timestamptz not null default now(),
  check (correct_answer is null or correct_answer = any (options))
);
create index questions_open_idx on public.questions (status, deadline);

-- ---------------------------------------------------------------------
--  predictions (un pari par joueur et par question)
-- ---------------------------------------------------------------------
create table public.predictions (
  id             uuid primary key default gen_random_uuid(),
  user_id        uuid not null references public.users (id) on delete cascade,
  question_id    uuid not null references public.questions (id) on delete cascade,
  chosen_answer  text not null,
  wagered_amount integer not null check (wagered_amount > 0),
  payout         integer,               -- rempli à la résolution
  created_at     timestamptz not null default now(),
  unique (user_id, question_id)
);
create index predictions_question_idx on public.predictions (question_id);

-- =====================================================================
--  Helpers
-- =====================================================================
create or replace function public.is_league_member(p_league uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from league_members where league_id = p_league and user_id = auth.uid()
  );
$$;

create or replace function public.is_admin()
returns boolean language sql stable security definer set search_path = public as $$
  select coalesce((select is_admin from users where id = auth.uid()), false);
$$;

-- Création automatique du profil à l'inscription (email ou Google)
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
declare
  base text := coalesce(
    new.raw_user_meta_data ->> 'username',
    new.raw_user_meta_data ->> 'name',
    split_part(new.email, '@', 1)
  );
  candidate text;
begin
  base := left(regexp_replace(base, '[^a-zA-Z0-9_]', '', 'g'), 18);
  if char_length(base) < 3 then base := 'joueur'; end if;
  candidate := base;
  while exists (select 1 from users where username = candidate) loop
    candidate := base || floor(random() * 10000)::int;
  end loop;
  insert into users (id, username) values (new.id, candidate);
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- Synchronise les crédits de ligue quand le solde global bouge
create or replace function public.sync_league_credits()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  update league_members set current_credits = new.total_credits
  where user_id = new.id;
  return new;
end;
$$;

create trigger on_user_credits_changed
  after update of total_credits on public.users
  for each row execute function public.sync_league_credits();

-- =====================================================================
--  RPC (toute la logique sensible passe par ici, jamais par le client)
-- =====================================================================

-- Créer une ligue (le créateur en devient admin et membre)
create or replace function public.create_league(p_name text)
returns public.leagues language plpgsql security definer set search_path = public as $$
declare
  l leagues;
begin
  if auth.uid() is null then raise exception 'Non authentifié'; end if;
  insert into leagues (name, admin_id) values (trim(p_name), auth.uid()) returning * into l;
  insert into league_members (league_id, user_id, current_credits)
    select l.id, u.id, u.total_credits from users u where u.id = auth.uid();
  return l;
end;
$$;

-- Rejoindre une ligue via son code d'invitation
create or replace function public.join_league(p_code text)
returns uuid language plpgsql security definer set search_path = public as $$
declare
  v_league uuid;
begin
  if auth.uid() is null then raise exception 'Non authentifié'; end if;
  select id into v_league from leagues where invite_code = upper(trim(p_code));
  if v_league is null then raise exception 'Code d''invitation invalide'; end if;
  insert into league_members (league_id, user_id, current_credits)
    select v_league, u.id, u.total_credits from users u where u.id = auth.uid()
  on conflict do nothing;
  return v_league;
end;
$$;

-- Placer un pari (atomique : vérifie le solde, débite, enregistre)
create or replace function public.place_prediction(
  p_question uuid, p_answer text, p_amount integer
) returns public.predictions language plpgsql security definer set search_path = public as $$
declare
  q questions;
  p predictions;
  v_credits integer;
begin
  if auth.uid() is null then raise exception 'Non authentifié'; end if;
  if p_amount is null or p_amount <= 0 then raise exception 'Mise invalide'; end if;

  select * into q from questions where id = p_question;
  if q.id is null then raise exception 'Question introuvable'; end if;
  if q.status <> 'open' or q.deadline <= now() then raise exception 'Les paris sont fermés'; end if;
  if not (p_answer = any (q.options)) then raise exception 'Réponse invalide'; end if;

  select total_credits into v_credits from users where id = auth.uid() for update;
  if v_credits < p_amount then raise exception 'Crédits insuffisants'; end if;

  insert into predictions (user_id, question_id, chosen_answer, wagered_amount)
    values (auth.uid(), p_question, p_answer, p_amount)
    returning * into p;           -- échoue si un pari existe déjà (unique)

  update users set total_credits = total_credits - p_amount where id = auth.uid();
  return p;
end;
$$;

-- Résoudre une question (admin) et payer les gagnants
create or replace function public.resolve_question(p_question uuid, p_answer text)
returns void language plpgsql security definer set search_path = public as $$
declare
  q questions;
  v_pool bigint;
  v_winning bigint;
begin
  if not is_admin() then raise exception 'Réservé aux admins'; end if;
  select * into q from questions where id = p_question for update;
  if q.status <> 'open' then raise exception 'Question déjà résolue'; end if;
  if not (p_answer = any (q.options)) then raise exception 'Réponse invalide'; end if;

  select coalesce(sum(wagered_amount), 0),
         coalesce(sum(wagered_amount) filter (where chosen_answer = p_answer), 0)
    into v_pool, v_winning
    from predictions where question_id = p_question;

  if v_winning = 0 then
    -- personne n'a trouvé : remboursement
    update predictions set payout = wagered_amount where question_id = p_question;
  else
    update predictions
       set payout = case when chosen_answer = p_answer
                         then floor(wagered_amount::numeric * v_pool / v_winning)::int
                         else 0 end
     where question_id = p_question;
  end if;

  update users u set total_credits = u.total_credits + p.payout
    from predictions p
   where p.question_id = p_question and p.user_id = u.id and p.payout > 0;

  update questions set status = 'resolved', correct_answer = p_answer where id = p_question;
end;
$$;

-- Cagnottes agrégées par option (pour afficher les cotes sans exposer les paris)
create or replace view public.question_pools as
  select question_id, chosen_answer, sum(wagered_amount)::int as pool, count(*)::int as bettors
  from public.predictions
  group by question_id, chosen_answer;

-- =====================================================================
--  Row Level Security
-- =====================================================================
alter table public.users          enable row level security;
alter table public.leagues        enable row level security;
alter table public.league_members enable row level security;
alter table public.questions      enable row level security;
alter table public.predictions    enable row level security;

-- users : lecture pour tous les connectés (pseudos du classement),
-- seul le pseudo est modifiable par son propriétaire.
create policy "users_select" on public.users for select to authenticated using (true);
create policy "users_update_self" on public.users for update to authenticated
  using (id = auth.uid()) with check (id = auth.uid());
revoke update on public.users from authenticated;
grant update (username) on public.users to authenticated;

-- leagues / membres : visibles uniquement par les membres
create policy "leagues_select_members" on public.leagues for select to authenticated
  using (public.is_league_member(id));
create policy "leagues_update_admin" on public.leagues for update to authenticated
  using (admin_id = auth.uid());
create policy "members_select_same_league" on public.league_members for select to authenticated
  using (public.is_league_member(league_id));
create policy "members_leave" on public.league_members for delete to authenticated
  using (user_id = auth.uid());

-- questions : lecture pour tous, écriture admin
create policy "questions_select" on public.questions for select to authenticated using (true);
create policy "questions_admin_write" on public.questions for all to authenticated
  using (public.is_admin()) with check (public.is_admin());

-- predictions : chacun voit les siennes (insertion via RPC uniquement)
create policy "predictions_select_own" on public.predictions for select to authenticated
  using (user_id = auth.uid());

grant select on public.question_pools to authenticated;
grant execute on function public.create_league(text)                      to authenticated;
grant execute on function public.join_league(text)                        to authenticated;
grant execute on function public.place_prediction(uuid, text, integer)    to authenticated;
grant execute on function public.resolve_question(uuid, text)             to authenticated;

-- =====================================================================
--  Temps réel : le classement de ligue se met à jour en direct
-- =====================================================================
alter publication supabase_realtime add table public.league_members;

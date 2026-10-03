-- =====================================================================
--  0006 — Boutique v2 : plus d'objets, packs et abonnement « Club ».
--  Toujours 100 % cosmétique : aucun crédit, aucun avantage au jeu.
--  À exécuter après 0005_shop.sql.
-- =====================================================================

-- ---------------------------------------------------------------------
--  Catalogue : nouveaux types, textes FR/EN en base, packs, éditions limitées
-- ---------------------------------------------------------------------
alter table public.shop_items drop constraint shop_items_kind_check;
alter table public.shop_items
  add constraint shop_items_kind_check
    check (kind in ('badge', 'name_color', 'avatar_frame', 'bundle', 'subscription')),
  add column name_en         text,
  add column description     text,
  add column description_en  text,
  add column bundle_items    text[] not null default '{}',   -- objets donnés par un pack
  add column club_included   boolean not null default false, -- utilisable par les membres du Club
  add column available_until timestamptz;                    -- édition limitée

-- ---------------------------------------------------------------------
--  Ce que les autres joueurs voient (classements). Non modifiable directement.
-- ---------------------------------------------------------------------
alter table public.users drop constraint if exists users_name_color_check;
alter table public.users
  add column badge        text,
  add column avatar_frame text,
  add column club_until   timestamptz;

-- L'ancien booléen « supporter » devient un badge équipé
-- (la colonne is_supporter reste en base mais n'est plus utilisée)
update public.users set badge = 'supporter' where is_supporter;

-- Client et abonnement Stripe : privés (aucune politique = invisible côté API)
create table public.billing_customers (
  user_id                uuid primary key references public.users (id) on delete cascade,
  stripe_customer_id     text unique,
  stripe_subscription_id text,
  subscription_status    text,
  updated_at             timestamptz not null default now()
);
alter table public.billing_customers enable row level security;
revoke all on public.billing_customers from anon, authenticated;

-- ---------------------------------------------------------------------
--  Peut-on utiliser cet objet ? (acheté, ou inclus dans le Club actif)
-- ---------------------------------------------------------------------
create or replace function public.can_use_item(p_user uuid, p_kind text, p_value text)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from shop_items si
     where si.kind = p_kind and si.value = p_value
       and (
         exists (select 1 from user_items ui where ui.user_id = p_user and ui.item_id = si.id)
         or (si.club_included and exists (select 1 from users u where u.id = p_user and u.club_until > now()))
       )
  );
$$;
revoke execute on function public.can_use_item(uuid, text, text) from public, anon, authenticated;

-- Équiper (ou retirer avec null) une couleur, un cadre ou un badge
create or replace function public.equip_item(p_kind text, p_value text)
returns void language plpgsql security definer set search_path = public as $$
begin
  if auth.uid() is null then raise exception 'error.notAuthenticated'; end if;
  if p_kind not in ('name_color', 'avatar_frame', 'badge') then raise exception 'shop.unknownItem'; end if;
  if p_value is not null and not can_use_item(auth.uid(), p_kind, p_value) then
    raise exception 'shop.notOwned';
  end if;
  update users set
    name_color   = case when p_kind = 'name_color'   then p_value else name_color end,
    avatar_frame = case when p_kind = 'avatar_frame' then p_value else avatar_frame end,
    badge        = case when p_kind = 'badge'        then p_value else badge end
  where id = auth.uid();
end;
$$;
revoke execute on function public.equip_item(text, text) from public, anon;
grant execute on function public.equip_item(text, text) to authenticated;

-- Retire ce qui n'est plus utilisable (fin d'abonnement)
create or replace function public.unequip_unusable(p_user uuid)
returns void language plpgsql security definer set search_path = public as $$
begin
  update users u set
    name_color   = case when u.name_color   is not null and not can_use_item(u.id, 'name_color',   u.name_color)   then null else u.name_color end,
    avatar_frame = case when u.avatar_frame is not null and not can_use_item(u.id, 'avatar_frame', u.avatar_frame) then null else u.avatar_frame end,
    badge        = case when u.badge        is not null and not can_use_item(u.id, 'badge',        u.badge)        then null else u.badge end
  where u.id = p_user;
end;
$$;
revoke execute on function public.unequip_unusable(uuid) from public, anon, authenticated;

-- ---------------------------------------------------------------------
--  Achat unique confirmé par Stripe (webhook / confirm-checkout)
-- ---------------------------------------------------------------------
create or replace function public.grant_purchase(
  p_session text, p_user uuid, p_item text, p_amount integer, p_currency text
) returns void language plpgsql security definer set search_path = public as $$
declare
  it shop_items;
  given text[];
  g shop_items;
begin
  select * into it from shop_items where id = p_item;
  if it.id is null then raise exception 'shop.unknownItem'; end if;

  insert into purchases (user_id, item_id, stripe_session_id, amount_cents, currency, status, paid_at)
    values (p_user, p_item, p_session, p_amount, p_currency, 'paid', now())
  on conflict (stripe_session_id) do update
    set status = 'paid', paid_at = coalesce(purchases.paid_at, now());

  if it.kind = 'subscription' then return; end if; -- géré par apply_subscription

  given := case when it.kind = 'bundle' then it.bundle_items else array[it.id] end;
  insert into user_items (user_id, item_id) values (p_user, p_item) on conflict do nothing;
  insert into user_items (user_id, item_id) select p_user, unnest(given) on conflict do nothing;

  -- Équipe automatiquement ce qui n'est pas encore équipé
  for g in select * from shop_items where id = any (given) loop
    update users set
      name_color   = case when g.kind = 'name_color'   and name_color   is null then g.value else name_color end,
      avatar_frame = case when g.kind = 'avatar_frame' and avatar_frame is null then g.value else avatar_frame end,
      badge        = case when g.kind = 'badge'        and badge        is null then g.value else badge end
    where id = p_user;
  end loop;
end;
$$;
revoke execute on function public.grant_purchase(text, uuid, text, integer, text) from public, anon, authenticated;
grant execute on function public.grant_purchase(text, uuid, text, integer, text) to service_role;

-- ---------------------------------------------------------------------
--  État de l'abonnement Club, recopié depuis Stripe (webhook / confirm-checkout)
-- ---------------------------------------------------------------------
create or replace function public.apply_subscription(
  p_user uuid, p_customer text, p_subscription text, p_status text, p_period_end timestamptz
) returns void language plpgsql security definer set search_path = public as $$
declare
  active boolean := p_status in ('active', 'trialing', 'past_due');
begin
  insert into billing_customers (user_id, stripe_customer_id, stripe_subscription_id, subscription_status, updated_at)
    values (p_user, p_customer, p_subscription, p_status, now())
  on conflict (user_id) do update set
    stripe_customer_id     = coalesce(excluded.stripe_customer_id, billing_customers.stripe_customer_id),
    stripe_subscription_id = coalesce(excluded.stripe_subscription_id, billing_customers.stripe_subscription_id),
    subscription_status    = excluded.subscription_status,
    updated_at             = now();

  update users set club_until = case when active then p_period_end else null end where id = p_user;

  if active then
    update users set badge = 'club' where id = p_user and badge is null;
  else
    perform unequip_unusable(p_user);
  end if;
end;
$$;
revoke execute on function public.apply_subscription(uuid, text, text, text, timestamptz) from public, anon, authenticated;
grant execute on function public.apply_subscription(uuid, text, text, text, timestamptz) to service_role;

-- Le client Stripe d'un joueur (pour le portail de gestion d'abonnement)
create or replace function public.billing_customer_of(p_user uuid)
returns text language sql stable security definer set search_path = public as $$
  select stripe_customer_id from billing_customers where user_id = p_user;
$$;
revoke execute on function public.billing_customer_of(uuid) from public, anon, authenticated;
grant execute on function public.billing_customer_of(uuid) to service_role;

-- ---------------------------------------------------------------------
--  Catalogue (prix TTC en centimes)
-- ---------------------------------------------------------------------
update public.shop_items set
  name_en = case id when 'supporter_badge' then 'Supporter badge' when 'name_gold' then 'Gold username' else 'Neon username' end,
  description = case id
    when 'supporter_badge' then 'Un badge à côté de ton pseudo dans tous les classements. Merci de soutenir le site !'
    when 'name_gold' then 'Ton pseudo s''affiche en or dans les classements.'
    else 'Ton pseudo s''affiche avec un dégradé néon.' end,
  description_en = case id
    when 'supporter_badge' then 'A badge next to your username in every leaderboard. Thanks for supporting the site!'
    when 'name_gold' then 'Your username shows in gold in the leaderboards.'
    else 'Your username shows with a neon gradient.' end,
  club_included = (kind = 'name_color'),
  sort = case id when 'name_gold' then 20 when 'name_neon' then 21 else 40 end
where id in ('supporter_badge', 'name_gold', 'name_neon');

insert into public.shop_items
  (id, kind, value, name, name_en, description, description_en, price_cents, sort, club_included, bundle_items, available_until)
values
  ('club', 'subscription', 'club', 'Club PronoLeague', 'PronoLeague Club',
   'Toutes les couleurs de pseudo et tous les cadres d''avatar, plus le badge Club exclusif. Sans engagement, résiliable à tout moment.',
   'Every username colour and avatar frame, plus the exclusive Club badge. No commitment, cancel anytime.',
   299, 1, false, '{}', null),
  ('pack_legend', 'bundle', 'legend', 'Pack Légende', 'Legend pack',
   'Pseudo arc-en-ciel, cadre galaxie et badge couronne, à vie.',
   'Rainbow username, galaxy frame and crown badge, forever.',
   499, 10, false, array['name_rainbow', 'frame_galaxy', 'badge_crown'], null),
  ('name_ruby', 'name_color', 'ruby', 'Pseudo rubis', 'Ruby username',
   'Un rouge profond pour ton pseudo.', 'A deep red for your username.', 149, 22, true, '{}', null),
  ('name_ocean', 'name_color', 'ocean', 'Pseudo océan', 'Ocean username',
   'Un dégradé bleu lagon.', 'A lagoon-blue gradient.', 149, 23, true, '{}', null),
  ('name_emerald', 'name_color', 'emerald', 'Pseudo émeraude', 'Emerald username',
   'Un vert émeraude éclatant.', 'A bright emerald green.', 149, 24, true, '{}', null),
  ('name_rainbow', 'name_color', 'rainbow', 'Pseudo arc-en-ciel', 'Rainbow username',
   'Un dégradé arc-en-ciel qui défile.', 'A scrolling rainbow gradient.', 299, 25, true, '{}', null),
  ('frame_gold', 'avatar_frame', 'gold', 'Cadre or', 'Gold frame',
   'Un anneau doré autour de ton avatar.', 'A golden ring around your avatar.', 199, 30, true, '{}', null),
  ('frame_flame', 'avatar_frame', 'flame', 'Cadre flammes', 'Flame frame',
   'Ton avatar prend feu dans les classements.', 'Your avatar is on fire in the leaderboards.', 249, 31, true, '{}', null),
  ('frame_galaxy', 'avatar_frame', 'galaxy', 'Cadre galaxie', 'Galaxy frame',
   'Un anneau cosmique qui tourne.', 'A spinning cosmic ring.', 299, 32, true, '{}', null),
  ('badge_crown', 'badge', 'crown', 'Badge couronne', 'Crown badge',
   'Une couronne à côté de ton pseudo.', 'A crown next to your username.', 199, 41, false, '{}', null),
  ('badge_seer', 'badge', 'seer', 'Badge voyant', 'Seer badge',
   'Pour ceux qui voient l''avenir avant tout le monde.', 'For those who see the future first.', 199, 42, false, '{}', null),
  ('badge_founder', 'badge', 'founder', 'Badge fondateur', 'Founder badge',
   'Édition limitée : seulement jusqu''au 31 décembre 2026. Pour les premiers joueurs.',
   'Limited edition: only until December 31, 2026. For the earliest players.',
   499, 43, false, '{}', '2027-01-01T00:00:00+01'),
  ('badge_club', 'badge', 'club', 'Badge Club', 'Club badge',
   'Réservé aux membres du Club.', 'Members of the Club only.', 1, 99, true, '{}', null);

-- Le badge Club ne se vend pas : invisible dans le catalogue (active = false),
-- mais équipable par les membres du Club (can_use_item ne regarde pas « active »).
update public.shop_items set active = false where id = 'badge_club';

-- =====================================================================
--  0005 — Boutique : objets cosmétiques payés par carte (Stripe).
--  Aucun crédit n'est vendu : les objets ne donnent aucun avantage au jeu.
--  À exécuter après 0004_admin_cancel.sql.
--
--  Paiement : la fonction Edge `create-checkout` ouvre un paiement Stripe,
--  la fonction Edge `stripe-webhook` reçoit la confirmation de Stripe et
--  appelle grant_purchase() (réservée au service_role). Rien ne se débloque
--  depuis le navigateur.
-- =====================================================================

create table public.shop_items (
  id          text primary key,
  kind        text not null check (kind in ('badge', 'name_color')),
  value       text not null,                 -- 'supporter' | 'gold' | 'neon'
  name        text not null,                 -- libellé affiché sur la page Stripe
  price_cents integer not null check (price_cents > 0),
  currency    text not null default 'eur',
  sort        integer not null default 0,
  active      boolean not null default true
);

create table public.purchases (
  id                uuid primary key default gen_random_uuid(),
  user_id           uuid not null references public.users (id) on delete cascade,
  item_id           text not null references public.shop_items (id),
  stripe_session_id text not null unique,
  amount_cents      integer not null,
  currency          text not null,
  status            text not null default 'pending' check (status in ('pending', 'paid')),
  created_at        timestamptz not null default now(),
  paid_at           timestamptz
);
create index purchases_user_idx on public.purchases (user_id);

create table public.user_items (
  user_id     uuid not null references public.users (id) on delete cascade,
  item_id     text not null references public.shop_items (id),
  acquired_at timestamptz not null default now(),
  primary key (user_id, item_id)
);

-- Ce que les autres joueurs voient (classements) : pas modifiable directement
-- (seul `username` est modifiable par son propriétaire, voir 0001).
alter table public.users
  add column is_supporter boolean not null default false,
  add column name_color   text check (name_color in ('gold', 'neon'));

alter table public.shop_items enable row level security;
alter table public.purchases  enable row level security;
alter table public.user_items enable row level security;

create policy "shop_items_select" on public.shop_items for select to authenticated using (active);
create policy "purchases_select_own" on public.purchases for select to authenticated using (user_id = auth.uid());
create policy "user_items_select_own" on public.user_items for select to authenticated using (user_id = auth.uid());

revoke all on public.shop_items, public.purchases, public.user_items from anon;
revoke insert, update, delete on public.shop_items, public.purchases, public.user_items from authenticated;

-- ---------------------------------------------------------------------
--  Équiper (ou retirer avec null) une couleur de pseudo achetée
-- ---------------------------------------------------------------------
create or replace function public.equip_name_color(p_color text)
returns void language plpgsql security definer set search_path = public as $$
begin
  if auth.uid() is null then raise exception 'error.notAuthenticated'; end if;
  if p_color is not null and not exists (
    select 1 from user_items ui join shop_items si on si.id = ui.item_id
     where ui.user_id = auth.uid() and si.kind = 'name_color' and si.value = p_color
  ) then
    raise exception 'shop.notOwned';
  end if;
  update users set name_color = p_color where id = auth.uid();
end;
$$;

revoke execute on function public.equip_name_color(text) from public, anon;
grant execute on function public.equip_name_color(text) to authenticated;

-- ---------------------------------------------------------------------
--  Paiement confirmé par Stripe (appelé par la fonction stripe-webhook).
--  Idempotent : Stripe peut envoyer le même événement plusieurs fois.
-- ---------------------------------------------------------------------
create or replace function public.grant_purchase(
  p_session text, p_user uuid, p_item text, p_amount integer, p_currency text
) returns void language plpgsql security definer set search_path = public as $$
declare
  it shop_items;
begin
  select * into it from shop_items where id = p_item;
  if it.id is null then raise exception 'shop.unknownItem'; end if;

  insert into purchases (user_id, item_id, stripe_session_id, amount_cents, currency, status, paid_at)
    values (p_user, p_item, p_session, p_amount, p_currency, 'paid', now())
  on conflict (stripe_session_id) do update
    set status = 'paid', paid_at = coalesce(purchases.paid_at, now());

  insert into user_items (user_id, item_id) values (p_user, p_item) on conflict do nothing;

  if it.kind = 'badge' and it.value = 'supporter' then
    update users set is_supporter = true where id = p_user;
  elsif it.kind = 'name_color' then
    -- Première couleur achetée : on l'équipe directement
    update users set name_color = it.value where id = p_user and name_color is null;
  end if;
end;
$$;

revoke execute on function public.grant_purchase(text, uuid, text, integer, text) from public, anon, authenticated;
grant execute on function public.grant_purchase(text, uuid, text, integer, text) to service_role;

-- ---------------------------------------------------------------------
--  Catalogue de départ (prix en centimes, modifiables ici ou dans la table)
-- ---------------------------------------------------------------------
insert into public.shop_items (id, kind, value, name, price_cents, sort) values
  ('supporter_badge', 'badge',      'supporter', 'Badge Supporter', 299, 1),
  ('name_gold',       'name_color', 'gold',      'Pseudo doré',     199, 2),
  ('name_neon',       'name_color', 'neon',      'Pseudo néon',     199, 3);

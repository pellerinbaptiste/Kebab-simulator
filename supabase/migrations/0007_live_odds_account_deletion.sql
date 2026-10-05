-- =====================================================================
--  0007 — Cotes en direct et suppression de compte.
--  À exécuter après 0006_shop_v2.sql.
-- =====================================================================

-- Date de la dernière mise à jour des cotes Polymarket (scripts/sync-polymarket.ts --odds)
alter table public.questions add column if not exists odds_updated_at timestamptz;

-- Avant de supprimer un compte (fonction Edge delete-account) : les ligues créées
-- par le joueur sont confiées au membre le plus ancien, ou supprimées si personne
-- d'autre n'y joue.
create or replace function public.prepare_account_deletion(p_user uuid)
returns void language plpgsql security definer set search_path = public as $$
declare
  l record;
  heir uuid;
begin
  for l in select id from leagues where admin_id = p_user loop
    select user_id into heir from league_members
     where league_id = l.id and user_id <> p_user
     order by joined_at limit 1;
    if heir is null then
      delete from leagues where id = l.id;
    else
      update leagues set admin_id = heir where id = l.id;
    end if;
  end loop;
end;
$$;
revoke execute on function public.prepare_account_deletion(uuid) from public, anon, authenticated;
grant execute on function public.prepare_account_deletion(uuid) to service_role;

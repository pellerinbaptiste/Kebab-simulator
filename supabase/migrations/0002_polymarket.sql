-- =====================================================================
--  0002 — Questions d'actualité importées de Polymarket
--  À exécuter après 0001_init.sql.
-- =====================================================================

-- Nouvelles catégories
alter type question_category add value if not exists 'Monde & politique';
alter type question_category add value if not exists 'Tech & crypto';

-- Origine des questions + cotes de départ
alter table public.questions
  add column if not exists external_id text unique,         -- ex. 'polymarket:12345'
  add column if not exists source      text,                -- 'Polymarket'
  add column if not exists source_url  text,
  add column if not exists image_url   text,
  -- Cagnottes virtuelles qui reflètent les probabilités Polymarket
  -- (ex. {"Oui": 3100, "Non": 1900}). Elles comptent dans les cotes ET dans
  -- le calcul des gains, pour que la cote affichée soit celle payée.
  add column if not exists seed_pools  jsonb not null default '{}'::jsonb;

-- ---------------------------------------------------------------------
--  Résolution interne (sans contrôle admin), réservée au service_role :
--  utilisée par le script de synchronisation (scripts/sync-polymarket.ts).
--  p_answer = null → question annulée, tout le monde est remboursé.
-- ---------------------------------------------------------------------
create or replace function public.resolve_question_internal(p_question uuid, p_answer text)
returns void language plpgsql security definer set search_path = public as $$
declare
  q questions;
  v_pool numeric;
  v_winning numeric;
begin
  select * into q from questions where id = p_question for update;
  if q.id is null then raise exception 'Question introuvable'; end if;
  if q.status <> 'open' then return; end if;

  if p_answer is null then
    update predictions set payout = wagered_amount where question_id = p_question;
    update users u set total_credits = u.total_credits + p.payout
      from predictions p where p.question_id = p_question and p.user_id = u.id;
    update questions set status = 'cancelled' where id = p_question;
    return;
  end if;

  if not (p_answer = any (q.options)) then raise exception 'Réponse invalide'; end if;

  select coalesce(sum(wagered_amount), 0),
         coalesce(sum(wagered_amount) filter (where chosen_answer = p_answer), 0)
    into v_pool, v_winning
    from predictions where question_id = p_question;

  -- Ajout des cagnottes virtuelles de départ
  v_pool := v_pool + coalesce((select sum(value::numeric) from jsonb_each_text(q.seed_pools)), 0);
  v_winning := v_winning + coalesce((q.seed_pools ->> p_answer)::numeric, 0);

  if v_winning = 0 then
    update predictions set payout = wagered_amount where question_id = p_question;
  else
    update predictions
       set payout = case when chosen_answer = p_answer
                         then floor(wagered_amount * v_pool / v_winning)::int
                         else 0 end
     where question_id = p_question;
  end if;

  update users u set total_credits = u.total_credits + p.payout
    from predictions p
   where p.question_id = p_question and p.user_id = u.id and p.payout > 0;

  update questions set status = 'resolved', correct_answer = p_answer where id = p_question;
end;
$$;

revoke execute on function public.resolve_question_internal(uuid, text) from public, anon, authenticated;
grant execute on function public.resolve_question_internal(uuid, text) to service_role;

-- La résolution admin passe désormais par la même logique
create or replace function public.resolve_question(p_question uuid, p_answer text)
returns void language plpgsql security definer set search_path = public as $$
begin
  if not is_admin() then raise exception 'Réservé aux admins'; end if;
  if p_answer is null then raise exception 'Réponse invalide'; end if;
  perform resolve_question_internal(p_question, p_answer);
end;
$$;

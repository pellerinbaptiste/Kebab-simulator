-- =====================================================================
--  0004 — Annulation d'une question par un admin (tout le monde est remboursé).
--  À exécuter après 0003_hardening.sql.
-- =====================================================================
create or replace function public.cancel_question(p_question uuid)
returns void language plpgsql security definer set search_path = public as $$
begin
  if not is_admin() then raise exception 'error.adminOnly'; end if;
  perform resolve_question_internal(p_question, null);
end;
$$;

revoke execute on function public.cancel_question(uuid) from public, anon;
grant execute on function public.cancel_question(uuid) to authenticated;

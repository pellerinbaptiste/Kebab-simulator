-- =====================================================================
--  0003 — Durcissement : rien n'est appelable sans être connecté.
--  À exécuter après 0002_polymarket.sql.
-- =====================================================================

-- Fonctions des triggers : jamais appelées via l'API.
revoke execute on function public.handle_new_user()     from public, anon, authenticated;
revoke execute on function public.sync_league_credits() from public, anon, authenticated;

-- RPC et helpers RLS : réservés aux joueurs connectés.
revoke execute on function public.is_admin()                            from public, anon;
revoke execute on function public.is_league_member(uuid)                from public, anon;
revoke execute on function public.create_league(text)                   from public, anon;
revoke execute on function public.join_league(text)                     from public, anon;
revoke execute on function public.place_prediction(uuid, text, integer) from public, anon;
revoke execute on function public.resolve_question(uuid, text)          from public, anon;

-- Cagnottes agrégées : lisibles seulement une fois connecté.
revoke all on public.question_pools from anon;

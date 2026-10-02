-- Questions « maison » (absurdités du quotidien), à exécuter après les migrations.
-- Les questions d'actualité viennent de Polymarket (scripts/sync-polymarket.ts).
insert into public.questions
  (title, description, category, options, deadline, title_en, description_en, option_labels)
values
  ('Un chien va-t-il courir sur le terrain pendant le match de foot universitaire ?',
   'Une vidéo ou deux témoins fiables suffisent. Les chats ne comptent pas.',
   'Absurde', array['Oui', 'Non'], now() + interval '7 days',
   'Will a dog run onto the pitch during the university football match?',
   'A video or two reliable witnesses is enough. Cats don''t count.',
   null),
  ('Combien de fois le prof va-t-il dire « en fait » en amphi lundi ?',
   'Compté par le délégué. Sa parole fait foi.',
   'Absurde', array['Moins de 10', '10 à 25', 'Plus de 25'], now() + interval '5 days',
   'How many times will the professor say “basically” in Monday''s lecture?',
   'Counted by the class rep. Their word is final.',
   '{"en": {"Moins de 10": "Fewer than 10", "10 à 25": "10 to 25", "Plus de 25": "More than 25"}}');

-- Pour te donner les droits admin (résoudre les questions maison) :
--   update public.users set is_admin = true where username = 'ton_pseudo';
-- Puis, pour résoudre une question :
--   select public.resolve_question('<id de la question>', 'Oui');

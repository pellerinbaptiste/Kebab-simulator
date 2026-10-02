-- Questions de démo (à exécuter après 0001_init.sql)
insert into public.questions (title, description, category, options, deadline) values
  ('La BCE va-t-elle baisser ses taux directeurs ce jeudi ?',
   'Résolu selon le communiqué officiel de la BCE à l''issue de la réunion de politique monétaire.',
   'Macroéconomie', array['Oui', 'Non'], now() + interval '2 days'),
  ('La réforme de droit public sera-t-elle adoptée ?',
   'Vote définitif au Parlement avant la date limite.',
   'Droit public', array['Oui', 'Non'], now() + interval '9 days'),
  ('Un chien va-t-il courir sur le terrain pendant le match de foot universitaire ?',
   'Une vidéo ou deux témoins fiables suffisent.',
   'Absurde', array['Oui', 'Non'], now() + interval '1 day'),
  ('Le nouveau Marvel va-t-il dépasser 1 milliard $ au box-office ?',
   'Box-office mondial selon Box Office Mojo, 60 jours après la sortie.',
   'Pop culture', array['Oui', 'Non'], now() + interval '20 days'),
  ('Qui va gagner le derby de ce week-end ?',
   'Score à la fin du temps réglementaire.',
   'Sport', array['Domicile', 'Nul', 'Extérieur'], now() + interval '3 days'),
  ('Combien de fois le prof va-t-il dire « en fait » en amphi lundi ?',
   'Compté par le délégué. Sa parole fait foi.',
   'Absurde', array['Moins de 10', '10 à 25', 'Plus de 25'], now() + interval '4 days');

-- Pour te donner les droits admin (résolution des questions) :
-- update public.users set is_admin = true where username = 'ton_pseudo';

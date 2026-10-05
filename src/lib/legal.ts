/**
 * Informations et textes légaux affichés sur /legal (CGU, CGV, confidentialité,
 * mentions légales). Les champs entre crochets sont à compléter par l'éditeur
 * du site avant d'encaisser des paiements réels.
 */
export const LEGAL = {
  /** Nom et prénom (ou raison sociale) de l'éditeur */
  publisher: "[nom de l'éditeur à compléter]",
  /** Statut (ex. « Entrepreneur individuel (micro-entreprise) ») et SIRET si applicable */
  status: "[statut et SIRET à compléter]",
  /** Adresse postale */
  address: "[adresse à compléter]",
  /** Adresse email de contact (support, données personnelles, réclamations) */
  email: "[email de contact à compléter]",
  /** Mention TVA, ex. « TVA non applicable, art. 293 B du CGI » en micro-entreprise */
  vat: "[mention TVA à compléter]",
  /** Médiateur de la consommation (obligatoire dès qu'on vend à des particuliers) */
  mediator: "[médiateur de la consommation à compléter : nom, site web]",
  /** Âge minimum pour créer un compte */
  minAge: 15,
  /** Version des CGU, enregistrée avec l'accord de chaque joueur */
  termsVersion: "2026-10-05",
  updatedAt: "5 octobre 2026",
};

export type LegalSection = { title: string; paragraphs: string[] };
export type LegalDoc = { slug: string; title: string; summary: string; sections: LegalSection[] };

const L = LEGAL;

export const LEGAL_DOCS: LegalDoc[] = [
  {
    slug: "cgu",
    title: "Conditions générales d’utilisation",
    summary: "Les règles du jeu : crédits virtuels, compte, comportement, responsabilités.",
    sections: [
      {
        title: "1. Objet",
        paragraphs: [
          `Les présentes conditions encadrent l’utilisation de PronoLeague (le « Service »), édité par ${L.publisher} (voir les mentions légales). Créer un compte vaut acceptation de ces conditions.`,
        ],
      },
      {
        title: "2. Un jeu gratuit, sans argent réel",
        paragraphs: [
          "PronoLeague est un jeu de pronostics entre amis, entièrement gratuit. Chaque joueur reçoit 1 000 crédits virtuels à l’inscription pour parier sur des questions d’actualité, de sport, de pop culture ou des questions « maison ».",
          "Les crédits n’ont aucune valeur monétaire : ils ne s’achètent pas, ne se vendent pas, ne s’échangent pas, ne se transfèrent pas entre joueurs et ne peuvent jamais être convertis en argent, en lots ou en avantages. Aucun gain matériel n’est possible. PronoLeague n’est donc ni un jeu d’argent ni un site de paris au sens de la réglementation française : il n’implique aucun sacrifice financier et n’offre aucune espérance de gain.",
          "Les achats de la boutique (voir les CGV) sont uniquement cosmétiques : ils ne donnent ni crédits, ni avantage dans le jeu, ni chance supplémentaire de gagner.",
        ],
      },
      {
        title: "3. Questions, cotes et résultats",
        paragraphs: [
          "Une partie des questions reprend des marchés publics de Polymarket, à titre purement informatif et ludique, avec une traduction automatique. PronoLeague n’a aucun lien avec Polymarket et n’en est pas partenaire. Rien sur le Service ne constitue un conseil financier, juridique ou en investissement.",
          "Les cotes affichées sont indicatives : elles reflètent les probabilités Polymarket (mises à jour régulièrement) et les mises des joueurs, et évoluent jusqu’à la clôture de la question. Les gains sont calculés à la résolution, selon la répartition de la cagnotte entre les bonnes réponses.",
          "Les questions Polymarket sont réglées automatiquement selon le résultat publié par Polymarket ; les questions « maison » sont réglées par un administrateur. Si le résultat ne correspond à aucune réponse proposée, si une question est ambiguë ou si une erreur est constatée, la question peut être annulée et les mises sont alors rendues.",
        ],
      },
      {
        title: "4. Compte",
        paragraphs: [
          `Il faut avoir au moins ${L.minAge} ans pour créer un compte. Un seul compte par personne. Les informations fournies doivent être exactes et le mot de passe gardé confidentiel : toute activité depuis le compte est réputée faite par son titulaire.`,
          "Chaque joueur peut supprimer son compte à tout moment depuis les Réglages. La suppression est définitive : crédits, paris, objets achetés et classements sont effacés.",
        ],
      },
      {
        title: "5. Règles de conduite",
        paragraphs: [
          "Sont interdits : les pseudos ou noms de ligue injurieux, haineux, discriminatoires ou usurpant l’identité d’autrui ; l’usage de plusieurs comptes ; l’automatisation (robots, scripts) ; l’exploitation volontaire d’un bug ; toute tentative d’atteinte à la sécurité du Service.",
          "En cas de manquement, l’éditeur peut, après avoir si possible prévenu le joueur, modifier un pseudo, réinitialiser des crédits, suspendre ou supprimer un compte. Les objets cosmétiques payés par un compte supprimé pour fraude ne sont pas remboursés, sauf disposition légale contraire.",
        ],
      },
      {
        title: "6. Évolution et disponibilité du Service",
        paragraphs: [
          "Le Service est fourni « en l’état » et peut évoluer : nouvelles fonctions, saisons avec remise à zéro des crédits annoncée à l’avance, fermeture de certaines questions. L’éditeur fait ses meilleurs efforts pour assurer sa disponibilité mais ne la garantit pas, notamment en cas de maintenance ou de panne d’un prestataire (hébergement, Polymarket, paiement).",
        ],
      },
      {
        title: "7. Propriété intellectuelle",
        paragraphs: [
          "Le nom PronoLeague, son logo, son design et son code appartiennent à l’éditeur. Les données de marché proviennent de Polymarket et restent la propriété de leurs auteurs. Les contenus publiés par les joueurs (pseudos, noms de ligue) restent les leurs ; ils autorisent leur affichage dans le Service.",
        ],
      },
      {
        title: "8. Responsabilité",
        paragraphs: [
          "Le Service étant un divertissement sans enjeu financier, l’éditeur ne peut être tenu responsable des décisions prises par un joueur sur la base des questions ou des cotes affichées, ni des contenus de sites tiers vers lesquels renvoient des liens.",
        ],
      },
      {
        title: "9. Données personnelles",
        paragraphs: ["Le traitement des données est décrit dans la politique de confidentialité."],
      },
      {
        title: "10. Modification des conditions",
        paragraphs: [
          "Ces conditions peuvent être modifiées. Les joueurs sont informés des changements importants au moins 15 jours à l’avance ; continuer à utiliser le Service vaut acceptation de la nouvelle version.",
        ],
      },
      {
        title: "11. Droit applicable",
        paragraphs: [
          `Les présentes conditions sont soumises au droit français. En cas de difficulté, écrivez d’abord à ${L.email} pour trouver une solution amiable ; à défaut, les tribunaux français sont compétents, sous réserve des règles protectrices du consommateur.`,
        ],
      },
    ],
  },
  {
    slug: "cgv",
    title: "Conditions générales de vente",
    summary: "La boutique : objets cosmétiques, abonnement Club, paiement, rétractation.",
    sections: [
      {
        title: "1. Vendeur",
        paragraphs: [`${L.publisher} — ${L.status} — ${L.address} — ${L.email}. ${L.vat}.`],
      },
      {
        title: "2. Ce qui est vendu",
        paragraphs: [
          "La boutique propose uniquement des contenus numériques cosmétiques : couleurs de pseudo, cadres d’avatar, badges, packs, ainsi qu’un abonnement mensuel « Club » donnant accès à une partie de ces objets. Ils changent seulement l’apparence du compte dans le Service.",
          "Aucun achat ne donne de crédits, d’avantage dans le jeu ou de chance supplémentaire de gagner. Les crédits ne sont jamais vendus.",
          "Les objets achetés à l’unité ou en pack sont acquis pour la durée de vie du Service et du compte. Les objets en édition limitée ne sont vendus que jusqu’à la date indiquée.",
        ],
      },
      {
        title: "3. Prix",
        paragraphs: [
          "Les prix sont indiqués en euros, toutes taxes comprises, sur la fiche de chaque objet et rappelés sur la page de paiement. Le prix applicable est celui affiché au moment de la commande.",
        ],
      },
      {
        title: "4. Commande et paiement",
        paragraphs: [
          "Le joueur choisit un objet, coche la case d’accès immédiat (voir l’article 7), puis paie sur la page sécurisée de Stripe par carte bancaire, Apple Pay ou Google Pay. L’éditeur n’a jamais accès aux données bancaires. La commande est ferme dès la validation du paiement ; un reçu est envoyé par Stripe.",
          `Les mineurs (dès ${L.minAge} ans) doivent obtenir l’accord de leurs parents avant tout achat.`,
        ],
      },
      {
        title: "5. Livraison",
        paragraphs: [
          `L’objet est ajouté automatiquement au compte, en général dans les secondes qui suivent le paiement. S’il n’apparaît pas après quelques minutes, écrivez à ${L.email} : l’objet est livré ou le paiement remboursé.`,
        ],
      },
      {
        title: "6. Abonnement Club",
        paragraphs: [
          "L’abonnement est mensuel, sans durée minimale, et se renouvelle automatiquement au même prix à chaque échéance.",
          "Il se résilie à tout moment en ligne, en quelques clics, depuis la boutique (« Gérer ou résilier »). La résiliation prend effet à la fin du mois déjà payé : le Club reste actif jusqu’à cette date, puis les objets inclus dans le Club (et non achetés séparément) ne sont plus utilisables. Aucun mois entamé n’est remboursé, sauf disposition légale contraire.",
          "Toute hausse de prix est annoncée par email au moins un mois avant de s’appliquer ; l’abonné peut résilier sans frais avant son entrée en vigueur.",
        ],
      },
      {
        title: "7. Droit de rétractation",
        paragraphs: [
          "Les objets et l’abonnement sont des contenus numériques fournis immédiatement après le paiement. Avant de payer, le joueur demande expressément cet accès immédiat et reconnaît perdre son droit de rétractation dès que l’objet est débloqué (article L221-28, 13° du Code de la consommation).",
          "En cas de problème technique (objet non livré, double paiement, erreur de prix), le joueur est remboursé.",
        ],
      },
      {
        title: "8. Garantie de conformité",
        paragraphs: [
          "Les contenus numériques bénéficient de la garantie légale de conformité (articles L224-25-12 et suivants du Code de la consommation) : en cas de défaut, le joueur peut demander leur mise en conformité ou, à défaut, une réduction de prix ou le remboursement.",
        ],
      },
      {
        title: "9. Réclamations et médiation",
        paragraphs: [
          `Toute réclamation est à adresser à ${L.email}. À défaut d’accord dans un délai de deux mois, le joueur peut recourir gratuitement au médiateur de la consommation : ${L.mediator}.`,
        ],
      },
    ],
  },
  {
    slug: "confidentialite",
    title: "Politique de confidentialité",
    summary: "Quelles données, pourquoi, chez qui, combien de temps, et tes droits.",
    sections: [
      {
        title: "1. Responsable du traitement",
        paragraphs: [`${L.publisher}, ${L.address}. Contact pour toute question sur tes données : ${L.email}.`],
      },
      {
        title: "2. Données collectées",
        paragraphs: [
          "Compte : adresse email, pseudo, mot de passe (stocké chiffré, jamais lisible), date d’acceptation des CGU.",
          "Jeu : crédits, paris, ligues créées ou rejointes, objets cosmétiques équipés.",
          "Achats : objet acheté, montant, date et identifiants Stripe. Les données bancaires sont traitées uniquement par Stripe.",
          "Technique : journaux de connexion et d’erreurs conservés par nos hébergeurs pour la sécurité.",
        ],
      },
      {
        title: "3. Pourquoi et sur quelle base",
        paragraphs: [
          "Faire fonctionner ton compte, le jeu, les ligues et la boutique : exécution du contrat (CGU et CGV).",
          "Sécuriser le Service et lutter contre la triche : intérêt légitime de l’éditeur.",
          "Conserver les justificatifs de vente : obligation légale.",
          "Aucune donnée n’est vendue, ni utilisée pour de la publicité ou du profilage.",
        ],
      },
      {
        title: "4. Qui y a accès",
        paragraphs: [
          "Seuls l’éditeur et ses prestataires techniques, chacun pour sa mission : Supabase (base de données et authentification, serveurs à Paris), Vercel (hébergement du site), Stripe (paiements), GitHub (exécution des tâches automatiques, sans données de joueurs).",
          "Les autres joueurs voient seulement ton pseudo, tes objets cosmétiques et tes crédits dans les ligues que tu as rejointes.",
          "Certains prestataires sont établis aux États-Unis : les transferts sont encadrés par le Data Privacy Framework ou les clauses contractuelles types de la Commission européenne.",
        ],
      },
      {
        title: "5. Durée de conservation",
        paragraphs: [
          "Les données du compte sont conservées tant que le compte existe, puis effacées lors de sa suppression (sauvegardes techniques comprises sous 30 jours).",
          "Les justificatifs de paiement (factures, reçus) restent conservés dans Stripe pendant la durée légale de 10 ans, même après la suppression du compte.",
        ],
      },
      {
        title: "6. Cookies et stockage local",
        paragraphs: [
          "PronoLeague n’utilise aucun cookie publicitaire ou de mesure d’audience. Seul un stockage local strictement nécessaire est utilisé (session de connexion, langue choisie) ; il est dispensé de consentement.",
        ],
      },
      {
        title: "7. Tes droits",
        paragraphs: [
          `Tu peux accéder à tes données, les rectifier (le pseudo se modifie dans les Réglages), les effacer (bouton « Supprimer mon compte » dans les Réglages), en demander la portabilité ou t’opposer à un traitement en écrivant à ${L.email}. Réponse sous un mois.`,
          "Si tu estimes que tes droits ne sont pas respectés, tu peux saisir la CNIL (www.cnil.fr).",
        ],
      },
      {
        title: "8. Sécurité",
        paragraphs: [
          "Les échanges sont chiffrés (HTTPS), les mots de passe hachés, et l’accès aux données est limité par des règles de sécurité au niveau de la base (chaque joueur ne lit que ce qui le concerne).",
        ],
      },
    ],
  },
  {
    slug: "mentions",
    title: "Mentions légales",
    summary: "Éditeur, hébergeur et contact du site.",
    sections: [
      {
        title: "Éditeur",
        paragraphs: [`${L.publisher} — ${L.status}`, L.address, `Contact : ${L.email}`, `Directeur de la publication : ${L.publisher}`],
      },
      {
        title: "Hébergement",
        paragraphs: [
          "Site : Vercel Inc., 440 N Barranca Ave #4133, Covina, CA 91723, États-Unis — vercel.com",
          "Données : Supabase Inc. — serveurs situés à Paris (Union européenne) — supabase.com",
        ],
      },
      {
        title: "Données de marché",
        paragraphs: [
          "Une partie des questions et des probabilités provient de l’API publique de Polymarket. PronoLeague n’est ni affilié à Polymarket, ni approuvé par lui.",
        ],
      },
    ],
  },
];

export function legalDoc(slug: string) {
  const doc = LEGAL_DOCS.find((d) => d.slug === slug);
  if (!doc) throw new Error(`Document légal inconnu : ${slug}`);
  return doc;
}

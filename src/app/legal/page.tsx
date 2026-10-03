import type { Metadata } from "next";
import Link from "next/link";

import { LEGAL } from "@/lib/legal";

export const metadata: Metadata = { title: "Conditions de vente et mentions légales" };

export default function LegalPage() {
  return (
    <main className="mx-auto flex w-full max-w-2xl flex-1 flex-col gap-6 px-4 py-10 text-sm leading-relaxed">
      <Link href="/" className="w-fit text-lg font-black tracking-tight">
        Prono<span className="text-primary">League</span>
      </Link>
      <h1 className="text-2xl font-black tracking-tight">Conditions de vente et mentions légales</h1>
      <p className="text-muted-foreground">Dernière mise à jour : {LEGAL.updatedAt}</p>

      <Section title="1. Éditeur du site">
        <p>
          {LEGAL.publisher} — {LEGAL.status}
          <br />
          {LEGAL.address}
          <br />
          Contact : {LEGAL.email}
        </p>
        <p>
          Hébergement du site : Vercel Inc., 440 N Barranca Ave #4133, Covina, CA 91723, États-Unis. Données des
          joueurs : Supabase (serveurs dans l&apos;Union européenne). Paiements : Stripe Payments Europe Ltd., Dublin,
          Irlande.
        </p>
      </Section>

      <Section title="2. Le jeu">
        <p>
          PronoLeague est un jeu de pronostics entre amis joué uniquement avec des crédits virtuels, offerts à
          l&apos;inscription. Les crédits ne s&apos;achètent pas, ne se vendent pas, ne s&apos;échangent pas et
          n&apos;ont aucune valeur monétaire. Aucun gain en argent ou en nature n&apos;est possible.
        </p>
      </Section>

      <Section title="3. Ce qui est vendu">
        <p>
          La boutique propose uniquement des objets numériques cosmétiques (couleurs de pseudo, cadres d&apos;avatar,
          badges, packs) et un abonnement « Club » qui donne accès à ces objets. Ils changent l&apos;apparence du
          compte dans les classements et ne donnent aucun crédit ni aucun avantage au jeu. Les prix sont indiqués en
          euros, toutes taxes comprises. Les objets achetés à l&apos;unité ou en pack sont acquis sans limite de durée,
          tant que le service existe. Les objets en édition limitée ne sont vendus que jusqu&apos;à la date indiquée.
        </p>
      </Section>

      <Section title="4. Commande et paiement">
        <p>
          Le paiement se fait en ligne par carte bancaire, Apple Pay ou Google Pay, via la plateforme sécurisée Stripe.
          PronoLeague n&apos;a jamais accès à vos données bancaires. La commande est définitive dès la validation du
          paiement par Stripe.
        </p>
      </Section>

      <Section title="5. Abonnement Club">
        <p>
          L&apos;abonnement Club est mensuel et se renouvelle automatiquement au même prix, sans engagement de durée.
          Vous pouvez le résilier à tout moment, en quelques clics, depuis la boutique (« Gérer ou résilier »). La
          résiliation prend effet à la fin de la période déjà payée : vous gardez l&apos;accès au Club jusqu&apos;à
          cette date, puis les objets inclus dans le Club (et non achetés séparément) cessent d&apos;être utilisables.
          Toute modification de prix vous sera annoncée par email au moins un mois avant de s&apos;appliquer.
        </p>
      </Section>

      <Section title="6. Livraison">
        <p>
          L&apos;objet est ajouté à votre compte automatiquement, en général dans les secondes qui suivent le paiement.
          S&apos;il n&apos;apparaît pas après quelques minutes, écrivez-nous à l&apos;adresse de contact ci-dessus.
        </p>
      </Section>

      <Section title="7. Droit de rétractation">
        <p>
          Les objets et l&apos;abonnement sont des contenus numériques fournis immédiatement après l&apos;achat. Avant de payer, vous
          demandez expressément cet accès immédiat et reconnaissez perdre votre droit de rétractation une fois
          l&apos;objet débloqué (article L221-28, 13° du Code de la consommation). En cas de problème technique
          (objet non livré, double paiement), vous êtes remboursé.
        </p>
      </Section>

      <Section title="8. Données personnelles">
        <p>
          Nous conservons votre email, votre pseudo, vos pronostics et l&apos;historique de vos achats (objet, montant,
          date) pour faire fonctionner le jeu et respecter nos obligations comptables. Vos données ne sont ni vendues
          ni utilisées pour de la publicité. Vous pouvez demander leur consultation ou leur suppression à
          l&apos;adresse de contact.
        </p>
      </Section>

      <Section title="9. Litiges">
        <p>
          Ces conditions sont soumises au droit français. En cas de litige, contactez-nous d&apos;abord pour trouver
          une solution amiable. Vous pouvez aussi recourir gratuitement à un médiateur de la consommation.
        </p>
      </Section>
    </main>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="flex flex-col gap-2">
      <h2 className="text-base font-bold">{title}</h2>
      {children}
    </section>
  );
}

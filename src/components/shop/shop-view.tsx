"use client";

import * as React from "react";
import Link from "next/link";
import { Check, Clock, Lock, ShoppingBag, Star } from "lucide-react";

import { PlayerAvatar, PlayerName } from "@/components/player-name";
import { Button } from "@/components/ui/button";
import { isClubActive } from "@/lib/cosmetics";
import type { MessageKey } from "@/lib/i18n/dictionaries";
import { useI18n } from "@/lib/i18n/provider";
import { useStore } from "@/lib/store";
import type { CosmeticKind, ShopItem } from "@/lib/types";
import { cn } from "@/lib/utils";

type Notice = { tone: "ok" | "info" | "error"; key: MessageKey } | null;

const SECTIONS = ["bundle", "name_color", "avatar_frame", "badge"] as const;

function formatPrice(cents: number, currency: string, lang: string) {
  return new Intl.NumberFormat(lang === "en" ? "en-GB" : "fr-FR", {
    style: "currency",
    currency: currency.toUpperCase(),
  }).format(cents / 100);
}

function formatDate(iso: string, lang: string) {
  return new Intl.DateTimeFormat(lang === "en" ? "en-GB" : "fr-FR", { day: "numeric", month: "long" }).format(
    new Date(iso),
  );
}

export function ShopView() {
  const { t } = useI18n();
  const { shopItems, ownedItems, confirmPurchases } = useStore();
  const [consent, setConsent] = React.useState(false);
  // Retour de Stripe : /shop/?paid=1 ou /shop/?cancelled=1 (la page n'est rendue
  // que dans le navigateur, après le chargement des données du joueur)
  const [returnStatus] = React.useState(() => {
    if (typeof window === "undefined") return null;
    const params = new URLSearchParams(window.location.search);
    return params.has("paid") ? "paid" : params.has("cancelled") ? "cancelled" : null;
  });
  const [notice, setNotice] = React.useState<Notice>(() =>
    returnStatus === "paid"
      ? { tone: "ok", key: "shop.paid" }
      : returnStatus === "cancelled"
        ? { tone: "info", key: "shop.cancelled" }
        : null,
  );

  React.useEffect(() => {
    if (returnStatus) window.history.replaceState(null, "", window.location.pathname);
  }, [returnStatus]);

  // Débloque les achats payés : le webhook Stripe le fait normalement, mais on
  // vérifie aussi nous-mêmes à l'ouverture de la boutique et au retour du paiement.
  const ownedCount = React.useRef(ownedItems.length);
  React.useEffect(() => {
    ownedCount.current = ownedItems.length;
  }, [ownedItems.length]);
  React.useEffect(() => {
    const delays = returnStatus === "paid" ? [0, 2000, 5000, 10000, 20000] : [0];
    const start = ownedCount.current;
    const timers = delays.map((ms) =>
      setTimeout(() => {
        if (ownedCount.current === start) void confirmPurchases();
      }, ms),
    );
    return () => timers.forEach(clearTimeout);
  }, [returnStatus, confirmPurchases]);

  const club = shopItems.find((i) => i.kind === "subscription");
  const [now] = React.useState(() => Date.now());
  const forSale = shopItems.filter((i) => !i.available_until || Date.parse(i.available_until) > now);

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-1">
        <h1 className="flex items-center gap-2 text-2xl font-extrabold tracking-tight">
          <ShoppingBag aria-hidden className="size-6 text-primary" />
          {t("shop.title")}
        </h1>
        <p className="text-sm text-muted-foreground">{t("shop.subtitle")}</p>
      </div>

      {notice && <NoticeLine notice={notice} />}

      <label className="flex items-start gap-3 rounded-2xl border bg-card p-4 text-sm">
        <input
          type="checkbox"
          checked={consent}
          onChange={(e) => setConsent(e.target.checked)}
          className="mt-0.5 size-4 shrink-0 accent-primary"
        />
        <span>{t("shop.consent")}</span>
      </label>

      {club && <ClubCard item={club} consent={consent} onNotice={setNotice} />}

      {SECTIONS.map((kind) => {
        const items = forSale.filter((i) => i.kind === kind);
        if (items.length === 0) return null;
        return (
          <section key={kind} className="flex flex-col gap-3" aria-labelledby={`shop-${kind}`}>
            <h2 id={`shop-${kind}`} className="text-lg font-bold">
              {t(`shop.section.${kind}` as MessageKey)}
            </h2>
            <div className="grid gap-3 sm:grid-cols-2">
              {items.map((item) => (
                <ItemCard key={item.id} item={item} consent={consent} onNotice={setNotice} />
              ))}
            </div>
          </section>
        );
      })}

      <div className="flex flex-col gap-1 text-xs text-muted-foreground">
        <p className="flex items-center gap-1.5">
          <Lock aria-hidden className="size-3.5 shrink-0" />
          {t("shop.secure")}
        </p>
        <Link href="/legal/cgv" className="w-fit underline underline-offset-2 hover:text-foreground">
          {t("shop.terms")}
        </Link>
      </div>
    </div>
  );
}

/** Achat : vérifie la case d'accord puis part vers Stripe. */
function useBuy(consent: boolean, onNotice: (n: Notice) => void) {
  const { buyItem } = useStore();
  const [busy, setBusy] = React.useState(false);
  async function buy(itemId: string) {
    if (!consent) return onNotice({ tone: "error", key: "shop.consentNeeded" });
    setBusy(true);
    onNotice({ tone: "info", key: "shop.redirecting" });
    const res = await buyItem(itemId);
    // En cas de succès, le navigateur part vers Stripe
    if (!res.ok) {
      setBusy(false);
      onNotice({ tone: "error", key: res.error });
    }
  }
  return { busy, setBusy, buy };
}

function ClubCard({ item, consent, onNotice }: { item: ShopItem; consent: boolean; onNotice: (n: Notice) => void }) {
  const { t, lang } = useI18n();
  const { user, manageSubscription, equipItem } = useStore();
  const { busy, setBusy, buy } = useBuy(consent, onNotice);
  const member = isClubActive(user.club_until);
  const price = formatPrice(item.price_cents, item.currency, lang);
  const perks: MessageKey[] = ["shop.club.perkColors", "shop.club.perkFrames", "shop.club.perkBadge", "shop.club.perkNew"];

  async function manage() {
    setBusy(true);
    const res = await manageSubscription();
    if (!res.ok) {
      setBusy(false);
      onNotice({ tone: "error", key: res.error });
    }
  }

  async function toggleBadge() {
    setBusy(true);
    const res = await equipItem("badge", user.badge === "club" ? null : "club");
    setBusy(false);
    if (!res.ok) onNotice({ tone: "error", key: res.error });
  }

  return (
    <section className="relative overflow-hidden rounded-2xl border-2">
      <div className="flex flex-col gap-4 bg-card p-5">
        <div className="flex items-start justify-between gap-3">
          <div className="flex flex-col gap-1">
            <h2 className="flex items-center gap-2 text-xl font-extrabold tracking-tight">
              <Star aria-hidden className="size-5 fill-primary text-primary" />
              {lang === "en" && item.name_en ? item.name_en : item.name}
            </h2>
            <p className="text-sm font-bold text-primary">{t("shop.club.price", { price })}</p>
          </div>
          <PlayerAvatar name={user.username} frame="galaxy" size="lg" />
        </div>

        <ul className="flex flex-col gap-1.5 text-sm">
          {perks.map((perk) => (
            <li key={perk} className="flex items-center gap-2">
              <Check aria-hidden className="size-4 shrink-0 text-yes" />
              {t(perk)}
            </li>
          ))}
        </ul>

        {member ? (
          <div className="flex flex-col gap-3">
            <p className="text-sm font-semibold text-yes">
              {t("shop.club.member", { date: formatDate(user.club_until!, lang) })}
            </p>
            <div className="flex flex-wrap gap-2">
              <Button size="sm" variant={user.badge === "club" ? "outline" : "default"} disabled={busy} onClick={toggleBadge}>
                {t(user.badge === "club" ? "shop.unequip" : "shop.equip")} · {t("shop.club.badge")}
              </Button>
              <Button size="sm" variant="ghost" disabled={busy} onClick={manage}>
                {t("shop.club.manage")}
              </Button>
            </div>
          </div>
        ) : (
          <Button size="lg" disabled={busy} onClick={() => buy(item.id)} className="w-full">
            {t("shop.club.join", { price })}
          </Button>
        )}
        <p className="text-xs text-muted-foreground">{t("shop.club.terms")}</p>
      </div>
    </section>
  );
}

function ItemCard({ item, consent, onNotice }: { item: ShopItem; consent: boolean; onNotice: (n: Notice) => void }) {
  const { t, lang } = useI18n();
  const { user, shopItems, ownedItems, equipItem } = useStore();
  const { busy, setBusy, buy } = useBuy(consent, onNotice);
  const member = isClubActive(user.club_until);

  // Ce que l'objet (ou le pack) change à l'apparence
  const parts = item.kind === "bundle" ? shopItems.filter((i) => item.bundle_items.includes(i.id)) : [item];
  const look = (kind: CosmeticKind) => parts.find((p) => p.kind === kind)?.value;
  const owned =
    ownedItems.includes(item.id) || (item.kind === "bundle" && item.bundle_items.every((id) => ownedItems.includes(id)));
  const usable = owned || (member && item.club_included);
  const cosmetic = item.kind === "bundle" ? null : (item.kind as CosmeticKind);
  const equipped = cosmetic !== null && user[cosmetic] === item.value;

  // Économie d'un pack par rapport aux objets achetés un par un
  const separate = parts.reduce((sum, p) => sum + p.price_cents, 0);
  const saving = item.kind === "bundle" ? separate - item.price_cents : 0;

  async function toggle() {
    if (!cosmetic) return;
    setBusy(true);
    const res = await equipItem(cosmetic, equipped ? null : item.value);
    setBusy(false);
    if (!res.ok) onNotice({ tone: "error", key: res.error });
  }

  const name = lang === "en" && item.name_en ? item.name_en : item.name;
  const description = lang === "en" && item.description_en ? item.description_en : item.description;

  return (
    <article className="flex flex-col gap-3 rounded-2xl border bg-card p-4">
      <div className="flex items-center gap-3 bg-muted/60 px-3 py-3">
        <PlayerAvatar name={user.username} frame={look("avatar_frame") ?? user.avatar_frame} />
        <PlayerName
          name={user.username}
          color={look("name_color") ?? user.name_color}
          badge={look("badge") ?? user.badge}
          className="font-semibold"
        />
      </div>

      <div className="flex flex-col gap-0.5">
        <div className="flex flex-wrap items-center gap-1.5">
          <h3 className="font-bold">{name}</h3>
          {item.available_until && (
            <span className="inline-flex items-center gap-1 rounded-full bg-no-soft px-2 py-0.5 text-[11px] font-bold text-no">
              <Clock aria-hidden className="size-3" />
              {t("shop.limited", { date: formatDate(item.available_until, lang) })}
            </span>
          )}
          {saving > 0 && (
            <span className="rounded-full bg-yes-soft px-2 py-0.5 text-[11px] font-bold text-yes">
              {t("shop.bundleSave", { amount: formatPrice(saving, item.currency, lang) })}
            </span>
          )}
        </div>
        {description && <p className="text-sm text-muted-foreground">{description}</p>}
      </div>

      <div className="mt-auto flex flex-wrap items-center gap-2">
        {usable ? (
          <>
            <span className="inline-flex items-center gap-1 text-sm font-semibold text-yes">
              <Check aria-hidden className="size-4" />
              {t(owned ? "shop.owned" : "shop.includedClub")}
            </span>
            {cosmetic && (
              <Button variant={equipped ? "outline" : "default"} size="sm" disabled={busy} onClick={toggle}>
                {t(equipped ? "shop.unequip" : "shop.equip")}
              </Button>
            )}
          </>
        ) : (
          <>
            <Button disabled={busy} onClick={() => buy(item.id)}>
              {t("shop.buy", { price: formatPrice(item.price_cents, item.currency, lang) })}
            </Button>
            {item.club_included && (
              <span className="inline-flex items-center gap-1 text-xs font-semibold text-muted-foreground">
                <Star aria-hidden className="size-3.5 fill-primary text-primary" />
                {t("shop.includedClub")}
              </span>
            )}
          </>
        )}
      </div>
    </article>
  );
}

function NoticeLine({ notice }: { notice: NonNullable<Notice> }) {
  const { t } = useI18n();
  return (
    <p
      role={notice.tone === "error" ? "alert" : "status"}
      className={cn(
        "px-3 py-2 text-sm font-medium",
        notice.tone === "ok" && "bg-yes-soft text-yes",
        notice.tone === "info" && "bg-muted text-foreground",
        notice.tone === "error" && "bg-no-soft text-no",
      )}
    >
      {t(notice.key)}
    </p>
  );
}

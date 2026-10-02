"use client";

import * as React from "react";
import Link from "next/link";
import { BadgeCheck, Check, Lock, Palette, ShoppingBag } from "lucide-react";

import { PlayerName } from "@/components/player-name";
import { Button } from "@/components/ui/button";
import type { MessageKey } from "@/lib/i18n/dictionaries";
import { useI18n } from "@/lib/i18n/provider";
import { useStore } from "@/lib/store";
import type { NameColor, ShopItem } from "@/lib/types";
import { cn } from "@/lib/utils";

type Notice = { tone: "ok" | "info" | "error"; key: MessageKey } | null;

function formatPrice(item: ShopItem, lang: string) {
  return new Intl.NumberFormat(lang === "en" ? "en-GB" : "fr-FR", {
    style: "currency",
    currency: item.currency.toUpperCase(),
  }).format(item.price_cents / 100);
}

export function ShopView() {
  const { t } = useI18n();
  const { shopItems, refresh } = useStore();
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
    if (!returnStatus) return;
    window.history.replaceState(null, "", window.location.pathname);
    if (returnStatus !== "paid") return;
    // Stripe prévient le serveur en parallèle : on relit plusieurs fois
    const timers = [2000, 5000, 10000, 20000].map((ms) => setTimeout(() => void refresh(), ms));
    return () => timers.forEach(clearTimeout);
  }, [returnStatus, refresh]);

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-1">
        <h1 className="flex items-center gap-2 text-2xl font-black tracking-tight">
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

      <div className="flex flex-col gap-3">
        {shopItems.map((item) => (
          <ItemCard key={item.id} item={item} consent={consent} onNotice={setNotice} />
        ))}
      </div>

      <div className="flex flex-col gap-1 text-xs text-muted-foreground">
        <p className="flex items-center gap-1.5">
          <Lock aria-hidden className="size-3.5 shrink-0" />
          {t("shop.secure")}
        </p>
        <Link href="/legal" className="w-fit underline underline-offset-2 hover:text-foreground">
          {t("shop.terms")}
        </Link>
      </div>
    </div>
  );
}

function ItemCard({
  item,
  consent,
  onNotice,
}: {
  item: ShopItem;
  consent: boolean;
  onNotice: (n: Notice) => void;
}) {
  const { t, lang } = useI18n();
  const { user, ownedItems, buyItem, equipNameColor } = useStore();
  const [busy, setBusy] = React.useState(false);
  const owned = ownedItems.includes(item.id);
  const color = item.kind === "name_color" ? (item.value as NameColor) : null;
  const equipped = color !== null && user.name_color === color;
  const Icon = item.kind === "badge" ? BadgeCheck : Palette;

  async function buy() {
    if (!consent) return onNotice({ tone: "error", key: "shop.consentNeeded" });
    setBusy(true);
    onNotice({ tone: "info", key: "shop.redirecting" });
    const res = await buyItem(item.id);
    // En cas de succès, le navigateur part vers Stripe
    if (!res.ok) {
      setBusy(false);
      onNotice({ tone: "error", key: res.error });
    }
  }

  async function toggleColor() {
    setBusy(true);
    const res = await equipNameColor(equipped ? null : color);
    setBusy(false);
    if (!res.ok) onNotice({ tone: "error", key: res.error });
  }

  return (
    <article className="flex flex-col gap-3 rounded-2xl border bg-card p-4 shadow-sm">
      <div className="flex items-start gap-3">
        <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-accent text-primary" aria-hidden>
          <Icon className="size-5" />
        </span>
        <div className="flex min-w-0 flex-1 flex-col gap-0.5">
          <h2 className="font-bold">{t(`shop.item.${item.id}.name` as MessageKey)}</h2>
          <p className="text-sm text-muted-foreground">{t(`shop.item.${item.id}.desc` as MessageKey)}</p>
        </div>
      </div>

      <div className="flex items-center gap-2 rounded-xl bg-muted/60 px-3 py-2 text-sm">
        <span className="text-xs font-semibold text-muted-foreground uppercase">{t("shop.preview")}</span>
        <PlayerName
          name={user.username}
          color={color ?? user.name_color}
          supporter={item.kind === "badge" || user.is_supporter}
          className="font-semibold"
        />
      </div>

      <div className="flex flex-wrap items-center gap-2">
        {owned ? (
          <>
            <span className="inline-flex items-center gap-1 text-sm font-semibold text-yes">
              <Check aria-hidden className="size-4" />
              {t("shop.owned")}
            </span>
            {color && (
              <Button variant={equipped ? "outline" : "default"} size="sm" disabled={busy} onClick={toggleColor}>
                {t(equipped ? "shop.unequip" : "shop.equip")}
              </Button>
            )}
          </>
        ) : (
          <Button disabled={busy} onClick={buy} className={cn(!consent && "opacity-80")}>
            {t("shop.buy", { price: formatPrice(item, lang) })}
          </Button>
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
        "rounded-xl px-3 py-2 text-sm font-medium",
        notice.tone === "ok" && "bg-yes-soft text-yes",
        notice.tone === "info" && "bg-muted text-foreground",
        notice.tone === "error" && "bg-no-soft text-no",
      )}
    >
      {t(notice.key)}
    </p>
  );
}

"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Flame, Settings, ShoppingBag, Trophy } from "lucide-react";

import type { MessageKey } from "@/lib/i18n/dictionaries";
import { useI18n } from "@/lib/i18n/provider";
import { cn } from "@/lib/utils";

const ITEMS: { href: string; label: MessageKey; icon: typeof Flame }[] = [
  { href: "/dashboard", label: "nav.predictions", icon: Flame },
  { href: "/leagues", label: "nav.leagues", icon: Trophy },
  { href: "/shop", label: "nav.shop", icon: ShoppingBag },
  { href: "/settings", label: "nav.settings", icon: Settings },
];

export function BottomNav() {
  const pathname = usePathname();
  const { t } = useI18n();

  return (
    <nav className="fixed inset-x-0 bottom-0 z-40 border-t bg-card pb-[env(safe-area-inset-bottom)]">
      <div className="mx-auto grid max-w-2xl grid-cols-4">
        {ITEMS.map(({ href, label, icon: Icon }) => {
          const active = pathname.startsWith(href);
          return (
            <Link
              key={href}
              href={href}
              aria-current={active ? "page" : undefined}
              className={cn(
                "relative flex flex-col items-center gap-1 py-2 text-[11px] font-bold transition-colors",
                active ? "text-primary" : "text-muted-foreground hover:text-foreground",
              )}
            >
              <Icon aria-hidden className="size-5" strokeWidth={active ? 2.25 : 2} />
              {t(label)}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}

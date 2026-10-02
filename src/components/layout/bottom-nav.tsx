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
    <nav className="fixed inset-x-0 bottom-0 z-40 border-t bg-background/90 pb-[env(safe-area-inset-bottom)] backdrop-blur-lg">
      <div className="mx-auto grid max-w-2xl grid-cols-4">
        {ITEMS.map(({ href, label, icon: Icon }) => {
          const active = pathname.startsWith(href);
          return (
            <Link
              key={href}
              href={href}
              aria-current={active ? "page" : undefined}
              className={cn(
                "flex flex-col items-center gap-0.5 py-2.5 text-xs font-semibold transition-colors",
                active ? "text-primary" : "text-muted-foreground hover:text-foreground",
              )}
            >
              <Icon aria-hidden className={cn("size-5", active && "fill-primary/20")} />
              {t(label)}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}

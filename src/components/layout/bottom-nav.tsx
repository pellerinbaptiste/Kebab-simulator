"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Flame, Trophy } from "lucide-react";

import { cn } from "@/lib/utils";

const ITEMS = [
  { href: "/dashboard", label: "Pronos", icon: Flame },
  { href: "/leagues", label: "Ligues", icon: Trophy },
];

export function BottomNav() {
  const pathname = usePathname();

  return (
    <nav className="fixed inset-x-0 bottom-0 z-40 border-t bg-background/90 pb-[env(safe-area-inset-bottom)] backdrop-blur-lg">
      <div className="mx-auto grid max-w-2xl grid-cols-2">
        {ITEMS.map(({ href, label, icon: Icon }) => {
          const active = pathname.startsWith(href);
          return (
            <Link
              key={href}
              href={href}
              className={cn(
                "flex flex-col items-center gap-0.5 py-2.5 text-xs font-semibold transition-colors",
                active ? "text-primary" : "text-muted-foreground hover:text-foreground",
              )}
            >
              <Icon className={cn("size-5", active && "fill-primary/20")} />
              {label}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}

"use client";

import Link from "next/link";

import { CreditsPill } from "@/components/layout/credits-pill";
import { useStore } from "@/lib/store";

export function AppHeader() {
  const { user } = useStore();

  return (
    <header className="sticky top-0 z-40 border-b bg-background/80 backdrop-blur-lg">
      <div className="mx-auto flex h-14 max-w-2xl items-center justify-between px-4">
        <Link href="/dashboard" className="flex items-center gap-2 font-black tracking-tight">
          <span className="grid size-8 place-items-center rounded-lg bg-primary text-base text-primary-foreground">
            🔮
          </span>
          <span className="text-lg">
            Prono<span className="text-primary">League</span>
          </span>
        </Link>
        <div className="flex items-center gap-2">
          <CreditsPill value={user.total_credits} />
          <div
            className="grid size-9 place-items-center rounded-full bg-accent text-sm font-bold text-accent-foreground uppercase"
            title={user.username}
          >
            {user.username.slice(0, 2)}
          </div>
        </div>
      </div>
    </header>
  );
}

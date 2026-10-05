"use client";

import Link from "next/link";

import { Logo } from "@/components/brand/logo";
import { CreditsPill } from "@/components/layout/credits-pill";
import { PlayerAvatar } from "@/components/player-name";
import { useI18n } from "@/lib/i18n/provider";
import { useStore } from "@/lib/store";

export function AppHeader() {
  const { user } = useStore();
  const { t } = useI18n();

  return (
    <header className="sticky top-0 z-40 border-b bg-card">
      <div className="mx-auto flex h-14 max-w-2xl items-center justify-between px-4">
        <Link href="/dashboard" aria-label="PronoLeague">
          <Logo />
        </Link>
        <div className="flex items-center gap-2">
          <CreditsPill value={user.total_credits} />
          <Link href="/settings" title={user.username} aria-label={`${user.username} · ${t("nav.settings")}`}>
            <PlayerAvatar name={user.username} frame={user.avatar_frame} />
          </Link>
        </div>
      </div>
    </header>
  );
}

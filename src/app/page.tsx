"use client";

import Link from "next/link";
import { ArrowRight } from "lucide-react";

import { Button } from "@/components/ui/button";
import { CATEGORY_STYLES } from "@/lib/categories";
import { useI18n } from "@/lib/i18n/provider";
import type { Category } from "@/lib/types";
import { cn } from "@/lib/utils";

const TEASERS = [
  { category: "Macroéconomie", key: "landing.teaser1", yes: 61 },
  { category: "Absurde", key: "landing.teaser2", yes: 24 },
  { category: "Pop culture", key: "landing.teaser3", yes: 47 },
] as const;

export default function LandingPage() {
  const { t } = useI18n();

  return (
    <main className="relative mx-auto flex w-full max-w-md flex-1 flex-col gap-8 overflow-hidden px-4 py-10">
      <div className="pointer-events-none absolute -top-32 left-1/2 size-96 -translate-x-1/2 rounded-full bg-primary/25 blur-3xl" />

      <div className="relative flex flex-col items-center gap-4 text-center">
        <span className="grid size-16 place-items-center rounded-2xl bg-primary text-4xl shadow-xl" aria-hidden>
          🔮
        </span>
        <h1 className="text-4xl font-black tracking-tight text-balance">
          {t("landing.title.before")} <span className="text-primary">{t("landing.title.highlight")}</span>
          {t("landing.title.after")}
        </h1>
        <p className="text-muted-foreground text-balance">{t("landing.subtitle")}</p>
      </div>

      <ul className="relative flex flex-col gap-2">
        {TEASERS.map((teaser, i) => (
          <li
            key={teaser.key}
            className="flex items-center gap-3 rounded-2xl border bg-card/90 p-3 shadow-sm backdrop-blur"
            style={{ transform: `rotate(${(i - 1) * 1.2}deg)` }}
          >
            <TeaserIcon category={teaser.category} />
            <span className="flex-1 text-sm font-semibold">{t(teaser.key)}</span>
            <span className="rounded-lg bg-yes-soft px-2 py-1 text-xs font-black text-yes">
              {t("landing.yes", { n: teaser.yes })}
            </span>
          </li>
        ))}
      </ul>

      <div className="relative mt-auto flex flex-col gap-2">
        <Button asChild size="lg" className="h-14 text-base">
          <Link href="/login">
            {t("landing.cta")} <ArrowRight className="size-5" />
          </Link>
        </Button>
        <Button asChild variant="ghost">
          <Link href="/login">{t("landing.signin")}</Link>
        </Button>
        <p className="text-center text-[11px] text-muted-foreground">{t("landing.disclaimer")}</p>
      </div>
    </main>
  );
}

function TeaserIcon({ category }: { category: Category }) {
  const { icon: Icon, className } = CATEGORY_STYLES[category];
  return (
    <span className={cn("grid size-9 shrink-0 place-items-center rounded-lg", className)} aria-hidden>
      <Icon className="size-5" />
    </span>
  );
}

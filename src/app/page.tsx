"use client";

import Link from "next/link";
import { ArrowRight } from "lucide-react";

import { Logo } from "@/components/brand/logo";
import { ChanceGauge } from "@/components/questions/chance-gauge";
import { Button } from "@/components/ui/button";
import { CATEGORY_STYLES } from "@/lib/categories";
import { useI18n } from "@/lib/i18n/provider";
import type { Category } from "@/lib/types";

const TEASERS = [
  { category: "Macroéconomie", key: "landing.teaser1", yes: 61 },
  { category: "Absurde", key: "landing.teaser2", yes: 24 },
  { category: "Pop culture", key: "landing.teaser3", yes: 47 },
] as const;

export default function LandingPage() {
  const { t, categoryLabel } = useI18n();

  return (
    <main className="mx-auto flex w-full max-w-md flex-1 flex-col gap-6 px-4 py-6">
      {/* Manchette du « journal » */}
      <header className="flex flex-col gap-1.5 border-b-4 border-foreground pb-3">
        <Logo className="text-[28px]" markClassName="size-9" />
        <p className="kicker text-muted-foreground">{t("landing.tagline")}</p>
      </header>

      <div className="flex flex-col gap-3">
        <h1 className="text-[52px] leading-[0.92] text-balance">
          {t("landing.title.before")} <span className="text-red">{t("landing.title.highlight")}</span>
          {t("landing.title.after")}
        </h1>
        <p className="border-l-4 border-foreground pl-3 text-balance">{t("landing.subtitle")}</p>
      </div>

      <ul className="flex flex-col border-t-2 border-foreground" aria-label={t("landing.preview")}>
        {TEASERS.map((teaser) => (
          <li key={teaser.key} className="border-b border-foreground/30">
            <TeaserCard category={teaser.category} title={t(teaser.key)} yes={teaser.yes} chance={t("question.chance")} label={categoryLabel(teaser.category)} />
          </li>
        ))}
      </ul>

      <div className="mt-auto flex flex-col gap-2">
        <Button asChild size="lg" className="h-13 text-base">
          <Link href="/login">
            {t("landing.cta")} <ArrowRight className="size-5" />
          </Link>
        </Button>
        <Button asChild variant="outline">
          <Link href="/login">{t("landing.signin")}</Link>
        </Button>
        <p className="text-center font-mono text-[11px] text-muted-foreground">
          {t("landing.disclaimer")}{" "}
          <Link href="/legal" className="underline underline-offset-2">
            {t("settings.legal")}
          </Link>
        </p>
      </div>
    </main>
  );
}

function TeaserCard({
  category,
  title,
  yes,
  chance,
  label,
}: {
  category: Category;
  title: string;
  yes: number;
  chance: string;
  label: string;
}) {
  const { icon: Icon } = CATEGORY_STYLES[category];
  return (
    <div className="flex items-center gap-3 py-3">
      <div className="flex min-w-0 flex-1 flex-col gap-1">
        <span className="kicker flex items-center gap-1.5 text-muted-foreground">
          <Icon aria-hidden className="size-3.5" /> {label}
        </span>
        <span className="font-display text-xl leading-[1.1] uppercase">{title}</span>
      </div>
      <ChanceGauge pct={yes} label={chance} />
    </div>
  );
}

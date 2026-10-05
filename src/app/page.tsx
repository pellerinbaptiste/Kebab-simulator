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
    <main className="mx-auto flex w-full max-w-md flex-1 flex-col gap-8 px-4 py-8">
      <Logo className="text-lg" />

      <div className="flex flex-col gap-3">
        <h1 className="text-4xl leading-[1.05] font-extrabold tracking-tight text-balance">
          {t("landing.title.before")} <span className="text-primary">{t("landing.title.highlight")}</span>
          {t("landing.title.after")}
        </h1>
        <p className="text-muted-foreground text-balance">{t("landing.subtitle")}</p>
      </div>

      {/* Aperçu des marchés, comme dans l'app */}
      <ul className="flex flex-col gap-2" aria-label={t("landing.preview")}>
        {TEASERS.map((teaser) => (
          <li key={teaser.key}>
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
        <Button asChild variant="ghost">
          <Link href="/login">{t("landing.signin")}</Link>
        </Button>
        <p className="text-center text-[11px] text-muted-foreground">
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
    <div className="flex items-center gap-3 rounded-xl border bg-card p-3">
      <span className="grid size-10 shrink-0 place-items-center rounded-md bg-muted text-muted-foreground" aria-hidden>
        <Icon className="size-5" />
      </span>
      <div className="flex min-w-0 flex-1 flex-col gap-0.5">
        <span className="text-sm leading-snug font-semibold">{title}</span>
        <span className="text-xs text-muted-foreground">{label}</span>
      </div>
      <ChanceGauge pct={yes} label={chance} />
    </div>
  );
}

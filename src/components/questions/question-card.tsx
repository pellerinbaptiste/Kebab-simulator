"use client";

import { Check, Coins, ExternalLink, Users } from "lucide-react";

import { ChanceGauge } from "@/components/questions/chance-gauge";

import { TimeLeft } from "@/components/questions/time-left";
import { CATEGORY_STYLES } from "@/lib/categories";
import { useI18n } from "@/lib/i18n/provider";
import { localizeQuestion, optionLabel } from "@/lib/i18n/question";
import { estimatePayout, impliedProbability, totalPool } from "@/lib/odds";
import { isBinary, optionTone } from "@/lib/option-tones";
import type { Prediction, Question } from "@/lib/types";
import { cn, formatCredits } from "@/lib/utils";

interface QuestionCardProps {
  question: Question;
  myPrediction?: Prediction;
  onBet: (question: Question, option: string) => void;
}

export function QuestionCard({ question, myPrediction, onBet }: QuestionCardProps) {
  const { t, lang, categoryLabel } = useI18n();
  const cat = CATEGORY_STYLES[question.category];
  const binary = isBinary(question);
  const pool = totalPool(question);
  const { title } = localizeQuestion(question, lang);
  const label = (opt: string) => optionLabel(question, opt, lang);
  const pct = (opt: string) => Math.round(impliedProbability(question, opt) * 100);

  return (
    <article className="flex flex-col rounded-2xl border bg-card transition-colors hover:border-foreground/30">
      {/* Bandeau de match : compétition (catégorie) et coup de sifflet final */}
      <header className="flex items-center justify-between gap-2 px-4 pt-3">
        <span className="kicker flex items-center gap-1.5 text-muted-foreground">
          <cat.icon aria-hidden className="size-3.5" /> {categoryLabel(question.category)}
        </span>
        <TimeLeft deadline={question.deadline} />
      </header>

      <div className="flex flex-col gap-3 px-4 pt-2 pb-3">
        <div className="flex items-start gap-3">
          {question.image && (
            // eslint-disable-next-line @next/next/no-img-element -- images distantes, site statique
            <img
              src={question.image}
              alt=""
              loading="lazy"
              className="size-12 shrink-0 rounded-lg bg-muted object-cover"
            />
          )}
          <h3 className="line-clamp-4 flex-1 font-display text-[22px] leading-[1.05] tracking-[0.02em] text-balance uppercase">
            {title}
          </h3>
          {binary && <ChanceGauge pct={pct("Oui")} label={t("question.chance")} />}
        </div>

        {!binary && (
          <div className="flex flex-col">
            {question.options.map((opt) => {
              const p = pct(opt);
              // Sans pari en cours, chaque ligne sert de bouton
              const Row = myPrediction ? "div" : "button";
              return (
                <Row
                  key={opt}
                  {...(!myPrediction && {
                    type: "button" as const,
                    onClick: () => onBet(question, opt),
                  })}
                  className={cn(
                    "flex items-center gap-3 border-t py-2 text-left first:border-t-0",
                    !myPrediction && "group/row -mx-2 rounded-lg px-2 transition-colors hover:bg-muted",
                  )}
                >
                  <span className="min-w-0 flex-1 truncate text-sm font-medium">{label(opt)}</span>
                  <span className="w-12 text-right font-mono text-base font-bold text-primary tabular-nums">{p}%</span>
                  {!myPrediction && (
                    <span className="rounded-lg border-2 border-primary px-2.5 py-1 text-[11px] font-bold tracking-wider text-primary uppercase group-hover/row:bg-primary group-hover/row:text-primary-foreground">
                      {t("question.pick")}
                    </span>
                  )}
                </Row>
              );
            })}
          </div>
        )}

        {myPrediction ? (
          <MyBetBanner question={question} prediction={myPrediction} label={label} />
        ) : (
          binary && (
            <div className="grid grid-cols-2 gap-2">
              {question.options.map((opt) => (
                <button
                  key={opt}
                  onClick={() => onBet(question, opt)}
                  className={cn(
                    "flex flex-col items-center gap-0.5 rounded-xl border-2 bg-background py-2 font-semibold transition-colors active:scale-[0.98]",
                    opt === "Oui" ? "hover:border-yes" : "hover:border-red",
                  )}
                >
                  <span className="text-sm">{label(opt)}</span>
                  <span
                    className={cn("font-mono text-xl leading-none font-bold tabular-nums", opt === "Oui" ? "text-yes" : "text-red")}
                  >
                    {pct(opt)}%
                  </span>
                </button>
              ))}
            </div>
          )
        )}

        <div className="flex flex-wrap items-center gap-x-3 gap-y-1 pt-1 text-xs text-muted-foreground">
          <span className="flex items-center gap-1 font-semibold tabular-nums">
            <Coins aria-hidden className="size-3.5" /> {t("question.inPlay", { n: formatCredits(pool) })}
          </span>
          <span className="flex items-center gap-1">
            <Users aria-hidden className="size-3.5" /> {question.bettors}
          </span>
          {question.source && (
            <a
              href={question.source.url}
              target="_blank"
              rel="noopener noreferrer"
              className="ml-auto flex items-center gap-1 font-medium hover:text-foreground"
            >
              {question.source.name} <ExternalLink aria-hidden className="size-3" />
            </a>
          )}
        </div>
      </div>
    </article>
  );
}

function MyBetBanner({
  question,
  prediction,
  label,
}: {
  question: Question;
  prediction: Prediction;
  label: (opt: string) => string;
}) {
  const { t } = useI18n();
  const tone = optionTone(question, prediction.chosen_answer);
  // Le pari est déjà dans la cagnotte : on estime sans le recompter.
  const pools = { ...question.pools };
  pools[prediction.chosen_answer] = (pools[prediction.chosen_answer] ?? 0) - prediction.wagered_amount;
  const potential = estimatePayout({ pools }, prediction.chosen_answer, prediction.wagered_amount);

  return (
    <div className={cn("flex items-center justify-between gap-2 rounded-xl px-3 py-2.5", tone.soft)}>
      <div className="flex items-center gap-2 text-sm text-foreground">
        <span className={cn("grid size-6 place-items-center rounded-full", tone.solid)}>
          <Check aria-hidden className="size-3.5" />
        </span>
        <span>
          <b className="font-mono tabular-nums">{formatCredits(prediction.wagered_amount)}</b> {t("question.on")}{" "}
          <b className={tone.text}>{label(prediction.chosen_answer)}</b>
        </span>
      </div>
      <span className="font-mono text-xs font-semibold text-muted-foreground">
        → <b className="text-primary tabular-nums">{formatCredits(potential)}</b>
      </span>
    </div>
  );
}

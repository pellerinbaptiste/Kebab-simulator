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
    <article className="flex flex-col border-2 border-foreground bg-card">
      {/* Bandeau de rubrique, comme en tête d'article */}
      <header className="flex items-center justify-between gap-2 border-b-2 border-foreground px-3 py-1.5">
        <span className="kicker flex items-center gap-1.5">
          <cat.icon aria-hidden className="size-3.5" /> {categoryLabel(question.category)}
        </span>
        <TimeLeft deadline={question.deadline} />
      </header>

      <div className="flex flex-col gap-3 p-3">
        <div className="flex items-start gap-3">
          {question.image && (
            // eslint-disable-next-line @next/next/no-img-element -- images distantes, site statique
            <img
              src={question.image}
              alt=""
              loading="lazy"
              className="size-12 shrink-0 border border-foreground bg-muted object-cover contrast-125 grayscale"
            />
          )}
          <h3 className="line-clamp-4 flex-1 font-display text-[19px] leading-[1.12] tracking-[0.01em] text-balance uppercase">
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
                    "flex items-center gap-3 border-t border-border py-2 text-left first:border-t-0",
                    !myPrediction && "group/row transition-colors hover:bg-muted",
                  )}
                >
                  <span className="min-w-0 flex-1 truncate text-sm font-medium">{label(opt)}</span>
                  <span className="w-12 text-right font-mono text-sm font-semibold tabular-nums">{p} %</span>
                  {!myPrediction && (
                    <span className="border-2 border-foreground px-2 py-0.5 text-[11px] font-bold tracking-wider uppercase group-hover/row:bg-foreground group-hover/row:text-background">
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
                    "flex items-center justify-between border-2 px-3 py-2 text-sm font-bold tracking-wide uppercase transition-colors active:translate-y-px",
                    opt === "Oui"
                      ? "border-yes text-yes hover:bg-yes hover:text-white"
                      : "border-red text-red hover:bg-red hover:text-white",
                  )}
                >
                  {label(opt)} <span className="font-mono font-semibold tabular-nums">{pct(opt)} %</span>
                </button>
              ))}
            </div>
          )
        )}

        <div className="flex flex-wrap items-center gap-x-3 gap-y-1 border-t border-dashed border-border pt-2 font-mono text-[11px] text-muted-foreground">
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
    <div
      className={cn(
        "flex items-center justify-between gap-2 border-l-4 border-current px-3 py-2",
        tone.soft,
        tone.text,
      )}
    >
      <div className="flex items-center gap-2 text-sm text-foreground">
        <span className={cn("grid size-5 place-items-center", tone.solid)}>
          <Check aria-hidden className="size-3.5" />
        </span>
        <span>
          <b className="font-mono tabular-nums">{formatCredits(prediction.wagered_amount)}</b> {t("question.on")}{" "}
          <b className={tone.text}>{label(prediction.chosen_answer)}</b>
        </span>
      </div>
      <span className="font-mono text-xs font-semibold text-muted-foreground">
        → <b className="text-yes tabular-nums">{formatCredits(potential)}</b>
      </span>
    </div>
  );
}

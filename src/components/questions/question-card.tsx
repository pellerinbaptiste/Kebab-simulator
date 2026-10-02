"use client";

import { Check, ExternalLink, Users } from "lucide-react";

import { TimeLeft } from "@/components/questions/time-left";
import { CATEGORY_STYLES } from "@/lib/categories";
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
  const cat = CATEGORY_STYLES[question.category];
  const binary = isBinary(question);
  const pool = totalPool(question);

  return (
    <article className="group flex flex-col gap-3 rounded-2xl border bg-card p-4 shadow-sm transition-shadow hover:shadow-md">
      <div className="flex items-center justify-between gap-2">
        <span className={cn("rounded-full px-2 py-0.5 text-xs font-semibold", cat.className)}>
          {cat.emoji} {question.category}
        </span>
        <TimeLeft deadline={question.deadline} />
      </div>

      <div className="flex items-start gap-3">
        {question.image && (
          // eslint-disable-next-line @next/next/no-img-element -- images distantes, site statique
          <img src={question.image} alt="" loading="lazy" className="size-11 shrink-0 rounded-lg bg-muted object-cover" />
        )}
        <h3 className="text-[15px] leading-snug font-bold text-balance">{question.title}</h3>
      </div>

      {/* Répartition des mises */}
      {binary ? (
        <BinaryBar question={question} />
      ) : (
        <div className="flex flex-col gap-1.5">
          {question.options.map((opt) => {
            const pct = Math.round(impliedProbability(question, opt) * 100);
            const tone = optionTone(question, opt);
            // Sans pari en cours, chaque barre sert de bouton (libellés longs lisibles en entier)
            const Row = myPrediction ? "div" : "button";
            return (
              <Row
                key={opt}
                {...(!myPrediction && { type: "button" as const, onClick: () => onBet(question, opt) })}
                className={cn(
                  "relative h-9 w-full overflow-hidden rounded-lg bg-muted text-left",
                  !myPrediction && "transition-all hover:ring-2 hover:ring-ring/40 active:scale-[0.99]",
                )}
              >
                <div
                  className={cn("absolute inset-y-0 left-0 opacity-25 transition-[width] duration-500", tone.solid)}
                  style={{ width: `${pct}%` }}
                />
                <div className="relative flex h-full items-center justify-between gap-2 px-3 text-sm font-semibold">
                  <span className="truncate">{opt}</span>
                  <span className={cn("tabular-nums", tone.text)}>{pct}%</span>
                </div>
              </Row>
            );
          })}
        </div>
      )}

      {myPrediction ? (
        <MyBetBanner question={question} prediction={myPrediction} />
      ) : binary || question.options.length === 2 ? (
        <div className="grid grid-cols-2 gap-2">
          {question.options.map((opt) => {
            const tone = optionTone(question, opt);
            return (
              <button
                key={opt}
                onClick={() => onBet(question, opt)}
                className={cn(
                  "truncate rounded-xl px-3 py-2.5 text-sm font-bold transition-all hover:brightness-95 active:scale-[0.97]",
                  tone.soft,
                  tone.text,
                )}
              >
                {opt}
              </button>
            );
          })}
        </div>
      ) : (
        <p className="-mt-1 text-xs text-muted-foreground">Touche une réponse pour parier.</p>
      )}

      <div className="flex items-center gap-3 text-xs text-muted-foreground">
        <span className="font-semibold tabular-nums">🪙 {formatCredits(pool)} en jeu</span>
        <span className="flex items-center gap-1">
          <Users className="size-3.5" /> {question.bettors} parieurs
        </span>
        {question.source && (
          <a
            href={question.source.url}
            target="_blank"
            rel="noopener noreferrer"
            className="ml-auto flex items-center gap-1 font-medium hover:text-foreground"
          >
            {question.source.name} <ExternalLink className="size-3" />
          </a>
        )}
      </div>
    </article>
  );
}

function BinaryBar({ question }: { question: Question }) {
  const yes = Math.round(impliedProbability(question, "Oui") * 100);
  return (
    <div className="flex flex-col gap-1.5">
      <div className="flex justify-between text-sm font-black tabular-nums">
        <span className="text-yes">Oui {yes}%</span>
        <span className="text-no">{100 - yes}% Non</span>
      </div>
      <div className="flex h-2.5 gap-0.5 overflow-hidden rounded-full">
        <div className="rounded-l-full bg-yes transition-[width] duration-500" style={{ width: `${yes}%` }} />
        <div className="flex-1 rounded-r-full bg-no" />
      </div>
    </div>
  );
}

function MyBetBanner({ question, prediction }: { question: Question; prediction: Prediction }) {
  const tone = optionTone(question, prediction.chosen_answer);
  // Le pari est déjà dans la cagnotte : on estime sans le recompter.
  const pools = { ...question.pools };
  pools[prediction.chosen_answer] = (pools[prediction.chosen_answer] ?? 0) - prediction.wagered_amount;
  const potential = estimatePayout({ pools }, prediction.chosen_answer, prediction.wagered_amount);

  return (
    <div className={cn("flex items-center justify-between gap-2 rounded-xl px-3 py-2.5", tone.soft)}>
      <div className="flex items-center gap-2 text-sm">
        <span className={cn("grid size-6 place-items-center rounded-full", tone.solid)}>
          <Check className="size-3.5" />
        </span>
        <span>
          <b className="tabular-nums">{formatCredits(prediction.wagered_amount)}</b> sur{" "}
          <b className={tone.text}>{prediction.chosen_answer}</b>
        </span>
      </div>
      <span className="text-xs font-semibold text-muted-foreground">
        → <b className="text-yes tabular-nums">{formatCredits(potential)}</b>
      </span>
    </div>
  );
}

"use client";

import { Ticket } from "lucide-react";

import { useI18n } from "@/lib/i18n/provider";
import { localizeQuestion, optionLabel } from "@/lib/i18n/question";
import { estimatePayout } from "@/lib/odds";
import { optionTone } from "@/lib/option-tones";
import type { Prediction, Question } from "@/lib/types";
import { cn, formatCredits } from "@/lib/utils";

interface MyBetsProps {
  predictions: Prediction[];
  questions: Question[];
}

export function MyBets({ predictions, questions }: MyBetsProps) {
  const { t, lang } = useI18n();

  if (predictions.length === 0) {
    return (
      <div className="flex flex-col items-center gap-2 border border-dashed p-8 text-center">
        <Ticket aria-hidden className="size-8 text-muted-foreground" />
        <p className="font-semibold">{t("myBets.emptyTitle")}</p>
        <p className="text-sm text-muted-foreground">{t("myBets.emptyBody")}</p>
      </div>
    );
  }

  return (
    <ul className="flex flex-col gap-2">
      {predictions.map((p) => {
        const q = questions.find((x) => x.id === p.question_id);
        if (!q) return null;
        const tone = optionTone(q, p.chosen_answer);
        const resolved = q.status === "resolved";
        const cancelled = q.status === "cancelled";
        const won = resolved && q.correct_answer === p.chosen_answer;
        const pools = { ...q.pools, [p.chosen_answer]: (q.pools[p.chosen_answer] ?? 0) - p.wagered_amount };
        const potential = estimatePayout({ pools }, p.chosen_answer, p.wagered_amount);

        return (
          <li key={p.id} className="flex items-center gap-3 rounded-2xl border bg-card p-3">
            <div className={cn("w-1 self-stretch rounded-full", tone.solid)} />
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-semibold">{localizeQuestion(q, lang).title}</p>
              <p className="text-xs text-muted-foreground">
                {formatCredits(p.wagered_amount)} {t("question.on")}{" "}
                <b className={tone.text}>{optionLabel(q, p.chosen_answer, lang)}</b>
              </p>
            </div>
            <div className="text-right text-xs">
              {cancelled && (
                <span className="rounded-full bg-muted px-2 py-0.5 font-semibold">{t("myBets.cancelled")}</span>
              )}
              {!resolved && !cancelled && (
                <>
                  <span className="border border-border px-1.5 py-0.5 font-mono font-medium uppercase">
                    {t("myBets.pending")}
                  </span>
                  <p className="mt-1 text-muted-foreground tabular-nums">→ {formatCredits(potential)}</p>
                </>
              )}
              {resolved && won && (
                <>
                  <span className="rounded-full bg-yes-soft px-2 py-0.5 font-semibold text-yes">{t("myBets.won")}</span>
                  <p className="mt-1 font-bold text-yes tabular-nums">+{formatCredits((p.payout ?? 0) - p.wagered_amount)}</p>
                </>
              )}
              {resolved && !won && (
                <>
                  <span className="rounded-full bg-no-soft px-2 py-0.5 font-semibold text-no">{t("myBets.lost")}</span>
                  <p className="mt-1 font-bold text-no tabular-nums">−{formatCredits(p.wagered_amount)}</p>
                </>
              )}
            </div>
          </li>
        );
      })}
    </ul>
  );
}

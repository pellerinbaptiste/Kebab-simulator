"use client";

import { Ticket } from "lucide-react";

import { estimatePayout } from "@/lib/odds";
import { optionTone } from "@/lib/option-tones";
import type { Prediction, Question } from "@/lib/types";
import { cn, formatCredits } from "@/lib/utils";

interface MyBetsProps {
  predictions: Prediction[];
  questions: Question[];
}

export function MyBets({ predictions, questions }: MyBetsProps) {
  if (predictions.length === 0) {
    return (
      <div className="flex flex-col items-center gap-2 rounded-2xl border border-dashed p-8 text-center">
        <Ticket className="size-8 text-muted-foreground" />
        <p className="font-semibold">Aucun pari pour l&apos;instant</p>
        <p className="text-sm text-muted-foreground">Choisis une question dans le feed et tente ta chance.</p>
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
        const won = resolved && q.correct_answer === p.chosen_answer;
        const pools = { ...q.pools, [p.chosen_answer]: (q.pools[p.chosen_answer] ?? 0) - p.wagered_amount };
        const potential = estimatePayout({ pools }, p.chosen_answer, p.wagered_amount);

        return (
          <li key={p.id} className="flex items-center gap-3 rounded-xl border bg-card p-3">
            <div className={cn("w-1 self-stretch rounded-full", tone.solid)} />
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-semibold">{q.title}</p>
              <p className="text-xs text-muted-foreground">
                {formatCredits(p.wagered_amount)} sur <b className={tone.text}>{p.chosen_answer}</b>
              </p>
            </div>
            <div className="text-right text-xs">
              {!resolved && (
                <>
                  <span className="rounded-full bg-accent px-2 py-0.5 font-semibold text-accent-foreground">En cours</span>
                  <p className="mt-1 text-muted-foreground tabular-nums">→ {formatCredits(potential)}</p>
                </>
              )}
              {resolved && won && (
                <>
                  <span className="rounded-full bg-yes-soft px-2 py-0.5 font-semibold text-yes">Gagné 🎉</span>
                  <p className="mt-1 font-bold text-yes tabular-nums">+{formatCredits((p.payout ?? 0) - p.wagered_amount)}</p>
                </>
              )}
              {resolved && !won && (
                <>
                  <span className="rounded-full bg-no-soft px-2 py-0.5 font-semibold text-no">Perdu</span>
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

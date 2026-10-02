"use client";

import * as React from "react";

import { BetDialog } from "@/components/questions/bet-dialog";
import { MyBets } from "@/components/questions/my-bets";
import { QuestionCard } from "@/components/questions/question-card";
import { CATEGORY_STYLES } from "@/lib/categories";
import { useStore } from "@/lib/store";
import { CATEGORIES, type Category, type Question } from "@/lib/types";
import { cn, formatCredits } from "@/lib/utils";

type Tab = "feed" | "bets";

export function DashboardView() {
  const { user, questions, predictions, newsSource } = useStore();
  const [tab, setTab] = React.useState<Tab>("feed");
  const [category, setCategory] = React.useState<Category | "all">("all");
  const [bet, setBet] = React.useState<{ question: Question; option: string } | null>(null);
  const [dialogOpen, setDialogOpen] = React.useState(false);

  const myPredictions = predictions.filter((p) => p.user_id === user.id);
  const byQuestion = new Map(myPredictions.map((p) => [p.question_id, p]));
  const openQuestions = questions
    .filter((q) => q.status === "open")
    .sort((a, b) => a.deadline.localeCompare(b.deadline));
  const visible = category === "all" ? openQuestions : openQuestions.filter((q) => q.category === category);

  const activeBets = myPredictions.filter(
    (p) => questions.find((q) => q.id === p.question_id)?.status === "open",
  );
  const atStake = activeBets.reduce((sum, p) => sum + p.wagered_amount, 0);

  function openBet(question: Question, option: string) {
    setBet({ question, option });
    setDialogOpen(true);
  }

  // Garde la question à jour dans la modale (cotes qui bougent après le pari)
  const liveQuestion = bet ? questions.find((q) => q.id === bet.question.id) ?? bet.question : null;

  return (
    <div className="flex flex-col gap-5">
      <section>
        <p className="text-sm text-muted-foreground">Salut {user.username} 👋</p>
        <h1 className="text-2xl font-black tracking-tight">Qu&apos;est-ce que tu sens aujourd&apos;hui ?</h1>
      </section>

      <NewsBanner source={newsSource} />

      {/* Stats rapides */}
      <section className="grid grid-cols-3 gap-2">
        <Stat label="Solde" value={formatCredits(user.total_credits)} accent />
        <Stat label="En jeu" value={formatCredits(atStake)} />
        <Stat label="Paris actifs" value={String(activeBets.length)} />
      </section>

      {/* Onglets */}
      <div className="grid grid-cols-2 rounded-xl bg-muted p-1" role="tablist">
        {(
          [
            ["feed", `Marchés ouverts (${openQuestions.length})`],
            ["bets", `Mes paris (${myPredictions.length})`],
          ] as const
        ).map(([key, label]) => (
          <button
            key={key}
            role="tab"
            aria-selected={tab === key}
            onClick={() => setTab(key)}
            className={cn(
              "rounded-lg py-2 text-sm font-semibold transition-all",
              tab === key ? "bg-card shadow-sm" : "text-muted-foreground",
            )}
          >
            {label}
          </button>
        ))}
      </div>

      {tab === "feed" ? (
        <>
          {/* Filtres catégories, scroll horizontal sur mobile */}
          <div className="-mx-4 flex gap-2 overflow-x-auto px-4 pb-1 [scrollbar-width:none]">
            <Chip active={category === "all"} onClick={() => setCategory("all")}>
              🔥 Tout
            </Chip>
            {CATEGORIES.map((c) => (
              <Chip key={c} active={category === c} onClick={() => setCategory(c)}>
                {CATEGORY_STYLES[c].emoji} {c}
              </Chip>
            ))}
          </div>

          <div className="flex flex-col gap-3">
            {visible.map((q) => (
              <QuestionCard key={q.id} question={q} myPrediction={byQuestion.get(q.id)} onBet={openBet} />
            ))}
            {visible.length === 0 && (
              <p className="rounded-2xl border border-dashed p-8 text-center text-sm text-muted-foreground">
                Aucune question ouverte dans cette catégorie.
              </p>
            )}
          </div>
        </>
      ) : (
        <MyBets predictions={myPredictions} questions={questions} />
      )}

      <BetDialog
        question={liveQuestion}
        initialOption={bet?.option}
        open={dialogOpen}
        onOpenChange={setDialogOpen}
      />
    </div>
  );
}

function NewsBanner({ source }: { source: "live" | "fallback" }) {
  if (source === "live") {
    return (
      <p className="flex items-center gap-2 rounded-xl bg-yes-soft px-3 py-2 text-xs font-medium text-yes">
        <span className="relative flex size-2">
          <span className="absolute inline-flex size-full animate-ping rounded-full bg-yes opacity-75" />
          <span className="relative inline-flex size-2 rounded-full bg-yes" />
        </span>
        Actu en direct : questions et cotes réelles de Polymarket (en anglais).
      </p>
    );
  }
  return (
    <p className="rounded-xl bg-amber-500/10 px-3 py-2 text-xs font-medium text-amber-700 dark:text-amber-300">
      Polymarket est injoignable pour le moment : questions d&apos;exemple affichées.
    </p>
  );
}

function Stat({ label, value, accent }: { label: string; value: string; accent?: boolean }) {
  return (
    <div
      className={cn(
        "rounded-xl border p-3",
        accent ? "border-transparent bg-primary text-primary-foreground" : "bg-card",
      )}
    >
      <div className={cn("text-[11px] font-medium", accent ? "opacity-80" : "text-muted-foreground")}>{label}</div>
      <div className="text-lg font-black tabular-nums">{value}</div>
    </div>
  );
}

function Chip({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      onClick={onClick}
      className={cn(
        "shrink-0 rounded-full border px-3 py-1.5 text-sm font-semibold transition-colors",
        active ? "border-foreground bg-foreground text-background" : "bg-card hover:bg-muted",
      )}
    >
      {children}
    </button>
  );
}

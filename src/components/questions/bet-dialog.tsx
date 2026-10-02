"use client";

import * as React from "react";
import { ArrowRight, Coins, PartyPopper, TrendingUp } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { CATEGORY_STYLES } from "@/lib/categories";
import { estimateMultiplier, estimatePayout, impliedProbability } from "@/lib/odds";
import { optionTone } from "@/lib/option-tones";
import { useStore } from "@/lib/store";
import type { Question } from "@/lib/types";
import { cn, formatCredits } from "@/lib/utils";

interface BetDialogProps {
  question: Question | null;
  initialOption?: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const QUICK_AMOUNTS = [10, 50, 100, 250];

export function BetDialog({ question, initialOption, open, onOpenChange }: BetDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        {question && (
          // `key` remet le formulaire à zéro à chaque nouvelle question/option
          <BetForm
            key={`${question.id}:${initialOption}`}
            question={question}
            initialOption={initialOption ?? question.options[0]}
            onDone={() => onOpenChange(false)}
          />
        )}
      </DialogContent>
    </Dialog>
  );
}

function BetForm({
  question,
  initialOption,
  onDone,
}: {
  question: Question;
  initialOption: string;
  onDone: () => void;
}) {
  const { user, placeBet } = useStore();
  const [option, setOption] = React.useState(initialOption);
  const [amount, setAmount] = React.useState(() => Math.min(100, user.total_credits));
  const [error, setError] = React.useState<string | null>(null);
  const [placed, setPlaced] = React.useState<{ amount: number; option: string; payout: number } | null>(null);

  const balance = user.total_credits;
  const tone = optionTone(question, option);
  const payout = estimatePayout(question, option, amount);
  const multiplier = estimateMultiplier(question, option, amount);
  const invalid = amount <= 0 || amount > balance;
  const cat = CATEGORY_STYLES[question.category];

  function submit(e: React.FormEvent) {
    e.preventDefault();
    const res = placeBet(question.id, option, amount);
    if (!res.ok) return setError(res.error);
    setPlaced({ amount, option, payout });
  }

  if (placed) {
    return (
      <div className="flex flex-col items-center gap-3 py-6 text-center animate-in fade-in zoom-in-95">
        <div className="grid size-16 place-items-center rounded-full bg-yes-soft text-yes">
          <PartyPopper className="size-8" />
        </div>
        <DialogTitle className="text-xl">Pari enregistré !</DialogTitle>
        <DialogDescription>
          {formatCredits(placed.amount)} crédits sur <b className="text-foreground">« {placed.option} »</b>.
          <br />
          Si tu as raison, tu récupères <b className="text-yes">{formatCredits(placed.payout)} crédits</b>
        </DialogDescription>
        <Button size="lg" className="mt-2 w-full" onClick={onDone}>
          Continuer à parier
        </Button>
      </div>
    );
  }

  return (
    <form onSubmit={submit} className="flex flex-col gap-5">
      <DialogHeader>
        <span className={cn("w-fit rounded-full px-2 py-0.5 text-xs font-semibold", cat.className)}>
          {cat.emoji} {question.category}
        </span>
        <DialogTitle>{question.title}</DialogTitle>
        {question.description && (
          <DialogDescription className="line-clamp-3">{question.description}</DialogDescription>
        )}
        {question.source && (
          <a
            href={question.source.url}
            target="_blank"
            rel="noopener noreferrer"
            className="w-fit text-xs font-semibold text-primary hover:underline"
          >
            Règles complètes et cotes réelles sur {question.source.name} ↗
          </a>
        )}
      </DialogHeader>

      {/* Choix de la réponse */}
      <fieldset className="flex flex-col gap-2">
        <legend className="mb-2 text-xs font-semibold tracking-wide text-muted-foreground uppercase">
          Ta réponse
        </legend>
        <div className={cn("grid gap-2", question.options.length === 2 ? "grid-cols-2" : "grid-cols-1")}>
          {question.options.map((opt) => {
            const t = optionTone(question, opt);
            const selected = opt === option;
            const pct = Math.round(impliedProbability(question, opt) * 100);
            return (
              <button
                key={opt}
                type="button"
                onClick={() => setOption(opt)}
                aria-pressed={selected}
                className={cn(
                  "flex items-center justify-between gap-2 rounded-xl px-4 py-3 text-left font-bold transition-all active:scale-[0.98]",
                  selected ? cn(t.solid, "shadow-md ring-2 ring-offset-2 ring-offset-background", t.ring) : cn(t.soft, t.text),
                )}
              >
                <span>{opt}</span>
                <span className={cn("text-sm tabular-nums", selected ? "opacity-90" : "opacity-70")}>{pct}%</span>
              </button>
            );
          })}
        </div>
      </fieldset>

      {/* Mise */}
      <div className="flex flex-col gap-3">
        <div className="flex items-baseline justify-between">
          <label htmlFor="amount" className="text-xs font-semibold tracking-wide text-muted-foreground uppercase">
            Ta mise
          </label>
          <span className="text-xs text-muted-foreground">
            Solde : <b className="tabular-nums text-foreground">{formatCredits(balance)}</b>
          </span>
        </div>

        <div className="flex items-center gap-2 rounded-xl border bg-card px-3 focus-within:ring-[3px] focus-within:ring-ring/40">
          <Coins className="size-5 text-gold" />
          <input
            id="amount"
            inputMode="numeric"
            value={amount === 0 ? "" : amount}
            placeholder="0"
            onChange={(e) => {
              setError(null);
              const n = parseInt(e.target.value.replace(/\D/g, ""), 10);
              setAmount(Number.isNaN(n) ? 0 : n);
            }}
            className="h-14 w-full bg-transparent text-3xl font-black tabular-nums outline-none"
          />
          <span className="text-sm font-semibold text-muted-foreground">crédits</span>
        </div>

        <input
          type="range"
          min={0}
          max={balance}
          step={10}
          value={Math.min(amount, balance)}
          onChange={(e) => {
            setError(null);
            setAmount(Number(e.target.value));
          }}
          className="w-full accent-primary"
          aria-label="Ajuster la mise"
        />

        <div className="grid grid-cols-5 gap-1.5">
          {QUICK_AMOUNTS.map((v) => (
            <Button
              key={v}
              type="button"
              variant="secondary"
              size="sm"
              disabled={v > balance}
              onClick={() => {
                setError(null);
                setAmount(v);
              }}
            >
              {v}
            </Button>
          ))}
          <Button
            type="button"
            variant="secondary"
            size="sm"
            className="font-black text-primary"
            disabled={balance === 0}
            onClick={() => {
              setError(null);
              setAmount(balance);
            }}
          >
            MAX
          </Button>
        </div>
      </div>

      {/* Récap */}
      <div className="grid grid-cols-2 gap-px overflow-hidden rounded-xl border bg-border">
        <div className="bg-card p-3">
          <div className="flex items-center gap-1 text-xs text-muted-foreground">
            <TrendingUp className="size-3.5" /> Cote estimée
          </div>
          <div className={cn("text-xl font-black tabular-nums", tone.text)}>
            ×{amount > 0 ? multiplier.toFixed(2) : "—"}
          </div>
        </div>
        <div className="bg-card p-3">
          <div className="text-xs text-muted-foreground">Tu récupères</div>
          <div className="text-xl font-black tabular-nums text-yes">
            {amount > 0 ? formatCredits(payout) : "—"}
            {amount > 0 && (
              <span className="ml-1 text-xs font-semibold">(+{formatCredits(payout - amount)})</span>
            )}
          </div>
        </div>
      </div>
      <p className="-mt-3 text-[11px] leading-snug text-muted-foreground">
        Pari mutuel : la cagnotte est partagée entre les gagnants. La cote évolue avec les mises des autres joueurs.
      </p>

      {(error || amount > balance) && (
        <p className="rounded-lg bg-no-soft px-3 py-2 text-sm font-medium text-no" role="alert">
          {error ?? "Crédits insuffisants"}
        </p>
      )}

      <Button type="submit" size="lg" disabled={invalid} className={cn("h-14 text-base", tone.solid)}>
        Parier {amount > 0 ? formatCredits(amount) : ""} sur « {option} »
        <ArrowRight className="size-5" />
      </Button>
    </form>
  );
}

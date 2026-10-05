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
import type { MessageKey } from "@/lib/i18n/dictionaries";
import { useI18n } from "@/lib/i18n/provider";
import { localizeQuestion, optionLabel } from "@/lib/i18n/question";
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
  const { t, lang, categoryLabel } = useI18n();
  const [option, setOption] = React.useState(initialOption);
  const [amount, setAmount] = React.useState(() => Math.min(100, user.total_credits));
  const [error, setError] = React.useState<MessageKey | null>(null);
  const [placed, setPlaced] = React.useState<{ amount: number; option: string; payout: number } | null>(null);

  const balance = user.total_credits;
  const tone = optionTone(question, option);
  const payout = estimatePayout(question, option, amount);
  const multiplier = estimateMultiplier(question, option, amount);
  const invalid = amount <= 0 || amount > balance;
  const cat = CATEGORY_STYLES[question.category];
  const { title, description } = localizeQuestion(question, lang);
  const label = (opt: string) => optionLabel(question, opt, lang);

  const [submitting, setSubmitting] = React.useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    const res = await placeBet(question.id, option, amount);
    setSubmitting(false);
    if (!res.ok) return setError(res.error);
    setPlaced({ amount, option, payout });
  }

  if (placed) {
    return (
      <div className="flex flex-col items-center gap-3 py-6 text-center animate-in fade-in zoom-in-95">
        <div className="grid size-16 place-items-center rounded-full bg-yes-soft text-yes">
          <PartyPopper aria-hidden className="size-8" />
        </div>
        <DialogTitle className="text-xl">{t("bet.successTitle")}</DialogTitle>
        <DialogDescription>
          {t("bet.successBody", { amount: formatCredits(placed.amount), option: label(placed.option) })}
          <br />
          <b className="text-yes">{t("bet.successPayout", { payout: formatCredits(placed.payout) })}</b>
        </DialogDescription>
        <Button size="lg" className="mt-2 w-full" onClick={onDone}>
          {t("bet.continue")}
        </Button>
      </div>
    );
  }

  return (
    <form onSubmit={submit} className="flex flex-col gap-5">
      <DialogHeader>
        <span className={cn("inline-flex w-fit items-center gap-1 rounded-full px-2 py-0.5 text-xs font-semibold", cat.className)}>
          <cat.icon aria-hidden className="size-3.5" /> {categoryLabel(question.category)}
        </span>
        <DialogTitle>{title}</DialogTitle>
        {description && <DialogDescription className="line-clamp-3">{description}</DialogDescription>}
        {question.source && (
          <a
            href={question.source.url}
            target="_blank"
            rel="noopener noreferrer"
            className="w-fit text-xs font-semibold text-primary hover:underline"
          >
            {t("bet.fullRules", { source: question.source.name })}
          </a>
        )}
      </DialogHeader>

      {/* Choix de la réponse */}
      <fieldset className="flex flex-col gap-2">
        <legend className="mb-2 text-xs font-semibold tracking-wide text-muted-foreground uppercase">
          {t("bet.yourAnswer")}
        </legend>
        <div className={cn("grid gap-2", question.options.length === 2 ? "grid-cols-2" : "grid-cols-1")}>
          {question.options.map((opt) => {
            const tn = optionTone(question, opt);
            const selected = opt === option;
            const pct = Math.round(impliedProbability(question, opt) * 100);
            return (
              <button
                key={opt}
                type="button"
                onClick={() => setOption(opt)}
                aria-pressed={selected}
                className={cn(
                  "flex items-center justify-between gap-2 px-4 py-3 text-left font-bold transition-all active:scale-[0.98]",
                  selected ? cn(tn.solid, " ring-2 ring-offset-2 ring-offset-background", tn.ring) : cn(tn.soft, tn.text),
                )}
              >
                <span>{label(opt)}</span>
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
            {t("bet.yourStake")}
          </label>
          <span className="text-xs text-muted-foreground">
            {t("bet.balance")} <b className="tabular-nums text-foreground">{formatCredits(balance)}</b>
          </span>
        </div>

        <div className="flex items-center gap-2 rounded-2xl border bg-card px-3 focus-within:ring-[3px] focus-within:ring-ring/40">
          <Coins aria-hidden className="size-5 text-gold" />
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
            className="h-14 w-full bg-transparent text-3xl font-mono font-semibold tabular-nums outline-none"
          />
          <span className="text-sm font-semibold text-muted-foreground">{t("common.credits")}</span>
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
          aria-label={t("bet.adjust")}
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
            className="font-mono font-semibold text-primary"
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
      <div className="grid grid-cols-2 gap-px overflow-hidden border bg-border">
        <div className="bg-card p-3">
          <div className="flex items-center gap-1 text-xs text-muted-foreground">
            <TrendingUp aria-hidden className="size-3.5" /> {t("bet.odds")}
          </div>
          <div className={cn("text-xl font-mono font-semibold tabular-nums", tone.text)}>
            ×{amount > 0 ? multiplier.toFixed(2) : "—"}
          </div>
        </div>
        <div className="bg-card p-3">
          <div className="text-xs text-muted-foreground">{t("bet.youGet")}</div>
          <div className="text-xl font-mono font-semibold tabular-nums text-yes">
            {amount > 0 ? formatCredits(payout) : "—"}
            {amount > 0 && (
              <span className="ml-1 text-xs font-semibold">(+{formatCredits(payout - amount)})</span>
            )}
          </div>
        </div>
      </div>
      <p className="-mt-3 text-[11px] leading-snug text-muted-foreground">
        {t("bet.mutualNote")}
      </p>

      {(error || amount > balance) && (
        <p className="rounded-lg bg-no-soft px-3 py-2 text-sm font-medium text-no" role="alert">
          {t(error ?? "error.insufficient")}
        </p>
      )}

      <Button type="submit" size="lg" disabled={invalid || submitting} className={cn("h-14 text-base", tone.solid)}>
        {t("bet.submit", { amount: amount > 0 ? formatCredits(amount) : "", option: label(option) })}
        <ArrowRight aria-hidden className="size-5" />
      </Button>
    </form>
  );
}

"use client";

import * as React from "react";
import Link from "next/link";
import { ShieldCheck } from "lucide-react";

import { TimeLeft } from "@/components/questions/time-left";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { CATEGORY_STYLES } from "@/lib/categories";
import type { MessageKey } from "@/lib/i18n/dictionaries";
import { useI18n } from "@/lib/i18n/provider";
import { localizeQuestion, optionLabel } from "@/lib/i18n/question";
import { totalPool } from "@/lib/odds";
import { useStore } from "@/lib/store";
import { CATEGORIES, type Category, type Question } from "@/lib/types";
import { cn, formatCredits } from "@/lib/utils";

/** Champs multi-lignes et listes, au style de <Input>. */
const FIELD_CLASS =
  "w-full min-w-0 rounded-lg border border-input bg-card px-3 py-2 text-base  outline-none transition-[color,box-shadow] placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/40 md:text-sm";

type Feedback = { tone: "ok" | "error"; key: MessageKey } | null;

export function AdminView() {
  const { t } = useI18n();
  const { user, questions } = useStore();
  // Message affiché après un règlement : la carte, elle, disparaît de la liste
  const [notice, setNotice] = React.useState<MessageKey | null>(null);

  if (!user.is_admin) {
    return (
      <div className="flex flex-col items-center gap-4 py-12 text-center">
        <p className="font-semibold">{t("admin.notAdmin")}</p>
        <Button asChild variant="outline">
          <Link href="/dashboard">{t("admin.back")}</Link>
        </Button>
      </div>
    );
  }

  // Questions « maison » = sans source Polymarket ; on règle les plus urgentes d'abord
  const house = questions.filter((q) => !q.source && q.status === "open");

  return (
    <div className="flex flex-col gap-8">
      <div className="flex items-center gap-2">
        <ShieldCheck aria-hidden className="size-6 text-red" />
        <h1 className="font-display text-3xl uppercase">{t("admin.title")}</h1>
      </div>

      <section className="flex flex-col gap-3" aria-labelledby="admin-resolve">
        <div>
          <h2 id="admin-resolve" className="font-bold">
            {t("admin.toResolve", { n: house.length })}
          </h2>
          <p className="text-sm text-muted-foreground">{t("admin.toResolveHint")}</p>
        </div>
        {notice && <FeedbackLine feedback={{ tone: "ok", key: notice }} />}
        {house.length === 0 ? (
          <p className="border border-dashed p-4 text-center text-sm text-muted-foreground">
            {t("admin.noneToResolve")}
          </p>
        ) : (
          house.map((q) => <ResolveCard key={q.id} question={q} onDone={setNotice} />)
        )}
      </section>

      <section className="flex flex-col gap-3" aria-labelledby="admin-create">
        <h2 id="admin-create" className="font-bold">
          {t("admin.create")}
        </h2>
        <CreateQuestionForm />
      </section>
    </div>
  );
}

function ResolveCard({ question, onDone }: { question: Question; onDone: (key: MessageKey) => void }) {
  const { t, lang, categoryLabel } = useI18n();
  const { resolveQuestion, cancelQuestion } = useStore();
  const [busy, setBusy] = React.useState(false);
  const [error, setError] = React.useState<MessageKey | null>(null);
  const { title } = localizeQuestion(question, lang);
  const cat = CATEGORY_STYLES[question.category];
  const [now] = React.useState(() => Date.now());
  const closed = new Date(question.deadline).getTime() <= now;

  async function run(confirmText: string, action: () => ReturnType<typeof cancelQuestion>, done: MessageKey) {
    if (!window.confirm(confirmText)) return;
    setBusy(true);
    setError(null);
    const res = await action();
    setBusy(false);
    if (res.ok) onDone(done);
    else setError(res.error);
  }

  return (
    <article className="flex flex-col gap-3 border-2 border-foreground bg-card p-4">
      <div className="flex items-center justify-between gap-2">
        <span className={cn("inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-semibold", cat.className)}>
          <cat.icon aria-hidden className="size-3.5" /> {categoryLabel(question.category)}
        </span>
        {closed ? (
          <Badge variant="secondary">{t("admin.closed")}</Badge>
        ) : (
          <TimeLeft deadline={question.deadline} />
        )}
      </div>
      <h3 className="font-bold leading-snug">{title}</h3>
      <p className="text-xs text-muted-foreground">
        {t("admin.bettors", { n: question.bettors })} · {formatCredits(totalPool(question))} {t("common.credits")}
      </p>

      <p className="text-sm font-medium">{t("admin.pickWinner")}</p>
      <div className="flex flex-wrap gap-2">
        {question.options.map((opt) => (
          <Button
            key={opt}
            variant="outline"
            disabled={busy}
            onClick={() =>
              run(
                t("admin.confirmResolve", { title, answer: optionLabel(question, opt, lang) }),
                () => resolveQuestion(question.id, opt),
                "admin.resolved",
              )
            }
          >
            {optionLabel(question, opt, lang)}
          </Button>
        ))}
      </div>
      <Button
        variant="ghost"
        className="w-fit text-no"
        disabled={busy}
        onClick={() => run(t("admin.confirmCancel", { title }), () => cancelQuestion(question.id), "admin.cancelled")}
      >
        {t("admin.cancel")}
      </Button>
      {error && <FeedbackLine feedback={{ tone: "error", key: error }} />}
    </article>
  );
}

/** Valeur par défaut d'un <input type="datetime-local"> : dans 7 jours, heure locale. */
function defaultDeadline() {
  const d = new Date(Date.now() + 7 * 86_400_000);
  d.setMinutes(0, 0, 0);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:00`;
}

function CreateQuestionForm() {
  const { t, categoryLabel } = useI18n();
  const { createQuestion } = useStore();
  const [title, setTitle] = React.useState("");
  const [description, setDescription] = React.useState("");
  const [category, setCategory] = React.useState<Category>("Absurde");
  const [type, setType] = React.useState<"yesno" | "choices">("yesno");
  const [choices, setChoices] = React.useState("");
  const [deadline, setDeadline] = React.useState(defaultDeadline);
  const [busy, setBusy] = React.useState(false);
  const [feedback, setFeedback] = React.useState<Feedback>(null);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    const cleanTitle = title.trim();
    if (cleanTitle.length < 5 || cleanTitle.length > 200) return setFeedback({ tone: "error", key: "admin.err.title" });

    const options =
      type === "yesno"
        ? ["Oui", "Non"]
        : [...new Set(choices.split("\n").map((c) => c.trim()).filter(Boolean))];
    if (options.length < 2 || options.length > 6) return setFeedback({ tone: "error", key: "admin.err.options" });

    const end = new Date(deadline);
    if (Number.isNaN(end.getTime()) || end.getTime() <= Date.now()) {
      return setFeedback({ tone: "error", key: "admin.err.deadline" });
    }

    setBusy(true);
    const res = await createQuestion({
      title: cleanTitle,
      description: description.trim() || undefined,
      category,
      options,
      deadline: end.toISOString(),
    });
    setBusy(false);
    if (!res.ok) return setFeedback({ tone: "error", key: res.error });
    setFeedback({ tone: "ok", key: "admin.created" });
    setTitle("");
    setDescription("");
    setChoices("");
    setDeadline(defaultDeadline());
  }

  const onChange = <T,>(set: (v: T) => void) => (v: T) => {
    set(v);
    setFeedback(null);
  };

  return (
    <form className="flex flex-col gap-4 border-2 border-foreground bg-card p-4" onSubmit={submit}>
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="q-title">{t("admin.fieldTitle")}</Label>
        <Input
          id="q-title"
          value={title}
          maxLength={200}
          placeholder={t("admin.fieldTitlePlaceholder")}
          onChange={(e) => onChange(setTitle)(e.target.value)}
        />
      </div>

      <div className="flex flex-col gap-1.5">
        <Label htmlFor="q-description">{t("admin.fieldDescription")}</Label>
        <textarea
          id="q-description"
          rows={2}
          value={description}
          maxLength={500}
          placeholder={t("admin.fieldDescriptionPlaceholder")}
          className={FIELD_CLASS}
          onChange={(e) => onChange(setDescription)(e.target.value)}
        />
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="q-category">{t("admin.fieldCategory")}</Label>
          <select
            id="q-category"
            value={category}
            className={cn(FIELD_CLASS, "h-11")}
            onChange={(e) => onChange(setCategory)(e.target.value as Category)}
          >
            {CATEGORIES.map((c) => (
              <option key={c} value={c}>
                {categoryLabel(c)}
              </option>
            ))}
          </select>
        </div>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="q-deadline">{t("admin.fieldDeadline")}</Label>
          <Input
            id="q-deadline"
            type="datetime-local"
            value={deadline}
            onChange={(e) => onChange(setDeadline)(e.target.value)}
          />
        </div>
      </div>

      <fieldset className="flex flex-col gap-1.5">
        <legend className="mb-1.5 text-sm font-medium">{t("admin.fieldType")}</legend>
        <div className="grid grid-cols-2 gap-2" role="radiogroup">
          {(["yesno", "choices"] as const).map((value) => (
            <button
              key={value}
              type="button"
              role="radio"
              aria-checked={type === value}
              onClick={() => onChange(setType)(value)}
              className={cn(
                "border-2 border-foreground bg-card px-3 py-2.5 text-sm font-semibold transition-all active:scale-[0.98]",
                type === value && "border-foreground bg-foreground text-background",
              )}
            >
              {t(value === "yesno" ? "admin.typeYesNo" : "admin.typeChoices")}
            </button>
          ))}
        </div>
      </fieldset>

      {type === "choices" && (
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="q-options">{t("admin.fieldOptions")}</Label>
          <textarea
            id="q-options"
            rows={4}
            value={choices}
            placeholder={"Moins de 10\n10 à 25\nPlus de 25"}
            className={FIELD_CLASS}
            onChange={(e) => onChange(setChoices)(e.target.value)}
          />
        </div>
      )}

      <Button type="submit" disabled={busy} className="w-full sm:w-fit">
        {t("admin.submit")}
      </Button>
      {feedback && <FeedbackLine feedback={feedback} />}
    </form>
  );
}

function FeedbackLine({ feedback }: { feedback: NonNullable<Feedback> }) {
  const { t } = useI18n();
  return (
    <p
      className={cn("text-sm font-medium", feedback.tone === "ok" ? "text-yes" : "text-no")}
      role={feedback.tone === "ok" ? "status" : "alert"}
    >
      {t(feedback.key)}
    </p>
  );
}

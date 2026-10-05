"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Check, ShieldCheck } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { Lang, MessageKey } from "@/lib/i18n/dictionaries";
import { useI18n } from "@/lib/i18n/provider";
import { useStore, type Result } from "@/lib/store";
import { cn } from "@/lib/utils";

const LANGUAGE_CHOICES: { value: Lang; label: string; flag: string }[] = [
  { value: "fr", label: "Français", flag: "🇫🇷" },
  { value: "en", label: "English", flag: "🇬🇧" },
];

export function SettingsView() {
  const { t, lang, setLang } = useI18n();
  const { user, email, updateUsername, signOut, deleteAccount } = useStore();
  const router = useRouter();
  const [deleting, setDeleting] = React.useState(false);
  const [deleteError, setDeleteError] = React.useState<MessageKey | null>(null);

  async function onDelete() {
    const typed = window.prompt(t("settings.deletePrompt"));
    if (typed?.trim().toUpperCase() !== "SUPPRIMER") return;
    setDeleting(true);
    setDeleteError(null);
    const res = await deleteAccount();
    setDeleting(false);
    if (!res.ok) setDeleteError(res.error);
    else router.replace("/");
  }
  return (
    <div className="flex flex-col gap-6">
      <h1 className="text-2xl font-extrabold tracking-tight">{t("settings.title")}</h1>

      <section className="flex flex-col gap-3" aria-labelledby="settings-language">
        <div>
          <h2 id="settings-language" className="font-bold">
            {t("settings.language")}
          </h2>
          <p className="text-sm text-muted-foreground">{t("settings.languageHint")}</p>
        </div>
        <div className="grid grid-cols-2 gap-2" role="radiogroup" aria-labelledby="settings-language">
          {LANGUAGE_CHOICES.map((choice) => {
            const selected = choice.value === lang;
            return (
              <button
                key={choice.value}
                type="button"
                role="radio"
                aria-checked={selected}
                lang={choice.value}
                onClick={() => setLang(choice.value)}
                className={cn(
                  "flex items-center gap-3 rounded-2xl border bg-card px-4 py-3 text-left font-semibold transition-all active:scale-[0.98]",
                  selected && "border-2 border-primary",
                )}
              >
                <span className="text-2xl" aria-hidden>
                  {choice.flag}
                </span>
                <span className="flex-1">{choice.label}</span>
                {selected && <Check aria-hidden className="size-4 text-primary" />}
              </button>
            );
          })}
        </div>
      </section>

      <section className="flex flex-col gap-3" aria-labelledby="settings-profile">
        <h2 id="settings-profile" className="flex items-center gap-2 font-bold">
          {t("settings.profile")}
          {user.is_admin && (
            <Badge>
              <ShieldCheck aria-hidden />
              {t("admin.badge")}
            </Badge>
          )}
        </h2>
        <UsernameForm current={user.username} onSave={updateUsername} />
      </section>

      {user.is_admin && (
        <section
          className="flex flex-col gap-3 rounded-2xl border bg-card p-4"
          aria-labelledby="settings-admin"
        >
          <div>
            <h2 id="settings-admin" className="flex items-center gap-2 font-bold">
              <ShieldCheck aria-hidden className="size-4 text-primary" />
              {t("admin.title")}
            </h2>
            <p className="text-sm text-muted-foreground">{t("admin.settingsHint")}</p>
          </div>
          <Button asChild className="w-fit">
            <Link href="/admin">{t("admin.open")}</Link>
          </Button>
        </section>
      )}

      <section className="flex flex-col gap-2 rounded-2xl border bg-card p-4 text-sm" aria-labelledby="settings-about">
        <h2 id="settings-about" className="font-bold">
          {t("settings.about")}
        </h2>
        <p className="text-muted-foreground">{t("settings.aboutBody")}</p>
      </section>

      <section className="flex flex-col gap-3" aria-labelledby="settings-account">
        <h2 id="settings-account" className="font-bold">
          {t("settings.account")}
        </h2>
        {email && <p className="text-sm text-muted-foreground">{t("settings.signedInAs", { email })}</p>}
        <Link href="/legal" className="w-fit text-sm text-muted-foreground underline underline-offset-2 hover:text-foreground">
          {t("settings.legal")}
        </Link>
        <Button variant="outline" className="w-fit text-no" onClick={() => void signOut()}>
          {t("settings.signOut")}
        </Button>
        <div className="mt-2 flex flex-col gap-2 border border-no/30 p-4">
          <p className="text-sm text-muted-foreground">{t("settings.deleteHint")}</p>
          <Button variant="ghost" className="w-fit text-no" disabled={deleting} onClick={onDelete}>
            {t("settings.delete")}
          </Button>
          {deleteError && (
            <p className="text-sm font-medium text-no" role="alert">
              {t(deleteError)}
            </p>
          )}
        </div>
      </section>
    </div>
  );
}

function UsernameForm({
  current,
  onSave,
}: {
  current: string;
  onSave: (username: string) => Promise<Result>;
}) {
  const { t } = useI18n();
  const [value, setValue] = React.useState(current);
  const [error, setError] = React.useState<MessageKey | null>(null);
  const [saved, setSaved] = React.useState(false);
  const [saving, setSaving] = React.useState(false);
  const [prevCurrent, setPrevCurrent] = React.useState(current);

  // Le pseudo enregistré peut arriver après coup (restauration depuis l'appareil)
  if (current !== prevCurrent) {
    setPrevCurrent(current);
    setValue(current);
  }

  return (
    <form
      className="flex flex-col gap-2"
      onSubmit={async (e) => {
        e.preventDefault();
        setSaving(true);
        const res = await onSave(value);
        setSaving(false);
        if (!res.ok) return setError(res.error);
        setSaved(true);
      }}
    >
      <Label htmlFor="username">{t("settings.username")}</Label>
      <div className="flex gap-2">
        <Input
          id="username"
          value={value}
          maxLength={24}
          autoComplete="nickname"
          aria-invalid={Boolean(error)}
          aria-describedby={error ? "username-error" : undefined}
          onChange={(e) => {
            setValue(e.target.value);
            setError(null);
            setSaved(false);
          }}
        />
        <Button type="submit" disabled={value.trim() === current || saving}>
          {t("settings.save")}
        </Button>
      </div>
      {error && (
        <p id="username-error" className="text-sm font-medium text-no" role="alert">
          {t(error)}
        </p>
      )}
      {saved && (
        <p className="text-sm font-medium text-yes" role="status">
          {t("settings.saved")}
        </p>
      )}
    </form>
  );
}

"use client";

import * as React from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { Loader2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { LEGAL } from "@/lib/legal";
import { absoluteUrl } from "@/lib/paths";
import type { MessageKey } from "@/lib/i18n/dictionaries";
import { useI18n } from "@/lib/i18n/provider";
import { createClient } from "@/lib/supabase/client";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import { cn } from "@/lib/utils";

export function LoginForm() {
  const router = useRouter();
  const params = useSearchParams();
  const { t } = useI18n();
  const next = params.get("next") ?? "/dashboard";
  const [mode, setMode] = React.useState<"signin" | "signup">("signin");
  const [loading, setLoading] = React.useState(false);
  const [message, setMessage] = React.useState<{ type: "error" | "info"; text: string } | null>(
    params.get("error") ? { type: "error", text: t("login.failed") } : null,
  );

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!isSupabaseConfigured) return;
    const form = new FormData(e.currentTarget);
    const email = String(form.get("email"));
    const password = String(form.get("password"));
    const username = String(form.get("username") ?? "");

    setLoading(true);
    setMessage(null);
    const supabase = createClient();
    const { data, error } =
      mode === "signin"
        ? await supabase.auth.signInWithPassword({ email, password })
        : await supabase.auth.signUp({
            email,
            password,
            options: {
              // Preuve de l'accord aux CGU (version + date), gardée avec le compte
              data: { username, terms_version: LEGAL.termsVersion, terms_accepted_at: new Date().toISOString() },
              emailRedirectTo: absoluteUrl(`/auth/callback/?next=${encodeURIComponent(next)}`),
            },
          });
    setLoading(false);

    if (error) return setMessage({ type: "error", text: t(authErrorKey(error.code)) });
    // Sans confirmation d'email (réglage Supabase), la session est ouverte tout de suite
    if (mode === "signup" && !data.session) return setMessage({ type: "info", text: t("login.checkInbox") });
    router.push(next);
    router.refresh();
  }

  async function google() {
    if (!isSupabaseConfigured) return;
    const supabase = createClient();
    await supabase.auth.signInWithOAuth({
      provider: "google",
      options: { redirectTo: absoluteUrl(`/auth/callback/?next=${encodeURIComponent(next)}`) },
    });
  }

  return (
    <div className="flex w-full flex-col gap-5">
      {!isSupabaseConfigured && (
        <div className="rounded-xl border border-amber-500/30 bg-amber-500/10 p-3 text-sm" role="alert">
          <b>{t("setup.title")}</b> — {t("setup.body")}
        </div>
      )}

      <div className="grid grid-cols-2 rounded-xl bg-muted p-1">
        {(
          [
            ["signin", t("login.signin")],
            ["signup", t("login.signup")],
          ] as const
        ).map(([key, label]) => (
          <button
            key={key}
            type="button"
            onClick={() => setMode(key)}
            className={cn(
              "rounded-lg py-2 text-sm font-semibold transition-all",
              mode === key ? "bg-card shadow-sm" : "text-muted-foreground",
            )}
          >
            {label}
          </button>
        ))}
      </div>

      {GOOGLE_ENABLED && (
        <>
          <Button type="button" variant="outline" size="lg" onClick={google}>
            <GoogleIcon /> {t("login.google")}
          </Button>
          <p className="-mt-3 text-center text-xs text-muted-foreground">
            {t("login.terms.google")}{" "}
            <Link href="/legal/cgu" className="underline underline-offset-2">
              {t("login.terms.cgu")}
            </Link>
          </p>

          <div className="flex items-center gap-3 text-xs text-muted-foreground">
            <span className="h-px flex-1 bg-border" /> {t("login.orEmail")} <span className="h-px flex-1 bg-border" />
          </div>
        </>
      )}

      <form onSubmit={onSubmit} className="flex flex-col gap-4">
        {mode === "signup" && (
          <div className="flex flex-col gap-2">
            <Label htmlFor="username">{t("login.username")}</Label>
            <Input id="username" name="username" required minLength={3} maxLength={24} placeholder="hugo_all_in" />
          </div>
        )}
        <div className="flex flex-col gap-2">
          <Label htmlFor="email">{t("login.email")}</Label>
          <Input id="email" name="email" type="email" required autoComplete="email" placeholder="toi@exemple.fr" />
        </div>
        <div className="flex flex-col gap-2">
          <Label htmlFor="password">{t("login.password")}</Label>
          <Input
            id="password"
            name="password"
            type="password"
            required
            minLength={6}
            autoComplete={mode === "signin" ? "current-password" : "new-password"}
          />
        </div>

        {mode === "signup" && (
          <label className="flex items-start gap-2.5 text-sm">
            <input type="checkbox" name="terms" required className="mt-0.5 size-4 shrink-0 accent-primary" />
            <span>
              {t("login.terms.before", { age: LEGAL.minAge })}{" "}
              <Link href="/legal/cgu" target="_blank" className="font-semibold underline underline-offset-2">
                {t("login.terms.cgu")}
              </Link>{" "}
              {t("login.terms.and")}{" "}
              <Link href="/legal/confidentialite" target="_blank" className="font-semibold underline underline-offset-2">
                {t("login.terms.privacy")}
              </Link>
              .
            </span>
          </label>
        )}

        {message && (
          <p
            role="alert"
            className={cn(
              "rounded-lg px-3 py-2 text-sm font-medium",
              message.type === "error" ? "bg-no-soft text-no" : "bg-yes-soft text-yes",
            )}
          >
            {message.text}
          </p>
        )}

        <Button type="submit" size="lg" disabled={loading}>
          {loading && <Loader2 className="animate-spin" />}
          {mode === "signin" ? t("login.submitSignin") : t("login.submitSignup")}
        </Button>
      </form>
    </div>
  );
}

/** Le bouton Google n'apparaît que si le fournisseur est activé dans Supabase. */
const GOOGLE_ENABLED = process.env.NEXT_PUBLIC_GOOGLE_AUTH === "true";

function authErrorKey(code: string | undefined): MessageKey {
  switch (code) {
    case "invalid_credentials":
      return "login.err.invalidCredentials";
    case "user_already_exists":
    case "email_exists":
      return "login.err.userExists";
    case "weak_password":
      return "login.err.weakPassword";
    case "over_email_send_rate_limit":
    case "over_request_rate_limit":
      return "login.err.rateLimit";
    case "email_not_confirmed":
      return "login.err.emailNotConfirmed";
    default:
      return "login.failed";
  }
}

function GoogleIcon() {
  return (
    <svg viewBox="0 0 24 24" className="size-4" aria-hidden>
      <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.27-4.74 3.27-8.1z" />
      <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84A11 11 0 0 0 12 23z" />
      <path fill="#FBBC05" d="M5.84 14.09A6.6 6.6 0 0 1 5.5 12c0-.73.13-1.43.34-2.09V7.07H2.18A11 11 0 0 0 1 12c0 1.77.43 3.45 1.18 4.93l3.66-2.84z" />
      <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
    </svg>
  );
}

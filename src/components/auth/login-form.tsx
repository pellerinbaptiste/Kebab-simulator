"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Loader2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { absoluteUrl } from "@/lib/paths";
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
    if (!isSupabaseConfigured) return router.push("/dashboard");
    const form = new FormData(e.currentTarget);
    const email = String(form.get("email"));
    const password = String(form.get("password"));
    const username = String(form.get("username") ?? "");

    setLoading(true);
    setMessage(null);
    const supabase = createClient();
    const { error } =
      mode === "signin"
        ? await supabase.auth.signInWithPassword({ email, password })
        : await supabase.auth.signUp({
            email,
            password,
            options: {
              data: { username },
              emailRedirectTo: absoluteUrl(`/auth/callback/?next=${encodeURIComponent(next)}`),
            },
          });
    setLoading(false);

    if (error) return setMessage({ type: "error", text: error.message });
    if (mode === "signup")
      return setMessage({ type: "info", text: t("login.checkInbox") });
    router.push(next);
    router.refresh();
  }

  async function google() {
    if (!isSupabaseConfigured) return router.push("/dashboard");
    const supabase = createClient();
    await supabase.auth.signInWithOAuth({
      provider: "google",
      options: { redirectTo: absoluteUrl(`/auth/callback/?next=${encodeURIComponent(next)}`) },
    });
  }

  return (
    <div className="flex w-full flex-col gap-5">
      {!isSupabaseConfigured && (
        <div className="rounded-xl border border-amber-500/30 bg-amber-500/10 p-3 text-sm">
          {t("login.demoBanner")}{" "}
          <Link href="/dashboard" className="font-semibold text-primary underline-offset-2 hover:underline">
            {t("login.enterDirectly")}
          </Link>
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

      <Button type="button" variant="outline" size="lg" onClick={google}>
        <GoogleIcon /> {t("login.google")}
      </Button>

      <div className="flex items-center gap-3 text-xs text-muted-foreground">
        <span className="h-px flex-1 bg-border" /> {t("login.orEmail")} <span className="h-px flex-1 bg-border" />
      </div>

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

"use client";

import * as React from "react";
import { Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Loader2 } from "lucide-react";

import { createClient } from "@/lib/supabase/client";
import { isSupabaseConfigured } from "@/lib/supabase/config";

/** Retour OAuth (Google) et liens de confirmation email, traité côté navigateur. */
function Callback() {
  const router = useRouter();
  const params = useSearchParams();

  React.useEffect(() => {
    const next = params.get("next") ?? "/dashboard";
    const safeNext = next.startsWith("/") && !next.startsWith("//") ? next : "/dashboard";
    if (!isSupabaseConfigured) return router.replace("/dashboard");

    (async () => {
      const supabase = createClient();
      // Le client échange déjà le ?code= à l'initialisation ; sinon on le fait ici.
      let { data } = await supabase.auth.getSession();
      const code = params.get("code");
      if (!data.session && code) {
        await supabase.auth.exchangeCodeForSession(code);
        ({ data } = await supabase.auth.getSession());
      }
      router.replace(data.session ? safeNext : "/login?error=auth");
    })();
  }, [params, router]);

  return null;
}

export default function AuthCallbackPage() {
  return (
    <main className="grid flex-1 place-items-center">
      <Loader2 className="size-6 animate-spin text-muted-foreground" />
      <Suspense>
        <Callback />
      </Suspense>
    </main>
  );
}

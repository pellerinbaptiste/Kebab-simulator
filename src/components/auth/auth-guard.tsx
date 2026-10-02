"use client";

import * as React from "react";
import { usePathname, useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";

import { SetupNotice } from "@/components/auth/setup-notice";
import { useI18n } from "@/lib/i18n/provider";
import { createClient } from "@/lib/supabase/client";
import { isSupabaseConfigured } from "@/lib/supabase/config";

/**
 * Réserve les pages de l'app aux joueurs connectés : les autres sont envoyés
 * sur /login, puis ramenés à la page demandée (lien d'invitation compris).
 * Le site est statique, cette protection se fait donc dans le navigateur ;
 * la vraie sécurité des données est assurée par la RLS de Supabase.
 */
export function AuthGuard({ children }: { children: React.ReactNode }) {
  if (!isSupabaseConfigured) return <SetupNotice />;
  return <SessionGate>{children}</SessionGate>;
}

function SessionGate({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const { t } = useI18n();
  const [allowed, setAllowed] = React.useState(false);

  React.useEffect(() => {
    const supabase = createClient();
    const redirect = () => {
      const next = `${pathname}${window.location.search}`;
      router.replace(`/login?next=${encodeURIComponent(next)}`);
    };
    supabase.auth.getSession().then(({ data }) => (data.session ? setAllowed(true) : redirect()));
    const { data: sub } = supabase.auth.onAuthStateChange((_event, session) => {
      if (!session) redirect();
    });
    return () => sub.subscription.unsubscribe();
  }, [pathname, router]);

  if (allowed) return children;
  return (
    <div className="flex flex-1 items-center justify-center py-24" role="status">
      <Loader2 aria-hidden className="size-6 animate-spin text-muted-foreground" />
      <span className="sr-only">{t("app.loading")}</span>
    </div>
  );
}

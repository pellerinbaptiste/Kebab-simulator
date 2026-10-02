"use client";

import * as React from "react";
import { usePathname, useRouter } from "next/navigation";

import { createClient } from "@/lib/supabase/client";
import { isSupabaseConfigured } from "@/lib/supabase/config";

/**
 * Protège les pages de l'app côté navigateur (le site est statique, il n'y a
 * pas de serveur). En mode démo, tout reste accessible. La vraie sécurité des
 * données est assurée par les règles RLS de Supabase.
 */
export function AuthGuard({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const [allowed, setAllowed] = React.useState(!isSupabaseConfigured);

  React.useEffect(() => {
    if (!isSupabaseConfigured) return;
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

  return allowed ? children : null;
}

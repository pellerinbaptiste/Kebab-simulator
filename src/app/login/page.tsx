import { Suspense } from "react";
import type { Metadata } from "next";
import Link from "next/link";

import { LoginForm } from "@/components/auth/login-form";
import { LogoMark } from "@/components/brand/logo";

export const metadata: Metadata = { title: "Connexion" };

export default function LoginPage() {
  return (
    <main className="mx-auto flex w-full max-w-sm flex-1 flex-col justify-center gap-6 px-4 py-10">
      <Link href="/" className="flex flex-col items-center gap-3 text-center" aria-label="PronoLeague">
        <LogoMark className="size-14" />
        <span className="text-2xl font-extrabold tracking-tight">PronoLeague</span>
      </Link>
      <Suspense>
        <LoginForm />
      </Suspense>
    </main>
  );
}

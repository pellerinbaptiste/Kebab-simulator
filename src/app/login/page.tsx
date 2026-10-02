import { Suspense } from "react";
import type { Metadata } from "next";
import Link from "next/link";

import { LoginForm } from "@/components/auth/login-form";

export const metadata: Metadata = { title: "Connexion" };

export default function LoginPage() {
  return (
    <main className="mx-auto flex w-full max-w-sm flex-1 flex-col justify-center gap-6 px-4 py-10">
      <Link href="/" className="flex flex-col items-center gap-2 text-center">
        <span className="grid size-14 place-items-center rounded-2xl bg-primary text-3xl shadow-lg">🔮</span>
        <span className="text-2xl font-black tracking-tight">
          Prono<span className="text-primary">League</span>
        </span>
      </Link>
      <Suspense>
        <LoginForm />
      </Suspense>
    </main>
  );
}

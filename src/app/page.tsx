import Link from "next/link";
import { ArrowRight } from "lucide-react";

import { Button } from "@/components/ui/button";

const TEASERS = [
  { emoji: "📈", q: "La BCE baisse ses taux jeudi ?", yes: 61 },
  { emoji: "🐕", q: "Un chien sur le terrain au match de la fac ?", yes: 24 },
  { emoji: "🎬", q: "Le nouveau Marvel dépasse 1 Md $ ?", yes: 47 },
];

export default function LandingPage() {
  return (
    <main className="relative mx-auto flex w-full max-w-md flex-1 flex-col gap-8 overflow-hidden px-4 py-10">
      <div className="pointer-events-none absolute -top-32 left-1/2 size-96 -translate-x-1/2 rounded-full bg-primary/25 blur-3xl" />

      <div className="relative flex flex-col items-center gap-4 text-center">
        <span className="grid size-16 place-items-center rounded-2xl bg-primary text-4xl shadow-xl">🔮</span>
        <h1 className="text-4xl font-black tracking-tight text-balance">
          Parie sur <span className="text-primary">tout</span>. Contre tes potes.
        </h1>
        <p className="text-muted-foreground text-balance">
          Macro, droit, sport, pop culture… et absurdités du quotidien. 1000 crédits offerts, des ligues privées,
          un classement en direct.
        </p>
      </div>

      <ul className="relative flex flex-col gap-2">
        {TEASERS.map((t, i) => (
          <li
            key={t.q}
            className="flex items-center gap-3 rounded-2xl border bg-card/90 p-3 shadow-sm backdrop-blur"
            style={{ transform: `rotate(${(i - 1) * 1.2}deg)` }}
          >
            <span className="text-2xl">{t.emoji}</span>
            <span className="flex-1 text-sm font-semibold">{t.q}</span>
            <span className="rounded-lg bg-yes-soft px-2 py-1 text-xs font-black text-yes">Oui {t.yes}%</span>
          </li>
        ))}
      </ul>

      <div className="relative mt-auto flex flex-col gap-2">
        <Button asChild size="lg" className="h-14 text-base">
          <Link href="/login">
            Commencer à parier <ArrowRight className="size-5" />
          </Link>
        </Button>
        <Button asChild variant="ghost">
          <Link href="/dashboard">Voir la démo</Link>
        </Button>
        <p className="text-center text-[11px] text-muted-foreground">
          Crédits virtuels uniquement. Aucun argent réel n&apos;est en jeu.
        </p>
      </div>
    </main>
  );
}

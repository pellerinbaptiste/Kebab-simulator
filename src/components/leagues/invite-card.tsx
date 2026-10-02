"use client";

import * as React from "react";
import { Check, Copy, Share2 } from "lucide-react";

import { Button } from "@/components/ui/button";

export function InviteCard({ code, leagueName }: { code: string; leagueName: string }) {
  const [copied, setCopied] = React.useState<"code" | "link" | null>(null);
  const inviteLink = () => `${window.location.origin}/join/${code}`;

  async function copy(text: string, what: "code" | "link") {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(what);
      setTimeout(() => setCopied(null), 1500);
    } catch {
      /* presse-papiers indisponible (http, iframe…) */
    }
  }

  async function share() {
    const text = `Rejoins ma ligue « ${leagueName} » sur PronoLeague 🔮 Code : ${code}`;
    if (navigator.share) {
      try {
        await navigator.share({ title: "PronoLeague", text, url: inviteLink() });
      } catch {
        /* partage annulé */
      }
    } else {
      copy(inviteLink(), "link");
    }
  }

  return (
    <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-primary to-fuchsia-600 p-4 text-white shadow-lg">
      <div className="pointer-events-none absolute -top-8 -right-6 text-8xl opacity-15 select-none">🎟️</div>
      <p className="text-xs font-semibold tracking-wide uppercase opacity-80">Code d&apos;invitation</p>
      <button
        onClick={() => copy(code, "code")}
        className="mt-1 flex items-center gap-2 font-mono text-3xl font-black tracking-[0.25em]"
        aria-label="Copier le code"
      >
        {code}
        {copied === "code" ? <Check className="size-5" /> : <Copy className="size-5 opacity-70" />}
      </button>
      <div className="mt-4 grid grid-cols-2 gap-2">
        <Button variant="secondary" className="bg-white/15 text-white hover:bg-white/25" onClick={() => copy(inviteLink(), "link")}>
          {copied === "link" ? <Check /> : <Copy />}
          {copied === "link" ? "Lien copié" : "Copier le lien"}
        </Button>
        <Button className="bg-white text-primary hover:bg-white/90" onClick={share}>
          <Share2 /> Inviter
        </Button>
      </div>
    </div>
  );
}

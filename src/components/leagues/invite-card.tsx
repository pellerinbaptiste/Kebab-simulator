"use client";

import * as React from "react";
import { Check, Copy, Share2, Ticket } from "lucide-react";

import { Button } from "@/components/ui/button";
import { useI18n } from "@/lib/i18n/provider";
import { absoluteUrl, joinHref } from "@/lib/paths";

export function InviteCard({ code, leagueName }: { code: string; leagueName: string }) {
  const { t } = useI18n();
  const [copied, setCopied] = React.useState<"code" | "link" | null>(null);
  const inviteLink = () => absoluteUrl(joinHref(code));

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
    const text = t("invite.shareText", { name: leagueName, code });
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
    <div className="relative overflow-hidden rounded-xl bg-[#2D5BE3] p-4 text-white">
      <Ticket aria-hidden className="pointer-events-none absolute -top-4 -right-4 size-28 opacity-15" />
      <p className="text-xs font-semibold tracking-wide uppercase opacity-80">{t("invite.code")}</p>
      <button
        onClick={() => copy(code, "code")}
        className="mt-1 flex items-center gap-2 font-mono text-3xl font-black tracking-[0.25em]"
        aria-label={t("invite.copyCode")}
      >
        {code}
        {copied === "code" ? <Check className="size-5" /> : <Copy className="size-5 opacity-70" />}
      </button>
      <div className="mt-4 grid grid-cols-2 gap-2">
        <Button variant="secondary" className="bg-white/15 text-white hover:bg-white/25" onClick={() => copy(inviteLink(), "link")}>
          {copied === "link" ? <Check /> : <Copy />}
          {copied === "link" ? t("invite.linkCopied") : t("invite.copyLink")}
        </Button>
        <Button className="bg-white text-[#2D5BE3] hover:bg-white/90" onClick={share}>
          <Share2 aria-hidden /> {t("invite.share")}
        </Button>
      </div>
    </div>
  );
}

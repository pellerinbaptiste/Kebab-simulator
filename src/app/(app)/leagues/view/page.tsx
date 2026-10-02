"use client";

import { Suspense } from "react";
import { useSearchParams } from "next/navigation";

import { LeagueView } from "@/components/leagues/league-view";

// Route statique : l'identifiant passe en query (?id=…) pour être
// compatible avec l'export statique (GitHub Pages).
function LeagueFromQuery() {
  const id = useSearchParams().get("id") ?? "";
  return <LeagueView key={id} leagueId={id} />;
}

export default function LeaguePage() {
  return (
    <Suspense>
      <LeagueFromQuery />
    </Suspense>
  );
}

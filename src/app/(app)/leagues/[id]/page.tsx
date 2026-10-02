import type { Metadata } from "next";

import { LeagueView } from "@/components/leagues/league-view";

export const metadata: Metadata = { title: "Ligue" };

export default async function LeaguePage({ params }: PageProps<"/leagues/[id]">) {
  const { id } = await params;
  return <LeagueView leagueId={id} />;
}

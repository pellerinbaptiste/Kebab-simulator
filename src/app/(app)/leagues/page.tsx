import type { Metadata } from "next";

import { LeaguesList } from "@/components/leagues/leagues-list";

export const metadata: Metadata = { title: "Ligues" };

export default function LeaguesPage() {
  return <LeaguesList />;
}

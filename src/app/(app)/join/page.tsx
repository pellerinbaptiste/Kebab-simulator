"use client";

import { Suspense } from "react";
import { useSearchParams } from "next/navigation";

import { JoinLeague } from "@/components/leagues/join-league";

function JoinFromQuery() {
  const code = useSearchParams().get("code") ?? "";
  return <JoinLeague code={code} />;
}

export default function JoinPage() {
  return (
    <Suspense>
      <JoinFromQuery />
    </Suspense>
  );
}

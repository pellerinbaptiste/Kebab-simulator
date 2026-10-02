import { JoinLeague } from "@/components/leagues/join-league";

export default async function JoinPage({ params }: PageProps<"/join/[code]">) {
  const { code } = await params;
  return <JoinLeague code={code} />;
}

import { notFound } from "next/navigation";

import { ContestDetail } from "@/widgets/contest-detail/contest-detail";
import { demoContest } from "@/lib/blockchain/contracts";
import { listContests } from "@/lib/api/contests";
import { robinhoodTestnet } from "@/lib/blockchain/chain";

export default async function ContestPage({
  params,
}: {
  params: Promise<{ contestId: string }>;
}) {
  const { contestId } = await params;
  if (contestId.toLowerCase() !== demoContest.contestId.toLowerCase()) notFound();

  const contests = await listContests(robinhoodTestnet.id).catch(() => []);
  const indexedContest = contests.find(
    (contest) => contest.contestId.toLowerCase() === contestId.toLowerCase(),
  );

  return <ContestDetail indexedContest={indexedContest} />;
}

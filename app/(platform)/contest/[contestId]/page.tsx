import { notFound } from "next/navigation";

import { ContestDetail } from "@/widgets/contest-detail/contest-detail";
import { getContest, listContestTrades, type IndexedContest, type IndexedTradePoint } from "@/lib/api/contests";
import { robinhoodTestnet } from "@/lib/blockchain/chain";

export default async function ContestPage({
  params,
  searchParams,
}: {
  params: Promise<{ contestId: string }>;
  searchParams: Promise<{ side?: string; trade?: string }>;
}) {
  const { contestId } = await params;
  const query = await searchParams;
  if (!/^0x[0-9a-fA-F]{64}$/.test(contestId)) notFound();
  let indexedContest: IndexedContest;
  let history: { items: IndexedTradePoint[]; nextCursor: string | null };
  try {
    [indexedContest, history] = await Promise.all([
      getContest(robinhoodTestnet.id, contestId),
      listContestTrades(robinhoodTestnet.id, contestId),
    ]);
  } catch (error) {
    if (error instanceof Error && error.message === "CONTEST_NOT_FOUND") notFound();
    throw error;
  }

  const initialMode = query.trade === "sell" || query.trade === "flip" || query.trade === "buy" ? query.trade : undefined;
  return <ContestDetail indexedContest={indexedContest} initialHistory={history.items} initialMode={initialMode} initialSide={query.side === "b" ? 1 : 0} />;
}

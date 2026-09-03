import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { cache } from "react";

import { ContestDetail } from "@/widgets/contest-detail/contest-detail";
import { getContest, listContestTrades, type IndexedContest, type IndexedTradePoint } from "@/lib/api/contests";
import { robinhoodTestnet } from "@/lib/blockchain/chain";
import { siteName } from "@/lib/seo/site";

const contestIdPattern = /^0x[0-9a-fA-F]{64}$/;
const getPageContest = cache((contestId: string) => getContest(robinhoodTestnet.id, contestId));

export async function generateMetadata({ params }: { params: Promise<{ contestId: string }> }): Promise<Metadata> {
  const { contestId } = await params;
  if (!contestIdPattern.test(contestId)) return { title: "contest not found" };

  try {
    const contest = await getPageContest(contestId);
    const title = contest.metadata.title;
    const description = `${contest.metadata.sideA.name} vs ${contest.metadata.sideB.name} — back a side and move the live onchain market.`;
    const path = `/contest/${contestId}`;
    return {
      title,
      description,
      alternates: { canonical: path },
      openGraph: { type: "website", url: path, title: `${title} | ${siteName}`, description, siteName },
      twitter: { card: "summary_large_image", title: `${title} | ${siteName}`, description },
    };
  } catch {
    return { title: "live contest", robots: { index: false, follow: false } };
  }
}

export default async function ContestPage({
  params,
  searchParams,
}: {
  params: Promise<{ contestId: string }>;
  searchParams: Promise<{ side?: string; trade?: string }>;
}) {
  const { contestId } = await params;
  const query = await searchParams;
  if (!contestIdPattern.test(contestId)) notFound();
  let indexedContest: IndexedContest;
  let history: { items: IndexedTradePoint[]; nextCursor: string | null };
  try {
    [indexedContest, history] = await Promise.all([
      getPageContest(contestId),
      listContestTrades(robinhoodTestnet.id, contestId),
    ]);
  } catch (error) {
    if (error instanceof Error && error.message === "CONTEST_NOT_FOUND") notFound();
    throw error;
  }

  const initialMode = query.trade === "sell" || query.trade === "flip" || query.trade === "buy" ? query.trade : undefined;
  return <ContestDetail indexedContest={indexedContest} initialHistory={history.items} initialMode={initialMode} initialSide={query.side === "b" ? 1 : 0} />;
}

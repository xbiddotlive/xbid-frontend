import Link from "next/link";
import { formatUnits } from "viem";

import type { IndexedContest } from "@/lib/api/contests";
import { demoContest } from "@/lib/blockchain/contracts";
import { DominanceMeter } from "./dominance-meter";

type ContestCardProps = {
  contest: IndexedContest;
  featured?: boolean;
};

function compactUsdc(units: string) {
  return new Intl.NumberFormat("en", {
    maximumFractionDigits: 2,
    notation: "compact",
  }).format(Number(formatUnits(BigInt(units), 6)));
}

function dominance(contest: IndexedContest) {
  const a = BigInt(contest.market?.qAWei ?? "0");
  const b = BigInt(contest.market?.qBWei ?? "0");
  const total = a + b;
  if (total === 0n) return 50;
  return Number((a * 10_000n) / total) / 100;
}

export function ContestCard({ contest, featured = false }: ContestCardProps) {
  const sideAPercent = dominance(contest);
  const sideBPercent = 100 - sideAPercent;
  const market = contest.market;

  return (
    <article
      className={featured ? "contestCard contestCardFeatured" : "contestCard"}
      data-testid="contest-card"
    >
      <Link className="contestCardLead" href={`/contest/${contest.contestId}`}>
        <div className="contestMark" aria-hidden="true"><span>A</span><span>B</span></div>
      </Link>
      <div className="contestCardBody">
        <div className="contestMeta">
          <span className="liveBadge">Live</span>
          <span>{demoContest.category}</span>
          <span>Market v{contest.marketVersion}</span>
        </div>
        <Link href={`/contest/${contest.contestId}`}><h3>{demoContest.title}</h3></Link>
        <DominanceMeter sideAPercent={sideAPercent} sideBPercent={sideBPercent} />
        <div className="sideActions" aria-label="Contest sides">
          <Link className="sideActionA" href={`/contest/${contest.contestId}`}>Back Side A</Link>
          <Link className="sideActionB" href={`/contest/${contest.contestId}`}>Back Side B</Link>
        </div>
        <div className="contestStats">
          <span>${compactUsdc(market?.cumulativeVolumeUnits ?? "0")} volume</span>
          <span>{market?.tradeCount ?? "0"} trades</span>
          <span>Block {market?.updatedBlock ?? contest.createdBlock}</span>
        </div>
      </div>
      <Link className="cardArrow" href={`/contest/${contest.contestId}`} aria-label="Open contest">↗</Link>
    </article>
  );
}

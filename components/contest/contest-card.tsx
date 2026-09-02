import Link from "next/link";
import { formatUnits } from "viem";

import type { IndexedContest } from "@/lib/api/contests";
import { demoContest } from "@/lib/blockchain/contracts";

type ContestCardProps = {
  contest: IndexedContest;
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

export function ContestCard({ contest }: ContestCardProps) {
  const sideAPercent = dominance(contest);
  const sideBPercent = 100 - sideAPercent;
  const market = contest.market;

  return (
    <Link
      className="contestCard"
      href={`/contest/${contest.contestId}`}
      data-testid="contest-card"
    >
      <div className="contestMark">X</div>
      <div className="contestCardBody">
        <div className="contestMeta">
          <span>{demoContest.category}</span>
          <span>Market v{contest.marketVersion}</span>
          <span>Indexed at block {market?.updatedBlock ?? contest.createdBlock}</span>
        </div>
        <h3>{demoContest.title}</h3>
        <div
          className="dominanceBar"
          aria-label={`Side A ${sideAPercent}%, Side B ${sideBPercent}%`}
        >
          <div className="dominanceA" style={{ width: `${sideAPercent}%` }}>
            Side A · {sideAPercent}%
          </div>
          <div className="dominanceB" style={{ width: `${sideBPercent}%` }}>
            Side B · {sideBPercent}%
          </div>
        </div>
        <div className="contestStats">
          <span>${compactUsdc(market?.cumulativeVolumeUnits ?? "0")} volume</span>
          <span>{market?.tradeCount ?? "0"} trades</span>
          <span>${compactUsdc(market?.reserveUnits ?? "0")} reserve</span>
          <span>Live comments</span>
        </div>
      </div>
      <span className="cardArrow" aria-hidden="true">→</span>
    </Link>
  );
}

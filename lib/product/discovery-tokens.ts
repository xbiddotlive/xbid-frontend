import type { IndexedContest } from "@/lib/api/contests";
import { contestMetrics } from "./market-metrics";

// Rank contests by activity, retaining both sides even when their tickers match.
export function discoveryTokens(contests: IndexedContest[]) {
  return contests.filter((contest) => contest.market).sort((a, b) => {
    const left = BigInt(a.market?.volume24hUnits ?? "0");
    const right = BigInt(b.market?.volume24hUnits ?? "0");
    if (left !== right) return left > right ? -1 : 1;
    return Number(b.createdAt ?? 0) - Number(a.createdAt ?? 0) || a.contestId.localeCompare(b.contestId);
  }).flatMap((contest) => {
    const metrics = contestMetrics(contest);
    const hasAnchor = contest.market?.qA24hAgoWei != null && contest.market?.qB24hAgoWei != null;
    return ([0, 1] as const).map((side) => ({
      key: `${contest.chainId}:${contest.contestId}:${side}`,
      metadata: side === 0 ? contest.metadata.sideA : contest.metadata.sideB,
      side: side === 0 ? "a" as const : "b" as const,
      href: `/contest/${contest.contestId}?trade=buy&side=${side === 0 ? "a" : "b"}`,
      price: metrics.current[side],
      change: hasAnchor ? metrics.changes[side] : null,
    }));
  });
}

import type { IndexedContest } from "@/lib/api/contests";
import { contestMetrics } from "./market-metrics";

export type TokenFilter = "all" | "new" | "hot" | "gainers";
export type DiscoveryToken = {
  key: string;
  metadata: IndexedContest["metadata"]["sideA"];
  side: "a" | "b";
  href: string;
  price: number;
  change: number | null;
  createdAt: number;
  volume24hUnits: string;
  trades24h: string;
};

// Build distinct side-token rows; never copy contest-wide volume to each side.
export function discoveryTokens(contests: IndexedContest[]): DiscoveryToken[] {
  const rows = contests.filter((contest) => contest.market).flatMap((contest) => {
    const metrics = contestMetrics(contest);
    const hasAnchor = contest.market?.qA24hAgoWei != null && contest.market?.qB24hAgoWei != null;
    return ([0, 1] as const).map((side) => ({
      key: `${contest.chainId}:${contest.contestId}:${side}`,
      metadata: side === 0 ? contest.metadata.sideA : contest.metadata.sideB,
      side: side === 0 ? "a" as const : "b" as const,
      href: `/contest/${contest.contestId}?trade=buy&side=${side === 0 ? "a" : "b"}`,
      price: metrics.current[side],
      change: hasAnchor ? metrics.changes[side] : null,
      createdAt: Number(contest.createdAt),
      volume24hUnits: (side === 0 ? contest.market?.sideAVolume24hUnits : contest.market?.sideBVolume24hUnits) ?? "0",
      trades24h: (side === 0 ? contest.market?.sideATradeCount24h : contest.market?.sideBTradeCount24h) ?? "0",
    }));
  });
  return [...new Map(rows.map((row) => [row.key, row])).values()].sort(byActivity);
}

// Pair by chain + contest identity, never by ticker or independently sorted sides.
export function pairedTokens(contests: IndexedContest[]) {
  const tokens = new Map(discoveryTokens(contests).map(token => [token.key, token]));
  return [...new Map(contests.map(contest => [`${contest.chainId}:${contest.contestId}`, contest])).entries()].flatMap(([key]) => {
    const a = tokens.get(key + ":0"), b = tokens.get(key + ":1");
    return a && b ? [{ key, a, b }] : [];
  });
}

function byActivity(a: DiscoveryToken, b: DiscoveryToken): number {
  const left = BigInt(a.volume24hUnits), right = BigInt(b.volume24hUnits);
  return left === right ? (b.createdAt - a.createdAt || a.key.localeCompare(b.key)) : left > right ? -1 : 1;
}

export function selectTokens(tokens: readonly DiscoveryToken[], filter: TokenFilter, nowSeconds: number) {
  return tokens.filter((token) => {
    if (filter === "new") return token.createdAt <= nowSeconds && token.createdAt > nowSeconds - 86_400;
    if (filter === "hot") return BigInt(token.trades24h) >= 3n && BigInt(token.volume24hUnits) > 0n;
    if (filter === "gainers") return token.change !== null && Number.isFinite(token.change) && Number(token.change.toFixed(2)) > 0;
    return true;
  }).sort((a, b) => {
    if (filter === "new") return b.createdAt - a.createdAt || byActivity(a, b);
    if (filter === "gainers") return (b.change ?? 0) - (a.change ?? 0) || byActivity(a, b);
    return byActivity(a, b);
  });
}

// Flash only when the displayed price changes, never just on mount or polling.
export function priceMove(previous: number, current: number) {
  if (!Number.isFinite(previous) || !Number.isFinite(current)) return null;
  const before = Number(previous.toFixed(4)), after = Number(current.toFixed(4));
  return after === before ? null : after > before ? "positive" : "negative";
}

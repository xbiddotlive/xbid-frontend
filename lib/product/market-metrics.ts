import { formatUnits } from "viem";

import type { IndexedContest } from "@/lib/api/contests";

export function marketPrices(qAWei: string, qBWei: string) {
  const x = Number(formatUnits(BigInt(qAWei), 18)) / 270_000;
  const y = Number(formatUnits(BigInt(qBWei), 18)) / 270_000;
  const neutral = Math.log(98);
  const maximum = Math.max(x, y, neutral);
  const a = Math.exp(x - maximum);
  const b = Math.exp(y - maximum);
  const n = Math.exp(neutral - maximum);
  return [a / (a + b + n), b / (a + b + n)] as const;
}

export function contestMetrics(contest: IndexedContest) {
  const market = contest.market;
  const current = market ? marketPrices(market.qAWei, market.qBWei) : [0.01, 0.01] as const;
  const anchor = market?.qA24hAgoWei !== null && market?.qB24hAgoWei !== null && market?.qA24hAgoWei !== undefined && market?.qB24hAgoWei !== undefined
    ? marketPrices(market.qA24hAgoWei, market.qB24hAgoWei)
    : null;
  const changes = current.map((value, side) => anchor?.[side] ? (value / anchor[side] - 1) * 100 : 0) as [number, number];
  const qA = BigInt(market?.qAWei ?? "0");
  const qB = BigInt(market?.qBWei ?? "0");
  const total = qA + qB;
  const sideAPercent = total > 0n ? Number(qA * 10_000n / total) / 100 : 50;
  return { current, changes, sideAPercent, sideBPercent: 100 - sideAPercent };
}

export function formatUsdc(units: string, signed = false) {
  const amount = Number(formatUnits(BigInt(units), 6));
  const sign = signed && amount > 0 ? "+" : "";
  return `${sign}$${new Intl.NumberFormat("en", { notation: "compact", maximumFractionDigits: 2 }).format(amount)}`;
}

export function formatChange(value: number) {
  return `${value >= 0 ? "+" : ""}${value.toFixed(2)}%`;
}

export function formatDuration(since: string | null | undefined) {
  if (!since) return "just crowned";
  const seconds = Math.max(0, Math.floor(Date.now() / 1_000) - Number(since));
  if (seconds < 3_600) return `${Math.max(1, Math.floor(seconds / 60))}m`;
  if (seconds < 86_400) return `${Math.floor(seconds / 3_600)}h ${Math.floor(seconds % 3_600 / 60)}m`;
  return `${Math.floor(seconds / 86_400)}d ${Math.floor(seconds % 86_400 / 3_600)}h`;
}

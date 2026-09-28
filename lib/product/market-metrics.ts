import { formatUnits } from "viem";

import type { IndexedContest } from "@/lib/api/contests";

const marketVersions = {
  1: { b: 270_000, neutralWeight: 98 },
  2: { b: 150_000, neutralWeight: 98 },
  3: { b: 150_000, neutralWeight: 98 },
  4: { b: 150_000, neutralWeight: 98 },
} as const;

export function marketPrices(qAWei: string, qBWei: string, marketVersion = 1) {
  const version = marketVersions[marketVersion as keyof typeof marketVersions];
  if (!version) throw new RangeError(`unsupported market version: ${marketVersion}`);
  if (BigInt(qAWei) === 0n && BigInt(qBWei) === 0n) return [0.01, 0.01] as const;
  const x = Number(formatUnits(BigInt(qAWei), 18)) / version.b;
  const y = Number(formatUnits(BigInt(qBWei), 18)) / version.b;
  const neutral = Math.log(version.neutralWeight);
  const maximum = Math.max(x, y, neutral);
  const a = Math.exp(x - maximum);
  const b = Math.exp(y - maximum);
  const n = Math.exp(neutral - maximum);
  return [a / (a + b + n), b / (a + b + n)] as const;
}

export function marketControl(qAWei: string, qBWei: string, marketVersion = 1) {
  const version = marketVersions[marketVersion as keyof typeof marketVersions];
  if (!version) throw new RangeError(`unsupported market version: ${marketVersion}`);
  const x = Number(formatUnits(BigInt(qAWei), 18)) / version.b;
  const y = Number(formatUnits(BigInt(qBWei), 18)) / version.b;
  const maximum = Math.max(x, y);
  const a = Math.exp(x - maximum);
  const b = Math.exp(y - maximum);
  const sideA = a / (a + b) * 100;
  return [sideA, 100 - sideA] as const;
}

export function contestMetrics(contest: IndexedContest) {
  const market = contest.market;
  const current = market ? marketPrices(market.qAWei, market.qBWei, contest.marketVersion) : [0.01, 0.01] as const;
  const anchor = market?.qA24hAgoWei !== null && market?.qB24hAgoWei !== null && market?.qA24hAgoWei !== undefined && market?.qB24hAgoWei !== undefined
    ? marketPrices(market.qA24hAgoWei, market.qB24hAgoWei, contest.marketVersion)
    : null;
  const changes = current.map((value, side) => anchor?.[side] ? (value / anchor[side] - 1) * 100 : 0) as [number, number];
  const [sideAPercent, sideBPercent] = marketControl(
    market?.qAWei ?? "0",
    market?.qBWei ?? "0",
    contest.marketVersion,
  );
  return { current, changes, sideAPercent, sideBPercent };
}

export function formatUsdc(units: string, signed = false) {
  const amount = Number(formatUnits(BigInt(units), 6));
  const sign = signed && amount > 0 ? "+" : "";
  return `${sign}$${new Intl.NumberFormat("en", { notation: "compact", maximumFractionDigits: 2 }).format(amount)}`;
}

export function formatChange(value: number) {
  if (Number(value.toFixed(2)) === 0) return "flat";
  return `${value >= 0 ? "+" : ""}${value.toFixed(2)}%`;
}

export function formatPriceChange(value: number | null) {
  if (value === null || !Number.isFinite(value)) return "—";
  const rounded = Number(value.toFixed(2));
  return `${rounded > 0 ? "+" : ""}${rounded.toFixed(2)}%`;
}

export function formatDuration(since: string | null | undefined) {
  if (!since) return "just crowned";
  const seconds = Math.max(0, Math.floor(Date.now() / 1_000) - Number(since));
  if (seconds < 3_600) return `${Math.max(1, Math.floor(seconds / 60))}m`;
  if (seconds < 86_400) return `${Math.floor(seconds / 3_600)}h ${Math.floor(seconds % 3_600 / 60)}m`;
  return `${Math.floor(seconds / 86_400)}d ${Math.floor(seconds % 86_400 / 3_600)}h`;
}

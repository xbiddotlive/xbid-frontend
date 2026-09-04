import { formatUnits } from "viem";

import type { IndexedTradePoint } from "@/lib/api/contests";
import { marketControl } from "@/lib/product/market-metrics";

export function compactAddress(value: string) {
  return `${value.slice(0, 8)}…${value.slice(-6)}`;
}

export function eventAction(move: IndexedTradePoint) {
  const kind = move.kind.toLowerCase();
  if (kind.includes("flip")) return "flip";
  if (kind.includes("sell")) return "sell";
  return "buy";
}

export function sideName(side: number) {
  return `side ${side === 0 ? "a" : "b"}`;
}

export function effectiveSide(move: IndexedTradePoint) {
  return eventAction(move) === "buy" ? move.side : 1 - move.side;
}

export function eventTime(timestamp: string) {
  const date = new Date(Number(timestamp) * 1_000);
  const month = new Intl.DateTimeFormat("en-US", { month: "short", timeZone: "UTC" }).format(date);
  const day = new Intl.DateTimeFormat("en-US", { day: "2-digit", timeZone: "UTC" }).format(date);
  const time = new Intl.DateTimeFormat("en-GB", {
    hour: "2-digit", minute: "2-digit", hourCycle: "h23", timeZone: "UTC",
  }).format(date);
  return `${month} ${day} · ${time}`;
}

function controlShare(move: IndexedTradePoint, side: number, marketVersion: number) {
  return marketControl(move.qAAfterWei, move.qBAfterWei, marketVersion)[side === 0 ? 0 : 1];
}

function leader(move: IndexedTradePoint) {
  const a = BigInt(move.qAAfterWei);
  const b = BigInt(move.qBAfterWei);
  return a === b ? null : a > b ? 0 : 1;
}

export function moveLabel(move: IndexedTradePoint) {
  const action = eventAction(move);
  if (action === "flip") return `flipped ${sideName(move.side)} → ${sideName(1 - move.side)}`;
  if (action === "sell") return `trimmed ${sideName(move.side)}`;
  return `backed ${sideName(move.side)}`;
}

export function tokenLabel(move: IndexedTradePoint, symbols: readonly [string, string]) {
  const source = symbols[move.side === 0 ? 0 : 1];
  return eventAction(move) === "flip" ? `${source} → ${symbols[move.side === 0 ? 1 : 0]}` : source;
}

export function moveDetail(move: IndexedTradePoint, symbols: readonly [string, string]) {
  const action = eventAction(move);
  const symbol = symbols[move.side === 0 ? 0 : 1];
  if (action === "flip") return `conviction moved from ${symbol} to ${symbols[move.side === 0 ? 1 : 0]}`;
  return action === "sell" ? `${symbol} position reduced` : `${symbol} conviction added`;
}

export function amountMoved(move: IndexedTradePoint) {
  if (!move.grossUnits) return "verified";
  const value = Number(formatUnits(BigInt(move.grossUnits), 6));
  return `${new Intl.NumberFormat("en", { maximumFractionDigits: 2, notation: value >= 1_000 ? "compact" : "standard" }).format(value)} usdc`;
}

export function amountVerb(move: IndexedTradePoint) {
  const action = eventAction(move);
  return action === "buy" ? "committed" : action === "sell" ? "released" : "rotated";
}

export function battleImpact(move: IndexedTradePoint, previous?: IndexedTradePoint, marketVersion = 1) {
  const supportedSide = effectiveSide(move);
  const currentShare = controlShare(move, supportedSide, marketVersion);
  const detail = `${sideName(supportedSide)} now ${currentShare.toFixed(1)}% control`;
  if (!previous) return { detail, headline: `${currentShare.toFixed(1)}% control`, isLeadMove: false };
  const previousLeader = leader(previous);
  const currentLeader = leader(move);
  if (currentLeader === null && previousLeader !== null) return { detail: "control returned to 50/50", headline: "market reset", isLeadMove: true };
  if (currentLeader === supportedSide && previousLeader !== currentLeader) return { detail, headline: previousLeader === null ? "took the lead" : "lead flipped", isLeadMove: true };
  const change = currentShare - controlShare(previous, supportedSide, marketVersion);
  return { detail, headline: `control ${change >= 0 ? "+" : ""}${change.toFixed(2)}%`, isLeadMove: false };
}

export function usdcValue(value: string) {
  return `$${Number(value).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

export function signedUsdcValue(value: string) {
  const amount = Number(value);
  return `${amount >= 0 ? "+" : "-"}$${Math.abs(amount).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

export function signedPercent(value: number) {
  return `${value >= 0 ? "+" : ""}${value.toFixed(2)}%`;
}

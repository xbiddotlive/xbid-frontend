import { formatUnits } from "viem";

import type { IndexedTradePoint } from "@/lib/api/contests";
import { marketControl } from "@/lib/product/market-metrics";
import type { MessageKey, MessageValues } from "@/lib/i18n/messages";

type Translate = (key: MessageKey, values?: MessageValues) => string;

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

export function eventTime(timestamp: string, locale = "en-US") {
  const date = new Date(Number(timestamp) * 1_000);
  const month = new Intl.DateTimeFormat(locale, { month: "short", timeZone: "UTC" }).format(date);
  const day = new Intl.DateTimeFormat(locale, { day: "2-digit", timeZone: "UTC" }).format(date);
  const time = new Intl.DateTimeFormat(locale, {
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

export function moveLabel(move: IndexedTradePoint, t: Translate) {
  const action = eventAction(move);
  if (action === "flip") return t("battle.flipped", { source: move.side === 0 ? "A" : "B", destination: move.side === 0 ? "B" : "A" });
  if (action === "sell") return t("battle.trimmed", { side: move.side === 0 ? "A" : "B" });
  return t("battle.backed", { side: move.side === 0 ? "A" : "B" });
}

export function tokenLabel(move: IndexedTradePoint, symbols: readonly [string, string]) {
  const source = symbols[move.side === 0 ? 0 : 1];
  return eventAction(move) === "flip" ? `${source} → ${symbols[move.side === 0 ? 1 : 0]}` : source;
}

export function moveDetail(move: IndexedTradePoint, symbols: readonly [string, string], t: Translate) {
  const action = eventAction(move);
  const symbol = symbols[move.side === 0 ? 0 : 1];
  if (action === "flip") return t("battle.convictionMoved", { source: symbol, destination: symbols[move.side === 0 ? 1 : 0] });
  return action === "sell" ? t("battle.positionReduced", { symbol }) : t("battle.convictionAdded", { symbol });
}

export function amountMoved(move: IndexedTradePoint, locale: string, t: Translate) {
  if (!move.grossUnits) return t("battle.verified");
  const value = Number(formatUnits(BigInt(move.grossUnits), 6));
  return `${new Intl.NumberFormat(locale, { maximumFractionDigits: 2, notation: value >= 1_000 ? "compact" : "standard" }).format(value)} usdc`;
}

export function amountVerb(move: IndexedTradePoint, t: Translate) {
  const action = eventAction(move);
  return t(action === "buy" ? "battle.committed" : action === "sell" ? "battle.released" : "battle.rotated");
}

export function battleImpact(move: IndexedTradePoint, previous: IndexedTradePoint | undefined, marketVersion: number, t?: Translate) {
  const supportedSide = effectiveSide(move);
  const currentShare = controlShare(move, supportedSide, marketVersion);
  const detail = t ? t("battle.controlNow", { side: supportedSide === 0 ? "A" : "B", share: currentShare.toFixed(1) }) : `${sideName(supportedSide)} now ${currentShare.toFixed(1)}% control`;
  if (!previous) return { detail, headline: t ? t("battle.control", { share: currentShare.toFixed(1) }) : `${currentShare.toFixed(1)}% control`, isLeadMove: false };
  const previousLeader = leader(previous);
  const currentLeader = leader(move);
  if (currentLeader === null && previousLeader !== null) return { detail: t ? t("battle.resetDetail") : "control returned to 50/50", headline: t ? t("battle.reset") : "market reset", isLeadMove: true };
  if (currentLeader === supportedSide && previousLeader !== currentLeader) return { detail, headline: t ? t(previousLeader === null ? "battle.tookLead" : "battle.leadFlipped") : previousLeader === null ? "took the lead" : "lead flipped", isLeadMove: true };
  const change = currentShare - controlShare(previous, supportedSide, marketVersion);
  const formattedChange = `${change >= 0 ? "+" : ""}${change.toFixed(2)}`;
  return { detail, headline: t ? t("battle.controlChange", { change: formattedChange }) : `control ${formattedChange}%`, isLeadMove: false };
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

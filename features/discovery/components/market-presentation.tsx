"use client";
import { SideLogo } from "@/components/contest/side-logo-pair";
import { MessageIcon } from "@/components/ui/icons";
import type { IndexedContest } from "@/lib/api/contests";
import { contestMetrics, formatPriceChange, formatUsdc } from "@/lib/product/market-metrics";
import { useI18n } from "@/lib/i18n/locale-context";
import type { MessageKey } from "@/lib/i18n/messages";
export type MarketFilter = "trending" | "new" | "close battles" | "comebacks" | "crowned";
export type MarketView = ReturnType<typeof toMarketView>;

export function toMarketView(contest: IndexedContest, clockMinute = 0) {
  const metrics = contestMetrics(contest);
  const market = contest.market;
  const age = (clockMinute ? clockMinute * 60 : Date.now() / 1_000) - Number(contest.createdAt);
  const close = Math.abs(metrics.sideAPercent - 50) <= 5;
  const comeback = Number(market?.leadFlipCount24h ?? "0") > 0;
  const crowned = Boolean(market?.crownActivated);
  const volume = BigInt(market?.volume24hUnits ?? "0");
  const tags: MarketFilter[] = ["trending"];
  if (age >= 0 && age <= 86_400) tags.push("new");
  if (close) tags.push("close battles");
  if (comeback) tags.push("comebacks");
  if (crowned) tags.push("crowned");
  const badge: MessageKey = crowned ? "filter.crowned" : comeback ? "market.badge.leadFlipped" : close ? "market.badge.close" : volume > 0n || age > 86_400 ? "market.badge.active" : "market.badge.new";
  return {
    contest,
    metrics,
    badge,
    tags,
    category: contest.metadata.category.toLowerCase(),
    href: `/contest/${contest.contestId}`,
    flowUnits: (BigInt(market?.sideANetFlow24hUnits ?? "0") + BigInt(market?.sideBNetFlow24hUnits ?? "0")).toString(),
  };
}

export function MarketSide({ market, side }: { market: MarketView; side: 0 | 1 }) {
  const { t } = useI18n();
  const metadata = side === 0 ? market.contest.metadata.sideA : market.contest.metadata.sideB;
  const percent = side === 0 ? market.metrics.sideAPercent : market.metrics.sideBPercent;
  const change = market.metrics.changes[side];
  const changeTone = Number(change.toFixed(2)) === 0 ? "muted" : change < 0 ? "negative" : "positive";
  const tone = side === 0 ? "a" : "b";
  const hasAnchor = market.contest.market?.qA24hAgoWei != null && market.contest.market?.qB24hAgoWei != null;
  const changeLabel = formatPriceChange(hasAnchor ? change : null);
  return <div className="homeMarketSide" data-tone={tone}><div className="marketSideIdentity"><SideLogo imageUrl={metadata.logoUrl} name={metadata.name} tone={tone} /><div className="marketSideCopy"><strong>{metadata.name}</strong><span>${market.metrics.current[side].toFixed(4)}</span></div></div><div className="marketSidePerformance"><b>{percent.toFixed(1)}%</b><em className="priceChange" data-tone={changeTone}>{changeLabel === "flat" ? t("common.flat") : changeLabel} · 24h</em></div></div>;
}

export function CapitalStrip({ market }: { market: MarketView }) {
  const { t } = useI18n();
  const state = market.contest.market;
  const flow = BigInt(market.flowUnits);
  const materialFlow = flow <= -5_000n || flow >= 5_000n;
  const flowTone = !materialFlow ? "muted" : flow < 0n ? "negative" : "positive";
  const flowLabel = materialFlow ? formatUsdc(market.flowUnits, true) : "$0";
  return <div className="marketCapitalStrip featuredCapitalStrip"><div><span>{t("discovery.liquidity")}</span><strong>{formatUsdc(state?.reserveUnits ?? "0")} {t("common.usdc")}</strong></div><div><span title={t("discovery.flowHelp")}>{t("discovery.flow24h")}</span><strong data-tone={flowTone}>{flowLabel}</strong></div><div><span>{t("discovery.volume24h")}</span><strong>{formatUsdc(state?.volume24hUnits ?? "0")}</strong></div><div><span>{t("common.comments")}</span><strong><MessageIcon />{state?.commentCount ?? "0"}</strong></div></div>;
}

"use client";

import Link from "next/link";
import { formatUnits } from "viem";

import { ArrowIcon } from "@/components/ui/icons";
import type { IndexedContest } from "@/lib/api/contests";
import { crownSideIndex } from "@/lib/product/crown";
import { marketControl } from "@/lib/product/market-metrics";
import { useI18n } from "@/lib/i18n/locale-context";
import type { MessageKey } from "@/lib/i18n/messages";
import { DominanceMeter } from "./dominance-meter";
import { StockLabels } from "./stock-labels";
import type { StockReference } from "@/lib/product/stock-catalog";
import { DuelCurve } from "./duel-curve";
import { SideLogoPair } from "./side-logo-pair";

type ContestCardProps = {
  contest: IndexedContest;
  featured?: boolean;
  rank?: number;
  preview?: {
    category: string;
    stocks?: StockReference[];
    sideA: string;
    sideASymbol?: string;
    sideALogoUrl?: string;
    sideB: string;
    sideBSymbol?: string;
    sideBLogoUrl?: string;
    title: string;
  };
};

function compactUsdc(units: string, locale: string) {
  return new Intl.NumberFormat(locale, {
    maximumFractionDigits: 2,
    notation: "compact",
  }).format(Number(formatUnits(BigInt(units), 6)));
}

export function ContestCard({ contest, featured = false, preview, rank = 1 }: ContestCardProps) {
  const { locale, t } = useI18n();
  const [sideAPercent, sideBPercent] = marketControl(
    contest.market?.qAWei ?? "0",
    contest.market?.qBWei ?? "0",
    contest.marketVersion,
  );
  const market = contest.market;
  const completeHistory = market ? BigInt(market.tradeCount) === BigInt(market.history.length) : false;
  const title = preview?.title || contest.metadata.title;
  const category = preview?.category || contest.metadata.category;
  const categoryKey = `category.${category.toLowerCase()}` as MessageKey;
  const sideA = preview?.sideA || contest.metadata.sideA.name;
  const sideB = preview?.sideB || contest.metadata.sideB.name;
  const href = preview ? "/launch" : `/contest/${contest.contestId}`;
  const crownSide = crownSideIndex(market?.crownSide ?? null);

  return (
    <article
      className={featured ? "contestCard contestCardFeatured" : "contestCard"}
      data-testid="contest-card"
    >
      <Link className="contestCardLead" href={href} tabIndex={preview ? -1 : undefined}>
        <span className="rankStamp">#{String(rank).padStart(2, "0")}</span>
        <SideLogoPair sideA={{ imageUrl: preview?.sideALogoUrl ?? contest.metadata.sideA.logoUrl, name: sideA }} sideB={{ imageUrl: preview?.sideBLogoUrl ?? contest.metadata.sideB.logoUrl, name: sideB }} />
      </Link>
      <div className="contestCardBody">
        <div className="contestMeta">
          <span className={preview ? "previewBadge" : "liveBadge"}>{preview ? t("common.preview") : t("common.live")}</span>
          <span>{t(categoryKey)}</span>
          <span>{t("market.version", { version: contest.marketVersion })}</span>
        </div>
        <Link href={href} tabIndex={preview ? -1 : undefined}><h3>{title.toLowerCase()}</h3></Link>
        <StockLabels category={category} stocks={preview ? preview.stocks : contest.metadata.stocks} />
        <DuelCurve compact history={market?.history ?? []} includeOrigin={completeHistory} marketVersion={contest.marketVersion} />
        <div className="cardSides">
          <span><i className="sideToken sideTokenA">a</i><b>{sideA.toLowerCase()}{preview?.sideASymbol ? ` · ${preview.sideASymbol.toLowerCase()}` : ""}</b><strong>{sideAPercent.toFixed(1)}%</strong></span>
          <span><i className="sideToken sideTokenB">b</i><b>{sideB.toLowerCase()}{preview?.sideBSymbol ? ` · ${preview.sideBSymbol.toLowerCase()}` : ""}</b><strong>{sideBPercent.toFixed(1)}%</strong></span>
        </div>
        <DominanceMeter sideAPercent={sideAPercent} sideBPercent={sideBPercent} />
        <div className="sideActions" aria-label={`${t("common.sideA")} / ${t("common.sideB")}`}>
          <Link className="sideActionA" href={`${href}?trade=buy&side=a`}>{t("market.back", { side: sideA.toLowerCase() })}</Link>
          <Link className="sideActionB" href={`${href}?trade=buy&side=b`}>{t("market.back", { side: sideB.toLowerCase() })}</Link>
        </div>
        <div className="contestStats">
          <span>{t("market.reserve", { amount: compactUsdc(market?.reserveUnits ?? "0", locale) })}</span>
          <span>{t("market.volume", { amount: compactUsdc(market?.cumulativeVolumeUnits ?? "0", locale) })}</span>
          <span>{t("market.tradeCount", { count: market?.tradeCount ?? "0" })}</span>
          <span>{market?.crownActivated && crownSide !== null ? t("market.crownSide", { side: crownSide === 0 ? "a" : "b" }) : t("market.crownOpen")}</span>
        </div>
      </div>
      <Link className="cardArrow" href={href} aria-label={t("market.openContest")}><ArrowIcon /></Link>
    </article>
  );
}

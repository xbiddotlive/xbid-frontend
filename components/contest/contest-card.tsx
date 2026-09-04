import Link from "next/link";
import { formatUnits } from "viem";

import { ArrowIcon } from "@/components/ui/icons";
import type { IndexedContest } from "@/lib/api/contests";
import { crownSideIndex } from "@/lib/product/crown";
import { marketControl } from "@/lib/product/market-metrics";
import { DominanceMeter } from "./dominance-meter";
import { DuelCurve } from "./duel-curve";
import { SideLogoPair } from "./side-logo-pair";

type ContestCardProps = {
  contest: IndexedContest;
  featured?: boolean;
  rank?: number;
  preview?: {
    category: string;
    sideA: string;
    sideASymbol?: string;
    sideALogoUrl?: string;
    sideB: string;
    sideBSymbol?: string;
    sideBLogoUrl?: string;
    title: string;
  };
};

function compactUsdc(units: string) {
  return new Intl.NumberFormat("en", {
    maximumFractionDigits: 2,
    notation: "compact",
  }).format(Number(formatUnits(BigInt(units), 6)));
}

export function ContestCard({ contest, featured = false, preview, rank = 1 }: ContestCardProps) {
  const [sideAPercent, sideBPercent] = marketControl(
    contest.market?.qAWei ?? "0",
    contest.market?.qBWei ?? "0",
    contest.marketVersion,
  );
  const market = contest.market;
  const title = preview?.title || contest.metadata.title;
  const category = preview?.category || contest.metadata.category;
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
          <span className={preview ? "previewBadge" : "liveBadge"}>{preview ? "preview" : "live"}</span>
          <span>{category.toLowerCase()}</span>
          <span>market v{contest.marketVersion}</span>
        </div>
        <Link href={href} tabIndex={preview ? -1 : undefined}><h3>{title.toLowerCase()}</h3></Link>
        <DuelCurve compact history={market?.history ?? []} marketVersion={contest.marketVersion} />
        <div className="cardSides">
          <span><i className="sideToken sideTokenA">a</i><b>{sideA.toLowerCase()}{preview?.sideASymbol ? ` · ${preview.sideASymbol.toLowerCase()}` : ""}</b><strong>{sideAPercent.toFixed(1)}%</strong></span>
          <span><i className="sideToken sideTokenB">b</i><b>{sideB.toLowerCase()}{preview?.sideBSymbol ? ` · ${preview.sideBSymbol.toLowerCase()}` : ""}</b><strong>{sideBPercent.toFixed(1)}%</strong></span>
        </div>
        <DominanceMeter sideAPercent={sideAPercent} sideBPercent={sideBPercent} />
        <div className="sideActions" aria-label="contest sides">
          <Link className="sideActionA" href={`${href}?trade=buy&side=a`}>back {sideA.toLowerCase()}</Link>
          <Link className="sideActionB" href={`${href}?trade=buy&side=b`}>back {sideB.toLowerCase()}</Link>
        </div>
        <div className="contestStats">
          <span>{compactUsdc(market?.reserveUnits ?? "0")} usdc reserve</span>
          <span>{compactUsdc(market?.cumulativeVolumeUnits ?? "0")} usdc volume</span>
          <span>{market?.tradeCount ?? "0"} trades</span>
          <span>{market?.crownActivated && crownSide !== null ? `crown · side ${crownSide === 0 ? "a" : "b"}` : "crown open"}</span>
        </div>
      </div>
      <Link className="cardArrow" href={href} aria-label="open contest"><ArrowIcon /></Link>
    </article>
  );
}

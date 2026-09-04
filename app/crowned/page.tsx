import Link from "next/link";

import { CrownIcon, MessageIcon } from "@/components/ui/icons";
import { listContests } from "@/lib/api/contests";
import { robinhoodTestnet } from "@/lib/blockchain/chain";
import { I18nText } from "@/lib/i18n/locale-context";
import type { MessageKey } from "@/lib/i18n/messages";
import { crownSideIndex } from "@/lib/product/crown";
import { contestMetrics, formatDuration, formatUsdc } from "@/lib/product/market-metrics";
import { pageMetadata } from "@/lib/seo/site";

export const metadata = pageMetadata({
  title: "crowned contests",
  description: "See the strongest live XBID leaders, crown control time, liquidity and confirmed 24-hour volume.",
  path: "/crowned",
});

export const dynamic = "force-dynamic";

export default async function CrownedPage() {
  const contests = await listContests(robinhoodTestnet.id).catch(() => []);
  const crowned = contests
    .filter((contest) => contest.market?.crownActivated && contest.market.crownSide !== null)
    .sort((a, b) => BigInt(b.market?.volume24hUnits ?? "0") > BigInt(a.market?.volume24hUnits ?? "0") ? 1 : -1);
  const liquidity = crowned.reduce((total, contest) => total + BigInt(contest.market?.reserveUnits ?? "0"), 0n);
  const volume = crowned.reduce((total, contest) => total + BigInt(contest.market?.volume24hUnits ?? "0"), 0n);
  const longest = crowned.reduce<string | null>((oldest, contest) => {
    const since = contest.market?.crownSince;
    if (!since) return oldest;
    return oldest === null || BigInt(since) < BigInt(oldest) ? since : oldest;
  }, null);

  return <main className="pageShell utilityPage">
    <header className="pageHeader crownHeader"><CrownIcon /><div><p className="eyebrow"><I18nText id="crowned.eyebrow" /></p><h1><I18nText id="crowned.title" /></h1><span><I18nText id="crowned.description" /></span></div></header>
    <section className="crownedSummary"><div><span><I18nText id="crowned.active" /></span><strong>{crowned.length}</strong></div><div><span><I18nText id="crowned.liquidity" /></span><strong>{formatUsdc(liquidity.toString())} usdc</strong></div><div><span><I18nText id="crowned.volume" /></span><strong>{formatUsdc(volume.toString())}</strong></div><div><span><I18nText id="crowned.longest" /></span><strong>{formatDuration(longest)}</strong></div></section>
    <div className="crownedGrid">
      {crowned.map((contest, index) => {
        const market = contest.market!;
        const metrics = contestMetrics(contest);
        const holderSide = crownSideIndex(market.crownSide);
        if (holderSide === null) return null;
        const holder = holderSide === 0 ? contest.metadata.sideA : contest.metadata.sideB;
        const opponent = holderSide === 0 ? contest.metadata.sideB : contest.metadata.sideA;
        const control = holderSide === 0 ? metrics.sideAPercent : metrics.sideBPercent;
        return <article className="crownedCard" key={contest.contestId}>
          <header><span>#{String(index + 1).padStart(2, "0")}</span><div><p><I18nText id={`category.${contest.metadata.category}` as MessageKey} /></p><h2>{contest.metadata.title}</h2></div><span className="crownedBadge"><CrownIcon /><I18nText id="contest.crowned" /></span></header>
          <div className="crownedControl"><div><span><I18nText id="crowned.holder" /></span><strong>{holder.name}</strong></div><strong><I18nText id="crowned.control" values={{ value: control.toFixed(1) }} /></strong><div><span><I18nText id="crowned.opponent" /></span><strong>{opponent.name}</strong></div></div>
          <progress className="crownedTrack" max="100" value={control}>{control.toFixed(1)}%</progress>
          <div className="crownedMetrics"><div><span><I18nText id="portfolio.liquidity" /></span><strong>{formatUsdc(market.reserveUnits)} usdc</strong></div><div><span><I18nText id="contest.volume24h" /></span><strong>{formatUsdc(market.volume24hUnits)}</strong></div><div><span><I18nText id="crowned.controlTime" /></span><strong>{formatDuration(market.crownSince)}</strong></div><div><span><I18nText id="common.comments" /></span><strong><MessageIcon />{market.commentCount}</strong></div></div>
          <Link href={`/contest/${contest.contestId}`}><I18nText id="crowned.open" /></Link>
        </article>;
      })}
    </div>
    {crowned.length === 0 && <div className="terminalEmpty"><strong><I18nText id="crowned.empty" /></strong><span><I18nText id="crowned.emptyDescription" /></span></div>}
  </main>;
}

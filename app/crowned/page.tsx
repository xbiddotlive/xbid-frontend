import Link from "next/link";

import { CrownIcon, MessageIcon } from "@/components/ui/icons";
import { listContests } from "@/lib/api/contests";
import { robinhoodTestnet } from "@/lib/blockchain/chain";
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
    <header className="pageHeader crownHeader"><CrownIcon /><div><p className="eyebrow">reigning markets · live testnet</p><h1>crowned</h1><span>the strongest live leaders ranked by confirmed 24h volume.</span></div></header>
    <section className="crownedSummary"><div><span>active crowns</span><strong>{crowned.length}</strong></div><div><span>crowned liquidity</span><strong>{formatUsdc(liquidity.toString())} usdc</strong></div><div><span>24h crown volume</span><strong>{formatUsdc(volume.toString())}</strong></div><div><span>longest control</span><strong>{formatDuration(longest)}</strong></div></section>
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
          <header><span>#{String(index + 1).padStart(2, "0")}</span><div><p>{contest.metadata.category}</p><h2>{contest.metadata.title}</h2></div><span className="crownedBadge"><CrownIcon />crowned</span></header>
          <div className="crownedControl"><div><span>crown holder</span><strong>{holder.name}</strong></div><strong>{control.toFixed(1)}% control</strong><div><span>opposing side</span><strong>{opponent.name}</strong></div></div>
          <progress className="crownedTrack" max="100" value={control}>{control.toFixed(1)}% control</progress>
          <div className="crownedMetrics"><div><span>liquidity</span><strong>{formatUsdc(market.reserveUnits)} usdc</strong></div><div><span>24h volume</span><strong>{formatUsdc(market.volume24hUnits)}</strong></div><div><span>control time</span><strong>{formatDuration(market.crownSince)}</strong></div><div><span>comments</span><strong><MessageIcon />{market.commentCount}</strong></div></div>
          <Link href={`/contest/${contest.contestId}`}>open crowned contest ↗</Link>
        </article>;
      })}
    </div>
    {crowned.length === 0 && <div className="terminalEmpty"><strong>no active crowns yet</strong><span>a crown appears after a side holds the protocol&apos;s onchain lead threshold.</span></div>}
  </main>;
}

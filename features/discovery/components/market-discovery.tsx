"use client";

import Link from "next/link";
import { useMemo, useRef, useState } from "react";

import { SideLogo } from "@/components/contest/side-logo-pair";
import { ChevronIcon, CompassIcon, GridIcon, ListIcon, MessageIcon } from "@/components/ui/icons";
import type { IndexedContest } from "@/lib/api/contests";
import { networkLabel } from "@/lib/blockchain/chain";
import { contestCategories, type ContestCategory } from "@/lib/product/contest-categories";
import { contestMetrics, formatChange, formatUsdc } from "@/lib/product/market-metrics";

type ViewMode = "list" | "grid";
type MarketFilter = "trending" | "new" | "close battles" | "comebacks" | "crowned";
type DiscoveryFilter = MarketFilter | ContestCategory;
type MarketView = ReturnType<typeof toMarketView>;

const filters: MarketFilter[] = ["trending", "new", "close battles", "comebacks", "crowned"];

function Sparkline({ points }: { points: string }) {
  return <svg aria-hidden="true" className="homeSparkline" viewBox="0 0 40 24"><polyline points={points} /></svg>;
}

function BattleBar({ sideAPercent }: { sideAPercent: number }) {
  return <div className="homeBattleBar" role="img" aria-label={`side a ${sideAPercent.toFixed(1)}%, side b ${(100 - sideAPercent).toFixed(1)}%`}><progress max="100" value={sideAPercent}>side a {sideAPercent.toFixed(1)}%</progress></div>;
}

function toMarketView(contest: IndexedContest) {
  const metrics = contestMetrics(contest);
  const market = contest.market;
  const age = Date.now() / 1_000 - Number(contest.createdAt);
  const close = Math.abs(metrics.sideAPercent - 50) <= 5;
  const comeback = Number(market?.leadFlipCount24h ?? "0") > 0;
  const crowned = Boolean(market?.crownActivated);
  const volume = BigInt(market?.volume24hUnits ?? "0");
  const tags: MarketFilter[] = ["trending"];
  if (age <= 86_400) tags.push("new");
  if (close) tags.push("close battles");
  if (comeback) tags.push("comebacks");
  if (crowned) tags.push("crowned");
  const badge = crowned ? "crowned" : comeback ? "lead flipped" : close ? "close battle" : volume > 0n ? "active" : "new market";
  return {
    contest,
    metrics,
    badge,
    badges: [badge, `${market?.tradeCount24h ?? "0"} trades · 24h`, `${market?.uniqueTraders24h ?? "0"} traders`],
    tags,
    category: contest.metadata.category.toLowerCase(),
    href: `/contest/${contest.contestId}`,
    flowUnits: (BigInt(market?.sideANetFlow24hUnits ?? "0") + BigInt(market?.sideBNetFlow24hUnits ?? "0")).toString(),
  };
}

function MarketSide({ market, side }: { market: MarketView; side: 0 | 1 }) {
  const metadata = side === 0 ? market.contest.metadata.sideA : market.contest.metadata.sideB;
  const percent = side === 0 ? market.metrics.sideAPercent : market.metrics.sideBPercent;
  const change = market.metrics.changes[side];
  const changeTone = Number(change.toFixed(2)) === 0 ? "muted" : change < 0 ? "negative" : "positive";
  const tone = side === 0 ? "a" : "b";
  return <div className="homeMarketSide" data-tone={tone}><div className="marketSideIdentity"><SideLogo imageUrl={metadata.logoUrl} name={metadata.name} tone={tone} /><div className="marketSideCopy"><strong>{metadata.name}</strong><span>${market.metrics.current[side].toFixed(4)}</span></div></div><div className="marketSidePerformance"><b>{percent.toFixed(1)}%</b><em className="priceChange" data-tone={changeTone}>{formatChange(change)} · 24h</em></div></div>;
}

function CapitalStrip({ market }: { market: MarketView }) {
  const state = market.contest.market;
  const flow = BigInt(market.flowUnits);
  const materialFlow = flow <= -5_000n || flow >= 5_000n;
  const flowTone = !materialFlow ? "muted" : flow < 0n ? "negative" : "positive";
  const flowLabel = materialFlow ? formatUsdc(market.flowUnits, true) : "$0";
  return <div className="marketCapitalStrip featuredCapitalStrip"><div><span>liquidity</span><strong>{formatUsdc(state?.reserveUnits ?? "0")} usdc</strong></div><div><span title="net settlement value added to the market during the last 24 hours">24h flow</span><strong data-tone={flowTone}>{flowLabel}</strong></div><div><span>24h volume</span><strong>{formatUsdc(state?.volume24hUnits ?? "0")}</strong></div><div><span>comments</span><strong><MessageIcon />{state?.commentCount ?? "0"}</strong></div></div>;
}

function MarketCard({ market }: { market: MarketView }) {
  return <article className="homeMarketCard"><Link className="homeMarketCardOpen" href={market.href}><span className="visuallyHidden">open {market.contest.metadata.title}</span></Link><header><h3>{market.contest.metadata.title}</h3><span className="marketSignal">{market.badge}</span></header><div className="homeCardSides"><Link aria-label={`back ${market.contest.metadata.sideA.name}`} href={`${market.href}?trade=buy&side=a`}><MarketSide market={market} side={0} /></Link><Link aria-label={`back ${market.contest.metadata.sideB.name}`} href={`${market.href}?trade=buy&side=b`}><MarketSide market={market} side={1} /></Link></div><CapitalStrip market={market} /></article>;
}

export function MarketDiscovery({ contests, apiAvailable }: { contests: IndexedContest[]; apiAvailable: boolean }) {
  const [filter, setFilter] = useState<DiscoveryFilter>("trending");
  const [view, setView] = useState<ViewMode>("grid");
  const [featuredIndex, setFeaturedIndex] = useState(0);
  const featuredTouchStart = useRef<number | null>(null);
  const markets = useMemo(() => contests.filter((contest) => contest.market).map(toMarketView), [contests]);
  const featured = useMemo(() => [...markets].sort((a, b) => BigInt(b.contest.market?.volume24hUnits ?? "0") > BigInt(a.contest.market?.volume24hUnits ?? "0") ? 1 : -1).slice(0, 5), [markets]);
  const visibleMarkets = useMemo(() => markets.filter((market) => filters.includes(filter as MarketFilter) ? market.tags.includes(filter as MarketFilter) : market.category === filter), [markets, filter]);
  const featuredMarket = featured[featuredIndex % Math.max(featured.length, 1)];
  const showFeatured = (step: number) => featured.length > 0 && setFeaturedIndex((current) => (current + step + featured.length) % featured.length);
  const totalVolume = markets.reduce((total, item) => total + BigInt(item.contest.market?.cumulativeVolumeUnits ?? "0"), 0n);
  const volume24h = markets.reduce((total, item) => total + BigInt(item.contest.market?.volume24hUnits ?? "0"), 0n);
  const trades24h = markets.reduce((total, item) => total + BigInt(item.contest.market?.tradeCount24h ?? "0"), 0n);
  const flips24h = markets.reduce((total, item) => total + BigInt(item.contest.market?.leadFlipCount24h ?? "0"), 0n);
  const comments = markets.reduce((total, item) => total + BigInt(item.contest.market?.commentCount ?? "0"), 0n);
  const stats = [
    { label: "total volume", value: formatUsdc(totalVolume.toString()), change: "all time" },
    { label: "live contests", value: String(markets.length), change: "testnet" },
    { label: "24h volume", value: formatUsdc(volume24h.toString()), change: "confirmed" },
    { label: "24h trades", value: trades24h.toString(), change: "onchain" },
    { label: "lead flips", value: flips24h.toString(), change: "24h" },
    { label: "comments", value: comments.toString(), change: "verified" },
  ];

  return <>
    <section className="homeIntro">
      <div className="homeIntroLead"><span aria-hidden="true" className="homeIntroIcon"><CompassIcon /></span><div><p className="eyebrow">the live contest market</p><h1>where money decides who&apos;s winning.</h1></div></div>
      <div className="homeIntroStatus"><div><span className="livePulse" /><strong>{apiAvailable ? `${markets.length} contests live` : "market reconnecting"}</strong></div><span>{trades24h.toString()} trades · 24h · {networkLabel}</span></div>
    </section>
    <section className="homeStats" aria-label="live protocol stats">{stats.map((stat, index) => <article key={stat.label}><div><span>{stat.label}</span><strong>{stat.value}</strong></div><div><Sparkline points={index % 2 ? "1,20 9,17 17,18 25,10 32,12 39,4" : "1,18 9,16 17,17 25,11 32,13 39,5"} /><b>{stat.change}</b></div></article>)}</section>

    {featuredMarket ? (
      <section aria-label="featured contests" aria-roledescription="carousel" className="featuredCarousel">
        <div className="featuredCarouselToolbar">
          <strong>featured contest</strong>
          <div className="featuredCarouselControls">
            <span>{String(featuredIndex + 1).padStart(2, "0")} / {String(featured.length).padStart(2, "0")}</span>
            <button aria-label="previous featured contest" onClick={() => showFeatured(-1)} type="button"><ChevronIcon /></button>
            <button aria-label="next featured contest" onClick={() => showFeatured(1)} type="button"><ChevronIcon /></button>
          </div>
        </div>
        <article className="featuredBattle featuredSlide" key={featuredMarket.contest.contestId} onTouchEnd={(event) => { const end = event.changedTouches[0]?.clientX; if (featuredTouchStart.current !== null && end !== undefined && Math.abs(end - featuredTouchStart.current) > 44) showFeatured(end > featuredTouchStart.current ? -1 : 1); featuredTouchStart.current = null; }} onTouchStart={(event) => { featuredTouchStart.current = event.touches[0]?.clientX ?? null; }}>
          <div className="featuredCopy" aria-live="polite">
            <div className="featuredBadges">{featuredMarket.badges.map((badge) => <span key={badge}>{badge}</span>)}</div>
            <h2><Link href={featuredMarket.href}>{featuredMarket.contest.metadata.title}</Link></h2>
            <p>{featuredMarket.contest.metadata.description || "a live two-sided market settled entirely onchain."}</p>
            <div className="featuredSides">
              <Link href={`${featuredMarket.href}?trade=buy&side=a`}><MarketSide market={featuredMarket} side={0} /></Link>
              <Link href={`${featuredMarket.href}?trade=buy&side=b`}><MarketSide market={featuredMarket} side={1} /></Link>
            </div>
            <BattleBar sideAPercent={featuredMarket.metrics.sideAPercent} />
            <CapitalStrip market={featuredMarket} />
          </div>
          <aside className="marketSetup">
            <p className="eyebrow">live market</p>
            <div><span>24h traders</span><strong>{featuredMarket.contest.market?.uniqueTraders24h ?? "0"}</strong></div>
            <div><span>atomic flips</span><strong>{featuredMarket.contest.market?.atomicFlipCount24h ?? "0"}</strong></div>
            <div className="setupActions">
              <Link href={`${featuredMarket.href}?trade=buy&side=a`}>back {featuredMarket.contest.metadata.sideA.name}</Link>
              <Link href={`${featuredMarket.href}?trade=buy&side=b`}>back {featuredMarket.contest.metadata.sideB.name}</Link>
            </div>
            <span>live prices only. returns are never guaranteed.</span>
          </aside>
        </article>
      </section>
    ) : <div className="emptyState"><strong>{apiAvailable ? "no live contests yet" : "market data is reconnecting"}</strong><span>{apiAvailable ? "launch the first testnet contest to start the market." : "the indexer did not return a valid response."}</span>{apiAvailable && <Link href="/launch">launch contest ↗</Link>}</div>}

    <section className="homeMarkets" aria-labelledby="all-markets-heading"><div className="homeMarketToolbar"><div className="marketFilters homeCategoryRail" aria-label="filter contests">{filters.map((item) => <button aria-pressed={filter === item} key={item} onClick={() => setFilter(item)} type="button">{item}</button>)}<i aria-hidden="true" className="categoryDivider" />{contestCategories.map((item) => <button aria-pressed={filter === item.value} key={item.value} onClick={() => setFilter(item.value)} type="button">{item.label}</button>)}</div><div className="viewToggle" aria-label="market layout"><button aria-pressed={view === "list"} onClick={() => setView("list")} type="button"><ListIcon />list</button><button aria-pressed={view === "grid"} onClick={() => setView("grid")} type="button"><GridIcon />cards</button></div></div><h2 className="visuallyHidden" id="all-markets-heading">all contests</h2><div className="homeMarketGrid" data-view={view}>{visibleMarkets.map((market) => <MarketCard key={market.contest.contestId} market={market} />)}</div>{markets.length > 0 && visibleMarkets.length === 0 && <div className="emptyState"><strong>no live contests match this view</strong><span>choose another market signal.</span></div>}</section>
    <section className="realMarketStrip"><div><span className="livePulse" /><strong>{networkLabel}</strong><span>{apiAvailable ? "verified indexer connected" : "indexer reconnecting"}</span></div><span>{formatUsdc(totalVolume.toString())} cumulative</span><span>{markets.reduce((total, item) => total + BigInt(item.contest.market?.tradeCount ?? "0"), 0n).toString()} verified trades</span></section>
  </>;
}

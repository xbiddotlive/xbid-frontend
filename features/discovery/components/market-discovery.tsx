"use client";

import Link from "next/link";
import { memo, useEffect, useMemo, useState } from "react";
import { DiscoverySpotlight } from "./discovery-spotlight";

import dynamic from "next/dynamic";
import { MarketSide, CapitalStrip, toMarketView, type MarketView, type MarketFilter } from "./market-presentation";
import { reconcileContests, paginate } from "@/lib/product/discovery-snapshot";
import { DiscoveryPager } from "./discovery-pager";
import { I18nText } from "@/lib/i18n/locale-context";
import { CompassIcon, GridIcon, ListIcon } from "@/components/ui/icons";
import { listContests, type IndexedContest } from "@/lib/api/contests";
import { robinhoodTestnet as activeChain } from "@/lib/blockchain/chain";
import { contestCategories, type ContestCategory } from "@/lib/product/contest-categories";
import { formatUsdc } from "@/lib/product/market-metrics";
import { useI18n } from "@/lib/i18n/locale-context";
import type { MessageKey } from "@/lib/i18n/messages";

const FeaturedContests = dynamic(() => import("./featured-contests"), { loading: () => <div className="emptyState" role="status"><I18nText id="common.loadingPage" /></div> });

type ViewMode = "list" | "grid";
type DiscoveryFilter = MarketFilter | ContestCategory;

const filters: MarketFilter[] = ["trending", "new", "close battles", "comebacks", "crowned"];
const filterMessages: Record<MarketFilter, MessageKey> = {
  trending: "filter.trending",
  new: "filter.new",
  "close battles": "filter.close",
  comebacks: "filter.comebacks",
  crowned: "filter.crowned",
};
const categoryMessages: Record<ContestCategory, MessageKey> = {
  crypto: "category.crypto", sports: "category.sports", politics: "category.politics",
  finance: "category.finance", technology: "category.technology", culture: "category.culture", other: "category.other",
};

function Sparkline({ points }: { points: string }) {
  return <svg aria-hidden="true" className="homeSparkline" viewBox="0 0 40 24"><polyline points={points} /></svg>;
}

const MarketCard = memo(function MarketCard({ market }: { market: MarketView }) {
  const { t } = useI18n();
  return <article className="homeMarketCard"><Link className="homeMarketCardOpen" href={market.href}><span className="visuallyHidden">{t("market.open", { title: market.contest.metadata.title })}</span></Link><header><h3>{market.contest.metadata.title}</h3><span className="marketSignal" data-crowned={market.badge === "filter.crowned"}>{t(market.badge)}</span></header><div className="homeCardSides"><Link aria-label={t("market.back", { side: market.contest.metadata.sideA.name })} href={`${market.href}?trade=buy&side=a`}><MarketSide market={market} side={0} /></Link><Link aria-label={t("market.back", { side: market.contest.metadata.sideB.name })} href={`${market.href}?trade=buy&side=b`}><MarketSide market={market} side={1} /></Link></div><CapitalStrip market={market} /></article>;
}, (previous, next) => previous.market.contest === next.market.contest && previous.market.badge === next.market.badge);

export function MarketDiscovery({ contests: initialContests, apiAvailable: initialApiAvailable }: { contests: IndexedContest[]; apiAvailable: boolean }) {
  const { t } = useI18n();
  const [snapshot, setSnapshot] = useState({ contests: initialContests, apiAvailable: initialApiAvailable });
  const [clockMinute, setClockMinute] = useState(0);
  const { contests, apiAvailable } = snapshot;
  useEffect(() => {
    let disposed = false;
    let pending = false;
    const refresh = async () => {
      if (document.hidden || pending) return;
      pending = true;
      try {
        const latest = await listContests(activeChain.id);
        if (!disposed) setSnapshot((previous) => {
          const merged = reconcileContests(previous.contests, latest);
          return merged === previous.contests && previous.apiAvailable ? previous : { contests: merged, apiAvailable: true };
        });
      } catch {
        if (!disposed) setSnapshot((previous) => ({ ...previous, apiAvailable: false }));
      } finally {
        pending = false;
        // Time-based filters still expire when the indexed data is unchanged.
        if (!disposed) setClockMinute(Math.floor(Date.now() / 60_000));
      }
    };
    const interval = window.setInterval(refresh, 15_000);
    document.addEventListener("visibilitychange", refresh);
    if (!initialApiAvailable) void refresh();
    return () => { disposed = true; window.clearInterval(interval); document.removeEventListener("visibilitychange", refresh); };
  }, [initialApiAvailable]);
  const [filter, setFilter] = useState<DiscoveryFilter>("trending");
  const [view, setView] = useState<ViewMode>("grid");
  const [page, setPage] = useState(0);
  const markets = useMemo(() => contests.filter((contest) => contest.market).map((contest) => toMarketView(contest, clockMinute)), [contests, clockMinute]);
  const featured = useMemo(() => [...markets].sort((a, b) => {
    const left = BigInt(a.contest.market?.volume24hUnits ?? "0");
    const right = BigInt(b.contest.market?.volume24hUnits ?? "0");
    return left === right ? 0 : left > right ? -1 : 1;
  }).slice(0, 5), [markets]);
  const visibleMarkets = useMemo(() => markets.filter((market) => filters.includes(filter as MarketFilter) ? market.tags.includes(filter as MarketFilter) : market.category === filter), [markets, filter]);
  const cardPage = paginate(visibleMarkets, page, 12);
  const featuredMarket = featured[0];
  const totalVolume = markets.reduce((total, item) => total + BigInt(item.contest.market?.cumulativeVolumeUnits ?? "0"), 0n);
  const volume24h = markets.reduce((total, item) => total + BigInt(item.contest.market?.volume24hUnits ?? "0"), 0n);
  const trades24h = markets.reduce((total, item) => total + BigInt(item.contest.market?.tradeCount24h ?? "0"), 0n);
  const flips24h = markets.reduce((total, item) => total + BigInt(item.contest.market?.leadFlipCount24h ?? "0"), 0n);
  const comments = markets.reduce((total, item) => total + BigInt(item.contest.market?.commentCount ?? "0"), 0n);
  const stats = [
    { label: t("discovery.totalVolume"), value: formatUsdc(totalVolume.toString()), change: t("common.allTime") },
    { label: t("discovery.liveContests"), value: String(markets.length), change: t("common.testnet") },
    { label: t("discovery.volume24h"), value: formatUsdc(volume24h.toString()), change: t("common.confirmed") },
    { label: t("discovery.trades24h"), value: trades24h.toString(), change: t("common.onchain") },
    { label: t("discovery.leadFlips"), value: flips24h.toString(), change: "24h" },
    { label: t("common.comments"), value: comments.toString(), change: t("common.verified") },
  ];

  return <>
    <section className="homeIntro">
      <div className="homeIntroLead"><span aria-hidden="true" className="homeIntroIcon"><CompassIcon /></span><div><p className="eyebrow">{t("discovery.eyebrow")}</p><h1>{t("discovery.headline")}</h1></div></div>
      <div className="homeIntroStatus"><div><span className="livePulse" /><strong>{apiAvailable ? t("discovery.contestsLive", { count: markets.length }) : t("discovery.reconnecting")}</strong></div><span>{t("discovery.status", { count: trades24h.toString(), network: t("chain.testnet") })}</span></div>
    </section>
    <section className="homeStats" aria-label={t("discovery.protocolStats")}>{stats.map((stat, index) => <article key={stat.label}><div><span>{stat.label}</span><strong>{stat.value}</strong></div><div><Sparkline points={index % 2 ? "1,20 9,17 17,18 25,10 32,12 39,4" : "1,18 9,16 17,17 25,11 32,13 39,5"} /><b>{stat.change}</b></div></article>)}</section>

    {featuredMarket ? (
      <DiscoverySpotlight contests={contests} apiAvailable={apiAvailable}>
        <FeaturedContests featured={featured} />
      </DiscoverySpotlight>
    ) : <div className="emptyState"><strong>{apiAvailable ? t("discovery.noContests") : t("discovery.noData")}</strong><span>{apiAvailable ? t("discovery.launchFirst") : t("discovery.invalidResponse")}</span>{apiAvailable && <Link href="/launch">{t("discovery.launchContest")}</Link>}</div>}

    <section className="homeMarkets" aria-labelledby="all-markets-heading"><div className="homeMarketToolbar"><div className="marketFilters homeCategoryRail" aria-label={t("discovery.filter")}>{filters.map((item) => <button aria-pressed={filter === item} key={item} onClick={() => { setFilter(item); setPage(0); }} type="button">{t(filterMessages[item])}</button>)}<i aria-hidden="true" className="categoryDivider" />{contestCategories.map((item) => <button aria-pressed={filter === item.value} key={item.value} onClick={() => { setFilter(item.value); setPage(0); }} type="button">{t(categoryMessages[item.value])}</button>)}</div><div className="viewToggle" aria-label={t("discovery.layout")}><button aria-pressed={view === "list"} onClick={() => setView("list")} type="button"><ListIcon />{t("discovery.list")}</button><button aria-pressed={view === "grid"} onClick={() => setView("grid")} type="button"><GridIcon />{t("discovery.cards")}</button></div></div><h2 className="visuallyHidden" id="all-markets-heading">{t("discovery.allContests")}</h2><div className="homeMarketGrid" data-view={view}>{cardPage.items.map((market) => <MarketCard key={market.contest.contestId} market={market} />)}</div><DiscoveryPager page={cardPage.page} pages={cardPage.pages} onChange={setPage} />{markets.length > 0 && visibleMarkets.length === 0 && <div className="emptyState"><strong>{t("discovery.noMatch")}</strong><span>{t("discovery.chooseSignal")}</span></div>}</section>
    <section className="realMarketStrip"><div><span className="livePulse" /><strong>{t("chain.testnet")}</strong><span>{apiAvailable ? t("discovery.indexerConnected") : t("discovery.indexerReconnecting")}</span></div><span>{formatUsdc(totalVolume.toString())} {t("discovery.cumulative")}</span><span>{markets.reduce((total, item) => total + BigInt(item.contest.market?.tradeCount ?? "0"), 0n).toString()} {t("discovery.verifiedTrades")}</span></section>
  </>;
}

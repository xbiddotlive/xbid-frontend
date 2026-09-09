"use client";

import Link from "next/link";
import { memo, useEffect, useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { ContestScopeLabel, RegionSelect } from "@/components/contest/contest-scope";
import { DiscoverySpotlight } from "./discovery-spotlight";

import dynamic from "next/dynamic";
import { MarketSide, CapitalStrip, toMarketView, type MarketView, type MarketFilter } from "./market-presentation";
import { paginate } from "@/lib/product/discovery-snapshot";
import { DiscoveryPager } from "./discovery-pager";
import { I18nText } from "@/lib/i18n/locale-context";
import { CompassIcon, GridIcon, ListIcon } from "@/components/ui/icons";
import type { ContestPage, ContestSummary } from "@/lib/api/contests";
import { useDiscoveryFeed } from "../hooks/use-discovery-feed";
import { useExploreState } from "../hooks/use-explore-state";
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
  trending: "activity.filter.all",
  new: "filter.new",
  "close battles": "filter.close",
  comebacks: "filter.comebacks",
  crowned: "filter.crowned",
};
const categoryMessages: Record<ContestCategory, MessageKey> = {
  crypto: "category.crypto", sports: "category.sports", politics: "category.politics",
  finance: "category.finance", technology: "category.technology", culture: "category.culture", other: "category.other",
  entertainment: "category.entertainment", predictions: "category.predictions",
};

function Sparkline({ points }: { points: string }) {
  return <svg aria-hidden="true" className="homeSparkline" viewBox="0 0 40 24"><polyline points={points} /></svg>;
}

const MarketCard = memo(function MarketCard({ market }: { market: MarketView }) {
  const { t } = useI18n();
  return <article className="homeMarketCard"><Link className="homeMarketCardOpen" href={market.href}><span className="visuallyHidden">{t("market.open", { title: market.contest.metadata.title })}</span></Link><header><h3>{market.contest.metadata.title}</h3><ContestScopeLabel metadata={market.contest.metadata} /><span className="marketSignal" data-crowned={market.badge === "filter.crowned"}>{t(market.badge)}</span></header><div className="homeCardSides"><Link aria-label={t("market.back", { side: market.contest.metadata.sideA.name })} href={`${market.href}?trade=buy&side=a`}><MarketSide market={market} side={0} /></Link><Link aria-label={t("market.back", { side: market.contest.metadata.sideB.name })} href={`${market.href}?trade=buy&side=b`}><MarketSide market={market} side={1} /></Link></div><CapitalStrip market={market} /></article>;
}, (previous, next) => previous.market.contest === next.market.contest && previous.market.badge === next.market.badge);

const validView = (value: unknown): value is ViewMode => value === "list" || value === "grid";

export function MarketDiscovery({ initialPage, summary, query, apiAvailable: initialApiAvailable, region = "", category = "", signal = "trending", initialScopedPage, scopedAvailable = true }: { initialPage: ContestPage; summary: ContestSummary | null; query: string; apiAvailable: boolean; region?: string; category?: string; signal?: MarketFilter; initialScopedPage?: ContestPage; scopedAvailable?: boolean }) {
  const { t } = useI18n();
  const feed = useDiscoveryFeed(activeChain.id, query, initialPage, summary, initialApiAvailable);
  const hasScope = Boolean(region || category);
  const scopedFeed = useDiscoveryFeed(activeChain.id, query, initialScopedPage ?? initialPage, summary, scopedAvailable, { region, category }, hasScope);
  const cardFeed = hasScope ? scopedFeed : feed;
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const filter = (category || signal) as DiscoveryFilter;
  const navigate = (nextRegion: string, nextFilter: DiscoveryFilter) => {
    const params = new URLSearchParams();
    if (query) params.set("q", query);
    if (nextRegion) params.set("region", nextRegion);
    if (contestCategories.some(item => item.value === nextFilter)) params.set("category", nextFilter);
    else if (nextFilter !== "trending") params.set("signal", nextFilter);
    startTransition(() => router.push("/" + (params.size ? "?" + params.toString() : ""), { scroll: false }));
  };
  const [clockMinute, setClockMinute] = useState(0);
  const [expandedStats, setExpandedStats] = useState(false);
  const { items: contests, available: apiAvailable } = feed;
  useEffect(() => {
    const timer = window.setInterval(() => { setClockMinute(Math.floor(Date.now() / 60_000)); }, 15_000);
    return () => window.clearInterval(timer);
  }, []);
  const stateKey = `explore:${activeChain.id}:${query}`;
  const [view, setView] = useExploreState<ViewMode>(stateKey + ":view", "grid", validView);
  const [page, setPage] = useState(0);
  const markets = useMemo(() => contests.filter((contest) => contest.market).map((contest) => toMarketView(contest, clockMinute)), [contests, clockMinute]);
  const featured = useMemo(() => [...markets].sort((a, b) => {
    const left = BigInt(a.contest.market?.volume24hUnits ?? "0");
    const right = BigInt(b.contest.market?.volume24hUnits ?? "0");
    return left === right ? 0 : left > right ? -1 : 1;
  }).slice(0, 5), [markets]);
  const cardMarkets = useMemo(() => cardFeed.items.filter(contest => contest.market).map(contest => toMarketView(contest, clockMinute)), [cardFeed.items, clockMinute]);
  const visibleMarkets = useMemo(() => cardMarkets.filter(market => category || market.tags.includes(signal)), [cardMarkets, category, signal]);
  const cardPage = paginate(visibleMarkets, page, 12);
  const featuredMarket = featured[0];
  const totalVolume = feed.summary ? formatUsdc(feed.summary.totalVolumeUnits) : "—";
  const volume24h = feed.summary ? formatUsdc(feed.summary.volume24hUnits) : "—";
  const trades24h = feed.summary?.trades24h ?? "—";
  const totalContests = feed.summary?.contestCount ?? "—";
  const stats = [
    { label: t("discovery.totalVolume"), value: totalVolume, change: t("common.allTime") },
    { label: t("discovery.liveContests"), value: totalContests, change: t("common.testnet") },
    { label: t("discovery.volume24h"), value: volume24h, change: t("common.confirmed") },
    { label: t("discovery.trades24h"), value: trades24h, change: t("common.onchain") },
    { label: t("discovery.leadFlips"), value: feed.summary?.leadFlips24h ?? "—", change: "24h" },
    { label: t("common.comments"), value: feed.summary?.comments ?? "—", change: t("common.verified") },
  ];

  return <>
    <section className="homeIntro">
      <div className="homeIntroLead"><span aria-hidden="true" className="homeIntroIcon"><CompassIcon /></span><div><p className="eyebrow">{t("discovery.eyebrow")}</p><h1>{t("discovery.headline")}</h1></div></div>
      <div className="homeIntroStatus"><div><span className="livePulse" /><strong>{apiAvailable ? t("discovery.contestsLive", { count: totalContests }) : t("discovery.reconnecting")}</strong></div><span>{t("discovery.status", { count: trades24h, network: t("chain.testnet") })}</span></div>
    </section>
    <section className="homeStats" data-expanded={expandedStats} aria-label={t("discovery.protocolStats")}>{stats.map((stat, index) => <article key={stat.label} data-summary={index >= 1 && index <= 3}><div><span>{stat.label}</span><strong>{stat.value}</strong></div><div><Sparkline points="" /><b>{stat.change}</b></div></article>)}</section>
    <div className="exploreStatus" data-healthy={apiAvailable && feed.summaryAvailable}><button className="mobileStatsToggle" type="button" aria-expanded={expandedStats} onClick={() => setExpandedStats(!expandedStats)}>{t("trade.details")}</button>{(!apiAvailable || !feed.summaryAvailable) && <span role="status">{t(!apiAvailable ? "discovery.stale" : "discovery.summaryUnavailable")}</span>}</div>

    {featuredMarket ? (
      <DiscoverySpotlight contests={contests} apiAvailable={apiAvailable} stateKey={stateKey} query={query} partial={feed.nextCursor !== null} onConfirmed={() => { void feed.refresh(); if (hasScope) void scopedFeed.refresh(); }}>
        <FeaturedContests featured={featured} />
      </DiscoverySpotlight>
    ) : <div className="emptyState"><strong>{apiAvailable ? t(query ? "discovery.noMatch" : "discovery.noContests") : t("discovery.noData")}</strong><span>{apiAvailable ? t(query ? "discovery.chooseSignal" : "discovery.launchFirst") : t("discovery.invalidResponse")}</span>{apiAvailable && !query && <Link href="/launch">{t("discovery.launchContest")}</Link>}</div>}

    <section className="homeMarkets" aria-labelledby="all-markets-heading" aria-busy={pending || cardFeed.loading}><div className="homeMarketToolbar"><div className="marketFilters homeCategoryRail" aria-label={t("discovery.filter")}>{filters.map((item) => <button aria-pressed={filter === item} key={item} disabled={pending} onClick={() => navigate(region, item)} type="button">{t(filterMessages[item])}</button>)}<i aria-hidden="true" className="categoryDivider" />{contestCategories.map((item) => <button aria-pressed={filter === item.value} key={item.value} disabled={pending} onClick={() => navigate(region, item.value)} type="button">{t(categoryMessages[item.value])}</button>)}</div><div className="regionFilter"><RegionSelect filter value={region} onChange={value => navigate(value, filter)} disabled={pending} /></div><div className="viewToggle" aria-label={t("discovery.layout")}><button aria-pressed={view === "list"} onClick={() => setView("list")} type="button"><ListIcon />{t("discovery.list")}</button><button aria-pressed={view === "grid"} onClick={() => setView("grid")} type="button"><GridIcon />{t("discovery.cards")}</button></div></div><h2 className="visuallyHidden" id="all-markets-heading">{t("discovery.allContests")}</h2>{hasScope && <p className="contestScopeLabel">{t("scope.filteredHelp")}</p>}{!cardFeed.available && <p role="status">{t("discovery.stale")}</p>}<div className="homeMarketGrid" data-view={view}>{cardPage.items.map((market) => <MarketCard key={market.contest.contestId} market={market} />)}</div><DiscoveryPager page={cardPage.page} pages={cardPage.pages} onChange={setPage} />{cardFeed.available && visibleMarkets.length === 0 && <div className="emptyState"><strong>{t("discovery.noMatch")}</strong><span>{t("discovery.chooseSignal")}</span></div>}</section>
    {cardFeed.nextCursor && <div className="exploreLoadMore"><span>{t("discovery.loadedScope", { count: cardFeed.items.length })}</span><button className="button" disabled={cardFeed.loading || pending} onClick={cardFeed.loadMore} type="button">{t(cardFeed.loading ? "common.loadingPage" : cardFeed.loadError ? "common.retry" : "discovery.loadMore")}</button></div>}
    <section className="realMarketStrip"><div><span className="livePulse" /><strong>{t("chain.testnet")}</strong><span>{apiAvailable ? t("discovery.indexerConnected") : t("discovery.indexerReconnecting")}</span></div><span>{totalVolume} {t("discovery.cumulative")}</span><span>{feed.summary?.totalTrades ?? "—"} {t("discovery.verifiedTrades")}</span></section>
  </>;
}

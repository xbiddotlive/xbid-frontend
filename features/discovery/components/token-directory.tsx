"use client";

import Link from "next/link";
import { useMemo } from "react";
import { SideLogo } from "@/components/contest/side-logo-pair";
import type { ContestPage } from "@/lib/api/contests";
import { robinhoodTestnet } from "@/lib/blockchain/chain";
import { useI18n } from "@/lib/i18n/locale-context";
import { pairedTokens, type DiscoveryToken } from "@/lib/product/discovery-tokens";
import { formatPriceChange, formatUsdc } from "@/lib/product/market-metrics";
import { useDiscoveryFeed } from "../hooks/use-discovery-feed";

export function TokenDirectory({ initial, query, available }: { initial: ContestPage; query: string; available: boolean }) {
  const { t } = useI18n();
  const feed = useDiscoveryFeed(robinhoodTestnet.id, query, initial, null, available);
  const pairs = useMemo(() => pairedTokens(feed.items), [feed.items]);
  return <section className="tokenDirectory">
    <header className="tokenDirectoryHeader"><div><h1>{t("discovery.allTokens")}</h1><p>{t("discovery.tokenPairsHelp")}</p></div><Link href="/">← {t("nav.explore")}</Link></header>
    <form className="tokenDirectorySearch" role="search" action="/tokens"><input type="search" name="q" maxLength={100} defaultValue={query} aria-label={t("discovery.search")} placeholder={t("discovery.search")} /><button className="button" type="submit">{t("discovery.search")}</button>{query && <Link href="/tokens">{t("activity.filter.all")}</Link>}</form>
    {!feed.available && <p role="status">{t("discovery.stale")} <button className="button" onClick={feed.refresh}>{t("common.retry")}</button></p>}
    <div className="tokenPairBoard">
      <div className="tokenPairHeading">{(["a", "b"] as const).map(side => <strong key={side} data-side={side}>{t(side === "a" ? "common.sideA" : "common.sideB")}</strong>)}</div>
      {pairs.map(pair => <div className="tokenPair" key={pair.key}><PairedToken token={pair.a} /><PairedToken token={pair.b} /></div>)}
      {!pairs.length && <div className="tokenListEmpty"><strong>{t(feed.available ? "discovery.noTokens" : "discovery.noData")}</strong></div>}
    </div>
    <footer className="exploreLoadMore"><span>{t("discovery.tokenCount", { count: pairs.length * 2 })}</span>{feed.nextCursor && <button className="button" disabled={feed.loading} onClick={feed.loadMore}>{t(feed.loading ? "portfolio.refreshing" : feed.loadError ? "common.retry" : "discovery.loadMore")}</button>}</footer>
  </section>;
}

function PairedToken({ token }: { token: DiscoveryToken }) {
  const { t } = useI18n();
  const rounded = token.change === null ? null : Number(token.change.toFixed(2));
  const tone = rounded === null || rounded === 0 ? "muted" : rounded > 0 ? "positive" : "negative";
  return <Link className="pairedToken" href={token.href} prefetch={false}>
    <span className="tokenListIdentity"><span className="tokenListLogo"><SideLogo name={token.metadata.name} imageUrl={token.metadata.logoUrl} tone={token.side} /><span className="tokenSideBadge" data-tone={token.side} aria-label={t(token.side === "a" ? "common.sideA" : "common.sideB")}>{token.side.toUpperCase()}</span></span><span className="tokenListCopy"><strong>{token.metadata.symbol}</strong>{token.metadata.name.toLowerCase() !== token.metadata.symbol.toLowerCase() && <span className="tokenListName">{token.metadata.name}</span>}</span></span>
    <span className="pairedTokenMetric"><small>{t("docs.price")}</small><strong>${token.price.toFixed(4)}</strong></span>
    <span className="pairedTokenMetric"><small>{"24h %"}</small><span data-tone={tone}>{formatPriceChange(token.change)}</span></span>
    <span className="pairedTokenMetric"><small>{t("discovery.volume24h")}</small><span>{formatUsdc(token.volume24hUnits)}</span></span>
  </Link>;
}

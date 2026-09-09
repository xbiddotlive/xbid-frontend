"use client";

import Link from "next/link";
import { memo, useEffect, useId, useMemo, useRef, useState, useSyncExternalStore, type ReactNode } from "react";
import { SideLogo } from "@/components/contest/side-logo-pair";
import type { IndexedContest } from "@/lib/api/contests";
import { robinhoodTestnet as activeChain } from "@/lib/blockchain/chain";
import { useI18n } from "@/lib/i18n/locale-context";
import type { MessageKey } from "@/lib/i18n/messages";
import { discoveryTokens, selectTokens, priceMove, type DiscoveryToken, type TokenFilter } from "@/lib/product/discovery-tokens";
import { formatUsdc } from "@/lib/product/market-metrics";
import { paginate } from "@/lib/product/discovery-snapshot";
import { DiscoveryPager } from "./discovery-pager";

const filters: { value: TokenFilter; label: MessageKey; help?: MessageKey }[] = [
  { value: "all", label: "activity.filter.all" },
  { value: "new", label: "filter.new", help: "discovery.tokenNewHelp" },
  { value: "hot", label: "discovery.hot", help: "discovery.tokenHotHelp" },
  { value: "gainers", label: "discovery.topGainers", help: "discovery.tokenGainersHelp" },
];
function subscribeClock(onChange: () => void) {
  const timer = window.setInterval(onChange, 60_000);
  return () => window.clearInterval(timer);
}
const clockSnapshot = () => Math.floor(Date.now() / 60_000);
const serverClockSnapshot = () => 0;

export function DiscoverySpotlight({ contests, apiAvailable, children }: { contests: IndexedContest[]; apiAvailable: boolean; children: ReactNode }) {
  const { t } = useI18n();
  const id = useId();
  const rail = useRef<HTMLDivElement>(null);
  const selected = useRef(0);
  const tabs = useRef<(HTMLButtonElement | null)[]>([]);
  const [active, setActive] = useState(0);
  const [visitedFeatured, setVisitedFeatured] = useState(false);
  const [page, setPage] = useState(0);
  const [filter, setFilter] = useState<TokenFilter>("all");
  const minute = useSyncExternalStore(subscribeClock, clockSnapshot, serverClockSnapshot);
  const rows = useRef<HTMLDivElement>(null);
  const tokens = useMemo(() => discoveryTokens(contests), [contests]);
  const filtered = useMemo(() => selectTokens(tokens, filter, minute * 60), [tokens, filter, minute]);
  const gainers = useMemo(() => selectTokens(tokens, "gainers", 0).slice(0, 6), [tokens]);
  const tokenPage = paginate(filtered, page, 18);
  const labels = [t("discovery.tokenList"), t("discovery.featured")];
  const select = (index: number) => {
    selected.current = index;
    setActive(index);
    if (index === 1) setVisitedFeatured(true);
    rail.current?.scrollTo({ left: index * rail.current.clientWidth, behavior: "instant" });
  };
  const changePage = (next: number) => {
    setPage(next);
    rows.current?.scrollTo({ top: 0, behavior: "instant" });
  };
  useEffect(() => {
    const element = rail.current;
    if (!element) return;
    const observer = new ResizeObserver(() => element.scrollTo({ left: selected.current * element.clientWidth, behavior: "instant" }));
    observer.observe(element);
    return () => observer.disconnect();
  }, []);

  return <section className="discoverySpotlight">
    <div className="tokenTickerBand" aria-label={t("discovery.topGainers")}>
      <span className="tokenTickerLabel">{t("discovery.topGainers")}<span>24h</span></span>
      <div className="tokenTickerRail" tabIndex={0}>
        {gainers.length ? gainers.map((token) => <Link key={token.key} href={token.href} prefetch={false} className="tokenTickerItem">
          <SideLogo name={token.metadata.name} imageUrl={token.metadata.logoUrl} tone={token.side} />
          <strong title={token.metadata.name}>{token.metadata.symbol}</strong>
          <LivePrice price={token.price} />
          <TokenChange change={token.change} />
        </Link>) : <span className="tokenTickerEmpty">{t("discovery.noGainers")}</span>}
      </div>
    </div>
    <div className="spotlightToolbar">
      <div className="spotlightTabs" role="tablist" aria-label={t("discovery.tokenList")}>
        {labels.map((label, index) => <button key={index} ref={(element) => { tabs.current[index] = element; }} id={id + "-tab-" + index} role="tab" type="button" aria-selected={active === index} aria-controls={id + "-panel-" + index} tabIndex={active === index ? 0 : -1} onClick={() => select(index)} onKeyDown={(event) => {
          if (!["ArrowLeft", "ArrowRight", "Home", "End"].includes(event.key)) return;
          event.preventDefault();
          const next = event.key === "Home" ? 0 : event.key === "End" ? 1 : 1 - active;
          select(next);
          tabs.current[next]?.focus();
        }}>{label}</button>)}
      </div>
      <span className="spotlightContext" role="status">{apiAvailable ? t("discovery.contestTokens") : t("discovery.reconnecting")}{activeChain.testnet ? " · " + t("common.testnet") : ""}</span>
    </div>
    <div ref={rail} className="spotlightRail" onScroll={(event) => {
      const element = event.currentTarget;
      const next = Math.min(1, Math.max(0, Math.round(element.scrollLeft / Math.max(1, element.clientWidth))));
      selected.current = next;
      setActive(next);
      if (next === 1) setVisitedFeatured(true);
    }}>
      <div className="spotlightPanel tokenListPanel" id={id + "-panel-0"} role="tabpanel" aria-labelledby={id + "-tab-0"} inert={active !== 0}>
        <div className="tokenFilterToolbar">
          <div className="tokenFilters" role="group" aria-label={t("discovery.tokenFilters")}>
            {filters.map((item) => <button key={item.value} type="button" aria-pressed={filter === item.value} title={item.help ? t(item.help) : undefined} onClick={() => { setFilter(item.value); changePage(0); }}>{t(item.label)}</button>)}
          </div>
          <div className="tokenPageStatus"><span>{t("discovery.tokenCount", { count: filtered.length })}</span><DiscoveryPager page={tokenPage.page} pages={tokenPage.pages} onChange={changePage} /></div>
        </div>
        <div className="tokenListHeaders">{[0, 1, 2].map((column) => <div className="tokenListHead" key={column}><span>{t("discovery.ticker")}</span><span>{t("docs.price")}</span><span title={t("contest.change24h")}>{"24h %"}</span><span title={t("discovery.volume24h") + " · " + t("common.usdc")}>{t("discovery.volume24h")}</span></div>)}</div>
        <div ref={rows} className="tokenListRows" tabIndex={active === 0 ? 0 : -1} role="region" aria-label={t("discovery.tokenList")}>
          {tokenPage.items.map((token) => <TokenRow key={token.key} token={token} />)}
          {!tokenPage.items.length && <div className="tokenListEmpty"><strong>{t("discovery.noTokens")}</strong><span>{filter === "all" ? t("discovery.noData") : t(filters.find((item) => item.value === filter)!.help!)}</span></div>}
        </div>
      </div>
      <div className="spotlightPanel spotlightFeatured" id={id + "-panel-1"} role="tabpanel" aria-labelledby={id + "-tab-1"} inert={active !== 1}>{visitedFeatured ? children : null}</div>
    </div>
  </section>;
}

function LivePrice({ price }: { price: number }) {
  const element = useRef<HTMLSpanElement>(null);
  const previous = useRef(price);
  useEffect(() => {
    const direction = priceMove(previous.current, price);
    previous.current = price;
    if (!direction || !element.current || document.hidden || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const color = getComputedStyle(element.current).getPropertyValue("--" + direction).trim();
    const animation = element.current.animate([
      { backgroundColor: "color-mix(in srgb, " + color + " 18%, transparent)" },
      { backgroundColor: "transparent" },
    ], { duration: 900, easing: "ease-out" });
    return () => animation.cancel();
  }, [price]);
  return <span ref={element} className="tokenListPrice">${price.toFixed(4)}</span>;
}

function TokenChange({ change }: { change: number | null }) {
  const rounded = change === null ? null : Number(change.toFixed(2));
  const tone = rounded === null || rounded === 0 ? "muted" : rounded > 0 ? "positive" : "negative";
  return <span className="priceChange" data-tone={tone}>{rounded === null ? "—" : (rounded > 0 ? "+" : "") + rounded.toFixed(2) + "%"}</span>;
}

const TokenRow = memo(function TokenRow({ token }: { token: DiscoveryToken }) {
  const { t } = useI18n();
  return <Link className="tokenListRow" href={token.href} prefetch={false}>
    <span className="tokenListIdentity">
      <span className="tokenListLogo"><SideLogo name={token.metadata.name} imageUrl={token.metadata.logoUrl} tone={token.side} /><span className="tokenSideBadge" data-tone={token.side} aria-label={t(token.side === "a" ? "common.sideA" : "common.sideB")} title={t(token.side === "a" ? "common.sideA" : "common.sideB")}>{token.side.toUpperCase()}</span></span>
      <span className="tokenListCopy"><strong title={token.metadata.symbol}>{token.metadata.symbol}</strong>{token.metadata.name.trim().toLowerCase() !== token.metadata.symbol.trim().toLowerCase() && <span className="tokenListName" title={token.metadata.name}>{token.metadata.name}</span>}</span>
    </span>
    <LivePrice price={token.price} />
    <TokenChange change={token.change} />
    <span className="tokenListVolume" title={t("market.volume", { amount: formatUsdc(token.volume24hUnits) })}>{formatUsdc(token.volume24hUnits)}</span>
  </Link>;
}, (previous, next) => previous.token.key === next.token.key && previous.token.metadata === next.token.metadata && previous.token.price === next.token.price && previous.token.change === next.token.change && previous.token.volume24hUnits === next.token.volume24hUnits);

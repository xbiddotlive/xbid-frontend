"use client";

import Link from "next/link";
import { memo, useEffect, useId, useMemo, useRef, useState, type ReactNode } from "react";
import { SideLogo } from "@/components/contest/side-logo-pair";
import type { IndexedContest } from "@/lib/api/contests";
import { robinhoodTestnet as activeChain } from "@/lib/blockchain/chain";
import { useI18n } from "@/lib/i18n/locale-context";
import { discoveryTokens } from "@/lib/product/discovery-tokens";
import { paginate } from "@/lib/product/discovery-snapshot";
import { DiscoveryPager } from "./discovery-pager";

export function DiscoverySpotlight({ contests, apiAvailable, children }: { contests: IndexedContest[]; apiAvailable: boolean; children: ReactNode }) {
  const { t } = useI18n();
  const id = useId();
  const rail = useRef<HTMLDivElement>(null);
  const selected = useRef(0);
  const tabs = useRef<(HTMLButtonElement | null)[]>([]);
  const [active, setActive] = useState(0);
  const [visitedFeatured, setVisitedFeatured] = useState(false);
  const [page, setPage] = useState(0);
  const rows = useRef<HTMLDivElement>(null);
  const tokens = useMemo(() => discoveryTokens(contests), [contests]);
  const tokenPage = paginate(tokens, page, 12);
  const labels = [t("discovery.tokenList"), t("discovery.featured")];
  const select = (index: number) => {
    selected.current = index;
    setActive(index);
    if (index === 1) setVisitedFeatured(true);
    rail.current?.scrollTo({ left: index * rail.current.clientWidth, behavior: "instant" });
  };
  useEffect(() => {
    const element = rail.current;
    if (!element) return;
    const observer = new ResizeObserver(() => element.scrollTo({ left: selected.current * element.clientWidth, behavior: "instant" }));
    observer.observe(element);
    return () => observer.disconnect();
  }, []);

  return <section className="discoverySpotlight">
    <div className="spotlightToolbar">
      <div className="spotlightTabs" role="tablist" aria-label={t("discovery.tokenList")}>
        {labels.map((label, index) => <button key={index} ref={(element) => { tabs.current[index] = element; }} id={`${id}-tab-${index}`} role="tab" type="button" aria-selected={active === index} aria-controls={`${id}-panel-${index}`} tabIndex={active === index ? 0 : -1} onClick={() => select(index)} onKeyDown={(event) => {
          if (!["ArrowLeft", "ArrowRight", "Home", "End"].includes(event.key)) return;
          event.preventDefault();
          const next = event.key === "Home" ? 0 : event.key === "End" ? 1 : 1 - active;
          select(next);
          tabs.current[next]?.focus();
        }}>{label}</button>)}
      </div>
      <div className="spotlightMeta"><span className="spotlightContext" role="status">{apiAvailable ? t("discovery.contestTokens") : t("discovery.reconnecting")}{activeChain.testnet ? ` · ${t("common.testnet")}` : ""}</span>{active === 0 && <DiscoveryPager page={tokenPage.page} pages={tokenPage.pages} onChange={(next) => { setPage(next); rows.current?.scrollTo({ top: 0, behavior: "instant" }); }} />}</div>
    </div>
    <div ref={rail} className="spotlightRail" onScroll={(event) => {
      const element = event.currentTarget;
      const next = Math.min(1, Math.max(0, Math.round(element.scrollLeft / Math.max(1, element.clientWidth))));
      selected.current = next;
      setActive(next);
      if (next === 1) setVisitedFeatured(true);
    }}>
      <div className="spotlightPanel tokenListPanel" id={`${id}-panel-0`} role="tabpanel" aria-labelledby={`${id}-tab-0`} inert={active !== 0}>
        <div className="tokenListHeaders">{[0, 1].map((column) => <div className="tokenListHead" key={column}><span>{t("discovery.ticker")}</span><span>{t("docs.price")}</span><span title={t("contest.change24h")}>{"24h %"}</span></div>)}</div>
        <div ref={rows} className="tokenListRows" tabIndex={active === 0 ? 0 : -1} role="region" aria-label={t("discovery.tokenList")}>
          {tokenPage.items.map((token) => <TokenRow key={token.key} token={token} />)}
        </div>
      </div>
      <div className="spotlightPanel spotlightFeatured" id={`${id}-panel-1`} role="tabpanel" aria-labelledby={`${id}-tab-1`} inert={active !== 1}>{visitedFeatured ? children : null}</div>
    </div>
  </section>;
}

const TokenRow = memo(function TokenRow({ token }: { token: ReturnType<typeof discoveryTokens>[number] }) {
  const { t } = useI18n();
            const rounded = token.change === null ? null : Number(token.change.toFixed(2));
            const tone = rounded === null || rounded === 0 ? "muted" : rounded > 0 ? "positive" : "negative";
            return <Link className="tokenListRow" key={token.key} href={token.href} prefetch={false}>
              <span className="tokenListIdentity">
                <span className="tokenListLogo"><SideLogo name={token.metadata.name} imageUrl={token.metadata.logoUrl} tone={token.side} /><span className="tokenSideBadge" data-tone={token.side} aria-label={t(token.side === "a" ? "common.sideA" : "common.sideB")} title={t(token.side === "a" ? "common.sideA" : "common.sideB")}>{token.side.toUpperCase()}</span></span>
                <span className="tokenListCopy"><strong title={token.metadata.symbol}>{token.metadata.symbol}</strong>{token.metadata.name.trim().toLowerCase() !== token.metadata.symbol.trim().toLowerCase() && <span className="tokenListName" title={token.metadata.name}>{token.metadata.name}</span>}</span>
              </span>
              <span className="tokenListPrice">${token.price.toFixed(4)}</span>
              <span className="priceChange" data-tone={tone}>{rounded === null ? "—" : `${rounded > 0 ? "+" : ""}${rounded.toFixed(2)}%`}</span>
            </Link>;
}, (previous, next) => previous.token.key === next.token.key && previous.token.metadata === next.token.metadata && previous.token.price === next.token.price && previous.token.change === next.token.change);

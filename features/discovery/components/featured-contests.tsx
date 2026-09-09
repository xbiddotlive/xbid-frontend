"use client";
import Link from "next/link";
import { useState } from "react";
import { ChevronIcon } from "@/components/ui/icons";
import { useI18n } from "@/lib/i18n/locale-context";
import { MarketSide, CapitalStrip, type MarketView } from "./market-presentation";

function BattleBar({ sideAPercent }: { sideAPercent: number }) {
  const { t } = useI18n();
  return <div className="homeBattleBar" role="img" aria-label={`${t("common.sideA")} ${sideAPercent.toFixed(1)}%, ${t("common.sideB")} ${(100 - sideAPercent).toFixed(1)}%`}><progress max="100" value={sideAPercent}>{t("common.sideA")} {sideAPercent.toFixed(1)}%</progress></div>;
}


export default function FeaturedContests({ featured }: { featured: MarketView[] }) {
  const { t } = useI18n();
  const [featuredIndex, setFeaturedIndex] = useState(0);
  const featuredMarket = featured[featuredIndex % Math.max(featured.length, 1)];
  const showFeatured = (step: number) => setFeaturedIndex((current) => (current + step + featured.length) % featured.length);
  if (!featuredMarket) return null;
  return (<section aria-label={t("discovery.featuredList")} aria-roledescription="carousel" className="featuredCarousel">
        <div className="featuredCarouselToolbar">
          <strong>{t("discovery.featured")}</strong>
          <div className="featuredCarouselControls">
            <span>{String(featuredIndex % featured.length + 1).padStart(2, "0")} / {String(featured.length).padStart(2, "0")}</span>
            <button aria-label={t("discovery.previous")} onClick={() => showFeatured(-1)} type="button"><ChevronIcon /></button>
            <button aria-label={t("discovery.next")} onClick={() => showFeatured(1)} type="button"><ChevronIcon /></button>
          </div>
        </div>
        <article className="featuredBattle featuredSlide" key={featuredMarket.contest.contestId}>
          <div className="featuredCopy" aria-live="polite">
            <div className="featuredBadges"><span data-crowned={featuredMarket.badge === "filter.crowned"}>{t(featuredMarket.badge)}</span><span>{t("market.tradeCount", { count: featuredMarket.contest.market?.tradeCount24h ?? "0" })} · 24h</span><span>{featuredMarket.contest.market?.uniqueTraders24h ?? "0"} {t("common.traders")}</span></div>
            <h2><Link href={featuredMarket.href}>{featuredMarket.contest.metadata.title}</Link></h2>
            <p>{featuredMarket.contest.metadata.description || t("discovery.fallbackDescription")}</p>
            <div className="featuredSides">
              <Link href={`${featuredMarket.href}?trade=buy&side=a`}><MarketSide market={featuredMarket} side={0} /></Link>
              <Link href={`${featuredMarket.href}?trade=buy&side=b`}><MarketSide market={featuredMarket} side={1} /></Link>
            </div>
            <BattleBar sideAPercent={featuredMarket.metrics.sideAPercent} />
            <CapitalStrip market={featuredMarket} />
          </div>
          <aside className="marketSetup">
            <p className="eyebrow">{t("discovery.liveMarket")}</p>
            <div><span>{t("discovery.traders24h")}</span><strong>{featuredMarket.contest.market?.uniqueTraders24h ?? "0"}</strong></div>
            <div><span>{t("discovery.atomicFlips")}</span><strong>{featuredMarket.contest.market?.atomicFlipCount24h ?? "0"}</strong></div>
            <div className="setupActions">
              <Link href={`${featuredMarket.href}?trade=buy&side=a`}>{t("discovery.back", { side: featuredMarket.contest.metadata.sideA.name })}</Link>
              <Link href={`${featuredMarket.href}?trade=buy&side=b`}>{t("discovery.back", { side: featuredMarket.contest.metadata.sideB.name })}</Link>
            </div>
            <span>{t("discovery.disclaimer")}</span>
          </aside>
        </article>
      </section>);
}

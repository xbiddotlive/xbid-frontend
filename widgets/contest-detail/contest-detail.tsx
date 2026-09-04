"use client";

import { useQueryClient } from "@tanstack/react-query";
import { useEffect, useState, type MouseEvent } from "react";
import { formatUnits, type Address } from "viem";
import { useReadContracts } from "wagmi";

import { DominanceMeter } from "@/components/contest/dominance-meter";
import { DuelCurve } from "@/components/contest/duel-curve";
import { SideLogo } from "@/components/contest/side-logo-pair";
import { ArrowIcon, CrownIcon, XIcon } from "@/components/ui/icons";
import { LiveCommentary } from "@/features/comments/components/live-commentary";
import { ContestTerminal } from "@/features/trading/components/contest-terminal";
import { QuickTradePanel } from "@/features/trading/components/quick-trade-panel";
import { TradeDock } from "@/features/trading/components/trade-dock";
import type { TradeMode } from "@/features/trading/components/trade-ticket";
import type { IndexedContest, IndexedTradePoint } from "@/lib/api/contests";
import { robinhoodTestnet } from "@/lib/blockchain/chain";
import { contracts, marketVaultAbi, riskControllerAbi } from "@/lib/blockchain/contracts";
import { crownSideIndex } from "@/lib/product/crown";
import { formatChange, marketControl, marketPrices } from "@/lib/product/market-metrics";
import { contestKeys, useContestDetail, useContestTrades } from "@/lib/queries/contest";
import { siteUrl } from "@/lib/seo/site";
import { contestShareCardVersion } from "@/lib/share/contest-card-version";

function compactUsdc(value: bigint) {
  return new Intl.NumberFormat("en", { maximumFractionDigits: 2, notation: "compact" })
    .format(Number(formatUnits(value, 6)));
}

function signedCompactUsdc(value: string | undefined) {
  if (value === undefined) return "—";
  const units = BigInt(value);
  if (units > -5_000n && units < 5_000n) return "0 usdc";
  return `${units > 0n ? "+" : ""}${compactUsdc(units)} usdc`;
}

function flowTone(value: string | undefined) {
  if (value === undefined || (BigInt(value) > -5_000n && BigInt(value) < 5_000n)) return "muted";
  return BigInt(value) > 0n ? "positive" : "negative";
}

function countLabel(value: string | undefined, singular: string, plural = `${singular}s`) {
  if (value === undefined) return `— ${plural}`;
  return `${value} ${value === "1" ? singular : plural}`;
}

function percentChange(current: number, previous: number) {
  return previous === 0 ? null : ((current / previous) - 1) * 100;
}

function formatPrice(value: number) {
  return `$${value.toFixed(3)}`;
}

function changeTone(value: number | null) {
  if (value === null || Number(value.toFixed(2)) === 0) return "muted";
  return value > 0 ? "positive" : "negative";
}

export function ContestDetail({ indexedContest, initialHistory, initialMode, initialSide = 0 }: { indexedContest: IndexedContest; initialHistory: IndexedTradePoint[]; initialMode?: TradeMode; initialSide?: 0 | 1 }) {
  const [nowSeconds, setNowSeconds] = useState<number | null>(null);
  const queryClient = useQueryClient();
  const chainId = Number(indexedContest.chainId);
  const contestQuery = useContestDetail(chainId, indexedContest.contestId, indexedContest);
  const tradesQuery = useContestTrades(chainId, indexedContest.contestId, initialHistory);
  const contest = contestQuery.data;
  const marketStats = contest.market;
  const marketVault = contest.marketVault as Address;
  const market = { address: marketVault, abi: marketVaultAbi } as const;
  const { data, isLoading, refetch } = useReadContracts({
    contracts: [
      { ...market, functionName: "qAWei" },
      { ...market, functionName: "qBWei" },
      { ...market, functionName: "reserveUnits" },
      { address: contracts.riskController, abi: riskControllerAbi, functionName: "effectiveMode", args: [marketVault] },
    ],
    query: { refetchInterval: 8_000 },
  });

  useEffect(() => {
    const frame = requestAnimationFrame(() => setNowSeconds(Math.floor(Date.now() / 1_000)));
    return () => cancelAnimationFrame(frame);
  }, []);

  const qA = data?.[0].result ?? BigInt(marketStats?.qAWei ?? "0");
  const qB = data?.[1].result ?? BigInt(marketStats?.qBWei ?? "0");
  const reserve = data?.[2].result ?? BigInt(marketStats?.reserveUnits ?? "0");
  const displayLoading = isLoading && !marketStats;
  const riskMode = Number(data?.[3].result ?? 0);
  const [aShare, bShare] = marketControl(qA.toString(), qB.toString(), contest.marketVersion);
  const leaderSide = aShare === bShare ? null : aShare > bShare ? "side a" : "side b";
  const liveEdge = Math.abs(aShare - bShare);
  const sideALabel = contest.metadata.sideA.name === "side a" ? contest.metadata.sideA.symbol : contest.metadata.sideA.name;
  const sideBLabel = contest.metadata.sideB.name === "side b" ? contest.metadata.sideB.symbol : contest.metadata.sideB.name;
  const history = tradesQuery.data;
  const [priceA, priceB] = marketPrices(qA.toString(), qB.toString(), contest.marketVersion);
  const dayAgo = nowSeconds === null ? null : nowSeconds - 24 * 60 * 60;
  const anchorPoint = dayAgo === null ? undefined : history.filter((point) => Number(point.blockTimestamp) <= dayAgo).at(-1);
  const createdAt = contest.createdAt ? Date.parse(contest.createdAt) / 1_000 : Number.NaN;
  const completeHistory = contest.market
    ? BigInt(contest.market.tradeCount) === BigInt(history.length)
    : false;
  const indexedAnchor = marketStats && marketStats.qA24hAgoWei !== null && marketStats.qB24hAgoWei !== null
    ? [BigInt(marketStats.qA24hAgoWei), BigInt(marketStats.qB24hAgoWei)] as const
    : null;
  const anchorQuantities = indexedAnchor
    ?? (anchorPoint
      ? [BigInt(anchorPoint.qAAfterWei), BigInt(anchorPoint.qBAfterWei)] as const
    : dayAgo !== null && ((Number.isFinite(createdAt) && createdAt > dayAgo) || completeHistory)
      ? [0n, 0n] as const
      : null);
  const anchorPrices = anchorQuantities
    ? marketPrices(anchorQuantities[0].toString(), anchorQuantities[1].toString(), contest.marketVersion)
    : null;
  const priceChangeA = !displayLoading && anchorPrices ? percentChange(priceA, anchorPrices[0]) : null;
  const priceChangeB = !displayLoading && anchorPrices ? percentChange(priceB, anchorPrices[1]) : null;
  const volume24h = marketStats?.volume24hUnits;
  const sideAVolume24h = marketStats?.sideAVolume24hUnits;
  const sideBVolume24h = marketStats?.sideBVolume24hUnits;
  const sideATrades24h = marketStats?.sideATradeCount24h;
  const sideBTrades24h = marketStats?.sideBTradeCount24h;
  const sideANetFlow24h = marketStats?.sideANetFlow24hUnits;
  const sideBNetFlow24h = marketStats?.sideBNetFlow24hUnits;
  const crownedSide = crownSideIndex(marketStats?.crownSide ?? null);
  const crownedLabel = crownedSide === null ? "crowned" : `crowned · side ${crownedSide === 0 ? "a" : "b"}`;
  const shareRevision = marketStats?.updatedBlock ?? contest.createdBlock;
  const shareVersion = `${contestShareCardVersion}-${shareRevision}`;
  const contestUrl = `${siteUrl}/contest/${contest.contestId}?share=${shareVersion}`;
  const shareImageUrl = `${siteUrl}/share/contest/${contest.contestId}/${shareVersion}/card.jpg`;
  const shareText = `${contest.metadata.title}\n\n${contest.metadata.sideA.name} vs ${contest.metadata.sideB.name} — back your side. move the market. profit when your side takes the lead.\n\n@xbid_live`;
  const xShareUrl = `https://x.com/intent/post?${new URLSearchParams({ text: shareText, url: contestUrl }).toString()}`;

  function warmShareImage() {
    void fetch(shareImageUrl, { cache: "force-cache" }).catch(() => undefined);
  }

  async function openXShare(event: MouseEvent<HTMLAnchorElement>) {
    event.preventDefault();
    const shareWindow = window.open("about:blank", "_blank");
    if (shareWindow) shareWindow.opener = null;

    try {
      const response = await fetch(shareImageUrl, {
        cache: "reload",
        signal: AbortSignal.timeout(10_000),
      });
      if (!response.ok) throw new Error(`share card returned ${response.status}`);
    } catch {
      // Still allow sharing if the prewarm fails; X may succeed on its own retry.
    }

    if (shareWindow) {
      shareWindow.location.href = xShareUrl;
    } else {
      window.open(xShareUrl, "_blank", "noopener,noreferrer");
    }
  }

  return (
    <main className="contestPageShell">
      <div className="contestWorkspace">
        <section className="contestMain">
          <div className="contestTitleRow">
            <div>
              <p className="eyebrow"><span className="livePulse" />arena 01 · {contest.metadata.category}</p>
              <h1>{contest.metadata.title}</h1>
              <a
                aria-label={`View MarketVault ${contest.marketVault} on ${robinhoodTestnet.blockExplorers.default.name}`}
                className="contestAddressLink mono"
                href={`${robinhoodTestnet.blockExplorers.default.url}/address/${contest.marketVault}`}
                rel="noreferrer"
                target="_blank"
              >
                market vault {contest.marketVault.slice(0, 8)}…{contest.marketVault.slice(-4)}
                <ArrowIcon />
              </a>
            </div>
            <div className="contestTitleActions">
              <a aria-label="share this contest on x" className="contestShareButton" href={xShareUrl} onClick={openXShare} onFocus={warmShareImage} onPointerEnter={warmShareImage} onTouchStart={warmShareImage} rel="noreferrer" target="_blank"><XIcon /><span>share</span></a>
              {marketStats?.crownActivated ? <span className="contestCrownedStatus"><CrownIcon />{crownedLabel}</span> : null}
              <span className={riskMode === 0 ? "statusOk" : "statusWarning"}>{riskMode === 0 ? "trading active" : `risk mode ${riskMode}`}</span>
            </div>
          </div>

          <section className="liveArena" aria-label="live arena">
            <div className="arenaSides">
              <div className="arenaSide arenaSideA">
                <SideLogo imageUrl={contest.metadata.sideA.logoUrl} name={contest.metadata.sideA.name} tone="a" />
                <div className="arenaSideSummary">
                  <span>side a · {sideALabel}</span><strong>{Number(aShare.toFixed(1))}%</strong>
                  <small className="arenaSideQuote"><span>{contest.metadata.sideA.symbol}</span><b>{displayLoading ? "—" : formatPrice(priceA)}</b><em aria-label="24 hour price change" className={`priceChange ${changeTone(priceChangeA)}`}>{priceChangeA === null ? "—" : formatChange(priceChangeA)} · 24h</em></small>
                </div>
              </div>
              <div className="arenaVersus"><span><i />live</span><small>current control</small></div>
              <div className="arenaSide arenaSideB">
                <SideLogo imageUrl={contest.metadata.sideB.logoUrl} name={contest.metadata.sideB.name} tone="b" />
                <div className="arenaSideSummary">
                  <span>side b · {sideBLabel}</span><strong>{Number(bShare.toFixed(1))}%</strong>
                  <small className="arenaSideQuote"><span>{contest.metadata.sideB.symbol}</span><b>{displayLoading ? "—" : formatPrice(priceB)}</b><em aria-label="24 hour price change" className={`priceChange ${changeTone(priceChangeB)}`}>{priceChangeB === null ? "—" : formatChange(priceChangeB)} · 24h</em></small>
                </div>
              </div>
            </div>
            <DominanceMeter large sideAPercent={Number(aShare.toFixed(1))} sideBPercent={Number(bShare.toFixed(1))} />
            {leaderSide ? <strong className="arenaControlLine">{`${leaderSide} is currently winning · ${liveEdge.toFixed(1)}% live edge`}</strong> : null}
          </section>

          <div className="metricGrid">
            <div><span>backing reserve</span><strong>{displayLoading ? "—" : `${compactUsdc(reserve)} usdc`}</strong><small>current collateral</small></div>
            <div><span>24h volume</span><strong>{volume24h === undefined ? "—" : `${compactUsdc(BigInt(volume24h))} usdc`}</strong><small>{countLabel(marketStats?.tradeCount24h, "trade")} · {countLabel(marketStats?.uniqueTraders24h, "trader")}</small></div>
            <div data-side="a"><span>side a · 24h</span><strong>{sideAVolume24h === undefined ? "—" : `${compactUsdc(BigInt(sideAVolume24h))} usdc`}</strong><small>{countLabel(sideATrades24h, "trade")} · <b className={flowTone(sideANetFlow24h)}>{signedCompactUsdc(sideANetFlow24h)} net</b></small></div>
            <div data-side="b"><span>side b · 24h</span><strong>{sideBVolume24h === undefined ? "—" : `${compactUsdc(BigInt(sideBVolume24h))} usdc`}</strong><small>{countLabel(sideBTrades24h, "trade")} · <b className={flowTone(sideBNetFlow24h)}>{signedCompactUsdc(sideBNetFlow24h)} net</b></small></div>
            <div><span>battle activity · 24h</span><strong>{countLabel(marketStats?.leadFlipCount24h, "lead flip")}</strong><small>{countLabel(marketStats?.atomicFlipCount24h, "atomic flip")}</small></div>
          </div>

          <section className="marketSection">
            <div className="chartToolbar">
              <strong className="chartTitle">live control</strong>
              <div className="curveLegend" aria-label="current control"><span><i className="legendA" />side a <b>{aShare.toFixed(1)}%</b></span><span><i className="legendB" />side b <b>{bShare.toFixed(1)}%</b></span></div>
              <span className="chartLiveStatus"><i />live · 8s</span>
            </div>
            <DuelCurve history={history} includeOrigin={completeHistory} marketVersion={contest.marketVersion} />
          </section>

          <nav className="mobileArenaTabs" aria-label="contest sections">
            <button aria-pressed="true" type="button">arena</button><button type="button">live</button><button type="button">position</button><button type="button">activity</button><button type="button">profile</button>
          </nav>

          <ContestTerminal contest={contest} history={history} />

          <TradeDock contest={contest} initialMode={initialMode} initialSide={initialSide} onConfirmed={() => void Promise.all([refetch(), queryClient.invalidateQueries({ queryKey: contestKeys.detail(chainId, contest.contestId) }), queryClient.invalidateQueries({ queryKey: contestKeys.trades(chainId, contest.contestId) })])} />
        </section>
        <aside className="contestRightRail">
          <QuickTradePanel contest={contest} initialMode={initialMode} initialSide={initialSide} onConfirmed={() => void Promise.all([refetch(), queryClient.invalidateQueries({ queryKey: contestKeys.detail(chainId, contest.contestId) }), queryClient.invalidateQueries({ queryKey: contestKeys.trades(chainId, contest.contestId) })])} />
          <LiveCommentary contestId={contest.contestId} />
        </aside>
      </div>
    </main>
  );
}

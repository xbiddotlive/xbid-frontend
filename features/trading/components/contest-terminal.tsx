"use client";

import { useEffect, useState } from "react";
import { useAccount } from "wagmi";

import { WalletButton } from "@/features/wallet/components/wallet-button";
import type { IndexedContest, IndexedTradePoint } from "@/lib/api/contests";
import { robinhoodTestnet } from "@/lib/blockchain/chain";
import { useContestPositions } from "@/lib/queries/contest";
import { amountMoved, amountVerb, battleImpact, compactAddress, effectiveSide, eventAction, eventTime, moveDetail, moveLabel, signedPercent, signedUsdcValue, tokenLabel, usdcValue } from "../model/battle";

type TerminalTab = "history" | "positions" | "details";
type TradeFilter = "all" | "side a" | "side b" | "impact";

const terminalTabs: Array<{ id: TerminalTab; label: string }> = [
  { id: "history", label: "trades" },
  { id: "positions", label: "positions" },
  { id: "details", label: "details" },
];

export function ContestTerminal({ contest, history }: { contest: IndexedContest; history: IndexedTradePoint[] }) {
  const { address, isConnected } = useAccount();
  const [activeTab, setActiveTab] = useState<TerminalTab>("history");
  const [tradeFilter, setTradeFilter] = useState<TradeFilter>("all");
  const [nowSeconds, setNowSeconds] = useState<number | null>(null);
  const contestId = contest.contestId;
  const symbols = [contest.metadata.sideA.symbol, contest.metadata.sideB.symbol] as const;
  const positionsQuery = useContestPositions(robinhoodTestnet.id, contestId, address, activeTab === "positions");
  const allRecentHistory = nowSeconds === null ? [] : history
    .map((move, index) => ({ move, previous: history[index - 1] }))
    .filter(({ move }) => Number(move.blockTimestamp) >= nowSeconds - 24 * 60 * 60)
    .reverse();
  const recentHistory = allRecentHistory.filter(({ move, previous }) => {
    if (tradeFilter === "side a") return effectiveSide(move) === 0;
    if (tradeFilter === "side b") return effectiveSide(move) === 1;
    if (tradeFilter === "impact") return eventAction(move) === "flip" || battleImpact(move, previous).isLeadMove;
    return true;
  });

  useEffect(() => {
    const updateClock = () => setNowSeconds(Math.floor(Date.now() / 1_000));
    const frame = requestAnimationFrame(updateClock);
    const timer = window.setInterval(updateClock, 60_000);
    return () => { cancelAnimationFrame(frame); window.clearInterval(timer); };
  }, []);

  const positionData = positionsQuery.data;
  const positionError = positionsQuery.error;

  return (
    <section className="contestTerminal" aria-label="contest market data">
      <nav className="terminalTabs" aria-label="terminal sections">
        {terminalTabs.map((tab) => (
          <button aria-pressed={activeTab === tab.id} key={tab.id} onClick={() => setActiveTab(tab.id)} type="button">
            {tab.label}
          </button>
        ))}
        <div className="terminalStatus"><i />live onchain · {allRecentHistory.length} trades / 24h</div>
      </nav>

      {activeTab === "history" && (
        <div className="terminalTableWrap">
          <div aria-label="recent contest trades" className="terminalTable terminalHistoryTable" role="table">
            <div className="terminalTradeFilters" aria-label="filter trades">
              {(["all", "side a", "side b", "impact"] as const).map((filter) => <button aria-pressed={tradeFilter === filter} key={filter} onClick={() => setTradeFilter(filter)} type="button">{filter}</button>)}
            </div>
            <div className="terminalTableHead" role="row"><span role="columnheader">time</span><span role="columnheader">trader conviction</span><span role="columnheader">amount</span><span role="columnheader">battle impact</span><span role="columnheader" /></div>
            {nowSeconds === null ? <div className="terminalEmpty"><span>loading live trades…</span></div> : recentHistory.length > 0 ? recentHistory.map(({ move, previous }) => {
              const impact = battleImpact(move, previous);
              const supportedSide = effectiveSide(move);
              return <div className="terminalBattleRow" data-side={supportedSide === 0 ? "a" : "b"} key={`${move.transactionHash}-${move.logIndex}`} role="row">
                <div className="battleTime"><span>{eventTime(move.blockTimestamp)}</span></div>
                <div className="battleMove">
                  <strong>
                    <span>{move.trader ? compactAddress(move.trader) : "verified trader"}</span>
                    <b className="battleAction" data-action={eventAction(move)}>{eventAction(move).toUpperCase()}</b>
                    <em>{tokenLabel(move, symbols).toUpperCase()}</em>
                  </strong>
                  <span>{moveLabel(move)} · {moveDetail(move, symbols)}</span>
                </div>
                <div className="battleCapital"><strong>{amountMoved(move)}</strong><span>{amountVerb(move)}</span></div>
                <div className="battleImpact" data-impact={impact.isLeadMove ? "lead" : "control"}><strong>{impact.headline}</strong><span>{impact.detail}</span></div>
                <a aria-label={`view ${compactAddress(move.transactionHash)} on explorer`} className="battleTx" href={`${robinhoodTestnet.blockExplorers.default.url}/tx/${move.transactionHash}`} rel="noreferrer" target="_blank">↗</a>
              </div>;
            }) : <div className="terminalEmpty"><strong>no trades in the last 24 hours</strong><span>new indexed transactions will appear here automatically.</span></div>}
          </div>
        </div>
      )}

      {activeTab === "positions" && (
        !isConnected || !address ? (
          <div className="terminalEmpty terminalEmptyLarge"><strong>connect wallet to view positions</strong><span>token balance, average entry and unrealized pnl will appear here.</span><WalletButton /></div>
        ) : positionError ? (
          <div className="terminalEmpty terminalEmptyLarge"><strong>position data is unavailable</strong><span>{positionError.message.toLowerCase()}</span></div>
        ) : !positionData ? (
          <div className="terminalPositionLoading" aria-label="loading wallet positions">
            <span className="skeletonBlock" /><span className="skeletonBlock" /><span className="skeletonBlock" />
          </div>
        ) : positionData.positions.length === 0 ? (
          <div className="terminalEmpty terminalEmptyLarge"><strong>no position in this contest</strong><span>buy either side to start backing your view.</span></div>
        ) : (
          <div className="terminalPositions">
            <header className="terminalPositionHeader">
              <div><strong>your contest position</strong><span>{compactAddress(positionData.walletAddress)} · wallet positions api</span></div>
              <span>{positionData.dataSource} data</span>
            </header>
            <div className="terminalPositionScroller">
              <div className="terminalPositionTable">
                <div className="terminalPositionHead"><span>position</span><span>tokens</span><span>avg. entry</span><span>current / 24h</span><span>value / cost</span><span>unrealized pnl</span></div>
                {positionData.positions.map((position) => {
                  const isPositive = Number(position.unrealizedPnlUsdc) >= 0;
                  return <div className="terminalPositionRow" key={position.id}>
                    <div><strong>side {position.side === 0 ? "a" : "b"} · {position.tokenSymbol.toUpperCase()}</strong><span>backing {position.side === 0 ? "side a" : "side b"}</span></div>
                    <strong>{Number(position.tokenBalance).toLocaleString()}</strong>
                    <span>{usdcValue(position.averageEntryPriceUsdc)}</span>
                    <div><strong>{usdcValue(position.currentPriceUsdc)}</strong><span className={`priceChange ${position.change24hPercent >= 0 ? "positive" : "negative"}`}>{signedPercent(position.change24hPercent)} · 24h</span></div>
                    <div><strong>{usdcValue(position.marketValueUsdc)}</strong><span>{usdcValue(position.costBasisUsdc)} cost</span></div>
                    <div><strong className={isPositive ? "positive" : "negative"}>{signedUsdcValue(position.unrealizedPnlUsdc)}</strong><span className={isPositive ? "positive" : "negative"}>{signedPercent(position.unrealizedPnlPercent)}</span></div>
                  </div>;
                })}
              </div>
            </div>
          </div>
        )
      )}

      {activeTab === "details" && (
        <div className="terminalDetails">
          <div><span>market vault</span><a href={`${robinhoodTestnet.blockExplorers.default.url}/address/${contest.marketVault}`} rel="noreferrer" target="_blank">{compactAddress(contest.marketVault)} ↗</a></div>
          <div><span>side a token</span><strong>{compactAddress(contest.sideAToken)}</strong></div>
          <div><span>side b token</span><strong>{compactAddress(contest.sideBToken)}</strong></div>
          <div><span>market version</span><strong>v{contest.marketVersion} · immutable</strong></div>
          <div><span>settlement</span><strong>usdc · 6 decimals</strong></div>
          <div><span>execution</span><strong>atomic onchain</strong></div>
        </div>
      )}
    </section>
  );
}

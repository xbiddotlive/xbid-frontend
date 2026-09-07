"use client";

import { useEffect, useState } from "react";
import { useAccount } from "wagmi";

import { WalletButton } from "@/features/wallet/components/wallet-button";
import type { IndexedContest, IndexedTradePoint } from "@/lib/api/contests";
import { robinhoodTestnet } from "@/lib/blockchain/chain";
import { useI18n } from "@/lib/i18n/locale-context";
import { localeInfo } from "@/lib/i18n/locales";
import type { MessageKey } from "@/lib/i18n/messages";
import { useContestPositions } from "@/lib/queries/contest";
import { amountMoved, amountVerb, battleImpact, compactAddress, effectiveSide, eventAction, eventTime, moveDetail, moveLabel, signedPercent, signedUsdcValue, tokenLabel, usdcValue } from "../model/battle";

type TerminalTab = "history" | "positions" | "details";
type TradeFilter = "all" | "side a" | "side b" | "impact";

export function ContestTerminal({ contest, history }: { contest: IndexedContest; history: IndexedTradePoint[] }) {
  const { locale, t } = useI18n();
  const numberLocale = localeInfo(locale).htmlLang;
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
    if (tradeFilter === "impact") return eventAction(move) === "flip" || battleImpact(move, previous, contest.marketVersion).isLeadMove;
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
    <section className="contestTerminal" aria-label={t("terminal.marketData")}>
      <nav className="terminalTabs" aria-label={t("terminal.sections")}>
        {(["history", "positions", "details"] as const).map((tab) => (
          <button aria-pressed={activeTab === tab} key={tab} onClick={() => setActiveTab(tab)} type="button">
            {t(`terminal.${tab}` as MessageKey)}
          </button>
        ))}
        <div className="terminalStatus"><i />{t("terminal.liveTrades", { count: allRecentHistory.length })}</div>
      </nav>

      {activeTab === "history" && (
        <div className="terminalTableWrap">
          <div aria-label={t("terminal.recentTrades")} className="terminalTable terminalHistoryTable" role="table">
            <div className="terminalTradeFilters" aria-label={t("terminal.filterTrades")}>
              {(["all", "side a", "side b", "impact"] as const).map((filter) => <button aria-pressed={tradeFilter === filter} key={filter} onClick={() => setTradeFilter(filter)} type="button">{t(`terminal.filter.${filter === "side a" ? "sideA" : filter === "side b" ? "sideB" : filter}` as MessageKey)}</button>)}
            </div>
            <div className="terminalTableHead" role="row"><span role="columnheader">{t("terminal.time")}</span><span role="columnheader">{t("terminal.conviction")}</span><span role="columnheader">{t("terminal.amount")}</span><span role="columnheader">{t("terminal.impact")}</span><span role="columnheader" /></div>
            {nowSeconds === null ? <div className="terminalEmpty"><span>{t("terminal.loadingTrades")}</span></div> : recentHistory.length > 0 ? recentHistory.map(({ move, previous }) => {
              const impact = battleImpact(move, previous, contest.marketVersion, t);
              const supportedSide = effectiveSide(move);
              return <div className="terminalBattleRow" data-side={supportedSide === 0 ? "a" : "b"} key={`${move.transactionHash}-${move.logIndex}`} role="row">
                <div className="battleTime"><span>{eventTime(move.blockTimestamp, numberLocale)}</span></div>
                <div className="battleMove">
                  <strong>
                    <span>{move.trader ? compactAddress(move.trader) : t("terminal.verifiedTrader")}</span>
                    <b className="battleAction" data-action={eventAction(move)}>{eventAction(move).toUpperCase()}</b>
                    <em>{tokenLabel(move, symbols).toUpperCase()}</em>
                  </strong>
                  <span>{moveLabel(move, t)} · {moveDetail(move, symbols, t)}</span>
                </div>
                <div className="battleCapital"><strong>{amountMoved(move, numberLocale, t)}</strong><span>{amountVerb(move, t)}</span></div>
                <div className="battleImpact" data-impact={impact.isLeadMove ? "lead" : "control"}><strong>{impact.headline}</strong><span>{impact.detail}</span></div>
                <a aria-label={t("terminal.viewExplorer", { hash: compactAddress(move.transactionHash) })} className="battleTx" href={`${robinhoodTestnet.blockExplorers.default.url}/tx/${move.transactionHash}`} rel="noreferrer" target="_blank">↗</a>
              </div>;
            }) : <div className="terminalEmpty"><strong>{t("terminal.noTrades")}</strong><span>{t("terminal.noTradesDescription")}</span></div>}
          </div>
        </div>
      )}

      {activeTab === "positions" && (
        !isConnected || !address ? (
          <div className="terminalEmpty terminalEmptyLarge"><strong>{t("terminal.connectPositions")}</strong><span>{t("terminal.connectPositionsDescription")}</span><WalletButton /></div>
        ) : positionError ? (
          <div className="terminalEmpty terminalEmptyLarge"><strong>{t("terminal.positionUnavailable")}</strong><span>{positionError.message.toLowerCase()}</span></div>
        ) : !positionData ? (
          <div className="terminalPositionLoading" aria-label={t("terminal.loadingPositions")}>
            <span className="skeletonBlock" /><span className="skeletonBlock" /><span className="skeletonBlock" />
          </div>
        ) : positionData.positions.length === 0 ? (
          <div className="terminalEmpty terminalEmptyLarge"><strong>{t("terminal.noPosition")}</strong><span>{t("terminal.noPositionDescription")}</span></div>
        ) : (
          <div className="terminalPositions">
            <header className="terminalPositionHeader">
              <div><strong>{t("terminal.yourPosition")}</strong><span>{compactAddress(positionData.walletAddress)} · {t("terminal.walletApi")}</span></div>
              <span>{t("terminal.data", { source: positionData.dataSource })}</span>
            </header>
            <div className="terminalPositionScroller">
              <div className="terminalPositionTable">
                <div className="terminalPositionHead"><span>{t("terminal.position")}</span><span>{t("portfolio.tokens")}</span><span>{t("portfolio.averageEntry")}</span><span>{t("terminal.current24h")}</span><span>{t("terminal.valueCost")}</span><span>{t("portfolio.unrealizedPnl")}</span></div>
                {positionData.positions.map((position) => {
                  const isPositive = Number(position.unrealizedPnlUsdc) >= 0;
                  return <div className="terminalPositionRow" key={position.id}>
                    <div><strong>{t(position.side === 0 ? "common.sideA" : "common.sideB")} · {position.tokenSymbol.toUpperCase()}</strong><span>{t("terminal.backing", { side: t(position.side === 0 ? "common.sideA" : "common.sideB") })}</span></div>
                    <strong>{Number(position.tokenBalance).toLocaleString(numberLocale)}</strong>
                    <span>{usdcValue(position.averageEntryPriceUsdc)}</span>
                    <div><strong>{usdcValue(position.currentPriceUsdc)}</strong><span className={`priceChange ${position.change24hPercent >= 0 ? "positive" : "negative"}`}>{signedPercent(position.change24hPercent)} · 24h</span></div>
                    <div><strong>{usdcValue(position.marketValueUsdc)}</strong><span>{t("terminal.cost", { amount: usdcValue(position.costBasisUsdc) })}</span></div>
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
          <div><span>{t("terminal.marketVault")}</span><a href={`${robinhoodTestnet.blockExplorers.default.url}/address/${contest.marketVault}`} rel="noreferrer" target="_blank">{compactAddress(contest.marketVault)} ↗</a></div>
          <div><span>{t("terminal.sideToken", { side: "A" })}</span><strong>{compactAddress(contest.sideAToken)}</strong></div>
          <div><span>{t("terminal.sideToken", { side: "B" })}</span><strong>{compactAddress(contest.sideBToken)}</strong></div>
          <div><span>{t("terminal.marketVersion")}</span><strong>{t("terminal.immutable", { version: contest.marketVersion })}</strong></div>
          <div><span>{t("terminal.settlement")}</span><strong>usdc · 6 decimals</strong></div>
          <div><span>{t("terminal.execution")}</span><strong>{t("terminal.atomicOnchain")}</strong></div>
        </div>
      )}
    </section>
  );
}

"use client";

import Link from "next/link";
import { useState } from "react";
import { useAccount } from "wagmi";

import { WalletButton } from "@/features/wallet/components/wallet-button";
import { robinhoodTestnet } from "@/lib/blockchain/chain";
import { formatUsdcUnits } from "@/lib/formatters/usdc";
import { useI18n } from "@/lib/i18n/locale-context";
import { useWalletPortfolio } from "@/lib/queries/portfolio";

type PortfolioTab = "positions" | "created" | "activity";

function dollars(value: string, locale: string, signed = false) {
  const amount = Number(value);
  const prefix = signed && amount > 0 ? "+" : "";
  return `${prefix}$${amount.toLocaleString(locale, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

function eventTime(timestamp: string, locale: string) {
  return new Intl.DateTimeFormat(locale, { month: "short", day: "2-digit", hour: "2-digit", minute: "2-digit", timeZone: "UTC", hourCycle: "h23" }).format(new Date(Number(timestamp) * 1_000));
}

export function PortfolioDashboard() {
  const { locale, t } = useI18n();
  const numberLocale = locale === "zh" ? "zh-CN" : "en-US";
  const { address, isConnected } = useAccount();
  const [activeTab, setActiveTab] = useState<PortfolioTab>("positions");
  const portfolio = useWalletPortfolio(robinhoodTestnet.id, address);
  const data = portfolio.data;

  if (!isConnected || !address) {
    return <div className="portfolioDemoNotice"><div><strong>{t("common.connectWallet")}</strong><span>{t("portfolio.connectDescription")}</span></div><WalletButton /></div>;
  }
  if (portfolio.isPending) {
    return <div className="terminalPositionLoading" aria-label={t("portfolio.loading")}><span className="skeletonBlock" /><span className="skeletonBlock" /><span className="skeletonBlock" /></div>;
  }
  if (portfolio.error || !data) {
    return <div className="portfolioDemoNotice"><div><strong>{t("portfolio.unavailable")}</strong><span>{t("portfolio.unavailableDescription")}</span></div><button className="button buttonQuiet" onClick={() => void portfolio.refetch()} type="button">{t("common.retry")}</button></div>;
  }

  const summary = [
    { id: "position", label: t("portfolio.positionValue"), value: dollars(data.summary.positionValueUsdc, numberLocale), tone: "" },
    { id: "pnl", label: t("portfolio.unrealizedPnl"), value: dollars(data.summary.unrealizedPnlUsdc, numberLocale, true), tone: Number(data.summary.unrealizedPnlUsdc) >= 0 ? "positive" : "negative" },
    { id: "claimable", label: t("portfolio.claimable"), value: `$${formatUsdcUnits(data.summary.claimableUnits)}`, tone: "crown" },
    { id: "creator", label: t("portfolio.creatorEarned"), value: `$${formatUsdcUnits(data.summary.creatorEarnedUnits)}`, tone: "positive" },
    { id: "referral", label: t("portfolio.referralEarned"), value: `$${formatUsdcUnits(data.summary.referralEarnedUnits)}`, tone: "positive" },
  ];

  return <>
    <section className="portfolioStats">
      {summary.map((stat) => <div key={stat.id}><span>{stat.label}</span><strong data-tone={stat.tone}>{stat.value}</strong>{stat.id === "claimable" && <Link className="portfolioClaimLink" href="/portfolio/earnings">{t("portfolio.claim")}</Link>}</div>)}
    </section>
    <div className="portfolioDemoNotice"><div><strong>{t("portfolio.liveTestnet")}</strong><span>{`${address.slice(0, 6)}…${address.slice(-4)} · ${t("portfolio.indexedBalances")}${data.partial ? ` · ${t("portfolio.partial")}` : ""}`}</span></div><span>{portfolio.isFetching ? t("portfolio.refreshing") : t("portfolio.refreshInterval")}</span></div>
    <div className="portfolioTabs">{(["positions", "created", "activity"] as const).map((tab) => <button aria-pressed={activeTab === tab} key={tab} onClick={() => setActiveTab(tab)} type="button">{t(`portfolio.${tab}`)}</button>)}<Link href="/portfolio/earnings">{t("portfolio.earnings")}</Link></div>

    {activeTab === "positions" && <div className="portfolioTableWrap"><div className="portfolioPositionTable"><div className="portfolioTableHead"><span>{t("portfolio.marketPosition")}</span><span>{t("portfolio.tokens")}</span><span>{t("portfolio.averageEntry")}</span><span>{t("portfolio.current")}</span><span>24h</span><span>{t("portfolio.value")}</span><span>{t("portfolio.unrealizedPnl")}</span></div>{data.positions.length ? data.positions.map((position) => <div className="portfolioTableRow" key={position.id}><div><Link href={`/contest/${position.contestId}`}><strong>{position.marketTitle}</strong></Link><span>{t(position.side === 0 ? "common.sideA" : "common.sideB")} · {position.tokenSymbol}</span></div><span>{Number(position.tokenBalance).toLocaleString(numberLocale)}</span><span>{dollars(position.averageEntryPriceUsdc, numberLocale)}</span><span>{dollars(position.currentPriceUsdc, numberLocale)}</span><strong className="priceChange" data-tone={position.change24hPercent < 0 ? "negative" : "positive"}>{position.change24hPercent >= 0 ? "+" : ""}{position.change24hPercent.toFixed(2)}%</strong><span>{dollars(position.marketValueUsdc, numberLocale)}</span><strong data-tone={Number(position.unrealizedPnlUsdc) < 0 ? "negative" : "positive"}>{dollars(position.unrealizedPnlUsdc, numberLocale, true)}</strong></div>) : <div className="terminalEmpty"><strong>{t("portfolio.noPositions")}</strong><span>{t("portfolio.noPositionsDescription")}</span></div>}</div></div>}

    {activeTab === "created" && <div className="portfolioTableWrap"><div className="portfolioSimpleTable"><div className="portfolioSimpleHead"><span>{t("portfolio.contest")}</span><span>{t("portfolio.status")}</span><span>{t("portfolio.liquidity")}</span><span>{t("common.trades")}</span><span>{t("portfolio.creatorEarned")}</span></div>{data.created.length ? data.created.map((contest) => <div className="portfolioSimpleRow" key={contest.contestId}><Link href={`/contest/${contest.contestId}`}><strong>{contest.title}</strong></Link><span>{contest.status}</span><span>{formatUsdcUnits(contest.liquidityUnits)} usdc</span><span>{contest.tradeCount}</span><strong data-tone="positive">${formatUsdcUnits(contest.creatorEarnedUnits)}</strong></div>) : <div className="terminalEmpty"><strong>{t("portfolio.noCreated")}</strong><span>{t("portfolio.noCreatedDescription")}</span></div>}</div></div>}

    {activeTab === "activity" && <div className="portfolioTableWrap"><div className="portfolioSimpleTable"><div className="portfolioSimpleHead"><span>{t("portfolio.time")}</span><span>{t("portfolio.action")}</span><span>{t("portfolio.market")}</span><span>{t("portfolio.amount")}</span><span>{t("portfolio.transaction")}</span></div>{data.activity.length ? data.activity.map((event) => <div className="portfolioSimpleRow" key={`${event.transactionHash}-${event.blockTimestamp}`}><span>{eventTime(event.blockTimestamp, numberLocale)} utc</span><strong>{t("portfolio.eventAction", { kind: event.kind.toLowerCase(), side: event.side === 0 ? "a" : "b" })}</strong><Link href={`/contest/${event.contestId}`}>{event.marketTitle}</Link><span>{formatUsdcUnits(event.grossUnits)} usdc</span><a className="explorerLink" href={`${robinhoodTestnet.blockExplorers.default.url}/tx/${event.transactionHash}`} rel="noreferrer" target="_blank">{t("portfolio.view")}</a></div>) : <div className="terminalEmpty"><strong>{t("portfolio.noActivity")}</strong><span>{t("portfolio.noActivityDescription")}</span></div>}</div></div>}
  </>;
}

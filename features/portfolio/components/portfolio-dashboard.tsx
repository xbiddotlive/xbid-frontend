"use client";

import Link from "next/link";
import { useState } from "react";
import { formatUnits } from "viem";
import { useAccount } from "wagmi";

import { WalletButton } from "@/features/wallet/components/wallet-button";
import { robinhoodTestnet } from "@/lib/blockchain/chain";
import { useWalletPortfolio } from "@/lib/queries/portfolio";

type PortfolioTab = "positions" | "created" | "activity";

function dollars(value: string, signed = false) {
  const amount = Number(value);
  const prefix = signed && amount > 0 ? "+" : "";
  return `${prefix}$${amount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

function usdcUnits(value: string) {
  return Number(formatUnits(BigInt(value), 6)).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function eventTime(timestamp: string) {
  return new Intl.DateTimeFormat("en", { month: "short", day: "2-digit", hour: "2-digit", minute: "2-digit", timeZone: "UTC", hourCycle: "h23" }).format(new Date(Number(timestamp) * 1_000));
}

export function PortfolioDashboard() {
  const { address, isConnected } = useAccount();
  const [activeTab, setActiveTab] = useState<PortfolioTab>("positions");
  const portfolio = useWalletPortfolio(robinhoodTestnet.id, address);
  const data = portfolio.data;

  if (!isConnected || !address) {
    return <div className="portfolioDemoNotice"><div><strong>connect your wallet</strong><span>read live positions, created contests, transaction history and claimable earnings.</span></div><WalletButton /></div>;
  }
  if (portfolio.isPending) {
    return <div className="terminalPositionLoading" aria-label="loading portfolio"><span className="skeletonBlock" /><span className="skeletonBlock" /><span className="skeletonBlock" /></div>;
  }
  if (portfolio.error || !data) {
    return <div className="portfolioDemoNotice"><div><strong>portfolio unavailable</strong><span>{portfolio.error?.message.toLowerCase() ?? "live portfolio data could not be loaded."}</span></div><button className="button buttonQuiet" onClick={() => void portfolio.refetch()} type="button">retry</button></div>;
  }

  const summary = [
    { label: "position value", value: dollars(data.summary.positionValueUsdc), tone: "" },
    { label: "unrealized pnl", value: dollars(data.summary.unrealizedPnlUsdc, true), tone: Number(data.summary.unrealizedPnlUsdc) >= 0 ? "positive" : "negative" },
    { label: "claimable", value: `$${usdcUnits(data.summary.claimableUnits)}`, tone: "crown" },
    { label: "creator earned", value: `$${usdcUnits(data.summary.creatorEarnedUnits)}`, tone: "positive" },
    { label: "referral earned", value: `$${usdcUnits(data.summary.referralEarnedUnits)}`, tone: "positive" },
  ];

  return <>
    <section className="portfolioStats">
      {summary.map((stat) => <div key={stat.label}><span>{stat.label}</span><strong data-tone={stat.tone}>{stat.value}</strong>{stat.label === "claimable" && <Link className="portfolioClaimLink" href="/portfolio/earnings">claim</Link>}</div>)}
    </section>
    <div className="portfolioDemoNotice"><div><strong>live testnet portfolio</strong><span>{`${address.slice(0, 6)}…${address.slice(-4)} · indexed data with onchain balances${data.partial ? " · partial result" : ""}`}</span></div><span>{portfolio.isFetching ? "refreshing…" : "refreshes every 15s"}</span></div>
    <div className="portfolioTabs">{(["positions", "created", "activity"] as const).map((tab) => <button aria-pressed={activeTab === tab} key={tab} onClick={() => setActiveTab(tab)} type="button">{tab}</button>)}<Link href="/portfolio/earnings">earnings</Link></div>

    {activeTab === "positions" && <div className="portfolioTableWrap"><div className="portfolioPositionTable"><div className="portfolioTableHead"><span>market / position</span><span>tokens</span><span>avg. entry</span><span>current</span><span>24h</span><span>value</span><span>unrealized pnl</span></div>{data.positions.length ? data.positions.map((position) => <div className="portfolioTableRow" key={position.id}><div><Link href={`/contest/${position.contestId}`}><strong>{position.marketTitle}</strong></Link><span>side {position.side === 0 ? "a" : "b"} · {position.tokenSymbol}</span></div><span>{Number(position.tokenBalance).toLocaleString()}</span><span>{dollars(position.averageEntryPriceUsdc)}</span><span>{dollars(position.currentPriceUsdc)}</span><strong data-tone={position.change24hPercent < 0 ? "negative" : "positive"}>{position.change24hPercent >= 0 ? "+" : ""}{position.change24hPercent.toFixed(2)}%</strong><span>{dollars(position.marketValueUsdc)}</span><strong data-tone={Number(position.unrealizedPnlUsdc) < 0 ? "negative" : "positive"}>{dollars(position.unrealizedPnlUsdc, true)}</strong></div>) : <div className="terminalEmpty"><strong>no live positions</strong><span>back either side of a contest to see it here.</span></div>}</div></div>}

    {activeTab === "created" && <div className="portfolioTableWrap"><div className="portfolioSimpleTable"><div className="portfolioSimpleHead"><span>contest</span><span>status</span><span>liquidity</span><span>trades</span><span>creator earned</span></div>{data.created.length ? data.created.map((contest) => <div className="portfolioSimpleRow" key={contest.contestId}><Link href={`/contest/${contest.contestId}`}><strong>{contest.title}</strong></Link><span>{contest.status}</span><span>{usdcUnits(contest.liquidityUnits)} usdc</span><span>{contest.tradeCount}</span><strong data-tone="positive">${usdcUnits(contest.creatorEarnedUnits)}</strong></div>) : <div className="terminalEmpty"><strong>no contests created</strong><span>launch your first live rivalry to track it here.</span></div>}</div></div>}

    {activeTab === "activity" && <div className="portfolioTableWrap"><div className="portfolioSimpleTable"><div className="portfolioSimpleHead"><span>time</span><span>action</span><span>market</span><span>amount</span><span>transaction</span></div>{data.activity.length ? data.activity.map((event) => <div className="portfolioSimpleRow" key={`${event.transactionHash}-${event.blockTimestamp}`}><span>{eventTime(event.blockTimestamp)} utc</span><strong>{event.kind.toLowerCase()} side {event.side === 0 ? "a" : "b"}</strong><Link href={`/contest/${event.contestId}`}>{event.marketTitle}</Link><span>{usdcUnits(event.grossUnits)} usdc</span><a className="explorerLink" href={`${robinhoodTestnet.blockExplorers.default.url}/tx/${event.transactionHash}`} rel="noreferrer" target="_blank">view ↗</a></div>) : <div className="terminalEmpty"><strong>no indexed activity</strong><span>confirmed testnet trades will appear here.</span></div>}</div></div>}
  </>;
}

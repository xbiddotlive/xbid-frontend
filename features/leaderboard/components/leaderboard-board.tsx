"use client";

import { useState } from "react";
import { formatUnits } from "viem";

import type { Leaderboard } from "@/lib/api/leaderboard";

type LeaderboardTab = "trading" | "referrals";

function address(value: string) {
  return `${value.slice(0, 6)}…${value.slice(-4)}`;
}

function units(value: string, signed = false) {
  const amount = Number(formatUnits(BigInt(value), 6));
  return `${signed && amount > 0 ? "+" : ""}$${amount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

export function LeaderboardBoard({ content }: { content: Leaderboard }) {
  const [activeTab, setActiveTab] = useState<LeaderboardTab>("trading");
  const summary = [
    { label: "ranked traders", value: content.summary.rankedTraders.toLocaleString() },
    { label: "top realized pnl", value: units(content.summary.topRealizedPnlUnits, true) },
    { label: "referral rewards", value: units(content.summary.referralRewardsUnits) },
    { label: "referred volume", value: units(content.summary.referredVolumeUnits) },
  ];

  return <>
    <section className="leaderboardSummary">{summary.map((stat) => <div key={stat.label}><span>{stat.label}</span><strong>{stat.value}</strong></div>)}</section>
    <div className="leaderboardNotice"><div><i /><strong>live testnet rankings</strong><span>realized profit and fee vault rewards from confirmed indexed events</span></div><span>all time</span></div>
    <nav className="leaderboardTabs" aria-label="leaderboard type">
      <button aria-pressed={activeTab === "trading"} onClick={() => setActiveTab("trading")} type="button">trading profit</button>
      <button aria-pressed={activeTab === "referrals"} onClick={() => setActiveTab("referrals")} type="button">referral rewards</button>
    </nav>
    <div className="leaderboardTableWrap">
      {activeTab === "trading" ? <div aria-label="trading profit leaderboard" className="leaderboardTable leaderboardTradingTable" role="table">
        <div className="leaderboardHead" role="row"><span>rank</span><span>trader</span><span>realized pnl</span><span>roi</span><span>win rate</span><span>trade volume</span><span>current streak</span></div>
        {content.trading.map((trader, index) => <div className="leaderboardRow" data-rank={index + 1} key={trader.address}><strong className="leaderboardRank">#{String(index + 1).padStart(2, "0")}</strong><div className="leaderboardIdentity"><i>0x</i><strong>{address(trader.address)}</strong></div><strong data-tone={BigInt(trader.realizedPnlUnits) >= 0n ? "positive" : "negative"}>{units(trader.realizedPnlUnits, true)}</strong><span data-tone={trader.roiPercent >= 0 ? "positive" : "negative"}>{trader.roiPercent >= 0 ? "+" : ""}{trader.roiPercent.toFixed(2)}%</span><span>{trader.winRatePercent.toFixed(1)}%</span><span>{units(trader.volumeUnits)}</span><span>{trader.currentStreak} wins</span></div>)}
        {content.trading.length === 0 && <div className="terminalEmpty"><strong>no realized trading results yet</strong><span>rankings begin after a trader closes a position.</span></div>}
      </div> : <div aria-label="referral rewards leaderboard" className="leaderboardTable leaderboardReferralTable" role="table">
        <div className="leaderboardHead" role="row"><span>rank</span><span>referrer</span><span>rewards earned</span><span>traders</span><span>referred trades</span><span>referral volume</span><span>reward share</span></div>
        {content.referrals.map((leader, index) => <div className="leaderboardRow" data-rank={index + 1} key={leader.address}><strong className="leaderboardRank">#{String(index + 1).padStart(2, "0")}</strong><div className="leaderboardIdentity"><i>0x</i><strong>{address(leader.address)}</strong></div><strong data-tone="crown">{units(leader.rewardsUnits)}</strong><span>{leader.referredTraders}</span><span>{leader.referredTrades}</span><span>{units(leader.volumeUnits)}</span><span>{leader.rewardShare.toFixed(2)}%</span></div>)}
        {content.referrals.length === 0 && <div className="terminalEmpty"><strong>no referral rewards yet</strong><span>rewards appear after referred testnet trades accrue fees.</span></div>}
      </div>}
    </div>
    <p className="leaderboardFootnote">realized pnl uses indexed wallet trade cost basis. transferred tokens without trade history are excluded from realized calculations.</p>
  </>;
}

"use client";

import { useState } from "react";
import { formatUnits } from "viem";

import type { Leaderboard } from "@/lib/api/leaderboard";
import { useI18n } from "@/lib/i18n/locale-context";

type LeaderboardTab = "trading" | "referrals";

function address(value: string) {
  return `${value.slice(0, 6)}…${value.slice(-4)}`;
}

function units(value: string, locale: string, signed = false) {
  const amount = Number(formatUnits(BigInt(value), 6));
  return `${signed && amount > 0 ? "+" : ""}$${amount.toLocaleString(locale, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

export function LeaderboardBoard({ content }: { content: Leaderboard }) {
  const { locale, t } = useI18n();
  const numberLocale = locale === "zh" ? "zh-CN" : "en-US";
  const [activeTab, setActiveTab] = useState<LeaderboardTab>("trading");
  const summary = [
    { label: t("leaderboard.rankedTraders"), value: content.summary.rankedTraders.toLocaleString(numberLocale) },
    { label: t("leaderboard.topPnl"), value: units(content.summary.topRealizedPnlUnits, numberLocale, true) },
    { label: t("leaderboard.referralRewards"), value: units(content.summary.referralRewardsUnits, numberLocale) },
    { label: t("leaderboard.referredVolume"), value: units(content.summary.referredVolumeUnits, numberLocale) },
  ];

  return <>
    <section className="leaderboardSummary">{summary.map((stat) => <div key={stat.label}><span>{stat.label}</span><strong>{stat.value}</strong></div>)}</section>
    <div className="leaderboardNotice"><div><i /><strong>{t("leaderboard.live")}</strong><span>{t("leaderboard.liveDescription")}</span></div><span>{t("common.allTime")}</span></div>
    <nav className="leaderboardTabs" aria-label={t("leaderboard.type")}>
      <button aria-pressed={activeTab === "trading"} onClick={() => setActiveTab("trading")} type="button">{t("leaderboard.tradingProfit")}</button>
      <button aria-pressed={activeTab === "referrals"} onClick={() => setActiveTab("referrals")} type="button">{t("leaderboard.referralRewards")}</button>
    </nav>
    <div className="leaderboardTableWrap">
      {activeTab === "trading" ? <div aria-label={t("leaderboard.tradingLabel")} className="leaderboardTable leaderboardTradingTable" role="table">
        <div className="leaderboardHead" role="row"><span>{t("leaderboard.rank")}</span><span>{t("leaderboard.trader")}</span><span>{t("leaderboard.realizedPnl")}</span><span>{t("leaderboard.roi")}</span><span>{t("leaderboard.winRate")}</span><span>{t("leaderboard.tradeVolume")}</span><span>{t("leaderboard.streak")}</span></div>
        {content.trading.map((trader, index) => <div className="leaderboardRow" data-rank={index + 1} key={trader.address}><strong className="leaderboardRank">#{String(index + 1).padStart(2, "0")}</strong><div className="leaderboardIdentity"><i>0x</i><strong>{address(trader.address)}</strong></div><strong data-tone={BigInt(trader.realizedPnlUnits) >= 0n ? "positive" : "negative"}>{units(trader.realizedPnlUnits, numberLocale, true)}</strong><span data-tone={trader.roiPercent >= 0 ? "positive" : "negative"}>{trader.roiPercent >= 0 ? "+" : ""}{trader.roiPercent.toFixed(2)}%</span><span>{trader.winRatePercent.toFixed(1)}%</span><span>{units(trader.volumeUnits, numberLocale)}</span><span>{t("leaderboard.wins", { count: trader.currentStreak })}</span></div>)}
        {content.trading.length === 0 && <div className="terminalEmpty"><strong>{t("leaderboard.noTrading")}</strong><span>{t("leaderboard.noTradingDescription")}</span></div>}
      </div> : <div aria-label={t("leaderboard.referralLabel")} className="leaderboardTable leaderboardReferralTable" role="table">
        <div className="leaderboardHead" role="row"><span>{t("leaderboard.rank")}</span><span>{t("leaderboard.referrer")}</span><span>{t("leaderboard.rewardsEarned")}</span><span>{t("common.traders")}</span><span>{t("leaderboard.referredTrades")}</span><span>{t("leaderboard.referralVolume")}</span><span>{t("leaderboard.rewardShare")}</span></div>
        {content.referrals.map((leader, index) => <div className="leaderboardRow" data-rank={index + 1} key={leader.address}><strong className="leaderboardRank">#{String(index + 1).padStart(2, "0")}</strong><div className="leaderboardIdentity"><i>0x</i><strong>{address(leader.address)}</strong></div><strong data-tone="crown">{units(leader.rewardsUnits, numberLocale)}</strong><span>{leader.referredTraders}</span><span>{leader.referredTrades}</span><span>{units(leader.volumeUnits, numberLocale)}</span><span>{leader.rewardShare.toFixed(2)}%</span></div>)}
        {content.referrals.length === 0 && <div className="terminalEmpty"><strong>{t("leaderboard.noReferrals")}</strong><span>{t("leaderboard.noReferralsDescription")}</span></div>}
      </div>}
    </div>
    <p className="leaderboardFootnote">{t("leaderboard.footnote")}</p>
  </>;
}

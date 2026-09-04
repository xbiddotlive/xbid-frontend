"use client";

import { useState } from "react";
import { formatUnits } from "viem";

import type { NetworkActivity, NetworkActivityEvent } from "@/lib/api/activity";
import { useI18n } from "@/lib/i18n/locale-context";
import type { MessageKey } from "@/lib/i18n/messages";

type ActivityFilter = "all" | "trades" | "flips" | "lead changes" | "crowns" | "comments";

const filterMessages: Record<ActivityFilter, MessageKey> = {
  all: "activity.filter.all", trades: "activity.filter.trades", flips: "activity.filter.flips",
  "lead changes": "activity.filter.lead", crowns: "activity.filter.crowns", comments: "activity.filter.comments",
};

function compactAddress(address: string | null, protocol: string) {
  return address ? `${address.slice(0, 6)}…${address.slice(-4)}` : protocol;
}

function time(timestamp: string, locale: string) {
  return `${new Intl.DateTimeFormat(locale, { month: "short", day: "2-digit", hour: "2-digit", minute: "2-digit", hourCycle: "h23", timeZone: "UTC" }).format(new Date(Number(timestamp) * 1_000))} UTC`;
}

function amount(units: string, locale: string) {
  const value = Number(formatUnits(BigInt(units), 6));
  return value === 0 ? "—" : `${value.toLocaleString(locale, { maximumFractionDigits: 2 })} usdc`;
}

function copy(event: NetworkActivityEvent, t: ReturnType<typeof useI18n>["t"]) {
  const side = event.side === 0 ? "a" : "b";
  const rawAction = event.action.toLowerCase().replaceAll("_", " ");
  const action = ["buy", "sell", "flip"].includes(rawAction) ? t(`activity.action.${rawAction}` as MessageKey) : rawAction;
  if (event.kind === "comment") return { action: t("activity.commentAction"), detail: t("activity.commentDetail"), impact: t("activity.discussion") };
  if (event.kind === "crown") return { action, detail: t("activity.crownDetail", { side: event.side === null ? "" : t("activity.forSide", { side }) }), impact: t("activity.crown") };
  if (event.kind === "lead_change") return { action: t("activity.leadAction", { action, side }), detail: t("activity.leadDetail"), impact: t("activity.leadChanged") };
  if (event.kind === "flip") return { action: t("activity.flipAction", { side }), detail: t("activity.flipDetail"), impact: t("activity.rotation") };
  return { action: t("activity.tradeAction", { action, side }), detail: t("activity.tradeDetail"), impact: t("activity.marketMove") };
}

export function ActivityLedger({ content }: { content: NetworkActivity }) {
  const { locale, t } = useI18n();
  const numberLocale = locale === "zh" ? "zh-CN" : "en-US";
  const [filter, setFilter] = useState<ActivityFilter>("all");
  const matches = (event: NetworkActivityEvent, item: ActivityFilter) => item === "all"
    || (item === "trades" && event.kind === "trade")
    || (item === "flips" && event.kind === "flip")
    || (item === "lead changes" && event.kind === "lead_change")
    || (item === "crowns" && event.kind === "crown")
    || (item === "comments" && event.kind === "comment");
  const visible = content.events.filter((event) => matches(event, filter));
  const summary = [
    { label: t("activity.volume"), value: `${Number(formatUnits(BigInt(content.summary.volumeUnits), 6)).toLocaleString(numberLocale, { notation: "compact", maximumFractionDigits: 2 })} usdc` },
    { label: t("activity.confirmedTrades"), value: content.summary.tradeCount },
    { label: t("activity.atomicFlips"), value: content.summary.flipCount },
    { label: t("common.comments"), value: content.summary.commentCount },
  ];

  return <>
    <section className="activitySummary">{summary.map((stat) => <div key={stat.label}><span>{stat.label}</span><strong>{stat.value}</strong><b>{t("common.live")}</b></div>)}</section>
    <div className="activityDemoNotice"><div><i /><strong>{t("activity.stream")}</strong><span>{t("activity.streamDescription")}</span></div><span>{t("activity.rolling")}</span></div>
    <div className="marketFilters pageFilters activityFilters" aria-label={t("activity.filters")}>{(["all", "trades", "flips", "lead changes", "crowns", "comments"] as const).map((item) => <button aria-pressed={filter === item} key={item} onClick={() => setFilter(item)} type="button">{t(filterMessages[item])}<span>{content.events.filter((event) => matches(event, item)).length}</span></button>)}</div>
    <div aria-label={t("activity.network")} className="activityFeedTable" role="table">
      <div className="activityFeedHead" role="row"><span role="columnheader">{t("activity.time")}</span><span role="columnheader">{t("activity.event")}</span><span role="columnheader">{t("activity.market")}</span><span role="columnheader">{t("activity.amount")}</span><span role="columnheader">{t("activity.impact")}</span><span role="columnheader">{t("common.open")}</span></div>
      {visible.map((event) => { const display = copy(event, t); return <article className="activityFeedRow" data-kind={event.kind} key={event.id} role="row">
        <time>{time(event.occurredAt, numberLocale)}</time>
        <div className="activityWho"><span className="activityKind">{t(`activity.kind.${event.kind}` as MessageKey)}</span><strong>{display.action}</strong><span>{compactAddress(event.actor, t("activity.protocol"))}</span></div>
        <div className="activityMarket"><strong>{event.marketTitle}</strong><span>{display.detail}</span></div>
        <strong className="activityAmount">{amount(event.amountUnits, numberLocale)}</strong>
        <span className="activityImpact">{display.impact}</span>
        <a href={`/contest/${event.contestId}`}>{event.kind === "comment" ? t("activity.thread") : t("activity.contest")}</a>
      </article>; })}
      {visible.length === 0 && <div className="terminalEmpty"><strong>{t("activity.empty")}</strong><span>{t("activity.emptyDescription")}</span></div>}
    </div>
  </>;
}

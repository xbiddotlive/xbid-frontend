"use client";

import { useState } from "react";
import { formatUnits } from "viem";

import type { NetworkActivity, NetworkActivityEvent } from "@/lib/api/activity";

type ActivityFilter = "all" | "trades" | "flips" | "lead changes" | "crowns" | "comments";

function compactAddress(address: string | null) {
  return address ? `${address.slice(0, 6)}…${address.slice(-4)}` : "protocol";
}

function time(timestamp: string) {
  return `${new Intl.DateTimeFormat("en", { month: "short", day: "2-digit", hour: "2-digit", minute: "2-digit", hourCycle: "h23", timeZone: "UTC" }).format(new Date(Number(timestamp) * 1_000))} UTC`;
}

function amount(units: string) {
  const value = Number(formatUnits(BigInt(units), 6));
  return value === 0 ? "—" : `${value.toLocaleString(undefined, { maximumFractionDigits: 2 })} usdc`;
}

function copy(event: NetworkActivityEvent) {
  if (event.kind === "comment") return { action: "posted a market view", detail: "new wallet-authenticated commentary", impact: "discussion" };
  if (event.kind === "crown") return { action: event.action.toLowerCase().replaceAll("_", " "), detail: `crown state updated${event.side === null ? "" : ` for side ${event.side === 0 ? "a" : "b"}`}`, impact: "crown" };
  if (event.kind === "lead_change") return { action: `${event.action.toLowerCase().replaceAll("_", " ")} side ${event.side === 0 ? "a" : "b"}`, detail: "the market lead changed onchain", impact: "lead changed" };
  if (event.kind === "flip") return { action: `flipped from side ${event.side === 0 ? "a" : "b"}`, detail: "capital rotated atomically to the opposing side", impact: "rotation" };
  return { action: `${event.action.toLowerCase().replaceAll("_", " ")} side ${event.side === 0 ? "a" : "b"}`, detail: "confirmed Testnet trade", impact: "market move" };
}

export function ActivityLedger({ content }: { content: NetworkActivity }) {
  const [filter, setFilter] = useState<ActivityFilter>("all");
  const matches = (event: NetworkActivityEvent, item: ActivityFilter) => item === "all"
    || (item === "trades" && event.kind === "trade")
    || (item === "flips" && event.kind === "flip")
    || (item === "lead changes" && event.kind === "lead_change")
    || (item === "crowns" && event.kind === "crown")
    || (item === "comments" && event.kind === "comment");
  const visible = content.events.filter((event) => matches(event, filter));
  const summary = [
    { label: "24h volume", value: `${Number(formatUnits(BigInt(content.summary.volumeUnits), 6)).toLocaleString(undefined, { notation: "compact", maximumFractionDigits: 2 })} usdc` },
    { label: "confirmed trades", value: content.summary.tradeCount },
    { label: "atomic flips", value: content.summary.flipCount },
    { label: "comments", value: content.summary.commentCount },
  ];

  return <>
    <section className="activitySummary">{summary.map((stat) => <div key={stat.label}><span>{stat.label}</span><strong>{stat.value}</strong><b>live</b></div>)}</section>
    <div className="activityDemoNotice"><div><i /><strong>live activity stream</strong><span>confirmed indexer events and wallet-authenticated comments</span></div><span>rolling 24h</span></div>
    <div className="marketFilters pageFilters activityFilters" aria-label="activity filters">{(["all", "trades", "flips", "lead changes", "crowns", "comments"] as const).map((item) => <button aria-pressed={filter === item} key={item} onClick={() => setFilter(item)} type="button">{item}<span>{content.events.filter((event) => matches(event, item)).length}</span></button>)}</div>
    <div aria-label="network activity" className="activityFeedTable" role="table">
      <div className="activityFeedHead" role="row"><span role="columnheader">time</span><span role="columnheader">event / participant</span><span role="columnheader">market</span><span role="columnheader">amount</span><span role="columnheader">impact</span><span role="columnheader">open</span></div>
      {visible.map((event) => { const display = copy(event); return <article className="activityFeedRow" data-kind={event.kind} key={event.id} role="row">
        <time>{time(event.occurredAt)}</time>
        <div className="activityWho"><span className="activityKind">{event.kind.replace("_", " ")}</span><strong>{display.action}</strong><span>{compactAddress(event.actor)}</span></div>
        <div className="activityMarket"><strong>{event.marketTitle}</strong><span>{display.detail}</span></div>
        <strong className="activityAmount">{amount(event.amountUnits)}</strong>
        <span className="activityImpact">{display.impact}</span>
        <a href={`/contest/${event.contestId}`}>{event.kind === "comment" ? "thread ↗" : "contest ↗"}</a>
      </article>; })}
      {visible.length === 0 && <div className="terminalEmpty"><strong>no matching events in the last 24 hours</strong><span>new confirmed activity will appear automatically.</span></div>}
    </div>
  </>;
}

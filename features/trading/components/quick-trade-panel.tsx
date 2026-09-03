"use client";

import { ActivityIcon } from "@/components/ui/icons";
import type { IndexedContest } from "@/lib/api/contests";
import { TradeTicket, type TradeMode } from "./trade-ticket";

type Side = 0 | 1;

export function QuickTradePanel({ contest, initialMode = "buy", initialSide = 0, onConfirmed }: { contest: IndexedContest; initialMode?: TradeMode; initialSide?: Side; onConfirmed: () => void }) {
  return (
    <section className="quickTradePanel" aria-label="quick trade">
      <header><ActivityIcon /><strong>quick trade</strong></header>
      <TradeTicket contest={contest} embedded initialMode={initialMode} initialSide={initialSide} onConfirmed={onConfirmed} />
    </section>
  );
}

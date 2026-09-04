"use client";

import { ActivityIcon, CloseIcon } from "@/components/ui/icons";
import type { IndexedContest } from "@/lib/api/contests";
import { TradeTicket, type TradeMode } from "./trade-ticket";

type Side = 0 | 1;

export function QuickTradePanel({ contest, initialMode = "buy", initialSide = 0, onClose, onConfirmed }: { contest: IndexedContest; initialMode?: TradeMode; initialSide?: Side; onClose?: () => void; onConfirmed: () => void }) {
  return (
    <section className="quickTradePanel" aria-label="quick trade">
      <header><ActivityIcon /><strong>quick trade</strong>{onClose ? <button aria-label="close quick trade" className="iconButton" onClick={onClose} type="button"><CloseIcon /></button> : null}</header>
      <TradeTicket contest={contest} embedded initialMode={initialMode} initialSide={initialSide} onConfirmed={onConfirmed} />
    </section>
  );
}

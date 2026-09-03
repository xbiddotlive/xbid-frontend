"use client";

import { useEffect, useRef, useState } from "react";

import { TradeTicket, type TradeMode } from "./trade-ticket";
import type { IndexedContest } from "@/lib/api/contests";

type Side = 0 | 1;

export function TradeDock({ contest, initialMode, initialSide = 0, onConfirmed }: { contest: IndexedContest; initialMode?: TradeMode; initialSide?: Side; onConfirmed: () => void }) {
  const [openTrade, setOpenTrade] = useState<{ mode: TradeMode; side: Side } | null>(null);
  const panelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!openTrade) return;
    const previouslyFocused = document.activeElement as HTMLElement | null;
    panelRef.current?.focus();
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpenTrade(null);
    };
    window.addEventListener("keydown", closeOnEscape);
    return () => {
      window.removeEventListener("keydown", closeOnEscape);
      previouslyFocused?.focus();
    };
  }, [openTrade]);

  return (
    <>
      {openTrade && (
        <div className="tradeDrawerLayer">
          <button aria-label="close trade drawer" className="drawerScrim" onClick={() => setOpenTrade(null)} type="button" />
          <div aria-modal="true" className="tradeDrawerPanel" ref={panelRef} role="dialog" tabIndex={-1}><TradeTicket contest={contest} initialMode={openTrade.mode} initialSide={openTrade.side} key={`${openTrade.mode}-${openTrade.side}`} onClose={() => setOpenTrade(null)} onConfirmed={onConfirmed} /></div>
        </div>
      )}
      <div className="tradeDock" aria-label="quick trade">
        <button className="dockSideA" onClick={() => setOpenTrade({ mode: initialMode === "sell" ? "sell" : "buy", side: 0 })} type="button"><span>{initialMode === "sell" ? "sell" : "back"}</span><strong>side a</strong></button>
        <button className="dockFlip" onClick={() => setOpenTrade({ mode: "flip", side: initialSide })} type="button"><span>atomic</span><strong>flip</strong></button>
        <button className="dockSideB" onClick={() => setOpenTrade({ mode: initialMode === "sell" ? "sell" : "buy", side: 1 })} type="button"><span>{initialMode === "sell" ? "sell" : "back"}</span><strong>side b</strong></button>
      </div>
    </>
  );
}

"use client";

import { useEffect, useRef, useState } from "react";

import type { IndexedContest } from "@/lib/api/contests";
import { useI18n } from "@/lib/i18n/locale-context";
import { QuickTradePanel } from "./quick-trade-panel";
import type { TradeMode } from "./trade-ticket";

type Side = 0 | 1;

export function TradeDock({ contest, initialMode, initialSide = 0, onConfirmed }: { contest: IndexedContest; initialMode?: TradeMode; initialSide?: Side; onConfirmed: () => void }) {
  const { t } = useI18n();
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
          <button aria-label={t("trade.closeDrawer")} className="drawerScrim" onClick={() => setOpenTrade(null)} type="button" />
          <div aria-modal="true" className="tradeDrawerPanel" ref={panelRef} role="dialog" tabIndex={-1}><QuickTradePanel contest={contest} initialMode={openTrade.mode} initialSide={openTrade.side} key={`${openTrade.mode}-${openTrade.side}`} onClose={() => setOpenTrade(null)} onConfirmed={onConfirmed} /></div>
        </div>
      )}
      <div className="tradeDock" aria-label={t("trade.quick")}>
        <button className="dockSideA" onClick={() => setOpenTrade({ mode: initialMode === "sell" ? "sell" : "buy", side: 0 })} type="button"><span>{t(initialMode === "sell" ? "trade.sell" : "trade.back")}</span><strong>{t("common.sideA")}</strong></button>
        <button className="dockFlip" onClick={() => setOpenTrade({ mode: "flip", side: initialSide })} type="button"><span>{t("trade.atomic")}</span><strong>{t("trade.flip")}</strong></button>
        <button className="dockSideB" onClick={() => setOpenTrade({ mode: initialMode === "sell" ? "sell" : "buy", side: 1 })} type="button"><span>{t(initialMode === "sell" ? "trade.sell" : "trade.back")}</span><strong>{t("common.sideB")}</strong></button>
      </div>
    </>
  );
}

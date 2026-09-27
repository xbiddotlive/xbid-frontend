"use client";
import { useEffect, useRef, useState } from "react";
import { getContest, type IndexedContest } from "@/lib/api/contests";
import { robinhoodTestnet as activeChain } from "@/lib/blockchain/chain";
import { useI18n } from "@/lib/i18n/locale-context";
import { QuickTradePanel } from "@/features/trading/components/quick-trade-panel";

export default function ExploreQuickTrade({ contestId, side, onClose, onConfirmed }: { contestId: string; side: 0 | 1; onClose: () => void; onConfirmed: () => void }) {
  const { t } = useI18n();
  const [contest, setContest] = useState<IndexedContest | null>(null);
  const [failed, setFailed] = useState(false);
  const panel = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const abort = new AbortController();
    void getContest(activeChain.id, contestId, abort.signal).then(setContest).catch(() => { if (!abort.signal.aborted) setFailed(true); });
    return () => abort.abort();
  }, [contestId]);
  useEffect(() => {
    const previous = document.activeElement as HTMLElement | null;
    const overflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    panel.current?.focus();
    const keydown = (event: KeyboardEvent) => {
      // Do not intercept a wallet provider's own portal/dialog.
      if (!panel.current?.contains(document.activeElement)) return;
      if (event.key === "Escape") { event.stopPropagation(); onClose(); }
      if (event.key !== "Tab") return;
      const targets = [...panel.current.querySelectorAll<HTMLElement>('button:not(:disabled), a[href], input:not(:disabled), select:not(:disabled), [tabindex="0"]')].filter(el => el.getClientRects().length);
      const first = targets[0], last = targets.at(-1);
      if (!first) { event.preventDefault(); return; }
      if (event.shiftKey && (document.activeElement === first || document.activeElement === panel.current)) { event.preventDefault(); last?.focus(); }
      else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus(); }
    };
    window.addEventListener("keydown", keydown);
    return () => { document.body.style.overflow = overflow; window.removeEventListener("keydown", keydown); previous?.focus(); };
  }, [onClose]);
  return <div className="tradeDrawerLayer exploreTradeLayer"><button className="drawerScrim" type="button" tabIndex={-1} aria-label={t("trade.closeQuick")} onClick={onClose} /><div className="tradeDrawerPanel" role="dialog" aria-modal="true" aria-label={t("trade.quick")} tabIndex={-1} ref={panel}>
    {contest ? <><p className="exploreTradeTitle">{contest.metadata.title}</p><QuickTradePanel contest={contest} initialSide={side} initialMode="buy" onClose={onClose} onConfirmed={onConfirmed} /></> : <div className="emptyState" role="status"><span>{t(failed ? "discovery.noData" : "common.loadingPage")}</span><button className="button" type="button" onClick={onClose}>{t("trade.closeQuick")}</button></div>}
  </div></div>;
}

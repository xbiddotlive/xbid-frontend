"use client";

import { ActivityIcon, CloseIcon } from "@/components/ui/icons";
import type { IndexedContest } from "@/lib/api/contests";
import { useI18n } from "@/lib/i18n/locale-context";
import { TradeTicket, type TradeMode } from "./trade-ticket";

type Side = 0 | 1;

export function QuickTradePanel({ contest, initialMode = "buy", initialSide = 0, onClose, onConfirmed }: { contest: IndexedContest; initialMode?: TradeMode; initialSide?: Side; onClose?: () => void; onConfirmed: () => void }) {
  const { t } = useI18n();
  return (
    <section className="quickTradePanel" aria-label={t("trade.quick")}>
      <header><ActivityIcon /><strong>{t("trade.quick")}</strong>{onClose ? <button aria-label={t("trade.closeQuick")} className="iconButton" onClick={onClose} type="button"><CloseIcon /></button> : null}</header>
      <TradeTicket contest={contest} embedded initialMode={initialMode} initialSide={initialSide} onConfirmed={onConfirmed} />
    </section>
  );
}

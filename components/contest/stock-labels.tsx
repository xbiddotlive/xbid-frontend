"use client";

import { useI18n } from "@/lib/i18n/locale-context";
import type { StockReference } from "@/lib/product/stock-catalog";

export function StockLabels({ category, stocks }: { category: string; stocks?: StockReference[] }) {
  const { t } = useI18n();
  if (category !== "stocks" || !stocks?.length) return null;
  return <div className="stockLabels" aria-label={t("stocks.label")}>
    {stocks.map(stock => <span key={stock.id} title={stock.name}>{stock.exchange}:{stock.symbol}</span>)}
  </div>;
}

export function StockNotice({ category }: { category: string }) {
  const { t } = useI18n();
  return category === "stocks" ? <p className="stockNotice">{t("stocks.disclaimer")}</p> : null;
}

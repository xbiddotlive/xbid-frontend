"use client";

import { useId, useState } from "react";
import { useI18n } from "@/lib/i18n/locale-context";
import { searchStocks, selectedStocks } from "@/lib/product/stock-catalog";

export function StockPicker({ value, onChange, disabled = false }: {
  value: string[]; onChange: (ids: string[]) => void; disabled?: boolean;
}) {
  const { t } = useI18n();
  const id = useId();
  const [query, setQuery] = useState("");
  const selected = selectedStocks(value);
  const results = searchStocks(query).filter(stock => !value.includes(stock.id));
  return (
    <fieldset className="field fieldWide stockPicker" disabled={disabled}>
      <legend>{t("stocks.label")} <em className="fieldRequirement" data-kind="required">{t("launch.required")}</em></legend>
      <label className="visuallyHidden" htmlFor={id}>{t("stocks.search")}</label>
      <input id={id} type="search" maxLength={100} autoComplete="off" value={query} placeholder={t("stocks.search")} onChange={event => setQuery(event.target.value)} aria-describedby={`${id}-help`} />
      <small id={`${id}-help`}>{t("stocks.help")}</small>
      {selected.length > 0 && <div className="stockSelection">
        {selected.map(stock => <button key={stock.id} type="button" aria-label={`${t("launch.remove")} ${stock.exchange}:${stock.symbol}`} onClick={() => onChange(value.filter(item => item !== stock.id))}>
          {stock.exchange}:{stock.symbol}<span aria-hidden="true"> ×</span>
        </button>)}
      </div>}
      {value.length < 2 ? <div className="stockPickerResults">
        {results.map(stock => <button key={stock.id} type="button" onClick={() => { onChange([...value, stock.id]); setQuery(""); }}>
          <strong>{stock.symbol} · {stock.name}</strong><span>{stock.exchange}</span>
        </button>)}
        {results.length === 0 && <p role="status">{t("stocks.empty")}</p>}
      </div> : <small role="status">{t("stocks.limit")}</small>}
      <p className="stockNotice">{t("stocks.disclaimer")}</p>
    </fieldset>
  );
}

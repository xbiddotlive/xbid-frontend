"use client";

import { useId, useState } from "react";

import { ChevronIcon } from "@/components/ui/icons";
import { useI18n } from "@/lib/i18n/locale-context";

const presets = [10, 50, 100] as const;

export function normalizeSlippageBps(value: number) {
  return Math.min(500, Math.max(1, Math.round(value)));
}

export function SlippageControl({ onChange, value }: { onChange: (value: number) => void; value: number }) {
  const { locale, t } = useI18n();
  const [open, setOpen] = useState(false);
  const [custom, setCustom] = useState("");
  const panelId = useId();
  const display = `${(value / 100).toLocaleString(locale === "zh" ? "zh-CN" : "en-US", { maximumFractionDigits: 2 })}%`;

  const applyCustom = (next: string) => {
    setCustom(next);
    const percent = Number(next);
    if (Number.isFinite(percent) && percent > 0 && percent <= 5) onChange(normalizeSlippageBps(percent * 100));
  };

  return (
    <div className="slippageControl" onKeyDown={(event) => { if (event.key === "Escape") setOpen(false); }}>
      <button aria-controls={panelId} aria-expanded={open} className="slippageTrigger" onClick={() => setOpen((current) => !current)} title={t("trade.slippageConfigure")} type="button">
        <span>{t("trade.slippage")}</span><strong>{display}</strong><ChevronIcon />
      </button>
      {open && (
        <div className="slippagePanel" id={panelId}>
          <header><strong>{t("trade.slippageMaximum")}</strong><span>{t("trade.priceProtection")}</span></header>
          <div className="slippagePresets">
            {presets.map((preset) => <button aria-pressed={value === preset} key={preset} onClick={() => { onChange(preset); setCustom(""); }} type="button">{preset / 100}%</button>)}
          </div>
          <label><span>{t("trade.custom")}</span><div><input aria-label={t("trade.customSlippage")} inputMode="decimal" max="5" min="0.01" onChange={(event) => applyCustom(event.target.value)} placeholder="0.50" value={custom} /><b>%</b></div></label>
          <p className={value >= 100 ? "slippageWarning" : ""}>{value >= 100 ? t("trade.highSlippage") : t("trade.slippageProtected")}</p>
        </div>
      )}
    </div>
  );
}

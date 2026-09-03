"use client";

import { useId, useState } from "react";

import { ChevronIcon } from "@/components/ui/icons";

const presets = [10, 50, 100] as const;

export function normalizeSlippageBps(value: number) {
  return Math.min(500, Math.max(1, Math.round(value)));
}

export function SlippageControl({ onChange, value }: { onChange: (value: number) => void; value: number }) {
  const [open, setOpen] = useState(false);
  const [custom, setCustom] = useState("");
  const panelId = useId();
  const display = `${(value / 100).toLocaleString(undefined, { maximumFractionDigits: 2 })}%`;

  const applyCustom = (next: string) => {
    setCustom(next);
    const percent = Number(next);
    if (Number.isFinite(percent) && percent > 0 && percent <= 5) onChange(normalizeSlippageBps(percent * 100));
  };

  return (
    <div className="slippageControl" onKeyDown={(event) => { if (event.key === "Escape") setOpen(false); }}>
      <button aria-controls={panelId} aria-expanded={open} className="slippageTrigger" onClick={() => setOpen((current) => !current)} title="configure maximum slippage" type="button">
        <span>slippage</span><strong>{display}</strong><ChevronIcon />
      </button>
      {open && (
        <div className="slippagePanel" id={panelId}>
          <header><strong>maximum slippage</strong><span>price protection</span></header>
          <div className="slippagePresets">
            {presets.map((preset) => <button aria-pressed={value === preset} key={preset} onClick={() => { onChange(preset); setCustom(""); }} type="button">{preset / 100}%</button>)}
          </div>
          <label><span>custom</span><div><input aria-label="custom slippage percentage" inputMode="decimal" max="5" min="0.01" onChange={(event) => applyCustom(event.target.value)} placeholder="0.50" value={custom} /><b>%</b></div></label>
          <p className={value >= 100 ? "slippageWarning" : ""}>{value >= 100 ? "high slippage increases execution risk." : "minimum received is enforced onchain."}</p>
        </div>
      )}
    </div>
  );
}

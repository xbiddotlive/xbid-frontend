import type { IndexedTradePoint } from "@/lib/api/contests";
import { marketControl } from "@/lib/product/market-metrics";

type DuelCurveProps = {
  history: IndexedTradePoint[];
  compact?: boolean;
  marketVersion?: number;
};

function shareOf(point: IndexedTradePoint, marketVersion: number) {
  return marketControl(point.qAAfterWei, point.qBAfterWei, marketVersion)[0];
}

function linePoints(history: IndexedTradePoint[], side: "A" | "B", marketVersion: number) {
  const values = history.map((point) => {
    const sideAShare = shareOf(point, marketVersion);
    return side === "A" ? sideAShare : 100 - sideAShare;
  });

  if (values.length === 1) values.unshift(values[0]);

  return values
    .map((value, index) => {
      const x = values.length === 1 ? 50 : 2 + (index / (values.length - 1)) * 96;
      const y = 48 - value * 0.46;
      return `${x.toFixed(2)},${y.toFixed(2)}`;
    })
    .join(" ");
}

function timeLabel(timestamp: string) {
  return new Intl.DateTimeFormat("en", {
    hour: "2-digit",
    minute: "2-digit",
    timeZone: "UTC",
  }).format(new Date(Number(timestamp) * 1_000));
}

export function DuelCurve({ history, compact = false, marketVersion = 1 }: DuelCurveProps) {
  if (history.length === 0) {
    return (
      <div className={compact ? "duelCurve duelCurveCompact" : "duelCurve"} data-empty="true">
        <span>waiting for the first onchain move</span>
      </div>
    );
  }

  const first = history[0];
  const last = history[history.length - 1];

  return (
    <div className={compact ? "duelCurve duelCurveCompact" : "duelCurve"}>
      <svg
        aria-label={`side a and side b control across ${history.length} onchain trades; both sides total 100 percent`}
        preserveAspectRatio="none"
        role="img"
        viewBox="0 0 100 50"
      >
        <path className="curveGrid" d="M0 12.5H100 M0 25H100 M0 37.5H100" />
        <path className="curveMidline" d="M0 25H100" />
        <polyline className="curveLine curveLineA" points={linePoints(history, "A", marketVersion)} />
        <polyline className="curveLine curveLineB" points={linePoints(history, "B", marketVersion)} />
      </svg>
      {!compact && (
        <>
          <div className="curveScale" aria-hidden="true"><span>100%</span><span>50%</span><span>0%</span></div>
          <div className="curveAxis" aria-hidden="true">
            <span>{timeLabel(first.blockTimestamp)}</span>
            <span>{history.length} real moves</span>
            <span>{timeLabel(last.blockTimestamp)}</span>
          </div>
        </>
      )}
    </div>
  );
}

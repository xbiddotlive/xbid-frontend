import type { IndexedTradePoint } from "@/lib/api/contests";
import { marketControl } from "@/lib/product/market-metrics";

type DuelCurveProps = {
  history: IndexedTradePoint[];
  compact?: boolean;
  includeOrigin?: boolean;
  marketVersion?: number;
};

type ControlDomain = {
  maximum: number;
  minimum: number;
};

function controlSeries(history: IndexedTradePoint[], marketVersion: number, includeOrigin: boolean) {
  const sideA = history.map((point) => marketControl(point.qAAfterWei, point.qBAfterWei, marketVersion)[0]);
  if (includeOrigin) sideA.unshift(50);
  if (sideA.length === 1) sideA.unshift(sideA[0]);
  return { sideA, sideB: sideA.map((value) => 100 - value) };
}

function controlDomain(values: number[]): ControlDomain {
  const maximumDeviation = Math.max(...values.map((value) => Math.abs(value - 50)));
  const halfRange = [2, 5, 10, 20, 50].find((range) => range >= maximumDeviation * 1.2) ?? 50;
  return { maximum: 50 + halfRange, minimum: 50 - halfRange };
}

function linePoints(values: number[], domain: ControlDomain) {
  return values
    .map((value, index) => {
      const x = values.length === 1 ? 50 : 2 + (index / (values.length - 1)) * 96;
      const y = 48 - ((value - domain.minimum) / (domain.maximum - domain.minimum)) * 46;
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

export function DuelCurve({ history, compact = false, includeOrigin = false, marketVersion = 1 }: DuelCurveProps) {
  if (history.length === 0) {
    return (
      <div className={compact ? "duelCurve duelCurveCompact" : "duelCurve"} data-empty="true">
        <span>waiting for the first onchain move</span>
      </div>
    );
  }

  const first = history[0];
  const last = history[history.length - 1];
  const series = controlSeries(history, marketVersion, includeOrigin);
  const domain = compact ? { maximum: 100, minimum: 0 } : controlDomain([...series.sideA, ...series.sideB]);
  const zoomed = domain.minimum !== 0 || domain.maximum !== 100;
  const overlapping = series.sideA.every((value, index) => Math.abs(value - series.sideB[index]) < 0.02);

  return (
    <div className={compact ? "duelCurve duelCurveCompact" : "duelCurve"} data-overlap={overlapping}>
      <svg
        aria-label={`side a and side b control across ${history.length} onchain trades; both sides total 100 percent`}
        preserveAspectRatio="none"
        role="img"
        viewBox="0 0 100 50"
      >
        <path className="curveGrid" d="M0 12.5H100 M0 25H100 M0 37.5H100" />
        <path className="curveMidline" d="M0 25H100" />
        <polyline className="curveLine curveLineA" points={linePoints(series.sideA, domain)} />
        <polyline className="curveLine curveLineB" points={linePoints(series.sideB, domain)} />
      </svg>
      {!compact && (
        <>
          {zoomed ? <span className="curveRange">zoom · {domain.minimum}–{domain.maximum}%</span> : null}
          <div className="curveScale" aria-hidden="true"><span>{domain.maximum}%</span><span>50%</span><span>{domain.minimum}%</span></div>
          <div className="curveAxis" aria-hidden="true">
            <span>{includeOrigin ? "market open" : timeLabel(first.blockTimestamp)}</span>
            <span>{history.length} real moves</span>
            <span>{timeLabel(last.blockTimestamp)}</span>
          </div>
        </>
      )}
    </div>
  );
}

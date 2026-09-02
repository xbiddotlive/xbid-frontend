type DominanceMeterProps = {
  sideAPercent: number;
  sideBPercent: number;
  large?: boolean;
};

export function DominanceMeter({
  sideAPercent,
  sideBPercent,
  large = false,
}: DominanceMeterProps) {
  return (
    <div
      className={large ? "dominanceMeter dominanceMeterLarge" : "dominanceMeter"}
      aria-label={`Side A ${sideAPercent}%, Side B ${sideBPercent}%`}
    >
      <div className="dominanceLabels" aria-hidden="true">
        <span>Side A · {sideAPercent}%</span>
        <span>Side B · {sideBPercent}%</span>
      </div>
      <progress max="100" value={sideAPercent}>
        Side A {sideAPercent}%
      </progress>
    </div>
  );
}

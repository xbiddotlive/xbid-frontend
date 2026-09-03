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
      aria-label={`side a ${sideAPercent}%, side b ${sideBPercent}%`}
    >
      <div className="dominanceLabels" aria-hidden="true">
        <span>side a · {sideAPercent}%</span>
        <span>side b · {sideBPercent}%</span>
      </div>
      <progress max="100" value={sideAPercent}>
        side a {sideAPercent}%
      </progress>
    </div>
  );
}

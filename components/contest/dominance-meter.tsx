"use client";

import { useI18n } from "@/lib/i18n/locale-context";

export function SideShareTrack({ sideAPercent, label }: { sideAPercent: number; label: string }) {
  return <svg className="sideShareTrack" width="100%" height="5" role="img" aria-label={label}>
    <rect className="sideShareTrackB" width="100%" height="100%" />
    <rect className="sideShareTrackA" width={`${sideAPercent}%`} height="100%" />
  </svg>;
}

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
  const { t } = useI18n();
  return (
    <div
      className={large ? "dominanceMeter dominanceMeterLarge" : "dominanceMeter"}
      aria-label={`${t("common.sideA")} ${sideAPercent}%, ${t("common.sideB")} ${sideBPercent}%`}
    >
      <div className="dominanceLabels" aria-hidden="true">
        <span>{t("common.sideA")} · {sideAPercent}%</span>
        <span>{t("common.sideB")} · {sideBPercent}%</span>
      </div>
      <SideShareTrack sideAPercent={sideAPercent} label={`${t("common.sideA")} ${sideAPercent}%, ${t("common.sideB")} ${sideBPercent}%`} />
    </div>
  );
}

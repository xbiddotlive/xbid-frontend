"use client";

import { useI18n } from "@/lib/i18n/locale-context";

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
      <progress max="100" value={sideAPercent}>
        {t("common.sideA")} {sideAPercent}%
      </progress>
    </div>
  );
}

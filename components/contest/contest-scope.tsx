"use client";

import { useMemo } from "react";
import { useI18n } from "@/lib/i18n/locale-context";
import { locales, localeInfo } from "@/lib/i18n/locales";
import { countryCodes } from "@/lib/product/contest-scope";

export function RegionSelect({ value, onChange, filter = false, disabled = false }: { value: string; onChange: (value: string) => void; filter?: boolean; disabled?: boolean }) {
  const { locale, t } = useI18n();
  const options = useMemo(() => {
    const names = new Intl.DisplayNames([localeInfo(locale).htmlLang], { type: "region" });
    return countryCodes.map(code => ({ code, name: names.of(code) ?? code }));
  }, [locale]);
  return <select name="region" aria-label={t("scope.region")} value={value} disabled={disabled} onChange={event => onChange(event.target.value)}>
    {filter && <option value="">{t("scope.allRegions")}</option>}
    <option value="GLOBAL">{t("scope.global")}</option>
    {filter && <option value="UNSET">{t("scope.unset")}</option>}
    {options.map(({ code, name }) => <option key={code} value={code}>{name}</option>)}
  </select>;
}

export function ContestScopeLabel({ metadata, detailed = false }: { metadata: { region?: string; contentLanguage?: string }; detailed?: boolean }) {
  const { locale, t } = useI18n();
  const region = !metadata.region ? t("scope.unset") : metadata.region === "GLOBAL" ? t("scope.global")
    : new Intl.DisplayNames([localeInfo(locale).htmlLang], { type: "region" }).of(metadata.region) ?? metadata.region;
  const language = locales.find(item => item.code === metadata.contentLanguage)?.name;
  return <span className="contestScopeLabel" title={t("scope.regionHelp")}>
    {detailed ? `${t("scope.region")}: ${region}` : region}
    {(language || detailed) && <> · {detailed ? t("scope.language") + ": " : ""}{language ?? t("scope.unset")}</>}
  </span>;
}

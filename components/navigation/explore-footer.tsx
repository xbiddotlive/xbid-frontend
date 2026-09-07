"use client";

import Link from "next/link";

import { ThemeToggle } from "@/components/navigation/theme-toggle";
import { DiscordIcon, GlobeIcon, XIcon } from "@/components/ui/icons";
import { useI18n } from "@/lib/i18n/locale-context";
import { isLocale, locales } from "@/lib/i18n/locales";

const brandName = "WEconomy Labs";

const xUrl = process.env.NEXT_PUBLIC_X_URL ?? "https://x.com/xbid_live";
const discordUrl = process.env.NEXT_PUBLIC_DISCORD_URL ?? "https://discord.gg/xnD5vcPU9B";

export function ExploreFooter() {
  const { locale, setLocale, localeLoading, localeError, t } = useI18n();

  return (
    <footer className="exploreFooter">
      <div className="exploreFooterInner">
        <div className="exploreFooterMain">
          <nav aria-label={`${brandName} social links`} className="exploreSocials">
            <a aria-label={`${brandName} on X`} href={xUrl} rel="noreferrer" target="_blank"><XIcon /></a>
            <a aria-label={`${brandName} on Discord`} href={discordUrl} rel="noreferrer" target="_blank"><DiscordIcon /></a>
          </nav>

          <div className="exploreFooterBrand">
            <div><strong>{brandName} © 2026</strong><span>{t("footer.market")}</span></div>
            <nav aria-label={t("footer.product")}><Link href="/how-it-works">{t("nav.how")}</Link><Link href="/docs">{t("footer.docs")}</Link></nav>
          </div>

          <div className="exploreFooterControls">
            <ThemeToggle />
            <label className="exploreLanguage">
              <GlobeIcon />
              <span className="visuallyHidden">{t("footer.language")}</span>
              <select aria-busy={localeLoading} aria-label={t("footer.language")} onChange={(event) => { if (isLocale(event.target.value)) setLocale(event.target.value); }} value={locale}>
                {locales.map((entry) => <option key={entry.code} lang={entry.htmlLang} value={entry.code}>{entry.name}</option>)}
              </select>
            </label>
            {localeError && <span role="alert">{t("error.retry")}</span>}
          </div>
        </div>
        <p>{t("footer.risk")}</p>
      </div>
    </footer>
  );
}

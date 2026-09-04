"use client";

import Link from "next/link";

import {
  ActivityIcon,
  BookIcon,
  CompassIcon,
  CrownIcon,
  LeaderboardIcon,
  PlusIcon,
  PortfolioIcon,
  ProfileIcon,
  SearchIcon,
} from "@/components/ui/icons";
import { ChainSelector } from "@/components/navigation/chain-selector";
import { WalletButton } from "@/features/wallet/components/wallet-button";
import { useI18n } from "@/lib/i18n/locale-context";

export function GlobalHeader() {
  const { t } = useI18n();
  return (
    <>
      <header className="globalHeader">
        <div className="headerInner">
          <Link className="wordmark" href="/">
            <i aria-hidden="true" className="wordmarkLiveDot" /><span className="wordmarkName">xbid</span><span className="wordmarkLive">.live</span>
          </Link>
          <nav className="primaryNav" aria-label={t("nav.primary")}>
            <Link href="/"><CompassIcon />{t("nav.explore")}</Link>
            <Link href="/how-it-works"><BookIcon />{t("nav.how")}</Link>
            <Link href="/crowned"><CrownIcon />{t("nav.crowned")}</Link>
            <Link href="/activity"><ActivityIcon />{t("nav.activity")}</Link>
            <Link href="/leaderboard"><LeaderboardIcon />{t("nav.leaderboard")}</Link>
            <Link href="/portfolio"><PortfolioIcon />{t("nav.portfolio")}</Link>
          </nav>
          <Link className="searchShell" href="/#all-markets-heading">
            <SearchIcon />
            {t("nav.browse")}
          </Link>
          <div className="headerActions">
            <Link className="button buttonLaunch" href="/launch"><PlusIcon />{t("nav.launch")}</Link>
            <WalletButton />
            <ChainSelector />
          </div>
        </div>
      </header>
      <nav className="mobileNav" aria-label={t("nav.mobile")}>
        <Link href="/"><CompassIcon /><span>{t("nav.explore")}</span></Link>
        <Link href="/activity"><ActivityIcon /><span>{t("nav.activity")}</span></Link>
        <Link href="/leaderboard"><LeaderboardIcon /><span>{t("nav.leaders")}</span></Link>
        <Link className="mobileLaunch" href="/launch"><PlusIcon /><span>{t("nav.launch")}</span></Link>
        <Link href="/portfolio"><PortfolioIcon /><span>{t("nav.portfolio")}</span></Link>
        <Link href="/profile/me"><ProfileIcon /><span>{t("nav.profile")}</span></Link>
      </nav>
    </>
  );
}

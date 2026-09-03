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
import { WalletButton } from "@/features/wallet/components/wallet-button";

export function GlobalHeader() {
  return (
    <>
      <header className="globalHeader">
        <div className="headerInner">
          <Link className="wordmark" href="/">
            <i aria-hidden="true" className="wordmarkLiveDot" /><span className="wordmarkName">xbid</span><span className="wordmarkLive">.live</span>
          </Link>
          <nav className="primaryNav" aria-label="primary navigation">
            <Link href="/"><CompassIcon />explore</Link>
            <Link href="/how-it-works"><BookIcon />how it works</Link>
            <Link href="/crowned"><CrownIcon />crowned</Link>
            <Link href="/activity"><ActivityIcon />activity</Link>
            <Link href="/leaderboard"><LeaderboardIcon />leaderboard</Link>
            <Link href="/portfolio"><PortfolioIcon />portfolio</Link>
          </nav>
          <Link className="searchShell" href="/#all-markets-heading">
            <SearchIcon />
            <span>browse contests</span>
          </Link>
          <div className="headerActions">
            <Link className="button buttonLaunch" href="/launch"><PlusIcon />launch</Link>
            <WalletButton />
          </div>
        </div>
      </header>
      <nav className="mobileNav" aria-label="mobile navigation">
        <Link href="/"><CompassIcon /><span>explore</span></Link>
        <Link href="/activity"><ActivityIcon /><span>activity</span></Link>
        <Link href="/leaderboard"><LeaderboardIcon /><span>leaders</span></Link>
        <Link className="mobileLaunch" href="/launch"><PlusIcon /><span>launch</span></Link>
        <Link href="/portfolio"><PortfolioIcon /><span>portfolio</span></Link>
        <Link href="/profile/me"><ProfileIcon /><span>profile</span></Link>
      </nav>
    </>
  );
}

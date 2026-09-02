import Link from "next/link";

import { WalletButton } from "@/features/wallet/components/wallet-button";

export function GlobalHeader() {
  return (
    <>
      <header className="globalHeader">
        <div className="headerInner">
          <Link className="wordmark" href="/">
            <b aria-hidden="true"><i /><i /></b> xbid<span>.live</span>
          </Link>
          <div className="searchShell" aria-label="Search contests">
            <span aria-hidden="true">⌕</span>
            <span>Search live contests</span>
          </div>
          <div className="headerActions">
            <Link className="button buttonLaunch" href="/launch">＋ Launch</Link>
            <WalletButton />
          </div>
        </div>
      </header>
      <nav className="categoryNav" aria-label="Contest categories">
        <div className="categoryInner">
          <Link className="categoryActive" href="/">Markets</Link>
          <Link href="/?category=live">Live</Link>
          <span>Crypto</span>
          <span>Sports</span>
          <span>Culture</span>
          <span>Technology</span>
          <span>New</span>
        </div>
      </nav>
    </>
  );
}

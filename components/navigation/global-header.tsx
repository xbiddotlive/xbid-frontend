import Link from "next/link";

import { WalletButton } from "@/features/wallet/components/wallet-button";

export function GlobalHeader() {
  return (
    <>
      <header className="globalHeader">
        <div className="headerInner">
          <Link className="wordmark" href="/">
            xbid<span>.live</span>
          </Link>
          <div className="searchShell" aria-label="Search contests">
            <span aria-hidden="true">⌕</span>
            <span>Search live contests</span>
          </div>
          <WalletButton />
        </div>
      </header>
      <nav className="categoryNav" aria-label="Contest categories">
        <div className="categoryInner">
          <Link className="categoryActive" href="/">Trending</Link>
          <span>Crypto</span>
          <span>Sports</span>
          <span>Culture</span>
          <span>Technology</span>
          <span>Live now</span>
        </div>
      </nav>
    </>
  );
}

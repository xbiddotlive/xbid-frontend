import Link from "next/link";

import { MarketDiscovery } from "@/features/discovery/components/market-discovery";
import { listContests, type IndexedContest } from "@/lib/api/contests";
import { robinhoodTestnet } from "@/lib/blockchain/chain";

export const dynamic = "force-dynamic";

export default async function HomePage() {
  let contests: IndexedContest[] = [];
  let apiAvailable = true;

  try {
    contests = await listContests(robinhoodTestnet.id);
  } catch {
    apiAvailable = false;
  }

  return (
    <main className="pageShell">
      <section className="heroSection heroArena">
        <div className="heroContent">
          <p className="eyebrow">XBID live arena · Robinhood Testnet</p>
          <h1>Pick a side.<br /><em>Move the crowd.</em></h1>
          <p className="heroCopy">
            Two sides enter. Every back, sell, and flip moves the live contest.
            Follow the signal—or create the next rivalry.
          </p>
          <div className="heroActions">
            <a className="button buttonPrimary" href="#all-markets-heading">Explore markets</a>
            <Link className="button buttonInverse" href="/launch">Launch a contest</Link>
          </div>
        </div>
        <div className="heroSignal" aria-hidden="true">
          <span className="signalSideA">A</span>
          <span className="signalX">×</span>
          <span className="signalSideB">B</span>
          <small>{apiAvailable ? "LIVE SIGNAL" : "RECONNECTING"}</small>
        </div>
      </section>
      <MarketDiscovery contests={contests} apiAvailable={apiAvailable} />
    </main>
  );
}

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
          <p className="eyebrow"><span className="livePulse" /> Live on Robinhood Testnet</p>
          <h1>The market is a live argument. <em>Pick your side.</em></h1>
          <p className="heroCopy">
            Two positions. One shared curve. Every back, sell, and atomic flip
            changes the balance in real time.
          </p>
          <div className="heroActions">
            <a className="button buttonPrimary" href="#all-markets-heading">Explore markets</a>
            <Link className="button buttonInverse" href="/launch">Launch a contest</Link>
          </div>
        </div>
        <div className="heroSignal" aria-label="Live arena status">
          <div className="pulseIdentity" aria-hidden="true"><span>A</span><i /><span>B</span></div>
          <strong>{String(contests.length).padStart(2, "0")} markets moving now</strong>
          <span>{apiAvailable ? "Live feed connected" : "Feed reconnecting"}</span>
        </div>
      </section>
      <MarketDiscovery contests={contests} apiAvailable={apiAvailable} />
    </main>
  );
}

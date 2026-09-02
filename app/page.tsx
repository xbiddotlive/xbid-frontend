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
          <p className="eyebrow"><span className="livePulse" /> XBID Redline · Robinhood Testnet</p>
          <h1>Choose a side. <em>Shift the line.</em></h1>
          <p className="heroCopy">
            Every back, sell, and atomic flip moves a live two-sided contest.
            Read the momentum, enter the arena, and fight for the crown.
          </p>
          <div className="heroActions">
            <a className="button buttonPrimary" href="#all-markets-heading">Explore markets</a>
            <Link className="button buttonInverse" href="/launch">Launch a contest</Link>
          </div>
        </div>
        <div className="heroSignal" aria-label="Live arena status">
          <span className="signalLabel">LIVE CONTROL</span>
          <strong>{String(contests.length).padStart(2, "0")}</strong>
          <span>ACTIVE ARENAS</span>
          <div><span>{apiAvailable ? "FEED ONLINE" : "RECONNECTING"}</span><span>MARKET V1</span></div>
        </div>
      </section>
      <MarketDiscovery contests={contests} apiAvailable={apiAvailable} />
    </main>
  );
}

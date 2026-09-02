import { ContestCard } from "@/components/contest/contest-card";
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
      <section className="heroSection">
        <div>
          <p className="eyebrow">Robinhood Chain Testnet</p>
          <h1>The live contest market</h1>
          <p className="heroCopy">
            Back a side, move its live price, and compete for the crown. Every
            transaction below settles against real XBID Testnet contracts.
          </p>
        </div>
        <div className={apiAvailable ? "networkPill" : "statusWarning"}>
          {apiAvailable && <i />} {apiAvailable ? "Testnet live" : "Indexer reconnecting"}
        </div>
      </section>

      <section>
        <div className="sectionHeading">
          <div>
            <p className="eyebrow">Featured contest</p>
            <h2>Live market</h2>
          </div>
          <span className="muted">{contests.length} contest{contests.length === 1 ? "" : "s"}</span>
        </div>

        {contests.map((contest) => (
          <ContestCard key={contest.contestId} contest={contest} />
        ))}

        {contests.length === 0 && (
          <div className="emptyState" data-testid="contest-empty-state">
            <strong>{apiAvailable ? "No contests indexed yet" : "Live data is temporarily unavailable"}</strong>
            <span>{apiAvailable ? "The first registered market will appear automatically." : "The page will recover when the local API reconnects."}</span>
          </div>
        )}
      </section>
    </main>
  );
}

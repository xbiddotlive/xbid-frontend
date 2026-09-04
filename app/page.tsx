import { MarketDiscovery } from "@/features/discovery/components/market-discovery";
import { listContests, type IndexedContest } from "@/lib/api/contests";
import { robinhoodTestnet } from "@/lib/blockchain/chain";
import { pageMetadata } from "@/lib/seo/site";

export const metadata = pageMetadata({
  title: "explore live contests",
  description: "Discover live two-sided onchain contests, compare prices and 24-hour momentum, and back your side.",
  path: "/",
});

export const dynamic = "force-dynamic";

export default async function HomePage() {
  let contests: IndexedContest[] = [];
  let apiAvailable = true;

  try {
    contests = await listContests(robinhoodTestnet.id);
  } catch {
    apiAvailable = false;
  }

  return <main className="pageShell homePage"><MarketDiscovery contests={contests} apiAvailable={apiAvailable} /></main>;
}

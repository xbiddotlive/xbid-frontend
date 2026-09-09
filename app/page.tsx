import { MarketDiscovery } from "@/features/discovery/components/market-discovery";
import { getContestPage, getContestSummary, type ContestPage } from "@/lib/api/contests";
import { robinhoodTestnet } from "@/lib/blockchain/chain";
import { pageMetadata } from "@/lib/seo/site";

export const metadata = pageMetadata({
  title: "explore live contests",
  description: "Discover live two-sided onchain contests, compare prices and 24-hour momentum, and back your side.",
  path: "/",
});

export const dynamic = "force-dynamic";

export default async function HomePage({ searchParams }: { searchParams: Promise<{ q?: string }> }) {
  const params = await searchParams;
  const query = typeof params.q === "string" ? params.q.trim().slice(0, 100) : "";
  let page: ContestPage = { items: [], nextCursor: null };
  let apiAvailable = true;
  const summaryRequest = getContestSummary(robinhoodTestnet.id).catch(() => null);

  try {
    page = await getContestPage(robinhoodTestnet.id, undefined, query);
  } catch {
    apiAvailable = false;
  }

  const summary = await summaryRequest;
  return <main className="pageShell homePage"><MarketDiscovery key={query} initialPage={page} summary={summary} query={query} apiAvailable={apiAvailable} /></main>;
}

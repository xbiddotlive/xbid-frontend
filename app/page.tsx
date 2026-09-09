import { MarketDiscovery } from "@/features/discovery/components/market-discovery";
import { getContestPage, getContestSummary, type ContestPage } from "@/lib/api/contests";
import { robinhoodTestnet } from "@/lib/blockchain/chain";
import { pageMetadata } from "@/lib/seo/site";
import { notFound } from "next/navigation";
import { isRegionFilter } from "@/lib/product/contest-scope";
import { contestCategories } from "@/lib/product/contest-categories";
import type { MarketFilter } from "@/features/discovery/components/market-presentation";

export const metadata = pageMetadata({
  title: "explore live contests",
  description: "Discover live two-sided onchain contests, compare prices and 24-hour momentum, and back your side.",
  path: "/",
});

export const dynamic = "force-dynamic";

export default async function HomePage({ searchParams }: { searchParams: Promise<{ q?: string; region?: string; category?: string; signal?: string }> }) {
  const params = await searchParams;
  const query = typeof params.q === "string" ? params.q.trim().slice(0, 100) : "";
  const region = params.region ?? "";
  const category = params.category ?? "";
  const signal = params.signal ?? "trending";
  if (!isRegionFilter(region) || (category !== "" && !contestCategories.some(c => c.value === category))
    || !["trending", "new", "close battles", "comebacks", "crowned"].includes(signal)) notFound();
  const scopedRequest = region || category
    ? getContestPage(robinhoodTestnet.id, undefined, query, { region, category }).then(page => ({ page, available: true })).catch(() => ({ page: { items: [], nextCursor: null } as ContestPage, available: false }))
    : Promise.resolve(null);
  let page: ContestPage = { items: [], nextCursor: null };
  let apiAvailable = true;
  const summaryRequest = getContestSummary(robinhoodTestnet.id).catch(() => null);

  try {
    page = await getContestPage(robinhoodTestnet.id, undefined, query);
  } catch {
    apiAvailable = false;
  }

  const summary = await summaryRequest;
  const scoped = await scopedRequest;
  return <main className="pageShell homePage"><MarketDiscovery key={JSON.stringify([query, region, category, signal])} initialPage={page} summary={summary} query={query} apiAvailable={apiAvailable} region={region} category={category} signal={signal as MarketFilter} initialScopedPage={scoped?.page} scopedAvailable={scoped?.available} /></main>;
}

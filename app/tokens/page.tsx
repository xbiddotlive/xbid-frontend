import { TokenDirectory } from "@/features/discovery/components/token-directory";
import { getContestPage, type ContestPage } from "@/lib/api/contests";
import { robinhoodTestnet } from "@/lib/blockchain/chain";
import { pageMetadata } from "@/lib/seo/site";

export const metadata = pageMetadata({ title: "all tokens", description: "Browse every indexed contest token, paired side A and side B with live prices and 24-hour changes.", path: "/tokens" });
export const dynamic = "force-dynamic";

export default async function TokensPage({ searchParams }: { searchParams: Promise<{ q?: string }> }) {
  const params = await searchParams;
  const query = typeof params.q === "string" ? params.q.trim().slice(0, 100) : "";
  let page: ContestPage = { items: [], nextCursor: null };
  let available = true;
  try { page = await getContestPage(robinhoodTestnet.id, undefined, query); }
  catch { available = false; }
  return <main className="pageShell utilityPage"><TokenDirectory key={query} initial={page} query={query} available={available} /></main>;
}

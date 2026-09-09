import { apiEndpoint, apiJson } from "./http";
import { contestListSchema, contestSchema, tradeListSchema } from "./schemas";
import { z } from "zod";

export type IndexedTradePoint = ReturnType<typeof tradeListSchema.parse>["items"][number];
export type IndexedContest = ReturnType<typeof contestSchema.parse>;
export type IndexedMarket = NonNullable<IndexedContest["market"]>;

export type ContestPage = { items: IndexedContest[]; nextCursor: string | null };
export type ContestScope = { region?: string; category?: string };
export async function getContestPage(chainId: number, cursor?: string, search = "", scope: ContestScope = {}): Promise<ContestPage> {
  const params = new URLSearchParams({ limit: "24" });
  if (cursor) params.set("cursor", cursor);
  if (search) params.set("q", search.slice(0, 100));
  if (scope.region) params.set("region", scope.region);
  if (scope.category) params.set("category", scope.category);
  const response = await fetch(apiEndpoint(`/v1/chains/${chainId}/contests?${params}`), { cache: "no-store", signal: AbortSignal.timeout(8_000) });
  const page = contestListSchema.parse(await apiJson(response));
  if (page.items.some(contest => (scope.region && (scope.region === "UNSET" ? contest.metadata.region !== undefined : contest.metadata.region !== scope.region))
    || (scope.category && contest.metadata.category !== scope.category))) {
    throw new Error("Contest scope was not respected by the server");
  }
  return page;
}

const count = z.string().regex(/^\d+$/);
const summarySchema = z.object({ contestCount: count, totalVolumeUnits: count, totalTrades: count,
  volume24hUnits: count, trades24h: count, leadFlips24h: count, comments: count, asOf: z.iso.datetime() });
export type ContestSummary = z.infer<typeof summarySchema>;
export async function getContestSummary(chainId: number) {
  const response = await fetch(apiEndpoint(`/v1/chains/${chainId}/contests/summary`), { cache: "no-store", signal: AbortSignal.timeout(8_000) });
  return summarySchema.parse(await apiJson(response));
}

export async function listContests(chainId: number): Promise<IndexedContest[]> {
  const response = await fetch(apiEndpoint(`/v1/chains/${chainId}/contests`), {
    cache: "no-store",
    signal: AbortSignal.timeout(4_000),
  });
  return contestListSchema.parse(await apiJson(response)).items;
}

export async function getContest(chainId: number, contestId: string, signal?: AbortSignal) {
  const response = await fetch(apiEndpoint(`/v1/chains/${chainId}/contests/${encodeURIComponent(contestId)}`), {
    cache: "no-store",
    signal: signal ?? AbortSignal.timeout(4_000),
  });
  return contestSchema.parse(await apiJson(response));
}

export async function listContestTrades(chainId: number, contestId: string, signal?: AbortSignal) {
  const response = await fetch(apiEndpoint(`/v1/chains/${chainId}/contests/${encodeURIComponent(contestId)}/trades?limit=40`), {
    cache: "no-store",
    signal: signal ?? AbortSignal.timeout(4_000),
  });
  return tradeListSchema.parse(await apiJson(response));
}

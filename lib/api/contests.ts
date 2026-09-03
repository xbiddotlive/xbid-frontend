import { apiEndpoint, apiJson } from "./http";
import { contestListSchema, contestSchema, tradeListSchema } from "./schemas";

export type IndexedTradePoint = ReturnType<typeof tradeListSchema.parse>["items"][number];
export type IndexedContest = ReturnType<typeof contestSchema.parse>;
export type IndexedMarket = NonNullable<IndexedContest["market"]>;

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

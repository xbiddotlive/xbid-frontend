import { apiEndpoint, apiJson } from "./http";
import { leaderboardSchema } from "./schemas";

export type Leaderboard = ReturnType<typeof leaderboardSchema.parse>;

export async function getLeaderboard(chainId: number, signal?: AbortSignal) {
  const response = await fetch(apiEndpoint(`/v1/chains/${chainId}/leaderboard`), { cache: "no-store", signal });
  return leaderboardSchema.parse(await apiJson(response));
}

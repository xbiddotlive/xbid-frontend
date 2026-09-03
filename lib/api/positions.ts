import type { Address } from "viem";

import { apiEndpoint, apiJson } from "./http";
import { positionsResponseSchema } from "./schemas";

export type ContestPosition = ReturnType<typeof positionsResponseSchema.parse>["positions"][number];
export type ContestPositionsResponse = ReturnType<typeof positionsResponseSchema.parse>;

export async function getContestPositions(
  chainId: number,
  contestId: string,
  walletAddress: Address,
  signal?: AbortSignal,
) {
  const response = await fetch(
    apiEndpoint(`/v1/chains/${chainId}/contests/${encodeURIComponent(contestId)}/positions/${encodeURIComponent(walletAddress)}`),
    { cache: "no-store", signal },
  );
  return positionsResponseSchema.parse(await apiJson(response));
}

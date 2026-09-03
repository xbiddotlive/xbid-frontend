import { useQuery } from "@tanstack/react-query";
import type { Address } from "viem";

import { getContest, listContestTrades, type IndexedContest, type IndexedTradePoint } from "@/lib/api/contests";
import { getContestPositions } from "@/lib/api/positions";

export const contestKeys = {
  detail: (chainId: number, contestId: string) => ["contest", chainId, contestId] as const,
  trades: (chainId: number, contestId: string) => ["contest-trades", chainId, contestId] as const,
  positions: (chainId: number, contestId: string, address: Address) => ["contest-positions", chainId, contestId, address] as const,
};

export function useContestDetail(chainId: number, contestId: string, initialData: IndexedContest) {
  return useQuery({
    queryKey: contestKeys.detail(chainId, contestId),
    queryFn: ({ signal }) => getContest(chainId, contestId, signal),
    initialData,
    refetchInterval: 8_000,
  });
}

export function useContestTrades(chainId: number, contestId: string, initialData: IndexedTradePoint[]) {
  return useQuery({
    queryKey: contestKeys.trades(chainId, contestId),
    queryFn: ({ signal }) => listContestTrades(chainId, contestId, signal).then((response) => response.items),
    initialData,
    refetchInterval: 4_000,
  });
}

export function useContestPositions(chainId: number, contestId: string, address?: Address, enabled = true) {
  return useQuery({
    queryKey: address ? contestKeys.positions(chainId, contestId, address) : ["contest-positions", chainId, contestId, "disconnected"],
    queryFn: ({ signal }) => getContestPositions(chainId, contestId, address!, signal),
    enabled: enabled && Boolean(address),
    refetchInterval: 15_000,
  });
}

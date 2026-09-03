import { useQuery } from "@tanstack/react-query";
import type { Address } from "viem";

import { getWalletPortfolio } from "@/lib/api/portfolio";

export const portfolioKey = (chainId: number, address: Address) => ["wallet-portfolio", chainId, address] as const;

export function useWalletPortfolio(chainId: number, address?: Address) {
  return useQuery({
    queryKey: address ? portfolioKey(chainId, address) : ["wallet-portfolio", chainId, "disconnected"],
    queryFn: ({ signal }) => getWalletPortfolio(chainId, address!, signal),
    enabled: Boolean(address),
    refetchInterval: 15_000,
  });
}

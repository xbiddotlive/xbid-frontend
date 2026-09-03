import type { Address } from "viem";

import { apiEndpoint, apiJson } from "./http";
import { walletPortfolioSchema } from "./schemas";

export type WalletPortfolio = ReturnType<typeof walletPortfolioSchema.parse>;

export async function getWalletPortfolio(chainId: number, walletAddress: Address, signal?: AbortSignal) {
  const response = await fetch(
    apiEndpoint(`/v1/chains/${chainId}/portfolios/${encodeURIComponent(walletAddress)}`),
    { cache: "no-store", signal },
  );
  return walletPortfolioSchema.parse(await apiJson(response));
}

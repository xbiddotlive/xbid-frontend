import { defineChain } from "viem";

const chainId = Number(process.env.NEXT_PUBLIC_CHAIN_ID ?? "46630");
const rpcUrl = process.env.NEXT_PUBLIC_CHAIN_RPC_URL
  ?? process.env.NEXT_PUBLIC_ROBINHOOD_TESTNET_RPC_URL
  ?? "https://rpc.testnet.chain.robinhood.com";
const explorerUrl = process.env.NEXT_PUBLIC_CHAIN_EXPLORER_URL
  ?? "https://explorer.testnet.chain.robinhood.com";
const isTestnet = (process.env.NEXT_PUBLIC_CHAIN_TESTNET ?? "true") === "true";

export const robinhoodTestnet = defineChain({
  id: chainId,
  name: process.env.NEXT_PUBLIC_CHAIN_NAME ?? "Robinhood Chain Testnet",
  nativeCurrency: { name: "Ether", symbol: "ETH", decimals: 18 },
  rpcUrls: {
    default: {
      http: [rpcUrl],
    },
  },
  blockExplorers: {
    default: {
      name: process.env.NEXT_PUBLIC_CHAIN_EXPLORER_NAME ?? "Robinhood Explorer",
      url: explorerUrl,
    },
  },
  testnet: isTestnet,
});

export const networkLabel = robinhoodTestnet.name.toLowerCase();
export const settlementTokenLabel = isTestnet ? "test usdc" : "usdc";

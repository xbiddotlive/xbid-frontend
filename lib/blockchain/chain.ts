import { defineChain } from "viem";

const chainId = Number(process.env.NEXT_PUBLIC_CHAIN_ID ?? "46630");
const isBase = chainId === 84532 || chainId === 8453;
const isBaseSepolia = chainId === 84532;
const rpcUrl = process.env.NEXT_PUBLIC_CHAIN_RPC_URL
  ?? (isBase ? (isBaseSepolia ? "https://sepolia.base.org" : "https://mainnet.base.org")
    : process.env.NEXT_PUBLIC_ROBINHOOD_TESTNET_RPC_URL ?? "https://rpc.testnet.chain.robinhood.com");
const explorerUrl = process.env.NEXT_PUBLIC_CHAIN_EXPLORER_URL
  ?? (isBase ? (isBaseSepolia ? "https://sepolia.basescan.org" : "https://basescan.org")
    : "https://explorer.testnet.chain.robinhood.com");
const isTestnet = (process.env.NEXT_PUBLIC_CHAIN_TESTNET ?? (chainId === 8453 ? "false" : "true")) === "true";

export const activeChain = defineChain({
  id: chainId,
  name: process.env.NEXT_PUBLIC_CHAIN_NAME ?? (isBase ? (isBaseSepolia ? "Base Sepolia" : "Base") : "Robinhood Chain Testnet"),
  nativeCurrency: { name: "Ether", symbol: "ETH", decimals: 18 },
  rpcUrls: {
    default: {
      http: [rpcUrl],
    },
  },
  blockExplorers: {
    default: {
      name: process.env.NEXT_PUBLIC_CHAIN_EXPLORER_NAME ?? (isBase ? "Basescan" : "Robinhood Explorer"),
      url: explorerUrl,
    },
  },
  testnet: isTestnet,
});

// Compatibility alias for existing consumers; this is the configured chain, not a second network.
export const robinhoodTestnet = activeChain;
export const chainFamilyLabel = isBase ? "Base" : "Robinhood Chain";
export const plannedMainnetId = isBase ? 8453 : 4663;
export const chainIconPath = isBase ? "/icons/base-chain.svg" : "/icons/robinhood-chain-avatar.jpg";
export const networkLabel = activeChain.name.toLowerCase();
export const settlementTokenLabel = isTestnet ? "test usdc" : "usdc";

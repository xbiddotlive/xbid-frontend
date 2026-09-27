import { activeChain } from "@/lib/blockchain/chain";

export function SettlementFaucetLink() {
  if (activeChain.id !== 84532 || !activeChain.testnet) return null;
  return <a className="explorerLink" href="https://faucet.circle.com/" rel="noreferrer" target="_blank">base sepolia usdc · faucet.circle.com ↗</a>;
}

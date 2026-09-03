"use client";

import Link from "next/link";
import { formatUnits } from "viem";
import { useAccount } from "wagmi";

import { WalletButton } from "@/features/wallet/components/wallet-button";
import { robinhoodTestnet } from "@/lib/blockchain/chain";
import { useWalletPortfolio } from "@/lib/queries/portfolio";
import { EarningsClaimPanel } from "./earnings-claim-panel";

function units(value: string) {
  return Number(formatUnits(BigInt(value), 6)).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 4 });
}

export function EarningsOverview() {
  const { address, isConnected } = useAccount();
  const portfolio = useWalletPortfolio(robinhoodTestnet.id, address);

  if (!isConnected || !address) return <section className="earningsPanel"><p>connect your wallet to read the live fee vault balance and indexed earnings history.</p><WalletButton /><Link className="button buttonQuiet" href="/portfolio">back to portfolio</Link></section>;
  if (portfolio.isPending) return <section className="earningsPanel"><div className="terminalPositionLoading"><span className="skeletonBlock" /><span className="skeletonBlock" /></div></section>;
  if (!portfolio.data || portfolio.error) return <section className="earningsPanel"><p>{portfolio.error?.message.toLowerCase() ?? "earnings are unavailable."}</p><button className="button buttonQuiet" onClick={() => void portfolio.refetch()} type="button">retry</button></section>;

  const { summary } = portfolio.data;
  return <section className="earningsPanel">
    <div className="earningsBreakdown">
      <div><span>creator earnings · lifetime</span><strong>{units(summary.creatorEarnedUnits)} usdc</strong></div>
      <div><span>referral rewards · lifetime</span><strong>{units(summary.referralEarnedUnits)} usdc</strong></div>
      <div><span>claimable now</span><strong data-tone="crown">{units(summary.claimableUnits)} usdc</strong></div>
    </div>
    <p>lifetime sources are indexed from fee vault events. the claimable balance is read directly from the live testnet contract.</p>
    <EarningsClaimPanel onConfirmed={() => void portfolio.refetch()} />
    <Link className="button buttonQuiet" href="/portfolio">back to portfolio</Link>
  </section>;
}

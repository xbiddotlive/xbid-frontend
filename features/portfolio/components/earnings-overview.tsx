"use client";

import Link from "next/link";
import { useAccount } from "wagmi";

import { WalletButton } from "@/features/wallet/components/wallet-button";
import { robinhoodTestnet } from "@/lib/blockchain/chain";
import { formatUsdcUnits } from "@/lib/formatters/usdc";
import { useI18n } from "@/lib/i18n/locale-context";
import { useWalletPortfolio } from "@/lib/queries/portfolio";
import { EarningsClaimPanel } from "./earnings-claim-panel";

export function EarningsOverview() {
  const { t } = useI18n();
  const { address, isConnected } = useAccount();
  const portfolio = useWalletPortfolio(robinhoodTestnet.id, address);

  if (!isConnected || !address) return <section className="earningsPanel"><p>{t("earnings.connectDescription")}</p><WalletButton /><Link className="button buttonQuiet" href="/portfolio">{t("earnings.back")}</Link></section>;
  if (portfolio.isPending) return <section className="earningsPanel"><div className="terminalPositionLoading"><span className="skeletonBlock" /><span className="skeletonBlock" /></div></section>;
  if (!portfolio.data || portfolio.error) return <section className="earningsPanel"><p>{t("earnings.unavailable")}</p><button className="button buttonQuiet" onClick={() => void portfolio.refetch()} type="button">{t("common.retry")}</button></section>;

  const { summary } = portfolio.data;
  return <section className="earningsPanel">
    <div className="earningsBreakdown">
      <div><span>{t("earnings.creatorLifetime")}</span><strong>{formatUsdcUnits(summary.creatorEarnedUnits)} usdc</strong></div>
      <div><span>{t("earnings.referralLifetime")}</span><strong>{formatUsdcUnits(summary.referralEarnedUnits)} usdc</strong></div>
      <div><span>{t("earnings.claimableNow")}</span><strong data-tone="crown">{formatUsdcUnits(summary.claimableUnits)} usdc</strong></div>
    </div>
    <p>{t("earnings.sourceDescription")}</p>
    <EarningsClaimPanel onConfirmed={() => void portfolio.refetch()} />
    <Link className="button buttonQuiet" href="/portfolio">{t("earnings.back")}</Link>
  </section>;
}

import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { isAddress, type Address } from "viem";

import { ProfileIcon } from "@/components/ui/icons";
import { getWalletPortfolio } from "@/lib/api/portfolio";
import { robinhoodTestnet } from "@/lib/blockchain/chain";
import { formatUsdcUnits } from "@/lib/formatters/usdc";
import { I18nText } from "@/lib/i18n/locale-context";

export const dynamic = "force-dynamic";

function usdc(value: string) {
  return `$${formatUsdcUnits(value)}`;
}

export default async function ProfilePage({ params }: { params: Promise<{ address: string }> }) {
  const route = (await params).address;
  if (route === "me") redirect("/portfolio");
  if (!isAddress(route)) notFound();
  const address = route as Address;
  const data = await getWalletPortfolio(robinhoodTestnet.id, address).catch(() => null);

  return <main className="pageShell utilityPage">
    <header className="pageHeader utilityIconHeader"><ProfileIcon /><div><p className="eyebrow"><I18nText id="profile.eyebrow" /></p><h1>{address.slice(0, 6)}…{address.slice(-4)}</h1><span><I18nText id="profile.description" /></span></div></header>
    {!data ? <div className="terminalEmpty"><strong><I18nText id="profile.unavailable" /></strong><span><I18nText id="profile.unavailableDescription" /></span></div> : <>
      <section className="portfolioStats"><div><span><I18nText id="portfolio.positionValue" /></span><strong>$ {data.summary.positionValueUsdc}</strong></div><div><span><I18nText id="portfolio.claimable" /></span><strong data-tone="crown">{usdc(data.summary.claimableUnits)}</strong></div><div><span><I18nText id="profile.createdContests" /></span><strong>{data.created.length}</strong></div><div><span><I18nText id="profile.recentTrades" /></span><strong>{data.activity.length}</strong></div><div><span><I18nText id="portfolio.referralEarned" /></span><strong data-tone="positive">{usdc(data.summary.referralEarnedUnits)}</strong></div></section>
      <div className="portfolioTableWrap"><div className="portfolioSimpleTable"><div className="portfolioSimpleHead"><span><I18nText id="portfolio.contest" /></span><span><I18nText id="profile.position" /></span><span><I18nText id="portfolio.tokens" /></span><span><I18nText id="portfolio.value" /></span><span><I18nText id="profile.pnl" /></span></div>{data.positions.length ? data.positions.map((position) => <div className="portfolioSimpleRow" key={position.id}><Link href={`/contest/${position.contestId}`}><strong>{position.marketTitle}</strong></Link><span>{position.tokenSymbol} · <I18nText id={position.side === 0 ? "common.sideA" : "common.sideB"} /></span><span>{Number(position.tokenBalance).toLocaleString()}</span><span>$ {position.marketValueUsdc}</span><strong data-tone={Number(position.unrealizedPnlUsdc) < 0 ? "negative" : "positive"}>$ {position.unrealizedPnlUsdc}</strong></div>) : <div className="terminalEmpty"><strong><I18nText id="profile.noPositions" /></strong><span><I18nText id="profile.noPositionsDescription" /></span></div>}</div></div>
    </>}
  </main>;
}

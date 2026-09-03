import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { formatUnits, isAddress, type Address } from "viem";

import { ProfileIcon } from "@/components/ui/icons";
import { getWalletPortfolio } from "@/lib/api/portfolio";
import { robinhoodTestnet } from "@/lib/blockchain/chain";

export const dynamic = "force-dynamic";

function usdc(value: string) {
  return `$${Number(formatUnits(BigInt(value), 6)).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

export default async function ProfilePage({ params }: { params: Promise<{ address: string }> }) {
  const route = (await params).address;
  if (route === "me") redirect("/portfolio");
  if (!isAddress(route)) notFound();
  const address = route as Address;
  const data = await getWalletPortfolio(robinhoodTestnet.id, address).catch(() => null);

  return <main className="pageShell utilityPage">
    <header className="pageHeader utilityIconHeader"><ProfileIcon /><div><p className="eyebrow">public testnet identity</p><h1>{address.slice(0, 6)}…{address.slice(-4)}</h1><span>verified onchain positions, contests and activity.</span></div></header>
    {!data ? <div className="terminalEmpty"><strong>profile unavailable</strong><span>the live portfolio service could not be reached.</span></div> : <>
      <section className="portfolioStats"><div><span>position value</span><strong>$ {data.summary.positionValueUsdc}</strong></div><div><span>claimable</span><strong data-tone="crown">{usdc(data.summary.claimableUnits)}</strong></div><div><span>created contests</span><strong>{data.created.length}</strong></div><div><span>recent trades</span><strong>{data.activity.length}</strong></div><div><span>referral earned</span><strong data-tone="positive">{usdc(data.summary.referralEarnedUnits)}</strong></div></section>
      <div className="portfolioTableWrap"><div className="portfolioSimpleTable"><div className="portfolioSimpleHead"><span>contest</span><span>position</span><span>tokens</span><span>value</span><span>pnl</span></div>{data.positions.length ? data.positions.map((position) => <div className="portfolioSimpleRow" key={position.id}><Link href={`/contest/${position.contestId}`}><strong>{position.marketTitle}</strong></Link><span>{position.tokenSymbol} · side {position.side === 0 ? "a" : "b"}</span><span>{Number(position.tokenBalance).toLocaleString()}</span><span>$ {position.marketValueUsdc}</span><strong data-tone={Number(position.unrealizedPnlUsdc) < 0 ? "negative" : "positive"}>$ {position.unrealizedPnlUsdc}</strong></div>) : <div className="terminalEmpty"><strong>no visible positions</strong><span>this wallet has no token balance in an indexed contest.</span></div>}</div></div>
    </>}
  </main>;
}

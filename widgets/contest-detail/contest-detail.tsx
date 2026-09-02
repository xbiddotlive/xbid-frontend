"use client";

import { formatUnits } from "viem";
import { useReadContracts } from "wagmi";

import { TradeTicket } from "@/features/trading/components/trade-ticket";
import {
  contracts,
  demoContest,
  marketVaultAbi,
  riskControllerAbi,
} from "@/lib/blockchain/contracts";

export function ContestDetail() {
  const market = { address: demoContest.marketVault, abi: marketVaultAbi } as const;
  const { data, isLoading, refetch } = useReadContracts({
    contracts: [
      { ...market, functionName: "qAWei" },
      { ...market, functionName: "qBWei" },
      { ...market, functionName: "reserveUnits" },
      {
        address: contracts.riskController,
        abi: riskControllerAbi,
        functionName: "effectiveMode",
        args: [demoContest.marketVault],
      },
    ],
    query: { refetchInterval: 8_000 },
  });

  const qA = data?.[0].result ?? 0n;
  const qB = data?.[1].result ?? 0n;
  const reserve = data?.[2].result ?? 0n;
  const riskMode = Number(data?.[3].result ?? 0);
  const total = qA + qB;
  const aShare = total > 0n ? Number((qA * 10_000n) / total) / 100 : 50;
  const bShare = 100 - aShare;

  return (
    <main className="pageShell contestLayout">
      <section className="contestMain">
        <div className="contestTitleRow">
          <div>
            <p className="eyebrow">{demoContest.category}</p>
            <h1>{demoContest.title}</h1>
            <p className="muted mono">Contest {demoContest.contestId.slice(0, 10)}…</p>
          </div>
          <span className={riskMode === 0 ? "statusOk" : "statusWarning"}>
            {riskMode === 0 ? "Trading active" : `Risk mode ${riskMode}`}
          </span>
        </div>

        <div className="metricGrid">
          <div><span>Side A supply</span><strong>{isLoading ? "—" : Number(formatUnits(qA, 18)).toLocaleString(undefined, { maximumFractionDigits: 2 })}</strong></div>
          <div><span>Side B supply</span><strong>{isLoading ? "—" : Number(formatUnits(qB, 18)).toLocaleString(undefined, { maximumFractionDigits: 2 })}</strong></div>
          <div><span>Reserve</span><strong>{isLoading ? "—" : `${Number(formatUnits(reserve, 6)).toLocaleString(undefined, { maximumFractionDigits: 2 })} USDC`}</strong></div>
        </div>

        <section className="marketSection">
          <div className="sectionHeading compact">
            <div><p className="eyebrow">Live dominance</p><h2>Market balance</h2></div>
            <span className="muted">Onchain · refreshes every 8s</span>
          </div>
          <div className="dominanceBar dominanceLarge">
            <div className="dominanceA" style={{ width: `${Math.max(aShare, 15)}%` }}>Side A · {aShare.toFixed(1)}%</div>
            <div className="dominanceB" style={{ width: `${Math.max(bShare, 15)}%` }}>Side B · {bShare.toFixed(1)}%</div>
          </div>
          <div className="chartPlaceholder">
            <div className="chartLine chartLineA" />
            <div className="chartLine chartLineB" />
            <span>Price history will populate from the Ponder projection.</span>
          </div>
        </section>

        <section className="commentsPreview">
          <div className="sectionHeading compact"><div><p className="eyebrow">Live comments</p><h2>The arena</h2></div><span className="muted">Backend integration next</span></div>
          <div className="emptyState"><strong>Comments are warming up</strong><span>Wallet-authenticated live replies will appear here without Gas.</span></div>
        </section>
      </section>

      <aside className="tradeColumn">
        <TradeTicket onConfirmed={() => void refetch()} />
      </aside>
    </main>
  );
}

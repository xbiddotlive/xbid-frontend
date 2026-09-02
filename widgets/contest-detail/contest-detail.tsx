"use client";

import { formatUnits } from "viem";
import { useReadContracts } from "wagmi";

import { DominanceMeter } from "@/components/contest/dominance-meter";
import { DuelCurve } from "@/components/contest/duel-curve";
import { TradeTicket } from "@/features/trading/components/trade-ticket";
import type { IndexedContest, IndexedTradePoint } from "@/lib/api/contests";
import {
  contracts,
  demoContest,
  marketVaultAbi,
  riskControllerAbi,
} from "@/lib/blockchain/contracts";

function moveLabel(move: IndexedTradePoint) {
  const kind = move.kind.replaceAll("_", " ");
  return `${kind} · Side ${move.side === 0 ? "A" : "B"}`;
}

export function ContestDetail({ indexedContest }: { indexedContest?: IndexedContest }) {
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
  const history = indexedContest?.market?.history ?? [];
  const recentMoves = history.slice(-5).reverse();

  return (
    <main className="pageShell contestLayout">
      <section className="contestMain">
        <div className="contestTitleRow">
          <div>
            <p className="eyebrow"><span className="livePulse" /> Arena 01 · {demoContest.category}</p>
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
            <div><p className="eyebrow">Live telemetry</p><h2>Momentum line</h2></div>
            <span className="muted">Real indexed moves · chain refresh 8s</span>
          </div>
          <DominanceMeter
            large
            sideAPercent={Number(aShare.toFixed(1))}
            sideBPercent={Number(bShare.toFixed(1))}
          />
          <div className="curveLegend">
            <span><i className="legendA" /> Side A supply share</span>
            <span><i className="legendB" /> Side B supply share</span>
          </div>
          <DuelCurve history={history} />
        </section>

        <section className="activitySection">
          <div className="sectionHeading compact"><div><p className="eyebrow">Chain feed</p><h2>Latest moves</h2></div><span className="muted">Verified activity</span></div>
          {recentMoves.length > 0 ? (
            <div className="activityFeed">
              {recentMoves.map((move) => (
                <a href={`https://explorer.testnet.chain.robinhood.com/tx/${move.transactionHash}`} key={`${move.transactionHash}-${move.logIndex}`} rel="noreferrer" target="_blank">
                  <strong>{moveLabel(move)}</strong>
                  <span>{Number(formatUnits(BigInt(move.reserveAfterUnits), 6)).toLocaleString(undefined, { maximumFractionDigits: 2 })} USDC reserve</span>
                  <span>Block {move.blockNumber} ↗</span>
                </a>
              ))}
            </div>
          ) : (
            <div className="emptyState"><strong>No indexed moves yet</strong><span>The feed starts with the first confirmed trade.</span></div>
          )}
        </section>

        <section className="commentsPreview">
          <div className="sectionHeading compact"><div><p className="eyebrow">Crowd pressure</p><h2>Live comments</h2></div><span className="muted">Replies · wallet identity</span></div>
          <div className="emptyState"><strong>Comments are warming up</strong><span>Wallet-authenticated live replies will appear here without Gas.</span></div>
        </section>
      </section>

      <aside className="tradeColumn">
        <TradeTicket onConfirmed={() => void refetch()} />
      </aside>
    </main>
  );
}

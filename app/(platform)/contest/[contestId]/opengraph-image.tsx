import { ImageResponse } from "next/og";

import { getContest } from "@/lib/api/contests";
import { robinhoodTestnet } from "@/lib/blockchain/chain";

export const alt = "Live xbid contest market";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

function dominance(aValue: string, bValue: string) {
  const a = BigInt(aValue);
  const b = BigInt(bValue);
  const total = a + b;
  if (total === 0n) return [50, 50] as const;
  const sideA = Number((a * 1_000n) / total) / 10;
  return [sideA, 100 - sideA] as const;
}

export default async function ContestOpenGraphImage({ params }: { params: Promise<{ contestId: string }> }) {
  const { contestId } = await params;
  const contest = await getContest(robinhoodTestnet.id, contestId);
  const [sideA, sideB] = dominance(contest.market?.qAWei ?? "0", contest.market?.qBWei ?? "0");

  return new ImageResponse(
    <div style={{ background: "#090b10", color: "#f4f7fb", display: "flex", flexDirection: "column", height: "100%", justifyContent: "space-between", padding: "58px 68px", width: "100%" }}>
      <div style={{ alignItems: "center", display: "flex", fontSize: 30, fontWeight: 800 }}>
        <span style={{ background: "#ff603d", borderRadius: 999, boxShadow: "0 0 24px #ff603d", height: 14, marginRight: 16, width: 14 }} />
        <span>xbid</span><span style={{ color: "#ff603d" }}>.live</span>
        <span style={{ color: "#8f99aa", fontSize: 20, fontWeight: 500, marginLeft: "auto", textTransform: "uppercase" }}>live onchain contest</span>
      </div>

      <div style={{ display: "flex", flexDirection: "column" }}>
        <span style={{ color: "#8f99aa", fontSize: 22, letterSpacing: 3, textTransform: "uppercase" }}>{contest.metadata.category} · market v{contest.marketVersion}</span>
        <span style={{ fontSize: 52, fontWeight: 800, letterSpacing: -2, lineHeight: 1.12, marginTop: 14 }}>{contest.metadata.title.slice(0, 120)}</span>
      </div>

      <div style={{ display: "flex", gap: 18, width: "100%" }}>
        <div style={{ background: "#11151d", border: "2px solid #3478f6", borderRadius: 12, display: "flex", flex: 1, flexDirection: "column", padding: "22px 26px" }}>
          <span style={{ color: "#8ab3ff", fontSize: 19, textTransform: "uppercase" }}>side a · {contest.metadata.sideA.symbol}</span>
          <span style={{ fontSize: 30, fontWeight: 750, marginTop: 8 }}>{contest.metadata.sideA.name}</span>
          <span style={{ fontSize: 42, fontWeight: 850, marginTop: 12 }}>{sideA.toFixed(1)}%</span>
        </div>
        <div style={{ background: "#11151d", border: "2px solid #ff603d", borderRadius: 12, display: "flex", flex: 1, flexDirection: "column", padding: "22px 26px" }}>
          <span style={{ color: "#ff9a83", fontSize: 19, textTransform: "uppercase" }}>side b · {contest.metadata.sideB.symbol}</span>
          <span style={{ fontSize: 30, fontWeight: 750, marginTop: 8 }}>{contest.metadata.sideB.name}</span>
          <span style={{ fontSize: 42, fontWeight: 850, marginTop: 12 }}>{sideB.toFixed(1)}%</span>
        </div>
      </div>

      <div style={{ display: "flex", fontSize: 20, justifyContent: "space-between", width: "100%" }}>
        <span style={{ color: "#ffc857" }}>back a side · move the market · take the crown</span>
        <span style={{ color: "#8f99aa" }}>@xbid_live</span>
      </div>
    </div>,
    size,
  );
}

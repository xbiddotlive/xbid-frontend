import { ImageResponse } from "next/og";

import { getContest } from "@/lib/api/contests";
import { robinhoodTestnet } from "@/lib/blockchain/chain";
import { formatUsdc, marketControl, marketPrices } from "@/lib/product/market-metrics";

export const alt = "Choose a side and trade this live xbid contest";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

function price(value: number) {
  if (value > 0 && value < 0.0001) return `$${value.toExponential(2)}`;
  return `$${value.toFixed(4)}`;
}

export default async function ContestOpenGraphImage({ params }: { params: Promise<{ contestId: string }> }) {
  const { contestId } = await params;
  const contest = await getContest(robinhoodTestnet.id, contestId);
  const market = contest.market;
  const [sideA, sideB] = marketControl(market?.qAWei ?? "0", market?.qBWei ?? "0", contest.marketVersion);
  const [sideAPrice, sideBPrice] = marketPrices(market?.qAWei ?? "0", market?.qBWei ?? "0", contest.marketVersion);
  const liquidity = formatUsdc(market?.reserveUnits ?? "0");
  const volume = formatUsdc(market?.volume24hUnits ?? "0");

  return new ImageResponse(
    <div style={{ background: "#070910", color: "#f7f9ff", display: "flex", flexDirection: "column", height: "100%", overflow: "hidden", padding: "38px 48px 32px", position: "relative", width: "100%" }}>
      <div style={{ background: "linear-gradient(135deg, rgba(52,120,246,.32), rgba(52,120,246,0))", display: "flex", height: 630, left: 0, position: "absolute", top: 0, width: 600 }} />
      <div style={{ background: "linear-gradient(225deg, rgba(255,96,61,.3), rgba(255,96,61,0))", display: "flex", height: 630, position: "absolute", right: 0, top: 0, width: 600 }} />

      <div style={{ alignItems: "center", display: "flex", fontSize: 26, fontWeight: 800, position: "relative" }}>
        <span style={{ background: "#ff603d", borderRadius: 999, boxShadow: "0 0 20px #ff603d", height: 12, marginRight: 13, width: 12 }} />
        <span>xbid</span><span style={{ color: "#ff603d" }}>.live</span>
        <span style={{ background: "#142219", border: "1px solid #2f9f5e", borderRadius: 999, color: "#5ce292", fontSize: 15, fontWeight: 750, marginLeft: "auto", padding: "8px 14px", textTransform: "uppercase" }}>● live · {robinhoodTestnet.testnet ? "testnet" : "mainnet"}</span>
      </div>

      <div style={{ display: "flex", flexDirection: "column", marginTop: 20, position: "relative" }}>
        <span style={{ color: "#a4adbd", fontSize: 16, fontWeight: 650, letterSpacing: 2.5, textTransform: "uppercase" }}>{contest.metadata.category} · market v{contest.marketVersion}</span>
        <span style={{ fontSize: 42, fontWeight: 850, letterSpacing: -1.5, lineHeight: 1.08, marginTop: 8 }}>{contest.metadata.title.slice(0, 100)}</span>
      </div>

      <div style={{ display: "flex", gap: 12, marginTop: 22, position: "relative", width: "100%" }}>
        <div style={{ background: "linear-gradient(135deg, #173f86, #101a31 72%)", border: "3px solid #3478f6", borderRadius: 16, boxShadow: "0 0 30px rgba(52,120,246,.3)", display: "flex", flex: 1, flexDirection: "column", overflow: "hidden" }}>
          <div style={{ display: "flex", flexDirection: "column", padding: "18px 22px 14px" }}>
            <div style={{ alignItems: "center", display: "flex" }}>
              <span style={{ alignItems: "center", background: "#3478f6", borderRadius: 999, display: "flex", fontSize: 18, fontWeight: 900, height: 38, justifyContent: "center", marginRight: 12, width: 38 }}>{contest.metadata.sideA.symbol.slice(0, 1)}</span>
              <span style={{ color: "#a9c7ff", fontSize: 16, fontWeight: 750, textTransform: "uppercase" }}>side a · {contest.metadata.sideA.symbol}</span>
              <span style={{ background: "rgba(7,9,16,.46)", borderRadius: 999, color: "#d9e6ff", fontSize: 15, marginLeft: "auto", padding: "6px 10px" }}>{sideA.toFixed(1)}% control</span>
            </div>
            <span style={{ fontSize: 25, fontWeight: 750, marginTop: 10 }}>{contest.metadata.sideA.name}</span>
            <div style={{ alignItems: "flex-end", display: "flex", marginTop: 5 }}><span style={{ fontSize: 43, fontWeight: 900, letterSpacing: -1 }}>{price(sideAPrice)}</span><span style={{ color: "#a9c7ff", fontSize: 15, marginBottom: 7, marginLeft: 10, textTransform: "uppercase" }}>live price</span></div>
          </div>
          <div style={{ alignItems: "center", background: "#3478f6", color: "#071020", display: "flex", fontSize: 20, fontWeight: 900, justifyContent: "center", letterSpacing: 1, padding: "12px 18px", textTransform: "uppercase" }}>back {contest.metadata.sideA.symbol} →</div>
        </div>

        <div style={{ alignItems: "center", alignSelf: "stretch", display: "flex", flexDirection: "column", flexShrink: 0, justifyContent: "center", width: 46 }}>
          <span style={{ background: "linear-gradient(180deg, rgba(52,120,246,0), #3478f6)", display: "flex", flex: 1, width: 2 }} />
          <span style={{ alignItems: "center", background: "#0b0e16", border: "2px solid #4a5161", borderRadius: 999, boxShadow: "0 0 18px rgba(0,0,0,.65)", color: "#f7f9ff", display: "flex", flexShrink: 0, fontSize: 15, fontWeight: 900, height: 46, justifyContent: "center", margin: "8px 0", textTransform: "uppercase", width: 46 }}>vs</span>
          <span style={{ background: "linear-gradient(180deg, #ff603d, rgba(255,96,61,0))", display: "flex", flex: 1, width: 2 }} />
        </div>

        <div style={{ background: "linear-gradient(225deg, #7a281e, #2d1519 72%)", border: "3px solid #ff603d", borderRadius: 16, boxShadow: "0 0 30px rgba(255,96,61,.28)", display: "flex", flex: 1, flexDirection: "column", overflow: "hidden" }}>
          <div style={{ display: "flex", flexDirection: "column", padding: "18px 22px 14px" }}>
            <div style={{ alignItems: "center", display: "flex" }}>
              <span style={{ alignItems: "center", background: "#ff603d", borderRadius: 999, color: "#210904", display: "flex", fontSize: 18, fontWeight: 900, height: 38, justifyContent: "center", marginRight: 12, width: 38 }}>{contest.metadata.sideB.symbol.slice(0, 1)}</span>
              <span style={{ color: "#ffb09e", fontSize: 16, fontWeight: 750, textTransform: "uppercase" }}>side b · {contest.metadata.sideB.symbol}</span>
              <span style={{ background: "rgba(7,9,16,.46)", borderRadius: 999, color: "#ffe0d9", fontSize: 15, marginLeft: "auto", padding: "6px 10px" }}>{sideB.toFixed(1)}% control</span>
            </div>
            <span style={{ fontSize: 25, fontWeight: 750, marginTop: 10 }}>{contest.metadata.sideB.name}</span>
            <div style={{ alignItems: "flex-end", display: "flex", marginTop: 5 }}><span style={{ fontSize: 43, fontWeight: 900, letterSpacing: -1 }}>{price(sideBPrice)}</span><span style={{ color: "#ffb09e", fontSize: 15, marginBottom: 7, marginLeft: 10, textTransform: "uppercase" }}>live price</span></div>
          </div>
          <div style={{ alignItems: "center", background: "#ff603d", color: "#210904", display: "flex", fontSize: 20, fontWeight: 900, justifyContent: "center", letterSpacing: 1, padding: "12px 18px", textTransform: "uppercase" }}>back {contest.metadata.sideB.symbol} →</div>
        </div>
      </div>

      <div style={{ alignItems: "center", background: "rgba(12,15,23,.94)", border: "1px solid #343a48", borderRadius: 12, display: "flex", marginTop: 16, padding: "12px 20px", position: "relative", width: "100%" }}>
        <div style={{ display: "flex", flex: 1, flexDirection: "column" }}><span style={{ color: "#929cad", fontSize: 13, letterSpacing: 1.5, textTransform: "uppercase" }}>liquidity</span><span style={{ fontSize: 21, fontWeight: 850, marginTop: 2 }}>{liquidity} usdc</span></div>
        <div style={{ background: "#303644", display: "flex", height: 34, marginRight: 24, width: 1 }} />
        <div style={{ display: "flex", flex: 1, flexDirection: "column" }}><span style={{ color: "#929cad", fontSize: 13, letterSpacing: 1.5, textTransform: "uppercase" }}>24h volume</span><span style={{ fontSize: 21, fontWeight: 850, marginTop: 2 }}>{volume}</span></div>
        <div style={{ background: "#303644", display: "flex", height: 34, marginRight: 24, width: 1 }} />
        <div style={{ display: "flex", flex: 1, flexDirection: "column" }}><span style={{ color: "#929cad", fontSize: 13, letterSpacing: 1.5, textTransform: "uppercase" }}>24h trades</span><span style={{ fontSize: 21, fontWeight: 850, marginTop: 2 }}>{market?.tradeCount24h ?? "0"}</span></div>
      </div>

      <div style={{ alignItems: "center", display: "flex", fontSize: 16, fontWeight: 750, marginTop: 15, position: "relative", width: "100%" }}>
        <span style={{ color: "#f6c85f", letterSpacing: 1, textTransform: "uppercase" }}>choose a side · move the market</span>
        <span style={{ color: "#929cad", marginLeft: "auto" }}>@xbid_live</span>
      </div>
    </div>,
    size,
  );
}

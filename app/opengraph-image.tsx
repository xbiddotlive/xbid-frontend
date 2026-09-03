import { ImageResponse } from "next/og";

export const alt = "xbid.live — the live onchain contest market";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default function OpenGraphImage() {
  return new ImageResponse(
    <div style={{ background: "#090b10", color: "#f4f7fb", display: "flex", flexDirection: "column", height: "100%", justifyContent: "space-between", padding: "72px 80px", width: "100%" }}>
      <div style={{ alignItems: "center", display: "flex", fontSize: 36, fontWeight: 800 }}>
        <span style={{ background: "#ff603d", borderRadius: 999, boxShadow: "0 0 28px #ff603d", height: 16, marginRight: 18, width: 16 }} />
        <span>xbid</span><span style={{ color: "#ff603d" }}>.live</span>
      </div>
      <div style={{ display: "flex", flexDirection: "column" }}>
        <span style={{ color: "#8f99aa", fontSize: 26, letterSpacing: 4, textTransform: "uppercase" }}>the live onchain contest market</span>
        <span style={{ fontSize: 72, fontWeight: 800, letterSpacing: -3, marginTop: 18 }}>back a side. move the market.</span>
        <span style={{ color: "#ffc857", fontSize: 72, fontWeight: 800, letterSpacing: -3 }}>take the crown.</span>
      </div>
      <div style={{ display: "flex", gap: 12 }}>
        <span style={{ background: "#3478f6", borderRadius: 8, height: 8, width: 440 }} />
        <span style={{ background: "#ff603d", borderRadius: 8, height: 8, width: 440 }} />
      </div>
    </div>,
    size,
  );
}

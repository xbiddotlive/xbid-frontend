import { ImageResponse } from "next/og";

export const size = { width: 180, height: 180 };
export const contentType = "image/png";

export default function AppleIcon() {
  return new ImageResponse(
    <div style={{ alignItems: "center", background: "#11151d", display: "flex", height: "100%", justifyContent: "center", width: "100%" }}>
      <div style={{ alignItems: "center", display: "flex", justifyContent: "center" }}>
        <span style={{ color: "#3478f6", fontSize: 112, fontWeight: 800, lineHeight: 1 }}>›</span>
        <span style={{ color: "#f4f7fb", fontSize: 40, margin: "0 -3px" }}>●</span>
        <span style={{ color: "#ff603d", fontSize: 112, fontWeight: 800, lineHeight: 1 }}>‹</span>
      </div>
    </div>,
    size,
  );
}

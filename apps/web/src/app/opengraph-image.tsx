import { ImageResponse } from "next/og";

export const alt = "MandiLens — Maharashtra mandi intelligence";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default function OpenGraphImage() {
  return new ImageResponse(
    <div
      style={{
        width: "100%",
        height: "100%",
        display: "flex",
        flexDirection: "column",
        justifyContent: "space-between",
        background: "#0d2d52",
        color: "#f7f9fc",
        padding: "64px 72px",
      }}
    >
      <div style={{ display: "flex", justifyContent: "space-between", fontSize: 24 }}>
        <strong>MandiLens</strong>
        <span style={{ color: "#9eb8d5" }}>Maharashtra · onion · tomato · potato</span>
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: 18 }}>
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            fontSize: 70,
            lineHeight: 1.05,
            fontWeight: 700,
            letterSpacing: -2,
          }}
        >
          <span>See the range. Count the cost.</span>
          <span style={{ color: "#f6b73c" }}>Choose with context.</span>
        </div>
        <div style={{ fontSize: 28, color: "#c9d7e7" }}>
          Official mandi observations · seven-day intervals · transparent net estimates
        </div>
      </div>
      <div style={{ display: "flex", alignItems: "center", gap: 18, fontSize: 22 }}>
        <div style={{ width: 210, height: 8, background: "#2f70b7", borderRadius: 10 }} />
        <div style={{ width: 18, height: 18, background: "#e85d3f", borderRadius: 99 }} />
        <span style={{ color: "#9eb8d5" }}>Evidence-led decision support</span>
      </div>
    </div>,
    size,
  );
}

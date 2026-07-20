import { ImageResponse } from "next/og";

export const alt = "MandiLens — South India mandi information, in context";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default function OpenGraphImage() {
  return new ImageResponse(
    <div
      style={{
        width: "100%",
        height: "100%",
        display: "flex",
        background: "#eef0eb",
        color: "#182019",
        padding: "42px",
      }}
    >
      <div
        style={{
          width: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          border: "1px solid #d8dcd3",
          borderRadius: 30,
          background: "#ffffff",
          padding: "52px 60px",
          boxShadow: "0 20px 60px rgba(37,45,34,.09)",
        }}
      >
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            fontSize: 24,
          }}
        >
          <strong>MandiLens</strong>
          <span style={{ color: "#6f776d" }}>Official reports · prepared context</span>
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              fontSize: 68,
              lineHeight: 1.02,
              fontWeight: 700,
              letterSpacing: -3,
            }}
          >
            <span>Understand mandi prices</span>
            <span style={{ color: "#679d35" }}>across South India.</span>
          </div>
          <div style={{ fontSize: 27, color: "#5e675c" }}>
            Explore markets · compare common dates · inspect freshness
          </div>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <div style={{ width: 190, height: 18, borderRadius: 9, background: "#8fc642" }} />
          <div style={{ width: 120, height: 18, borderRadius: 9, background: "#f0dc35" }} />
          <div style={{ width: 70, height: 18, borderRadius: 9, background: "#f1a45b" }} />
          <span style={{ marginLeft: 16, color: "#6f776d", fontSize: 21 }}>
            Observed data first. Outlook second.
          </span>
        </div>
      </div>
    </div>,
    size,
  );
}

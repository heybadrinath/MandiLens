import { ImageResponse } from "next/og";

export const size = { width: 64, height: 64 };
export const contentType = "image/png";

export default function Icon() {
  return new ImageResponse(
    <div
      style={{
        width: "100%",
        height: "100%",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        background: "#182019",
        color: "#a9d94d",
        fontSize: 32,
        fontWeight: 700,
        borderRadius: 16,
      }}
    >
      M
    </div>,
    size,
  );
}

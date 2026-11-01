// app/opengraph-image.tsx
import { ImageResponse } from "next/og";

export const alt = "Alex Maat | Software Engineer";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default function OpengraphImage() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          padding: 48,
          background: "#fff8ed",
        }}
      >
        <div
          style={{
            flex: 1,
            display: "flex",
            flexDirection: "column",
            justifyContent: "center",
            padding: 64,
            border: "4px solid #dc2626",
          }}
        >
          <div style={{ fontSize: 40, color: "#dc2626" }}>alexandermaat.com</div>
          <div style={{ fontSize: 120, fontWeight: 700, color: "#000" }}>
            Alex Maat
          </div>
          <div style={{ fontSize: 44, color: "#1f2937" }}>
            Software Engineer · Lehi, UT
          </div>
        </div>
      </div>
    ),
    size
  );
}

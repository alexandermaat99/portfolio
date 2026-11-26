// app/racing/opengraph-image.tsx: the link preview for /racing and its tabs (without one,
// iMessage etc. grab the first big picture on the page, which is a driver's photo).
import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { ImageResponse } from "next/og";

export const alt = "SimStats: sim racing leaderboard";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

const INK = "#ececE6";
const MUTED = "#8d8d86";
const ACCENT = "#ff4f00";

// The page's own fonts, bundled in og-fonts/ (OFL) so the build never depends on the
// network: Google Fonts not answering once failed a Vercel deploy.
const font = (file: string) => readFile(join(process.cwd(), "app/racing/og-fonts", file));

const WORDMARK = "SIMSTATS";

export default async function RacingOgImage() {
  const fonts = [
    { name: "Syncopate", data: await font("syncopate-700.ttf"), weight: 700 as const },
    { name: "Space Mono", data: await font("space-mono-400.ttf"), weight: 400 as const },
    { name: "Space Mono", data: await font("space-mono-700.ttf"), weight: 700 as const },
  ];
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          padding: "64px 72px",
          background: "#0a0a0a",
          color: INK,
          fontFamily: "Space Mono",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 24 }}>
          <div style={{ fontFamily: "Syncopate", fontSize: 60, fontWeight: 700, letterSpacing: 14 }}>{WORDMARK}</div>
          <div style={{ fontSize: 26, padding: "4px 12px", border: `2px solid ${MUTED}`, borderRadius: 6, color: MUTED }}>SS-1</div>
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: 18 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 16, fontSize: 26, letterSpacing: 6, color: MUTED }}>
            <div style={{ width: 18, height: 18, borderRadius: 9, background: ACCENT }} />
            LIVE LEADERBOARD
          </div>
          <div style={{ fontSize: 88, fontWeight: 700, lineHeight: 1.05, letterSpacing: -3 }}>Sim racing nights</div>
          <div style={{ fontSize: 30, color: MUTED }}>Every lap, recorded straight from iRacing.</div>
        </div>

        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end" }}>
          <div style={{ fontSize: 28, color: INK }}>alexandermaat.com/racing</div>
          <div style={{ display: "flex", height: 10, width: 260, background: ACCENT }} />
        </div>
      </div>
    ),
    { ...size, fonts },
  );
}

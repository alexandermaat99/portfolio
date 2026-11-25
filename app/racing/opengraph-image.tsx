// app/racing/opengraph-image.tsx: the link preview for /racing and its tabs (without one,
// iMessage etc. grab the first big picture on the page, which is a driver's photo).
import { ImageResponse } from "next/og";

export const alt = "SimStats: sim racing leaderboard";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

const INK = "#ececE6";
const MUTED = "#8d8d86";
const ACCENT = "#ff4f00";

// The page's own fonts, fetched as TTF from Google Fonts (only the glyphs we use).
async function googleFont(family: string, weight: number, text: string): Promise<ArrayBuffer> {
  const url = `https://fonts.googleapis.com/css2?family=${family.replace(/ /g, "+")}:wght@${weight}&text=${encodeURIComponent(text)}`;
  const css = await (await fetch(url)).text();
  const src = css.match(/src: url\((.+?)\) format\('(opentype|truetype)'\)/);
  if (!src) throw new Error(`font ${family} not found`);
  return (await fetch(src[1])).arrayBuffer();
}

const WORDMARK = "SIMSTATS";
const TEXT = "SS-1LIVE LEADERBOARDSim racing nightsEvery lap, recorded straight from iRacing.alexandermaat.com/racing";

export default async function RacingOgImage() {
  let fonts: { name: string; data: ArrayBuffer; weight: 400 | 700 }[] = [];
  try {
    fonts = [
      { name: "Syncopate", data: await googleFont("Syncopate", 700, WORDMARK), weight: 700 },
      { name: "Space Mono", data: await googleFont("Space Mono", 400, TEXT), weight: 400 },
      { name: "Space Mono", data: await googleFont("Space Mono", 700, TEXT), weight: 700 },
    ];
  } catch {
    fonts = []; // fall back to the default font rather than failing the preview
  }
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

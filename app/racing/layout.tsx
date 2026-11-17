// app/racing/layout.tsx: fonts for the SimStats page (self-hosted by next/font at build time).
import { Space_Mono, Syncopate } from "next/font/google";

const mono = Space_Mono({ subsets: ["latin"], weight: ["400", "700"], variable: "--font-racing-mono", display: "swap" });
const wordmark = Syncopate({ subsets: ["latin"], weight: ["700"], variable: "--font-racing-wordmark", display: "swap" });

export default function RacingLayout({ children }: { children: React.ReactNode }) {
  return <div className={`${mono.variable} ${wordmark.variable}`}>{children}</div>;
}

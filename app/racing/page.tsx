// app/racing/page.tsx
import type { Metadata } from "next";
import RacingApp from "./RacingApp";
import { loadSnapshot } from "./lib/store";
import type { RacingSnapshot } from "./lib/types";

export const dynamic = "force-dynamic";

const description =
  "Live lap times and leaderboards from hot-seat iRacing nights, recorded automatically by SimStats, an app Alex Maat built.";

export const metadata: Metadata = {
  title: "Sim Racing Leaderboard | Alex Maat",
  description,
  alternates: { canonical: "/racing" },
  openGraph: { title: "Sim Racing Leaderboard | Alex Maat", description, url: "/racing" },
  twitter: { title: "Sim Racing Leaderboard | Alex Maat", description },
};

export default async function RacingPage() {
  let initial: RacingSnapshot;
  try {
    initial = await loadSnapshot();
  } catch {
    initial = { live: null, data: null, now: Date.now() / 1000 };
  }
  return <RacingApp initial={initial} />;
}

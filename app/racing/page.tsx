// app/racing/page.tsx
import type { Metadata } from "next";
import { cookies } from "next/headers";
import RacingApp from "./RacingApp";
import { parseTab, TAB_COOKIE } from "./lib/tabs";
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

export default async function RacingPage({ searchParams }: { searchParams: Promise<{ tab?: string | string[] }> }) {
  // Pick the tab on the server (from ?tab=, else the last one this visitor had open) so a
  // refresh doesn't flash "Tonight" before switching.
  const { tab } = await searchParams;
  const initialTab = parseTab(Array.isArray(tab) ? tab[0] : tab) ?? parseTab((await cookies()).get(TAB_COOKIE)?.value) ?? "live";
  let initial: RacingSnapshot;
  try {
    initial = await loadSnapshot();
  } catch {
    initial = { live: null, data: null, now: Date.now() / 1000 };
  }
  return <RacingApp initial={initial} initialTab={initialTab} />;
}

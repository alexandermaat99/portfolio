// app/racing/[[...tab]]/page.tsx: /racing (Tonight) and /racing/records, /nights, /drivers, /compete.
// One optional catch-all route, so switching tabs keeps the same page mounted.
import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import RacingApp from "../RacingApp";
import { parseTab, tabPath } from "../lib/tabs";
import { loadSnapshot } from "../lib/store";
import type { RacingSnapshot } from "../lib/types";

export const dynamic = "force-dynamic";

type Props = { params: Promise<{ tab?: string[] }> };

const title = "Sim Racing Leaderboard | Alex Maat";
const description =
  "Live lap times and leaderboards from hot-seat iRacing nights, recorded automatically by SimStats, an app Alex Maat built.";

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const tab = parseTab((await params).tab?.[0]) ?? "live";
  const url = tabPath(tab);
  return {
    title,
    description,
    alternates: { canonical: url },
    openGraph: { title, description, url },
    twitter: { title, description },
  };
}

export default async function RacingPage({ params }: Props) {
  // Old ?tab= links and the remembered tab for plain /racing are redirected in proxy.ts.
  const segs = (await params).tab ?? [];
  const tab = segs.length ? parseTab(segs[0]) : "live";
  if (segs.length === 1 && tab === "live") redirect("/racing");
  if (segs.length > 1 || !tab || (segs.length === 1 && tab === "live")) notFound();
  let initial: RacingSnapshot;
  try {
    initial = await loadSnapshot();
  } catch {
    initial = { live: null, data: null, now: Date.now() / 1000 };
  }
  return <RacingApp initial={initial} initialTab={tab} />;
}

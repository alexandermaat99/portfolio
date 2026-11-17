// app/api/racing/route.ts
// Public, read-only: the latest SimStats snapshots for the /racing page.

import { loadSnapshot } from "../../racing/lib/store";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const snapshot = await loadSnapshot();
    return Response.json(snapshot, {
      // Let the CDN absorb polling from many viewers; data is a few seconds old at most.
      headers: { "Cache-Control": "public, s-maxage=2, stale-while-revalidate=10" },
    });
  } catch (e) {
    console.error("racing read failed", e);
    return Response.json({ live: null, data: null, now: Date.now() / 1000 }, { status: 503 });
  }
}

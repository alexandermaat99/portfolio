// app/api/racing/ingest/route.ts
// The sim PC POSTs SimStats snapshots here. Protected by a shared secret.

import { timingSafeEqual } from "crypto";
import { saveSnapshot, type SnapshotKind } from "../../../racing/lib/store";

export const dynamic = "force-dynamic";

const MAX_BYTES = 900_000; // stay under Upstash's 1 MB request limit

function authorized(req: Request): boolean {
  const expected = process.env.RACING_INGEST_TOKEN;
  if (!expected) return false;
  const given = (req.headers.get("authorization") ?? "").replace(/^Bearer\s+/i, "");
  const a = Buffer.from(given);
  const b = Buffer.from(expected);
  return a.length === b.length && timingSafeEqual(a, b);
}

export async function POST(req: Request) {
  if (!authorized(req)) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }
  const body = await req.text();
  if (body.length > MAX_BYTES) {
    return Response.json({ error: "Payload too large" }, { status: 413 });
  }
  let parsed: { kind?: string; payload?: unknown };
  try {
    parsed = JSON.parse(body);
  } catch {
    return Response.json({ error: "Invalid JSON" }, { status: 400 });
  }
  const kind = parsed.kind;
  if ((kind !== "live" && kind !== "data") || typeof parsed.payload !== "object" || !parsed.payload) {
    return Response.json({ error: "Expected {kind: 'live'|'data', payload: {...}}" }, { status: 400 });
  }
  try {
    await saveSnapshot(kind as SnapshotKind, JSON.stringify(parsed.payload));
  } catch (e) {
    console.error("racing ingest failed", e);
    // Caller is authenticated (the sim PC), so it's fine to say why.
    const reason = e instanceof Error ? e.message : String(e);
    return Response.json({ error: "Storage unavailable", reason }, { status: 503 });
  }
  return Response.json({ ok: true });
}
